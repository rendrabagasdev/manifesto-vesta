# 🚀 Deployment Guide - Vesta (Fedora Server + Docker)

> Panduan lengkap deployment ke **Fedora Server** menggunakan **Docker** dengan GitHub Actions self-hosted runner.

---

## 🏗 Arsitektur Deployment

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  GitHub Cloud   │────▶│  GHCR (Registry) │────▶│  Fedora Server      │
│  (Build & Push) │     │  ghcr.io/...     │     │  (Self-Hosted       │
└─────────────────┘     └──────────────────┘     │   Runner + Docker)  │
                                                 └─────────────────────┘
```

**Alur:**
1. Push ke branch `main` → GitHub Actions build Docker image → Push ke GHCR
2. Self-hosted runner di Fedora pull image terbaru → Restart container

---

## 📋 Prasyarat di Fedora Server

### 1. Install Docker & Docker Compose

```bash
# Update system
sudo dnf update -y

# Install Docker
sudo dnf install -y docker docker-compose

# Start & enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Tambahkan user ke group docker (logout/login setelah ini)
sudo usermod -aG docker $USER
```

### 2. Install GitHub Self-Hosted Runner

```bash
# Buat user runner (opsional, recommended)
sudo useradd -m -s /bin/bash github-runner
sudo usermod -aG docker github-runner

# Switch ke user runner
sudo su - github-runner

# Download runner
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64-2.317.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.317.0/actions-runner-linux-x64-2.317.0.tar.gz
tar xzf actions-runner-linux-x64-2.317.0.tar.gz

# Konfigurasi runner (ganti URL & TOKEN dari GitHub Settings → Actions → Runners)
./config.sh --url https://github.com/YOUR_ORG/YOUR_REPO --token YOUR_TOKEN

# Install sebagai service
sudo ./svc.sh install
sudo ./svc.sh start
```

### 3. Buat Network Docker

```bash
docker network create vesta-network
```

### 4. Siapkan Environment File

```bash
mkdir -p /var/www/vesta
cp .env.example /var/www/vesta/.env
# Edit /var/www/vesta/.env dengan nilai production
nano /var/www/vesta/.env
```

### 5. Setup Database (PostgreSQL)

**Option A: PostgreSQL di Host (Fedora)**

```bash
sudo dnf install -y postgresql-server postgresql-contrib
sudo postgresql-setup --initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Buat database & user
sudo -u postgres psql -c "CREATE DATABASE appdb;"
sudo -u postgres psql -c "CREATE USER manifesto WITH ENCRYPTED PASSWORD 'your-password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE appdb TO manifesto;"
```

**Option B: PostgreSQL via Docker (Recommended untuk isolasi)**

```yaml
# Tambahkan ke docker-compose.yml di server
services:
  postgres:
    image: postgres:16-alpine
    container_name: vesta-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: appdb
      POSTGRES_USER: manifesto
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - vesta-network

volumes:
  postgres-data:
```

---

## ⚙️ GitHub Repository Secrets

Buka **Settings → Secrets and variables → Actions** dan tambahkan:

| Secret Name | Value | Deskripsi |
|-------------|-------|-----------|
| `GITHUB_TOKEN` | (otomatis) | Token default GitHub, tidak perlu set manual |
| `POSTGRES_PASSWORD` | `your-secure-password` | Password PostgreSQL untuk docker-compose |

> **Catatan:** `GITHUB_TOKEN` sudah tersedia otomatis di workflow, digunakan untuk login ke GHCR.

---

## 🐳 Dockerfile & docker-compose.yml

### Dockerfile (Multi-stage, Production Ready)

```dockerfile
# Base stage
FROM node:26-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

### docker-compose.yml (Server)

```yaml
services:
  app:
    image: ghcr.io/your-org/vesta:latest
    container_name: vesta-app
    restart: unless-stopped
    networks:
      - vesta-network
    env_file:
      - /var/www/vesta/.env
    ports:
      - "127.0.0.1:3001:3000"  # Hanya localhost, diakses via Nginx reverse proxy

  # Optional: PostgreSQL jika tidak pakai external DB
  # postgres:
  #   image: postgres:16-alpine
  #   container_name: vesta-postgres
  #   restart: unless-stopped
  #   environment:
  #     POSTGRES_DB: appdb
  #     POSTGRES_USER: manifesto
  #     POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  #   volumes:
  #     - postgres-data:/var/lib/postgresql/data
  #   networks:
  #     - vesta-network

networks:
  vesta-network:
    external: true

# volumes:
#   postgres-data:
```

---

## 🌐 Nginx Reverse Proxy (SSL/TLS)

### Install Nginx & Certbot

```bash
sudo dnf install -y nginx certbot python3-certbot-nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Konfigurasi Nginx

```bash
sudo nano /etc/nginx/conf.d/vesta.conf
```

```nginx
# HTTP → HTTPS redirect
server {
    listen 80;
    server_name vesta.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name vesta.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/vesta.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vesta.yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Proxy ke Next.js
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Static files caching
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3001;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location /public/ {
        proxy_pass http://127.0.0.1:3001;
        add_header Cache-Control "public, max-age=86400";
    }
}
```

### Dapatkan SSL Certificate

```bash
sudo certbot --nginx -d vesta.yourdomain.com
# Ikuti prompt, pilih redirect HTTP→HTTPS
```

### Test & Reload Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔧 Environment Variables Production

Edit `/var/www/vesta/.env`:

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://manifesto:your-password@postgres:5432/appdb?schema=public"
# Atau jika DB di host: postgresql://manifesto:your-password@host.docker.internal:5432/appdb

# Auth
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="https://vesta.yourdomain.com"

# Maintenance Mode
MAINTENANCE_MODE="false"
MAINTENANCE_BYPASS_KEY="vesta2026"

# Payment Sandbox (Midtrans)
MIDTRANS_SERVER_KEY="SERVER-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
MIDTRANS_CLIENT_KEY="KEY-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# WhatsApp Sandbox (Fonnte)
FONNTE_API_TOKEN="your-fonnte-token"

# Demo Control
SIMULATE_TIME_ENABLED="true"
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

---

## 🚀 Deploy Pertama Kali (Manual)

```bash
# Di server Fedora
cd /var/www/vesta

# Pull image pertama kali
docker pull ghcr.io/your-org/vesta:latest

# Jalankan container
docker run -d \
  --name vesta-app \
  --restart unless-stopped \
  --network vesta-network \
  --env-file /var/www/vesta/.env \
  -p 127.0.0.1:3001:3000 \
  ghcr.io/your-org/vesta:latest

# Cek logs
docker logs -f vesta-app
```

---

## 🔄 Deploy Otomatis (GitHub Actions)

Workflow `.github/workflows/deploy.yml` sudah dikonfigurasi:

1. **Build & Push** (GitHub Cloud): Build image → Push ke GHCR
2. **Deploy** (Self-Hosted Runner di Fedora): Pull image → Restart container

**Trigger:** Push ke branch `main`

**Monitor:** Buka tab **Actions** di GitHub repository

---

## 🛠 Maintenance Commands

```bash
# Lihat status container
docker ps -a

# Lihat logs
docker logs -f vesta-app

# Restart manual
docker restart vesta-app

# Update manual (pull image terbaru & restart)
docker pull ghcr.io/your-org/vesta:latest
docker stop vesta-app && docker rm vesta-app
docker run -d --name vesta-app --restart unless-stopped --network vesta-network --env-file /var/www/vesta/.env -p 127.0.0.1:3001:3000 ghcr.io/your-org/vesta:latest

# Prune image lama
docker image prune -f

# Backup database (jika PostgreSQL di Docker)
docker exec vesta-postgres pg_dump -U manifesto appdb > backup_$(date +%F).sql

# Restore database
docker exec -i vesta-postgres psql -U manifesto appdb < backup_2026-01-15.sql
```

---

## 📊 Monitoring & Health Check

### Health Check Endpoint

Next.js sudah menyediakan health check di `/api/health` (buat file `app/api/health/route.ts`):

```typescript
export async function GET() {
  return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
}
```

### Docker Health Check (tambahkan ke Dockerfile runner stage)

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
```

### Log Aggregation (Optional)

```bash
# Install Loki + Promtail untuk log aggregation
# Atau gunakan journalctl untuk systemd logs
journalctl -u docker -f
```

---

## 🔒 Security Hardening

### Firewall (firewalld)

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=3001/tcp --zone=trusted --source=127.0.0.1
sudo firewall-cmd --reload
```

### Fail2Ban (SSH Protection)

```bash
sudo dnf install -y fail2ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

### Docker Security

```bash
# Run container as non-root (sudah di Dockerfile USER nextjs)
# Read-only root filesystem
# docker run --read-only --tmpfs /tmp --tmpfs /var/cache/nginx ...
```

---

## 📝 Checklist Deployment Production

- [ ] Fedora Server sudah update & Docker terinstall
- [ ] GitHub Self-Hosted Runner terinstall & running sebagai service
- [ ] Docker network `vesta-network` sudah dibuat
- [ ] PostgreSQL tersedia (host atau Docker) & accessible
- [ ] `/var/www/vesta/.env` sudah diisi dengan nilai production
- [ ] `NEXTAUTH_SECRET` di-generate baru (32+ chars)
- [ ] `NEXTAUTH_URL` sesuai domain production
- [ ] Nginx reverse proxy sudah konfigurasi + SSL Certbot
- [ ] Firewall hanya buka port 80, 443 (dan 3001 hanya localhost)
- [ ] GitHub Actions workflow berhasil run (cek tab Actions)
- [ ] Health check endpoint `/api/health` return 200 OK
- [ ] Demo accounts bisa login di production
- [ ] Simulate-time endpoint `/api/demo/simulate-tick` berfungsi

---

## 🆘 Troubleshooting

### Container tidak start
```bash
docker logs vesta-app
# Cek error: DATABASE_URL, NEXTAUTH_SECRET, port conflict
```

### Database connection failed
```bash
# Test koneksi dari container
docker exec -it vesta-app sh
wget -qO- http://postgres:5432  # atau host.docker.internal:5432
```

### GHCR Pull Error (403/401)
```bash
# Di server, login manual
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
# Pastikan runner user punya akses docker & GHCR token valid
```

### Nginx 502 Bad Gateway
```bash
# Cek container running
docker ps
# Cek port 3001 listen
ss -tlnp | grep 3001
# Cek nginx error log
sudo tail -f /var/log/nginx/error.log
```

---

## 📚 Referensi

- [GitHub Self-Hosted Runners](https://docs.github.com/en/actions/hosting-your-own-runners)
- [Docker Multi-stage Build](https://docs.docker.com/build/building/multi-stage/)
- [Next.js Standalone Output](https://nextjs.org/docs/app/api-reference/next-config-js/output)
- [Nginx Reverse Proxy](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [Certbot Let's Encrypt](https://certbot.eff.org/)