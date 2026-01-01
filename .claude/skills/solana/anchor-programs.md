# Anchor Framework Reference

Complete guide for Solana smart contract development with Anchor (December 2025).

## Overview

Anchor is the industry-standard framework for Solana programs, providing:
- Rust macros for secure program development
- Automatic account validation
- IDL generation for client SDKs
- TypeScript testing framework
- CLI tools for build/deploy

**Current Version**: 0.32.1

## Installation

```bash
# Install all Solana tooling
curl --proto '=https' --tlsv1.2 -sSfL https://solana-install.solana.workers.dev | bash

# Or install Anchor separately
cargo install --git https://github.com/coral-xyz/anchor anchor-cli

# Verify
anchor --version  # 0.32.1
```

## Project Structure

```
my_program/
├── Anchor.toml           # Project configuration
├── Cargo.toml            # Rust dependencies
├── programs/
│   └── my_program/
│       ├── Cargo.toml
│       └── src/
│           └── lib.rs    # Program code
├── tests/
│   └── my_program.ts     # TypeScript tests
├── migrations/
│   └── deploy.ts         # Deployment scripts
└── target/
    ├── deploy/           # Compiled .so files
    ├── idl/              # Generated IDLs
    └── types/            # TypeScript types
```

## Program Structure

### Basic Program

```rust
use anchor_lang::prelude::*;

// Program ID (update after first build)
declare_id!("11111111111111111111111111111111");

#[program]
pub mod my_program {
    use super::*;

    // Instructions go here
    pub fn initialize(ctx: Context<Initialize>, data: u64) -> Result<()> {
        let account = &mut ctx.accounts.my_account;
        account.data = data;
        account.authority = ctx.accounts.authority.key();
        Ok(())
    }
}

// Account validation structs
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = 8 + MyAccount::INIT_SPACE)]
    pub my_account: Account<'info, MyAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

// Data account definitions
#[account]
#[derive(InitSpace)]
pub struct MyAccount {
    pub data: u64,
    pub authority: Pubkey,
}
```

### Instruction Handlers

```rust
#[program]
pub mod my_program {
    use super::*;

    // Simple instruction
    pub fn set_data(ctx: Context<SetData>, new_data: u64) -> Result<()> {
        ctx.accounts.my_account.data = new_data;
        Ok(())
    }

    // With validation
    pub fn transfer_authority(
        ctx: Context<TransferAuthority>,
        new_authority: Pubkey
    ) -> Result<()> {
        let account = &mut ctx.accounts.my_account;
        
        // Custom validation
        require!(
            ctx.accounts.current_authority.key() == account.authority,
            ErrorCode::Unauthorized
        );
        
        account.authority = new_authority;
        Ok(())
    }

    // Returning data
    pub fn get_data(ctx: Context<GetData>) -> Result<u64> {
        Ok(ctx.accounts.my_account.data)
    }
}
```

---

## Account Types

### Basic Account Types

```rust
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct MyContext<'info> {
    // Owned account with data deserialization
    pub my_account: Account<'info, MyData>,
    
    // Account owned by a specific program
    pub token_account: Account<'info, TokenAccount>,
    
    // Require signer
    pub authority: Signer<'info>,
    
    // System program
    pub system_program: Program<'info, System>,
    
    // SPL Token program
    pub token_program: Program<'info, Token>,
    
    // Unchecked account (requires /// CHECK comment)
    /// CHECK: Validated in instruction
    pub unchecked: AccountInfo<'info>,
    
    // Optional account
    pub optional_account: Option<Account<'info, MyData>>,
    
    // Boxed for large accounts (heap allocation)
    pub large_account: Box<Account<'info, LargeData>>,
}
```

### Account Constraints

```rust
#[derive(Accounts)]
#[instruction(bump: u8)]  // Access instruction args in constraints
pub struct MyContext<'info> {
    // Initialize new account
    #[account(
        init,
        payer = authority,
        space = 8 + MyData::INIT_SPACE
    )]
    pub new_account: Account<'info, MyData>,

    // Initialize if doesn't exist (use carefully!)
    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + MyData::INIT_SPACE
    )]
    pub maybe_new: Account<'info, MyData>,

    // Mutable account
    #[account(mut)]
    pub mutable_account: Account<'info, MyData>,

    // Verify field matches account
    #[account(has_one = authority)]
    pub owned_account: Account<'info, MyData>,

    // Multiple field checks
    #[account(
        has_one = authority,
        has_one = mint
    )]
    pub multi_check: Account<'info, MyData>,

    // Custom constraint
    #[account(constraint = my_account.data > 0 @ ErrorCode::InvalidData)]
    pub constrained: Account<'info, MyData>,

    // Close account (send lamports to destination)
    #[account(
        mut,
        close = authority
    )]
    pub closeable: Account<'info, MyData>,

    // Realloc account size
    #[account(
        mut,
        realloc = 8 + new_size,
        realloc::payer = authority,
        realloc::zero = true
    )]
    pub resizable: Account<'info, MyData>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
}
```

### PDA Accounts

```rust
#[derive(Accounts)]
pub struct PDAContext<'info> {
    // Initialize PDA
    #[account(
        init,
        payer = authority,
        space = 8 + VaultData::INIT_SPACE,
        seeds = [b"vault", authority.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, VaultData>,

    // Access existing PDA
    #[account(
        mut,
        seeds = [b"vault", authority.key().as_ref()],
        bump = vault.bump  // Use stored bump
    )]
    pub existing_vault: Account<'info, VaultData>,

    // PDA with multiple seeds
    #[account(
        seeds = [
            b"user-stats",
            authority.key().as_ref(),
            &game_id.to_le_bytes()
        ],
        bump
    )]
    pub user_stats: Account<'info, UserStats>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct VaultData {
    pub authority: Pubkey,
    pub balance: u64,
    pub bump: u8,  // Store bump for later use
}
```

---

## Data Types

### Account Data

```rust
#[account]
#[derive(InitSpace)]
pub struct MyAccount {
    // Fixed size types
    pub number: u64,           // 8 bytes
    pub flag: bool,            // 1 byte
    pub pubkey: Pubkey,        // 32 bytes
    pub bump: u8,              // 1 byte

    // Variable size (requires MaxLen)
    #[max_len(32)]
    pub name: String,          // 4 + 32 bytes

    #[max_len(10)]
    pub scores: Vec<u64>,      // 4 + (10 * 8) bytes

    // Optional
    pub maybe_key: Option<Pubkey>,  // 1 + 32 bytes
}

// Manual space calculation
impl MyAccount {
    pub const LEN: usize = 8 +   // discriminator
        8 +                       // number
        1 +                       // flag
        32 +                      // pubkey
        1 +                       // bump
        (4 + 32) +               // name
        (4 + 10 * 8) +           // scores
        (1 + 32);                // maybe_key
}
```

### Enums

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum Status {
    Pending,
    Active,
    Completed,
    Cancelled,
}

#[account]
#[derive(InitSpace)]
pub struct Order {
    pub status: Status,  // 1 byte (enum discriminator)
    pub amount: u64,
}
```

---

## Error Handling

```rust
#[error_code]
pub enum ErrorCode {
    #[msg("The provided authority is not authorized")]
    Unauthorized,
    
    #[msg("The account data is invalid")]
    InvalidData,
    
    #[msg("Arithmetic overflow occurred")]
    Overflow,
    
    #[msg("The operation would result in insufficient funds")]
    InsufficientFunds,
    
    #[msg("The account is not in the expected state")]
    InvalidState,
}

// Usage
pub fn my_instruction(ctx: Context<MyContext>) -> Result<()> {
    require!(
        ctx.accounts.authority.key() == ctx.accounts.data.owner,
        ErrorCode::Unauthorized
    );
    
    // Or with require_keys_eq!
    require_keys_eq!(
        ctx.accounts.authority.key(),
        ctx.accounts.data.owner,
        ErrorCode::Unauthorized
    );
    
    // Or with custom error
    if some_condition {
        return err!(ErrorCode::InvalidData);
    }
    
    Ok(())
}
```

---

## Cross-Program Invocation (CPI)

### Token Transfers

```rust
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct TransferTokens<'info> {
    #[account(mut)]
    pub from: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub to: Account<'info, TokenAccount>,
    
    pub authority: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

pub fn transfer_tokens(ctx: Context<TransferTokens>, amount: u64) -> Result<()> {
    let cpi_accounts = Transfer {
        from: ctx.accounts.from.to_account_info(),
        to: ctx.accounts.to.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts
    );
    
    token::transfer(cpi_ctx, amount)?;
    Ok(())
}
```

### CPI with PDA Signer

```rust
pub fn transfer_from_vault(ctx: Context<TransferFromVault>, amount: u64) -> Result<()> {
    let authority_key = ctx.accounts.authority.key();
    
    // PDA seeds for signing
    let seeds = &[
        b"vault",
        authority_key.as_ref(),
        &[ctx.accounts.vault.bump],
    ];
    let signer_seeds = &[&seeds[..]];
    
    let cpi_accounts = Transfer {
        from: ctx.accounts.vault_token.to_account_info(),
        to: ctx.accounts.destination.to_account_info(),
        authority: ctx.accounts.vault.to_account_info(),
    };
    
    // Use CpiContext::new_with_signer for PDA signing
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );
    
    token::transfer(cpi_ctx, amount)?;
    Ok(())
}
```

### Invoking Other Programs

```rust
use anchor_lang::solana_program::program::invoke_signed;

pub fn call_external_program(ctx: Context<CallExternal>) -> Result<()> {
    let ix = external_program::instruction::do_something(
        ctx.accounts.external_account.key(),
    );
    
    let account_infos = &[
        ctx.accounts.external_account.to_account_info(),
        ctx.accounts.signer.to_account_info(),
    ];
    
    invoke_signed(&ix, account_infos, &[])?;
    Ok(())
}
```

---

## Events

```rust
#[event]
pub struct TransferEvent {
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

pub fn transfer(ctx: Context<Transfer>, amount: u64) -> Result<()> {
    // ... transfer logic ...
    
    emit!(TransferEvent {
        from: ctx.accounts.from.key(),
        to: ctx.accounts.to.key(),
        amount,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}
```

---

## CLI Commands

```bash
# Project management
anchor init <name>           # Create new project
anchor new <program-name>    # Add program to workspace
anchor keys list             # Show program keypairs
anchor keys sync             # Sync program IDs

# Building
anchor build                 # Build all programs
anchor build -p <program>    # Build specific program

# Testing
anchor test                  # Build, deploy, test
anchor test --skip-build     # Test without rebuilding
anchor test --skip-deploy    # Test with existing deployment

# Deployment
anchor deploy                # Deploy to configured cluster
anchor deploy --provider.cluster mainnet
anchor upgrade <program-id> --program-filepath <path>

# IDL
anchor idl init <program-id>     # Initialize IDL account
anchor idl upgrade <program-id>  # Update IDL on-chain
anchor idl fetch <program-id>    # Fetch IDL from chain

# Verification
anchor verify <program-id>       # Verify deployed matches source
```

---

## TypeScript Client

```typescript
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { MyProgram } from '../target/types/my_program';

// Setup
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const program = anchor.workspace.MyProgram as Program<MyProgram>;

// Call instruction
const tx = await program.methods
  .initialize(new anchor.BN(42))
  .accounts({
    myAccount: myAccountKeypair.publicKey,
    authority: provider.wallet.publicKey,
    systemProgram: anchor.web3.SystemProgram.programId,
  })
  .signers([myAccountKeypair])
  .rpc();

// Fetch account
const account = await program.account.myAccount.fetch(myAccountKeypair.publicKey);
console.log('Data:', account.data.toNumber());

// Fetch all accounts of type
const allAccounts = await program.account.myAccount.all();

// With filter
const filtered = await program.account.myAccount.all([
  {
    memcmp: {
      offset: 8, // After discriminator
      bytes: authority.publicKey.toBase58(),
    },
  },
]);
```

---

## Testing Patterns

```typescript
import * as anchor from '@coral-xyz/anchor';
import { expect } from 'chai';

describe('my_program', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.MyProgram;

  it('initializes account', async () => {
    const myAccount = anchor.web3.Keypair.generate();
    
    await program.methods
      .initialize(new anchor.BN(100))
      .accounts({
        myAccount: myAccount.publicKey,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([myAccount])
      .rpc();

    const account = await program.account.myAccount.fetch(myAccount.publicKey);
    expect(account.data.toNumber()).to.equal(100);
  });

  it('fails with wrong authority', async () => {
    const wrongAuthority = anchor.web3.Keypair.generate();
    
    try {
      await program.methods
        .update(new anchor.BN(200))
        .accounts({
          myAccount: existingAccount.publicKey,
          authority: wrongAuthority.publicKey,
        })
        .signers([wrongAuthority])
        .rpc();
      
      expect.fail('Expected error');
    } catch (err) {
      expect(err.error.errorCode.code).to.equal('Unauthorized');
    }
  });
});
```

---

## Best Practices

### Security
- Always use `has_one` for ownership checks
- Store and verify bump seeds
- Use `close` properly to prevent account resurrection
- Validate all inputs with constraints
- Use checked math operations

### Performance
- Minimize account size (pay less rent)
- Use `Box<Account>` for large accounts
- Batch operations when possible
- Use PDAs instead of keypair accounts

### Code Organization
- Separate instructions into modules
- Use shared error codes
- Document public interfaces
- Keep accounts as small as possible
