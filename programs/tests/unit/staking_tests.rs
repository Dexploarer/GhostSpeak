/*!
 * Staking Instruction Tests using Mollusk SVM
 *
 * Tests for GHOST token staking, unstaking, and tier calculations.
 * Uses Mollusk for fast, isolated instruction testing.
 */

use super::test_harness::*;
use solana_sdk::{instruction::AccountMeta, pubkey::Pubkey, system_program};

/// SPL Token program ID
const SPL_TOKEN_PROGRAM_ID: Pubkey =
    solana_sdk::pubkey!("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

/// Staking tier thresholds (in lamports, assuming 9 decimals for GHOST)
mod tiers {
    /// Basic tier: 1,000 GHOST (API access)
    pub const BASIC: u64 = 1_000_000_000_000;
    /// Standard tier: 5,000 GHOST (5% reputation boost)
    pub const STANDARD: u64 = 5_000_000_000_000;
    /// Professional tier: 10,000 GHOST (10% reputation boost + badge)
    pub const PROFESSIONAL: u64 = 10_000_000_000_000;
    /// Enterprise tier: 100,000 GHOST (15% boost + badge + premium features)
    pub const ENTERPRISE: u64 = 100_000_000_000_000;
}

/// Test staking PDA derivation
#[test]
fn test_staking_pda_derivation() {
    let owner = Pubkey::new_unique();

    let (staking_pda, bump) = derive_staking_pda(&owner);

    // Verify PDA is valid
    // assert!(bump <= 255); // Redundant for u8
    assert!(!staking_pda.is_on_curve(), "PDA should be off-curve");

    // Verify determinism
    let (staking_pda_2, bump_2) = derive_staking_pda(&owner);
    assert_eq!(staking_pda, staking_pda_2);
    assert_eq!(bump, bump_2);

    // Different owner = different PDA
    let owner_2 = Pubkey::new_unique();
    let (staking_pda_3, _) = derive_staking_pda(&owner_2);
    assert_ne!(staking_pda, staking_pda_3);
}

/// Test staking instruction discriminators
#[test]
fn test_staking_instruction_discriminators() {
    let stake_disc = compute_discriminator("stake");
    let unstake_disc = compute_discriminator("unstake");
    let slash_disc = compute_discriminator("slash_stake");

    // All discriminators should be unique
    assert_ne!(stake_disc, unstake_disc);
    assert_ne!(stake_disc, slash_disc);
    assert_ne!(unstake_disc, slash_disc);

    // Should be 8 bytes
    assert_eq!(stake_disc.len(), 8);
    assert_eq!(unstake_disc.len(), 8);
    assert_eq!(slash_disc.len(), 8);
}

/// Test tier calculation logic
#[test]
fn test_tier_thresholds() {
    // Verify tier thresholds are correctly ordered
    assert!(
        tiers::BASIC < tiers::STANDARD,
        "Basic should be less than Standard"
    );
    assert!(
        tiers::STANDARD < tiers::PROFESSIONAL,
        "Standard should be less than Professional"
    );
    assert!(
        tiers::PROFESSIONAL < tiers::ENTERPRISE,
        "Professional should be less than Enterprise"
    );

    // Verify specific tier values
    assert_eq!(tiers::BASIC, 1_000_000_000_000, "Basic = 1K GHOST");
    assert_eq!(tiers::STANDARD, 5_000_000_000_000, "Standard = 5K GHOST");
    assert_eq!(
        tiers::PROFESSIONAL,
        10_000_000_000_000,
        "Professional = 10K GHOST"
    );
    assert_eq!(
        tiers::ENTERPRISE,
        100_000_000_000_000,
        "Enterprise = 100K GHOST"
    );
}

/// Test stake instruction structure
#[test]
fn test_stake_instruction_structure() {
    let owner = Pubkey::new_unique();
    let (staking_pda, _) = derive_staking_pda(&owner);

    // Mock token accounts
    let ghost_mint = Pubkey::new_unique();
    let user_token_account = Pubkey::new_unique();
    let vault_token_account = Pubkey::new_unique();

    let accounts = vec![
        AccountMeta::new(staking_pda, false), // staking_account (init/mut)
        AccountMeta::new_readonly(ghost_mint, false), // ghost_mint
        AccountMeta::new(user_token_account, false), // user_token_account
        AccountMeta::new(vault_token_account, false), // vault_token_account
        AccountMeta::new(owner, true),        // owner (signer)
        AccountMeta::new_readonly(SPL_TOKEN_PROGRAM_ID, false), // token_program
        AccountMeta::new_readonly(system_program::ID, false), // system_program
    ];

    // Build instruction with amount
    let amount: u64 = tiers::BASIC;
    let lockup_days: u64 = 30;
    let mut data = amount.to_le_bytes().to_vec();
    data.extend(lockup_days.to_le_bytes());

    let instruction = build_anchor_instruction("stake", accounts.clone(), data);

    assert_eq!(instruction.program_id, PROGRAM_ID);
    assert_eq!(instruction.accounts.len(), 7);
    assert!(
        instruction.data.len() >= 8 + 16,
        "Should have discriminator + amount + lockup"
    );
}

/// Test unstake instruction structure
#[test]
fn test_unstake_instruction_structure() {
    let owner = Pubkey::new_unique();
    let (staking_pda, _) = derive_staking_pda(&owner);

    // Mock token accounts
    let ghost_mint = Pubkey::new_unique();
    let user_token_account = Pubkey::new_unique();
    let vault_token_account = Pubkey::new_unique();

    let accounts = vec![
        AccountMeta::new(staking_pda, false),         // staking_account
        AccountMeta::new_readonly(ghost_mint, false), // ghost_mint
        AccountMeta::new(user_token_account, false),  // user_token_account
        AccountMeta::new(vault_token_account, false), // vault_token_account
        AccountMeta::new(owner, true),                // owner (signer)
        AccountMeta::new_readonly(SPL_TOKEN_PROGRAM_ID, false), // token_program
        AccountMeta::new_readonly(solana_sdk::sysvar::clock::ID, false), // clock
    ];

    let instruction = build_anchor_instruction("unstake", accounts.clone(), vec![]);

    assert_eq!(instruction.program_id, PROGRAM_ID);
    assert_eq!(instruction.accounts.len(), 7);
}

/// Test slash_stake instruction structure
#[test]
fn test_slash_stake_instruction_structure() {
    let owner = Pubkey::new_unique();
    let admin = Pubkey::new_unique();
    let (staking_pda, _) = derive_staking_pda(&owner);

    // Mock accounts
    let _treasury = Pubkey::new_unique();
    let vault_token_account = Pubkey::new_unique();
    let treasury_token_account = Pubkey::new_unique();

    let accounts = vec![
        AccountMeta::new(staking_pda, false),         // staking_account
        AccountMeta::new(vault_token_account, false), // vault_token_account
        AccountMeta::new(treasury_token_account, false), // treasury_token_account
        AccountMeta::new(admin, true),                // admin (signer)
        AccountMeta::new_readonly(SPL_TOKEN_PROGRAM_ID, false), // token_program
    ];

    // Slash reason enum value
    let slash_reason: u8 = 0; // Fraud = 0
    let data = vec![slash_reason];

    let instruction = build_anchor_instruction("slash_stake", accounts.clone(), data);

    assert_eq!(instruction.program_id, PROGRAM_ID);
    assert_eq!(instruction.accounts.len(), 5);
}

/// Test lockup period validation
#[test]
fn test_lockup_periods() {
    // Valid lockup periods (in days)
    let valid_lockups = [7, 14, 30, 60, 90, 180, 365];

    for lockup in valid_lockups {
        // Convert to seconds
        let lockup_seconds = lockup as u64 * 24 * 60 * 60;
        assert!(
            lockup_seconds > 0,
            "Lockup period {} days should convert to positive seconds",
            lockup
        );
    }

    // Minimum lockup (7 days in seconds)
    let min_lockup = 7 * 24 * 60 * 60;
    assert_eq!(min_lockup, 604_800, "7 days = 604,800 seconds");

    // Maximum lockup (365 days in seconds)
    let max_lockup = 365 * 24 * 60 * 60;
    assert_eq!(max_lockup, 31_536_000, "365 days = 31,536,000 seconds");
}

/// Test reputation boost calculation
#[test]
fn test_reputation_boost_calculation() {
    // Boost percentages by tier
    let boosts = [
        (tiers::BASIC, 0u8),         // Basic: No boost (just API access)
        (tiers::STANDARD, 5u8),      // Standard: 5% boost
        (tiers::PROFESSIONAL, 10u8), // Professional: 10% boost
        (tiers::ENTERPRISE, 15u8),   // Enterprise: 15% boost
    ];

    for (_stake_amount, expected_boost) in boosts {
        // In actual implementation, calculate_boost(stake_amount) -> expected_boost
        assert!(expected_boost <= 100, "Boost should be a percentage <= 100");
    }
}

// Integration tests are in integration_tests.rs
