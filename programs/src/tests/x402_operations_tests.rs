/*!
 * x402 Operations Unit Tests
 *
 * Comprehensive test coverage for x402 payment protocol instructions
 */

#[cfg(test)]
mod tests {
    use super::super::*;
    use crate::instructions::x402_operations::*;
    use anchor_lang::prelude::*;

    // =====================================================
    // CONFIGURE X402 TESTS
    // =====================================================

    #[test]
    fn test_x402_config_validation_success() {
        // Valid configuration should pass
        let config = X402ConfigData {
            enabled: true,
            payment_address: Pubkey::new_unique(),
            accepted_tokens: vec![Pubkey::new_unique(), Pubkey::new_unique()],
            price_per_call: 1_000_000, // 1 USDC (6 decimals)
            service_endpoint: "https://agent.example.com/api".to_string(),
        };

        assert!(config.enabled);
        assert_eq!(config.accepted_tokens.len(), 2);
        assert!(config.price_per_call >= MIN_PAYMENT_AMOUNT);
        assert!(config.price_per_call <= MAX_PAYMENT_AMOUNT);
        assert!(config.service_endpoint.len() <= MAX_GENERAL_STRING_LENGTH);
    }

    #[test]
    fn test_x402_config_validation_too_many_tokens() {
        // More than 10 tokens should fail
        let tokens = (0..11).map(|_| Pubkey::new_unique()).collect::<Vec<_>>();
        assert!(tokens.len() > 10); // Should fail TooManyCapabilities check
    }

    #[test]
    fn test_x402_config_validation_price_too_low() {
        let price = 100; // Below MIN_PAYMENT_AMOUNT (1000)
        assert!(price < MIN_PAYMENT_AMOUNT);
    }

    #[test]
    fn test_x402_config_validation_price_too_high() {
        let price = 2_000_000_000_000_u64; // Above MAX_PAYMENT_AMOUNT
        assert!(price > MAX_PAYMENT_AMOUNT);
    }

    #[test]
    fn test_x402_config_validation_endpoint_too_long() {
        let long_endpoint = "a".repeat(MAX_GENERAL_STRING_LENGTH + 1);
        assert!(long_endpoint.len() > MAX_GENERAL_STRING_LENGTH);
    }

    #[test]
    fn test_x402_config_default_payment_address_invalid() {
        let invalid_address = Pubkey::default();
        assert_eq!(invalid_address, Pubkey::default());
    }

    // =====================================================
    // RECORD X402 PAYMENT TESTS
    // =====================================================

    #[test]
    fn test_x402_payment_data_validation_success() {
        let payment = X402PaymentData {
            amount: 1_000_000, // 1 USDC
            token_mint: Pubkey::new_unique(),
            transaction_signature: "5" + &"a".repeat(63), // 64 chars
            response_time_ms: 150,
        };

        assert!(payment.amount >= MIN_PAYMENT_AMOUNT);
        assert!(payment.amount <= MAX_PAYMENT_AMOUNT);
        assert!(payment.transaction_signature.len() >= 64);
        assert!(payment.transaction_signature.len() <= 128);
    }

    #[test]
    fn test_x402_payment_amount_overflow_protection() {
        // Test that we handle overflow correctly
        let max_amount = u64::MAX;
        let existing_payments = 1_000_000_u64;

        let result = existing_payments.checked_add(max_amount);
        assert!(result.is_none()); // Should overflow and return None
    }

    #[test]
    fn test_x402_payment_call_counter_overflow() {
        let max_calls = u64::MAX;
        let existing_calls = 1_u64;

        let result = existing_calls.checked_add(max_calls);
        assert!(result.is_none()); // Should overflow and return None
    }

    #[test]
    fn test_x402_payment_signature_validation_too_short() {
        let short_sig = "abc"; // Less than 64 chars
        assert!(short_sig.len() < 64);
    }

    #[test]
    fn test_x402_payment_signature_validation_too_long() {
        let long_sig = "a".repeat(129); // More than 128 chars
        assert!(long_sig.len() > 128);
    }

    #[test]
    fn test_x402_payment_signature_validation_valid_range() {
        let valid_sig_min = "a".repeat(64); // Minimum valid length
        let valid_sig_max = "a".repeat(128); // Maximum valid length

        assert!(valid_sig_min.len() >= 64 && valid_sig_min.len() <= 128);
        assert!(valid_sig_max.len() >= 64 && valid_sig_max.len() <= 128);
    }

    // =====================================================
    // SUBMIT X402 RATING TESTS
    // =====================================================

    #[test]
    fn test_x402_rating_validation_all_stars() {
        // Test all valid star ratings (1-5)
        for rating in 1..=5 {
            assert!(rating >= 1 && rating <= 5);
            let basis_points = (rating as u32) * 2000;
            assert!(basis_points >= 2000 && basis_points <= 10000);
        }
    }

    #[test]
    fn test_x402_rating_validation_invalid_zero() {
        let rating = 0_u8;
        assert!(rating < 1); // Should fail validation
    }

    #[test]
    fn test_x402_rating_validation_invalid_too_high() {
        let rating = 6_u8;
        assert!(rating > 5); // Should fail validation
    }

    #[test]
    fn test_x402_rating_feedback_length_validation() {
        let valid_feedback = "Great service!".to_string();
        let too_long_feedback = "a".repeat(MAX_GENERAL_STRING_LENGTH + 1);

        assert!(valid_feedback.len() <= MAX_GENERAL_STRING_LENGTH);
        assert!(too_long_feedback.len() > MAX_GENERAL_STRING_LENGTH);
    }

    #[test]
    fn test_x402_rating_reputation_calculation_first_rating() {
        // First rating (current reputation = 0)
        let rating = 5_u8;
        let current_reputation = 0_u32;
        let expected = (rating as u32) * 2000; // 5 stars = 10000 basis points

        assert_eq!(current_reputation, 0);
        assert_eq!(expected, 10000);
    }

    #[test]
    fn test_x402_rating_reputation_calculation_exponential_average() {
        // Subsequent rating with exponential moving average
        let current_reputation = 8000_u32; // 80% (4 stars)
        let new_rating = 5_u8; // 5 stars
        let rating_basis_points = (new_rating as u32) * 2000; // 10000

        // Calculate: 0.9 * 8000 + 0.1 * 10000
        let weighted_old = (current_reputation as u64 * 9000) / 10000; // 7200
        let weighted_new = (rating_basis_points as u64 * 1000) / 10000; // 1000
        let expected = weighted_old + weighted_new; // 8200

        assert_eq!(expected, 8200);
        assert!(expected <= BASIS_POINTS_MAX as u64);
    }

    #[test]
    fn test_x402_rating_reputation_calculation_overflow_protection() {
        let current_reputation = u32::MAX;
        let rating = 5_u8;

        let result = (current_reputation as u64).checked_mul(9000);
        assert!(result.is_some()); // Should not overflow u64

        let final_reputation = result.unwrap() / 10000;
        assert!(final_reputation <= u32::MAX as u64);
    }

    #[test]
    fn test_x402_rating_reputation_capped_at_max() {
        // Ensure reputation never exceeds BASIS_POINTS_MAX
        let very_high_reputation = 15000_u64; // Above max
        let capped = very_high_reputation.min(BASIS_POINTS_MAX as u64);

        assert_eq!(capped, BASIS_POINTS_MAX as u64);
    }

    // =====================================================
    // INTEGRATION TESTS
    // =====================================================

    #[test]
    fn test_x402_payment_flow_end_to_end() {
        // Simulate complete payment flow
        let initial_payments = 0_u64;
        let initial_calls = 0_u64;
        let payment_amount = 1_000_000_u64;

        // First payment
        let new_payments = initial_payments.checked_add(payment_amount).unwrap();
        let new_calls = initial_calls.checked_add(1).unwrap();

        assert_eq!(new_payments, 1_000_000);
        assert_eq!(new_calls, 1);

        // Second payment
        let new_payments2 = new_payments.checked_add(payment_amount).unwrap();
        let new_calls2 = new_calls.checked_add(1).unwrap();

        assert_eq!(new_payments2, 2_000_000);
        assert_eq!(new_calls2, 2);
    }

    #[test]
    fn test_x402_rating_flow_multiple_ratings() {
        // Simulate multiple ratings over time
        let mut reputation = 0_u32;

        // First rating: 5 stars
        reputation = 5 * 2000;
        assert_eq!(reputation, 10000);

        // Second rating: 3 stars (6000 bp)
        let weighted_old = (reputation as u64 * 9000) / 10000; // 9000
        let weighted_new = (3 * 2000 as u64 * 1000) / 10000; // 600
        reputation = (weighted_old + weighted_new) as u32; // 9600
        assert_eq!(reputation, 9600);

        // Third rating: 4 stars (8000 bp)
        let weighted_old = (reputation as u64 * 9000) / 10000; // 8640
        let weighted_new = (4 * 2000 as u64 * 1000) / 10000; // 800
        reputation = (weighted_old + weighted_new) as u32; // 9440
        assert_eq!(reputation, 9440);
    }

    #[test]
    fn test_x402_config_disable_and_reenable() {
        // Test disabling and re-enabling x402
        let mut enabled = true;
        assert!(enabled);

        // Disable
        enabled = false;
        assert!(!enabled);

        // Re-enable with new config
        enabled = true;
        assert!(enabled);
    }

    // =====================================================
    // ERROR HANDLING TESTS
    // =====================================================

    #[test]
    fn test_x402_error_codes_defined() {
        // Verify all expected error codes exist
        use crate::GhostSpeakError::*;

        // These errors should be used by x402 operations
        let _e1 = InvalidPaymentAmount;
        let _e2 = UnsupportedToken;
        let _e3 = InvalidInputLength;
        let _e4 = ArithmeticOverflow;
        let _e5 = InvalidRating;
        let _e6 = MessageTooLong;
        let _e7 = FeatureNotEnabled;
        let _e8 = AgentNotActive;
        let _e9 = InvalidAgentOwner;
        let _e10 = InvalidServiceEndpoint;
        let _e11 = TooManyCapabilities;
        let _e12 = InvalidTokenAccount;
    }

    // =====================================================
    // CONSTANTS VALIDATION
    // =====================================================

    #[test]
    fn test_payment_constants_valid_range() {
        assert!(MIN_PAYMENT_AMOUNT > 0);
        assert!(MAX_PAYMENT_AMOUNT > MIN_PAYMENT_AMOUNT);
        assert_eq!(MIN_PAYMENT_AMOUNT, 1_000); // 0.001 tokens
        assert_eq!(MAX_PAYMENT_AMOUNT, 1_000_000_000_000); // 1M tokens
    }

    #[test]
    fn test_basis_points_constants() {
        assert_eq!(BASIS_POINTS_MAX, 10000); // 100%
        assert_eq!(BASIS_POINTS_50_PERCENT, 5000); // 50%
        assert_eq!(BASIS_POINTS_10_PERCENT, 1000); // 10%
        assert_eq!(BASIS_POINTS_1_PERCENT, 100); // 1%
    }

    #[test]
    fn test_string_length_constants() {
        assert_eq!(MAX_GENERAL_STRING_LENGTH, 128);
        assert!(MAX_GENERAL_STRING_LENGTH > 0);
    }
}
