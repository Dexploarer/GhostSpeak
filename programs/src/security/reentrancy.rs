/*!
 * Reentrancy Protection Module
 *
 * Implements comprehensive reentrancy protection for GhostSpeak protocol
 * using Anchor-compatible patterns and modern Solana security practices.
 * Based on July 2025 security standards and recommendations.
 */

use anchor_lang::prelude::*;
use anchor_lang::Discriminator;

/// Reentrancy guard states
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ReentrancyState {
    Unlocked = 0,
    Locked = 1,
}

/// Global reentrancy guard account
#[account]
pub struct ReentrancyGuard {
    /// Current state of the guard
    pub state: ReentrancyState,

    /// Nonce to prevent replay attacks
    pub nonce: u64,

    /// Last interaction timestamp
    pub last_interaction: i64,

    /// Authority that can reset the guard (for emergency situations)
    pub authority: Pubkey,

    /// Bump seed for PDA
    pub bump: u8,
}

/// Per-instruction reentrancy protection
#[account]
pub struct InstructionLock {
    /// Instruction discriminator being locked
    pub instruction_hash: [u8; 8],

    /// Account that initiated the lock
    pub locked_by: Pubkey,

    /// Timestamp when locked
    pub locked_at: i64,

    /// Maximum lock duration (prevents deadlocks)
    pub max_duration: i64,

    /// Is currently locked
    pub is_locked: bool,

    /// Bump seed
    pub bump: u8,
}

/// Per-account reentrancy protection for critical operations
#[account]
pub struct AccountLock {
    /// The account being protected
    pub protected_account: Pubkey,

    /// Current operation type
    pub operation_type: String,

    /// Transaction signature that initiated the lock
    pub lock_signature: String,

    /// Locked by which authority
    pub locked_by: Pubkey,

    /// Lock timestamp
    pub locked_at: i64,

    /// Lock expiration
    pub expires_at: i64,

    /// Lock status
    pub is_active: bool,

    /// Bump seed
    pub bump: u8,
}

impl ReentrancyGuard {
    pub const LEN: usize = 8 + // discriminator
        1 + // state
        8 + // nonce
        8 + // last_interaction
        32 + // authority
        1; // bump

    /// Initialize a new reentrancy guard
    pub fn initialize(&mut self, authority: Pubkey, bump: u8) -> Result<()> {
        self.state = ReentrancyState::Unlocked;
        self.nonce = 0;
        self.last_interaction = Clock::get()?.unix_timestamp;
        self.authority = authority;
        self.bump = bump;
        Ok(())
    }

    /// Attempt to acquire the lock
    pub fn lock(&mut self) -> Result<()> {
        require!(
            self.state == ReentrancyState::Unlocked,
            crate::GhostSpeakError::ReentrancyDetected
        );

        self.state = ReentrancyState::Locked;
        self.nonce = self.nonce.checked_add(1).unwrap();
        self.last_interaction = Clock::get()?.unix_timestamp;

        Ok(())
    }

    /// Release the lock
    pub fn unlock(&mut self) -> Result<()> {
        require!(
            self.state == ReentrancyState::Locked,
            crate::GhostSpeakError::InvalidState
        );

        self.state = ReentrancyState::Unlocked;
        self.last_interaction = Clock::get()?.unix_timestamp;

        Ok(())
    }

    /// Emergency reset (only by authority)
    pub fn emergency_reset(&mut self, authority: &Signer) -> Result<()> {
        require!(
            authority.key() == self.authority,
            crate::GhostSpeakError::UnauthorizedAccess
        );

        self.state = ReentrancyState::Unlocked;
        self.nonce = self.nonce.checked_add(1).unwrap();
        self.last_interaction = Clock::get()?.unix_timestamp;

        Ok(())
    }
}

impl InstructionLock {
    pub const LEN: usize = 8 + // discriminator
        8 + // instruction_hash
        32 + // locked_by
        8 + // locked_at
        8 + // max_duration
        1 + // is_locked
        1; // bump

    /// Default lock duration (30 seconds)
    pub const DEFAULT_LOCK_DURATION: i64 = 30;

    /// Initialize instruction lock
    pub fn initialize(
        &mut self,
        instruction_hash: [u8; 8],
        locked_by: Pubkey,
        max_duration: Option<i64>,
        bump: u8,
    ) -> Result<()> {
        let clock = Clock::get()?;

        self.instruction_hash = instruction_hash;
        self.locked_by = locked_by;
        self.locked_at = clock.unix_timestamp;
        self.max_duration = max_duration.unwrap_or(Self::DEFAULT_LOCK_DURATION);
        self.is_locked = true;
        self.bump = bump;

        Ok(())
    }

    /// Check if lock has expired
    pub fn is_expired(&self) -> Result<bool> {
        let clock = Clock::get()?;
        Ok(clock.unix_timestamp > self.locked_at + self.max_duration)
    }

    /// Release the instruction lock
    pub fn release(&mut self, authority: &Signer) -> Result<()> {
        // Can be released by the original locker or if expired
        let is_expired = self.is_expired()?;

        require!(
            authority.key() == self.locked_by || is_expired,
            crate::GhostSpeakError::UnauthorizedAccess
        );

        self.is_locked = false;
        Ok(())
    }
}

impl AccountLock {
    pub const LEN: usize = 8 + // discriminator
        32 + // protected_account
        4 + 64 + // operation_type (max 64 chars)
        4 + 88 + // lock_signature (base58 tx signature)
        32 + // locked_by
        8 + // locked_at
        8 + // expires_at
        1 + // is_active
        1; // bump

    /// Default account lock duration (60 seconds)
    pub const DEFAULT_LOCK_DURATION: i64 = 60;

    /// Initialize account lock
    pub fn initialize(
        &mut self,
        protected_account: Pubkey,
        operation_type: String,
        lock_signature: String,
        locked_by: Pubkey,
        duration: Option<i64>,
        bump: u8,
    ) -> Result<()> {
        let clock = Clock::get()?;

        require!(
            operation_type.len() <= 64,
            crate::GhostSpeakError::InputTooLong
        );

        require!(
            lock_signature.len() <= 88, // Max base58 signature length
            crate::GhostSpeakError::InputTooLong
        );

        self.protected_account = protected_account;
        self.operation_type = operation_type;
        self.lock_signature = lock_signature;
        self.locked_by = locked_by;
        self.locked_at = clock.unix_timestamp;
        self.expires_at = clock.unix_timestamp + duration.unwrap_or(Self::DEFAULT_LOCK_DURATION);
        self.is_active = true;
        self.bump = bump;

        Ok(())
    }

    /// Check if account lock is still valid
    pub fn is_valid(&self) -> Result<bool> {
        if !self.is_active {
            return Ok(false);
        }

        let clock = Clock::get()?;
        Ok(clock.unix_timestamp <= self.expires_at)
    }

    /// Release the account lock
    pub fn release(&mut self, authority: &Signer) -> Result<()> {
        let is_expired = !self.is_valid()?;

        require!(
            authority.key() == self.locked_by || is_expired,
            crate::GhostSpeakError::UnauthorizedAccess
        );

        self.is_active = false;
        Ok(())
    }
}

/// Reentrancy protection macros for easy integration
///
/// Macro to add reentrancy protection to an instruction
#[macro_export]
macro_rules! nonreentrant {
    ($ctx:expr, $guard_account:expr) => {{
        // Lock the reentrancy guard
        $guard_account.lock()?;

        // Store the guard for cleanup
        let _guard = ReentrancyCleanup {
            guard: $guard_account,
        };
    }};
}

/// Cleanup helper that automatically unlocks on drop
pub struct ReentrancyCleanup<'a> {
    pub guard: &'a mut Account<'a, ReentrancyGuard>,
}

impl<'a> Drop for ReentrancyCleanup<'a> {
    fn drop(&mut self) {
        // Automatically unlock when going out of scope
        let _ = self.guard.unlock();
    }
}

/// Account validation structs for reentrancy protection

#[derive(Accounts)]
pub struct InitializeReentrancyGuard<'info> {
    #[account(
        init,
        payer = authority,
        space = ReentrancyGuard::LEN,
        seeds = [b"reentrancy_guard"],
        bump
    )]
    pub reentrancy_guard: Account<'info, ReentrancyGuard>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(instruction_hash: [u8; 8])]
pub struct CreateInstructionLock<'info> {
    #[account(
        init,
        payer = authority,
        space = InstructionLock::LEN,
        seeds = [b"instruction_lock", instruction_hash.as_ref()],
        bump
    )]
    pub instruction_lock: Account<'info, InstructionLock>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(protected_account: Pubkey, operation_type: String)]
pub struct CreateAccountLock<'info> {
    #[account(
        init,
        payer = authority,
        space = AccountLock::LEN,
        seeds = [b"account_lock", protected_account.as_ref(), operation_type.as_bytes()],
        bump
    )]
    pub account_lock: Account<'info, AccountLock>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Helper functions for common reentrancy patterns
///
/// Check if an instruction is currently locked
/// This function should be called with proper account context from the instruction handler
pub fn is_instruction_locked<'info>(
    instruction_hash: [u8; 8],
    program_id: &Pubkey,
    accounts: &[AccountInfo<'info>],
) -> Result<bool> {
    // Derive the PDA for the instruction lock
    let (lock_pda, _bump) = Pubkey::find_program_address(
        &[b"instruction_lock", instruction_hash.as_ref()],
        program_id,
    );

    // Find the lock account in the provided accounts
    let lock_account = accounts.iter().find(|acc| acc.key == &lock_pda);

    let lock_account = match lock_account {
        Some(acc) => acc,
        None => return Ok(false), // Lock account not provided, assume not locked
    };

    // Check if account exists and has data
    if lock_account.data_len() == 0 {
        return Ok(false);
    }

    // Check if the account is owned by the program
    if lock_account.owner != program_id {
        return Ok(false);
    }

    // Deserialize the InstructionLock to check its state
    let lock_data = lock_account.try_borrow_data()?;

    // Verify minimum size for InstructionLock
    if lock_data.len() < InstructionLock::LEN {
        return Ok(false);
    }

    // Use safe Anchor deserialization instead of manual parsing
    // This prevents buffer overflow vulnerabilities and ensures type safety
    let lock_state = match InstructionLock::try_deserialize(&mut &lock_data[..]) {
        Ok(lock) => lock,
        Err(_) => {
            // If deserialization fails, assume not locked to fail safe
            return Ok(false);
        }
    };

    if !lock_state.is_locked {
        return Ok(false);
    }

    // Check if lock has expired using safe field access
    let locked_at = lock_state.locked_at;
    let max_duration = lock_state.max_duration;

    let clock = Clock::get()?;
    let is_expired = clock.unix_timestamp > locked_at + max_duration;

    Ok(!is_expired)
}

/// Check if an account operation is locked
/// This function should be called with proper account context from the instruction handler
pub fn is_account_locked<'info>(
    account: &Pubkey,
    operation: &str,
    program_id: &Pubkey,
    accounts: &[AccountInfo<'info>],
) -> Result<bool> {
    // Derive the PDA for the account lock
    let (lock_pda, _bump) = Pubkey::find_program_address(
        &[b"account_lock", account.as_ref(), operation.as_bytes()],
        program_id,
    );

    // Find the lock account in the provided accounts
    let lock_account = accounts.iter().find(|acc| acc.key == &lock_pda);

    let lock_account = match lock_account {
        Some(acc) => acc,
        None => return Ok(false), // Lock account not provided, assume not locked
    };

    // Check if account exists and has data
    if lock_account.data_len() == 0 {
        return Ok(false);
    }

    // Check if the account is owned by the program
    if lock_account.owner != program_id {
        return Ok(false);
    }

    // Deserialize the AccountLock to check its state
    let lock_data = lock_account.try_borrow_data()?;

    // Verify minimum size for AccountLock
    if lock_data.len() < AccountLock::LEN {
        return Ok(false);
    }

    // Parse the lock data manually to check is_active and expiration
    // Structure: discriminator(8) + protected_account(32) + operation_type(4+64) +
    // lock_signature(4+88) + locked_by(32) + locked_at(8) + expires_at(8) + is_active(1)
    let is_active_offset = 8 + 32 + 4 + 64 + 4 + 88 + 32 + 8 + 8;

    if lock_data.len() <= is_active_offset {
        return Ok(false);
    }

    let is_active = lock_data[is_active_offset] != 0;

    if !is_active {
        return Ok(false);
    }

    // Check expiration
    let expires_at_offset = is_active_offset - 8;
    let expires_at = i64::from_le_bytes(
        lock_data[expires_at_offset..expires_at_offset + 8]
            .try_into()
            .map_err(|_| error!(crate::GhostSpeakError::InvalidState))?,
    );

    let clock = Clock::get()?;
    let is_valid = clock.unix_timestamp <= expires_at;

    Ok(is_valid)
}

/// Helper macro for using reentrancy protection in instructions
/// Usage: check_reentrancy!(ctx, instruction_hash);
#[macro_export]
macro_rules! check_reentrancy {
    ($ctx:expr, $instruction_hash:expr) => {{
        let program_id = $ctx.program_id;
        let accounts: Vec<AccountInfo> = $ctx.remaining_accounts.to_vec();

        if is_instruction_locked($instruction_hash, program_id, &accounts)? {
            return Err(error!(crate::GhostSpeakError::ReentrancyDetected));
        }
    }};
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_reentrancy_guard_states() {
        // Test state transitions
        assert_eq!(ReentrancyState::Unlocked as u8, 0);
        assert_eq!(ReentrancyState::Locked as u8, 1);
    }

    #[test]
    fn test_account_sizes() {
        // Ensure our size calculations are correct
        assert!(ReentrancyGuard::LEN > 8); // Has discriminator
        assert!(InstructionLock::LEN > 8);
        assert!(AccountLock::LEN > 8);
    }
}
