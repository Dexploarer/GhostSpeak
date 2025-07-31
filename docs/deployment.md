# GhostSpeak Deployment Guide

This comprehensive guide covers deploying the GhostSpeak protocol to various Solana networks.

## Prerequisites

Before deploying, ensure you have:

- Rust 1.79.0+ installed
- Solana CLI 2.0.0+ installed
- Anchor 0.31.1+ installed
- A funded Solana wallet
- Node.js 20.0.0+ (for SDK/CLI deployment)

## Environment Setup

### 1. Install Dependencies

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked
```

### 2. Configure Solana CLI

```bash
# Set cluster
solana config set --url https://api.devnet.solana.com

# Create deployment wallet
solana-keygen new --outfile ~/.config/solana/ghostspeak-deploy.json

# Set as default wallet
solana config set --keypair ~/.config/solana/ghostspeak-deploy.json

# Check configuration
solana config get
```

### 3. Fund Wallet

```bash
# Request airdrop (Devnet)
solana airdrop 5

# Check balance
solana balance
```

## Smart Contract Deployment

### 1. Build Programs

```bash
# Navigate to project root
cd ghostspeak

# Build the program
anchor build

# Verify build output
ls -la target/deploy/
```

### 2. Deploy to Devnet

```bash
# Deploy program
anchor deploy --provider.cluster devnet

# Save the program ID
anchor keys list
```

### 3. Initialize IDL

```bash
# Upload IDL to chain
anchor idl init --filepath target/idl/ghostspeak.json \
  --provider.cluster devnet

# Verify IDL upload
anchor idl fetch <PROGRAM_ID>
```

### 4. Verify Deployment

```bash
# Run verification script
npm run verify:deployment

# Or manually check
solana program show <PROGRAM_ID>
```

## Configuration

### 1. Update Program IDs

Update `config/program-ids.ts`:

```typescript
export const PROGRAM_IDS = {
  devnet: 'GssMyhkQPePLzByJsJadbQePZc6GtzGi22aQqW5opvUX',
  testnet: 'YOUR_TESTNET_PROGRAM_ID',
  mainnet: 'YOUR_MAINNET_PROGRAM_ID'
};
```

### 2. Environment Variables

Create `.env` files for each environment:

```bash
# .env.devnet
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
ANCHOR_WALLET=~/.config/solana/ghostspeak-deploy.json
PROGRAM_ID=GssMyhkQPePLzByJsJadbQePZc6GtzGi22aQqW5opvUX

# .env.mainnet
ANCHOR_PROVIDER_URL=https://api.mainnet-beta.solana.com
ANCHOR_WALLET=~/.config/solana/ghostspeak-mainnet.json
PROGRAM_ID=YOUR_MAINNET_PROGRAM_ID
```

## SDK Deployment

### 1. Build SDK

```bash
cd packages/sdk-typescript
npm run build
```

### 2. Publish to NPM

```bash
# Login to NPM
npm login

# Publish
npm publish --access public
```

## CLI Deployment

### 1. Build CLI

```bash
cd packages/cli
npm run build
```

### 2. Publish to NPM

```bash
npm publish --access public
```

## Network-Specific Configurations

### Devnet Configuration

```typescript
const devnetConfig = {
  cluster: 'devnet',
  rpcUrl: 'https://api.devnet.solana.com',
  programId: 'GssMyhkQPePLzByJsJadbQePZc6GtzGi22aQqW5opvUX',
  commitment: 'confirmed'
};
```

### Testnet Configuration

```typescript
const testnetConfig = {
  cluster: 'testnet',
  rpcUrl: 'https://api.testnet.solana.com',
  programId: 'YOUR_TESTNET_PROGRAM_ID',
  commitment: 'confirmed'
};
```

### Mainnet Configuration

```typescript
const mainnetConfig = {
  cluster: 'mainnet-beta',
  rpcUrl: 'https://api.mainnet-beta.solana.com',
  programId: 'YOUR_MAINNET_PROGRAM_ID',
  commitment: 'finalized'
};
```

## Deployment Scripts

### Automated Deployment

```bash
# Deploy to specific network
npm run deploy:devnet
npm run deploy:testnet
npm run deploy:mainnet

# Full deployment (program + SDK + CLI)
npm run deploy:all
```

### Manual Deployment Steps

```bash
# 1. Build everything
npm run build

# 2. Run tests
npm test

# 3. Deploy program
anchor deploy --provider.cluster <NETWORK>

# 4. Update IDL
anchor idl upgrade <PROGRAM_ID> \
  --filepath target/idl/ghostspeak.json \
  --provider.cluster <NETWORK>

# 5. Verify deployment
npm run verify:deployment

# 6. Publish packages
npm run publish:sdk
npm run publish:cli
```

## Post-Deployment

### 1. Initialize Protocol

```bash
# Initialize governance
ghostspeak governance init

# Set protocol parameters
ghostspeak governance set-param marketplace-fee 200

# Initialize treasury
ghostspeak governance init-treasury
```

### 2. Verify Functionality

```bash
# Test agent registration
ghostspeak agent register --name "Test Agent"

# Test marketplace
ghostspeak marketplace list

# Test escrow
ghostspeak escrow create --amount 1
```

### 3. Monitor Health

```bash
# Check program status
solana program show <PROGRAM_ID> --lamports

# Monitor transactions
solana logs <PROGRAM_ID> --url <RPC_URL>

# Check recent activity
ghostspeak stats program
```

## Upgrade Process

### 1. Prepare Upgrade

```bash
# Build new version
anchor build

# Run migration tests
npm run test:migration
```

### 2. Deploy Upgrade

```bash
# Upgrade program (requires authority)
anchor upgrade <PROGRAM_ID> \
  --program-id <PROGRAM_ID> \
  --provider.cluster <NETWORK>
```

### 3. Update IDL

```bash
anchor idl upgrade <PROGRAM_ID> \
  --filepath target/idl/ghostspeak.json \
  --provider.cluster <NETWORK>
```

## Security Considerations

### Program Authority

1. **Transfer to Multisig**:
```bash
# Create multisig
ghostspeak governance create-multisig \
  --threshold 3 \
  --owners <OWNER1,OWNER2,OWNER3,OWNER4,OWNER5>

# Transfer authority
solana program set-upgrade-authority <PROGRAM_ID> \
  --new-upgrade-authority <MULTISIG_ADDRESS>
```

2. **Enable Time Locks**:
```bash
ghostspeak governance set-timelock --delay 172800  # 48 hours
```

### Access Control

1. **Set Admin Keys**:
```bash
ghostspeak admin set-moderator <PUBKEY>
ghostspeak admin set-verifier <PUBKEY>
```

2. **Configure Rate Limits**:
```bash
ghostspeak governance set-param rate-limit-daily 1000
ghostspeak governance set-param rate-limit-hourly 100
```

## Monitoring

### 1. Setup Monitoring

```bash
# Configure alerts
ghostspeak monitor config \
  --webhook "https://your-webhook.com" \
  --events "all"

# Start monitoring
ghostspeak monitor start
```

### 2. Log Analysis

```bash
# Export logs
solana logs <PROGRAM_ID> --output logs.json

# Analyze patterns
ghostspeak analyze logs.json
```

## Troubleshooting

### Common Issues

1. **Insufficient Funds**
   ```bash
   Error: Insufficient funds for transaction
   Solution: solana airdrop 5
   ```

2. **Program Already Exists**
   ```bash
   Error: Program already exists
   Solution: Use 'anchor upgrade' instead
   ```

3. **IDL Mismatch**
   ```bash
   Error: IDL version mismatch
   Solution: anchor idl upgrade <PROGRAM_ID> --filepath target/idl/ghostspeak.json
   ```

### Debug Commands

```bash
# Check program data
solana account <PROGRAM_ID>

# Verify buffer
solana program show <BUFFER_ADDRESS>

# Check transaction
solana confirm -v <SIGNATURE>
```

## Rollback Procedure

If issues arise:

1. **Pause Protocol**:
```bash
ghostspeak admin pause-protocol
```

2. **Revert Program**:
```bash
anchor upgrade <PROGRAM_ID> \
  --program-id <PREVIOUS_BINARY>
```

3. **Restore State** (if needed):
```bash
ghostspeak admin restore-snapshot <SNAPSHOT_ID>
```

4. **Resume Operations**:
```bash
ghostspeak admin resume-protocol
```

## Maintenance

### Regular Tasks

- Monitor program health daily
- Review transaction logs weekly
- Update dependencies monthly
- Audit security quarterly

### Backup Procedures

```bash
# Backup program state
ghostspeak backup create --name "backup-$(date +%Y%m%d)"

# List backups
ghostspeak backup list

# Restore from backup
ghostspeak backup restore <BACKUP_ID>
```