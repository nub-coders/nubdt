const std = @import("std");
const Storage = @import("storage.zig").Storage;
const AOF = @import("aof.zig").AOF;
const AOFConfig = @import("aof.zig").AOFConfig;
const FsyncPolicy = @import("aof.zig").FsyncPolicy;

const BenchResult = struct {
    ops: u64,
    elapsed_ns: i64,
    
    fn throughput(self: BenchResult) f64 {
        const elapsed_s = @as(f64, @floatFromInt(self.elapsed_ns)) / 1_000_000_000.0;
        return @as(f64, @floatFromInt(self.ops)) / elapsed_s;
    }
    
    fn latencyAvg(self: BenchResult) f64 {
        return @as(f64, @floatFromInt(self.elapsed_ns)) / @as(f64, @floatFromInt(self.ops));
    }
};

fn benchmarkSets(storage: *Storage, num_ops: u64) !BenchResult {
    var buf: [64]u8 = undefined;
    
    const start = std.time.nanoTimestamp();
    
    var i: u64 = 0;
    while (i < num_ops) : (i += 1) {
        const key = try std.fmt.bufPrint(&buf, "key{d}", .{i});
        const value = try std.fmt.bufPrint(buf[32..], "value{d}", .{i});
        try storage.set(key, value, 0);
    }
    
    const elapsed: i64 = @intCast(std.time.nanoTimestamp() - start);
    
    return BenchResult{
        .ops = num_ops,
        .elapsed_ns = elapsed,
    };
}

fn benchmarkGets(storage: *Storage, num_ops: u64) !BenchResult {
    var buf: [64]u8 = undefined;
    
    const start = std.time.nanoTimestamp();
    
    var i: u64 = 0;
    while (i < num_ops) : (i += 1) {
        const key = try std.fmt.bufPrint(&buf, "key{d}", .{i});
        _ = storage.get(key);
    }
    
    const elapsed: i64 = @intCast(std.time.nanoTimestamp() - start);
    
    return BenchResult{
        .ops = num_ops,
        .elapsed_ns = elapsed,
    };
}

fn benchmarkMixed(storage: *Storage, num_ops: u64) !BenchResult {
    var buf: [64]u8 = undefined;
    var prng = std.rand.DefaultPrng.init(42);
    const rand = prng.random();
    
    const start = std.time.nanoTimestamp();
    
    var i: u64 = 0;
    while (i < num_ops) : (i += 1) {
        const op = rand.intRangeAtMost(u8, 0, 9);
        
        if (op < 5) {
            const key = try std.fmt.bufPrint(&buf, "key{d}", .{rand.intRangeAtMost(u64, 0, num_ops - 1)});
            _ = storage.get(key);
        } else if (op < 9) {
            const idx = rand.intRangeAtMost(u64, 0, num_ops - 1);
            const key = try std.fmt.bufPrint(&buf, "key{d}", .{idx});
            const value = try std.fmt.bufPrint(buf[32..], "value{d}", .{idx});
            try storage.set(key, value, 0);
        } else {
            const key = try std.fmt.bufPrint(&buf, "key{d}", .{rand.intRangeAtMost(u64, 0, num_ops - 1)});
            _ = try storage.delete(key);
        }
    }
    
    const elapsed: i64 = @intCast(std.time.nanoTimestamp() - start);
    
    return BenchResult{
        .ops = num_ops,
        .elapsed_ns = elapsed,
    };
}

fn benchmarkLatencyPercentiles(storage: *Storage, num_ops: u64, allocator: std.mem.Allocator) !void {
    var latencies = try allocator.alloc(i64, @intCast(num_ops));
    defer allocator.free(latencies);
    
    var buf: [64]u8 = undefined;
    
    var i: u64 = 0;
    while (i < num_ops) : (i += 1) {
        const start = std.time.nanoTimestamp();
        
        const key = try std.fmt.bufPrint(&buf, "key{d}", .{i});
        const value = try std.fmt.bufPrint(buf[32..], "value{d}", .{i});
        try storage.set(key, value, 0);
        
        latencies[i] = @intCast(std.time.nanoTimestamp() - start);
    }
    
    std.mem.sort(i64, latencies, {}, comptime std.sort.asc(i64));
    
    const p50_idx: usize = @intFromFloat(@as(f64, @floatFromInt(num_ops)) * 0.50);
    const p95_idx: usize = @intFromFloat(@as(f64, @floatFromInt(num_ops)) * 0.95);
    const p99_idx: usize = @intFromFloat(@as(f64, @floatFromInt(num_ops)) * 0.99);
    
    const p50 = @as(f64, @floatFromInt(latencies[p50_idx])) / 1000.0;
    const p95 = @as(f64, @floatFromInt(latencies[p95_idx])) / 1000.0;
    const p99 = @as(f64, @floatFromInt(latencies[p99_idx])) / 1000.0;
    
    std.debug.print("  Latency Percentiles:\n", .{});
    std.debug.print("    p50: {d:.2}µs\n", .{p50});
    std.debug.print("    p95: {d:.2}µs\n", .{p95});
    std.debug.print("    p99: {d:.2}µs\n", .{p99});
}

fn benchmarkAOFReplay(allocator: std.mem.Allocator, num_ops: u64) !void {
    std.debug.print("\n=== AOF Replay Benchmark ===\n", .{});
    
    const aof_path = "bench.aof";
    std.fs.cwd().deleteFile(aof_path) catch {};
    
    const storage1 = try Storage.init(allocator);
    defer storage1.deinit();
    
    const aof_config = AOFConfig{
        .path = aof_path,
        .fsync_policy = .every_n_ops,
        .fsync_ops_threshold = 10000,
        .rewrite_threshold_bytes = 1024 * 1024 * 1024,
    };
    
    const aof1 = try AOF.init(allocator, aof_config);
    storage1.enableAOF(aof1);
    
    std.debug.print("Writing {d} operations...\n", .{num_ops});
    var buf: [64]u8 = undefined;
    var i: u64 = 0;
    while (i < num_ops) : (i += 1) {
        const key = try std.fmt.bufPrint(&buf, "key{d}", .{i});
        const value = try std.fmt.bufPrint(buf[32..], "value{d}", .{i});
        try storage1.set(key, value, 0);
    }
    try aof1.forceSync();
    
    const aof_size = aof1.getSizeBytes();
    std.debug.print("AOF size: {d} bytes ({d:.2} MB)\n", .{ aof_size, @as(f64, @floatFromInt(aof_size)) / (1024.0 * 1024.0) });
    
    aof1.deinit();
    
    const storage2 = try Storage.init(allocator);
    defer storage2.deinit();
    
    const aof2 = try AOF.init(allocator, aof_config);
    defer aof2.deinit();
    
    std.debug.print("Replaying AOF...\n", .{});
    const start = std.time.nanoTimestamp();
    
    const ops_replayed = try aof2.replay(storage2, Storage.replayAOFEntry);
    
    const elapsed: i64 = @intCast(std.time.nanoTimestamp() - start);
    const elapsed_ms = @as(f64, @floatFromInt(elapsed)) / 1_000_000.0;
    const throughput = @as(f64, @floatFromInt(ops_replayed)) / (@as(f64, @floatFromInt(elapsed)) / 1_000_000_000.0);
    
    std.debug.print("Replayed {d} operations in {d:.2}ms\n", .{ ops_replayed, elapsed_ms });
    std.debug.print("Replay throughput: {d:.0} ops/sec\n", .{throughput});
    
    std.fs.cwd().deleteFile(aof_path) catch {};
}

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();
    
    std.debug.print("\n╔══════════════════════════════════════════╗\n", .{});
    std.debug.print("║  NubDB - Performance Benchmark Suite    ║\n", .{});
    std.debug.print("╚══════════════════════════════════════════╝\n\n", .{});
    
    const aof_path = "bench_test.aof";
    std.fs.cwd().deleteFile(aof_path) catch {};
    
    const storage = try Storage.init(allocator);
    defer storage.deinit();
    
    const aof_config = AOFConfig{
        .path = aof_path,
        .fsync_policy = .every_n_ops,
        .fsync_ops_threshold = 10000,
        .rewrite_threshold_bytes = 1024 * 1024 * 1024,
    };
    
    const aof = try AOF.init(allocator, aof_config);
    defer aof.deinit();
    
    storage.enableAOF(aof);
    
    const num_ops: u64 = 100_000;
    
    std.debug.print("=== Sequential SET Benchmark ({d} ops) ===\n", .{num_ops});
    const set_result = try benchmarkSets(storage, num_ops);
    std.debug.print("  Throughput: {d:.0} ops/sec\n", .{set_result.throughput()});
    std.debug.print("  Avg Latency: {d:.2}µs\n", .{set_result.latencyAvg() / 1000.0});
    std.debug.print("  Total Time: {d:.2}ms\n", .{@as(f64, @floatFromInt(set_result.elapsed_ns)) / 1_000_000.0});
    
    std.debug.print("\n=== Latency Percentiles (10k ops) ===\n", .{});
    try benchmarkLatencyPercentiles(storage, 10_000, allocator);
    
    std.debug.print("\n=== Sequential GET Benchmark ({d} ops) ===\n", .{num_ops});
    const get_result = try benchmarkGets(storage, num_ops);
    std.debug.print("  Throughput: {d:.0} ops/sec\n", .{get_result.throughput()});
    std.debug.print("  Avg Latency: {d:.2}µs\n", .{get_result.latencyAvg() / 1000.0});
    std.debug.print("  Total Time: {d:.2}ms\n", .{@as(f64, @floatFromInt(get_result.elapsed_ns)) / 1_000_000.0});
    
    std.debug.print("\n=== Mixed Workload Benchmark ({d} ops) ===\n", .{num_ops});
    std.debug.print("  (50%% GET, 40%% SET, 10%% DELETE)\n", .{});
    const mixed_result = try benchmarkMixed(storage, num_ops);
    std.debug.print("  Throughput: {d:.0} ops/sec\n", .{mixed_result.throughput()});
    std.debug.print("  Avg Latency: {d:.2}µs\n", .{mixed_result.latencyAvg() / 1000.0});
    std.debug.print("  Total Time: {d:.2}ms\n", .{@as(f64, @floatFromInt(mixed_result.elapsed_ns)) / 1_000_000.0});
    
    std.debug.print("\n=== Memory Usage ===\n", .{});
    std.debug.print("  Keys in storage: {d}\n", .{storage.size()});
    
    try benchmarkAOFReplay(allocator, 50_000);
    
    std.debug.print("\n✓ All benchmarks completed!\n\n", .{});
    
    std.fs.cwd().deleteFile(aof_path) catch {};
}
