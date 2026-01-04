/**
 * Mint Devnet GHOST Token
 *
 * Creates a test GHOST token on devnet with:
 * - 1 billion total supply
 * - 9 decimals (standard for SPL tokens)
 * - For testing only (no real value)
 */

import { Connection, Keypair, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🔧 Minting Devnet GHOST Token...');
  console.log('================================\n');

  // Connect to devnet
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  console.log('✅ Connected to Solana devnet\n');

  // Load wallet keypair from Solana CLI config
  const keypairPath = path.join(process.env.HOME || '', '.config/solana/id.json');
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));

  console.log('👛 Wallet:', payer.publicKey.toBase58());

  // Check balance
  const balance = await connection.getBalance(payer.publicKey);
  console.log('💰 Balance:', balance / 1e9, 'SOL\n');

  if (balance < 0.1 * 1e9) {
    console.log('⚠️  Low balance, requesting airdrop...');
    const airdropSig = await connection.requestAirdrop(payer.publicKey, 2 * 1e9);
    await connection.confirmTransaction(airdropSig);
    console.log('✅ Airdrop confirmed\n');
  }

  // Create token mint with 9 decimals
  console.log('🪙 Creating GHOST token mint (9 decimals)...');
  const mint = await createMint(
    connection,
    payer,
    payer.publicKey, // mint authority
    payer.publicKey, // freeze authority
    9 // decimals
  );

  console.log('✅ Token Mint Created:', mint.toBase58());
  console.log('');

  // Create token account
  console.log('📦 Creating token account...');
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );

  console.log('✅ Token Account:', tokenAccount.address.toBase58());
  console.log('');

  // Mint 1 billion tokens (with 9 decimals)
  const amountToMint = BigInt(1_000_000_000) * BigInt(10 ** 9); // 1B tokens

  console.log('💸 Minting 1,000,000,000 GHOST tokens...');
  await mintTo(
    connection,
    payer,
    mint,
    tokenAccount.address,
    payer,
    amountToMint
  );

  console.log('✅ Minted 1,000,000,000 GHOST tokens');
  console.log('');

  // Save deployment info
  const deploymentInfo = `# GhostSpeak Devnet Deployment

**Last Updated**: ${new Date().toISOString()}
**Network**: Solana Devnet

---

## Program Deployments

### GhostSpeak Program
- **Program ID**: \`4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB\`
- **Deployment Date**: December 30, 2025
- **Deployment Signature**: \`5zdU8HdtenhgwDmeEJu2ZPrQwoG9gztHHM5Ft6URxCzTj7m4y9ZkvmVKrpvMK41skcHvh8xa7ckNuUkQwPsierJr\`
- **Status**: ✅ Active

---

## Token Deployments

### GHOST Token (Devnet Testing)
- **Mint Address**: \`${mint.toBase58()}\`
- **Token Account**: \`${tokenAccount.address.toBase58()}\`
- **Decimals**: 9
- **Total Supply**: 1,000,000,000 GHOST
- **Minted**: ${new Date().toISOString()}
- **Purpose**: Devnet testing of staking, payments, and rewards
- **Network**: Devnet only
- **Mint Authority**: ${payer.publicKey.toBase58()} (can mint more for testing)
- **Freeze Authority**: ${payer.publicKey.toBase58()}

### USDC (Devnet)
- **Mint Address**: \`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU\`
- **Purpose**: Payment testing

---

## Mainnet References (Read-Only)

### GHOST Token (Mainnet - Production)
- **Mint Address**: \`DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump\`
- **Decimals**: 6
- **Total Supply**: ~999.75M GHOST (immutable)
- **Note**: This is the real production token on mainnet

---

## Environment Variables

Add these to your \`.env\`:

\`\`\`bash
# Solana Network
SOLANA_CLUSTER=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com

# GhostSpeak Program
GHOSTSPEAK_PROGRAM_ID=4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB
GHOSTSPEAK_PROGRAM_ID_DEVNET=4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB

# Tokens (Devnet)
GHOSTSPEAK_GHOST_TOKEN_MINT_DEVNET=${mint.toBase58()}
GHOSTSPEAK_GHOST_TOKEN_DECIMALS_DEVNET=9
GHOSTSPEAK_USDC_MINT_DEVNET=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU

# Mainnet (Read-Only Reference)
GHOSTSPEAK_GHOST_TOKEN_MINT_MAINNET=DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRYJkehvpump
GHOSTSPEAK_GHOST_TOKEN_DECIMALS_MAINNET=6
\`\`\`

---

## Explorer Links

### Devnet
- [GhostSpeak Program](https://explorer.solana.com/address/4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB?cluster=devnet)
- [GHOST Token Mint](https://explorer.solana.com/address/${mint.toBase58()}?cluster=devnet)
- [GHOST Token Account](https://explorer.solana.com/address/${tokenAccount.address.toBase58()}?cluster=devnet)
- [USDC Mint](https://explorer.solana.com/address/4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU?cluster=devnet)

### Mainnet (Production)
- [GHOST Token](https://explorer.solana.com/address/DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRYJkehvpump)
- [DEX Screener](https://dexscreener.com/solana/e44xj7jyjxyermlqqwrpu4nekcphawfjf3ppn2uokgdb)

---

## Testing Workflow

### 1. Agent Discovery (Mainnet → Devnet)
\`\`\`bash
# Discover real x402 agents on mainnet
# Register them on devnet GhostSpeak program for testing
\`\`\`

### 2. Staking & Rewards (Devnet)
\`\`\`bash
# Use devnet GHOST token for testing staking tiers
# Mint Address: ${mint.toBase58()}
# No real value, unlimited supply for testing
\`\`\`

### 3. Credential Issuance (Devnet)
\`\`\`bash
# Issue W3C credentials on devnet
# Test Crossmint bridge to EVM testnet
\`\`\`

---

## Important Notes

⚠️ **Devnet tokens have no value** - Use for testing only
✅ **Program is deployed** - No need to redeploy unless updating
✅ **Can mint more tokens** - Mint authority retained for testing
📝 **Keep this file updated** - Document all changes here
🔐 **Never lose this info** - Commit to git immediately

---

## Quick Commands

\`\`\`bash
# Check token balance
spl-token balance ${mint.toBase58()}

# Mint more tokens (for testing)
spl-token mint ${mint.toBase58()} 1000000000

# View token info
spl-token display ${mint.toBase58()}
\`\`\`
`;

  const deploymentPath = path.join(process.cwd(), 'DEVNET_DEPLOYMENT.md');
  fs.writeFileSync(deploymentPath, deploymentInfo);
  console.log('📝 Deployment info saved to: DEVNET_DEPLOYMENT.md\n');

  // Update .env
  const envPath = path.join(process.cwd(), '.env');
  let envContent = fs.readFileSync(envPath, 'utf-8');

  // Update or add devnet token mint
  if (envContent.includes('GHOSTSPEAK_GHOST_TOKEN_MINT_DEVNET=')) {
    envContent = envContent.replace(
      /GHOSTSPEAK_GHOST_TOKEN_MINT_DEVNET=.*/,
      `GHOSTSPEAK_GHOST_TOKEN_MINT_DEVNET=${mint.toBase58()}`
    );
  } else {
    envContent += `\nGHOSTSPEAK_GHOST_TOKEN_MINT_DEVNET=${mint.toBase58()}`;
  }

  // Update or add decimals
  if (envContent.includes('GHOSTSPEAK_GHOST_TOKEN_DECIMALS_DEVNET=')) {
    envContent = envContent.replace(
      /GHOSTSPEAK_GHOST_TOKEN_DECIMALS_DEVNET=.*/,
      'GHOSTSPEAK_GHOST_TOKEN_DECIMALS_DEVNET=9'
    );
  } else {
    envContent += '\nGHOSTSPEAK_GHOST_TOKEN_DECIMALS_DEVNET=9';
  }

  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env updated\n');

  console.log('🎉 Success! Devnet GHOST token created:');
  console.log('   Mint:', mint.toBase58());
  console.log('   Account:', tokenAccount.address.toBase58());
  console.log('   Supply: 1,000,000,000 GHOST');
  console.log('   Decimals: 9\n');
  console.log('📖 View deployment info: cat DEVNET_DEPLOYMENT.md');
  console.log(`🔍 View on explorer: https://explorer.solana.com/address/${mint.toBase58()}?cluster=devnet`);
}

main().catch(console.error);
