---
description: How to deploy the NubDT stack (database + TLS proxy + web console + docs)
---

# NubDT Deployment Workflow

## Prerequisites
- Docker and Docker Compose installed
- External Docker network `web` created: `docker network create web`
- DNS records configured:
  - `console.nubcoder.com` → your server IP (web console)
  - `nubdt.nubcoder.com` → your server IP (documentation)

## Steps

### 1. Set environment variables
Create `.env` in the project root:
```bash
cp nubdb-web/.env.example .env
```
Edit `.env` and set:
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
- `SMTP_USER` — your Gmail address
- `SMTP_PASS` — your Gmail App Password
- `SMTP_FROM` — sender display name

### 2. Build all services
// turbo
```bash
docker compose build
```

### 3. Start the stack
// turbo
```bash
docker compose up -d
```

### 4. Initialize the web database
// turbo
```bash
docker compose exec nubdt-web npx prisma db push
```

### 5. Verify all services are healthy
// turbo
```bash
docker compose ps
```

### 6. Check logs if needed
// turbo
```bash
docker compose logs -f --tail=50
```

## Service Ports
| Service | Internal | External | Protocol |
|---------|----------|----------|----------|
| NubDT DB | 6379 | 6379 | TCP |
| NubDT TLS | 6380 | 6380 | TCP+TLS |
| Web Console | 3000 | — | HTTP (behind Nginx) |
| Docs | 8000 | — | HTTP (behind Nginx) |

## Connection Strings
- Plain: `nubdb://your-server:6379`
- TLS: `nubdbs://your-server:6380`
- Python: `NubDB("nubdbs://your-server:6380")`

## Updating
// turbo
```bash
docker compose pull && docker compose up -d --build
```
