/*!
 * Privacy State Module
 *
 * Privacy tiers and selective disclosure for agent reputation.
 * Provides configurable privacy controls without requiring zero-knowledge proofs.
 */

use anchor_lang::prelude::*;

// ============================================================================
// Privacy Mode
// ============================================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum PrivacyMode {
    Public,        // Show exact score: 847/1000
    TierOnly,      // Show tier: "Gold Tier"
    RangeOnly,     // Show range: "800-900"
    Private,       // Show: "Score Hidden"
    Custom,        // Selective disclosure per metric
}

// ============================================================================
// Visibility Levels
// ============================================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum VisibilityLevel {
    Public,           // Anyone can see
    TierOnly,         // Show tier/range only
    AuthorizedOnly,   // Require explicit permission
    Hidden,           // Never show
}

// ============================================================================
// Metric Visibility Configuration
// ============================================================================

#[account]
pub struct MetricVisibility {
    pub ghost_score: VisibilityLevel,
    pub jobs_completed: VisibilityLevel,
    pub success_rate: VisibilityLevel,
    pub response_time: VisibilityLevel,
    pub dispute_count: VisibilityLevel,
    pub satisfaction_rating: VisibilityLevel,
    pub client_feedback_count: VisibilityLevel,
    pub total_earnings: VisibilityLevel,
}

impl Default for MetricVisibility {
    fn default() -> Self {
        Self {
            ghost_score: VisibilityLevel::Public,
            jobs_completed: VisibilityLevel::Public,
            success_rate: VisibilityLevel::Public,
            response_time: VisibilityLevel::Public,
            dispute_count: VisibilityLevel::TierOnly,
            satisfaction_rating: VisibilityLevel::Public,
            client_feedback_count: VisibilityLevel::Public,
            total_earnings: VisibilityLevel::Hidden,
        }
    }
}

// ============================================================================
// Privacy Settings Account
// ============================================================================

#[account]
pub struct PrivacySettings {
    pub agent: Pubkey,
    pub mode: PrivacyMode,
    pub metric_visibility: MetricVisibility,
    pub authorized_viewers: Vec<Pubkey>,
    pub blocked_viewers: Vec<Pubkey>,
    pub auto_grant_clients: bool,
    pub auto_grant_after_payment: bool,
    pub access_grants_count: u32,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl PrivacySettings {
    pub const MAX_AUTHORIZED: usize = 100;
    pub const MAX_BLOCKED: usize = 50;

    pub fn space() -> usize {
        8 +  // discriminator
        32 + // agent
        1 +  // mode
        8 +  // metric_visibility (8 fields * 1 byte each)
        4 + (32 * Self::MAX_AUTHORIZED) + // authorized_viewers
        4 + (32 * Self::MAX_BLOCKED) +    // blocked_viewers
        1 +  // auto_grant_clients
        1 +  // auto_grant_after_payment
        4 +  // access_grants_count
        8 +  // created_at
        8 +  // updated_at
        1    // bump
    }
}

// ============================================================================
// Privacy Access Grant
// ============================================================================

#[account]
pub struct PrivacyAccessGrant {
    pub agent: Pubkey,
    pub viewer: Pubkey,
    pub granted_at: i64,
    pub expires_at: Option<i64>,
    pub is_revoked: bool,
    pub grant_reason: String,
    pub bump: u8,
}

impl PrivacyAccessGrant {
    pub fn space() -> usize {
        8 +   // discriminator
        32 +  // agent
        32 +  // viewer
        8 +   // granted_at
        9 +   // expires_at (1 + 8)
        1 +   // is_revoked
        4 + 128 + // grant_reason (max 128 chars)
        1     // bump
    }
}

// ============================================================================
// Privacy Presets
// ============================================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub enum PrivacyPreset {
    Conservative,  // Minimal disclosure
    Balanced,      // Show tiers, reveal to clients
    Open,          // Maximum transparency
}

impl PrivacyPreset {
    pub fn to_settings(&self) -> (PrivacyMode, MetricVisibility, bool) {
        match self {
            PrivacyPreset::Conservative => (
                PrivacyMode::TierOnly,
                MetricVisibility {
                    ghost_score: VisibilityLevel::TierOnly,
                    jobs_completed: VisibilityLevel::TierOnly,
                    success_rate: VisibilityLevel::TierOnly,
                    response_time: VisibilityLevel::Hidden,
                    dispute_count: VisibilityLevel::Hidden,
                    satisfaction_rating: VisibilityLevel::TierOnly,
                    client_feedback_count: VisibilityLevel::Public,
                    total_earnings: VisibilityLevel::Hidden,
                },
                false, // auto_grant_clients
            ),
            PrivacyPreset::Balanced => (
                PrivacyMode::Custom,
                MetricVisibility {
                    ghost_score: VisibilityLevel::TierOnly,
                    jobs_completed: VisibilityLevel::Public,
                    success_rate: VisibilityLevel::Public,
                    response_time: VisibilityLevel::Public,
                    dispute_count: VisibilityLevel::AuthorizedOnly,
                    satisfaction_rating: VisibilityLevel::Public,
                    client_feedback_count: VisibilityLevel::Public,
                    total_earnings: VisibilityLevel::Hidden,
                },
                true, // auto_grant_clients
            ),
            PrivacyPreset::Open => (
                PrivacyMode::Public,
                MetricVisibility {
                    ghost_score: VisibilityLevel::Public,
                    jobs_completed: VisibilityLevel::Public,
                    success_rate: VisibilityLevel::Public,
                    response_time: VisibilityLevel::Public,
                    dispute_count: VisibilityLevel::Public,
                    satisfaction_rating: VisibilityLevel::Public,
                    client_feedback_count: VisibilityLevel::Public,
                    total_earnings: VisibilityLevel::TierOnly,
                },
                true, // auto_grant_clients
            ),
        }
    }
}

// ============================================================================
// Reputation Tier (for TierOnly mode)
// ============================================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum ReputationTier {
    Unrated,     // 0
    Bronze,      // 1-299
    Silver,      // 300-599
    Gold,        // 600-799
    Platinum,    // 800-899
    Diamond,     // 900-1000
}

impl ReputationTier {
    pub fn from_score(score: u32) -> Self {
        match score {
            0 => ReputationTier::Unrated,
            1..=299 => ReputationTier::Bronze,
            300..=599 => ReputationTier::Silver,
            600..=799 => ReputationTier::Gold,
            800..=899 => ReputationTier::Platinum,
            900..=1000 => ReputationTier::Diamond,
            _ => ReputationTier::Unrated,
        }
    }

    pub fn to_string(&self) -> String {
        match self {
            ReputationTier::Unrated => "Unrated".to_string(),
            ReputationTier::Bronze => "Bronze".to_string(),
            ReputationTier::Silver => "Silver".to_string(),
            ReputationTier::Gold => "Gold".to_string(),
            ReputationTier::Platinum => "Platinum".to_string(),
            ReputationTier::Diamond => "Diamond".to_string(),
        }
    }
}

// ============================================================================
// Score Range (for RangeOnly mode)
// ============================================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ScoreRange {
    pub min: u32,
    pub max: u32,
}

impl ScoreRange {
    pub fn from_score(score: u32) -> Self {
        // Create 100-point buckets
        let bucket = (score / 100) * 100;
        Self {
            min: bucket,
            max: bucket + 100,
        }
    }

    pub fn to_string(&self) -> String {
        format!("{}-{}", self.min, self.max)
    }
}
