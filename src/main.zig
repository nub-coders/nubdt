const std = @import("std");
const Storage = @import("storage.zig").Storage;
const AOF = @import("aof.zig").AOF;
const AOFConfig = @import("aof.zig").AOFConfig;
const FsyncPolicy = @import("aof.zig").FsyncPolicy;
const Compaction = @import("compaction.zig").Compaction;
const protocol = @import("protocol.zig");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();
    
    const stdout = std.io.getStdOut().writer();
    const stdin = std.io.getStdIn().reader();
    
    try stdout.print("NubDB - High-Performance AOF Database\n", .{});
    try stdout.print("Initializing...\n", .{});
    
    const storage = try Storage.init(allocator);
    defer storage.deinit();
    
    const aof_config = AOFConfig{
        .path = "nubdb.aof",
        .fsync_policy = .every_n_ops,
        .fsync_ops_threshold = 1000,
        .rewrite_threshold_bytes = 64 * 1024 * 1024,
    };
    
    const aof = try AOF.init(allocator, aof_config);
    defer aof.deinit();
    
    storage.enableAOF(aof);
    
    try stdout.print("Replaying AOF log...\n", .{});
    const start_replay = std.time.nanoTimestamp();
    
    const ops_replayed = aof.replay(replayCallback) catch |err| blk: {
        if (err == error.EndOfStream) break :blk 0;
        return err;
    };
    
    const replay_time = @as(f64, @floatFromInt(std.time.nanoTimestamp() - start_replay)) / 1_000_000.0;
    try stdout.print("Replayed {d} operations in {d:.2}ms\n", .{ ops_replayed, replay_time });
    
    const compaction = try Compaction.init(allocator, storage, aof);
    defer compaction.deinit();
    
    try stdout.print("Database ready. Type 'quit' to exit.\n\n", .{});
    
    var buf: [4096]u8 = undefined;
    var ops_since_check: usize = 0;
    
    const compaction_thread = try std.Thread.spawn(.{}, compactionWorker, .{ compaction, storage });
    defer compaction_thread.join();
    
    while (true) {
        try stdout.print("> ", .{});
        
        const line = (try stdin.readUntilDelimiterOrEof(&buf, '\n')) orelse break;
        
        if (line.len == 0) continue;
        
        const args = protocol.parseArgs(line);
        
        switch (args.cmd) {
            .set => {
                if (args.key.len == 0 or args.value.len == 0) {
                    try stdout.print("ERROR: SET requires key and value\n", .{});
                    continue;
                }
                storage.set(args.key, args.value, args.ttl) catch |err| {
                    try stdout.print("ERROR: {}\n", .{err});
                    continue;
                };
                try stdout.print("OK\n", .{});
            },
            .get => {
                if (args.key.len == 0) {
                    try stdout.print("ERROR: GET requires key\n", .{});
                    continue;
                }
                if (storage.get(args.key)) |value| {
                    try stdout.print("{s}\n", .{value});
                } else {
                    try stdout.print("(nil)\n", .{});
                }
            },
            .delete => {
                if (args.key.len == 0) {
                    try stdout.print("ERROR: DELETE requires key\n", .{});
                    continue;
                }
                const deleted = storage.delete(args.key) catch |err| {
                    try stdout.print("ERROR: {}\n", .{err});
                    continue;
                };
                if (deleted) {
                    try stdout.print("OK\n", .{});
                } else {
                    try stdout.print("(not found)\n", .{});
                }
            },
            .exists => {
                if (args.key.len == 0) {
                    try stdout.print("ERROR: EXISTS requires key\n", .{});
                    continue;
                }
                const exists = storage.exists(args.key);
                try stdout.print("{d}\n", .{@as(u8, if (exists) 1 else 0)});
            },
            .incr => {
                if (args.key.len == 0) {
                    try stdout.print("ERROR: INCR requires key\n", .{});
                    continue;
                }
                const new_value = storage.increment(args.key, 1) catch |err| {
                    try stdout.print("ERROR: {}\n", .{err});
                    continue;
                };
                try stdout.print("{d}\n", .{new_value});
            },
            .decr => {
                if (args.key.len == 0) {
                    try stdout.print("ERROR: DECR requires key\n", .{});
                    continue;
                }
                const new_value = storage.increment(args.key, -1) catch |err| {
                    try stdout.print("ERROR: {}\n", .{err});
                    continue;
                };
                try stdout.print("{d}\n", .{new_value});
            },
            .size => {
                try stdout.print("{d} keys\n", .{storage.size()});
            },
            .clear => {
                storage.clear();
                try stdout.print("OK\n", .{});
            },
            .quit => {
                try stdout.print("Syncing AOF...\n", .{});
                try aof.forceSync();
                try stdout.print("Goodbye!\n", .{});
                break;
            },
            .unknown => {
                try stdout.print("ERROR: Unknown command. Available: SET, GET, DELETE, EXISTS, INCR, DECR, SIZE, CLEAR, QUIT\n", .{});
            },
        }
        
        ops_since_check += 1;
        if (ops_since_check >= 100) {
            _ = storage.cleanupExpired() catch 0;
            ops_since_check = 0;
        }
    }
}

fn replayCallback(op_type: @import("aof.zig").OpType, key: []const u8, value: []const u8) !void {
    _ = op_type;
    _ = key;
    _ = value;
}

fn compactionWorker(compaction: *Compaction, storage: *Storage) void {
    while (true) {
        std.time.sleep(10 * std.time.ns_per_s);
        
        if (compaction.shouldRewrite()) {
            std.debug.print("\n[Compaction] Starting AOF rewrite...\n", .{});
            const start = std.time.nanoTimestamp();
            
            compaction.rewrite() catch |err| {
                std.debug.print("[Compaction] Error: {}\n", .{err});
                continue;
            };
            
            const elapsed = @as(f64, @floatFromInt(std.time.nanoTimestamp() - start)) / 1_000_000.0;
            std.debug.print("[Compaction] Completed in {d:.2}ms, {d} keys\n", .{ elapsed, storage.size() });
        }
    }
}
