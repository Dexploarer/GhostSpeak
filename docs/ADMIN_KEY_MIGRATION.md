# Admin Key Migration Guide

## Overview

This guide provides instructions for migrating from hardcoded admin keys to a proper configuration-based approach for the GhostSpeak protocol.

## Current Issue

The protocol currently uses hardcoded admin keys in `programs/src/lib.rs`:

```rust
#[cfg(feature = "devnet")]
pub const PROTOCOL_ADMIN: Pubkey = 
    anchor_lang::solana_program::pubkey!("11111111111111111111111111111111");
#[cfg(not(feature = "devnet"))]
pub const PROTOCOL_ADMIN: Pubkey = Pubkey::new_from_array([1u8; 32]);
```

This presents security risks:
- System program (all 1s) is used as admin on devnet
- Predictable key pattern on mainnet
- No ability to rotate keys
- Single point of failure

## Migration Steps

### Phase 1: Immediate Actions (Before Next Deployment)

1. **Generate Proper Admin Keys**
   ```bash
   # Generate a new keypair for devnet admin
   solana-keygen new -o ~/ghostspeak-keys/devnet-admin.json
   
   # Generate a new keypair for testnet admin
   solana-keygen new -o ~/ghostspeak-keys/testnet-admin.json
   
   # For mainnet, use a hardware wallet or multisig
   ```

2. **Update Environment Configuration**
   ```bash
   # Add to .env.devnet
   DEVNET_ADMIN_KEY=<pubkey from devnet-admin.json>
   DEVNET_UPGRADE_AUTHORITY=<pubkey from devnet-admin.json>
   
   # Add to .env.testnet
   TESTNET_ADMIN_KEY=<pubkey from testnet-admin.json>
   TESTNET_UPGRADE_AUTHORITY=<pubkey from testnet-admin.json>
   ```

3. **Deploy Configuration Contract**
   
   Create a configuration account that stores admin keys:
   
   ```rust
   #[account]
   pub struct ProtocolConfig {
       pub admin: Pubkey,
       pub upgrade_authority: Pubkey,
       pub fee_receiver: Pubkey,
       pub emergency_pause_authority: Pubkey,
       pub authorized_verifiers: Vec<Pubkey>,
       pub bump: u8,
   }
   ```

### Phase 2: Code Changes

1. **Remove Hardcoded Constants**
   
   Replace the hardcoded PROTOCOL_ADMIN with configuration lookups:
   
   ```rust
   // Old
   require!(ctx.accounts.authority.key() == crate::PROTOCOL_ADMIN);
   
   // New
   require!(ctx.accounts.authority.key() == ctx.accounts.protocol_config.admin);
   ```

2. **Add Config Account to Instructions**
   
   ```rust
   #[derive(Accounts)]
   pub struct AdminOperation<'info> {
       #[account(
           seeds = [b"protocol_config"],
           bump = protocol_config.bump
       )]
       pub protocol_config: Account<'info, ProtocolConfig>,
       
       #[account(
           constraint = authority.key() == protocol_config.admin 
               @ GhostSpeakError::UnauthorizedAccess
       )]
       pub authority: Signer<'info>,
   }
   ```

3. **Initialize Configuration**
   
   Add an instruction to initialize the protocol configuration:
   
   ```rust
   pub fn initialize_protocol_config(
       ctx: Context<InitializeProtocolConfig>,
       admin: Pubkey,
       upgrade_authority: Pubkey,
       fee_receiver: Pubkey,
   ) -> Result<()> {
       let config = &mut ctx.accounts.protocol_config;
       config.admin = admin;
       config.upgrade_authority = upgrade_authority;
       config.fee_receiver = fee_receiver;
       config.emergency_pause_authority = admin; // Initially same as admin
       config.authorized_verifiers = vec![];
       config.bump = ctx.bumps.protocol_config;
       Ok(())
   }
   ```

### Phase 3: Multisig Setup (For Mainnet)

1. **Create Multisig Wallet**
   ```bash
   # Use Squads Protocol or similar
   squads-cli create-multisig \
     --threshold 3 \
     --members key1.json,key2.json,key3.json,key4.json,key5.json
   ```

2. **Transfer Authorities**
   ```bash
   # Transfer program upgrade authority
   solana program set-upgrade-authority \
     AJVoWJ4JC1xJR9ufGBGuMgFpHMLouB29sFRTJRvEK1ZR \
     --new-upgrade-authority <MULTISIG_ADDRESS>
   ```

3. **Update Protocol Config**
   ```typescript
   await program.methods
     .updateProtocolAdmin(multisigAddress)
     .accounts({
       protocolConfig,
       currentAdmin,
     })
     .signers([currentAdminKeypair])
     .rpc();
   ```

### Phase 4: Emergency Procedures

1. **Key Rotation Process**
   - Requires current admin signature
   - Emits AdminChanged event
   - Updates all dependent accounts

2. **Emergency Pause**
   - Separate emergency authority
   - Can pause critical operations
   - Cannot steal funds

3. **Recovery Procedures**
   - Time-locked admin changes
   - Multi-signature requirements
   - Audit trail of all changes

## Security Checklist

- [ ] Generate unique keypairs for each environment
- [ ] Store keys securely (hardware wallet for mainnet)
- [ ] Implement key rotation mechanism
- [ ] Set up multisig for mainnet
- [ ] Add time delays for critical changes
- [ ] Implement comprehensive logging
- [ ] Test emergency procedures
- [ ] Document key management procedures
- [ ] Set up monitoring for admin operations

## Testing

1. **Local Testing**
   ```bash
   # Test with local validator
   solana-test-validator
   
   # Deploy with test admin
   anchor deploy --provider.cluster localnet
   
   # Initialize config
   ts-node scripts/initialize-protocol-config.ts
   ```

2. **Devnet Testing**
   ```bash
   # Deploy to devnet with new admin
   anchor deploy --provider.cluster devnet
   
   # Verify admin operations work
   npm run test:admin-operations
   ```

## Timeline

- **Week 1**: Generate keys and update environment configs
- **Week 2**: Implement configuration contract
- **Week 3**: Update all admin checks in code
- **Week 4**: Test on devnet
- **Week 5**: Set up multisig for mainnet
- **Week 6**: Full security audit
- **Week 7**: Mainnet deployment

## Monitoring

After migration, monitor for:
- Unauthorized admin operation attempts
- Unusual admin activity patterns
- Failed authentication events
- Configuration changes

## Rollback Plan

If issues arise:
1. Program upgrade authority allows code rollback
2. Configuration can be updated via admin
3. Emergency pause prevents damage
4. All changes are logged on-chain

## Conclusion

Migrating from hardcoded admin keys to a configuration-based approach significantly improves security. The use of multisig wallets and time delays for mainnet provides additional protection against key compromise.