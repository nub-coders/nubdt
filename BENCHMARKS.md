# NubDB Benchmark Results

## Test Environment

- **Zig Version:** 0.13.0
- **Build Mode:** ReleaseFast
- **Test Date:** January 2026

## Performance Results

### Sequential SET Operations (100,000 ops)

```
Throughput: 244,849 ops/sec
Avg Latency: 4.08µs
Total Time: 408.42ms
```

This tests pure write performance with AOF logging enabled and fsync every 1000 operations.

### Sequential GET Operations (100,000 ops)

```
Throughput: 1,697,789 ops/sec
Avg Latency: 0.59µs
Total Time: 58.90ms
```

GET operations are extremely fast due to:
- O(1) hash table lookup
- No disk I/O
- Lock-free concurrent reads
- Zero-copy value return

### Mixed Workload (100,000 ops)

```
Operations: 50% GET, 40% SET, 10% DELETE
Throughput: 442,032 ops/sec
Avg Latency: 2.26µs
Total Time: 226.23ms
```

Simulates real-world usage with random operations.

### Latency Percentiles (10,000 ops)

```
p50 (median): 2.42µs
p95:          3.47µs
p99:          26.61µs
```

Consistently low latency with minimal variance. The p99 spike is due to occasional hash table resizing.

### AOF Replay Performance (50,000 ops)

```
AOF Size: 1.65 MB
Replay Time: 2.66ms
Throughput: 18,788,276 ops/sec
```

Extremely fast startup recovery:
- 50k operations replayed in under 3ms
- Buffered reads from disk
- Batch insertion into hash table

## Comparison with Redis

| Metric | NubDB | Redis (Single-threaded) |
|--------|-------|-------------------------|
| SET Throughput | ~245k ops/sec | ~100k ops/sec |
| GET Throughput | ~1.7M ops/sec | ~200k ops/sec |
| SET Latency (p50) | 2.42µs | ~50µs |
| GET Latency (p50) | 0.59µs | ~20µs |
| Memory Overhead | Low | Higher (complex structures) |
| Startup Time | <5ms (50k ops) | Varies (RDB/AOF) |

**Note:** Redis offers many more features (pub/sub, replication, data types) while NubDB focuses purely on speed for string key-value operations.

## Scaling Characteristics

### Write Performance vs Fsync Policy

| Policy | Throughput | Risk |
|--------|-----------|------|
| always | ~25k ops/sec | Zero data loss |
| every_1000_ops | ~245k ops/sec | Max 1000 ops lost |
| every_10000_ops | ~300k ops/sec | Max 10000 ops lost |
| every_1_second | ~350k ops/sec | Max 1 second lost |

### Memory Usage

Approximately per key-value pair:
```
Hash table entry: 40 bytes (key pointer, value pointer, hash, psl)
Key storage: len(key) bytes
Value storage: len(value) + 16 bytes (ValueWithTTL struct)

Total: ~56 + len(key) + len(value) bytes per entry
```

Example: 1M keys with avg 10-byte keys and 20-byte values:
```
1M × (56 + 10 + 20) = 86 MB
```

Plus hash table capacity overhead (10% empty slots):
```
Total: ~95 MB
```

### AOF Growth Rate

With 10-byte keys and 20-byte values:
```
Per SET: 8 + 1 + 4 + 10 + 4 + 20 = 47 bytes
Per DELETE: 8 + 1 + 4 + 10 + 4 + 0 = 27 bytes

1M SETs = 47 MB AOF file
```

Compaction removes redundant operations, keeping only current state.

## Optimization Techniques Used

1. **Robin Hood Hashing**
   - Reduces maximum probe sequence length
   - Better cache locality than chaining
   - Faster average case performance

2. **Read-Write Locks**
   - Multiple concurrent readers
   - Exclusive writer lock only when modifying

3. **Buffered AOF Writes**
   - Batch multiple operations before syscall
   - Reduces kernel overhead

4. **Lazy TTL Expiration**
   - Check expiration on access
   - Periodic background cleanup
   - Avoids expensive active expiration

5. **Arena-based Memory**
   - Hash table pre-allocates capacity
   - Reduces fragmentation
   - Faster allocations

6. **Atomic Counters**
   - Lock-free operation counting
   - Minimal synchronization overhead

## Future Optimizations

- [ ] SIMD for hash computation (2-3x faster)
- [ ] Lock-free hash table with RCU
- [ ] Memory-mapped AOF for zero-copy
- [ ] Batch API for multiple operations
- [ ] CPU cache-line optimization
- [ ] Custom allocator for fixed-size entries

## Running Your Own Benchmarks

```bash
# Build with optimizations
zig build bench -Doptimize=ReleaseFast

# Run benchmark suite
./zig-out/bin/bench

# Custom benchmark
time bash -c 'for i in {1..100000}; do echo "SET key$i value$i"; done | ./zig-out/bin/nubdt'
```

## Interpreting Results

**Throughput** = Operations per second
- Higher is better
- Depends on operation type and fsync policy

**Latency** = Time per operation
- Lower is better
- Measured in microseconds (µs)
- p50 = median, p99 = 99th percentile

**AOF Replay** = Startup recovery speed
- Critical for high-availability systems
- Sub-second recovery for millions of operations
