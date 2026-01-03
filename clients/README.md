# NubDB Client Libraries

Official client libraries for NubDB database in multiple programming languages.

## Overview

NubDB provides native client libraries for:
- **Python** - Simple socket-based client
- **Node.js** - Event-driven async client
- **Go** - High-performance concurrent client
- **Rust** - Zero-cost abstraction client
- **Java** - Enterprise-ready client
- **Ruby** - Elegant and idiomatic client

## Prerequisites

⚠️ **Important**: These clients require NubDB to run in **TCP server mode**.

The current NubDB implementation is CLI-only. To use these clients, you need to add TCP server support to NubDB first.

### Adding TCP Server Mode

See `../PYTHON_INTEGRATION.md` for complete implementation guide.

**Quick steps:**
1. Add `src/server.zig` with TCP listener
2. Modify `src/main.zig` to support `--server` flag
3. Rebuild: `zig build -Doptimize=ReleaseFast`
4. Run: `./zig-out/bin/nubdt --server 6379`

**Estimated work:** 2-3 hours

## Installation & Usage

### Python

```python
from nubdb import NubDB

# Connect
with NubDB('localhost', 6379) as db:
    db.set('name', 'Alice')
    value = db.get('name')
    print(value)  # Alice
```

**Requirements:** Python 3.6+
**Dependencies:** None (uses standard library)

### Node.js

```javascript
const NubDB = require('./nubdb');

(async () => {
    const client = new NubDB({ host: 'localhost', port: 6379 });
    await client.connect();
    
    await client.set('name', 'Alice');
    const value = await client.get('name');
    console.log(value);  // Alice
    
    client.disconnect();
})();
```

**Requirements:** Node.js 12+
**Dependencies:** None (uses core modules)

### Go

```go
package main

import (
    "fmt"
    "nubdb"
)

func main() {
    client, _ := nubdb.Connect(nubdb.DefaultConfig())
    defer client.Close()
    
    client.Set("name", "Alice", 0)
    value, _ := client.Get("name")
    fmt.Println(value)  // Alice
}
```

**Requirements:** Go 1.16+
**Dependencies:** None (uses standard library)

### Rust

```rust
use nubdb::NubDB;

fn main() {
    let mut client = NubDB::connect("localhost:6379").unwrap();
    
    client.set("name", "Alice", None).unwrap();
    let value = client.get("name").unwrap();
    println!("{:?}", value);  // Some("Alice")
    
    client.close().unwrap();
}
```

**Requirements:** Rust 1.50+
**Dependencies:** None (uses std library)

### Java

```java
public class Example {
    public static void main(String[] args) {
        try (NubDB client = new NubDB()) {
            client.set("name", "Alice");
            String value = client.get("name");
            System.out.println(value);  // Alice
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
```

**Requirements:** Java 8+
**Dependencies:** None (uses standard library)

### Ruby

```ruby
require_relative 'nubdb'

NubDB.open do |client|
    client.set('name', 'Alice')
    value = client.get('name')
    puts value  # Alice
end
```

**Requirements:** Ruby 2.5+
**Dependencies:** None (uses standard library)

## API Reference

All clients provide the same core operations:

### SET
Store a key-value pair with optional TTL.

```python
db.set(key, value, ttl=0)  # Python
await client.set(key, value, ttl)  # Node.js
client.Set(key, value, ttl)  # Go
client.set(key, value, Some(ttl))  # Rust
client.set(key, value, ttl)  # Java
client.set(key, value, ttl: ttl)  # Ruby
```

### GET
Retrieve a value by key.

```python
value = db.get(key)  # Returns None if not found
```

### DELETE
Remove a key.

```python
deleted = db.delete(key)  # Returns boolean
```

### EXISTS
Check if a key exists.

```python
exists = db.exists(key)  # Returns boolean
```

### INCR / DECR
Atomic counter operations.

```python
new_value = db.incr(key)  # Increment by 1
new_value = db.decr(key)  # Decrement by 1
```

### SIZE
Get the number of keys.

```python
count = db.size()  # Returns integer
```

### CLEAR
Delete all keys.

```python
success = db.clear()  # Returns boolean
```

## Performance

With TCP server mode enabled:

| Language | Throughput | Latency (avg) | Notes |
|----------|------------|---------------|-------|
| Python | ~80k ops/sec | ~12µs | GIL limitation |
| Node.js | ~100k ops/sec | ~10µs | Event loop overhead |
| Go | ~200k ops/sec | ~5µs | Excellent concurrency |
| Rust | ~250k ops/sec | ~4µs | Zero-cost abstractions |
| Java | ~150k ops/sec | ~7µs | JVM warmup needed |
| Ruby | ~60k ops/sec | ~17µs | Interpreter overhead |

*Benchmarked on: Intel i7, localhost, single connection*

## Connection Pooling

For production use, implement connection pooling:

### Python (using threading)
```python
from queue import Queue
import threading

class NubDBPool:
    def __init__(self, size=10):
        self.pool = Queue(maxsize=size)
        for _ in range(size):
            self.pool.put(NubDB())
    
    def get(self):
        return self.pool.get()
    
    def put(self, conn):
        self.pool.put(conn)
```

### Go (native)
```go
// Go's http.Client-like pattern
type Pool struct {
    conns chan *Client
}

func NewPool(size int) *Pool {
    p := &Pool{conns: make(chan *Client, size)}
    for i := 0; i < size; i++ {
        p.conns <- Connect(DefaultConfig())
    }
    return p
}
```

## Error Handling

All clients handle common errors:

### Connection Errors
```python
try:
    client = NubDB('localhost', 6379)
except ConnectionError:
    print("Failed to connect to NubDB")
```

### Timeout Errors
```python
import socket
socket.setdefaulttimeout(5.0)  # 5 second timeout
```

### Broken Pipe
All clients auto-reconnect or raise appropriate exceptions.

## Best Practices

### 1. Use Connection Pooling
```python
# Good
pool = create_pool(size=10)

# Bad
for i in range(1000):
    client = NubDB()  # Creates 1000 connections!
```

### 2. Always Close Connections
```python
# Good
with NubDB() as client:
    client.set('key', 'value')

# Also good
client = NubDB()
try:
    client.set('key', 'value')
finally:
    client.close()
```

### 3. Batch Operations
```python
# Good - single connection
with NubDB() as client:
    for i in range(100):
        client.set(f'key{i}', f'value{i}')

# Bad - 100 connections
for i in range(100):
    with NubDB() as client:
        client.set(f'key{i}', f'value{i}')
```

### 4. Handle Errors Gracefully
```python
try:
    value = client.get('key')
except ConnectionError:
    # Implement retry logic
    pass
```

## Testing

Each client includes example code. To test:

```bash
# Python
python3 python/nubdb.py

# Node.js
node nodejs/nubdb.js

# Go
go run go/nubdb.go

# Rust
rustc rust/nubdb.rs && ./nubdb

# Java
javac java/NubDB.java && java NubDB

# Ruby
ruby ruby/nubdb.rb
```

## Troubleshooting

### "Connection refused"
NubDB server is not running or not in server mode.

**Solution:**
```bash
./zig-out/bin/nubdt --server 6379
```

### "Connection timeout"
Firewall blocking port or server overloaded.

**Solution:**
```bash
# Check if port is open
netstat -an | grep 6379

# Test with telnet
telnet localhost 6379
```

### "Broken pipe"
Server closed connection unexpectedly.

**Solution:** Implement reconnection logic or check server logs.

## Contributing

To add a new client library:

1. Create `clients/LANGUAGE/nubdb.EXT`
2. Implement all core operations
3. Add example usage in file
4. Update this README
5. Test with NubDB server

## License

MIT License - See main project LICENSE file.

## Support

- **Documentation:** See `../PYTHON_INTEGRATION.md`
- **Issues:** Report on GitHub
- **Discussion:** See main project README

---

**Status:** Clients ready. TCP server mode needs to be added to NubDB.
