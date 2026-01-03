const std = @import("std");
const Allocator = std.mem.Allocator;
const HashTable = @import("hash.zig").HashTable;
const AOF = @import("aof.zig").AOF;
const OpType = @import("aof.zig").OpType;
const AtomicU64 = std.atomic.Value(u64);

pub const ValueWithTTL = struct {
    data: []const u8,
    expires_at: i64, // 0 means no expiration
};

pub const Storage = struct {
    allocator: Allocator,
    table: HashTable(ValueWithTTL),
    aof: ?*AOF,
    mutex: std.Thread.RwLock,
    ops_count: AtomicU64,
    
    pub fn init(allocator: Allocator) !*Storage {
        const storage = try allocator.create(Storage);
        
        storage.* = .{
            .allocator = allocator,
            .table = try HashTable(ValueWithTTL).init(allocator),
            .aof = null,
            .mutex = .{},
            .ops_count = AtomicU64.init(0),
        };
        
        return storage;
    }
    
    pub fn deinit(self: *Storage) void {
        for (self.table.entries) |maybe_entry| {
            if (maybe_entry) |entry| {
                self.allocator.free(entry.value.data);
            }
        }
        self.table.deinit();
        if (self.aof) |aof| {
            aof.deinit();
        }
        self.allocator.destroy(self);
    }
    
    pub fn enableAOF(self: *Storage, aof: *AOF) void {
        self.aof = aof;
    }
    
    pub fn set(self: *Storage, key: []const u8, value: []const u8, ttl_seconds: i64) !void {
        const value_owned = try self.allocator.dupe(u8, value);
        errdefer self.allocator.free(value_owned);
        
        const expires_at = if (ttl_seconds > 0)
            std.time.timestamp() + ttl_seconds
        else
            0;
        
        const value_with_ttl = ValueWithTTL{
            .data = value_owned,
            .expires_at = expires_at,
        };
        
        self.mutex.lock();
        defer self.mutex.unlock();
        
        if (self.table.get(key)) |old| {
            self.allocator.free(old.data);
        }
        
        try self.table.put(key, value_with_ttl);
        _ = self.ops_count.fetchAdd(1, .monotonic);
        
        if (self.aof) |aof| {
            try aof.append(.set, key, value);
        }
    }
    
    pub fn get(self: *Storage, key: []const u8) ?[]const u8 {
        self.mutex.lockShared();
        defer self.mutex.unlockShared();
        
        if (self.table.get(key)) |value_with_ttl| {
            if (value_with_ttl.expires_at > 0) {
                const now = std.time.timestamp();
                if (now >= value_with_ttl.expires_at) {
                    return null;
                }
            }
            return value_with_ttl.data;
        }
        
        return null;
    }
    
    pub fn delete(self: *Storage, key: []const u8) !bool {
        self.mutex.lock();
        defer self.mutex.unlock();
        
        if (self.table.get(key)) |value_with_ttl| {
            self.allocator.free(value_with_ttl.data);
        }
        
        const removed = self.table.remove(key);
        
        if (removed) {
            _ = self.ops_count.fetchAdd(1, .monotonic);
            
            if (self.aof) |aof| {
                try aof.append(.delete, key, "");
            }
        }
        
        return removed;
    }
    
    pub fn exists(self: *Storage, key: []const u8) bool {
        self.mutex.lockShared();
        defer self.mutex.unlockShared();
        
        if (self.table.get(key)) |value_with_ttl| {
            if (value_with_ttl.expires_at > 0) {
                const now = std.time.timestamp();
                if (now >= value_with_ttl.expires_at) {
                    return false;
                }
            }
            return true;
        }
        
        return false;
    }
    
    pub fn increment(self: *Storage, key: []const u8, delta: i64) !i64 {
        self.mutex.lock();
        defer self.mutex.unlock();
        
        const current_value: i64 = if (self.table.get(key)) |value_with_ttl| blk: {
            const parsed = std.fmt.parseInt(i64, value_with_ttl.data, 10) catch 0;
            self.allocator.free(value_with_ttl.data);
            break :blk parsed;
        } else 0;
        
        const new_value = current_value + delta;
        
        var buf: [32]u8 = undefined;
        const value_str = try std.fmt.bufPrint(&buf, "{d}", .{new_value});
        const value_owned = try self.allocator.dupe(u8, value_str);
        
        const value_with_ttl = ValueWithTTL{
            .data = value_owned,
            .expires_at = 0,
        };
        
        try self.table.put(key, value_with_ttl);
        _ = self.ops_count.fetchAdd(1, .monotonic);
        
        if (self.aof) |aof| {
            try aof.append(.set, key, value_owned);
        }
        
        return new_value;
    }
    
    pub fn size(self: *Storage) usize {
        self.mutex.lockShared();
        defer self.mutex.unlockShared();
        return self.table.count;
    }
    
    pub fn clear(self: *Storage) void {
        self.mutex.lock();
        defer self.mutex.unlock();
        
        for (self.table.entries) |maybe_entry| {
            if (maybe_entry) |entry| {
                self.allocator.free(entry.value.data);
            }
        }
        
        self.table.clear();
    }
    
    pub fn cleanupExpired(self: *Storage) !usize {
        self.mutex.lock();
        defer self.mutex.unlock();
        
        const now = std.time.timestamp();
        var cleaned: usize = 0;
        var keys_to_remove = std.ArrayList([]const u8).init(self.allocator);
        defer keys_to_remove.deinit();
        
        var iter = self.table.iterator();
        while (iter.next()) |entry| {
            if (entry.value.expires_at > 0 and now >= entry.value.expires_at) {
                try keys_to_remove.append(entry.key);
            }
        }
        
        for (keys_to_remove.items) |key| {
            if (self.table.get(key)) |value_with_ttl| {
                self.allocator.free(value_with_ttl.data);
            }
            _ = self.table.remove(key);
            cleaned += 1;
        }
        
        return cleaned;
    }
    
    pub fn replayAOFEntry(storage: *Storage, op_type: OpType, key: []const u8, value: []const u8) !void {
        switch (op_type) {
            .set => {
                const value_owned = try storage.allocator.dupe(u8, value);
                const value_with_ttl = ValueWithTTL{
                    .data = value_owned,
                    .expires_at = 0,
                };
                
                if (storage.table.get(key)) |old| {
                    storage.allocator.free(old.data);
                }
                
                try storage.table.put(key, value_with_ttl);
            },
            .delete => {
                if (storage.table.get(key)) |old| {
                    storage.allocator.free(old.data);
                }
                _ = storage.table.remove(key);
            },
            else => return error.UnknownOpType,
        }
    }
};
