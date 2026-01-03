# Quick Start Guide - NubDB

## Installation

```bash
# Build the database and benchmark suite
zig build -Doptimize=ReleaseFast

# Run the database
zig build run -Doptimize=ReleaseFast

# Run benchmarks
zig build bench -Doptimize=ReleaseFast
```

## Basic Usage

### Starting the Database

```bash
./zig-out/bin/nubdt
```

You'll see:
```
NubDB - High-Performance AOF Database
Initializing...
Replaying AOF log...
Replayed 0 operations in 0.00ms
Database ready. Type 'quit' to exit.

>
```

### Commands

#### SET - Store a value
```
> SET mykey "Hello, World!"
OK

> SET counter 100
OK

> SET session:abc "user123" 3600
OK  (expires in 3600 seconds)
```

#### GET - Retrieve a value
```
> GET mykey
Hello, World!

> GET nonexistent
(nil)
```

#### DELETE - Remove a key
```
> DELETE mykey
OK

> DELETE nonexistent
(not found)
```

#### EXISTS - Check if key exists
```
> EXISTS mykey
1

> EXISTS nonexistent
0
```

#### INCR/DECR - Atomic integer operations
```
> SET counter 100
OK

> INCR counter
101

> INCR counter
102

> DECR counter
101
```

#### SIZE - Count keys
```
> SIZE
42 keys
```

#### CLEAR - Delete all keys
```
> CLEAR
OK
```

#### QUIT - Exit database
```
> QUIT
Syncing AOF...
Goodbye!
```

## Performance Tips

### 1. Choose the Right Fsync Policy

In `src/main.zig`, configure AOF syncing:

```zig
const aof_config = AOFConfig{
    .path = "nubdb.aof",
    .fsync_policy = .every_n_ops,      // Recommended
    .fsync_ops_threshold = 1000,        // Sync every 1000 operations
};
```

**Policies:**
- `.always` - Safest, but 10x slower (~25k ops/sec)
- `.every_n_ops` - Best balance (~250k SET ops/sec)
- `.every_n_seconds` - Fastest, small risk (~300k SET ops/sec)

### 2. Batch Operations

Instead of:
```
SET key1 value1
SET key2 value2
SET key3 value3
```

Use a script:
```bash
echo -e "SET key1 value1\nSET key2 value2\nSET key3 value3\nQUIT" | ./zig-out/bin/nubdt
```

### 3. Monitor AOF Size

The database automatically rewrites the AOF when it exceeds 64MB (configurable):

```zig
.rewrite_threshold_bytes = 64 * 1024 * 1024,  // 64MB default
```

You'll see:
```
[Compaction] Starting AOF rewrite...
[Compaction] Completed in 12.45ms, 10000 keys
```

## Architecture Deep Dive

### Hash Table

NubDB uses **Robin Hood Hashing** for:
- O(1) average lookup time
- Low variance in probe lengths
- Excellent cache locality

The hash table automatically resizes at 90% load factor.

### AOF Format

Each operation is encoded as:
```
[timestamp: i64][op_type: u8][key_len: u32][key][value_len: u32][value]
```

**Example:** Setting "name" = "Alice"
```
Timestamp: 8 bytes
Op Type: 1 byte (1 = SET, 2 = DELETE)
Key Length: 4 bytes (4)
Key: "name" (4 bytes)
Value Length: 4 bytes (5)
Value: "Alice" (5 bytes)
Total: 26 bytes
```

### Crash Recovery

On startup, NubDB:
1. Opens `nubdb.aof`
2. Reads each operation sequentially
3. Replays operations to rebuild in-memory state
4. Ready to serve requests

**Recovery Performance:** 18M+ ops/sec (typical)

### Concurrency Model

- **Reads:** Multiple concurrent readers using RwLock (shared lock)
- **Writes:** Exclusive lock, serialized
- **Counters:** Lock-free atomic operations

This provides:
- 1M+ GET ops/sec (parallel reads)
- 250k+ SET ops/sec (serialized writes)
- 400k+ mixed workload ops/sec

## Benchmark Results

On modern hardware (tested):

```
=== Sequential SET (100k ops) ===
  Throughput: 244,849 ops/sec
  Avg Latency: 4.08µs
  
=== Sequential GET (100k ops) ===
  Throughput: 1,697,789 ops/sec
  Avg Latency: 0.59µs
  
=== Mixed Workload ===
  50% GET, 40% SET, 10% DELETE
  Throughput: 442,032 ops/sec
  
=== Latency Percentiles ===
  p50: 2.42µs
  p95: 3.47µs
  p99: 26.61µs
  
=== AOF Replay ===
  Throughput: 18,788,276 ops/sec
```

## Production Checklist

- [ ] Set appropriate fsync policy for your durability requirements
- [ ] Configure AOF rewrite threshold based on disk space
- [ ] Monitor AOF file size growth
- [ ] Test crash recovery with your workload
- [ ] Benchmark with your access patterns
- [ ] Consider backup strategy for AOF file

## Troubleshooting

### "AOF file too large"
```bash
# Trigger manual compaction by restarting
# Or increase threshold in config
.rewrite_threshold_bytes = 256 * 1024 * 1024  // 256MB
```

### "Slow writes"
```bash
# Check fsync policy - try every_n_ops
.fsync_policy = .every_n_ops,
.fsync_ops_threshold = 5000,  // Increase threshold
```

### "Memory usage high"
```bash
# Run CLEAR to delete all keys
# Or restart to compact AOF
```

### "Slow startup"
```bash
# Large AOF file detected
# Wait for replay to complete
# Or delete AOF for fresh start (loses data!)
rm nubdb.aof
```

## Advanced Features

### TTL (Time-To-Live)

```
> SET session:abc "user123" 3600
OK

# After 3600 seconds...
> GET session:abc
(nil)
```

Keys are lazily expired - checked on GET, periodic cleanup every 100 ops.

### UTF-8 Support

```
> SET greeting "Hello, 世界! 🚀"
OK

> GET greeting
Hello, 世界! 🚀
```

Full Unicode support out of the box.

### Persistence Guarantees

With `.always` fsync policy:
- **Zero data loss** on crash
- Every operation durably written

With `.every_n_ops`:
- At most N operations lost on crash
- Much higher throughput

With `.every_n_seconds`:
- At most N seconds of operations lost
- Maximum throughput

## Example Use Cases

### 1. Session Store
```
SET session:abc123 "user_id:42,role:admin" 3600
GET session:abc123
```

### 2. Rate Limiting
```
SET rate:user:42:minute 0
INCR rate:user:42:minute
INCR rate:user:42:minute
GET rate:user:42:minute  # Check count
```

### 3. Cache
```
SET cache:user:42 "{\"name\":\"Alice\",\"email\":\"alice@example.com\"}" 300
GET cache:user:42
```

### 4. Counters
```
SET page:views:home 0
INCR page:views:home
INCR page:views:home
GET page:views:home
```

## Roadmap

See README.md for planned features.

## License

MIT License
