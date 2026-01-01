# Testing & Security Reference

Complete guide for testing Solana programs and security best practices (December 2025).

## Testing Frameworks

### Framework Comparison

| Framework | Language | Speed | Best For |
|-----------|----------|-------|----------|
| LiteSVM | Rust/TS/Python | Fastest | Unit & integration tests |
| solana-program-test | Rust | Fast | Low-level program tests |
| solana-test-validator | Any | Slow | Full RPC compatibility |
| Anchor Test | TypeScript | Medium | Anchor program tests |

**Recommendation**: Use LiteSVM for most testing, solana-test-validator for RPC-specific features.

---

## LiteSVM

Fast, lightweight Solana VM for testing.

### TypeScript Setup

```bash
npm install litesvm @solana/web3.js
```

```typescript
import { LiteSVM } from 'litesvm';
import { 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  Keypair,
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';

describe('My Program', () => {
  let svm: LiteSVM;
  let payer: Keypair;

  beforeEach(() => {
    svm = new LiteSVM();
    payer = new Keypair();
    svm.airdrop(payer.publicKey, BigInt(10 * LAMPORTS_PER_SOL));
  });

  it('transfers SOL', () => {
    const receiver = PublicKey.unique();
    const amount = BigInt(LAMPORTS_PER_SOL);

    const tx = new Transaction();
    tx.add(SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: receiver,
      lamports: amount,
    }));
    tx.recentBlockhash = svm.latestBlockhash();
    tx.sign(payer);

    svm.sendTransaction(tx);

    expect(svm.getBalance(receiver)).toBe(amount);
  });
});
```

### Rust Setup

```toml
# Cargo.toml
[dev-dependencies]
litesvm = "0.3"
solana-sdk = "2.0"
```

```rust
use litesvm::LiteSVM;
use solana_keypair::Keypair;
use solana_message::Message;
use solana_signer::Signer;
use solana_system_interface::instruction::transfer;
use solana_transaction::Transaction;

#[test]
fn test_transfer() {
    let mut svm = LiteSVM::new();
    
    let from = Keypair::new();
    let to = Pubkey::new_unique();
    
    svm.airdrop(&from.pubkey(), 10_000_000_000).unwrap();
    
    let ix = transfer(&from.pubkey(), &to, 1_000_000_000);
    let tx = Transaction::new(
        &[&from],
        Message::new(&[ix], Some(&from.pubkey())),
        svm.latest_blockhash(),
    );
    
    let result = svm.send_transaction(tx);
    assert!(result.is_ok());
    
    let balance = svm.get_account(&to).unwrap().lamports;
    assert_eq!(balance, 1_000_000_000);
}
```

### Loading Programs

```rust
// Load compiled program
let mut svm = LiteSVM::new();
svm.add_program(
    program_id,
    include_bytes!("../../target/deploy/my_program.so")
);

// Or from file
svm.add_program_from_file(program_id, "target/deploy/my_program.so");
```

### Time Manipulation

```rust
// Warp to specific slot
svm.warp_to_slot(100);

// Set block time
svm.set_sysvar(&Clock {
    slot: 100,
    unix_timestamp: 1700000000,
    ..Default::default()
});
```

### Arbitrary Account Data

```rust
// Write any account data (useful for mocking tokens, etc.)
let token_account_data = /* serialized TokenAccount */;
svm.set_account(
    token_account_address,
    Account {
        lamports: 1_000_000,
        data: token_account_data,
        owner: spl_token::ID,
        executable: false,
        rent_epoch: 0,
    },
);
```

---

## Anchor Testing

### Basic Test Structure

```typescript
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { MyProgram } from '../target/types/my_program';
import { expect } from 'chai';

describe('my_program', () => {
  // Configure provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.MyProgram as Program<MyProgram>;
  
  it('initializes correctly', async () => {
    const account = anchor.web3.Keypair.generate();
    
    await program.methods
      .initialize(new anchor.BN(42))
      .accounts({
        myAccount: account.publicKey,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([account])
      .rpc();
    
    const data = await program.account.myAccount.fetch(account.publicKey);
    expect(data.value.toNumber()).to.equal(42);
  });

  it('fails on unauthorized access', async () => {
    const unauthorized = anchor.web3.Keypair.generate();
    
    try {
      await program.methods
        .update(new anchor.BN(100))
        .accounts({
          myAccount: existingAccount,
          authority: unauthorized.publicKey,
        })
        .signers([unauthorized])
        .rpc();
      
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err.error.errorCode.code).to.equal('ConstraintHasOne');
    }
  });
});
```

### Testing PDAs

```typescript
it('derives PDA correctly', async () => {
  const [pda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), authority.publicKey.toBuffer()],
    program.programId
  );
  
  await program.methods
    .initializeVault()
    .accounts({
      vault: pda,
      authority: authority.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();
  
  const vault = await program.account.vault.fetch(pda);
  expect(vault.bump).to.equal(bump);
});
```

### Testing Events

```typescript
it('emits event on transfer', async () => {
  const listener = program.addEventListener('TransferEvent', (event) => {
    expect(event.amount.toNumber()).to.equal(1000);
  });
  
  await program.methods
    .transfer(new anchor.BN(1000))
    .accounts({/* ... */})
    .rpc();
  
  // Clean up
  await program.removeEventListener(listener);
});
```

---

## Security Vulnerabilities

### 1. Missing Owner Check

**Vulnerability**: Attacker substitutes their own account.

```rust
// VULNERABLE
#[derive(Accounts)]
pub struct Withdraw<'info> {
    pub vault: AccountInfo<'info>,  // No owner check!
    pub authority: Signer<'info>,
}

// SECURE
#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        has_one = authority,
        owner = crate::ID  // Explicit owner check
    )]
    pub vault: Account<'info, Vault>,
    pub authority: Signer<'info>,
}
```

### 2. Missing Signer Check

**Vulnerability**: Unauthorized actions without signature.

```rust
// VULNERABLE
#[derive(Accounts)]
pub struct Transfer<'info> {
    pub authority: AccountInfo<'info>,  // Not a Signer!
}

// SECURE
#[derive(Accounts)]
pub struct Transfer<'info> {
    pub authority: Signer<'info>,  // Must sign
}
```

### 3. Arithmetic Overflow

**Vulnerability**: Integer wrap-around leads to unexpected values.

```rust
// VULNERABLE
let new_balance = balance + deposit;  // Can overflow!

// SECURE
let new_balance = balance
    .checked_add(deposit)
    .ok_or(ErrorCode::Overflow)?;

// Or use Anchor's safe math
use anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL;
let amount = amount.checked_mul(LAMPORTS_PER_SOL).unwrap();
```

### 4. Reinitialization Attack

**Vulnerability**: Resetting account state to bypass checks.

```rust
// VULNERABLE
#[account(init_if_needed, ...)]  // Can be called multiple times!
pub my_account: Account<'info, MyData>,

// SECURE - Option 1: Use init (fails if exists)
#[account(init, ...)]
pub my_account: Account<'info, MyData>,

// SECURE - Option 2: Check initialized flag
#[account(
    init_if_needed,
    constraint = !my_account.is_initialized @ ErrorCode::AlreadyInitialized
)]
pub my_account: Account<'info, MyData>,
```

### 5. Arbitrary CPI

**Vulnerability**: Calling untrusted programs.

```rust
// VULNERABLE
pub fn execute(ctx: Context<Execute>) -> Result<()> {
    let program = ctx.accounts.external_program.to_account_info();
    // Calls any program passed in!
    invoke(&ix, &[program])?;
    Ok(())
}

// SECURE
#[derive(Accounts)]
pub struct Execute<'info> {
    #[account(address = known_program::ID)]  // Verify program ID
    pub external_program: Program<'info, KnownProgram>,
}
```

### 6. PDA Substitution

**Vulnerability**: Attacker provides different PDA seeds.

```rust
// VULNERABLE
pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
    // No seed verification!
    let vault = &ctx.accounts.vault;
    // ...
}

// SECURE
#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        seeds = [b"vault", authority.key().as_ref()],
        bump = vault.bump  // Verify correct PDA
    )]
    pub vault: Account<'info, Vault>,
}
```

### 7. Account Close Vulnerability

**Vulnerability**: Account data persists after close.

```rust
// VULNERABLE - Data still accessible in same transaction
#[account(mut, close = authority)]
pub closeable: Account<'info, Data>,

// SECURE - Zero data before close
pub fn close_account(ctx: Context<CloseAccount>) -> Result<()> {
    let account = &mut ctx.accounts.closeable;
    
    // Zero sensitive data
    account.sensitive_data = 0;
    account.owner = Pubkey::default();
    
    // Then close via constraint
    Ok(())
}
```

### 8. Type Confusion

**Vulnerability**: Wrong account type deserialized.

```rust
// VULNERABLE
/// CHECK: Manually validated
pub token_account: AccountInfo<'info>,

// SECURE
pub token_account: Account<'info, TokenAccount>,  // Type-safe
```

### 9. Bump Seed Canonicalization

**Vulnerability**: Using non-canonical bump allows account collision.

```rust
// VULNERABLE - Accepts any bump
pub fn init(ctx: Context<Init>, bump: u8) -> Result<()> {
    // Attacker can find alternative bumps
}

// SECURE - Use canonical bump from find_program_address
#[account(
    seeds = [b"config"],
    bump  // Uses canonical bump
)]
pub config: Account<'info, Config>,
```

### 10. Cross-Instance State Confusion

**Vulnerability**: Shared state between different users/instances.

```rust
// VULNERABLE - Single global config
#[account(seeds = [b"config"], bump)]
pub config: Account<'info, Config>,

// SECURE - Per-user state
#[account(
    seeds = [b"user-config", user.key().as_ref()],
    bump
)]
pub user_config: Account<'info, UserConfig>,
```

---

## Security Checklist

### Pre-Deployment

- [ ] All accounts have owner checks
- [ ] All mutations require signer
- [ ] All arithmetic uses checked operations
- [ ] PDAs use canonical bumps
- [ ] No reinitialization vulnerabilities
- [ ] CPI targets are verified
- [ ] Account closes zero data first
- [ ] All constraints have error codes
- [ ] Access control is comprehensive
- [ ] Events log important state changes

### Testing Requirements

- [ ] Unit tests for all instructions
- [ ] Integration tests for user flows
- [ ] Negative tests (should fail)
- [ ] Fuzz testing for edge cases
- [ ] Overflow/underflow tests
- [ ] Authority tests (wrong signer)
- [ ] Account substitution tests

### Audit Preparation

- [ ] Code documentation complete
- [ ] Architecture diagram
- [ ] Threat model documented
- [ ] Test coverage report
- [ ] Known limitations documented

---

## Security Tools

### Soteria (Static Analysis)

```bash
# Install
cargo install soteria

# Analyze
cd programs/my_program
soteria -analyzeAll .

# Output: vulnerability report
```

### Anchor Verify

```bash
# Verify deployed matches source
anchor verify <PROGRAM_ID>

# Uses solana-verify under the hood
```

### Cargo Audit

```bash
# Check for vulnerable dependencies
cargo audit

# Fix vulnerabilities
cargo update
```

---

## Fuzz Testing

### Trident (Anchor Fuzzer)

```bash
# Install
cargo install trident-cli

# Initialize
trident init

# Run fuzzer
trident fuzz run
```

```rust
// fuzz_instructions.rs
use trident_client::fuzzing::*;

#[derive(Arbitrary)]
pub struct FuzzInstruction {
    pub amount: u64,
    pub authority_index: u8,
}

impl FuzzInstruction {
    fn to_instruction(&self) -> Instruction {
        // Convert fuzz data to instruction
    }
}
```

### Property-Based Testing

```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn test_deposit_withdraw_invariant(
        deposit_amount in 1u64..1_000_000_000,
        withdraw_amount in 1u64..1_000_000_000,
    ) {
        let mut svm = LiteSVM::new();
        // Setup...
        
        // Invariant: balance should never go negative
        let final_balance = svm.get_account(&vault).unwrap().lamports;
        assert!(final_balance >= 0);
    }
}
```

---

## CI/CD Security Pipeline

```yaml
# .github/workflows/security.yml
name: Security Audit

on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          
      - name: Install Solana
        run: |
          sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
          
      - name: Build
        run: anchor build
        
      - name: Run Tests
        run: anchor test
        
      - name: Security Scan
        run: |
          cargo install soteria
          soteria -analyzeAll programs/
          
      - name: Dependency Audit
        run: cargo audit
```

---

## Best Practices Summary

1. **Use Anchor** - Built-in security checks
2. **Type everything** - No AccountInfo without CHECK
3. **Verify ownership** - Always check account owners
4. **Require signatures** - Use Signer type
5. **Safe math** - Always checked operations
6. **Canonical PDAs** - Use bump from constraints
7. **Close carefully** - Zero data before close
8. **Test thoroughly** - Include negative tests
9. **Get audited** - Professional review before mainnet
10. **Monitor post-launch** - Watch for anomalies
