# GhostSpeak Deployment Guide

> **Production Deployment & Operations Manual**
> Version: 1.0.0-beta | November 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Network Configuration](#network-configuration)
4. [Program Deployment](#program-deployment)
5. [SDK Deployment](#sdk-deployment)
6. [Infrastructure Setup](#infrastructure-setup)
7. [Monitoring & Alerting](#monitoring--alerting)
8. [Backup & Recovery](#backup--recovery)
9. [Upgrade Procedures](#upgrade-procedures)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This guide covers deployment procedures for all GhostSpeak components across dev, test, and production environments.

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Users & Agents                        │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────────┐
│              Load Balancer (Cloudflare)                  │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────────┐
│        Web App (Vercel) + API (Next.js Edge)           │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────────┐
│       SDK Clients (TypeScript, Rust, Python)             │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────────┐
│           Solana RPC Endpoints (GenesysGo)               │
│     - Mainnet: api.mainnet-beta.solana.com              │
│     - Devnet: api.devnet.solana.com                     │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────────┐
│      GhostSpeak Smart Contract (Solana Program)          │
│       - Anchor 0.31.1+ │ Solana 2.1.0                   │
└──────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Development Tools

```bash
# Rust & Cargo
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup update stable

# Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
solana --version  # Should be v2.1.0+

# Anchor
cargo install --git https://github.com/coral-xyz/anchor --tag v0.31.1 anchor-cli
anchor --version  # Should be 0.31.1+

# Node.js & Bun
curl -fsSL https://bun.sh/install | bash
bun --version  # Should be 1.0+

# TypeScript
npm install -g typescript
tsc --version  # Should be 5.0+
```

### System Requirements

**Development Machine:**
- CPU: 4+ cores
- RAM: 16GB+
- Disk: 50GB+ SSD
- OS: Linux, macOS, or WSL2

**Production Server:**
- CPU: 8+ cores
- RAM: 32GB+
- Disk: 200GB+ NVMe SSD
- OS: Ubuntu 22.04 LTS (recommended)

### Credentials & Keys

```bash
# Generate deployment keypair
solana-keygen new --outfile ~/.config/solana/deploy-keypair.json

# Get wallet address
solana address

# Request devnet airdrop (testnet only)
solana airdrop 2

# Verify balance
solana balance
```

---

## Network Configuration

### Solana Networks

```bash
# Devnet (development)
solana config set --url https://api.devnet.solana.com
solana config set --keypair ~/.config/solana/devnet-keypair.json

# Testnet (staging)
solana config set --url https://api.testnet.solana.com
solana config set --keypair ~/.config/solana/testnet-keypair.json

# Mainnet-beta (production)
solana config set --url https://api.mainnet-beta.solana.com
solana config set --keypair ~/.config/solana/mainnet-keypair.json

# Verify configuration
solana config get
```

### RPC Endpoints

#### Recommended Providers

**Mainnet:**
```bash
# GenesysGo (recommended)
https://ssc-dao.genesysgo.net

# Triton (backup)
https://api.mainnet-beta.solana.com

# Helius (premium)
https://rpc.helius.xyz/?api-key=YOUR_KEY
```

**Devnet:**
```bash
https://api.devnet.solana.com
```

**Testnet:**
```bash
https://api.testnet.solana.com
```

---

## Program Deployment

### Build Program

```bash
# Navigate to project root
cd /path/to/GhostSpeak

# Build Rust program
anchor build

# Verify build
ls -lh target/deploy/
# Should see: ghostspeak_marketplace.so (~500KB)

# Get program ID
anchor keys list
# ghostspeak_marketplace: <PROGRAM_ID>
```

### Deploy to Devnet

```bash
# Set network to devnet
solana config set --url https://api.devnet.solana.com

# Check balance (need ~10 SOL for deployment)
solana balance

# Deploy program
anchor deploy

# Verify deployment
solana program show <PROGRAM_ID>

# Expected output:
# Program Id: <PROGRAM_ID>
# Owner: BPFLoaderUpgradeab1e11111111111111111111111
# ProgramData Address: <ADDRESS>
# Authority: <YOUR_KEYPAIR>
# Last Deployed In Slot: 123456789
# Data Length: 500000 (0x7a120) bytes
```

### Deploy to Mainnet

⚠️ **WARNING**: Mainnet deployment is irreversible. Ensure thorough testing on devnet/testnet first.

```bash
# Set network to mainnet
solana config set --url https://api.mainnet-beta.solana.com

# Load mainnet keypair (SECURE!)
solana config set --keypair ~/.config/solana/mainnet-keypair.json

# Verify balance (need ~15 SOL for mainnet deployment)
solana balance

# Final checks before deployment
anchor build --release
anchor test

# Deploy with extra buffer for upgrades
anchor deploy --program-name ghostspeak_marketplace \
              --program-keypair ~/.config/solana/program-keypair.json

# Verify
solana program show <PROGRAM_ID>

# Initialize program state (first time only)
anchor run initialize-mainnet
```

---

## SDK Deployment

### Build TypeScript SDK

```bash
cd packages/sdk-typescript

# Install dependencies
bun install

# Build SDK
bun run build

# Run tests
bun test

# Verify build output
ls -lh dist/
# Should see: index.js, index.d.ts, package.json

# Check types
tsc --noEmit
```

### Publish to npm

```bash
# Login to npm
npm login

# Update version (follow semver)
npm version patch  # 1.0.0 -> 1.0.1
# or
npm version minor  # 1.0.0 -> 1.1.0
# or
npm version major  # 1.0.0 -> 2.0.0

# Build and publish
bun run build
npm publish --access public

# Verify published package
npm view @ghostspeak/sdk
```

### CLI Deployment

```bash
cd packages/cli

# Build CLI
bun run build

# Test locally
node dist/index.js --help

# Publish to npm
npm publish --access public

# Install globally
npm install -g @ghostspeak/cli

# Verify
ghostspeak --version
```

---

## Infrastructure Setup

### Web Application (Vercel)

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to web package
cd packages/web

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Environment variables (set in Vercel dashboard)
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_PROGRAM_ID=<YOUR_PROGRAM_ID>
NEXT_PUBLIC_NETWORK=mainnet-beta
```

### Database (PostgreSQL)

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb ghostspeak

# Create user
sudo -u postgres psql -c "CREATE USER ghostspeak WITH PASSWORD 'secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ghostspeak TO ghostspeak;"

# Run migrations
cd packages/api
npm run migrate:up

# Verify
psql -U ghostspeak -d ghostspeak -c "\dt"
```

### Redis (Caching)

```bash
# Install Redis
sudo apt install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Set: maxmemory 2gb
# Set: maxmemory-policy allkeys-lru

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test connection
redis-cli ping
# Should return: PONG
```

### IPFS (File Storage)

```bash
# Install IPFS
wget https://dist.ipfs.io/kubo/v0.22.0/kubo_v0.22.0_linux-amd64.tar.gz
tar -xvzf kubo_v0.22.0_linux-amd64.tar.gz
cd kubo
sudo bash install.sh

# Initialize IPFS
ipfs init

# Start daemon
ipfs daemon &

# Verify
ipfs swarm peers
```

---

## Monitoring & Alerting

### Prometheus Setup

```bash
# Install Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar -xvzf prometheus-2.45.0.linux-amd64.tar.gz
cd prometheus-2.45.0.linux-amd64

# Configure prometheus.yml
cat > prometheus.yml <<EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'ghostspeak'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'solana-validator'
    static_configs:
      - targets: ['localhost:8899']
EOF

# Start Prometheus
./prometheus --config.file=prometheus.yml &
```

### Grafana Dashboards

```bash
# Install Grafana
sudo apt-get install -y software-properties-common
sudo add-apt-repository "deb https://packages.grafana.com/oss/deb stable main"
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
sudo apt-get update
sudo apt-get install grafana

# Start Grafana
sudo systemctl start grafana-server
sudo systemctl enable grafana-server

# Access at: http://localhost:3000
# Default login: admin / admin
```

#### Key Metrics to Monitor

```yaml
# Program Metrics
- ghostspeak_agent_registrations_total
- ghostspeak_escrow_creations_total
- ghostspeak_x402_payments_total
- ghostspeak_reputation_updates_total

# Performance Metrics
- solana_transaction_duration_seconds
- solana_rpc_requests_total
- solana_rpc_errors_total

# Business Metrics
- ghostspeak_total_volume_usd
- ghostspeak_active_agents_total
- ghostspeak_reputation_avg_score

# System Metrics
- cpu_usage_percent
- memory_usage_bytes
- disk_usage_percent
```

### Alert Rules

```yaml
# Critical Alerts
- alert: HighErrorRate
  expr: rate(ghostspeak_errors_total[5m]) > 0.05
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "High error rate detected"

- alert: LowSuccessRate
  expr: rate(ghostspeak_successful_transactions[5m]) < 0.90
  for: 10m
  labels:
    severity: warning

- alert: HighTransactionCost
  expr: avg(solana_transaction_cost_sol) > 0.001
  for: 15m
  labels:
    severity: warning
```

---

## Backup & Recovery

### Program Backup

```bash
# Backup program binary
solana program dump <PROGRAM_ID> ghostspeak_backup_$(date +%Y%m%d).so

# Verify backup
ls -lh ghostspeak_backup_*.so

# Store securely (S3, encrypted)
aws s3 cp ghostspeak_backup_20251105.so s3://ghostspeak-backups/programs/ \
  --sse AES256
```

### Database Backup

```bash
# Daily backup script
cat > /usr/local/bin/backup-ghostspeak-db.sh <<'EOF'
#!/bin/bash
BACKUP_DIR=/var/backups/ghostspeak
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup PostgreSQL
pg_dump ghostspeak | gzip > $BACKUP_DIR/ghostspeak_$DATE.sql.gz

# Backup Redis
redis-cli BGSAVE
cp /var/lib/redis/dump.rdb $BACKUP_DIR/redis_$DATE.rdb

# Upload to S3
aws s3 sync $BACKUP_DIR s3://ghostspeak-backups/database/

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -mtime +30 -delete
EOF

chmod +x /usr/local/bin/backup-ghostspeak-db.sh

# Add to crontab (daily at 2am)
echo "0 2 * * * /usr/local/bin/backup-ghostspeak-db.sh" | crontab -
```

### Recovery Procedure

```bash
# Restore database from backup
gunzip -c ghostspeak_20251105.sql.gz | psql ghostspeak

# Restore Redis
cp redis_20251105.rdb /var/lib/redis/dump.rdb
sudo systemctl restart redis-server

# Redeploy program (if needed)
anchor upgrade target/deploy/ghostspeak_marketplace.so --program-id <PROGRAM_ID>
```

---

## Upgrade Procedures

### Program Upgrade

```bash
# Build new version
anchor build --release

# Test thoroughly on devnet first!
anchor deploy --program-name ghostspeak_marketplace

# After testing, upgrade mainnet
solana program upgrade target/deploy/ghostspeak_marketplace.so \
  --program-id <PROGRAM_ID> \
  --upgrade-authority ~/.config/solana/mainnet-keypair.json

# Verify upgrade
solana program show <PROGRAM_ID>
```

### SDK Upgrade

```bash
# Update version
npm version minor

# Build
bun run build

# Test
bun test

# Publish
npm publish

# Notify users
echo "New version published: $(npm view @ghostspeak/sdk version)"
```

### Zero-Downtime Deployment

```bash
# Deploy new version to staging slot
vercel --prod --scope staging

# Run smoke tests
npm run test:smoke -- --url https://staging.ghostspeak.io

# Gradually shift traffic (10% -> 50% -> 100%)
vercel promote --alias production --percentage 10
sleep 300  # Monitor for 5 minutes
vercel promote --alias production --percentage 50
sleep 300
vercel promote --alias production --percentage 100
```

---

## Troubleshooting

### Common Issues

#### Program Deployment Fails

```bash
# Error: "Insufficient funds"
solana balance  # Check balance
solana airdrop 2  # If devnet

# Error: "Program already deployed"
anchor upgrade target/deploy/ghostspeak_marketplace.so --program-id <PROGRAM_ID>

# Error: "Invalid keypair"
solana-keygen verify <PUBLIC_KEY> ~/.config/solana/keypair.json
```

#### Transaction Failures

```bash
# Get transaction details
solana confirm -v <SIGNATURE>

# Check program logs
solana logs <PROGRAM_ID>

# Check account state
solana account <ACCOUNT_ADDRESS>
```

#### SDK Connection Issues

```typescript
// Test RPC connection
import { createSolanaRpc } from '@solana/kit';

const rpc = createSolanaRpc('https://api.mainnet-beta.solana.com');
const health = await rpc.getHealth().send();
console.log('RPC Health:', health);

// Test with custom timeout
const rpcWithTimeout = createSolanaRpc(
  'https://api.mainnet-beta.solana.com',
  { timeout: 30000 }  // 30 seconds
);
```

#### High RPC Costs

```bash
# Use GenesysGo (lower fees)
solana config set --url https://ssc-dao.genesysgo.net

# Or Helius (premium, but reliable)
solana config set --url https://rpc.helius.xyz/?api-key=YOUR_KEY

# Monitor costs
solana balance -k ~/.config/solana/fee-payer.json
```

---

## Production Checklist

### Pre-Deployment

- [ ] All tests passing (unit + integration)
- [ ] Security audit completed
- [ ] Load testing performed
- [ ] Monitoring dashboards configured
- [ ] Backup procedures tested
- [ ] Rollback plan documented
- [ ] Team notified of deployment window

### Deployment

- [ ] Deploy to staging first
- [ ] Run smoke tests on staging
- [ ] Deploy to production
- [ ] Verify program ID matches expected
- [ ] Run smoke tests on production
- [ ] Monitor error rates for 1 hour

### Post-Deployment

- [ ] Verify all metrics reporting correctly
- [ ] Check error logs for anomalies
- [ ] Update documentation
- [ ] Notify users of new features
- [ ] Schedule post-mortem meeting

---

## Support & Resources

### Documentation
- Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md)
- API Reference: [API.md](./API.md)
- Security: [SECURITY.md](./SECURITY.md)

### Community
- Discord: https://discord.gg/ghostspeak
- GitHub: https://github.com/Dexploarer/GhostSpeak
- Email: support@ghostspeak.io

### Emergency Contacts
- On-Call Engineer: +1-XXX-XXX-XXXX
- Security Team: security@ghostspeak.io
- PagerDuty: ghostspeak-oncall

---

**Last Updated**: November 2025
**Version**: 1.0.0-beta
**Status**: Championship-Grade Deployment Documentation
