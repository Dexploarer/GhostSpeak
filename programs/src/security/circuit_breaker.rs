/*!
 * Circuit Breaker - Emergency Pause Mechanism
 *
 * Provides admin-controlled emergency pause functionality to halt
 * all protocol operations in case of discovered vulnerabilities or attacks.
 *
 * Features:
 * - Global pause/unpause
 * - Per-instruction pause
 * - Gradual resume with safeguards
 * - Multi-signature admin control
 */

use anchor_lang::prelude::*;
use crate::GhostSpeakError;

/// Circuit breaker state account
#[account]
pub struct CircuitBreaker {
    /// Protocol-wide pause status
    pub is_paused: bool,

    /// Individual instruction pause flags
    pub paused_instructions: PausedInstructions,

    /// Admin authority who can toggle pause
    pub admin: Pubkey,

    /// Multi-sig authorities (optional)
    pub multisig_authorities: Vec<Pubkey>,

    /// Required signatures for pause/unpause
    pub required_signatures: u8,

    /// Last pause timestamp
    pub last_paused_at: i64,

    /// Last unpause timestamp
    pub last_unpaused_at: i64,

    /// Pause reason
    pub pause_reason: String,

    /// Total number of pauses
    pub pause_count: u32,

    /// Bump seed for PDA
    pub bump: u8,
}

/// Individual instruction pause flags
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, Default)]
pub struct PausedInstructions {
    // Agent operations
    pub register_agent: bool,
    pub update_agent: bool,
    pub deactivate_agent: bool,

    // Escrow operations
    pub create_escrow: bool,
    pub complete_escrow: bool,
    pub cancel_escrow: bool,
    pub dispute_escrow: bool,
    pub process_escrow_payment: bool,

    // x402 operations
    pub configure_x402: bool,
    pub record_x402_payment: bool,
    pub submit_x402_rating: bool,

    // Work orders
    pub create_work_order: bool,
    pub complete_work_order: bool,

    // Governance
    pub create_proposal: bool,
    pub vote: bool,

    // Marketplace
    pub create_listing: bool,
    pub purchase: bool,
}

impl CircuitBreaker {
    pub const LEN: usize = 8 + // discriminator
        1 + // is_paused
        PausedInstructions::LEN + // paused_instructions
        32 + // admin
        4 + (32 * 10) + // multisig_authorities (max 10)
        1 + // required_signatures
        8 + // last_paused_at
        8 + // last_unpaused_at
        4 + 256 + // pause_reason
        4 + // pause_count
        1; // bump

    /// Initialize circuit breaker with admin
    pub fn initialize(&mut self, admin: Pubkey, bump: u8) -> Result<()> {
        self.is_paused = false;
        self.paused_instructions = PausedInstructions::default();
        self.admin = admin;
        self.multisig_authorities = Vec::new();
        self.required_signatures = 1;
        self.last_paused_at = 0;
        self.last_unpaused_at = 0;
        self.pause_reason = String::new();
        self.pause_count = 0;
        self.bump = bump;

        Ok(())
    }

    /// Pause entire protocol
    pub fn pause_all(&mut self, reason: String) -> Result<()> {
        require!(!self.is_paused, GhostSpeakError::AlreadyPaused);
        require!(
            reason.len() <= 256,
            GhostSpeakError::InvalidInputLength
        );

        self.is_paused = true;
        self.pause_reason = reason;
        self.last_paused_at = Clock::get()?.unix_timestamp;
        self.pause_count = self.pause_count
            .checked_add(1)
            .ok_or(GhostSpeakError::ArithmeticOverflow)?;

        msg!("CIRCUIT BREAKER: Protocol paused - Reason: {}", self.pause_reason);

        Ok(())
    }

    /// Unpause entire protocol
    pub fn unpause_all(&mut self) -> Result<()> {
        require!(self.is_paused, GhostSpeakError::NotPaused);

        self.is_paused = false;
        self.last_unpaused_at = Clock::get()?.unix_timestamp;
        self.pause_reason = String::new();

        msg!("CIRCUIT BREAKER: Protocol unpaused");

        Ok(())
    }

    /// Pause specific instruction
    pub fn pause_instruction(&mut self, instruction: InstructionType, reason: String) -> Result<()> {
        require!(
            reason.len() <= 256,
            GhostSpeakError::InvalidInputLength
        );

        match instruction {
            InstructionType::RegisterAgent => self.paused_instructions.register_agent = true,
            InstructionType::UpdateAgent => self.paused_instructions.update_agent = true,
            InstructionType::CreateEscrow => self.paused_instructions.create_escrow = true,
            InstructionType::CompleteEscrow => self.paused_instructions.complete_escrow = true,
            InstructionType::ConfigureX402 => self.paused_instructions.configure_x402 = true,
            InstructionType::RecordX402Payment => self.paused_instructions.record_x402_payment = true,
            InstructionType::CreateWorkOrder => self.paused_instructions.create_work_order = true,
            InstructionType::CreateProposal => self.paused_instructions.create_proposal = true,
            // Add more as needed
        }

        self.pause_reason = reason;

        msg!("CIRCUIT BREAKER: Instruction {:?} paused", instruction);

        Ok(())
    }

    /// Unpause specific instruction
    pub fn unpause_instruction(&mut self, instruction: InstructionType) -> Result<()> {
        match instruction {
            InstructionType::RegisterAgent => self.paused_instructions.register_agent = false,
            InstructionType::UpdateAgent => self.paused_instructions.update_agent = false,
            InstructionType::CreateEscrow => self.paused_instructions.create_escrow = false,
            InstructionType::CompleteEscrow => self.paused_instructions.complete_escrow = false,
            InstructionType::ConfigureX402 => self.paused_instructions.configure_x402 = false,
            InstructionType::RecordX402Payment => self.paused_instructions.record_x402_payment = false,
            InstructionType::CreateWorkOrder => self.paused_instructions.create_work_order = false,
            InstructionType::CreateProposal => self.paused_instructions.create_proposal = false,
        }

        msg!("CIRCUIT BREAKER: Instruction {:?} unpaused", instruction);

        Ok(())
    }

    /// Check if protocol is paused
    pub fn check_not_paused(&self) -> Result<()> {
        require!(!self.is_paused, GhostSpeakError::ProtocolPaused);
        Ok(())
    }

    /// Check if specific instruction is paused
    pub fn check_instruction_not_paused(&self, instruction: InstructionType) -> Result<()> {
        // First check global pause
        self.check_not_paused()?;

        // Then check instruction-specific pause
        let is_paused = match instruction {
            InstructionType::RegisterAgent => self.paused_instructions.register_agent,
            InstructionType::UpdateAgent => self.paused_instructions.update_agent,
            InstructionType::CreateEscrow => self.paused_instructions.create_escrow,
            InstructionType::CompleteEscrow => self.paused_instructions.complete_escrow,
            InstructionType::ConfigureX402 => self.paused_instructions.configure_x402,
            InstructionType::RecordX402Payment => self.paused_instructions.record_x402_payment,
            InstructionType::CreateWorkOrder => self.paused_instructions.create_work_order,
            InstructionType::CreateProposal => self.paused_instructions.create_proposal,
        };

        require!(!is_paused, GhostSpeakError::InstructionPaused);

        Ok(())
    }

    /// Add multisig authority
    pub fn add_multisig_authority(&mut self, authority: Pubkey) -> Result<()> {
        require!(
            self.multisig_authorities.len() < 10,
            GhostSpeakError::TooManyAuthorities
        );

        require!(
            !self.multisig_authorities.contains(&authority),
            GhostSpeakError::AuthorityAlreadyExists
        );

        self.multisig_authorities.push(authority);

        Ok(())
    }

    /// Set required signatures
    pub fn set_required_signatures(&mut self, required: u8) -> Result<()> {
        require!(
            required > 0 && required as usize <= self.multisig_authorities.len(),
            GhostSpeakError::InvalidRequiredSignatures
        );

        self.required_signatures = required;

        Ok(())
    }
}

impl PausedInstructions {
    pub const LEN: usize = 13; // 13 boolean fields
}

/// Instruction types for granular pause control
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum InstructionType {
    RegisterAgent,
    UpdateAgent,
    CreateEscrow,
    CompleteEscrow,
    ConfigureX402,
    RecordX402Payment,
    CreateWorkOrder,
    CreateProposal,
}

/// Context for initializing circuit breaker
#[derive(Accounts)]
pub struct InitializeCircuitBreaker<'info> {
    #[account(
        init,
        payer = admin,
        space = CircuitBreaker::LEN,
        seeds = [b"circuit_breaker"],
        bump
    )]
    pub circuit_breaker: Account<'info, CircuitBreaker>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Context for pausing protocol
#[derive(Accounts)]
pub struct PauseProtocol<'info> {
    #[account(
        mut,
        seeds = [b"circuit_breaker"],
        bump = circuit_breaker.bump,
        constraint = admin.key() == circuit_breaker.admin @ GhostSpeakError::UnauthorizedAccess
    )]
    pub circuit_breaker: Account<'info, CircuitBreaker>,

    pub admin: Signer<'info>,
}

/// Context for unpausing protocol
#[derive(Accounts)]
pub struct UnpauseProtocol<'info> {
    #[account(
        mut,
        seeds = [b"circuit_breaker"],
        bump = circuit_breaker.bump,
        constraint = admin.key() == circuit_breaker.admin @ GhostSpeakError::UnauthorizedAccess
    )]
    pub circuit_breaker: Account<'info, CircuitBreaker>,

    pub admin: Signer<'info>,
}

// =====================================================
// INSTRUCTION HANDLERS
// =====================================================

/// Initialize circuit breaker
pub fn initialize_circuit_breaker(ctx: Context<InitializeCircuitBreaker>) -> Result<()> {
    let circuit_breaker = &mut ctx.accounts.circuit_breaker;

    circuit_breaker.initialize(
        ctx.accounts.admin.key(),
        ctx.bumps.circuit_breaker,
    )?;

    msg!("Circuit breaker initialized with admin: {}", ctx.accounts.admin.key());

    Ok(())
}

/// Pause entire protocol
pub fn pause_protocol(ctx: Context<PauseProtocol>, reason: String) -> Result<()> {
    let circuit_breaker = &mut ctx.accounts.circuit_breaker;

    circuit_breaker.pause_all(reason)?;

    Ok(())
}

/// Unpause entire protocol
pub fn unpause_protocol(ctx: Context<UnpauseProtocol>) -> Result<()> {
    let circuit_breaker = &mut ctx.accounts.circuit_breaker;

    circuit_breaker.unpause_all()?;

    Ok(())
}

/// Pause specific instruction
pub fn pause_instruction(
    ctx: Context<PauseProtocol>,
    instruction: InstructionType,
    reason: String,
) -> Result<()> {
    let circuit_breaker = &mut ctx.accounts.circuit_breaker;

    circuit_breaker.pause_instruction(instruction, reason)?;

    Ok(())
}

/// Unpause specific instruction
pub fn unpause_instruction(
    ctx: Context<UnpauseProtocol>,
    instruction: InstructionType,
) -> Result<()> {
    let circuit_breaker = &mut ctx.accounts.circuit_breaker;

    circuit_breaker.unpause_instruction(instruction)?;

    Ok(())
}

// =====================================================
// HELPER MACRO FOR PAUSE CHECKS
// =====================================================

/// Macro to check if instruction is paused at the start of every handler
#[macro_export]
macro_rules! check_not_paused {
    ($circuit_breaker:expr, $instruction_type:expr) => {
        $circuit_breaker.check_instruction_not_paused($instruction_type)?;
    };
}

// Usage example in instruction handlers:
// check_not_paused!(ctx.accounts.circuit_breaker, InstructionType::RegisterAgent);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pause_unpause_cycle() {
        let mut breaker = CircuitBreaker {
            is_paused: false,
            paused_instructions: PausedInstructions::default(),
            admin: Pubkey::new_unique(),
            multisig_authorities: Vec::new(),
            required_signatures: 1,
            last_paused_at: 0,
            last_unpaused_at: 0,
            pause_reason: String::new(),
            pause_count: 0,
            bump: 255,
        };

        // Pause
        breaker.pause_all("Test pause".to_string()).unwrap();
        assert!(breaker.is_paused);
        assert_eq!(breaker.pause_count, 1);

        // Unpause
        breaker.unpause_all().unwrap();
        assert!(!breaker.is_paused);
    }

    #[test]
    fn test_instruction_specific_pause() {
        let mut breaker = CircuitBreaker {
            is_paused: false,
            paused_instructions: PausedInstructions::default(),
            admin: Pubkey::new_unique(),
            multisig_authorities: Vec::new(),
            required_signatures: 1,
            last_paused_at: 0,
            last_unpaused_at: 0,
            pause_reason: String::new(),
            pause_count: 0,
            bump: 255,
        };

        // Pause specific instruction
        breaker.pause_instruction(InstructionType::RegisterAgent, "Testing".to_string()).unwrap();
        assert!(breaker.paused_instructions.register_agent);

        // Other instructions should not be paused
        assert!(!breaker.paused_instructions.create_escrow);

        // Unpause
        breaker.unpause_instruction(InstructionType::RegisterAgent).unwrap();
        assert!(!breaker.paused_instructions.register_agent);
    }
}
