# Expert Solana Development Skill

Comprehensive, expert-level guide for Solana blockchain development. Current as of December 2025.

## When to Use This Skill

Consult this skill and its reference documents when:
- Building Solana applications (web, mobile, backend)
- Writing or auditing Solana smart contracts (programs)
- Integrating DeFi protocols (Jupiter, Raydium, Pump.fun)
- Creating or managing NFTs and tokens
- Building AI agents that interact with Solana
- Optimizing transactions for speed and cost
- Understanding MEV and transaction ordering

## Reference Documents

This skill includes detailed reference documents in `/references/`:

| Document | Purpose |
|----------|---------|
| `solana-kit-gill.md` | @solana/kit v2 API, Gill SDK, React hooks |
| `solana-agent-kit.md` | AI agent development, plugin system |
| `defi-integration.md` | Jupiter, Pump.fun, Raydium, Helius |
| `nft-token-extensions.md` | Metaplex, Bubblegum, Token-2022 |
| `mobile-development.md` | Solana App Kit, wallet adapters |
| `anchor-programs.md` | Smart contract development |
| `testing-security.md` | LiteSVM, security patterns |
| `transaction-optimization.md` | Priority fees, Jito bundles, MEV |

---

## Technology Stack (December 2025)

### Current Standards

| Category | Tool | Version | Status |
|----------|------|---------|--------|
| Client SDK | @solana/kit | 2.x | **Current Standard** |
| High-Level SDK | Gill | Latest | **Recommended** |
| Legacy SDK | @solana/web3.js | 1.x | Maintenance only |
| Smart Contracts | Anchor | 0.32.1 | **Industry Standard** |
| Client Generation | Codama | 1.1.x | **Standard Tooling** |
| AI Agents | Solana Agent Kit | V2 | Plugin architecture |
| Mobile | Solana App Kit | Latest | React Native |
| NFTs | Metaplex Core | Latest | Next-gen standard |
| cNFTs | Bubblegum v2 | Latest | Compressed NFTs |
| Tokens | Token-2022 | Current | Extensions enabled |
| DeFi Aggregator | Jupiter V6 | Current | 30+ DEXes |
| Infrastructure | Helius | Current | DAS API, RPC |
| MEV | Jito | Current | 95%+ stake coverage |
| Testing | LiteSVM | Latest | Replaces Bankrun |

### Solana Runtime

- **Validator Client**: Agave (formerly Solana Labs) / Jito-Solana / Firedancer
- **Solana CLI**: 3.0.x
- **Compute Budget**: 1.4M CU per transaction, 48M CU per block
- **Transaction Size**: 1,232 bytes (IPv6 MTU)
- **Account Limit**: ~64 accounts per transaction (use ALTs for more)

---

## Quick Start Patterns

### TypeScript/JavaScript Application

```bash
# Recommended: Gill SDK (simpler API over @solana/kit)
pnpm add gill @gillsdk/react

# Direct @solana/kit usage
pnpm add @solana/kit

# Generate program clients
pnpm add -D @codama/nodes-from-anchor @codama/renderers-js
npx codama init
npx codama run js
```

### Smart Contract Development

```bash
# Install Solana toolchain (all dependencies)
curl --proto '=https' --tlsv1.2 -sSfL https://solana-install.solana.workers.dev | bash

# Verify installation
solana --version  # 3.0.x
anchor --version  # 0.32.1

# Create new Anchor program
anchor init my_program
cd my_program
anchor build
anchor test
```

### Mobile Application

```bash
# Scaffold React Native app with all integrations
npx start-solana-app

# Manual setup
npx create-expo-app my-app --template blank-typescript
cd my-app
npm install @solana/web3.js react-native-get-random-values
```

### AI Agent

```bash
pnpm add solana-agent-kit
pnpm add @solana-agent-kit/plugin-token
pnpm add @solana-agent-kit/plugin-defi
pnpm add @solana-agent-kit/plugin-nft
```

---

## Core Concepts

### Account Model

Solana uses an account-based model where everything is an account:

```
Account Structure:
├── lamports (u64)       - Balance in lamports (1 SOL = 1e9 lamports)
├── data (Vec<u8>)       - Arbitrary data (up to 10MB)
├── owner (Pubkey)       - Program that owns this account
├── executable (bool)    - Whether this is a program
└── rent_epoch (u64)     - Epoch when rent was last paid
```

**Key Rules:**
1. Only the owner program can modify an account's data
2. Only the System Program can change owner or allocate lamports
3. Programs are stateless - all state lives in accounts
4. Accounts must be rent-exempt (hold minimum balance) or pay rent

### Program Derived Addresses (PDAs)

PDAs are deterministic addresses derived from seeds and a program ID:

```typescript
import { getProgramDerivedAddress, getAddressEncoder } from '@solana/kit';

const [pda, bump] = await getProgramDerivedAddress({
  programAddress: PROGRAM_ID,
  seeds: [
    Buffer.from('vault'),
    getAddressEncoder().encode(userAddress),
  ],
});
```

**PDA Properties:**
- Off the Ed25519 curve (no private key exists)
- Can only be signed by the deriving program via CPI
- Deterministic - same seeds always produce same address
- Bump seed ensures address is off curve

### Cross-Program Invocation (CPI)

Programs can call other programs:

```rust
// Anchor CPI
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer};

pub fn transfer_tokens(ctx: Context<TransferCtx>, amount: u64) -> Result<()> {
    let cpi_accounts = Transfer {
        from: ctx.accounts.source.to_account_info(),
        to: ctx.accounts.destination.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    
    token::transfer(cpi_ctx, amount)?;
    Ok(())
}
```

---

## Transaction Architecture

### Versioned Transactions

Solana supports two transaction versions:

| Version | Features | Use Case |
|---------|----------|----------|
| Legacy | Original format | Simple transactions |
| V0 | Address Lookup Tables | Complex DeFi, 64+ accounts |

### Address Lookup Tables (ALTs)

ALTs compress account addresses from 32 bytes to 1 byte index:

```typescript
// Without ALT: 64 accounts = 2048 bytes (exceeds 1232 byte limit)
// With ALT: 64 accounts = 64 bytes + ALT reference
```

**When to Use ALTs:**
- Transactions with 20+ accounts
- Complex DeFi operations (Jupiter swaps)
- Batch operations
- Any transaction approaching size limit

### Priority Fees

Priority fees determine transaction ordering within a block:

```typescript
import {
  getSetComputeUnitLimitInstruction,
  getSetComputeUnitPriceInstruction,
} from '@solana-program/compute-budget';

// Set compute unit limit (estimate actual usage)
const cuLimitIx = getSetComputeUnitLimitInstruction({ units: 200_000 });

// Set priority fee (microlamports per CU)
const cuPriceIx = getSetComputeUnitPriceInstruction({ 
  microLamports: 10_000n  // 0.00001 SOL per 1M CU
});

// Add as first instructions
transaction.prepend(cuLimitIx, cuPriceIx);
```

**Fee Estimation:**
```typescript
// Helius Priority Fee API
const feeEstimate = await helius.getPriorityFeeEstimate({
  accountKeys: ['JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'],
  options: { recommended: true },
});
```

### Jito Bundles

For MEV protection and atomic multi-transaction execution:

```typescript
// Bundle: Up to 5 transactions executed atomically
// - All succeed or all fail
// - Sequential execution guaranteed
// - Requires tip to Jito validators

const bundle = [
  transaction1,  // Setup
  transaction2,  // Main operation
  transaction3,  // Cleanup + tip
];

// Tip must be in last transaction
const tipIx = SystemProgram.transfer({
  fromPubkey: payer,
  toPubkey: JITO_TIP_ACCOUNT,
  lamports: 10_000, // 0.00001 SOL minimum
});
```

**When to Use Jito Bundles:**
- MEV-sensitive operations (large swaps)
- Multi-transaction atomic operations
- Operations exceeding 1.4M CU limit
- Guaranteed ordering requirements

---

## SDK Quick Reference

### @solana/kit (web3.js v2)

```typescript
import {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  generateKeyPairSigner,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  signTransactionMessageWithSigners,
  pipe,
  address,
  lamports,
} from '@solana/kit';

// RPC connection
const rpc = createSolanaRpc('https://api.mainnet-beta.solana.com');

// Generate signer
const signer = await generateKeyPairSigner();

// Build transaction with pipe
const tx = pipe(
  createTransactionMessage({ version: 0 }),
  (m) => setTransactionMessageFeePayerSigner(signer, m),
  (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
  (m) => appendTransactionMessageInstruction(instruction, m),
);

// Sign
const signedTx = await signTransactionMessageWithSigners(tx);
```

### Gill SDK

```typescript
import { createSolanaClient, createTransaction } from 'gill';
import { loadKeypairSignerFromFile } from 'gill/node';

// Simplified client
const { rpc, sendAndConfirmTransaction } = createSolanaClient({
  urlOrMoniker: 'mainnet', // or 'devnet', custom URL
});

// Load keypair from Solana CLI
const signer = await loadKeypairSignerFromFile();

// Create transaction with compute budget
const transaction = createTransaction({
  version: 'legacy',
  feePayer: signer,
  instructions: [/* ... */],
  latestBlockhash,
  computeUnitLimit: 200_000,
  computeUnitPrice: 1_000,
});

// Sign and send
const signedTx = await signTransactionMessageWithSigners(transaction);
const signature = await sendAndConfirmTransaction(signedTx);
```

---

## Smart Contract Patterns

### Basic Anchor Program

```rust
use anchor_lang::prelude::*;

declare_id!("YourProgramId11111111111111111111111111111");

#[program]
pub mod my_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, data: u64) -> Result<()> {
        let account = &mut ctx.accounts.my_account;
        account.data = data;
        account.authority = ctx.accounts.authority.key();
        account.bump = ctx.bumps.my_account;
        Ok(())
    }

    pub fn update(ctx: Context<Update>, new_data: u64) -> Result<()> {
        let account = &mut ctx.accounts.my_account;
        account.data = new_data;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + MyAccount::INIT_SPACE,
        seeds = [b"my-account", authority.key().as_ref()],
        bump
    )]
    pub my_account: Account<'info, MyAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Update<'info> {
    #[account(
        mut,
        seeds = [b"my-account", authority.key().as_ref()],
        bump = my_account.bump,
        has_one = authority
    )]
    pub my_account: Account<'info, MyAccount>,
    
    pub authority: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct MyAccount {
    pub data: u64,
    pub authority: Pubkey,
    pub bump: u8,
}
```

### Account Constraints Reference

```rust
#[account(init, payer = x, space = N)]     // Initialize new account
#[account(mut)]                             // Mark as mutable
#[account(has_one = authority)]             // Verify field matches
#[account(seeds = [...], bump)]             // PDA derivation
#[account(seeds = [...], bump = x.bump)]    // Use stored bump
#[account(constraint = x > 0)]              // Custom constraint
#[account(close = authority)]               // Close account, refund rent
#[account(realloc = N, payer = x)]          // Resize account
```

---

## Security Checklist

### Critical Vulnerabilities

1. **Missing Owner Check**
   ```rust
   // BAD: No owner verification
   pub user_account: AccountInfo<'info>,
   
   // GOOD: Verify owner
   #[account(owner = expected_program)]
   pub user_account: Account<'info, UserData>,
   ```

2. **Missing Signer Check**
   ```rust
   // BAD: No signer verification
   pub authority: AccountInfo<'info>,
   
   // GOOD: Require signature
   pub authority: Signer<'info>,
   ```

3. **Arbitrary CPI**
   ```rust
   // BAD: Unverified program
   pub external_program: AccountInfo<'info>,
   
   // GOOD: Verify program ID
   #[account(address = expected_program_id)]
   pub external_program: Program<'info, ExpectedProgram>,
   ```

4. **Integer Overflow**
   ```rust
   // BAD: Unchecked arithmetic
   let result = a + b;
   
   // GOOD: Checked arithmetic
   let result = a.checked_add(b).ok_or(ErrorCode::Overflow)?;
   ```

5. **Reinitialization Attack**
   ```rust
   // BAD: Can be reinitialized
   #[account(init_if_needed, ...)]
   
   // GOOD: Explicit initialization check
   #[account(init, ...)]  // Only works if account doesn't exist
   ```

### Security Best Practices

- **Always use Anchor** for automatic security checks
- **Validate all accounts** - owner, address, data type
- **Use checked math** for all arithmetic
- **Verify signer relationships** before state changes
- **Close accounts properly** to prevent resurrection
- **Audit CPI targets** - verify program IDs
- **Test with LiteSVM** for edge cases
- **Get professional audits** before mainnet

---

## Testing with LiteSVM

```typescript
// TypeScript
import { LiteSVM } from 'litesvm';
import { Keypair, Transaction, SystemProgram } from '@solana/web3.js';

test('transfer SOL', () => {
  const svm = new LiteSVM();
  const payer = new Keypair();
  
  // Airdrop
  svm.airdrop(payer.publicKey, BigInt(1e9));
  
  // Build transaction
  const tx = new Transaction();
  tx.add(SystemProgram.transfer({
    fromPubkey: payer.publicKey,
    toPubkey: receiver,
    lamports: 1_000_000n,
  }));
  tx.recentBlockhash = svm.latestBlockhash();
  tx.sign(payer);
  
  // Execute
  svm.sendTransaction(tx);
  
  // Assert
  const balance = svm.getBalance(receiver);
  expect(balance).toBe(1_000_000n);
});
```

```rust
// Rust
use litesvm::LiteSVM;
use solana_keypair::Keypair;
use solana_signer::Signer;

#[test]
fn test_program() {
    let mut svm = LiteSVM::new();
    
    // Load program
    svm.add_program(program_id, "target/deploy/my_program.so");
    
    // Setup accounts
    let payer = Keypair::new();
    svm.airdrop(&payer.pubkey(), 10_000_000_000).unwrap();
    
    // Build and send transaction
    let tx = Transaction::new_signed_with_payer(
        &[instruction],
        Some(&payer.pubkey()),
        &[&payer],
        svm.latest_blockhash(),
    );
    
    let result = svm.send_transaction(tx);
    assert!(result.is_ok());
}
```

---

## DeFi Integration Patterns

### Jupiter Swap

```typescript
const JUPITER_API = 'https://api.jup.ag/swap/v1';

// Get quote
const quote = await fetch(
  `${JUPITER_API}/quote?` +
  `inputMint=${SOL_MINT}&` +
  `outputMint=${USDC_MINT}&` +
  `amount=${lamports}&` +
  `slippageBps=50`
).then(r => r.json());

// Get swap transaction
const { swapTransaction } = await fetch(`${JUPITER_API}/swap`, {
  method: 'POST',
  body: JSON.stringify({
    quoteResponse: quote,
    userPublicKey: wallet.publicKey.toString(),
    dynamicComputeUnitLimit: true,
    prioritizationFeeLamports: 'auto',
  }),
}).then(r => r.json());

// Execute
const tx = VersionedTransaction.deserialize(
  Buffer.from(swapTransaction, 'base64')
);
tx.sign([wallet]);
await connection.sendTransaction(tx);
```

### Pump.fun Integration

```typescript
// Check if token is on bonding curve or migrated
const status = await fetch(
  `https://frontend-api.pump.fun/coins/${mint}`
).then(r => r.json());

if (!status.raydium_pool) {
  // Still on bonding curve - use Pump.fun
  await buyOnPumpFun(mint, solAmount);
} else {
  // Migrated - use Jupiter
  await jupiterSwap(SOL_MINT, mint, solAmount);
}
```

---

## Infrastructure Setup

### Helius SDK

```typescript
import { createHelius } from 'helius-sdk';

const helius = createHelius({ apiKey: 'YOUR_KEY' });

// DAS API - Get all assets
const assets = await helius.getAssetsByOwner({
  ownerAddress: wallet,
  page: 1,
  limit: 1000,
});

// Priority fee estimation
const fee = await helius.getPriorityFeeEstimate({
  accountKeys: [PROGRAM_ID],
  options: { recommended: true },
});

// Enhanced transactions
const parsed = await helius.enhanced.getTransactions({
  signatures: [signature],
});
```

### Production RPC Configuration

```typescript
// Rate limiting and retry logic
const connection = {
  rpcUrl: 'https://mainnet.helius-rpc.com/?api-key=KEY',
  
  async sendWithRetry(tx, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const sig = await this.send(tx);
        await this.confirm(sig);
        return sig;
      } catch (e) {
        if (i === maxRetries - 1) throw e;
        await sleep(1000 * (i + 1)); // Exponential backoff
      }
    }
  }
};
```

---

## Key Constants

```typescript
// Lamports
const LAMPORTS_PER_SOL = 1_000_000_000n;

// Compute
const MAX_COMPUTE_UNITS = 1_400_000;
const DEFAULT_COMPUTE_UNITS = 200_000;

// Transaction
const MAX_TRANSACTION_SIZE = 1232; // bytes
const MAX_ACCOUNTS_PER_TX = 64; // with ALTs

// Rent
const RENT_PER_BYTE_YEAR = 3480; // lamports
const RENT_EXEMPT_MINIMUM = 890880; // for 0-byte account

// Token decimals
const SOL_DECIMALS = 9;
const USDC_DECIMALS = 6;
const USDT_DECIMALS = 6;
```

---

## Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `BlockhashNotFound` | Blockhash expired | Fetch new blockhash, retry |
| `InsufficientFunds` | Not enough SOL | Check balance, add funds |
| `AccountNotFound` | Account doesn't exist | Initialize account first |
| `OwnerMismatch` | Wrong program owner | Verify account ownership |
| `ProgramFailed` | CU exceeded / logic error | Increase CU limit, check logs |
| `TransactionTooLarge` | >1232 bytes | Use versioned tx + ALTs |

---

## Environment Variables

```bash
# Required
RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
PRIVATE_KEY=your_base58_private_key

# Optional
HELIUS_API_KEY=your_helius_key
JUPITER_API_KEY=your_jupiter_key
JITO_AUTH_KEY=your_jito_key
```

---

## Additional Resources

- [Solana Docs](https://solana.com/docs)
- [Anchor Docs](https://anchor-lang.com/docs)
- [Helius Docs](https://docs.helius.dev)
- [Jupiter Docs](https://dev.jup.ag)
- [Metaplex Docs](https://developers.metaplex.com)
- [Gill Docs](https://gill.site/docs)
- [LiteSVM Docs](https://litesvm.github.io/litesvm/)
