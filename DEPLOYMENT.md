# Hookfire Deployment Checklist (AWS EC2 + Docker)

## 1. AWS Infrastructure

- Create AWS account.
- Enable billing alerts/budget.
- Launch **Ubuntu EC2 (t3.micro, Free Tier)**.
- Create & download SSH key pair.
- Connect via SSH.

---

## 2. Security Group

### Inbound

| Port | Purpose            |
| ---- | ------------------ |
| 22   | SSH (Your IP only) |
| 80   | HTTP (0.0.0.0/0)   |

> During development only:
>
> - 3000 → Temporary (remove after Nginx proxy is working)

### Outbound

- Allow **All Traffic** (default).

---

## 3. EC2 Setup

```bash
sudo apt update && sudo apt upgrade -y
sudo reboot
```

Install:

- Git
- Docker Engine
- Docker Compose

Add user to docker group:

```bash
sudo usermod -aG docker ubuntu
```

Reconnect.

---

## 4. Clone Project

```bash
git clone <repo>
cd hookfire
```

---

## 5. Environment Variables

Create:

```text
.env
```

Configure:

### Infrastructure

- POSTGRES_USER
- POSTGRES_PASSWORD
- POSTGRES_DB
- REDIS_PASSWORD

### Backend

- DATABASE_URL (constructed internally by Docker Compose from POSTGRES_* vars in `docker-compose.prod.yml`)
- WEBHOOK_SECRET
- ENCRYPTION_KEY
- APP_URL
- ALLOWED_ORIGINS
- PORT

### Frontend

- VITE_API_URL

### Environment

- NODE_ENV=production

> Never commit `.env`.

---

## 6. Production Containers

Services:

- dashboard
- api
- fanout-worker
- webhook-worker
- postgres
- redis

---

## 7. Production Docker Images

### Dashboard

- Multi-stage build
- Vite build
- Nginx serves static files

### API

- Multi-stage build
- TypeScript compilation
- Prisma generate
- Production Node runtime

### Workers

Reuse **same API image**.

Only startup command differs.

---

## 8. Networking

Architecture:

```text
Internet
    │
    ▼
 Nginx (80)
    │
 ├── Dashboard
 └── API Proxy
         │
         ▼
       Express
         │
  ┌──────┴──────┐
  ▼             ▼
Postgres      Redis
               │
        Fanout Worker
               │
        Webhook Worker
```

Only Nginx exposed publicly.

All containers communicate through Docker internal network.

---

## 9. Reverse Proxy

Nginx:

- Serve React build (static files, SPA fallback via `try_files`).
- Proxy API routes (`/events`, `/deliveries`, `/metrics`, `/dlq`, `/endpoints`, `/demo`, `/webhook-test`) to `api:3000`.

Since all traffic goes through Nginx (same origin), no CORS configuration is needed in production.

---

## 10. Database

Persistent Docker volume.

Run:

```bash
docker compose -f docker-compose.prod.yml run --rm api npx prisma migrate deploy
```

Never use `db push` in production.

---

## 11. Redis

Configured as:

- Non-persistent
- In-memory only

Suitable for MVP queue processing.

---

## 12. Security

Implemented:

- Reverse proxy
- Internal Docker network
- Environment variables
- Rate limiting
- Request body size limits
- Restricted SSH
- Public HTTP only

Future:

- HTTPS
- Domain

---

## 13. Logging

- Pino logging
- stdout/stderr
- Docker log rotation

Example:

```yaml
logging:
  driver: json-file
  options:
    max-size: "10m"
    max-file: "2"
```

No log files inside containers.

---

## 14. Health Checks

Implemented:

- API
- Dashboard
- PostgreSQL
- Redis

Used by Docker to detect unhealthy services.

---

## 15. Deployment Flow

```text
EC2
   │
Git Pull
   │
Docker Build
   │
Prisma Migrate
   │
Docker Up
   │
Health Checks
   │
Application Ready
```

Commands:

```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d postgres redis
docker compose -f docker-compose.prod.yml run --rm api npx prisma migrate deploy
docker compose -f docker-compose.prod.yml up -d
```

---

## 16. Verification

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
docker stats
```

---

## 17. Deployment Characteristics

- Production Docker images
- Containerized architecture
- Independent workers
- Queue-driven processing
- Reverse proxy
- Persistent PostgreSQL
- Non-persistent Redis
- Environment-based configuration
- Health checks
- Log rotation
- AWS EC2 deployment

---

## Future Enhancements

- HTTPS (Let's Encrypt)
- Custom domain
- CI/CD (GitHub Actions)
- Monitoring (Prometheus/Grafana or CloudWatch)
- Automated backups
- Zero-downtime deployments

---

# Final Production Architecture

```text
                    Internet
                        │
                        ▼
                 Nginx (Port 80)
              Reverse Proxy + SPA
                 │           │
                 ▼           ▼
           Dashboard       API
                             │
                      ┌──────┴──────┐
                      ▼             ▼
                 PostgreSQL      Redis
                                     │
                          ┌──────────┴──────────┐
                          ▼                     ▼
                    Fanout Worker       Webhook Worker
```

This deployment provides a production-style, containerized backend architecture suitable for a portfolio project while remaining lightweight enough to run within the AWS Free Tier.
