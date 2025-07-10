/*!
 * Security Macros and Utilities
 * 
 * This module provides essential security macros and utilities for the
 * GhostSpeak Protocol smart contract.
 */

use anchor_lang::prelude::*;

// =====================================================
// SECURITY CONSTANTS
// =====================================================

pub const MAX_TITLE_LENGTH: usize = 128;
pub const MAX_NAME_LENGTH: usize = 64;
pub const MAX_DESCRIPTION_LENGTH: usize = 512;
pub const MAX_PAYMENT_AMOUNT: u64 = 1_000_000_000_000;
pub const MIN_PAYMENT_AMOUNT: u64 = 1_000;

// =====================================================
// SECURITY MACROS
// =====================================================

/// Validates that a string meets length requirements
#[macro_export]
macro_rules! validate_string {
    ($string:expr, $max_length:expr, $field_name:expr) => {
        if $string.is_empty() || $string.len() > $max_length {
            return Err(PodAIMarketplaceError::InputTooLong.into());
        }
    };
}

/// Validates payment amounts
#[macro_export]
macro_rules! validate_payment {
    ($amount:expr, $field_name:expr) => {
        if $amount < MIN_PAYMENT_AMOUNT || $amount > MAX_PAYMENT_AMOUNT {
            return Err(PodAIMarketplaceError::InvalidPaymentAmount.into());
        }
    };
}

/// Requires that an account is a signer
#[macro_export]
macro_rules! require_signer {
    ($account:expr) => {
        if !$account.is_signer {
            return Err(PodAIMarketplaceError::UnauthorizedAccess.into());
        }
    };
}

/// Safe addition with overflow check
#[macro_export]
macro_rules! safe_add {
    ($a:expr, $b:expr) => {
        $a.checked_add($b).ok_or(PodAIMarketplaceError::ArithmeticOverflow)?
    };
}

/// Safe multiplication with overflow check
#[macro_export]
macro_rules! safe_mul {
    ($a:expr, $b:expr) => {
        $a.checked_mul($b).ok_or(PodAIMarketplaceError::ArithmeticOverflow)?
    };
}

/// Safe subtraction with underflow check
#[macro_export]
macro_rules! safe_sub {
    ($a:expr, $b:expr) => {
        $a.checked_sub($b).ok_or(PodAIMarketplaceError::ArithmeticOverflow)?
    };
}

/// Provides error context for debugging
#[macro_export]
macro_rules! error_with_context {
    ($error:expr, $context:expr) => {
        {
            msg!("Error in {}: {:?}", $context, $error);
            $error
        }
    };
}

/// Performance monitoring macro
#[macro_export]
macro_rules! monitor_performance {
    ($operation_name:expr, $block:block) => {
        {
            let start_time = Clock::get()?.unix_timestamp;
            let result = $block;
            let end_time = Clock::get()?.unix_timestamp;
            msg!("Operation {} took {} seconds", $operation_name, end_time - start_time);
            result
        }
    };
}

/// Validates account ownership
#[macro_export]
macro_rules! validate_owner {
    ($account:expr, $expected_owner:expr) => {
        if $account.owner != $expected_owner {
            return Err(PodAIMarketplaceError::UnauthorizedAccess.into());
        }
    };
}

/// Validates that an account is not already initialized
#[macro_export]
macro_rules! validate_not_initialized {
    ($account:expr) => {
        if $account.to_account_info().data_len() > 0 {
            return Err(PodAIMarketplaceError::InvalidStatusTransition.into());
        }
    };
}

/// Validates that an account is initialized
#[macro_export]
macro_rules! validate_initialized {
    ($account:expr) => {
        if $account.to_account_info().data_len() == 0 {
            return Err(PodAIMarketplaceError::AgentNotFound.into());
        }
    };
}

/// Validates time-based constraints
#[macro_export]
macro_rules! validate_time {
    ($timestamp:expr, $min_time:expr, $max_time:expr) => {
        if $timestamp < $min_time || $timestamp > $max_time {
            return Err(PodAIMarketplaceError::InvalidDeadline.into());
        }
    };
}

/// Validates percentage values (0-100)
#[macro_export]
macro_rules! validate_percentage {
    ($percentage:expr) => {
        if $percentage > 100 {
            return Err(PodAIMarketplaceError::InvalidPercentage.into());
        }
    };
}

/// Validates array length
#[macro_export]
macro_rules! validate_array_length {
    ($array:expr, $max_length:expr) => {
        if $array.len() > $max_length {
            return Err(PodAIMarketplaceError::InputTooLong.into());
        }
    };
}

/// Rate limiting check
#[macro_export]
macro_rules! check_rate_limit {
    ($last_action_time:expr, $min_interval:expr) => {
        {
            let current_time = Clock::get()?.unix_timestamp;
            if current_time - $last_action_time < $min_interval {
                return Err(PodAIMarketplaceError::UpdateFrequencyTooHigh.into());
            }
        }
    };
}

// =====================================================
// SECURITY UTILITY FUNCTIONS
// =====================================================

/// Securely calculates percentage with overflow protection
pub fn calculate_percentage_safe(amount: u64, percentage: u64) -> Result<u64> {
    if percentage > 100 {
        return Err(PodAIMarketplaceError::InvalidPercentage.into());
    }
    
    amount
        .checked_mul(percentage)
        .and_then(|result| result.checked_div(100))
        .ok_or(PodAIMarketplaceError::ArithmeticOverflow.into())
}

/// Validates string content for security
pub fn validate_string_content(input: &str) -> Result<()> {
    // Check for null bytes and control characters
    if input.contains('\0') || input.chars().any(|c| c.is_control() && !c.is_whitespace()) {
        return Err(PodAIMarketplaceError::InputTooLong.into());
    }
    Ok(())
}

/// Validates PDA derivation
pub fn validate_pda(
    address: &Pubkey,
    seeds: &[&[u8]],
    program_id: &Pubkey,
) -> Result<u8> {
    let (derived_address, bump) = Pubkey::find_program_address(seeds, program_id);
    if *address != derived_address {
        return Err(PodAIMarketplaceError::UnauthorizedAccess.into());
    }
    Ok(bump)
}

/// Validates token account ownership and mint
pub fn validate_token_account(
    token_account: &anchor_lang::prelude::Account<'_, anchor_spl::token::TokenAccount>,
    expected_owner: &Pubkey,
    expected_mint: &Pubkey,
) -> Result<()> {
    if token_account.owner != *expected_owner {
        return Err(PodAIMarketplaceError::UnauthorizedAccess.into());
    }
    
    if token_account.mint != *expected_mint {
        return Err(PodAIMarketplaceError::UnauthorizedAccess.into());
    }
    
    Ok(())
}

/// Validates sufficient balance for transaction
pub fn validate_sufficient_balance(
    token_account: &anchor_lang::prelude::Account<'_, anchor_spl::token::TokenAccount>,
    required_amount: u64,
) -> Result<()> {
    if token_account.amount < required_amount {
        return Err(PodAIMarketplaceError::InsufficientBalance.into());
    }
    Ok(())
}

/// Securely generates a unique ID with overflow protection
pub fn generate_unique_id(base_id: u64, increment: u64) -> Result<u64> {
    base_id
        .checked_add(increment)
        .ok_or(PodAIMarketplaceError::ArithmeticOverflow.into())
}

/// Validates timestamp is in the future
pub fn validate_future_timestamp(timestamp: i64) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;
    if timestamp <= current_time {
        return Err(PodAIMarketplaceError::InvalidDeadline.into());
    }
    Ok(())
}

/// Validates that a duration is reasonable
pub fn validate_duration(duration: i64, min_duration: i64, max_duration: i64) -> Result<()> {
    if duration < min_duration || duration > max_duration {
        return Err(PodAIMarketplaceError::InvalidDeadline.into());
    }
    Ok(())
}

/// Validates capability strings
pub fn validate_capabilities(capabilities: &[String]) -> Result<()> {
    if capabilities.len() > 20 {
        return Err(PodAIMarketplaceError::InputTooLong.into());
    }
    
    for capability in capabilities {
        if capability.is_empty() || capability.len() > 64 {
            return Err(PodAIMarketplaceError::InputTooLong.into());
        }
        validate_string_content(capability)?;
    }
    
    Ok(())
}

/// Validates metadata URI format
pub fn validate_metadata_uri(uri: &str) -> Result<()> {
    if uri.is_empty() || uri.len() > 512 {
        return Err(PodAIMarketplaceError::InputTooLong.into());
    }
    
    // Basic URI validation - starts with http/https or ipfs
    if !uri.starts_with("https://") 
        && !uri.starts_with("http://") 
        && !uri.starts_with("ipfs://") 
        && !uri.starts_with("ar://") {
        return Err(PodAIMarketplaceError::InputTooLong.into());
    }
    
    validate_string_content(uri)?;
    Ok(())
}

/// Validates work order requirements
pub fn validate_work_order_requirements(requirements: &[String]) -> Result<()> {
    if requirements.len() > 50 {
        return Err(PodAIMarketplaceError::InputTooLong.into());
    }
    
    for requirement in requirements {
        if requirement.is_empty() || requirement.len() > 256 {
            return Err(PodAIMarketplaceError::InputTooLong.into());
        }
        validate_string_content(requirement)?;
    }
    
    Ok(())
}

/// Validates escrow configuration
pub fn validate_escrow_config(
    amount: u64,
    dispute_resolution_time: i64,
    auto_release_time: i64,
) -> Result<()> {
    // Validate payment amount
    if amount < MIN_PAYMENT_AMOUNT || amount > MAX_PAYMENT_AMOUNT {
        return Err(PodAIMarketplaceError::InvalidPaymentAmount.into());
    }
    
    // Validate dispute resolution time (1 hour to 30 days)
    if dispute_resolution_time < 3600 || dispute_resolution_time > 2_592_000 {
        return Err(PodAIMarketplaceError::InvalidDeadline.into());
    }
    
    // Validate auto release time (1 day to 90 days)
    if auto_release_time < 86400 || auto_release_time > 7_776_000 {
        return Err(PodAIMarketplaceError::InvalidDeadline.into());
    }
    
    // Auto release should be longer than dispute resolution
    if auto_release_time <= dispute_resolution_time {
        return Err(PodAIMarketplaceError::InvalidDeadline.into());
    }
    
    Ok(())
}

/// Validates auction parameters
pub fn validate_auction_params(
    start_price: u64,
    reserve_price: u64,
    duration: i64,
    min_bid_increment: u64,
) -> Result<()> {
    // Validate prices
    if start_price < MIN_PAYMENT_AMOUNT || start_price > MAX_PAYMENT_AMOUNT {
        return Err(PodAIMarketplaceError::InvalidPaymentAmount.into());
    }
    
    if reserve_price > 0 && reserve_price < start_price {
        return Err(PodAIMarketplaceError::InvalidPriceRange.into());
    }
    
    // Validate duration (1 hour to 30 days)
    if duration < 3600 || duration > 2_592_000 {
        return Err(PodAIMarketplaceError::InvalidDeadline.into());
    }
    
    // Validate minimum bid increment
    if min_bid_increment == 0 || min_bid_increment > start_price / 10 {
        return Err(PodAIMarketplaceError::InvalidPriceRange.into());
    }
    
    Ok(())
}

// =====================================================
// SECURITY TRAITS
// =====================================================

/// Trait for secure initialization of accounts
pub trait SecureInit {
    fn secure_init(&mut self, authority: Pubkey, current_time: i64) -> Result<()>;
}

/// Trait for secure updates of accounts
pub trait SecureUpdate {
    fn secure_update(&mut self, authority: Pubkey, current_time: i64) -> Result<()>;
    fn validate_update_authority(&self, authority: Pubkey) -> Result<()>;
}

/// Trait for secure access control
pub trait AccessControl {
    fn check_read_permission(&self, accessor: Pubkey) -> Result<()>;
    fn check_write_permission(&self, accessor: Pubkey) -> Result<()>;
    fn check_admin_permission(&self, accessor: Pubkey) -> Result<()>;
}

// =====================================================
// RATE LIMITING
// =====================================================

/// Rate limiting structure
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RateLimit {
    pub last_action_time: i64,
    pub action_count: u32,
    pub window_start: i64,
    pub max_actions_per_window: u32,
    pub window_duration: i64,
}

impl RateLimit {
    pub fn new(max_actions_per_window: u32, window_duration: i64) -> Self {
        Self {
            last_action_time: 0,
            action_count: 0,
            window_start: 0,
            max_actions_per_window,
            window_duration,
        }
    }
    
    pub fn check_and_update(&mut self, current_time: i64) -> Result<()> {
        // Reset window if enough time has passed
        if current_time - self.window_start >= self.window_duration {
            self.window_start = current_time;
            self.action_count = 0;
        }
        
        // Check if rate limit exceeded
        if self.action_count >= self.max_actions_per_window {
            return Err(PodAIMarketplaceError::UpdateFrequencyTooHigh.into());
        }
        
        // Update counters
        self.action_count += 1;
        self.last_action_time = current_time;
        
        Ok(())
    }
}

// =====================================================
// EMERGENCY CONTROLS
// =====================================================

/// Emergency pause functionality
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct EmergencyControls {
    pub is_paused: bool,
    pub pause_authority: Pubkey,
    pub paused_at: Option<i64>,
    pub pause_reason: String,
}

impl EmergencyControls {
    pub fn new(pause_authority: Pubkey) -> Self {
        Self {
            is_paused: false,
            pause_authority,
            paused_at: None,
            pause_reason: String::new(),
        }
    }
    
    pub fn pause(&mut self, authority: Pubkey, reason: String, current_time: i64) -> Result<()> {
        if authority != self.pause_authority {
            return Err(PodAIMarketplaceError::UnauthorizedAccess.into());
        }
        
        self.is_paused = true;
        self.paused_at = Some(current_time);
        self.pause_reason = reason;
        
        Ok(())
    }
    
    pub fn unpause(&mut self, authority: Pubkey) -> Result<()> {
        if authority != self.pause_authority {
            return Err(PodAIMarketplaceError::UnauthorizedAccess.into());
        }
        
        self.is_paused = false;
        self.paused_at = None;
        self.pause_reason.clear();
        
        Ok(())
    }
    
    pub fn check_not_paused(&self) -> Result<()> {
        if self.is_paused {
            return Err(PodAIMarketplaceError::InvalidStatusTransition.into());
        }
        Ok(())
    }
}