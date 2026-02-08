#!/usr/bin/env bash
# ============================================================
# CarRaffleOdds — DigitalOcean Droplet Setup Script
#
# Run on a fresh Ubuntu 24.04/25.04 droplet:
#   curl -sSL https://raw.githubusercontent.com/<you>/carraffleodds/main/scripts/setup-droplet.sh | bash
#
# Or after cloning the repo:
#   chmod +x scripts/setup-droplet.sh
#   sudo ./scripts/setup-droplet.sh
#
# What this script does:
#   1. Creates a 2GB swap file (essential for Playwright on 2GB RAM)
#   2. Installs Node.js 20 LTS via NodeSource
#   3. Installs Playwright's system dependencies (Chromium libs)
#   4. Installs PM2 globally for process management
#   5. Clones the repo to /opt/carraffleodds
#   6. Installs npm dependencies + Playwright browsers
#   7. Sets up PM2 to auto-start on reboot
#
# After running this script you still need to:
#   1. Create /opt/carraffleodds/.env with your Supabase keys
#   2. Start the service: cd /opt/carraffleodds && pm2 start ecosystem.config.js
#   3. Save for reboot: pm2 save
# ============================================================

set -euo pipefail

APP_DIR="/opt/carraffleodds"
REPO_URL="https://github.com/jameslaneovermind/carraffleodds.git"

echo "============================================"
echo "  CarRaffleOdds Droplet Setup"
echo "  $(date)"
echo "============================================"

# ------------------------------------------
# 1. Swap file (critical for 2GB droplets)
# ------------------------------------------
if [ ! -f /swapfile ]; then
  echo "[1/7] Creating 2GB swap file..."
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  # Tune swappiness — prefer RAM but use swap when needed
  sysctl vm.swappiness=10
  echo 'vm.swappiness=10' >> /etc/sysctl.conf
  echo "  Swap active: $(swapon --show)"
else
  echo "[1/7] Swap file already exists, skipping"
fi

# ------------------------------------------
# 2. System updates + essentials
# ------------------------------------------
echo "[2/7] Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq curl git build-essential

# ------------------------------------------
# 3. Node.js 20 LTS
# ------------------------------------------
if ! command -v node &>/dev/null; then
  echo "[3/7] Installing Node.js 20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
  echo "  Node: $(node -v)"
  echo "  npm:  $(npm -v)"
else
  echo "[3/7] Node.js already installed: $(node -v)"
fi

# ------------------------------------------
# 4. PM2
# ------------------------------------------
if ! command -v pm2 &>/dev/null; then
  echo "[4/7] Installing PM2..."
  npm install -g pm2
  echo "  PM2: $(pm2 -v)"
else
  echo "[4/7] PM2 already installed: $(pm2 -v)"
fi

# ------------------------------------------
# 5. Clone repo
# ------------------------------------------
if [ ! -d "$APP_DIR" ]; then
  echo "[5/7] Cloning repo to $APP_DIR..."
  git clone "$REPO_URL" "$APP_DIR"
else
  echo "[5/7] Repo already exists, pulling latest..."
  cd "$APP_DIR"
  git pull origin main
fi

cd "$APP_DIR"

# ------------------------------------------
# 6. Install dependencies + Playwright
# ------------------------------------------
echo "[6/7] Installing npm dependencies..."
npm ci --production=false

echo "  Installing Playwright Chromium + system deps..."
npx playwright install chromium
npx playwright install-deps chromium

# ------------------------------------------
# 7. PM2 startup (auto-start on reboot)
# ------------------------------------------
echo "[7/7] Configuring PM2 startup..."
pm2 startup systemd -u root --hp /root || true

# Install log rotation
pm2 install pm2-logrotate || true
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true

# Create logs directory
mkdir -p "$APP_DIR/logs"

echo ""
echo "============================================"
echo "  Setup complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo ""
echo "  1. Create the .env file with your Supabase keys:"
echo "     nano /opt/carraffleodds/.env"
echo ""
echo "     Add these lines:"
echo "       NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co"
echo "       SUPABASE_URL=https://your-project.supabase.co"
echo "       NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key"
echo "       SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
echo ""
echo "  2. Start the scraper service:"
echo "     cd /opt/carraffleodds"
echo "     pm2 start ecosystem.config.js"
echo "     pm2 save"
echo ""
echo "  3. Verify it's running:"
echo "     pm2 logs scraper"
echo "     pm2 monit"
echo ""
echo "  To update later:"
echo "     cd /opt/carraffleodds && git pull && npm ci && pm2 restart scraper"
echo ""
