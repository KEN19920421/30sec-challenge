# 30sec Challenge -- Production Deployment Guide

This guide covers deploying the 30sec Challenge backend (Node.js/TypeScript + PostgreSQL + Redis + S3) to a production server using Docker Compose.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start with Docker Compose](#quick-start-with-docker-compose)
3. [Production Environment Variables](#production-environment-variables)
4. [SSL/HTTPS Setup](#sslhttps-setup)
5. [Database Setup](#database-setup)
6. [Monitoring and Logging](#monitoring-and-logging)
7. [Scaling](#scaling)
8. [CI/CD Pipeline](#cicd-pipeline)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Server Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU      | 2 vCPU  | 4 vCPU      |
| RAM      | 4 GB    | 8 GB        |
| Disk     | 40 GB SSD | 100 GB SSD |
| OS       | Ubuntu 22.04 LTS / Debian 12 | Ubuntu 24.04 LTS |

The docker-compose.prod.yml reserves approximately 896 MB RAM across all containers (256 MB app + 512 MB Postgres + 128 MB Redis) with upper limits totaling 2.15 GB. Leave headroom for the OS, Nginx, and spikes.

### Required Software on Server

```bash
# Docker Engine (v24+) and Docker Compose (v2+)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Nginx (for reverse proxy / SSL termination)
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx

# (Optional) Git for pulling the repo
sudo apt install -y git
```

### Domain Name and SSL

- A registered domain name (e.g., `api.30sec-challenge.com`) with DNS A record pointing to your server IP.
- SSL certificate -- this guide uses Let's Encrypt (free, automated).

### Required External Accounts

| Service | Purpose | Setup Link |
|---------|---------|------------|
| **AWS S3** or **Cloudflare R2** | Video/image storage via presigned URLs | [AWS Console](https://console.aws.amazon.com/s3) / [R2 Dashboard](https://dash.cloudflare.com) |
| **SendGrid** | Transactional email (verification, password reset) | [SendGrid Signup](https://signup.sendgrid.com) |
| **Firebase** | Push notifications (FCM) + optional analytics | [Firebase Console](https://console.firebase.google.com) |
| **Google Cloud** | Google OAuth sign-in | [GCP Console](https://console.cloud.google.com/apis/credentials) |
| **Apple Developer** | Apple Sign-In | [Apple Developer](https://developer.apple.com/account) |
| **CloudFront** (optional) | CDN for video delivery | [CloudFront Console](https://console.aws.amazon.com/cloudfront) |

---

## Quick Start with Docker Compose

### Step 1: Clone and Navigate

```bash
git clone <your-repo-url> /opt/30sec-challenge
cd /opt/30sec-challenge/backend
```

### Step 2: Create Production Environment File

```bash
cp .env.example .env
```

### Step 3: Generate Secrets

```bash
# JWT signing secret (access tokens)
openssl rand -base64 64
# Copy the output into .env as JWT_SECRET

# JWT refresh secret (refresh tokens -- must be different from above)
openssl rand -base64 64
# Copy the output into .env as JWT_REFRESH_SECRET

# PostgreSQL password
openssl rand -base64 32
# Copy the output into .env as POSTGRES_PASSWORD

# Redis password
openssl rand -base64 32
# Copy the output into .env as REDIS_PASSWORD
```

### Step 4: Fill In .env

Open `.env` in your editor and set every variable. See the [Production Environment Variables](#production-environment-variables) section below for a full reference.

At minimum, set these critical values:

```bash
NODE_ENV=production
PORT=3000

# Database -- these are used by docker-compose.prod.yml
POSTGRES_USER=app_user
POSTGRES_PASSWORD=<generated-above>
POSTGRES_DB=video_challenge

# Redis
REDIS_PASSWORD=<generated-above>

# JWT
JWT_SECRET=<generated-above>
JWT_REFRESH_SECRET=<generated-above>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# S3 (use real AWS/R2 credentials, NOT MinIO)
S3_ENDPOINT=https://s3.us-east-1.amazonaws.com
S3_REGION=us-east-1
S3_BUCKET=your-bucket-name
S3_ACCESS_KEY=AKIA...
S3_SECRET_KEY=...

# CDN base URL (CloudFront or direct S3)
CDN_BASE_URL=https://cdn.yourdomain.com

# Google OAuth
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com

# Apple Sign-In
APPLE_CLIENT_ID=com.yourcompany.videochallenge
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_KEY_ID=YOUR_KEY_ID

# Firebase
FCM_PROJECT_ID=your-firebase-project-id

# SendGrid
SENDGRID_API_KEY=SG.xxxx
FROM_EMAIL=noreply@yourdomain.com
APP_URL=https://yourdomain.com

# CORS -- set to your Flutter app's domain or mobile deep link scheme
CORS_ORIGIN=https://yourdomain.com

LOG_LEVEL=info
RATE_LIMIT_DISABLED=false
```

### Step 5: Build and Start

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

This starts three containers:
- `vc_app` -- Node.js backend on port 3000
- `vc_postgres` -- PostgreSQL 16 with production tuning
- `vc_redis` -- Redis 7 with AOF persistence and password auth

### Step 6: Run Database Migrations

```bash
# Run migrations inside the running app container
docker exec vc_app node -e "
  const knex = require('knex');
  const config = { client: 'pg', connection: process.env.DATABASE_URL };
  const db = knex(config);
  db.migrate.latest({ directory: '/app/migrations' })
    .then(([batch, log]) => { console.log('Batch', batch, ':', log); return db.destroy(); })
    .catch(err => { console.error(err); process.exit(1); });
"
```

Alternatively, if you have `ts-node` available locally:

```bash
# From the backend/ directory on your build machine
DATABASE_URL=postgres://app_user:<password>@<server-ip>:5432/video_challenge \
  npx knex migrate:latest --knexfile knexfile.ts
```

### Step 7: Seed Initial Data (first deploy only)

```bash
# Subscription plans, coin packages, gift catalog, achievements, sample challenges
DATABASE_URL=postgres://app_user:<password>@<server-ip>:5432/video_challenge \
  npx knex seed:run --knexfile knexfile.ts
```

### Step 8: Verify

```bash
# Health check
curl http://localhost:3000/api/health

# Expected response:
# {"success":true,"data":{"status":"ok","timestamp":"..."},"message":"Service is healthy"}

# Check container status
docker compose -f docker-compose.prod.yml ps
```

---

## Production Environment Variables

Complete reference for every variable in `.env`:

### Application

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | `development` | Set to `production` for production deployments |
| `PORT` | No | `3000` | Port the Express server listens on |

### Database (PostgreSQL)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes* | -- | Full connection string. *Overridden by docker-compose.prod.yml using POSTGRES_* vars below |
| `POSTGRES_USER` | Yes | `app_user` | PostgreSQL username (used by docker-compose.prod.yml) |
| `POSTGRES_PASSWORD` | Yes | -- | PostgreSQL password. **Must be set; compose will fail without it** |
| `POSTGRES_DB` | No | `video_challenge` | Database name |
| `POSTGRES_PORT` | No | `5432` | Host port mapping for PostgreSQL |

### Redis

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_URL` | Yes* | -- | *Overridden by docker-compose.prod.yml |
| `REDIS_PASSWORD` | Yes | -- | Redis AUTH password. **Must be set; compose will fail without it** |
| `REDIS_PORT` | No | `6379` | Host port mapping for Redis |

### JWT Authentication

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Yes | -- | Secret key for signing access tokens. Generate with `openssl rand -base64 64` |
| `JWT_REFRESH_SECRET` | Yes | -- | Secret key for signing refresh tokens. **Must differ from JWT_SECRET** |
| `JWT_EXPIRES_IN` | No | `15m` | Access token lifetime (e.g., `15m`, `1h`) |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token lifetime (e.g., `7d`, `30d`) |

### S3 / Object Storage

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `S3_ENDPOINT` | Yes | -- | S3-compatible endpoint URL. AWS: `https://s3.{region}.amazonaws.com`. R2: `https://{account-id}.r2.cloudflarestorage.com` |
| `S3_REGION` | Yes | `us-east-1` | AWS region or `auto` for Cloudflare R2 |
| `S3_BUCKET` | Yes | -- | Bucket name for video/image uploads |
| `S3_ACCESS_KEY` | Yes | -- | IAM access key ID |
| `S3_SECRET_KEY` | Yes | -- | IAM secret access key |

### CDN

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CDN_BASE_URL` | Yes | -- | Public base URL for serving uploaded media. E.g., `https://cdn.yourdomain.com` or `https://d1234.cloudfront.net` |

### Google OAuth

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_CLIENT_ID` | Yes | -- | OAuth 2.0 Client ID from Google Cloud Console. Format: `xxxx.apps.googleusercontent.com` |

### Apple Sign-In

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `APPLE_CLIENT_ID` | Yes | -- | Service ID or App Bundle ID (e.g., `com.yourcompany.videochallenge`) |
| `APPLE_TEAM_ID` | Yes | -- | 10-character Team ID from Apple Developer account |
| `APPLE_KEY_ID` | Yes | -- | Key ID for the Sign in with Apple private key |

### Firebase Cloud Messaging

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FCM_PROJECT_ID` | Yes | -- | Firebase project ID. Also place `serviceAccountKey.json` in the expected path (see Firebase Admin SDK docs) |

### Email (SendGrid)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SENDGRID_API_KEY` | Yes | -- | API key from SendGrid dashboard (starts with `SG.`) |
| `FROM_EMAIL` | Yes | -- | Verified sender email address in SendGrid |
| `APP_URL` | Yes | -- | Public-facing app URL used in email links (e.g., `https://yourdomain.com`) |

### CORS

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CORS_ORIGIN` | No | `http://localhost:3000` | Allowed origin(s) for CORS. Set to your app domain in production |

### Logging

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LOG_LEVEL` | No | `info` | Winston log level: `error`, `warn`, `info`, `http`, `debug` |

### Rate Limiting

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RATE_LIMIT_DISABLED` | No | `false` | Set to `true` to disable rate limiting. **Never disable in production** |

---

## SSL/HTTPS Setup

### Option A: Nginx Reverse Proxy with Let's Encrypt (Recommended)

#### 1. Copy the Nginx Config

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/30sec-challenge
sudo ln -s /etc/nginx/sites-available/30sec-challenge /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

#### 2. Edit the Config

```bash
sudo nano /etc/nginx/sites-available/30sec-challenge
```

Replace `api.yourdomain.com` with your actual domain name.

#### 3. Test and Reload Nginx (HTTP only first)

```bash
sudo nginx -t
sudo systemctl reload nginx
```

#### 4. Obtain SSL Certificate

```bash
sudo certbot --nginx -d api.yourdomain.com
```

Certbot will automatically modify the Nginx config to enable HTTPS and set up auto-renewal.

#### 5. Verify Auto-Renewal

```bash
sudo certbot renew --dry-run
```

Certbot installs a systemd timer that renews certificates automatically. Verify:

```bash
sudo systemctl status certbot.timer
```

### Option B: Bring Your Own Certificate

If you have certificates from another CA:

```bash
# Place certs
sudo mkdir -p /etc/ssl/30sec-challenge
sudo cp fullchain.pem /etc/ssl/30sec-challenge/
sudo cp privkey.pem /etc/ssl/30sec-challenge/

# Update nginx.conf ssl_certificate paths accordingly
```

### Firewall Setup

```bash
# Allow HTTP, HTTPS, and SSH only
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Block direct access to backend port from outside (only Nginx should reach it)
sudo ufw deny 3000/tcp
sudo ufw deny 5432/tcp
sudo ufw deny 6379/tcp
```

---

## Database Setup

### Production Tuning

The `docker-compose.prod.yml` already applies these PostgreSQL tuning parameters (suitable for a 4 GB RAM / 2 vCPU server):

```
shared_buffers=256MB          # ~25% of available RAM for DB
effective_cache_size=768MB    # ~75% of RAM available for caching
work_mem=8MB                  # Per-operation sort/hash memory
maintenance_work_mem=128MB    # VACUUM, CREATE INDEX
max_connections=100           # Adjust based on app pool (max 30) + headroom
checkpoint_completion_target=0.9
random_page_cost=1.1          # SSD-optimized
```

For a server with 8+ GB RAM, consider increasing `shared_buffers` to 1 GB and `effective_cache_size` to 3 GB.

### Knex Connection Pool

The production Knex config (`knexfile.ts`) uses:
- **min: 5** / **max: 30** connections
- SSL enabled with `rejectUnauthorized: false` (appropriate for Docker internal networking or managed DB services)

### Backup Strategy

#### Automated Daily Backups with pg_dump

```bash
# Create backup directory
sudo mkdir -p /opt/backups/postgres
sudo chown $USER:$USER /opt/backups/postgres

# Create backup script
cat > /opt/backups/backup-postgres.sh << 'SCRIPT'
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/opt/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="video_challenge_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=14

# Dump from the running container
docker exec vc_postgres pg_dump \
  -U "${POSTGRES_USER:-app_user}" \
  -d "${POSTGRES_DB:-video_challenge}" \
  --no-owner --no-acl \
  | gzip > "${BACKUP_DIR}/${FILENAME}"

# Remove backups older than retention period
find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete

echo "[$(date)] Backup complete: ${FILENAME} ($(du -h "${BACKUP_DIR}/${FILENAME}" | cut -f1))"
SCRIPT

chmod +x /opt/backups/backup-postgres.sh
```

#### Schedule with Cron

```bash
# Run daily at 3:00 AM
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/backups/backup-postgres.sh >> /opt/backups/backup.log 2>&1") | crontab -
```

#### Restore from Backup

```bash
gunzip -c /opt/backups/postgres/video_challenge_20260101_030000.sql.gz \
  | docker exec -i vc_postgres psql -U app_user -d video_challenge
```

### Migration Strategy

Migrations are run with Knex. The migration files are located in `backend/migrations/` (001 through 019).

```bash
# Run pending migrations
docker exec vc_app node -e "
  const knex = require('knex');
  const config = { client: 'pg', connection: process.env.DATABASE_URL };
  const db = knex(config);
  db.migrate.latest({ directory: '/app/migrations' })
    .then(([batch, log]) => { console.log('Batch', batch); console.log(log); return db.destroy(); })
    .catch(err => { console.error(err); process.exit(1); });
"

# Check migration status
docker exec -it vc_postgres psql -U app_user -d video_challenge \
  -c "SELECT * FROM knex_migrations ORDER BY id;"

# Rollback last batch (use with caution)
# This requires running knex CLI with ts-node from a machine with the source
DATABASE_URL=postgres://... npx knex migrate:rollback --knexfile knexfile.ts
```

**Best practice:** Always run migrations as a separate step _before_ deploying the new app image, so the database schema is ready when the new code starts accepting requests.

---

## Monitoring and Logging

### Health Check Endpoint

The app exposes a health check at:

```
GET /api/health
```

Response:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-02-09T12:00:00.000Z"
  },
  "message": "Service is healthy"
}
```

> **Note:** The Dockerfile's HEALTHCHECK currently hits `/health` instead of `/api/health`. If the container health check shows "unhealthy," fix the Dockerfile HEALTHCHECK to use `http://localhost:3000/api/health`.

Use this for uptime monitoring with services like UptimeRobot, Pingdom, or a simple cron:

```bash
# Simple uptime check (add to cron)
curl -sf https://api.yourdomain.com/api/health > /dev/null || echo "ALERT: API is down" | mail -s "30sec API Down" admin@yourdomain.com
```

### Log Files

Inside the container, Winston writes structured JSON logs to:

| File | Contents |
|------|----------|
| `/app/logs/combined.log` | All log levels (info, warn, error, http) |
| `/app/logs/error.log` | Error-level entries only |

Both rotate at 10 MB with 5 files retained.

Docker also captures stdout/stderr:

```bash
# Tail app logs
docker logs -f vc_app --tail 100

# Tail all services
docker compose -f docker-compose.prod.yml logs -f --tail 100
```

Docker log rotation is configured in compose (10 MB, 5 files per container).

### Sentry Error Tracking (Recommended)

Install the Sentry SDK to capture unhandled errors and performance data:

```bash
cd backend && npm install @sentry/node
```

Add to the top of `src/index.ts` (before other imports):

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,  // Add SENTRY_DSN to .env
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 0.2,         // 20% of requests for performance monitoring
  release: process.env.npm_package_version,
});
```

Add the Sentry error handler in `src/app.ts` before the existing `errorHandler`:

```typescript
import * as Sentry from '@sentry/node';

// ... after all route registrations, before errorHandler:
Sentry.setupExpressErrorHandler(app);
app.use(errorHandler);
```

### Container Health Monitoring

```bash
# All container statuses at a glance
docker compose -f docker-compose.prod.yml ps

# Resource usage
docker stats --no-stream vc_app vc_postgres vc_redis
```

---

## Scaling

### Horizontal Scaling (Multiple App Instances)

The backend is stateless (JWT auth, no server-side sessions) which makes horizontal scaling straightforward.

#### Option 1: Docker Compose Replicas

```yaml
# In docker-compose.prod.yml, under the app service:
services:
  app:
    # ... existing config ...
    deploy:
      replicas: 3
    ports: []  # Remove host port mapping; use Nginx upstream instead
```

Update Nginx to load-balance across replicas:

```nginx
upstream backend {
    least_conn;
    server 172.18.0.10:3000;
    server 172.18.0.11:3000;
    server 172.18.0.12:3000;
}
```

#### Option 2: Multiple Servers Behind a Load Balancer

For true horizontal scaling, deploy multiple servers behind an AWS ALB, GCP Load Balancer, or Cloudflare Load Balancing. Each server runs the same Docker Compose stack, but PostgreSQL and Redis should be centralized:

- **PostgreSQL**: Use a managed service (AWS RDS, GCP Cloud SQL, DigitalOcean Managed Databases).
- **Redis**: Use a managed service (AWS ElastiCache, GCP Memorystore, Upstash).

### Redis Considerations

Redis is used for:
- **BullMQ job queues** (vote processing, notifications)
- **Leaderboard sorted sets** (real-time rankings)
- **Rate limiting counters**

For high availability:
- Use Redis Sentinel or a managed Redis cluster.
- BullMQ supports Redis Cluster natively.
- Leaderboard sorted sets should stay on a single Redis instance (or use hash-tag routing in a cluster to keep related keys on the same shard).

### CDN for Video Content (CloudFront)

Videos are served via presigned S3 URLs. For better performance and lower S3 costs:

1. Create a CloudFront distribution with your S3 bucket as origin.
2. Set `CDN_BASE_URL` to the CloudFront domain (e.g., `https://d1234abcdef.cloudfront.net`).
3. Configure cache behaviors:
   - `/videos/*` -- Cache for 7 days, compress.
   - `/thumbnails/*` -- Cache for 30 days, compress.
4. Enable Origin Access Control (OAC) so only CloudFront can read from the bucket.

### BullMQ Workers

BullMQ workers run inside the same Node.js process. For heavy workloads, you can run dedicated worker instances:

```bash
# Separate worker process (create a worker-only entry point)
docker run --env-file .env --network app_network \
  vc_app node dist/workers/index.js
```

---

## CI/CD Pipeline

A GitHub Actions workflow is provided at `.github/workflows/deploy.yml`. It performs:

1. **Test** -- Runs the Jest test suite
2. **Build** -- Builds the Docker image
3. **Push** -- Pushes to a container registry (GitHub Container Registry by default)
4. **Deploy** -- SSH into the production server to pull and restart

### Setup Requirements

Add these GitHub repository secrets:

| Secret | Description |
|--------|-------------|
| `DEPLOY_HOST` | Production server IP or hostname |
| `DEPLOY_USER` | SSH username on the production server |
| `DEPLOY_SSH_KEY` | Private SSH key for authentication |
| `DATABASE_URL` | PostgreSQL connection string (for CI test step) |

### Manual Deploy (without CI/CD)

```bash
# SSH into server
ssh deploy@your-server

# Pull latest code
cd /opt/30sec-challenge
git pull origin main

# Rebuild and restart
cd backend
docker compose -f docker-compose.prod.yml up -d --build

# Run migrations
docker exec vc_app node -e "
  const knex = require('knex');
  const db = knex({ client: 'pg', connection: process.env.DATABASE_URL });
  db.migrate.latest({ directory: '/app/migrations' })
    .then(([b, log]) => { console.log('Migrated batch', b, log); return db.destroy(); })
    .catch(e => { console.error(e); process.exit(1); });
"

# Verify
curl -s http://localhost:3000/api/health | jq .
docker compose -f docker-compose.prod.yml ps
```

---

## Troubleshooting

### Container won't start / keeps restarting

```bash
# Check logs for the failing container
docker logs vc_app --tail 50
docker logs vc_postgres --tail 50
docker logs vc_redis --tail 50

# Check if a port is already in use
sudo lsof -i :3000
sudo lsof -i :5432
sudo lsof -i :6379
```

### Health check shows "unhealthy"

The Dockerfile HEALTHCHECK uses `/health` but the app route is `/api/health`. Fix by editing the Dockerfile:

```dockerfile
# Change this line:
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# To this:
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
```

Also update the health check in `docker-compose.prod.yml` app service to use `/api/health`.

### Database connection refused

```bash
# Verify PostgreSQL is running and healthy
docker exec vc_postgres pg_isready -U app_user

# Check the DATABASE_URL the app is actually using
docker exec vc_app env | grep DATABASE_URL

# Test connection manually
docker exec -it vc_postgres psql -U app_user -d video_challenge -c "SELECT 1;"
```

### Redis AUTH error

```bash
# Verify Redis is accepting connections with the password
docker exec vc_redis redis-cli -a "${REDIS_PASSWORD}" ping
# Expected: PONG

# Check the REDIS_URL the app is using
docker exec vc_app env | grep REDIS_URL
```

### Migrations fail

```bash
# Check current migration status
docker exec -it vc_postgres psql -U app_user -d video_challenge \
  -c "SELECT * FROM knex_migrations ORDER BY id;"

# If a migration is partially applied, you may need to rollback manually:
docker exec -it vc_postgres psql -U app_user -d video_challenge \
  -c "DELETE FROM knex_migrations WHERE name = '<failed_migration_name>';"
# Then drop any tables/columns that were partially created and re-run migrations
```

### Out of memory (OOM kills)

```bash
# Check if any container was killed
docker inspect vc_app | grep -i oom
docker inspect vc_postgres | grep -i oom

# Increase memory limits in docker-compose.prod.yml
# Or reduce PostgreSQL shared_buffers / Redis maxmemory
```

### S3 upload failures (presigned URLs)

```bash
# Verify S3 credentials
docker exec vc_app env | grep S3_

# Test S3 connectivity from the container
docker exec vc_app node -e "
  const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');
  const client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY, secretAccessKey: process.env.S3_SECRET_KEY },
  });
  client.send(new ListBucketsCommand({}))
    .then(r => console.log('Buckets:', r.Buckets.map(b => b.Name)))
    .catch(e => console.error('S3 Error:', e.message));
"
```

### High CPU / slow responses

```bash
# Check container resource usage
docker stats --no-stream

# Check PostgreSQL slow queries (queries > 500ms are logged by default)
docker logs vc_postgres 2>&1 | grep "duration:"

# Check active PostgreSQL connections
docker exec -it vc_postgres psql -U app_user -d video_challenge \
  -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"
```

### Renewing SSL certificates

```bash
# Test renewal
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal

# If certbot timer is not running
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### Rolling back a deployment

```bash
# If the latest deploy broke something, revert to the previous image
docker compose -f docker-compose.prod.yml down
git checkout <previous-commit-hash>
docker compose -f docker-compose.prod.yml up -d --build

# If you need to rollback migrations too
DATABASE_URL=postgres://... npx knex migrate:rollback --knexfile knexfile.ts
```

---

## Security Checklist

Before going live, verify:

- [ ] `NODE_ENV=production` is set
- [ ] JWT secrets are strong (64+ random bytes, base64 encoded)
- [ ] PostgreSQL and Redis passwords are strong and unique
- [ ] `RATE_LIMIT_DISABLED=false`
- [ ] Firewall blocks direct access to ports 3000, 5432, 6379
- [ ] HTTPS is enforced (HTTP redirects to HTTPS)
- [ ] `CORS_ORIGIN` is set to your actual domain (not `*`)
- [ ] S3 bucket has appropriate IAM policies (no public access)
- [ ] Firebase service account key is not committed to version control
- [ ] Docker containers run as non-root user (Dockerfile already does this)
- [ ] Log level is `info` or `warn` (not `debug` in production)
- [ ] Database backups are scheduled and tested
- [ ] SSL certificate auto-renewal is working
