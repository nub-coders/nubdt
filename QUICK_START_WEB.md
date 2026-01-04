# NubDB Quick Start - Web Network

## 1. Create Web Network (One Time)

```bash
docker network create web
```

## 2. Start NubDB

```bash
# Option A: Using docker-compose (recommended)
docker-compose up -d

# Option B: Using Makefile
make compose-up

# Option C: Direct docker run
docker run -d \
  --name nubdb-server \
  --network web \
  -p 6379:6379 \
  -v nubdb-data:/data \
  nubdb:latest
```

## 3. Verify Running

```bash
# Check container status
docker ps | grep nubdb

# View logs
docker-compose logs -f

# Test connection from host
echo "SET hello world" | nc localhost 6379
```

## 4. Connect from Another Container

```bash
# Start your application on the same network
docker run -d \
  --name my-app \
  --network web \
  -e DB_HOST=nubdb-server \
  -e DB_PORT=6379 \
  your-app:latest

# Test from temporary container
docker run --rm --network web alpine sh -c \
  'apk add netcat-openbsd && echo "SIZE" | nc nubdb-server 6379'
```

## 5. Connection Strings

### From Host Machine
```
Host: localhost
Port: 6379
```

### From Container on Web Network
```
Host: nubdb-server
Port: 6379
```

## Example: Python Connection

```python
import socket

# From container on web network
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.connect(('nubdb-server', 6379))
sock.sendall(b'SET mykey myvalue\n')
response = sock.recv(1024)
print(response.decode())
sock.close()
```

## Example: Node.js Connection

```javascript
const net = require('net');

const client = net.createConnection({
  host: 'nubdb-server',  // Service name on web network
  port: 6379
}, () => {
  client.write('SET key value\n');
});

client.on('data', (data) => {
  console.log(data.toString());
  client.end();
});
```

## Common Commands

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# View logs
docker-compose logs -f

# Restart
docker-compose restart

# Check network
docker network inspect web

# Backup data
docker cp nubdb-server:/data/nubdb.aof ./backup.aof

# Shell access
docker exec -it nubdb-server sh
```

## Troubleshooting

### Cannot connect from container
```bash
# Verify both containers are on web network
docker inspect nubdb-server | grep NetworkMode
docker inspect your-app | grep NetworkMode

# Test DNS resolution
docker exec your-app nslookup nubdb-server

# Test connectivity
docker exec your-app nc -zv nubdb-server 6379
```

### Network doesn't exist
```bash
docker network create web
```

### Port already in use
```bash
# Change port in docker-compose.yml
ports:
  - "6380:6379"  # Use 6380 on host instead
```

## Multi-Service Example

```yaml
version: '3.8'

services:
  nubdb:
    image: nubdb:latest
    container_name: nubdb-server
    networks:
      - web
    ports:
      - "6379:6379"
    volumes:
      - nubdb-data:/data

  webapp:
    image: your-webapp:latest
    networks:
      - web
    environment:
      - DB_HOST=nubdb-server
      - DB_PORT=6379
    depends_on:
      - nubdb

volumes:
  nubdb-data:

networks:
  web:
    external: true
```

## Resources

- **Full Docker Guide**: [DOCKER.md](DOCKER.md)
- **Web Network Guide**: [DOCKER_WEB_NETWORK.md](DOCKER_WEB_NETWORK.md)
- **Complete Documentation**: [README.md](README.md)
- **Kubernetes**: [k8s/README.md](k8s/README.md)

## Support

For issues, see the troubleshooting sections in:
- DOCKER.md
- DOCKER_WEB_NETWORK.md
