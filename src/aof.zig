const std = @import("std");
const Allocator = std.mem.Allocator;
const AtomicU64 = std.atomic.Value(u64);
const AtomicBool = std.atomic.Value(bool);

pub const FsyncPolicy = enum {
    always,
    every_n_ops,
    every_n_seconds,
};

pub const AOFConfig = struct {
    path: []const u8,
    fsync_policy: FsyncPolicy = .every_n_ops,
    fsync_ops_threshold: u32 = 1000,
    fsync_seconds_threshold: u32 = 1,
    rewrite_threshold_bytes: u64 = 64 * 1024 * 1024, // 64MB
};

pub const OpType = enum(u8) {
    set = 1,
    delete = 2,
    _,
};

pub const AOF = struct {
    allocator: Allocator,
    file: std.fs.File,
    config: AOFConfig,
    ops_since_fsync: AtomicU64,
    last_fsync_time: AtomicU64,
    size_bytes: AtomicU64,
    mutex: std.Thread.Mutex,
    buffer: std.ArrayList(u8),
    
    pub fn init(allocator: Allocator, config: AOFConfig) !*AOF {
        const aof = try allocator.create(AOF);
        
        const file = try std.fs.cwd().createFile(config.path, .{
            .read = true,
            .truncate = false,
        });
        
        const stat = try file.stat();
        
        aof.* = .{
            .allocator = allocator,
            .file = file,
            .config = config,
            .ops_since_fsync = AtomicU64.init(0),
            .last_fsync_time = AtomicU64.init(@intCast(std.time.timestamp())),
            .size_bytes = AtomicU64.init(stat.size),
            .mutex = .{},
            .buffer = std.ArrayList(u8).init(allocator),
        };
        
        return aof;
    }
    
    pub fn deinit(self: *AOF) void {
        self.buffer.deinit();
        self.file.close();
        self.allocator.destroy(self);
    }
    
    pub fn append(self: *AOF, op_type: OpType, key: []const u8, value: []const u8) !void {
        self.mutex.lock();
        defer self.mutex.unlock();
        
        self.buffer.clearRetainingCapacity();
        const writer = self.buffer.writer();
        
        const timestamp: i64 = @intCast(std.time.milliTimestamp());
        try writer.writeInt(i64, timestamp, .little);
        try writer.writeByte(@intFromEnum(op_type));
        try writer.writeInt(u32, @intCast(key.len), .little);
        try writer.writeAll(key);
        try writer.writeInt(u32, @intCast(value.len), .little);
        try writer.writeAll(value);
        
        try self.file.writeAll(self.buffer.items);
        
        const written = self.buffer.items.len;
        _ = self.size_bytes.fetchAdd(@intCast(written), .monotonic);
        
        const ops = self.ops_since_fsync.fetchAdd(1, .monotonic) + 1;
        
        switch (self.config.fsync_policy) {
            .always => try self.file.sync(),
            .every_n_ops => {
                if (ops >= self.config.fsync_ops_threshold) {
                    try self.file.sync();
                    _ = self.ops_since_fsync.store(0, .monotonic);
                }
            },
            .every_n_seconds => {
                const now: u64 = @intCast(std.time.timestamp());
                const last = self.last_fsync_time.load(.monotonic);
                if (now - last >= self.config.fsync_seconds_threshold) {
                    try self.file.sync();
                    _ = self.last_fsync_time.store(now, .monotonic);
                    _ = self.ops_since_fsync.store(0, .monotonic);
                }
            },
        }
    }
    
    pub fn forceSync(self: *AOF) !void {
        self.mutex.lock();
        defer self.mutex.unlock();
        try self.file.sync();
        _ = self.ops_since_fsync.store(0, .monotonic);
    }
    
    pub const ReplayCallback = *const fn (op_type: OpType, key: []const u8, value: []const u8) anyerror!void;
    
    pub fn replay(self: *AOF, callback: ReplayCallback) !u64 {
        try self.file.seekTo(0);
        
        var buffered = std.io.bufferedReader(self.file.reader());
        const reader = buffered.reader();
        
        var ops_count: u64 = 0;
        var key_buffer: [4096]u8 = undefined;
        var value_buffer: [1024 * 1024]u8 = undefined;
        
        while (true) {
            const timestamp = reader.readInt(i64, .little) catch |err| {
                if (err == error.EndOfStream) break;
                return err;
            };
            _ = timestamp;
            
            const op_byte = try reader.readByte();
            const op_type: OpType = @enumFromInt(op_byte);
            
            const key_len = try reader.readInt(u32, .little);
            if (key_len > key_buffer.len) return error.KeyTooLarge;
            const key = key_buffer[0..key_len];
            try reader.readNoEof(key);
            
            const value_len = try reader.readInt(u32, .little);
            if (value_len > value_buffer.len) return error.ValueTooLarge;
            const value = value_buffer[0..value_len];
            try reader.readNoEof(value);
            
            try callback(op_type, key, value);
            ops_count += 1;
        }
        
        return ops_count;
    }
    
    pub fn needsRewrite(self: *AOF) bool {
        return self.size_bytes.load(.monotonic) >= self.config.rewrite_threshold_bytes;
    }
    
    pub fn getSizeBytes(self: *AOF) u64 {
        return self.size_bytes.load(.monotonic);
    }
};
