# NubDB Python Client

## Overview

There are two ways to connect to NubDB from Python:

1. **Shell-based Client** (Simple, works now)
2. **Network-based Client** (Better performance, requires server mode)

## Option 1: Shell-based Client (Current)

### Installation

No installation needed! Just import the module:

```python
from nubdb import NubDB
```

### Basic Usage

```python
from nubdb import NubDB

# Initialize client
db = NubDB()

# SET operations
db.set("name", "Alice")
db.set("age", 30)
db.set("session:abc", "user123", ttl=3600)  # Expires in 1 hour

# GET operations
name = db.get("name")  # Returns: "Alice"
age = db.get("age")    # Returns: "30"
missing = db.get("nonexistent")  # Returns: None

# EXISTS
if db.exists("name"):
    print("Key exists!")

# DELETE
db.delete("name")

# Counters
db.set("views", 0)
db.incr("views")  # Returns: 1
db.incr("views")  # Returns: 2
db.decr("views")  # Returns: 1

# SIZE
count = db.size()  # Returns number of keys
```

###Quick Functions

For one-off operations:

```python
from nubdb import set_key, get_key, delete_key

set_key("quick", "value")
value = get_key("quick")
delete_key("quick")
```

### Example: Session Store

```python
import time
from nubdb import NubDB

db = NubDB()

# Store session
session_id = "abc123"
user_data = "user_id:42,role:admin"
db.set(f"session:{session_id}", user_data, ttl=3600)

# Retrieve session
session = db.get(f"session:{session_id}")
if session:
    print(f"Active session: {session}")
else:
    print("Session expired or not found")
```

### Example: Rate Limiting

```python
from nubdb import NubDB

def is_rate_limited(user_id, limit=100):
    db = NubDB()
    key = f"rate:{user_id}:minute"
    
    if not db.exists(key):
        db.set(key, 0, ttl=60)  # Reset every minute
    
    count = db.incr(key)
    return count > limit

# Check rate limit
if is_rate_limited("user42"):
    print("Rate limit exceeded!")
else:
    print("Request allowed")
```

### Example: Caching

```python
import json
from nubdb import NubDB

def get_user_cached(user_id):
    db = NubDB()
    cache_key = f"user:{user_id}"
    
    # Try cache first
    cached = db.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # Fetch from database (simulated)
    user_data = {"id": user_id, "name": "Alice", "email": "alice@example.com"}
    
    # Store in cache for 5 minutes
    db.set(cache_key, json.dumps(user_data), ttl=300)
    
    return user_data

user = get_user_cached(42)
print(user)
```

### Limitations

The current shell-based client:
- ✅ Simple and works out of the box
- ✅ All operations supported
- ✅ No additional dependencies
- ⚠️ Slower (starts new process per operation)
- ⚠️ Not suitable for high-frequency operations

**Performance**: ~10-50 operations/second (subprocess overhead)

## Option 2: Network-based Client (Recommended for Production)

For better performance, NubDB should run as a server. Here's how:

### Step 1: Run NubDB as a background service

```bash
# Start NubDB in the background
./zig-out/bin/nubdt &

# Or use screen/tmux for persistence
screen -dmS nubdb ./zig-out/bin/nubdt
```

### Step 2: Use socket or named pipe communication

```python
import socket

class NubDBNetwork:
    def __init__(self, host='localhost', port=6379):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.connect((host, port))
    
    def set(self, key, value):
        cmd = f"SET {key} {value}\n"
        self.sock.sendall(cmd.encode())
        return self.sock.recv(1024).decode().strip()
    
    def get(self, key):
        cmd = f"GET {key}\n"
        self.sock.sendall(cmd.encode())
        return self.sock.recv(1024).decode().strip()
```

### Step 3: Add TCP server to NubDB (requires code change)

To enable network mode, you would need to add a TCP server to `src/main.zig`:

```zig
// In src/main.zig, add TCP listener
const std = @import("std");

pub fn main() !void {
    // ... existing code ...
    
    // Start TCP server
    const address = try std.net.Address.parseIp("127.0.0.1", 6379);
    var server = try address.listen(.{});
    
    while (true) {
        const connection = try server.accept();
        const thread = try std.Thread.spawn(.{}, handleClient, .{connection});
        thread.detach();
    }
}

fn handleClient(connection: std.net.Server.Connection) void {
    // Handle commands from network client
    // Parse command, execute, send response
}
```

**This requires rebuilding NubDB with network support.**

## Comparison

| Feature | Shell Client | Network Client |
|---------|--------------|----------------|
| Speed | ~10-50 ops/sec | ~100k+ ops/sec |
| Setup | Zero config | Requires server |
| Use Case | Scripts, tools | Production apps |
| Overhead | High (subprocess) | Low (TCP socket) |

## Recommendations

**Use Shell Client for:**
- Quick scripts
- Admin tools
- Testing and development
- Low-frequency operations

**Use Network Client for:**
- Production applications
- High-frequency operations
- Web backends
- Real-time systems

## Complete Example

```python
#!/usr/bin/env python3
"""
Example: Using NubDB for a simple key-value store
"""

from nubdb import NubDB

def main():
    db = NubDB()
    
    # Store user preferences
    print("Storing user preferences...")
    db.set("user:1:theme", "dark")
    db.set("user:1:lang", "en")
    db.set("user:1:notifications", "true")
    
    # Retrieve preferences
    theme = db.get("user:1:theme")
    lang = db.get("user:1:lang")
    notifications = db.get("user:1:notifications")
    
    print(f"Theme: {theme}")
    print(f"Language: {lang}")
    print(f"Notifications: {notifications}")
    
    # Page views counter
    print("\nTracking page views...")
    for _ in range(5):
        views = db.incr("page:home:views")
        print(f"Page views: {views}")
    
    # Check total keys
    print(f"\nTotal keys in database: {db.size()}")

if __name__ == "__main__":
    main()
```

## Troubleshooting

### "NubDB binary not found"
```python
# Specify full path
db = NubDB(nubdt_path="/full/path/to/nubdt")
```

### "Command timed out"
The operation took too long. This usually means:
- NubDB process didn't exit (background thread issue)
- Very large dataset being processed

Solution: Kill any hanging processes:
```bash
pkill nubdt
```

### "No response from command"
Check if nubdt binary has execute permission:
```bash
chmod +x zig-out/bin/nubdt
```

## Future Improvements

1. **TCP Server Mode** - Add network protocol to NubDB
2. **Connection Pooling** - Reuse connections
3. **Async Support** - Python asyncio integration
4. **Batch Operations** - Send multiple commands at once
5. **Pipeline Support** - Queue commands for efficiency

## Contributing

To add network support to NubDB, see the main project README.

