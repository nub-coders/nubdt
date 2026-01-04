# Docker Web Network Setup

This document explains the web network configuration for NubDB.

## Overview

NubDB is configured to use an external Docker network called `web`. This allows:
- **Service Discovery**: Other containers can connect to NubDB by name (`nubdb-server:6379`)
- **Network Isolation**: Services on the web network can communicate with each other
- **Multi-Service Deployments**: Easy integration with web apps, APIs, and other services
- **Flexible Architecture**: Mix and match services on the same network

## Network Architecture

```
┌─────────────────────────────────────────────┐
│           Docker Network: web                │
│                                              │
│  ┌──────────────┐    ┌──────────────┐      │
│  │  nubdb-server │◄───┤  web-app     │      │
│  │  (6379)       │    │  (5000)      │      │
│  └──────────────┘    └──────────────┘      │
│         │                     │              │
│         │             ┌──────────────┐      │
│         └─────────────┤  api-server  │      │
│                       │  (8080)      │      │
│                       └──────────────┘      │
│                                              │
└─────────────────────────────────────────────┘
         │                      │
    Host: 6379           Host: 5000, 8080
```

## Setup

### 1. Create the Web Network

```bash
# Create the external network (only needed once)
docker network create web

# Verify network exists
docker network ls | grep web
```

### 2. Start NubDB

```bash
# Using docker-compose (automatically handles network)
make compose-up
# or
docker-compose up -d

# Using docker CLI
docker run -d \
  --name nubdb-server \
  --network web \
  -p 6379:6379 \
  -v nubdb-data:/data \
  nubdb:latest
```

### 3. Connect Other Services

```bash
# Example: Start a web app on the same network
docker run -d \
  --name my-webapp \
  --network web \
  -p 8080:8080 \
  -e NUBDB_HOST=nubdb-server \
  -e NUBDB_PORT=6379 \
  my-webapp:latest
```

## Service Connection Examples

### From Another Container

```bash
# Start an interactive container on the web network
docker run -it --rm --network web alpine sh

# Install netcat
apk add --no-cache netcat-openbsd

# Connect to NubDB by service name
echo "SET mykey myvalue" | nc nubdb-server 6379
echo "GET mykey" | nc nubdb-server 6379
```

### Python Application

```python
import socket

def connect_to_nubdb():
    # Connect using service name
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.connect(('nubdb-server', 6379))
    
    # Send command
    sock.sendall(b'SET key value\n')
    response = sock.recv(1024)
    print(response.decode())
    
    sock.close()

# Run this from a container on the 'web' network
connect_to_nubdb()
```

### Node.js Application

```javascript
const net = require('net');

const client = net.createConnection({ 
  host: 'nubdb-server',  // Service name
  port: 6379 
}, () => {
  console.log('Connected to NubDB');
  client.write('SET key value\n');
});

client.on('data', (data) => {
  console.log(data.toString());
  client.end();
});
```

## Multi-Service Stack

Use the example stack configuration:

```bash
# Start complete stack with web app + NubDB
docker-compose -f docker-compose.web-stack.yml up -d

# Access services:
# - NubDB: localhost:6379
# - Web App: localhost:5000
# - Cache DB: localhost:6380

# Internal connectivity:
# - webapp connects to nubdb-server:6379
# - webapp connects to nubdb-cache:6379
```

## Network Management

### List Containers on Web Network

```bash
docker network inspect web
```

### Connect Existing Container to Web Network

```bash
docker network connect web <container-name>
```

### Disconnect Container from Web Network

```bash
docker network disconnect web <container-name>
```

### Remove Web Network

```bash
# Stop all containers using the network first
docker-compose down

# Remove the network
docker network rm web
```

## Advanced Configuration

### Internal Network (No External Access)

```yaml
networks:
  web:
    external: true
  internal:
    internal: true  # No external connectivity

services:
  nubdb:
    networks:
      - web
      - internal
```

### Custom Network with Specific Subnet

```bash
# Create network with custom subnet
docker network create web \
  --subnet=172.20.0.0/16 \
  --gateway=172.20.0.1

# Assign static IP to NubDB
docker run -d \
  --name nubdb-server \
  --network web \
  --ip 172.20.0.10 \
  nubdb:latest
```

### Network Aliases

```yaml
services:
  nubdb:
    networks:
      web:
        aliases:
          - database
          - db
          - cache
```

Now other services can connect using any alias:
- `nubdb-server:6379`
- `database:6379`
- `db:6379`
- `cache:6379`

## Load Balancing

For multiple NubDB instances behind a load balancer:

```yaml
version: '3.8'

services:
  nubdb1:
    image: nubdb:latest
    networks:
      - web
  
  nubdb2:
    image: nubdb:latest
    networks:
      - web
  
  nubdb3:
    image: nubdb:latest
    networks:
      - web
  
  nginx-lb:
    image: nginx:alpine
    ports:
      - "6379:6379"
    networks:
      - web
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf

networks:
  web:
    external: true
```

## Security Best Practices

1. **Don't expose ports unnecessarily**
   ```yaml
   # Use 'expose' for internal-only access
   expose:
     - "6379"
   # Only use 'ports' if host access needed
   ports:
     - "6379:6379"
   ```

2. **Use separate networks for different tiers**
   ```yaml
   networks:
     frontend:
       external: true
       name: web
     backend:
       internal: true
   ```

3. **Limit network access**
   ```bash
   # Create firewall rules
   docker network create web --opt com.docker.network.bridge.enable_icc=false
   ```

## Troubleshooting

### Container Can't Connect to NubDB

```bash
# Check if both containers are on same network
docker inspect nubdb-server | grep NetworkMode
docker inspect your-app | grep NetworkMode

# Test connectivity
docker exec your-app ping nubdb-server
docker exec your-app nc -zv nubdb-server 6379
```

### DNS Resolution Issues

```bash
# Check Docker DNS
docker exec your-app nslookup nubdb-server

# Check /etc/hosts
docker exec your-app cat /etc/hosts
```

### Network Already Exists Error

```bash
# If network exists but is not external
docker network rm web
docker network create web
```

## Benefits of Web Network

✅ **Service Discovery** - Automatic DNS resolution by container name  
✅ **Isolation** - Separate network from other Docker projects  
✅ **Scalability** - Easy to add more services  
✅ **Portability** - Same configuration across environments  
✅ **Integration** - Works with Traefik, Nginx Proxy Manager, etc.  
✅ **Security** - Network-level isolation  

## Integration with Reverse Proxies

### Traefik

```yaml
services:
  nubdb:
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.tcp.routers.nubdb.rule=HostSNI(`*`)"
      - "traefik.tcp.routers.nubdb.entrypoints=nubdb"
      - "traefik.tcp.services.nubdb.loadbalancer.server.port=6379"
```

### Nginx Proxy Manager

Simply add NubDB service to the web network and configure upstream in NPM UI.

## Production Recommendations

1. Always use the external web network
2. Don't expose database ports publicly
3. Use Docker secrets for sensitive data
4. Implement health checks
5. Configure resource limits
6. Use persistent volumes for data
7. Regular backups via volume snapshots

For more details, see [DOCKER.md](DOCKER.md).
