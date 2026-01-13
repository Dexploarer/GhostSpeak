---
globs: ["programs/**"]
description: Rules and patterns for Rust/Anchor smart contract development
---

# Smart Contract Development Rules (programs/)

## Architecture Context

**Program**: ghostspeak-marketplace
**Framework**: Anchor 0.32.1
**Language**: Rust 1.83+
**Devnet Program ID**: `4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB`
**Solana CLI**: 2.3.13
**Testing**: Mollusk (SVM), LiteSVM, Anchor test suite

## Program Structure

```
programs/
├── src/
│   ├── lib.rs                  # Program entry point
│   ├── instructions/           # All program instructions
│   │   ├── mod.rs
│   │   ├── agent.rs           # Agent lifecycle
│   │   ├── reputation.rs      # Reputation scoring
│   │   ├── credential.rs      # Verifiable credentials
│   │   ├── staking.rs         # GHOST token staking
│   │   └── escrow.rs          # Payment escrow
│   ├── state/                  # Account structures
│   │   ├── mod.rs
│   │   ├── agent.rs
│   │   ├── reputation.rs
│   │   └── escrow.rs
│   ├── security/               # Security utilities
│   │   ├── rate_limit.rs
│   │   ├── validation.rs
│   │   └── circuit_breaker.rs
│   └── errors.rs               # Custom error codes
├── tests/
│   ├── unit/                   # Unit tests (Mollusk)
│   ├── integration/            # Integration tests
│   └── property/               # Property-based tests
└── Anchor.toml                 # Anchor configuration
```

## Critical Security Patterns

### 1. Account Validation (ALWAYS Required)

```rust
// ✅ CORRECT: Full validation
#[derive(Accounts)]
pub struct UpdateAgent<'info> {
    #[account(
        mut,
        seeds = [b"agent", authority.key().as_ref()],
        bump = agent.bump,
        has_one = authority,           // Verify authority matches
        constraint = !agent.deactivated @ ErrorCode::AgentDeactivated,
    )]
    pub agent: Account<'info, Agent>,

    pub authority: Signer<'info>,      // Require signature
}

// ❌ WRONG: Minimal validation (exploitable!)
#[derive(Accounts)]
pub struct UpdateAgent<'info> {
    #[account(mut)]                    // Missing: seeds, bump, has_one
    pub agent: AccountInfo<'info>,     // Should be Account<'info, Agent>
    pub authority: AccountInfo<'info>, // Should be Signer<'info>
}
```

### 2. Checked Arithmetic (NEVER Use Unchecked)

```rust
// ✅ CORRECT: Checked operations
pub fn calculate_score(
    transaction_count: u64,
    total_volume: u64,
) -> Result<u64> {
    let base = transaction_count
        .checked_mul(10)
        .ok_or(ErrorCode::Overflow)?;

    let volume_factor = total_volume
        .checked_div(1_000_000)
        .ok_or(ErrorCode::DivisionByZero)?;

    let score = base
        .checked_add(volume_factor)
        .ok_or(ErrorCode::Overflow)?
        .min(1000); // Cap at 1000

    Ok(score)
}

// ❌ WRONG: Unchecked arithmetic (overflow exploits!)
pub fn calculate_score(
    transaction_count: u64,
    total_volume: u64,
) -> Result<u64> {
    let score = transaction_count * 10 + total_volume / 1_000_000; // Can overflow!
    Ok(score.min(1000))
}
```

### 3. Reentrancy Protection

```rust
// ✅ CORRECT: State updated before CPI
pub fn withdraw_escrow(ctx: Context<WithdrawEscrow>) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;

    // 1. Validate state
    require!(!escrow.released, ErrorCode::AlreadyReleased);

    // 2. Update state BEFORE transfer
    let amount = escrow.amount;
    escrow.amount = 0;
    escrow.released = true;

    // 3. Execute transfer (external call)
    transfer_tokens(ctx, amount)?;

    Ok(())
}

// ❌ WRONG: State updated after CPI (reentrancy exploit!)
pub fn withdraw_escrow(ctx: Context<WithdrawEscrow>) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;

    // Transfer before state update (vulnerable!)
    transfer_tokens(ctx, escrow.amount)?;

    // Attacker can re-enter and withdraw again!
    escrow.amount = 0;
    escrow.released = true;

    Ok(())
}
```

### 4. Owner and Signer Checks

```rust
// ✅ CORRECT: Verify all required checks
#[derive(Accounts)]
pub struct TransferCredential<'info> {
    #[account(
        mut,
        has_one = owner,                    // Verify owner field
        constraint = credential.owner == owner.key() @ ErrorCode::Unauthorized,
    )]
    pub credential: Account<'info, Credential>,

    pub owner: Signer<'info>,               // Require signature

    #[account(
        address = token::ID                  // Verify program ID
    )]
    pub token_program: Program<'info, Token>,
}

// ❌ WRONG: Missing checks (anyone can transfer!)
#[derive(Accounts)]
pub struct TransferCredential<'info> {
    #[account(mut)]
    pub credential: Account<'info, Credential>,  // No ownership check!
    pub owner: AccountInfo<'info>,               // No signature required!
    pub token_program: AccountInfo<'info>,       // No program verification!
}
```

### 5. PDA Derivation and Bump Seeds

```rust
// ✅ CORRECT: Store and verify bump
#[account]
#[derive(InitSpace)]
pub struct Agent {
    pub authority: Pubkey,
    pub name: String,
    pub bump: u8,              // Always store bump
    // ... other fields
}

#[derive(Accounts)]
pub struct InitializeAgent<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Agent::INIT_SPACE,
        seeds = [b"agent", authority.key().as_ref()],
        bump,                   // Anchor derives and stores
    )]
    pub agent: Account<'info, Agent>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_agent(ctx: Context<InitializeAgent>, name: String) -> Result<()> {
    let agent = &mut ctx.accounts.agent;
    agent.authority = ctx.accounts.authority.key();
    agent.name = name;
    agent.bump = ctx.bumps.agent;  // Store bump for later
    Ok(())
}

// Later use
#[derive(Accounts)]
pub struct UpdateAgent<'info> {
    #[account(
        mut,
        seeds = [b"agent", authority.key().as_ref()],
        bump = agent.bump,      // Use stored bump
    )]
    pub agent: Account<'info, Agent>,
}
```

## Account Constraints Reference

```rust
// Initialization
#[account(init, payer = x, space = N)]     // Initialize new account
#[account(init_if_needed, ...)]            // Init if doesn't exist (DANGEROUS - use sparingly)

// Mutability
#[account(mut)]                             // Mark as mutable

// PDA Validation
#[account(seeds = [...], bump)]             // PDA with auto-derived bump
#[account(seeds = [...], bump = x.bump)]    // PDA with stored bump

// Ownership Verification
#[account(has_one = authority)]             // Verify field matches
#[account(owner = expected_program)]        // Verify program owner

// Custom Constraints
#[account(constraint = x > 0)]              // Custom validation
#[account(constraint = x > 0 @ ErrorCode::InvalidValue)]  // With error

// Account Lifecycle
#[account(close = authority)]               // Close account, refund rent
#[account(realloc = N, payer = x)]          // Resize account

// Program Verification
#[account(address = expected_program_id)]   // Verify exact address
```

## Token Operations (Token-2022)

```rust
use anchor_spl::token_interface::{self, TokenAccount, TokenInterface, Mint};

#[derive(Accounts)]
pub struct StakeTokens<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        associated_token::mint = ghost_mint,
        associated_token::authority = user,
        associated_token::token_program = token_program,
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = ghost_mint,
        associated_token::authority = stake_vault,
        associated_token::token_program = token_program,
    )]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: PDA signer
    #[account(
        seeds = [b"stake-vault"],
        bump,
    )]
    pub stake_vault: AccountInfo<'info>,

    pub ghost_mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn stake(ctx: Context<StakeTokens>, amount: u64) -> Result<()> {
    // Validate amount
    require!(amount > 0, ErrorCode::InvalidAmount);

    // Transfer tokens to vault
    let cpi_accounts = token_interface::TransferChecked {
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.vault_token_account.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
        mint: ctx.accounts.ghost_mint.to_account_info(),
    };

    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

    token_interface::transfer_checked(
        cpi_ctx,
        amount,
        ctx.accounts.ghost_mint.decimals,
    )?;

    Ok(())
}
```

## Error Handling

```rust
// errors.rs
use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Agent is already deactivated")]
    AgentDeactivated,

    #[msg("Insufficient GHOST balance for operation")]
    InsufficientBalance,

    #[msg("Transaction amount must be greater than zero")]
    InvalidAmount,

    #[msg("Arithmetic overflow occurred")]
    Overflow,

    #[msg("Division by zero attempted")]
    DivisionByZero,

    #[msg("Unauthorized: caller is not the agent owner")]
    Unauthorized,

    #[msg("Escrow has already been released")]
    AlreadyReleased,

    #[msg("Rate limit exceeded. Try again later.")]
    RateLimitExceeded,
}

// Usage
require!(amount > 0, ErrorCode::InvalidAmount);
require!(!agent.deactivated, ErrorCode::AgentDeactivated);
```

## Testing with Mollusk (Fast SVM Tests)

```rust
use mollusk::Mollusk;
use solana_sdk::{account::AccountSharedData, instruction::Instruction};

#[test]
fn test_initialize_agent() {
    // Create Mollusk instance
    let program_id = Pubkey::new_unique();
    let mut mollusk = Mollusk::new(&program_id, "target/deploy/ghostspeak_marketplace");

    // Setup accounts
    let authority = Pubkey::new_unique();
    let agent_pda = Pubkey::find_program_address(
        &[b"agent", authority.as_ref()],
        &program_id,
    ).0;

    // Build instruction
    let instruction = Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(agent_pda, false),
            AccountMeta::new(authority, true),
            AccountMeta::new_readonly(system_program::ID, false),
        ],
        data: instruction_data,
    };

    // Execute
    let result = mollusk.process_instruction(&instruction, &accounts);
    assert!(result.is_ok());

    // Verify state
    let agent_account = mollusk.get_account(&agent_pda).unwrap();
    let agent: Agent = Account::try_deserialize(&mut agent_account.data.as_slice()).unwrap();
    assert_eq!(agent.authority, authority);
}
```

## Build & Deployment Workflow

### Local Development

```bash
# Build program
anchor build

# Run tests
anchor test                    # Full test suite
cargo test-sbf                 # Solana BPF tests
cargo test --package mollusk   # Unit tests only

# Generate IDL
anchor build  # IDL auto-generated to target/idl/
```

### Generate TypeScript Clients

```bash
# Generate SDK bindings
cd packages/sdk-typescript
bun run generate  # Uses Codama with Anchor IDL
```

### Deploy to Devnet

```bash
# Configure Solana CLI
solana config set --url devnet
solana config set --keypair ~/.config/solana/id.json

# Airdrop SOL (if needed)
solana airdrop 2

# Build and deploy
anchor build
anchor deploy

# Upgrade program
anchor upgrade target/deploy/ghostspeak_marketplace.so --program-id 4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB
```

### Verify Deployment

```bash
# Check program
solana program show 4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB

# View logs
solana logs 4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB
```

## Common Pitfalls

### ❌ Don't: Use init_if_needed Without Validation

```rust
// DANGEROUS: Can be exploited for reinitialization attacks
#[account(init_if_needed, payer = user, space = 100)]
pub my_account: Account<'info, MyAccount>,
```

### ✅ Do: Use init with Explicit Checks

```rust
// SAFE: Explicit initialization
#[account(init, payer = user, space = 100)]
pub my_account: Account<'info, MyAccount>,
```

### ❌ Don't: Trust Client-Provided Data

```rust
// BAD: Using unchecked input
pub fn update_score(ctx: Context<Update>, new_score: u64) -> Result<()> {
    ctx.accounts.agent.score = new_score;  // Client can set any value!
    Ok(())
}
```

### ✅ Do: Validate and Calculate On-Chain

```rust
// GOOD: Calculate score on-chain
pub fn update_score(ctx: Context<Update>) -> Result<()> {
    let score = calculate_score(
        ctx.accounts.agent.transaction_count,
        ctx.accounts.agent.total_volume,
    )?;
    ctx.accounts.agent.score = score;
    Ok(())
}
```

### ❌ Don't: Ignore Account Size Limits

```rust
// BAD: String can exceed allocated space
#[account]
pub struct Agent {
    pub name: String,  // Unbounded size!
}
```

### ✅ Do: Use Bounded Types

```rust
// GOOD: Fixed size with validation
#[account]
#[derive(InitSpace)]
pub struct Agent {
    #[max_len(32)]
    pub name: String,  // Max 32 bytes
}

// Validate in instruction
require!(name.len() <= 32, ErrorCode::NameTooLong);
```

## Performance Optimization

1. **Pack account data efficiently** - Use smallest types possible
2. **Minimize compute units** - Avoid unnecessary operations
3. **Use PDAs for deterministic addresses** - No need to store addresses
4. **Close unused accounts** - Reclaim rent
5. **Batch operations** - Combine multiple operations in single transaction

## Security Audit Checklist

- [ ] All accounts have owner checks
- [ ] All operations use checked arithmetic
- [ ] Signer verification on all state-changing operations
- [ ] PDA bumps stored and verified
- [ ] No `init_if_needed` without validation
- [ ] Program IDs verified for CPI
- [ ] Input validation on all user-provided data
- [ ] Reentrancy protection (state before CPI)
- [ ] Rate limiting on sensitive operations
- [ ] Account close refunds to expected authority

## Additional Resources

- Anchor Docs: https://anchor-lang.com/docs
- Solana Cookbook: https://solanacookbook.com
- Neodyme Security Blog: https://neodyme.io/blog
- Sec3 Audit Reports: https://github.com/sec3-service
- Mollusk Docs: https://github.com/buffalojoec/mollusk
