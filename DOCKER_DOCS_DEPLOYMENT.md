# NubDB Documentation Docker Deployment

This guide explains how to deploy the NubDB documentation website as a separate Docker container.

## Overview

The documentation is served via Nginx in a separate container with:
- Custom port 8000 (internal)
- Custom domain support (db.nubcoder.com)
- Automatic SSL via Let's Encrypt
- Nginx Proxy Manager / Traefik compatible
- Health checks
- Security headers
- Gzip compression

## Port Configuration

**Important**: Documentation runs on port **8000** internally (not 80) to avoid conflicts with other applications.

- Internal port: 8000
- External access: https://db.nubcoder.com (via reverse proxy)
- Test port: 8888 (temporary, via `make docs-test`)

## Files

- `Dockerfile.docs` - Documentation container build (port 8000)
- `docs-nginx.conf` - Nginx configuration (listens on 8000)
- `docker-compose.yml` - Complete stack (database + docs)

## Quick Start

### Using Docker Compose

```bash
# Create web network if not exists
docker network create web

# Start everything
docker-compose up -d

# View logs
docker-compose logs -f nubdb-docs
```

### Manual Docker Run

```bash
# Build documentation image
docker build -f Dockerfile.docs -t nubdb-docs:latest .

# Run container
docker run -d \
  --name nubdb-docs \
  --network web \
  -e VIRTUAL_HOST=db.nubcoder.com \
  -e VIRTUAL_PORT=8000 \
  -e LETSENCRYPT_HOST=db.nubcoder.com \
  -e LETSENCRYPT_EMAIL=admin@nubcoder.com \
  --expose 8000 \
  nubdb-docs:latest
```

## Configuration

### Environment Variables

Required for automatic SSL:
- `VIRTUAL_HOST=db.nubcoder.com` - Your domain
- `VIRTUAL_PORT=8000` - Internal port (important!)
- `LETSENCRYPT_HOST=db.nubcoder.com` - SSL certificate domain
- `LETSENCRYPT_EMAIL=admin@nubcoder.com` - Admin email

**Note**: `VIRTUAL_PORT=8000` tells nginx-proxy which internal port to use.

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
docker-compose up -d nubdb-docs
```

The documentation will automatically:
1. Register with nginx-proxy on port 8000
2. Get SSL certificate from Let's Encrypt
3. Be accessible at https://db.nubcoder.com

## Traefik Setup

If using Traefik instead:

```yaml
services:
  nubdb-docs:
    build:
      context: .
      dockerfile: Dockerfile.docs
    container_name: nubdb-docs
    expose:
      - "8000"
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.nubdb-docs.rule=Host(`db.nubcoder.com`)"
      - "traefik.http.routers.nubdb-docs.entrypoints=websecure"
      - "traefik.http.routers.nubdb-docs.tls.certresolver=letsencrypt"
      - "traefik.http.services.nubdb-docs.loadbalancer.server.port=8000"
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

# Test health check (from web network)
docker run --rm --network web alpine sh -c \
  "apk add wget && wget -qO- http://nubdb-docs:8000/health"
```

### Test Access

```bash
# Via domain (after DNS + SSL setup)
curl https://db.nubcoder.com

# From web network
docker exec nginx-proxy wget -qO- http://nubdb-docs:8000/health
```

## Image Details

- **Base Image**: nginx:alpine
- **Size**: ~15MB
- **Exposed Port**: 8000 (internal)
- **Security**: Non-root user
- **Health Check**: `/health` endpoint on port 8000

## Building

### Build Documentation Image

```bash
# Build
docker build -f Dockerfile.docs -t nubdb-docs:latest .

# Check size
docker images nubdb-docs

# Test locally
docker run -d -p 8888:8000 nubdb-docs:latest
curl http://localhost:8888/health
```

## Troubleshooting

### Documentation Not Accessible

```bash
# Check container is running
docker ps | grep nubdb-docs

# Check network
docker inspect nubdb-docs | grep NetworkMode

# Test internally on port 8000
docker exec nubdb-docs wget -qO- http://localhost:8000/
```

### nginx-proxy Not Routing Traffic

```bash
# Check VIRTUAL_PORT is set
docker inspect nubdb-docs | grep VIRTUAL_PORT

# Should show: VIRTUAL_PORT=8000

# If missing, add to docker-compose.yml:
environment:
  - VIRTUAL_PORT=8000
```

### Wrong Port in nginx-proxy

```bash
# Check nginx-proxy configuration
docker exec nginx-proxy cat /etc/nginx/conf.d/default.conf | grep db.nubcoder.com

# Should show proxy_pass to port 8000
# If showing port 80, VIRTUAL_PORT is not set correctly
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

## Port Conflict Resolution

If you encounter port conflicts:

1. **Change internal port** (in this example, using 8000):
   - Update `docs-nginx.conf`: `listen 8000;`
   - Update `Dockerfile.docs`: `EXPOSE 8000`
   - Update `docker-compose.yml`: `expose: ["8000"]` and `VIRTUAL_PORT=8000`

2. **Alternative ports** you can use:
   - 8000 (current)
   - 8001, 8002, etc.
   - 9000, 9001, etc.
   - Any unused port

## Testing with Direct Port

For temporary testing with direct port access:

```bash
# Test with port mapping
docker run -d --name docs-test -p 8888:8000 nubdb-docs:latest

# Access
curl http://localhost:8888
curl http://localhost:8888/health

# Clean up
docker stop docs-test && docker rm docs-test
```

Or use Makefile:
```bash
make docs-test
```

## Production Deployment

### Full Stack with Reverse Proxy

```bash
# 1. Ensure nginx-proxy is running
docker ps | grep nginx-proxy

# 2. Create web network
docker network create web

# 3. Start NubDB stack
docker-compose up -d

# 4. Check status
docker-compose ps

# 5. Verify VIRTUAL_PORT
docker inspect nubdb-docs | grep VIRTUAL_PORT

# 6. View logs
docker-compose logs -f nubdb-docs
```

## Important Notes

1. **Port 8000 is internal** - not accessible from host
2. **VIRTUAL_PORT must be set** - tells nginx-proxy which port to use
3. **No port mapping in compose** - only expose, no ports directive
4. **Access via reverse proxy only** - https://db.nubcoder.com
5. **Health check uses port 8000** - `/health` endpoint

## Support

For issues:
- GitHub: https://github.com/nub-coders/nubdt/issues
- Documentation: https://db.nubcoder.com

## License

MIT License - Same as NubDB project
