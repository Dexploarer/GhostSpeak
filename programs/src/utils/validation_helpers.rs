/*!
 * Validation Helpers Module
 *
 * Centralized validation functions to eliminate code duplication and
 * provide consistent error handling across all instructions.
 *
 * This module addresses P3 MEDIUM priority issues:
 * - Code duplication in validation logic
 * - Missing input validation
 * - Inconsistent error handling
 */

use crate::{
    GhostSpeakError, MAX_CAPABILITIES_COUNT, MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH,
    MAX_PAYMENT_AMOUNT, MAX_URL_LENGTH, MIN_PAYMENT_AMOUNT,
};
use anchor_lang::prelude::*;

/// Validates string input with length constraints and content filtering
///
/// # Arguments
/// * `input` - The string to validate
/// * `field_name` - Name of the field for error context
/// * `max_length` - Maximum allowed length
/// * `allow_empty` - Whether empty strings are allowed
/// * `allow_special_chars` - Whether special characters are allowed
///
/// # Returns
/// * `Ok(())` if valid
/// * `Err(GhostSpeakError)` with specific error type
pub fn validate_string_input(
    input: &str,
    field_name: &str,
    max_length: usize,
    allow_empty: bool,
    allow_special_chars: bool,
) -> Result<()> {
    // Check emptiness
    if !allow_empty && input.is_empty() {
        match field_name {
            "name" => return Err(error!(GhostSpeakError::InvalidInput)),
            "description" => return Err(error!(GhostSpeakError::InvalidInput)),
            "title" => return Err(error!(GhostSpeakError::InvalidInput)),
            _ => return Err(error!(GhostSpeakError::InvalidInput)),
        }
    }

    // Check length
    if input.len() > max_length {
        match field_name {
            "name" => return Err(error!(GhostSpeakError::NameTooLong)),
            "description" => return Err(error!(GhostSpeakError::DescriptionTooLong)),
            "title" => return Err(error!(GhostSpeakError::TitleTooLong)),
            "message" => return Err(error!(GhostSpeakError::MessageTooLong)),
            "metadata_uri" => return Err(error!(GhostSpeakError::MetadataUriTooLong)),
            _ => return Err(error!(GhostSpeakError::InputTooLong)),
        }
    }

    // Content validation for security
    if !allow_special_chars {
        // Check for potentially malicious characters
        if input.contains('<')
            || input.contains('>')
            || input.contains("javascript:")
            || input.contains("data:")
            || input.contains("..")
        {
            return Err(error!(GhostSpeakError::InvalidInputFormat));
        }
    }

    Ok(())
}

/// Validates common agent registration inputs
///
/// # Arguments
/// * `agent_type` - Numeric agent type
/// * `name` - Agent name
/// * `description` - Agent description  
/// * `metadata_uri` - Metadata URI
/// * `agent_id` - Unique agent identifier
///
/// # Returns
/// * `Ok(())` if all inputs are valid
/// * `Err(GhostSpeakError)` with specific validation error
pub fn validate_agent_inputs(
    agent_type: u8,
    name: &str,
    description: &str,
    metadata_uri: &str,
    agent_id: &str,
) -> Result<()> {
    // Validate agent type range (0-10 for different agent categories)
    require!(agent_type <= 10, GhostSpeakError::InvalidConfiguration);

    // Validate agent_id (alphanumeric, underscore, hyphen only)
    validate_string_input(agent_id, "agent_id", 64, false, false)?;
    require!(
        agent_id
            .chars()
            .all(|c| c.is_alphanumeric() || c == '_' || c == '-'),
        GhostSpeakError::InvalidInputFormat
    );

    // Validate name
    validate_string_input(name, "name", MAX_NAME_LENGTH, false, false)?;

    // Validate description
    validate_string_input(
        description,
        "description",
        MAX_DESCRIPTION_LENGTH,
        false,
        true,
    )?;

    // Validate metadata URI
    validate_url(metadata_uri)?;

    Ok(())
}

/// Validates URL format and security constraints
///
/// # Arguments
/// * `url` - The URL to validate
///
/// # Returns
/// * `Ok(())` if URL is valid and safe
/// * `Err(GhostSpeakError)` if URL is invalid or potentially malicious
pub fn validate_url(url: &str) -> Result<()> {
    // Check basic requirements
    require!(!url.is_empty(), GhostSpeakError::InvalidMetadataUri);

    require!(
        url.len() <= MAX_URL_LENGTH,
        GhostSpeakError::MetadataUriTooLong
    );

    // Only allow HTTPS and IPFS protocols for security
    require!(
        url.starts_with("https://") || url.starts_with("ipfs://"),
        GhostSpeakError::InvalidServiceEndpoint
    );

    // Security checks to prevent malicious URLs
    require!(
        !url.contains("..")
            && !url.contains("<")
            && !url.contains(">")
            && !url.contains("javascript:")
            && !url.contains("data:")
            && !url.contains("vbscript:"),
        GhostSpeakError::InvalidInputFormat
    );

    Ok(())
}

/// Validates payment amounts with overflow protection
///
/// # Arguments
/// * `amount` - Payment amount to validate
/// * `operation` - Type of operation for context
///
/// # Returns
/// * `Ok(())` if amount is valid
/// * `Err(GhostSpeakError)` if amount is invalid
pub fn validate_payment_amount(amount: u64, operation: &str) -> Result<()> {
    require!(
        amount >= MIN_PAYMENT_AMOUNT,
        GhostSpeakError::InvalidPaymentAmount
    );

    require!(
        amount <= MAX_PAYMENT_AMOUNT,
        GhostSpeakError::InvalidPaymentAmount
    );

    // Additional validation for specific operations
    match operation {
        "escrow" => {
            // Escrow amounts should be reasonable for typical services
            require!(
                amount <= MAX_PAYMENT_AMOUNT / 10, // Max 10% of total limit for single escrow
                GhostSpeakError::InvalidEscrowAmount
            );
        }
        "bid" => {
            // Bid amounts should be meaningful
            require!(
                amount >= MIN_PAYMENT_AMOUNT * 10, // Minimum 10x base amount for bids
                GhostSpeakError::BidTooLow
            );
        }
        _ => {} // Default validation already passed
    }

    Ok(())
}

/// Validates timestamps with comprehensive checks
///
/// # Arguments  
/// * `timestamp` - Timestamp to validate
/// * `min_future_seconds` - Minimum seconds in the future (0 for past/present allowed)
/// * `max_future_seconds` - Maximum seconds in the future
///
/// # Returns
/// * `Ok(())` if timestamp is valid
/// * `Err(GhostSpeakError)` if timestamp is invalid
pub fn validate_timestamp(
    timestamp: i64,
    min_future_seconds: i64,
    max_future_seconds: i64,
) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;

    // Check if timestamp is too far in the past (more than 1 year)
    require!(
        timestamp >= current_time - 31_536_000, // 1 year ago
        GhostSpeakError::InvalidDeadline
    );

    // Check minimum future requirement
    if min_future_seconds > 0 {
        require!(
            timestamp >= current_time + min_future_seconds,
            GhostSpeakError::InvalidDeadline
        );
    }

    // Check maximum future limit (prevent overflow attacks)
    require!(
        timestamp <= current_time + max_future_seconds,
        GhostSpeakError::InvalidDeadline
    );

    Ok(())
}

/// Validates array/vector sizes to prevent DoS attacks
///
/// # Arguments
/// * `size` - Current size of array/vector
/// * `max_size` - Maximum allowed size
/// * `field_name` - Name of the field for error context
///
/// # Returns
/// * `Ok(())` if size is within limits
/// * `Err(GhostSpeakError)` if size exceeds limits
pub fn validate_collection_size(size: usize, max_size: usize, field_name: &str) -> Result<()> {
    require!(
        size <= max_size,
        match field_name {
            "capabilities" => GhostSpeakError::TooManyCapabilities,
            "requirements" => GhostSpeakError::TooManyRequirements,
            "deliverables" => GhostSpeakError::TooManyDeliverables,
            "participants" => GhostSpeakError::TooManyParticipants,
            "bids" => GhostSpeakError::TooManyBids,
            "evidence" => GhostSpeakError::TooManyEvidenceItems,
            _ => GhostSpeakError::InvalidConfiguration,
        }
    );

    Ok(())
}

/// Validates numeric ranges with overflow protection
///
/// # Arguments
/// * `value` - Value to validate
/// * `min_value` - Minimum allowed value
/// * `max_value` - Maximum allowed value
/// * `field_name` - Name of the field for error context
///
/// # Returns
/// * `Ok(())` if value is within range
/// * `Err(GhostSpeakError)` if value is out of range
pub fn validate_numeric_range<T: PartialOrd + Copy>(
    value: T,
    min_value: T,
    max_value: T,
    field_name: &str,
) -> Result<()> {
    require!(
        value >= min_value,
        match field_name {
            "percentage" => GhostSpeakError::InvalidPercentage,
            "reputation" => GhostSpeakError::InvalidReputationScore,
            "rating" => GhostSpeakError::InvalidRating,
            _ => GhostSpeakError::ValueBelowMinimum,
        }
    );

    require!(
        value <= max_value,
        match field_name {
            "percentage" => GhostSpeakError::InvalidPercentage,
            "reputation" => GhostSpeakError::InvalidReputationScore,
            "rating" => GhostSpeakError::InvalidRating,
            _ => GhostSpeakError::ValueExceedsMaximum,
        }
    );

    Ok(())
}

/// Validates account relationships and permissions
///
/// # Arguments
/// * `expected_owner` - Expected owner of the account
/// * `actual_owner` - Actual owner from the account
/// * `operation` - Type of operation being performed
///
/// # Returns
/// * `Ok(())` if ownership is valid
/// * `Err(GhostSpeakError)` if ownership validation fails
pub fn validate_account_ownership(
    expected_owner: &Pubkey,
    actual_owner: &Pubkey,
    operation: &str,
) -> Result<()> {
    require!(
        expected_owner == actual_owner,
        match operation {
            "agent" => GhostSpeakError::InvalidAgentOwner,
            "escrow" => GhostSpeakError::UnauthorizedAccess,
            "work_order" => GhostSpeakError::UnauthorizedAccess,
            _ => GhostSpeakError::InvalidAccountOwner,
        }
    );

    Ok(())
}

/// Validates capability strings for agents
///
/// # Arguments
/// * `capabilities` - Vector of capability strings
///
/// # Returns
/// * `Ok(())` if all capabilities are valid
/// * `Err(GhostSpeakError)` if any capability is invalid
pub fn validate_capabilities(capabilities: &[String]) -> Result<()> {
    // Check overall count
    validate_collection_size(capabilities.len(), MAX_CAPABILITIES_COUNT, "capabilities")?;

    // Validate each capability
    for capability in capabilities {
        require!(!capability.is_empty(), GhostSpeakError::InvalidInput);

        require!(capability.len() <= 64, GhostSpeakError::CapabilityTooLong);

        // Only allow alphanumeric, underscore, hyphen, and space
        require!(
            capability
                .chars()
                .all(|c| c.is_alphanumeric() || c == '_' || c == '-' || c == ' '),
            GhostSpeakError::InvalidInputFormat
        );
    }

    Ok(())
}

/// Validates rate limiting parameters to prevent abuse
///
/// # Arguments
/// * `current_time` - Current timestamp
/// * `last_action_time` - Timestamp of last action
/// * `min_interval` - Minimum interval between actions (seconds)
///
/// # Returns
/// * `Ok(())` if action is allowed
/// * `Err(GhostSpeakError)` if rate limit is exceeded
pub fn validate_rate_limit(
    current_time: i64,
    last_action_time: i64,
    min_interval: i64,
) -> Result<()> {
    let time_since_last = current_time
        .checked_sub(last_action_time)
        .ok_or(GhostSpeakError::ArithmeticUnderflow)?;

    require!(
        time_since_last >= min_interval,
        GhostSpeakError::RateLimitExceeded
    );

    Ok(())
}

/// Performs safe arithmetic operations with overflow protection
///
/// # Arguments
/// * `a` - First operand
/// * `b` - Second operand
/// * `operation` - Type of operation ("add", "sub", "mul", "div")
///
/// # Returns
/// * `Ok(result)` if operation succeeds
/// * `Err(GhostSpeakError)` if overflow/underflow occurs
pub fn safe_arithmetic(a: u64, b: u64, operation: &str) -> Result<u64> {
    match operation {
        "add" => a
            .checked_add(b)
            .ok_or(error!(GhostSpeakError::ArithmeticOverflow)),
        "sub" => a
            .checked_sub(b)
            .ok_or(error!(GhostSpeakError::ArithmeticUnderflow)),
        "mul" => a
            .checked_mul(b)
            .ok_or(error!(GhostSpeakError::ArithmeticOverflow)),
        "div" => {
            if b == 0 {
                return Err(error!(GhostSpeakError::DivisionByZero));
            }
            Ok(a / b) // Division cannot overflow in this context
        }
        _ => Err(error!(GhostSpeakError::InvalidParameter)),
    }
}

/// Validates percentage values (0-BASIS_POINTS_MAX basis points = 0-100%)
///
/// # Arguments
/// * `percentage` - Percentage in basis points (0-BASIS_POINTS_MAX)
/// * `field_name` - Name of the field for error context
///
/// # Returns
/// * `Ok(())` if percentage is valid
/// * `Err(GhostSpeakError)` if percentage is invalid
pub fn validate_percentage(percentage: u32, field_name: &str) -> Result<()> {
    require!(
        percentage <= crate::BASIS_POINTS_MAX,
        match field_name {
            "discount" => GhostSpeakError::InvalidDiscountPercentage,
            "royalty" => GhostSpeakError::InvalidRoyaltyPercentage,
            _ => GhostSpeakError::InvalidPercentage,
        }
    );

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_string_validation() {
        // Valid string
        assert!(validate_string_input("valid_name", "name", 50, false, false).is_ok());

        // Empty string not allowed
        assert!(validate_string_input("", "name", 50, false, false).is_err());

        // Too long
        assert!(validate_string_input("a".repeat(100).as_str(), "name", 50, false, false).is_err());

        // Invalid characters
        assert!(validate_string_input("test<script>", "name", 50, false, false).is_err());
    }

    #[test]
    fn test_payment_validation() {
        // Valid amount
        assert!(validate_payment_amount(1000000, "general").is_ok());

        // Too small
        assert!(validate_payment_amount(100, "general").is_err());

        // Too large
        assert!(validate_payment_amount(u64::MAX, "general").is_err());
    }

    #[test]
    fn test_safe_arithmetic() {
        // Valid addition
        assert_eq!(safe_arithmetic(5, 3, "add").unwrap(), 8);

        // Overflow addition
        assert!(safe_arithmetic(u64::MAX, 1, "add").is_err());

        // Valid subtraction
        assert_eq!(safe_arithmetic(10, 3, "sub").unwrap(), 7);

        // Underflow subtraction
        assert!(safe_arithmetic(3, 10, "sub").is_err());

        // Division by zero
        assert!(safe_arithmetic(10, 0, "div").is_err());
    }

    #[test]
    fn test_percentage_validation() {
        // Valid percentage
        assert!(validate_percentage(5000, "discount").is_ok()); // 50%

        // Invalid percentage (over 100%)
        assert!(validate_percentage(15000, "discount").is_err());
    }
}
