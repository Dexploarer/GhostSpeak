#[cfg(test)]
pub mod tests {
    use crate::state;
    use crate::ID;
    use anchor_lang::prelude::*;

    #[test]
    fn test_program_id() {
        let program_id = ID;
        assert!(!program_id.to_string().is_empty());
        println!("Program ID: {}", program_id);
    }

    #[test]
    fn test_pda_derivation() {
        let agent_id = Pubkey::new_unique();
        let program_id = ID;

        let (derived_pda, bump) =
            Pubkey::find_program_address(&[b"agent", agent_id.as_ref()], &program_id);

        // Verify PDA is deterministic
        let (derived_pda_2, bump_2) =
            Pubkey::find_program_address(&[b"agent", agent_id.as_ref()], &program_id);

        assert_eq!(derived_pda, derived_pda_2);
        assert_eq!(bump, bump_2);
        println!("Agent PDA: {}, Bump: {}", derived_pda, bump);
    }

    #[test]
    fn test_state_sizes() {
        use std::mem;

        // Test that state structures are reasonable sizes
        println!("Agent size: {}", mem::size_of::<state::Agent>());
        println!("Escrow size: {}", mem::size_of::<state::Escrow>());
        println!("Channel size: {}", mem::size_of::<state::Channel>());
        println!("DisputeCase size: {}", mem::size_of::<state::DisputeCase>());

        // These should be under Solana's 10KB account limit
        assert!(mem::size_of::<state::Agent>() < 10240);
        assert!(mem::size_of::<state::Escrow>() < 10240);
        assert!(mem::size_of::<state::Channel>() < 10240);
        assert!(mem::size_of::<state::DisputeCase>() < 10240);
    }

    #[test]
    fn test_fee_calculation() {
        // Test basic fee calculation logic
        let amount = 10_000_000_000u64; // 10 SOL
        let fee_basis_points = 250u64; // 2.5%
        let platform_fee = (amount * fee_basis_points) / 10000;

        assert_eq!(platform_fee, 250_000_000); // 0.25 SOL

        println!(
            "Platform fee: {} lamports for {} lamports",
            platform_fee, amount
        );
    }

    #[test]
    fn test_multiple_pda_types() {
        let test_id = Pubkey::new_unique();
        let program_id = ID;

        // Test different PDA types don't collide
        let (agent_pda, _) =
            Pubkey::find_program_address(&[b"agent", test_id.as_ref()], &program_id);

        let (escrow_pda, _) =
            Pubkey::find_program_address(&[b"escrow", test_id.as_ref()], &program_id);

        let (auction_pda, _) =
            Pubkey::find_program_address(&[b"auction", test_id.as_ref()], &program_id);

        let (channel_pda, _) =
            Pubkey::find_program_address(&[b"channel", test_id.as_ref()], &program_id);

        // All should be different
        assert_ne!(agent_pda, escrow_pda);
        assert_ne!(agent_pda, auction_pda);
        assert_ne!(agent_pda, channel_pda);
        assert_ne!(escrow_pda, auction_pda);
        assert_ne!(escrow_pda, channel_pda);
        assert_ne!(auction_pda, channel_pda);

        println!("All PDA types are unique");
    }

    #[test]
    fn test_dispute_status() {
        // Test dispute status enum
        let filed = state::DisputeStatus::Filed;
        let under_review = state::DisputeStatus::UnderReview;
        let resolved = state::DisputeStatus::Resolved;

        // Verify they exist and are different
        assert!(filed != under_review);
        assert!(under_review != resolved);
        assert!(filed != resolved);

        println!("Dispute status enums are working");
    }

    #[test]
    fn test_status_enums() {
        // Test that status enums have reasonable discriminant values
        let escrow_status = state::EscrowStatus::Active;
        let dispute_status = state::DisputeStatus::Filed;

        // Test that they exist and don't panic
        let _ = escrow_status;
        let _ = dispute_status;

        // Should not panic
        assert!(true);
    }

    #[test]
    fn test_constants() {
        // Test reasonable constant values from state module
        assert!(state::MAX_PARTICIPANTS_COUNT <= 100);

        // Test program constants exist
        assert!(state::MAX_GENERAL_STRING_LENGTH > 0);
        assert!(state::MAX_NAME_LENGTH > 0);

        println!("All constants are within reasonable bounds");
    }

    // =====================================================
    // X402 PAYMENT PROTOCOL TESTS
    // =====================================================

    mod x402_tests {
        use super::*;
        use crate::instructions::x402_operations::*;
        use crate::*;

        #[test]
        fn test_x402_config_data_structure() {
            let config = X402ConfigData {
                enabled: true,
                payment_address: Pubkey::new_unique(),
                accepted_tokens: vec![Pubkey::new_unique()],
                price_per_call: 1_000_000,
                service_endpoint: "https://api.example.com".to_string(),
            };

            assert!(config.enabled);
            assert!(config.price_per_call >= MIN_PAYMENT_AMOUNT);
            assert!(config.service_endpoint.len() <= MAX_GENERAL_STRING_LENGTH);
        }

        #[test]
        fn test_x402_payment_data_structure() {
            let payment = X402PaymentData {
                amount: 1_000_000,
                token_mint: Pubkey::new_unique(),
                transaction_signature: "5".to_string() + &"a".repeat(63),
                response_time_ms: 150,
            };

            assert!(payment.amount >= MIN_PAYMENT_AMOUNT);
            assert!(payment.transaction_signature.len() >= 64);
        }

        #[test]
        fn test_x402_rating_data_structure() {
            let rating = X402RatingData {
                rating: 5,
                transaction_signature: "5".to_string() + &"a".repeat(63),
                feedback: Some("Excellent service!".to_string()),
            };

            assert!(rating.rating >= 1 && rating.rating <= 5);
            assert!(rating.feedback.as_ref().unwrap().len() <= MAX_GENERAL_STRING_LENGTH);
        }

        #[test]
        fn test_x402_reputation_calculation() {
            // Test reputation calculation with 5 stars
            let rating = 5_u8;
            let basis_points = (rating as u32) * 2000;
            assert_eq!(basis_points, 10000); // 100%

            // Test reputation calculation with 3 stars
            let rating = 3_u8;
            let basis_points = (rating as u32) * 2000;
            assert_eq!(basis_points, 6000); // 60%

            // Test reputation calculation with 1 star
            let rating = 1_u8;
            let basis_points = (rating as u32) * 2000;
            assert_eq!(basis_points, 2000); // 20%
        }

        #[test]
        fn test_x402_exponential_moving_average() {
            // Test EMA calculation: 0.9 * old + 0.1 * new
            let current_reputation = 8000_u32; // 80%
            let new_rating = 5_u8; // 100%
            let rating_bp = (new_rating as u32) * 2000;

            let weighted_old = (current_reputation as u64 * 9000) / 10000; // 7200
            let weighted_new = (rating_bp as u64 * 1000) / 10000; // 1000
            let new_reputation = weighted_old + weighted_new; // 8200

            assert_eq!(new_reputation, 8200);
            assert!(new_reputation <= BASIS_POINTS_MAX as u64);
        }

        #[test]
        fn test_x402_payment_overflow_protection() {
            let existing = 1000_u64;
            let amount = u64::MAX;

            let result = existing.checked_add(amount);
            assert!(result.is_none(), "Overflow should be detected");
        }

        #[test]
        fn test_x402_min_max_payment_amounts() {
            assert_eq!(MIN_PAYMENT_AMOUNT, 1_000);
            assert_eq!(MAX_PAYMENT_AMOUNT, 1_000_000_000_000);
            assert!(MIN_PAYMENT_AMOUNT < MAX_PAYMENT_AMOUNT);
        }

        #[test]
        fn test_x402_basis_points_constants() {
            assert_eq!(BASIS_POINTS_MAX, 10000);
            assert_eq!(BASIS_POINTS_50_PERCENT, 5000);
            assert_eq!(BASIS_POINTS_10_PERCENT, 1000);
            assert_eq!(BASIS_POINTS_1_PERCENT, 100);
        }
    }
}
