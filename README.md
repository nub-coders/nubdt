# NubDB - High-Performance AOF Database in Zig

A blazing-fast, AOF-based in-memory database written in Zig, optimized for maximum throughput and minimal latency.

📚 **[View Full Documentation →](https://nub-coders.github.io/nubdt/)**

## Features

- **In-Memory Storage**: O(1) hash table lookups using Robin Hood hashing
- **AOF Persistence**: Append-Only File for crash recovery and durability
- **Background Compaction**: Automatic AOF rewriting to prevent unbounded growth
- **Configurable Fsync**: Choose between always, every N ops, or time-based syncing
- **TTL Support**: Automatic key expiration with lazy cleanup
- **Atomic Operations**: INCR/DECR with integer values
- **High Performance**: 100k+ ops/second on modern hardware
- **UTF-8 Support**: Full Unicode support for international text
- **TCP Server Mode**: Multi-threaded TCP server with persistent connections
- **Docker Support**: Production-ready Docker and Kubernetes deployment

## Architecture

### Core Components

```
src/
├── main.zig           # CLI interface and main event loop
├── storage.zig        # In-memory storage engine with RwLock
├── aof.zig            # AOF logging and replay functionality
├── compaction.zig     # Background AOF rewrite logic
├── hash.zig           # Custom Robin Hood hash table
├── protocol.zig       # Command parsing
└── bench.zig          # Comprehensive benchmark suite
```

### Hash Table Implementation

- **Robin Hood Hashing**: Minimizes variance in probe sequence length
- **Dynamic Resizing**: Automatic capacity growth with 90% load factor
- **Zero Allocations**: For lookups (read operations)

### AOF Implementation

Format: `[timestamp:i64][op_type:u8][key_len:u32][key][value_len:u32][value]`

**Fsync Policies:**
- `always`: Sync after every write (safest, slowest)
- `every_n_ops`: Sync after N operations (balanced)
- `every_n_seconds`: Sync every N seconds (fastest, some data loss risk)

**Compaction:**
- Triggered when AOF exceeds threshold (default: 64MB)
- Background thread rewrites AOF with current state only
- Eliminates redundant operations (multiple SETs, DELETEs)

## Quick Start

### Using Docker (Recommended)

```bash
# Create web network
docker network create web

# Start with docker-compose
docker-compose up -d

# Or build and run manually
docker build -t nubdb:latest .
docker run -d --network web -p 6379:6379 -v nubdb-data:/data nubdb:latest

# Connect to the database
echo "SET mykey myvalue" | nc localhost 6379
```

See [DOCKER.md](DOCKER.md) for detailed Docker instructions.  
See [DOCKER_WEB_NETWORK.md](DOCKER_WEB_NETWORK.md) for web network integration.

### Building from Source

```bash
# Using Makefile
make build           # Build the binary
make server          # Run in server mode
make docker-build    # Build Docker image

# Or directly with zig
zig build -Doptimize=ReleaseFast
zig build run -Doptimize=ReleaseFast
zig build bench -Doptimize=ReleaseFast
```

## Usage

### TCP Server Mode

```bash
# Start server on default port (6379)
./nubdt --server

# Start server on custom port
./nubdt --server 8080

# Connect with telnet or netcat
telnet localhost 6379
echo "SET key value" | nc localhost 6379
```

### Interactive Mode

```bash
$ ./nubdt
NubDB - High-Performance AOF Database
Initializing...
Replaying AOF log...
Replayed 0 operations in 0.00ms
Database ready. Type 'quit' to exit.

> SET mykey "Hello, World!"
OK
> GET mykey
Hello, World!
> SET counter 100
OK
> INCR counter
101
> EXISTS mykey
1
> DELETE mykey
OK
> SIZE
1 keys
> QUIT
```

### Commands

| Command | Syntax | Description |
|---------|--------|-------------|
| SET | `SET key value [ttl]` | Set a key-value pair (optional TTL in seconds) |
| GET | `GET key` | Get value by key |
| DELETE | `DELETE key` | Delete a key |
| EXISTS | `EXISTS key` | Check if key exists (returns 1 or 0) |
| INCR | `INCR key` | Increment integer value |
| DECR | `DECR key` | Decrement integer value |
| SIZE | `SIZE` | Get number of keys |
| CLEAR | `CLEAR` | Delete all keys |
| QUIT | `QUIT` | Exit the database |

## Performance

Expected performance on modern hardware (AMD Ryzen/Intel Core i7+):

```
=== Sequential SET Benchmark (100,000 ops) ===
  Throughput: 200,000+ ops/sec
  Avg Latency: <5µs
  
=== Sequential GET Benchmark (100,000 ops) ===
  Throughput: 1,000,000+ ops/sec
  Avg Latency: <1µs
  
=== Mixed Workload (50% GET, 40% SET, 10% DELETE) ===
  Throughput: 300,000+ ops/sec
  
=== Latency Percentiles ===
  p50: <3µs
  p95: <10µs
  p99: <20µs
  
=== AOF Replay ===
  Replay throughput: 500,000+ ops/sec
```

## Optimizations

1. **Robin Hood Hashing**: Reduces maximum probe length for faster lookups
2. **Read-Write Locks**: Lock-free reads, multiple concurrent readers
3. **Atomic Operations**: Lock-free operation counters
4. **Buffered Writes**: Batch AOF writes before syscall
5. **Lazy Expiration**: TTL checked on access, periodic cleanup
6. **Zero-Copy Gets**: Returns direct reference to stored data
7. **Arena Allocators**: Fast temporary allocations (future)
8. **Memory Pooling**: Reduce allocation overhead (future)

## Configuration

Edit `src/main.zig` to customize AOF behavior:

```zig
const aof_config = AOFConfig{
    .path = "nubdb.aof",
    .fsync_policy = .every_n_ops,
    .fsync_ops_threshold = 1000,          // Sync every 1000 ops
    .fsync_seconds_threshold = 1,         // Or every 1 second
    .rewrite_threshold_bytes = 64 * 1024 * 1024, // 64MB
};
```

## Crash Recovery

NubDB automatically replays the AOF on startup:

1. Opens existing `nubdb.aof` file
2. Sequentially reads all operations
3. Applies each operation to in-memory storage
4. Ready to serve requests

Recovery time: ~500k ops/second

## Benchmarking

```bash
zig build bench -Doptimize=ReleaseFast
```

Benchmarks measure:
- Sequential SET throughput
- Sequential GET throughput  
- Mixed workload throughput
- Latency percentiles (p50, p95, p99)
- AOF replay speed
- Memory usage

## Comparison with Redis

NubDB trades some features for raw speed:

| Feature | NubDB | Redis |
|---------|-------|-------|
| Data Structures | String only | Many types |
| Persistence | AOF only | AOF + RDB |
| Replication | No | Yes |
| Pub/Sub | No | Yes |
| Clustering | No | Yes |
| SET Latency | <5µs | ~50µs |
| GET Latency | <1µs | ~20µs |

## Docker & Kubernetes

### Docker Compose with Web Network

```bash
docker network create web     # Create network once
docker-compose up -d          # Start NubDB + Documentation
docker-compose logs -f        # View logs
docker-compose down           # Stop
```

**Access:**
- Database: `localhost:6379` or `db.nubcoder.com:6379`
- Documentation: `https://docs.nubcoder.com` (via reverse proxy)

### Connect Other Services

```bash
# Run app on same network
docker run -d --network web \
  -e NUBDB_HOST=nubdb-server \
  -e NUBDB_PORT=6379 \
  your-app:latest
```

### Kubernetes

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/deployment.yaml
kubectl get pods -n nubdb
```

See [DOCKER.md](DOCKER.md) and [k8s/README.md](k8s/README.md) for details.

## Roadmap

- [x] Network protocol (TCP server mode)
- [x] Docker and Kubernetes support
- [ ] SIMD-accelerated string operations
- [ ] Memory-mapped AOF for zero-copy reads
- [ ] Lock-free hash table
- [ ] RCU for concurrent reads during resize
- [ ] Snapshot/checkpoint support
- [ ] More data types (lists, sets, sorted sets)
- [ ] Lua scripting
- [ ] Redis protocol compatibility

## License

MIT License - See LICENSE file for details

## Author

Built with Zig 0.13.0
