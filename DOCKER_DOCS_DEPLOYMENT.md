# NubDB Documentation Docker Deployment

This guide explains how to deploy the NubDB documentation website as a separate Docker container.

## Overview

The documentation is served via Nginx in a separate container with:
- Custom domain support (db.nubcoder.com)
- Automatic SSL via Let's Encrypt
- Nginx Proxy Manager / Traefik compatible
- Health checks
- Security headers
- Gzip compression

## Files

- `Dockerfile.docs` - Documentation container build
- `docs-nginx.conf` - Nginx configuration
- `docker-compose.full.yml` - Complete stack (database + docs)
- `docker-compose.docs.yml` - Documentation only

## Quick Start

### Option 1: Full Stack (Database + Documentation)

```bash
# Create web network if not exists
docker network create web

# Start everything
docker-compose -f docker-compose.full.yml up -d

# View logs
docker-compose -f docker-compose.full.yml logs -f
```

### Option 2: Documentation Only

```bash
# Build documentation image
docker build -f Dockerfile.docs -t nubdb-docs:latest .

# Run container
docker run -d \
  --name nubdb-docs \
  --network web \
  -e VIRTUAL_HOST=db.nubcoder.com \
  -e LETSENCRYPT_HOST=db.nubcoder.com \
  -e LETSENCRYPT_EMAIL=admin@nubcoder.com \
  --expose 80 \
  nubdb-docs:latest
```

### Option 3: Documentation with Compose

```bash
docker-compose -f docker-compose.docs.yml up -d
```

## Configuration

### Environment Variables

Required for automatic SSL:
- `VIRTUAL_HOST=db.nubcoder.com` - Your domain
- `LETSENCRYPT_HOST=db.nubcoder.com` - SSL certificate domain
- `LETSENCRYPT_EMAIL=admin@nubcoder.com` - Admin email

### Custom Port (Manual)

```bash
# Expose on specific port (e.g., 8080)
docker run -d \
  --name nubdb-docs \
  --network web \
  -p 8080:80 \
  -e VIRTUAL_HOST=db.nubcoder.com \
  -e LETSENCRYPT_HOST=db.nubcoder.com \
  nubdb-docs:latest
```

## Nginx Proxy Manager Setup

### Prerequisites

Nginx Proxy Manager running on the web network:

```yaml
services:
  nginx-proxy:
    image: jwilder/nginx-proxy
    container_name: nginx-proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/tmp/docker.sock:ro
      - nginx-certs:/etc/nginx/certs
      - nginx-vhost:/etc/nginx/vhost.d
      - nginx-html:/usr/share/nginx/html
    networks:
      - web

  nginx-proxy-acme:
    image: nginxproxy/acme-companion
    container_name: nginx-proxy-acme
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - nginx-certs:/etc/nginx/certs
      - nginx-vhost:/etc/nginx/vhost.d
      - nginx-html:/usr/share/nginx/html
      - acme-state:/etc/acme.sh
    environment:
      - DEFAULT_EMAIL=admin@nubcoder.com
    depends_on:
      - nginx-proxy
    networks:
      - web
```

### Start Documentation

```bash
docker-compose -f docker-compose.docs.yml up -d
```

The documentation will automatically:
1. Register with nginx-proxy
2. Get SSL certificate from Let's Encrypt
3. Be accessible at https://db.nubcoder.com

## Traefik Setup

### Traefik Configuration

If using Traefik instead:

```yaml
services:
  nubdb-docs:
    build:
      context: .
      dockerfile: Dockerfile.docs
    container_name: nubdb-docs
    expose:
      - "80"
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.nubdb-docs.rule=Host(`db.nubcoder.com`)"
      - "traefik.http.routers.nubdb-docs.entrypoints=websecure"
      - "traefik.http.routers.nubdb-docs.tls.certresolver=letsencrypt"
      - "traefik.http.services.nubdb-docs.loadbalancer.server.port=80"
```

## DNS Configuration

Point your domain to the server:

```
A Record:  db.nubcoder.com  →  YOUR_SERVER_IP
```

Wait for DNS propagation (~5-30 minutes).

## Verification

### Check Container Status

```bash
# View containers
docker ps | grep nubdb-docs

# Check logs
docker logs nubdb-docs

# Test health check
docker exec nubdb-docs wget -qO- http://localhost/health
```

### Test Access

```bash
# Local (if port is exposed)
curl http://localhost:8080

# Via domain (after DNS + SSL setup)
curl https://db.nubcoder.com
```

## Image Details

- **Base Image**: nginx:alpine
- **Size**: ~15MB
- **Exposed Port**: 80
- **Security**: Non-root user (uid 1000)
- **Health Check**: `/health` endpoint

## Nginx Features

- ✅ Gzip compression
- ✅ Security headers
- ✅ Static asset caching
- ✅ SPA-friendly routing
- ✅ Health check endpoint
- ✅ Hidden file protection

## Building

### Build Documentation Image

```bash
# Build
docker build -f Dockerfile.docs -t nubdb-docs:latest .

# Check size
docker images nubdb-docs

# Test locally
docker run -d -p 8080:80 nubdb-docs:latest
```

## Production Deployment

### Full Stack with Reverse Proxy

```bash
# 1. Ensure nginx-proxy is running
docker ps | grep nginx-proxy

# 2. Create web network
docker network create web

# 3. Start NubDB stack
docker-compose -f docker-compose.full.yml up -d

# 4. Check status
docker-compose -f docker-compose.full.yml ps

# 5. View logs
docker-compose -f docker-compose.full.yml logs -f nubdb-docs
```

### SSL Certificate Generation

Automatic via ACME companion:
1. Container starts with VIRTUAL_HOST and LETSENCRYPT_HOST
2. ACME companion detects environment variables
3. Requests certificate from Let's Encrypt
4. Certificate auto-renews every 60 days

### Monitor Certificates

```bash
# Check certificate
docker exec nginx-proxy-acme ls -l /etc/nginx/certs/db.nubcoder.com.crt

# View ACME logs
docker logs nginx-proxy-acme
```

## Troubleshooting

### Documentation Not Accessible

```bash
# Check container is running
docker ps | grep nubdb-docs

# Check network
docker inspect nubdb-docs | grep NetworkMode

# Test internally
docker exec nubdb-docs wget -qO- http://localhost/
```

### SSL Certificate Issues

```bash
# Check nginx-proxy logs
docker logs nginx-proxy

# Check ACME logs
docker logs nginx-proxy-acme

# Verify environment variables
docker inspect nubdb-docs | grep -A 5 Env
```

### 502 Bad Gateway

```bash
# Check container health
docker inspect nubdb-docs | grep Health -A 10

# Restart container
docker restart nubdb-docs

# Check nginx-proxy can reach container
docker exec nginx-proxy wget -qO- http://nubdb-docs/health
```

## Updating Documentation

### Rebuild and Deploy

```bash
# Pull latest code
git pull origin main

# Rebuild image
docker build -f Dockerfile.docs -t nubdb-docs:latest .

# Stop old container
docker stop nubdb-docs
docker rm nubdb-docs

# Start new container
docker-compose -f docker-compose.docs.yml up -d

# Or with full stack
docker-compose -f docker-compose.full.yml up -d --build nubdb-docs
```

### Zero-Downtime Update

```bash
# Build new image
docker build -f Dockerfile.docs -t nubdb-docs:v2 .

# Start new container with different name
docker run -d \
  --name nubdb-docs-v2 \
  --network web \
  -e VIRTUAL_HOST=db.nubcoder.com \
  -e LETSENCRYPT_HOST=db.nubcoder.com \
  nubdb-docs:v2

# Wait for health check
sleep 10

# Stop old container
docker stop nubdb-docs
docker rm nubdb-docs

# Rename new container
docker rename nubdb-docs-v2 nubdb-docs
```

## Security Best Practices

1. **Non-root User** - Container runs as uid 1000
2. **Security Headers** - XSS, clickjacking protection
3. **Hidden Files** - Denied by nginx
4. **HTTPS Only** - Via Let's Encrypt
5. **Health Checks** - Automatic restart on failure

## Monitoring

### Health Check

```bash
# Manual check
curl https://db.nubcoder.com/health

# Docker health status
docker inspect nubdb-docs --format='{{.State.Health.Status}}'
```

### Logs

```bash
# Follow logs
docker logs -f nubdb-docs

# Last 100 lines
docker logs --tail 100 nubdb-docs

# Logs with timestamps
docker logs -t nubdb-docs
```

### Metrics

```bash
# Container stats
docker stats nubdb-docs

# Disk usage
docker system df
```

## Backup and Restore

### Backup Documentation

```bash
# Export container
docker export nubdb-docs > nubdb-docs-backup.tar

# Save image
docker save nubdb-docs:latest > nubdb-docs-image.tar
```

### Restore

```bash
# Load image
docker load < nubdb-docs-image.tar

# Run container
docker-compose -f docker-compose.docs.yml up -d
```

## Integration with Main Application

The documentation container works alongside the NubDB database:

```
┌─────────────────────────────────────────────┐
│         Docker Network: web                  │
│                                              │
│  ┌──────────────┐      ┌──────────────┐   │
│  │  nubdb-docs  │      │ nubdb-server │   │
│  │  (port 80)   │      │  (port 6379) │   │
│  └──────────────┘      └──────────────┘   │
│         │                       │           │
│         ▼                       ▼           │
│  ┌─────────────────────────────────────┐  │
│  │      nginx-proxy (80, 443)          │  │
│  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
         │
         ▼
    Internet
    (https://db.nubcoder.com)
```

## Support

For issues:
- GitHub: https://github.com/nub-coders/nubdt/issues
- Documentation: https://db.nubcoder.com

## License

MIT License - Same as NubDB project
