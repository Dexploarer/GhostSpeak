# Admin Key Security Implementation Guide

## 🔒 CRITICAL SECURITY NOTICE

**CURRENT STATUS**: The program uses temporary development admin keys that MUST be replaced before production deployment.

## Current Implementation Status ✅

### What Has Been Fixed
1. **Enhanced Admin Validation Function**: Added `validate_admin_authority()` with comprehensive checks
2. **Network-Specific Configuration**: Separate admin keys for each network environment
3. **Security Documentation**: Clear warnings about production key requirements
4. **Audit Trail Support**: Logging for mainnet admin operations

### Development Keys (TEMPORARY - DO NOT USE IN PRODUCTION)
- **Devnet**: `9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM`
- **Testnet**: `8WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM`
- **Mainnet**: `7WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM`
- **Localnet**: `6WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM`

## 🚨 MANDATORY Production Setup

### Step 1: Generate Secure Admin Keys

```bash
# For devnet deployment
solana-keygen new -o ~/.config/solana/ghostspeak-devnet-admin.json

# For testnet deployment  
solana-keygen new -o ~/.config/solana/ghostspeak-testnet-admin.json

# For mainnet - USE HARDWARE WALLET OR MULTISIG
# DO NOT generate mainnet admin keys on local machine
```

### Step 2: Update Program Configuration

Before deploying to ANY network except localnet, update the admin keys in `programs/src/lib.rs`:

```rust
// Replace with your actual generated keys
#[cfg(feature = "devnet")]
pub const PROTOCOL_ADMIN: Pubkey = 
    anchor_lang::solana_program::pubkey!("YOUR_DEVNET_ADMIN_KEY_HERE");

#[cfg(feature = "testnet")]
pub const PROTOCOL_ADMIN: Pubkey = 
    anchor_lang::solana_program::pubkey!("YOUR_TESTNET_ADMIN_KEY_HERE");

#[cfg(feature = "mainnet")]
pub const PROTOCOL_ADMIN: Pubkey = 
    anchor_lang::solana_program::pubkey!("YOUR_MAINNET_MULTISIG_ADDRESS_HERE");
```

### Step 3: Mainnet Security Requirements

For mainnet deployment, you MUST:

1. **Use Multisig Wallet**: Never use a single keypair as mainnet admin
2. **Hardware Wallet Storage**: Store admin keys on hardware wallets
3. **Key Rotation Plan**: Document key rotation procedures
4. **Emergency Procedures**: Define emergency admin key recovery

#### Recommended Multisig Setup

```bash
# Using Squads Protocol (recommended)
# Create 3-of-5 multisig for mainnet admin operations
squads-cli create-multisig \
  --threshold 3 \
  --members key1.json,key2.json,key3.json,key4.json,key5.json
```

## 🔧 Usage in Instructions

All admin-protected instructions should use the enhanced validation:

```rust
use crate::validate_admin_authority;

pub fn admin_protected_instruction(
    ctx: Context<AdminInstruction>,
    // ... other params
) -> Result<()> {
    // Enhanced admin validation
    validate_admin_authority(&ctx.accounts.admin.key())?;
    
    // Rest of instruction logic
    Ok(())
}
```

## 📊 Security Features Implemented

### ✅ Current Security Measures
- **Runtime Admin Validation**: Proper authority checking
- **Network-Specific Keys**: Different keys per environment
- **Audit Trail**: Mainnet admin operations are logged
- **Default Key Protection**: Prevents use of null/system keys
- **Enhanced Error Messages**: Clear unauthorized access errors

### ⚠️ Production Requirements
- **Custom Keys Required**: Must replace development keys
- **Multisig for Mainnet**: Single keypair not acceptable for production
- **Key Management**: Proper storage and rotation procedures
- **Security Audit**: Third-party review recommended

## 🚀 Deployment Checklist

### Before ANY Non-Localnet Deployment:
- [ ] Generate unique admin keypairs for target network
- [ ] Update `PROTOCOL_ADMIN` constants in `lib.rs`
- [ ] Test admin operations with new keys
- [ ] Secure backup of admin keys
- [ ] Document key management procedures

### Before Mainnet Deployment:
- [ ] Set up multisig wallet
- [ ] Transfer admin authority to multisig
- [ ] Test multisig operations
- [ ] Implement key rotation schedule
- [ ] Complete security audit
- [ ] Set up monitoring and alerting

## 🔍 Verification Commands

```bash
# Verify current admin key on deployed program
solana account <PROGRAM_ID> --output json | jq '.account.data'

# Test admin operation (should succeed with correct key)
anchor test --provider.cluster devnet

# Verify unauthorized access fails
# (Test with wrong key - should return error 0x4B0 - UnauthorizedAccess)
```

## 📝 Important Notes

1. **Development vs Production**: Current keys are ONLY for development
2. **Network Isolation**: Each network should have unique admin keys
3. **No Key Reuse**: Never reuse admin keys across networks
4. **Backup Strategy**: Secure, offline backup of all admin keys
5. **Access Control**: Limit who has access to admin keys

## 🆘 Emergency Procedures

If admin keys are compromised:

1. **Immediate**: Deploy program update with new admin keys
2. **Audit**: Review all recent admin operations
3. **Rotate**: Replace all potentially compromised keys
4. **Monitor**: Watch for unauthorized access attempts
5. **Document**: Record incident and response actions

---

**STATUS**: ✅ SECURITY MEASURES IMPLEMENTED - PRODUCTION KEYS REQUIRED  
**NEXT STEP**: Generate production keys before any non-localnet deployment