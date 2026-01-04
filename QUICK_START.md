# NubDB Quick Start Guide

## 🚀 One-Command Start

```bash
# Create network and start everything
docker network create web
docker-compose up -d
```

**That's it!** You now have:
- ✅ NubDB Database running on port `6379`
- ✅ Documentation website on port `8080`
- ✅ Auto SSL setup for `db.nubcoder.com`

## 📋 Access Points

### Database
```bash
# From host
echo "SET key value" | nc localhost 6379

# From another container
docker run --network web alpine sh -c \
  "echo 'SET key value' | nc nubdb-server 6379"
```

### Documentation

**Direct Access (HTTP):**
```
http://localhost:8080
```

**Via Reverse Proxy (HTTPS):**
```
https://db.nubcoder.com
```

## 🔧 Common Commands

### Start/Stop

```bash
# Start everything
docker-compose up -d

# Stop everything
docker-compose down

# Restart
docker-compose restart

# View logs
docker-compose logs -f

# Status
docker-compose ps
```

### Individual Services

```bash
# Start only database
docker-compose up -d nubdb

# Start only documentation
docker-compose up -d nubdb-docs

# Stop documentation
docker-compose stop nubdb-docs

# View database logs
docker-compose logs -f nubdb

# View documentation logs
docker-compose logs -f nubdb-docs
```

### Using Makefile

```bash
# Full stack
make compose-up          # Start everything
make compose-down        # Stop everything
make compose-logs        # View logs

# Documentation only
make docs-run            # Start docs
make docs-stop           # Stop docs
make docs-logs           # View logs
make docs-restart        # Restart docs

# Database only
make docker-build        # Build database image
make docker-run          # Run database
make docker-stop         # Stop database

# Testing
make docs-test           # Test docs on port 8888
```

## 🌐 Port Configuration

Default ports:
- **Database**: `6379` (standard Redis port)
- **Documentation**: `8080` (HTTP)

Change ports in `docker-compose.yml`:

```yaml
ports:
  - "6379:6379"    # Database (change left number)
  - "8080:80"      # Documentation (change left number)
```

Examples:
```yaml
# Use different ports
ports:
  - "6380:6379"    # Database on 6380
  - "9000:80"      # Documentation on 9000
```

## 🔐 SSL Configuration

The documentation container is pre-configured for automatic SSL via nginx-proxy:

```yaml
environment:
  - VIRTUAL_HOST=db.nubcoder.com
  - LETSENCRYPT_HOST=db.nubcoder.com
  - LETSENCRYPT_EMAIL=admin@nubcoder.com
```

**Prerequisites:**
1. nginx-proxy running on `web` network
2. DNS pointing `db.nubcoder.com` to your server
3. Port 80 and 443 open on firewall

**Setup nginx-proxy:**
```bash
docker run -d \
  --name nginx-proxy \
  -p 80:80 -p 443:443 \
  -v /var/run/docker.sock:/tmp/docker.sock:ro \
  --network web \
  jwilder/nginx-proxy

docker run -d \
  --name nginx-proxy-acme \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  --volumes-from nginx-proxy \
  --network web \
  nginxproxy/acme-companion
```

## 📊 Health Checks

Both services have built-in health checks:

```bash
# Check container health
docker inspect nubdb-server | grep -A 5 Health
docker inspect nubdb-docs | grep -A 5 Health

# Test endpoints
echo "SIZE" | nc localhost 6379                    # Database
curl http://localhost:8080/health                  # Documentation
```

## 💾 Data Persistence

Database data is stored in a Docker volume:

```bash
# List volumes
docker volume ls | grep nubdb

# Backup volume
docker run --rm \
  -v nubdb-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/nubdb-backup.tar.gz -C /data .

# Restore volume
docker-compose down
docker run --rm \
  -v nubdb-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/nubdb-backup.tar.gz -C /data
docker-compose up -d
```

## 🔍 Troubleshooting

### Services won't start

```bash
# Check network exists
docker network ls | grep web
docker network create web

# Check logs
docker-compose logs

# Rebuild images
docker-compose build --no-cache
docker-compose up -d
```

### Can't connect to database

```bash
# Check if running
docker ps | grep nubdb-server

# Test connection
echo "PING" | nc localhost 6379

# Check from container
docker exec nubdb-server sh -c "echo SIZE | nc localhost 6379"
```

### Documentation not accessible

```bash
# Check if running
docker ps | grep nubdb-docs

# Test direct access
curl http://localhost:8080

# Test health endpoint
curl http://localhost:8080/health

# Check logs
docker logs nubdb-docs
```

### Port already in use

```bash
# Find what's using the port
sudo lsof -i :6379
sudo lsof -i :8080

# Change port in docker-compose.yml
# Example: "6380:6379" instead of "6379:6379"
```

## 📚 Next Steps

- [Full Docker Guide](DOCKER.md)
- [Web Network Guide](DOCKER_WEB_NETWORK.md)
- [API Reference](https://db.nubcoder.com) or `http://localhost:8080`
- [Kubernetes Deployment](k8s/README.md)

## 💡 Tips

1. **Always create the `web` network first**
   ```bash
   docker network create web
   ```

2. **Use docker-compose for production**
   - Easier management
   - Automatic restarts
   - Health checks

3. **Monitor logs regularly**
   ```bash
   docker-compose logs -f --tail=100
   ```

4. **Backup your data**
   - Database: Volume `nubdb-data`
   - AOF file: `/data/nubdb.aof`

5. **Update regularly**
   ```bash
   git pull origin main
   docker-compose build
   docker-compose up -d
   ```

## 🆘 Quick Reference

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Logs
docker-compose logs -f

# Status
docker-compose ps

# Restart
docker-compose restart

# Update
docker-compose pull && docker-compose up -d

# Clean everything
docker-compose down -v
docker system prune -a
```

## ✨ Success Indicators

You'll know everything is working when:

✅ `docker-compose ps` shows all services "Up (healthy)"  
✅ `echo "PING" | nc localhost 6379` returns "PONG"  
✅ `curl http://localhost:8080` returns HTML  
✅ `curl http://localhost:8080/health` returns "healthy"  
✅ https://db.nubcoder.com loads (if DNS configured)

---

**Need help?** Check the [troubleshooting guide](DOCKER.md#troubleshooting) or [open an issue](https://github.com/nub-coders/nubdt/issues).
