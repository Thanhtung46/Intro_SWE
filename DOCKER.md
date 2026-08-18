# SPOT Platform - Docker Setup Guide

## Overview

SPOT Platform is containerized with Docker. All services can run together using docker-compose.

## Services

| Service | Port | Type | Image |
|---------|------|------|-------|
| **Backend** | 3000 | Node.js | spot-backend |
| **Frontend Web** | 3001 | Next.js | spot-frontend-web |
| **Admin Console** | 3002 | Nginx + Vite | spot-admin-console |
| **Recommendation** | 5001 | Python FastAPI | spot-recommendation |
| **No-Show Service** | 5002 | Python FastAPI | spot-noshow |
| **NLP Assistant** | 5003 | Python FastAPI | spot-nlp |
| **PostgreSQL** | 5432 | Database | postgres:15-alpine |
| **Redis** | 6379 | Cache | redis:7-alpine |

> **Note**: this guide references `./scripts/docker-dev.sh`,
> `docker-health.sh`, `docker-prod.sh`, `docker-stop.sh` in several places
> below — no `scripts/` directory exists at the repo root today. Use the
> plain `docker compose`/`docker-compose` commands shown alongside each
> script reference until those scripts are added.

## Development Setup

### Prerequisites

- Docker Desktop (v20.10+)
- Docker Compose (v2.0+)
- 8GB RAM (minimum)
- Git
- Supabase project credentials in `spot-backend/.env` (default DB for backend)

### Database: Supabase (default)

Backend reads `DB_*` / `DB_SSL` from [`spot-backend/.env`](spot-backend/.env) (Session pooler). Local Postgres is **not** started unless you opt in.

```bash
# Redis + backend (Supabase)
docker compose up -d --build redis backend

# Optional: run migrations inside the backend container
docker compose run --rm backend npm run migrate

# Optional local Postgres instead
docker compose --profile local-db up -d postgres
```

### Quick Start

```bash
# Clone repository
git clone <repo>
cd spot-platform

# Start all services
./scripts/docker-dev.sh

# Or manually
docker-compose up -d
```

### Access Services

- **Backend API**: http://localhost:3000
- **Frontend Web**: http://localhost:3001
- **Admin Dashboard**: http://localhost:3002
- **Recommendation API**: http://localhost:5001
- **No-Show API**: http://localhost:5002
- **NLP API**: http://localhost:5003

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend-web
docker-compose logs -f recommendation
```

### Work on Specific Branch

```bash
# Backend
git checkout feature/backend
docker-compose up backend postgres redis

# Frontend Web
git checkout feature/frontend-web
docker-compose up frontend-web backend

# Admin Console
git checkout feature/admin-console
docker-compose up admin-console backend

# AI Services
git checkout feature/ai-services
docker-compose up recommendation noshow nlp postgres
```

## Development Commands

### Build Images

```bash
# Build all
docker-compose build

# Build specific service
docker-compose build backend
docker-compose build frontend-web
```

### Stop Services

```bash
# Stop all (keep volumes)
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Using script
./scripts/docker-stop.sh
```

### Health Check

```bash
./scripts/docker-health.sh

# Manual check
curl http://localhost:3000/health
curl http://localhost:5001/health
```

### Database Access

```bash
# Connect to PostgreSQL
docker exec -it spot-postgres psql -U spot_user -d spot_dev

# Common commands:
# \dt                      - List tables
# \d tablename            - Show table structure
# SELECT * FROM users;    - Query data

# Redis
docker exec -it spot-redis redis-cli
# > KEYS *                 - List keys
# > GET key                - Get value
```

### Rebuild & Restart

```bash
# Fresh rebuild (no cache)
docker-compose build --no-cache

# Restart specific service
docker-compose restart backend
docker-compose restart frontend-web

# Full restart
docker-compose down -v && docker-compose up -d
```

## Production Deployment

### Prerequisites

- Docker & Docker Compose on server
- Environment variables configured
- SSL certificates (if using HTTPS)

### Deploy

```bash
# Copy .env.production to server
scp .env.production user@server:/opt/spot/

# SSH into server
ssh user@server

# Pull latest code
cd /opt/spot
git pull origin main

# Start production services
./scripts/docker-prod.sh

# Verify
./scripts/docker-health.sh
```

### Production Environment

```bash
# .env.production
NODE_ENV=production
DB_PASSWORD=your-secure-password
JWT_SECRET=your-production-secret
GEMINI_API_KEY=your-production-key
API_URL=https://api.spot.com
```

### Monitoring

```bash
# View logs
docker-compose -f docker-compose.production.yml logs -f backend

# Check container stats
docker stats

# Health check
curl https://api.spot.com/health
```

### Backup Database

```bash
# Backup PostgreSQL
docker exec spot-postgres pg_dump -U spot_user spot_prod > backup.sql

# Restore
docker exec -i spot-postgres psql -U spot_user spot_prod < backup.sql
```

## Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose logs backend

# Verify ports aren't in use
lsof -i :3000
lsof -i :5432

# Rebuild without cache
docker-compose build --no-cache
```

### Database connection error

```bash
# Check PostgreSQL is healthy
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### Slow performance

```bash
# Check resource usage
docker stats

# Increase Docker memory limit
# Settings > Resources > Memory (set to 4GB+)
```

### Permission denied errors

```bash
# Run with sudo (not recommended)
sudo docker-compose up

# Or add user to docker group
sudo usermod -aG docker $USER
```

## Best Practices

- **Use .env files** for configuration (never commit credentials)
- **Health checks** ensure services are ready before use
- **Volume mounts** in dev enable hot reload
- **Production images** are optimized for size and security
- **Network isolation** with Docker networks
- **Restart policies** ensure recovery from failures

## Additional Resources

- [Docker Documentation](https://docs.docker.com)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file)
- [Best Practices](https://docs.docker.com/develop/dev-best-practices)
