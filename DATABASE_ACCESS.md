# NubDB External Access Configuration

## Overview
NubDB is now accessible externally through the host domain `db.nubcoder.com` on port 6379.

## Access Methods

### 1. Using Python Client (check.py)
The included `check.py` script automatically detects the best connection method:

```bash
# Default: Uses db.nubcoder.com (production)
python3 check.py

# Local development: Uses localhost
NUBDB_HOST=localhost python3 check.py

# Docker network: Uses container name
NUBDB_HOST=nubdb-server python3 check.py

# Custom host
NUBDB_HOST=custom.domain.com python3 check.py
```

**Connection Priority:**
1. Explicit `host` parameter in code
2. `NUBDB_HOST` environment variable
3. Auto-detect: `db.nubcoder.com` (fallback to `localhost` if DNS fails)

### 2. Direct TCP Access
Connect directly to the server:
```bash
# Using netcat
echo "SIZE" | nc db.nubcoder.com 6379

# Using telnet
telnet db.nubcoder.com 6379
```

### 3. Local Development
Connect to localhost when running on the same machine:
```bash
# Port 6379 is mapped to host
nc localhost 6379
NUBDB_HOST=localhost python3 check.py
```

### 4. Docker Network Access
From containers on the `web` network:
```bash
# Use container name
nc nubdb-server 6379
docker run --rm --network web python:3-alpine sh -c "
  apk add py3-pip && 
  pip3 install requests &&
  NUBDB_HOST=nubdb-server python3 /path/to/check.py
"
```

## Service Configuration

### Database Service (db.nubcoder.com)
- **Port**: 6379 (TCP)
- **Protocol**: Redis-compatible protocol
- **Access**: Direct TCP connection
- **Health Check**: `echo SIZE | nc localhost 6379`

### Documentation Service (docs.nubcoder.com)
- **Port**: 8000 (HTTP)
- **Protocol**: HTTP/HTTPS
- **Access**: Web browser or HTTP client
- **URL**: https://docs.nubcoder.com

## Environment Variables

```yaml
# Database
VIRTUAL_HOST=db.nubcoder.com
VIRTUAL_PORT=6379
VIRTUAL_PROTO=tcp

# Documentation
VIRTUAL_HOST=docs.nubcoder.com
VIRTUAL_PORT=8000
LETSENCRYPT_HOST=docs.nubcoder.com
LETSENCRYPT_EMAIL=admin@nubcoder.com
```

## DNS Configuration Required

For external access to work, you need to configure DNS:

```
# A Records
db.nubcoder.com   -> YOUR_SERVER_IP
docs.nubcoder.com -> YOUR_SERVER_IP
```

## Testing Connectivity

### Quick Test with check.py
```bash
# Test with default domain (db.nubcoder.com)
python3 check.py

# Test with localhost
NUBDB_HOST=localhost python3 check.py

# Test from Docker container
docker run --rm --network web \
  -v $(pwd)/check.py:/check.py \
  python:3-alpine python /check.py
```

### Manual Test Database
```bash
# Local test
echo "SIZE" | nc localhost 6379

# Remote test (after DNS is configured)
echo "SIZE" | nc db.nubcoder.com 6379

# Python one-liner
python3 -c "
import socket
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.connect(('db.nubcoder.com', 6379))
sock.sendall(b'SIZE\n')
print(sock.recv(1024).decode())
sock.close()
"
```

### Test Documentation
```bash
# Local test
curl http://localhost:8888  # When using make docs-test

# Remote test (after DNS is configured)
curl https://docs.nubcoder.com
```

## Client Connection Examples

### Python (using check.py)
```python
from check import NubDBClient

# Automatic detection (uses db.nubcoder.com by default)
client = NubDBClient()

# Or specify host explicitly
client = NubDBClient(host='localhost')

# Or use environment variable
import os
os.environ['NUBDB_HOST'] = 'custom.domain.com'
client = NubDBClient()

# Usage
client.set('greeting', 'Hello from NubDB!')
result = client.get('greeting')
print(result)
client.close()
```

### Python (manual implementation)
```python
import socket
import os

class NubDBClient:
    def __init__(self, host=None, port=6379):
        if host is None:
            host = os.getenv('NUBDB_HOST', 'db.nubcoder.com')
        
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.connect((host, port))
    
    def set(self, key, value):
        cmd = f'SET {key} {value}\n'
        self.sock.sendall(cmd.encode())
        return self.sock.recv(1024).decode().strip()
    
    def get(self, key):
        cmd = f'GET {key}\n'
        self.sock.sendall(cmd.encode())
        return self.sock.recv(1024).decode().strip()
    
    def close(self):
        self.sock.close()

# Usage
client = NubDBClient()
client.set('greeting', 'Hello from NubDB!')
result = client.get('greeting')
print(result)
client.close()
```

### Node.js
```javascript
const net = require('net');

class NubDBClient {
    constructor(host = 'db.nubcoder.com', port = 6379) {
        this.client = new net.Socket();
        this.client.connect(port, host);
    }
    
    set(key, value) {
        return new Promise((resolve) => {
            this.client.write(`SET ${key} ${value}\n`);
            this.client.once('data', (data) => {
                resolve(data.toString().trim());
            });
        });
    }
    
    get(key) {
        return new Promise((resolve) => {
            this.client.write(`GET ${key}\n`);
            this.client.once('data', (data) => {
                resolve(data.toString().trim());
            });
        });
    }
}

// Usage
const client = new NubDBClient();
await client.set('greeting', 'Hello from NubDB!');
const result = await client.get('greeting');
console.log(result);
```

## Security Notes

1. **Port 6379 is publicly exposed** - Consider adding firewall rules or authentication
2. **Use SSL/TLS** for production deployments
3. **Configure nginx-proxy** with stream module for TCP proxy with SSL
4. **Limit connections** using Docker resource constraints
5. **Monitor access logs** for suspicious activity

## Firewall Configuration (Optional)

To restrict database access to specific IPs:

```bash
# Allow only specific IPs
sudo ufw allow from 192.168.1.0/24 to any port 6379

# Or use iptables
sudo iptables -A INPUT -p tcp --dport 6379 -s 192.168.1.0/24 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 6379 -j DROP
```

## Troubleshooting

### Cannot connect to db.nubcoder.com
1. Check DNS: `nslookup db.nubcoder.com`
2. Check port: `telnet db.nubcoder.com 6379`
3. Check firewall: `sudo ufw status`
4. Check container: `docker-compose ps`

### Documentation not loading
1. Check DNS: `nslookup docs.nubcoder.com`
2. Check nginx-proxy: `docker ps | grep nginx-proxy`
3. Check container: `docker logs nubdb-docs`
4. Verify VIRTUAL_HOST: `docker inspect nubdb-docs | grep VIRTUAL_HOST`

## Next Steps

1. **Configure DNS** - Point db.nubcoder.com and docs.nubcoder.com to your server
2. **Setup nginx-proxy** - If not already running, deploy nginx-proxy for HTTPS
3. **Enable SSL** - Let's Encrypt will auto-generate certs for docs.nubcoder.com
4. **Add authentication** - Implement auth layer for production use
5. **Monitor performance** - Use Docker stats and logs to monitor usage
