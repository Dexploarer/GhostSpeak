# Multisig Wallet Setup Guide

## Overview

This guide walks through setting up a multisig wallet using Squads Protocol for securing GhostSpeak's program upgrade authority and protocol configuration.

**Multisig Type:** 3-of-5 Threshold (3 signatures required out of 5 signers)

**Purpose:**
- Program upgrade authority
- Protocol fee configuration authority
- Treasury fund management
- Emergency operations

---

## Prerequisites

- [ ] 5 team members identified as signers
- [ ] Each signer has a hardware wallet (Ledger/Trezor) or secure keypair
- [ ] Each signer has tested signing transactions on devnet
- [ ] Backup recovery plan documented
- [ ] Signer contact information collected

---

## Signer Selection

### Recommended Signer Roles

1. **Technical Lead** - Primary technical decision maker
2. **Security Lead** - Responsible for security reviews
3. **Product Lead** - Business and product decisions
4. **Operations Lead** - Day-to-day operations
5. **Advisor/Founder** - Strategic oversight

### Signer Requirements

- Access to hardware wallet or secure key storage
- Available for signing within 24 hours (critical operations)
- Understands multisig security responsibilities
- Has backup contact method (phone, email, Telegram)

### Signer Information Template

```
Signer 1:
  Name: [Full Name]
  Role: Technical Lead
  Public Key: [Solana Address]
  Hardware Wallet: Ledger Nano X
  Contact: [Email], [Phone], [Telegram]
  Backup Contact: [Secondary Contact]
  Timezone: UTC-5

Signer 2:
  Name: [Full Name]
  Role: Security Lead
  Public Key: [Solana Address]
  Hardware Wallet: Ledger Nano S Plus
  Contact: [Email], [Phone], [Telegram]
  Backup Contact: [Secondary Contact]
  Timezone: UTC+1

[... continue for all 5 signers]
```

---

## Option 1: Squads Protocol (Recommended)

Squads is the leading multisig solution on Solana with native support for program upgrades.

### Installation

```bash
# Install Squads CLI
npm install -g @sqds/cli

# Or use without installation
npx @sqds/cli --help
```

### Create Multisig on Devnet (Testing)

```bash
# 1. Create a new Squads multisig (3-of-5)
squads create-multisig \
  --threshold 3 \
  --members SIGNER1_PUBKEY,SIGNER2_PUBKEY,SIGNER3_PUBKEY,SIGNER4_PUBKEY,SIGNER5_PUBKEY \
  --cluster devnet

# Output will include:
# - Multisig Address: [ADDRESS]
# - Vault Address: [VAULT_ADDRESS]
```

**Save these addresses!** You'll need them for all subsequent operations.

### Test Multisig on Devnet

```bash
# 1. Fund the multisig vault (for testing)
solana transfer VAULT_ADDRESS 1 --cluster devnet

# 2. Create a test proposal (simple transfer)
squads create-proposal \
  --multisig MULTISIG_ADDRESS \
  --title "Test Proposal" \
  --description "Testing multisig workflow" \
  --cluster devnet

# Output: Proposal ID

# 3. Add an instruction to the proposal
squads add-instruction \
  --multisig MULTISIG_ADDRESS \
  --proposal PROPOSAL_ID \
  --program 11111111111111111111111111111111 \
  --instruction transfer \
  --args RECIPIENT_ADDRESS,100000000 \
  --cluster devnet

# 4. Approve the proposal (need 3 signers)
# Signer 1:
squads approve-proposal \
  --multisig MULTISIG_ADDRESS \
  --proposal PROPOSAL_ID \
  --cluster devnet

# Signer 2:
squads approve-proposal \
  --multisig MULTISIG_ADDRESS \
  --proposal PROPOSAL_ID \
  --cluster devnet

# Signer 3:
squads approve-proposal \
  --multisig MULTISIG_ADDRESS \
  --proposal PROPOSAL_ID \
  --cluster devnet

# 5. Execute the proposal (after 3 approvals)
squads execute-proposal \
  --multisig MULTISIG_ADDRESS \
  --proposal PROPOSAL_ID \
  --cluster devnet
```

### Create Mainnet Multisig

**IMPORTANT:** Only create the mainnet multisig after testing on devnet.

```bash
# Create mainnet multisig
squads create-multisig \
  --threshold 3 \
  --members SIGNER1_PUBKEY,SIGNER2_PUBKEY,SIGNER3_PUBKEY,SIGNER4_PUBKEY,SIGNER5_PUBKEY \
  --cluster mainnet

# SAVE THESE ADDRESSES:
# Multisig Address: [MAINNET_MULTISIG_ADDRESS]
# Vault Address: [MAINNET_VAULT_ADDRESS]
```

### Set Multisig as Program Upgrade Authority

```bash
# CRITICAL: This makes the multisig the only entity that can upgrade the program

# 1. Verify current upgrade authority
solana program show PROGRAM_ID --cluster mainnet

# Current upgrade authority: [DEPLOYER_ADDRESS]

# 2. Transfer upgrade authority to multisig
# This requires a proposal since it's a critical operation

squads create-proposal \
  --multisig MULTISIG_ADDRESS \
  --title "Set Multisig as Upgrade Authority" \
  --description "Transfer program upgrade authority to multisig for security" \
  --cluster mainnet

# Add set-upgrade-authority instruction
solana program set-upgrade-authority \
  PROGRAM_ID \
  --new-upgrade-authority MULTISIG_VAULT_ADDRESS \
  --cluster mainnet

# Get 3-of-5 approvals, then execute

# 3. Verify the change
solana program show PROGRAM_ID --cluster mainnet
# Upgrade authority should now be: MULTISIG_VAULT_ADDRESS
```

### Set Multisig as Protocol Config Authority

The protocol config authority can update fees and protocol parameters.

```bash
# Create proposal to transfer protocol config authority
squads create-proposal \
  --multisig MULTISIG_ADDRESS \
  --title "Set Protocol Config Authority" \
  --description "Make multisig the protocol config authority" \
  --cluster mainnet

# Use the update_protocol_config instruction to change authority
# This will be a custom instruction from GhostSpeak program

# Get 3-of-5 approvals, then execute
```

---

## Option 2: Goki Smart Wallet (Alternative)

Goki is another popular multisig solution with advanced features.

### Installation

```bash
npm install -g @gokiprotocol/client
```

### Create Goki Wallet

```bash
# Create new smart wallet
goki create-wallet \
  --owners SIGNER1,SIGNER2,SIGNER3,SIGNER4,SIGNER5 \
  --threshold 3 \
  --cluster mainnet
```

---

## Multisig Operations

### Common Proposal Types

#### 1. Program Upgrade

```bash
squads create-proposal \
  --multisig MULTISIG_ADDRESS \
  --title "Upgrade GhostSpeak Program v1.1.0" \
  --description "Security patch for agent registration" \
  --cluster mainnet

# Add upgrade instruction
solana program upgrade \
  NEW_PROGRAM.so \
  PROGRAM_ID \
  --upgrade-authority MULTISIG_VAULT_ADDRESS \
  --cluster mainnet
```

#### 2. Update Protocol Fees

```bash
squads create-proposal \
  --multisig MULTISIG_ADDRESS \
  --title "Reduce Escrow Fee to 0.3%" \
  --description "Community vote passed to reduce fees" \
  --cluster mainnet

# Add update_protocol_config instruction
# This will use GhostSpeak's update_protocol_config instruction
```

#### 3. Treasury Withdrawal

```bash
squads create-proposal \
  --multisig MULTISIG_ADDRESS \
  --title "Withdraw 100 SOL for Operations" \
  --description "Q1 2025 operational expenses" \
  --cluster mainnet

# Add transfer instruction from treasury
```

#### 4. Emergency Pause (if implemented)

```bash
squads create-proposal \
  --multisig MULTISIG_ADDRESS \
  --title "EMERGENCY: Pause Protocol" \
  --description "Critical vulnerability detected, pausing all operations" \
  --cluster mainnet
  --urgent

# Add pause instruction
```

---

## Multisig Security Best Practices

### Signer Key Management

1. **Use Hardware Wallets**
   - Ledger Nano X or S Plus
   - Trezor Model T
   - Never use hot wallets for multisig signers

2. **Secure Key Storage**
   - Hardware wallet seed phrase in fireproof safe
   - Split seed phrase storage (not all words in one place)
   - Metal seed phrase backup (e.g., Billfodl, Cryptosteel)

3. **Access Control**
   - Limit who knows signer identities
   - Use pseudonyms in public communications
   - Don't share signer addresses publicly

### Proposal Workflow

1. **Proposal Creation**
   - Only authorized team members can create proposals
   - All proposals must have clear title and description
   - Include link to GitHub issue or discussion

2. **Review Period**
   - Minimum 24-hour review period for non-emergency proposals
   - Signers review proposal details and instructions
   - Technical review by at least 2 engineers

3. **Approval Process**
   - Each signer independently verifies the proposal
   - Check instruction data matches proposal description
   - Verify recipient addresses
   - Confirm amounts and parameters

4. **Execution**
   - Any signer can execute after threshold reached
   - Verify transaction signature on Solana Explorer
   - Document execution in team log

### Emergency Procedures

#### Lost Signer Key

If a signer loses access to their key:

1. Still have 4-of-5 signers available (can still operate)
2. Create proposal to remove lost signer
3. Create proposal to add new signer
4. Execute both proposals with 3-of-4 remaining signers
5. Update signer documentation

#### Compromised Signer Key

If a signer key is compromised:

1. **IMMEDIATE:** Contact all other signers
2. **DO NOT** execute any pending proposals
3. Review all recent proposals for suspicious activity
4. Create emergency proposal to remove compromised signer
5. Fast-track approval (within hours)
6. Add new replacement signer
7. Conduct security review

#### Multisig Account Compromised

If the multisig itself is compromised (extremely unlikely):

1. **EMERGENCY PROTOCOL**
2. Contact Solana validators to potentially halt the chain (extreme case)
3. Deploy new program with new multisig
4. Migrate all state to new program
5. Post-mortem and security review

---

## Multisig Monitoring

### Transaction Monitoring

- **Squads UI:** https://v4.squads.so
- **Solana Explorer:** https://explorer.solana.com
- **Custom Dashboard:** Track multisig proposals and executions

### Alerts

Set up alerts for:
- New proposals created
- Proposals approved
- Proposals executed
- Failed execution attempts
- Unusual activity patterns

### Notification Channels

- Slack/Discord channel: `#multisig-operations`
- PagerDuty for emergency proposals
- Email to all signers for new proposals

---

## Testing Checklist

Before using multisig on mainnet:

- [ ] Created test multisig on devnet
- [ ] All 5 signers successfully approved a test proposal
- [ ] Executed test proposal successfully
- [ ] Tested program upgrade on devnet with multisig
- [ ] Tested treasury withdrawal on devnet
- [ ] Verified multisig as upgrade authority works
- [ ] Documented all signer contact information
- [ ] Established emergency communication channel
- [ ] Trained all signers on approval process
- [ ] Created runbook for common operations

---

## Mainnet Deployment Checklist

- [ ] Multisig created on mainnet
- [ ] All 5 signers verified and saved addresses
- [ ] Multisig funded with rent-exempt amount
- [ ] Test proposal created and executed successfully
- [ ] Program upgrade authority transferred to multisig
- [ ] Protocol config authority transferred to multisig
- [ ] Treasury funds transferred to multisig vault
- [ ] Monitoring and alerts configured
- [ ] Emergency procedures documented and reviewed
- [ ] Signer backup contacts verified

---

## Useful Commands

### Check Multisig Info

```bash
# View multisig details
squads view-multisig MULTISIG_ADDRESS --cluster mainnet

# List all proposals
squads list-proposals MULTISIG_ADDRESS --cluster mainnet

# View specific proposal
squads view-proposal MULTISIG_ADDRESS PROPOSAL_ID --cluster mainnet

# Check vault balance
solana balance VAULT_ADDRESS --cluster mainnet
```

### Manage Signers

```bash
# Add new signer (requires proposal)
squads create-proposal \
  --multisig MULTISIG_ADDRESS \
  --title "Add New Signer" \
  --cluster mainnet

squads add-signer \
  --multisig MULTISIG_ADDRESS \
  --signer NEW_SIGNER_PUBKEY

# Remove signer (requires proposal)
squads remove-signer \
  --multisig MULTISIG_ADDRESS \
  --signer SIGNER_TO_REMOVE_PUBKEY

# Change threshold (requires proposal)
squads change-threshold \
  --multisig MULTISIG_ADDRESS \
  --threshold 4
```

---

## Resources

- **Squads Protocol:** https://squads.so
- **Squads Docs:** https://docs.squads.so
- **Squads Discord:** https://discord.gg/squads
- **Goki Protocol:** https://goki.so
- **Solana Program Deployment:** https://docs.solana.com/cli/deploy-a-program

---

## Support

For multisig-related issues:

1. Check Squads documentation
2. Join Squads Discord
3. Contact GhostSpeak security team: security@ghostspeak.io
4. Emergency hotline: [EMERGENCY_CONTACT]

---

**Last Updated:** 2025-12-30
**Version:** 1.0
**Maintainer:** GhostSpeak Security Team
