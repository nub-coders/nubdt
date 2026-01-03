const std = @import("std");
const builtin = @import("builtin");

pub fn wyhash(key: []const u8) u64 {
    return std.hash.Wyhash.hash(0, key);
}

pub fn HashTable(comptime V: type) type {
    return struct {
        const Self = @This();
        
        pub const Entry = struct {
            key: []const u8,
            value: V,
            hash: u64,
            psl: u32, // Probe Sequence Length for Robin Hood hashing
        };
        
        allocator: std.mem.Allocator,
        entries: []?Entry,
        count: usize,
        capacity: usize,
        load_factor_percent: u8,
        
        pub fn init(allocator: std.mem.Allocator) !Self {
            const initial_capacity = 1024;
            const entries = try allocator.alloc(?Entry, initial_capacity);
            @memset(entries, null);
            
            return Self{
                .allocator = allocator,
                .entries = entries,
                .count = 0,
                .capacity = initial_capacity,
                .load_factor_percent = 90,
            };
        }
        
        pub fn deinit(self: *Self) void {
            for (self.entries) |maybe_entry| {
                if (maybe_entry) |entry| {
                    self.allocator.free(entry.key);
                }
            }
            self.allocator.free(self.entries);
        }
        
        pub fn put(self: *Self, key: []const u8, value: V) !void {
            if (self.count * 100 >= self.capacity * self.load_factor_percent) {
                try self.resize();
            }
            
            const hash = wyhash(key);
            const key_owned = try self.allocator.dupe(u8, key);
            errdefer self.allocator.free(key_owned);
            
            var entry = Entry{
                .key = key_owned,
                .value = value,
                .hash = hash,
                .psl = 0,
            };
            
            var idx = hash % self.capacity;
            
            while (true) {
                if (self.entries[idx]) |*existing| {
                    if (existing.hash == hash and std.mem.eql(u8, existing.key, key)) {
                        self.allocator.free(existing.key);
                        existing.* = entry;
                        return;
                    }
                    
                    if (entry.psl > existing.psl) {
                        const temp = existing.*;
                        existing.* = entry;
                        entry = temp;
                    }
                    
                    entry.psl += 1;
                    idx = (idx + 1) % self.capacity;
                } else {
                    self.entries[idx] = entry;
                    self.count += 1;
                    return;
                }
            }
        }
        
        pub fn get(self: *Self, key: []const u8) ?V {
            if (self.count == 0) return null;
            
            const hash = wyhash(key);
            var idx = hash % self.capacity;
            var psl: u32 = 0;
            
            while (true) {
                if (self.entries[idx]) |entry| {
                    if (psl > entry.psl) return null;
                    
                    if (entry.hash == hash and std.mem.eql(u8, entry.key, key)) {
                        return entry.value;
                    }
                    
                    psl += 1;
                    idx = (idx + 1) % self.capacity;
                } else {
                    return null;
                }
            }
        }
        
        pub fn remove(self: *Self, key: []const u8) bool {
            if (self.count == 0) return false;
            
            const hash = wyhash(key);
            var idx = hash % self.capacity;
            var psl: u32 = 0;
            
            while (true) {
                if (self.entries[idx]) |entry| {
                    if (psl > entry.psl) return false;
                    
                    if (entry.hash == hash and std.mem.eql(u8, entry.key, key)) {
                        self.allocator.free(entry.key);
                        
                        var next_idx = (idx + 1) % self.capacity;
                        while (self.entries[next_idx]) |next_entry| {
                            if (next_entry.psl == 0) break;
                            
                            var shifted = next_entry;
                            shifted.psl -= 1;
                            self.entries[idx] = shifted;
                            idx = next_idx;
                            next_idx = (next_idx + 1) % self.capacity;
                        }
                        
                        self.entries[idx] = null;
                        self.count -= 1;
                        return true;
                    }
                    
                    psl += 1;
                    idx = (idx + 1) % self.capacity;
                } else {
                    return false;
                }
            }
        }
        
        pub fn contains(self: *Self, key: []const u8) bool {
            return self.get(key) != null;
        }
        
        fn resize(self: *Self) !void {
            const old_entries = self.entries;
            
            self.capacity = self.capacity * 2;
            self.entries = try self.allocator.alloc(?Entry, self.capacity);
            @memset(self.entries, null);
            self.count = 0;
            
            for (old_entries) |maybe_entry| {
                if (maybe_entry) |entry| {
                    var new_entry = entry;
                    new_entry.psl = 0;
                    
                    var idx = entry.hash % self.capacity;
                    while (true) {
                        if (self.entries[idx]) |*existing| {
                            if (new_entry.psl > existing.psl) {
                                const temp = existing.*;
                                existing.* = new_entry;
                                new_entry = temp;
                            }
                            new_entry.psl += 1;
                            idx = (idx + 1) % self.capacity;
                        } else {
                            self.entries[idx] = new_entry;
                            self.count += 1;
                            break;
                        }
                    }
                }
            }
            
            self.allocator.free(old_entries);
        }
        
        pub fn clear(self: *Self) void {
            for (self.entries) |maybe_entry| {
                if (maybe_entry) |entry| {
                    self.allocator.free(entry.key);
                }
            }
            @memset(self.entries, null);
            self.count = 0;
        }
        
        pub const Iterator = struct {
            table: *Self,
            index: usize,
            
            pub fn next(self: *Iterator) ?Entry {
                while (self.index < self.table.capacity) {
                    const idx = self.index;
                    self.index += 1;
                    if (self.table.entries[idx]) |entry| {
                        return entry;
                    }
                }
                return null;
            }
        };
        
        pub fn iterator(self: *Self) Iterator {
            return Iterator{
                .table = self,
                .index = 0,
            };
        }
    };
}
