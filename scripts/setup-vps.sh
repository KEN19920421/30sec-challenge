#!/usr/bin/env bash
# =============================================================================
# 30sec Challenge — VPS Initial Setup Script
# =============================================================================
# Run as root on a fresh Ubuntu 22.04/24.04 Xserver VPS.
#
# Usage:
#   ssh root@210.131.218.20
#   bash < setup-vps.sh
#
# Or copy to server and run:
#   scp scripts/setup-vps.sh root@210.131.218.20:/tmp/
#   ssh root@210.131.218.20 'bash /tmp/setup-vps.sh'
# =============================================================================
set -euo pipefail

DOMAIN="api.30sec-challenge.com"
DEPLOY_USER="deploy"
APP_DIR="/opt/30sec-challenge"

echo "=========================================="
echo " 30sec Challenge — VPS Setup"
echo "=========================================="

# ---------------------------------------------------------------------------
# 1. System update
# ---------------------------------------------------------------------------
echo "[1/8] Updating system packages..."
apt update && apt upgrade -y
apt install -y git curl wget ufw

# ---------------------------------------------------------------------------
# 2. Create deploy user
# ---------------------------------------------------------------------------
echo "[2/8] Creating deploy user..."
if id "$DEPLOY_USER" &>/dev/null; then
    echo "  User '$DEPLOY_USER' already exists, skipping."
else
    adduser --disabled-password --gecos "" "$DEPLOY_USER"
    usermod -aG sudo "$DEPLOY_USER"
    # Copy root's SSH keys to deploy user
    mkdir -p /home/$DEPLOY_USER/.ssh
    cp /root/.ssh/authorized_keys /home/$DEPLOY_USER/.ssh/
    chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh
    chmod 700 /home/$DEPLOY_USER/.ssh
    chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys
    # Allow sudo without password for deploy user
    echo "$DEPLOY_USER ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$DEPLOY_USER
    echo "  User '$DEPLOY_USER' created."
fi

# ---------------------------------------------------------------------------
# 3. Firewall setup
# ---------------------------------------------------------------------------
echo "[3/8] Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable
echo "  Firewall configured (SSH + HTTP + HTTPS only)."

# ---------------------------------------------------------------------------
# 4. Install Docker
# ---------------------------------------------------------------------------
echo "[4/8] Installing Docker..."
if command -v docker &>/dev/null; then
    echo "  Docker already installed: $(docker --version)"
else
    curl -fsSL https://get.docker.com | sh
    usermod -aG docker $DEPLOY_USER
    echo "  Docker installed: $(docker --version)"
fi

# ---------------------------------------------------------------------------
# 5. Install Nginx + Certbot
# ---------------------------------------------------------------------------
echo "[5/8] Installing Nginx and Certbot..."
apt install -y nginx certbot python3-certbot-nginx
systemctl enable nginx
systemctl start nginx

# ---------------------------------------------------------------------------
# 6. Clone repository
# ---------------------------------------------------------------------------
echo "[6/8] Setting up application directory..."
mkdir -p $APP_DIR
chown $DEPLOY_USER:$DEPLOY_USER $APP_DIR

if [ -d "$APP_DIR/backend" ]; then
    echo "  Repository already exists at $APP_DIR, skipping clone."
    echo "  To update: cd $APP_DIR && git pull"
else
    echo ""
    echo "  ================================================"
    echo "  MANUAL STEP: Clone your repository"
    echo "  ================================================"
    echo "  Run as deploy user:"
    echo "    git clone <YOUR_REPO_URL> $APP_DIR"
    echo "  ================================================"
    echo ""
fi

# ---------------------------------------------------------------------------
# 7. Configure Nginx
# ---------------------------------------------------------------------------
echo "[7/8] Configuring Nginx..."
if [ -f "$APP_DIR/deploy/nginx.conf" ]; then
    cp $APP_DIR/deploy/nginx.conf /etc/nginx/sites-available/30sec-challenge
    ln -sf /etc/nginx/sites-available/30sec-challenge /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl reload nginx
    echo "  Nginx configured for $DOMAIN"
else
    echo "  WARNING: nginx.conf not found at $APP_DIR/deploy/nginx.conf"
    echo "  Clone the repository first, then re-run this section."
fi

# ---------------------------------------------------------------------------
# 8. SSL Certificate
# ---------------------------------------------------------------------------
echo "[8/8] Obtaining SSL certificate..."
echo ""
echo "  Run the following command after DNS propagation:"
echo ""
echo "    sudo certbot --nginx -d $DOMAIN"
echo ""
echo "  To test auto-renewal:"
echo "    sudo certbot renew --dry-run"
echo ""

# ---------------------------------------------------------------------------
# Generate secrets for .env
# ---------------------------------------------------------------------------
echo "=========================================="
echo " Generated Secrets (save these!)"
echo "=========================================="
echo ""
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')

echo "JWT_SECRET=$JWT_SECRET"
echo ""
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
echo ""
echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD"
echo ""
echo "REDIS_PASSWORD=$REDIS_PASSWORD"
echo ""

# ---------------------------------------------------------------------------
# Create .env template
# ---------------------------------------------------------------------------
if [ -d "$APP_DIR/backend" ]; then
    ENV_FILE="$APP_DIR/backend/.env"
    if [ ! -f "$ENV_FILE" ]; then
        cat > "$ENV_FILE" << ENVEOF
# ─── Application ───────────────────────────────────────────
NODE_ENV=production
PORT=3000

# ─── Database (auto-constructed by docker-compose.prod.yml) ─
POSTGRES_USER=app_user
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=video_challenge

# ─── Redis (auto-constructed by docker-compose.prod.yml) ────
REDIS_PASSWORD=$REDIS_PASSWORD

# ─── JWT Authentication ───────────────────────────────────
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ─── S3 / Object Storage ─────────────────────────────────
# TODO: Set your S3-compatible storage credentials
S3_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=video-challenge
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key

# ─── CDN ──────────────────────────────────────────────────
CDN_BASE_URL=https://cdn.30sec-challenge.com

# ─── Google OAuth ─────────────────────────────────────────
# TODO: Set from Google Cloud Console
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# ─── Apple Sign-In ────────────────────────────────────────
# TODO: Set from Apple Developer Portal
APPLE_CLIENT_ID=com.thirtysecchallenge.thirtySecChallenge.service
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_KEY_ID=YOUR_KEY_ID

# ─── Firebase Cloud Messaging ────────────────────────────
# TODO: Set from Firebase Console
FCM_PROJECT_ID=your-firebase-project-id

# ─── CORS ─────────────────────────────────────────────────
CORS_ORIGIN=*

# ─── Logging ──────────────────────────────────────────────
LOG_LEVEL=info

# ─── Rate Limiting ───────────────────────────────────────
RATE_LIMIT_DISABLED=false
ENVEOF
        chown $DEPLOY_USER:$DEPLOY_USER "$ENV_FILE"
        chmod 600 "$ENV_FILE"
        echo "  .env created at $ENV_FILE"
        echo "  IMPORTANT: Edit S3, Google, Apple, Firebase settings before starting!"
    else
        echo "  .env already exists, skipping."
    fi
fi

# ---------------------------------------------------------------------------
# SSH hardening
# ---------------------------------------------------------------------------
echo ""
echo "=========================================="
echo " SSH Hardening (optional but recommended)"
echo "=========================================="
echo ""
echo "  After confirming deploy user SSH access works:"
echo ""
echo "    sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config"
echo "    sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config"
echo "    sudo systemctl restart sshd"
echo ""

# ---------------------------------------------------------------------------
# Next steps
# ---------------------------------------------------------------------------
echo "=========================================="
echo " Setup Complete! Next Steps:"
echo "=========================================="
echo ""
echo " 1. Clone repo (if not done):"
echo "      su - $DEPLOY_USER"
echo "      git clone <REPO_URL> $APP_DIR"
echo ""
echo " 2. Edit .env with real S3/OAuth/Firebase values:"
echo "      nano $APP_DIR/backend/.env"
echo ""
echo " 3. Get SSL certificate:"
echo "      sudo certbot --nginx -d $DOMAIN"
echo ""
echo " 4. Start the application:"
echo "      cd $APP_DIR/backend"
echo "      docker compose -f docker-compose.prod.yml up -d --build"
echo ""
echo " 5. Run migrations & seeds:"
echo "      docker exec vc_app node dist/index.js migrate"
echo "      # Or:"
echo "      docker exec vc_app npx knex migrate:latest"
echo "      docker exec vc_app npx knex seed:run"
echo ""
echo " 6. Verify:"
echo "      curl https://$DOMAIN/api/health"
echo ""
echo "=========================================="
