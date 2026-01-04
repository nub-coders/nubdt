# NubDB Docker Guide

This guide explains how to build and run NubDB using Docker.

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Create the external network first
docker network create web

# Build and start both database and documentation
docker-compose up -d

# View logs
docker-compose logs -f

# Stop everything
docker-compose down

# Stop and remove data
docker-compose down -v
```

**Services:**
- **NubDB Database**: `localhost:6379`
- **Documentation**: `https://db.nubcoder.com` (via reverse proxy only)

### Using Docker CLI

```bash
# Build the image
docker build -t nubdb:latest .

# Run the container
docker run -d \
  --name nubdb-server \
  -p 6379:6379 \
  -v nubdb-data:/data \
  nubdb:latest

# View logs
docker logs -f nubdb-server

# Stop the container
docker stop nubdb-server

# Remove the container
docker rm nubdb-server
```

## Configuration

### Custom Port

```bash
# Docker Compose - edit docker-compose.yml
ports:
  - "8080:6379"

# Docker CLI
docker run -d -p 8080:6379 nubdb:latest
```

### Persistent Data

Data is stored in the `/data` directory inside the container. Mount a volume to persist data:

```bash
# Named volume (recommended)
docker run -d -v nubdb-data:/data nubdb:latest

# Host directory
docker run -d -v /path/on/host:/data nubdb:latest
```

### Environment Variables

```yaml
# docker-compose.yml
environment:
  - TZ=America/New_York
```

## Connecting to NubDB

### From Host Machine

```bash
# Using telnet
telnet localhost 6379

# Using netcat
echo "SET mykey myvalue" | nc localhost 6379

# Using Python client
python3 clients/python/nubdb.py
```

### From Another Container

```bash
# Connect to the web network
docker run -it --network web alpine sh

# Inside the container
apk add netcat-openbsd
echo "SET test 123" | nc nubdb-server 6379
```

## Management

### View Container Status

```bash
docker-compose ps
# or
docker ps
```

### Execute Commands

```bash
# Interactive shell
docker exec -it nubdb-server sh

# Check database size
echo "SIZE" | docker exec -i nubdb-server nc localhost 6379

# Set a key
echo "SET mykey myvalue" | docker exec -i nubdb-server nc localhost 6379

# Get a key
echo "GET mykey" | docker exec -i nubdb-server nc localhost 6379
```

### View Logs

```bash
# Follow logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker-compose logs nubdb
```

### Restart Container

```bash
docker-compose restart
# or
docker restart nubdb-server
```

## Health Checks

The container includes a health check that runs every 30 seconds:

```bash
# Check health status
docker inspect --format='{{.State.Health.Status}}' nubdb-server

# View health check logs
docker inspect nubdb-server | grep -A 10 Health
```

## Multi-Container Setup

Example with multiple NubDB instances on web network:

```yaml
version: '3.8'

services:
  nubdb-primary:
    build: .
    container_name: nubdb-primary
    ports:
      - "6379:6379"
    volumes:
      - nubdb-primary-data:/data
    networks:
      - web

  nubdb-secondary:
    build: .
    container_name: nubdb-secondary
    ports:
      - "6380:6379"
    volumes:
      - nubdb-secondary-data:/data
    networks:
      - web

volumes:
  nubdb-primary-data:
  nubdb-secondary-data:

networks:
  web:
    external: true
```

Access instances by container name within the web network:
- `nubdb-primary:6379`
- `nubdb-secondary:6379`

## Backup and Restore

### Backup AOF File

```bash
# Using docker cp
docker cp nubdb-server:/data/nubdb.aof ./backup-$(date +%Y%m%d).aof

# Using volume backup
docker run --rm \
  -v nubdb-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/nubdb-backup.tar.gz -C /data .
```

### Restore AOF File

```bash
# Stop the container
docker-compose down

# Restore the AOF file
docker run --rm \
  -v nubdb-data:/data \
  -v $(pwd):/backup \
  alpine sh -c "cd /data && tar xzf /backup/nubdb-backup.tar.gz"

# Start the container
docker-compose up -d
```

## Performance Tuning

### Resource Limits

```yaml
# docker-compose.yml
services:
  nubdb:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### Optimize for Production

```bash
# Build with optimizations
docker build \
  --build-arg OPTIMIZE=ReleaseFast \
  --tag nubdb:production .
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs

# Check container status
docker ps -a

# Inspect container
docker inspect nubdb-server
```

### Connection Refused

```bash
# Verify port mapping
docker port nubdb-server

# Test from inside container
docker exec -it nubdb-server nc -zv localhost 6379

# Check firewall rules
sudo ufw status
```

### Data Not Persisting

```bash
# Verify volume mount
docker inspect nubdb-server | grep -A 5 Mounts

# List volumes
docker volume ls

# Inspect volume
docker volume inspect nubdb-data
```

### Performance Issues

```bash
# Check resource usage
docker stats nubdb-server

# Check container logs for compaction messages
docker logs nubdb-server | grep Compaction
```

## Development Mode

Run NubDB in interactive mode for development:

```bash
# Build development image
docker build -t nubdb:dev .

# Run in interactive mode (no server)
docker run -it --rm \
  -v $(pwd):/app \
  nubdb:dev \
  sh -c "cd /app && zig build run"
```

## Security

The container runs as a non-root user (uid 1000) for security. Data directory permissions are set appropriately.

### Network Security

```bash
# Create isolated web network
docker network create web

# Run NubDB on web network
docker run -d --network web --name nubdb nubdb:latest

# Other services can connect by name
docker run -d --network web --name webapp your-app:latest
# In webapp: connect to nubdb-server:6379

# Bind to localhost only (host access)
docker run -d -p 127.0.0.1:6379:6379 nubdb:latest
```

## Image Size

The multi-stage build keeps the final image small:

```bash
# Check image size
docker images nubdb

# Expected size: ~10-15MB
```

## Production Deployment

### Docker Stack (Swarm)

```yaml
# stack.yml
version: '3.8'

services:
  nubdb:
    image: nubdb:latest
    ports:
      - "6379:6379"
    volumes:
      - nubdb-data:/data
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          cpus: '2'
          memory: 2G

volumes:
  nubdb-data:
```

Deploy:

```bash
docker stack deploy -c stack.yml nubdb-stack
```

### Kubernetes

See `k8s/` directory for Kubernetes manifests.

## Support

For issues and questions:
- GitHub Issues: https://github.com/yourusername/nubdt/issues
- Documentation: README.md
