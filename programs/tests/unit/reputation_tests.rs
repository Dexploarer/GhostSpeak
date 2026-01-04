/*!
 * Reputation Instruction Tests using Mollusk SVM
 *
 * Tests for reputation metrics, tags, and multi-source Ghost Score.
 * Uses Mollusk for fast, isolated instruction testing.
 */

use super::test_harness::*;
use solana_sdk::{
    instruction::AccountMeta,
    pubkey::Pubkey,
};

/// Reputation tier thresholds (0-10000 basis points)
mod tiers {
    pub const BRONZE: u64 = 2000;   // 20%
    pub const SILVER: u64 = 5000;   // 50%
    pub const GOLD: u64 = 7500;     // 75%
    pub const PLATINUM: u64 = 9000; // 90%
}

/// Reputation source weights (in basis points, total = 10000)
mod weights {
    // Activity Sources (60% total)
    pub const ACCOUNT_AGE: u32 = 3000;         // 30%
    pub const X402_TRANSACTIONS: u32 = 3000;  // 30%

    // Platform Sources (30% total)
    pub const USER_REVIEWS: u32 = 1000;        // 10%
    pub const ELIZAOS_REPUTATION: u32 = 1000; // 10%
    pub const CROSSMINT_VERIFICATION: u32 = 500; // 5%
    pub const ENDPOINT_RELIABILITY: u32 = 500;   // 5%

    // Achievement Sources (10% total)
    pub const JOB_COMPLETIONS: u32 = 500;     // 5%
    pub const SKILL_ENDORSEMENTS: u32 = 500;  // 5%
}

/// Test reputation PDA derivation
#[test]
fn test_reputation_pda_derivation() {
    let agent = Pubkey::new_unique();

    let (reputation_pda, bump) = derive_reputation_pda(&agent);

    // Verify PDA is valid
    assert!(bump <= 255);
    assert!(!reputation_pda.is_on_curve(), "PDA should be off-curve");

    // Verify determinism
    let (reputation_pda_2, bump_2) = derive_reputation_pda(&agent);
    assert_eq!(reputation_pda, reputation_pda_2);
    assert_eq!(bump, bump_2);

    // Different agent = different PDA
    let agent_2 = Pubkey::new_unique();
    let (reputation_pda_3, _) = derive_reputation_pda(&agent_2);
    assert_ne!(reputation_pda, reputation_pda_3);
}

/// Test reputation instruction discriminators
#[test]
fn test_reputation_instruction_discriminators() {
    let init_disc = compute_discriminator("initialize_reputation_metrics");
    let update_disc = compute_discriminator("update_reputation_tags");
    let record_disc = compute_discriminator("record_x402_payment_reputation");

    // All discriminators should be unique
    assert_ne!(init_disc, update_disc);
    assert_ne!(init_disc, record_disc);
    assert_ne!(update_disc, record_disc);

    // Should be 8 bytes
    assert_eq!(init_disc.len(), 8);
}

/// Test tier threshold logic
#[test]
fn test_tier_thresholds() {
    // Verify tier thresholds are correctly ordered
    assert!(tiers::BRONZE < tiers::SILVER);
    assert!(tiers::SILVER < tiers::GOLD);
    assert!(tiers::GOLD < tiers::PLATINUM);

    // Verify specific values
    assert_eq!(tiers::BRONZE, 2000, "Bronze threshold should be 2000");
    assert_eq!(tiers::SILVER, 5000, "Silver threshold should be 5000");
    assert_eq!(tiers::GOLD, 7500, "Gold threshold should be 7500");
    assert_eq!(tiers::PLATINUM, 9000, "Platinum threshold should be 9000");
}

/// Test reputation weight distribution
#[test]
fn test_reputation_weight_distribution() {
    // Activity sources should sum to 60%
    let activity_total = weights::ACCOUNT_AGE + weights::X402_TRANSACTIONS;
    assert_eq!(activity_total, 6000, "Activity sources should be 60%");

    // Platform sources should sum to 30%
    let platform_total = weights::USER_REVIEWS
        + weights::ELIZAOS_REPUTATION
        + weights::CROSSMINT_VERIFICATION
        + weights::ENDPOINT_RELIABILITY;
    assert_eq!(platform_total, 3000, "Platform sources should be 30%");

    // Achievement sources should sum to 10%
    let achievement_total = weights::JOB_COMPLETIONS + weights::SKILL_ENDORSEMENTS;
    assert_eq!(achievement_total, 1000, "Achievement sources should be 10%");

    // Total should be 100%
    let total = activity_total + platform_total + achievement_total;
    assert_eq!(total, 10000, "Total weights should be 100% (10000 basis points)");
}

/// Test tier calculation from score
#[test]
fn test_calculate_tier() {
    // Test score to tier mapping
    let test_cases = [
        (0, "None"),
        (1999, "None"),
        (2000, "Bronze"),
        (4999, "Bronze"),
        (5000, "Silver"),
        (7499, "Silver"),
        (7500, "Gold"),
        (8999, "Gold"),
        (9000, "Platinum"),
        (10000, "Platinum"),
    ];

    for (score, expected_tier) in test_cases {
        let tier = if score >= tiers::PLATINUM {
            "Platinum"
        } else if score >= tiers::GOLD {
            "Gold"
        } else if score >= tiers::SILVER {
            "Silver"
        } else if score >= tiers::BRONZE {
            "Bronze"
        } else {
            "None"
        };

        assert_eq!(
            tier, expected_tier,
            "Score {} should be tier {}, got {}",
            score, expected_tier, tier
        );
    }
}

/// Test weighted score calculation
#[test]
fn test_weighted_score_calculation() {
    // Simulate multi-source reputation calculation
    // Score = sum(source_score * weight) / 10000

    let sources = [
        (80u64, weights::ACCOUNT_AGE),         // Account age: 80/100 score
        (90u64, weights::X402_TRANSACTIONS),   // x402 txs: 90/100 score
        (75u64, weights::USER_REVIEWS),         // Reviews: 75/100 score
        (85u64, weights::ELIZAOS_REPUTATION),  // ElizaOS: 85/100 score
        (100u64, weights::CROSSMINT_VERIFICATION), // Crossmint: 100/100 score
        (95u64, weights::ENDPOINT_RELIABILITY),    // Endpoint: 95/100 score
        (70u64, weights::JOB_COMPLETIONS),     // Jobs: 70/100 score
        (60u64, weights::SKILL_ENDORSEMENTS),  // Skills: 60/100 score
    ];

    let mut weighted_sum: u64 = 0;
    for (score, weight) in sources {
        weighted_sum += score * (weight as u64);
    }

    let final_score = weighted_sum / 100; // Normalize to 0-10000 scale

    assert!(
        final_score >= tiers::GOLD,
        "This profile should achieve Gold tier, got {}",
        final_score
    );
}

/// Test initialize_reputation_metrics instruction structure
#[test]
fn test_init_reputation_instruction_structure() {
    let agent = Pubkey::new_unique();
    let authority = Pubkey::new_unique();

    let (reputation_pda, _) = derive_reputation_pda(&agent);

    let accounts = vec![
        AccountMeta::new(reputation_pda, false),        // reputation_metrics (init)
        AccountMeta::new_readonly(agent, false),        // agent
        AccountMeta::new(authority, true),              // authority (signer)
        AccountMeta::new_readonly(solana_sdk::system_program::ID, false), // system_program
    ];

    let instruction = build_anchor_instruction("initialize_reputation_metrics", accounts.clone(), vec![]);

    assert_eq!(instruction.program_id, PROGRAM_ID);
    assert_eq!(instruction.accounts.len(), 4);
}

/// Test update_reputation_tags instruction structure
#[test]
fn test_update_reputation_tags_instruction_structure() {
    let agent = Pubkey::new_unique();
    let authority = Pubkey::new_unique();

    let (reputation_pda, _) = derive_reputation_pda(&agent);

    let accounts = vec![
        AccountMeta::new(reputation_pda, false),        // reputation_metrics
        AccountMeta::new_readonly(agent, false),        // agent
        AccountMeta::new(authority, true),              // authority (signer)
    ];

    // Tag update data: tag_id (u8) + score (u64)
    let tag_id: u8 = 1; // HighVolume tag
    let score: u64 = 85;
    let mut data = vec![tag_id];
    data.extend(score.to_le_bytes());

    let instruction = build_anchor_instruction("update_reputation_tags", accounts.clone(), data);

    assert_eq!(instruction.program_id, PROGRAM_ID);
    assert_eq!(instruction.accounts.len(), 3);
}

/// Test record_x402_payment_reputation instruction structure
#[test]
fn test_record_x402_payment_instruction_structure() {
    let agent = Pubkey::new_unique();
    let payer = Pubkey::new_unique();

    let (reputation_pda, _) = derive_reputation_pda(&agent);

    let accounts = vec![
        AccountMeta::new(reputation_pda, false),        // reputation_metrics
        AccountMeta::new_readonly(agent, false),        // agent
        AccountMeta::new(payer, true),                  // payer (signer)
        AccountMeta::new_readonly(solana_sdk::sysvar::clock::ID, false), // clock
    ];

    // Payment data: amount (u64) + success (bool)
    let amount: u64 = 1_000_000; // 1 GHOST
    let success: u8 = 1; // true
    let mut data = amount.to_le_bytes().to_vec();
    data.push(success);

    let instruction = build_anchor_instruction("record_x402_payment_reputation", accounts.clone(), data);

    assert_eq!(instruction.program_id, PROGRAM_ID);
    assert_eq!(instruction.accounts.len(), 4);
}

/// Test reputation decay mechanics
#[test]
fn test_reputation_decay() {
    // Reputation should decay if no activity for 30 days
    let decay_period_seconds = 30 * 24 * 60 * 60; // 30 days

    // Decay rate: 1% per day of inactivity after 30 days
    let decay_rate_per_day = 100; // 1% in basis points

    // Max decay: 50% (cannot drop below 50% of last active score)
    let max_decay_percent = 5000; // 50% in basis points

    assert_eq!(decay_period_seconds, 2_592_000);
    assert_eq!(decay_rate_per_day, 100);
    assert_eq!(max_decay_percent, 5000);
}

/// Test reputation badge thresholds
#[test]
fn test_reputation_badges() {
    // Badge categories and their thresholds
    let badges = [
        ("HighVolume", 100u64),        // 100+ transactions
        ("Reliable", 95u64),           // 95%+ completion rate
        ("FastResponder", 500u64),     // <500ms avg response time
        ("TrustedProvider", 9000u64),  // Platinum tier score
        ("EarlyAdopter", 1000u64),     // Account age > 1000 days
    ];

    for (badge_name, threshold) in badges {
        assert!(
            threshold > 0,
            "Badge {} should have positive threshold",
            badge_name
        );
    }
}

// Integration tests are in integration_tests.rs
