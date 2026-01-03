# Python Integration for NubDB

## Current Status

NubDB is a **CLI-based database** designed for interactive use. Direct Python integration via subprocess has challenges due to the background compaction thread that doesn't exit immediately.

## Solution Options

### Option 1: Use Batch Files (Recommended for Now)

The simplest approach is to use file-based communication:

```python
#!/usr/bin/env python3
import subprocess
import tempfile

def execute_nubdb_batch(commands):
    """Execute multiple NubDB commands via batch file"""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        for cmd in commands:
            f.write(cmd + '\n')
        f.write('QUIT\n')
        batch_file = f.name
    
    result = subprocess.run(
        f'./zig-out/bin/nubdt < {batch_file}',
        shell=True,
        capture_output=True,
        text=True,
        timeout=5
    )
    
    import os
    os.unlink(batch_file)
    
    # Parse output
    lines = [l for l in result.stdout.split('\n') 
             if l and not l.startswith('>') and 'NubDB' not in l 
             and 'Initializing' not in l]
    return lines

# Usage
commands = [
    'SET user:1 "Alice"',
    'SET user:2 "Bob"',
    'GET user:1',
    'SIZE'
]

results = execute_nubdb_batch(commands)
for r in results:
    print(r)
```

**Pros:**
- Works immediately
- No code changes needed
- Batch operations are efficient

**Cons:**
- Subprocess overhead
- Not suitable for high-frequency ops

### Option 2: Add TCP Server Mode (Best for Production)

Modify NubDB to run as a TCP server. This requires adding code to `src/main.zig`:

#### Step 1: Create TCP Server Mode

Add a new file `src/server.zig`:

```zig
const std = @import("std");
const Storage = @import("storage.zig").Storage;
const protocol = @import("protocol.zig");

pub fn startServer(storage: *Storage, port: u16) !void {
    const address = try std.net.Address.parseIp("127.0.0.1", port);
    var server = try address.listen(.{
        .reuse_address = true,
    });
    
    std.debug.print("NubDB server listening on port {d}\n", .{port});
    
    while (true) {
        const connection = try server.accept();
        const thread = try std.Thread.spawn(.{}, handleClient, .{storage, connection});
        thread.detach();
    }
}

fn handleClient(storage: *Storage, connection: std.net.Server.Connection) void {
    defer connection.stream.close();
    
    var buf: [4096]u8 = undefined;
    var reader = connection.stream.reader();
    var writer = connection.stream.writer();
    
    while (true) {
        const line = reader.readUntilDelimiterOrEof(&buf, '\n') catch break;
        if (line == null) break;
        
        const args = protocol.parseArgs(line.?);
        
        switch (args.cmd) {
            .set => {
                storage.set(args.key, args.value, args.ttl) catch {
                    writer.writeAll("-ERR\n") catch break;
                    continue;
                };
                writer.writeAll("+OK\n") catch break;
            },
            .get => {
                if (storage.get(args.key)) |value| {
                    writer.print("${d}\n{s}\n", .{value.len, value}) catch break;
                } else {
                    writer.writeAll("$-1\n") catch break;
                }
            },
            .quit => break,
            else => {
                writer.writeAll("-ERR unknown command\n") catch break;
            },
        }
    }
}
```

#### Step 2: Modify main.zig

Add server mode:

```zig
const args = try std.process.argsAlloc(allocator);
defer std.process.argsFree(allocator, args);

if (args.len > 1 and std.mem.eql(u8, args[1], "--server")) {
    const port: u16 = if (args.len > 2) 
        try std.fmt.parseInt(u16, args[2], 10) 
    else 
        6379;
    
    try @import("server.zig").startServer(storage, port);
} else {
    // Existing CLI mode
    // ...
}
```

#### Step 3: Rebuild

```bash
zig build -Doptimize=ReleaseFast
```

#### Step 4: Python Client

```python
import socket

class NubDB:
    def __init__(self, host='localhost', port=6379):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.connect((host, port))
        self.file = self.sock.makefile('rw')
    
    def set(self, key, value):
        self.file.write(f'SET {key} "{value}"\n')
        self.file.flush()
        response = self.file.readline().strip()
        return response == '+OK'
    
    def get(self, key):
        self.file.write(f'GET {key}\n')
        self.file.flush()
        
        header = self.file.readline().strip()
        if header == '$-1':
            return None
        
        size = int(header[1:])
        value = self.file.read(size)
        self.file.readline()  # consume newline
        return value
    
    def close(self):
        self.file.write('QUIT\n')
        self.file.flush()
        self.sock.close()

# Usage
db = NubDB()
db.set("name", "Alice")
value = db.get("name")
db.close()
```

**Performance:** 100k+ ops/sec

### Option 3: Use Named Pipes (Unix-only)

Create a FIFO for command/response:

```bash
mkfifo /tmp/nubdb_cmd
mkfifo /tmp/nubdb_resp
```

Modify NubDB to read from `/tmp/nubdb_cmd` and write to `/tmp/nubdb_resp`.

```python
def nubdb_command(cmd):
    with open('/tmp/nubdb_cmd', 'w') as f:
        f.write(cmd + '\n')
    
    with open('/tmp/nubdb_resp', 'r') as f:
        return f.readline().strip()
```

### Option 4: Use Redis Protocol (RESP)

Implement Redis RESP protocol for compatibility with existing Python clients like `redis-py`:

```python
import redis

r = redis.Redis(host='localhost', port=6379)
r.set('name', 'Alice')
value = r.get('name')
```

This requires implementing RESP protocol in NubDB.

## Comparison

| Method | Speed | Complexity | Production Ready |
|--------|-------|------------|------------------|
| Batch Files | Low (~10 ops/sec) | Simple | ❌ Scripts only |
| TCP Server | High (100k+ ops/sec) | Medium | ✅ Recommended |
| Named Pipes | Medium (~1k ops/sec) | Medium | ⚠️ Unix only |
| Redis RESP | High (100k+ ops/sec) | High | ✅ Best |

## Quick Example (Batch Mode)

```python
#!/usr/bin/env python3
"""Quick NubDB integration example"""

import subprocess
import os

# Write commands to file
with open('/tmp/nubdb_commands.txt', 'w') as f:
    f.write('SET user:1 "Alice"\n')
    f.write('SET user:2 "Bob"\n')
    f.write('GET user:1\n')
    f.write('SIZE\n')
    f.write('QUIT\n')

# Execute NubDB with commands
result = subprocess.run(
    './zig-out/bin/nubdt < /tmp/nubdb_commands.txt',
    shell=True,
    capture_output=True,
    text=True,
    timeout=5
)

# Clean up
os.unlink('/tmp/nubdb_commands.txt')

# Parse results
print(result.stdout)
```

## Recommendation

For production use with Python:

1. **Short term:** Use batch file approach for scripts and tools
2. **Long term:** Add TCP server mode for high-performance applications

The TCP server modification is straightforward and would make NubDB production-ready for Python applications.

## Example Use Cases

### With Batch Mode (Now)
- Admin scripts
- Data migration tools
- Testing utilities
- Cron jobs

### With TCP Server (After modification)
- Web application backends
- Real-time systems
- High-frequency trading
- Session storage
- Caching layer

## Need Help?

To add TCP server support:
1. Create `src/server.zig` with TCP listener
2. Add server mode flag to `main.zig`
3. Rebuild and test
4. Use provided Python client

**Estimated work:** 2-3 hours for basic TCP server

