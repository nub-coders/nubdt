const std = @import("std");
const Allocator = std.mem.Allocator;
const Storage = @import("storage.zig").Storage;
const AOF = @import("aof.zig").AOF;
const AOFConfig = @import("aof.zig").AOFConfig;
const OpType = @import("aof.zig").OpType;

pub const Compaction = struct {
    storage: *Storage,
    aof: *AOF,
    allocator: Allocator,
    
    pub fn init(allocator: Allocator, storage: *Storage, aof: *AOF) !*Compaction {
        const compaction = try allocator.create(Compaction);
        compaction.* = .{
            .storage = storage,
            .aof = aof,
            .allocator = allocator,
        };
        return compaction;
    }
    
    pub fn deinit(self: *Compaction) void {
        self.allocator.destroy(self);
    }
    
    pub fn rewrite(self: *Compaction) !void {
        const temp_path = try std.fmt.allocPrint(self.allocator, "{s}.tmp", .{self.aof.config.path});
        defer self.allocator.free(temp_path);
        
        const temp_file = try std.fs.cwd().createFile(temp_path, .{
            .read = true,
            .truncate = true,
        });
        defer temp_file.close();
        
        self.storage.mutex.lockShared();
        defer self.storage.mutex.unlockShared();
        
        var buffer = std.ArrayList(u8).init(self.allocator);
        defer buffer.deinit();
        
        var iter = self.storage.table.iterator();
        while (iter.next()) |entry| {
            buffer.clearRetainingCapacity();
            const writer = buffer.writer();
            
            const timestamp: i64 = @intCast(std.time.milliTimestamp());
            try writer.writeInt(i64, timestamp, .little);
            try writer.writeByte(@intFromEnum(OpType.set));
            try writer.writeInt(u32, @intCast(entry.key.len), .little);
            try writer.writeAll(entry.key);
            try writer.writeInt(u32, @intCast(entry.value.data.len), .little);
            try writer.writeAll(entry.value.data);
            
            try temp_file.writeAll(buffer.items);
        }
        
        try temp_file.sync();
        
        self.aof.mutex.lock();
        defer self.aof.mutex.unlock();
        
        self.aof.file.close();
        
        try std.fs.cwd().rename(temp_path, self.aof.config.path);
        
        self.aof.file = try std.fs.cwd().openFile(self.aof.config.path, .{
            .mode = .read_write,
        });
        
        const stat = try self.aof.file.stat();
        _ = self.aof.size_bytes.store(stat.size, .monotonic);
        _ = self.aof.ops_since_fsync.store(0, .monotonic);
        
        try self.aof.file.seekFromEnd(0);
    }
    
    pub fn shouldRewrite(self: *Compaction) bool {
        return self.aof.needsRewrite();
    }
};
