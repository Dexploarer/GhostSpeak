/*!
 * Reputation NFT State Module
 *
 * Tradeable reputation badges that represent achievements and milestones.
 * These NFTs can be transferred between agents (with reputation implications).
 */

use anchor_lang::prelude::*;
use super::GhostSpeakError;

// PDA Seeds
pub const REPUTATION_NFT_SEED: &[u8] = b"reputation_nft";
pub const NFT_METADATA_SEED: &[u8] = b"nft_metadata";

/// Badge types for reputation NFTs
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum BadgeType {
    /// Tier achievement badges
    BronzeTier,
    SilverTier,
    GoldTier,
    PlatinumTier,

    /// Job milestone badges
    FirstJob,
    TenJobs,
    HundredJobs,
    ThousandJobs,
    TenThousandJobs,

    /// Performance badges
    PerfectMonth,      // 100% success rate for 30 days
    QuickResponder,    // Avg response < 1 second for 100 jobs
    ZeroDisputes,      // 1000 jobs with no disputes
    HighSatisfaction,  // 95%+ client satisfaction

    /// Special badges
    EarlyAdopter,      // Registered in first 1000 agents
    VolumeLeader,      // Top 1% in payment volume
    ConsistencyKing,   // 365 days of continuous activity

    /// Custom badges (for partners, events, etc.)
    Custom,
}

/// Rarity level for NFT display and marketplace value
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, PartialOrd)]
pub enum Rarity {
    Common,
    Uncommon,
    Rare,
    Epic,
    Legendary,
}

/// Reputation NFT representing an achievement or milestone
#[account]
pub struct ReputationNFT {
    /// NFT mint address
    pub mint: Pubkey,
    /// Current owner (agent)
    pub owner: Pubkey,
    /// Original earner of this badge
    pub original_earner: Pubkey,
    /// Badge type
    pub badge_type: BadgeType,
    /// Rarity level
    pub rarity: Rarity,
    /// Badge earned timestamp
    pub earned_at: i64,
    /// Badge expiration (0 for permanent)
    pub expires_at: i64,
    /// Is this badge transferable
    pub is_transferable: bool,
    /// Number of times transferred
    pub transfer_count: u32,
    /// Metadata URI (IPFS/Arweave)
    pub metadata_uri: String,
    /// Badge name
    pub name: String,
    /// Achievement details (JSON string)
    pub achievement_data: String,
    /// Ghost Score boost provided by this badge (basis points)
    pub score_boost: u32,
    /// Whether this badge is still active/valid
    pub is_active: bool,
    /// PDA bump
    pub bump: u8,
}

impl ReputationNFT {
    pub const MAX_URI_LEN: usize = 128;
    pub const MAX_NAME_LEN: usize = 64;
    pub const MAX_DATA_LEN: usize = 256;

    pub const LEN: usize = 8 + // discriminator
        32 + // mint
        32 + // owner
        32 + // original_earner
        1 + // badge_type enum (variant byte)
        1 + // rarity enum
        8 + // earned_at
        8 + // expires_at
        1 + // is_transferable
        4 + // transfer_count
        4 + Self::MAX_URI_LEN + // metadata_uri
        4 + Self::MAX_NAME_LEN + // name
        4 + Self::MAX_DATA_LEN + // achievement_data
        4 + // score_boost
        1 + // is_active
        1; // bump

    /// Initialize a new reputation NFT
    pub fn initialize(
        &mut self,
        mint: Pubkey,
        owner: Pubkey,
        badge_type: BadgeType,
        metadata_uri: String,
        name: String,
        bump: u8,
    ) -> Result<()> {
        require!(
            metadata_uri.len() <= Self::MAX_URI_LEN,
            GhostSpeakError::InvalidMetadataUri
        );
        require!(
            name.len() <= Self::MAX_NAME_LEN,
            GhostSpeakError::NameTooLong
        );

        let clock = Clock::get()?;
        let rarity = Self::calculate_rarity(&badge_type);
        let (is_transferable, expires_at) = Self::get_badge_properties(&badge_type, clock.unix_timestamp);
        let score_boost = Self::calculate_score_boost(&badge_type);

        self.mint = mint;
        self.owner = owner;
        self.original_earner = owner;
        self.badge_type = badge_type;
        self.rarity = rarity;
        self.earned_at = clock.unix_timestamp;
        self.expires_at = expires_at;
        self.is_transferable = is_transferable;
        self.transfer_count = 0;
        self.metadata_uri = metadata_uri;
        self.name = name;
        self.achievement_data = String::new();
        self.score_boost = score_boost;
        self.is_active = true;
        self.bump = bump;

        Ok(())
    }

    /// Calculate rarity based on badge type
    fn calculate_rarity(badge_type: &BadgeType) -> Rarity {
        match badge_type {
            BadgeType::FirstJob | BadgeType::BronzeTier => Rarity::Common,
            BadgeType::TenJobs | BadgeType::SilverTier | BadgeType::QuickResponder => Rarity::Uncommon,
            BadgeType::HundredJobs | BadgeType::GoldTier | BadgeType::PerfectMonth => Rarity::Rare,
            BadgeType::ThousandJobs | BadgeType::PlatinumTier | BadgeType::ZeroDisputes => Rarity::Epic,
            BadgeType::TenThousandJobs | BadgeType::EarlyAdopter | BadgeType::VolumeLeader | BadgeType::ConsistencyKing => Rarity::Legendary,
            BadgeType::HighSatisfaction => Rarity::Rare,
            BadgeType::Custom => Rarity::Common,
        }
    }

    /// Get badge properties (transferability, expiration)
    fn get_badge_properties(badge_type: &BadgeType, current_time: i64) -> (bool, i64) {
        match badge_type {
            // Tier badges: transferable, expire yearly
            BadgeType::BronzeTier | BadgeType::SilverTier | BadgeType::GoldTier | BadgeType::PlatinumTier => {
                (true, current_time + 365 * 24 * 60 * 60)
            }
            // Milestone badges: non-transferable, permanent
            BadgeType::FirstJob | BadgeType::TenJobs | BadgeType::HundredJobs |
            BadgeType::ThousandJobs | BadgeType::TenThousandJobs => {
                (false, 0)
            }
            // Performance badges: non-transferable, expire in 90 days
            BadgeType::PerfectMonth | BadgeType::QuickResponder | BadgeType::ZeroDisputes | BadgeType::HighSatisfaction => {
                (false, current_time + 90 * 24 * 60 * 60)
            }
            // Special badges: non-transferable, permanent
            BadgeType::EarlyAdopter | BadgeType::VolumeLeader | BadgeType::ConsistencyKing => {
                (false, 0)
            }
            // Custom: transferable, no expiration by default
            BadgeType::Custom => (true, 0),
        }
    }

    /// Calculate Ghost Score boost from badge
    fn calculate_score_boost(badge_type: &BadgeType) -> u32 {
        match badge_type {
            // Tier badges provide no boost (you already have the score)
            BadgeType::BronzeTier | BadgeType::SilverTier | BadgeType::GoldTier | BadgeType::PlatinumTier => 0,

            // Milestone badges
            BadgeType::FirstJob => 10,           // +10 points
            BadgeType::TenJobs => 25,            // +25 points
            BadgeType::HundredJobs => 50,        // +50 points
            BadgeType::ThousandJobs => 100,      // +100 points
            BadgeType::TenThousandJobs => 250,   // +250 points

            // Performance badges
            BadgeType::PerfectMonth => 150,      // +150 points
            BadgeType::QuickResponder => 100,    // +100 points
            BadgeType::ZeroDisputes => 200,      // +200 points
            BadgeType::HighSatisfaction => 125,  // +125 points

            // Special badges
            BadgeType::EarlyAdopter => 50,       // +50 points
            BadgeType::VolumeLeader => 300,      // +300 points
            BadgeType::ConsistencyKing => 200,   // +200 points

            BadgeType::Custom => 0,
        }
    }

    /// Check if badge is currently valid
    pub fn is_valid(&self, current_time: i64) -> bool {
        self.is_active && (self.expires_at == 0 || current_time < self.expires_at)
    }

    /// Transfer badge to new owner
    pub fn transfer(&mut self, new_owner: Pubkey) -> Result<()> {
        require!(self.is_transferable, GhostSpeakError::BadgeNotTransferable);
        require!(self.is_active, GhostSpeakError::BadgeInactive);

        self.owner = new_owner;
        self.transfer_count = self.transfer_count.saturating_add(1);

        Ok(())
    }

    /// Revoke/deactivate badge
    pub fn revoke(&mut self) -> Result<()> {
        self.is_active = false;
        Ok(())
    }

    /// Renew an expiring badge (for tier badges that are re-earned)
    pub fn renew(&mut self, duration_seconds: i64) -> Result<()> {
        let clock = Clock::get()?;
        self.expires_at = clock.unix_timestamp + duration_seconds;
        self.is_active = true;
        Ok(())
    }
}

/// Badge collection summary for an agent
/// Stores aggregate stats to avoid scanning all NFTs
#[account]
pub struct BadgeCollection {
    /// Agent owner
    pub agent: Pubkey,
    /// Total badges earned
    pub total_badges: u32,
    /// Active badges count
    pub active_badges: u32,
    /// Total score boost from all active badges
    pub total_score_boost: u32,
    /// Badges by rarity count
    pub common_count: u16,
    pub uncommon_count: u16,
    pub rare_count: u16,
    pub epic_count: u16,
    pub legendary_count: u16,
    /// Highest tier achieved
    pub highest_tier: u8, // 0=none, 1=bronze, 2=silver, 3=gold, 4=platinum
    /// Last updated
    pub updated_at: i64,
    /// PDA bump
    pub bump: u8,
}

impl BadgeCollection {
    pub const LEN: usize = 8 + // discriminator
        32 + // agent
        4 + // total_badges
        4 + // active_badges
        4 + // total_score_boost
        2 + // common_count
        2 + // uncommon_count
        2 + // rare_count
        2 + // epic_count
        2 + // legendary_count
        1 + // highest_tier
        8 + // updated_at
        1; // bump

    /// Initialize badge collection
    pub fn initialize(&mut self, agent: Pubkey, bump: u8) -> Result<()> {
        let clock = Clock::get()?;

        self.agent = agent;
        self.total_badges = 0;
        self.active_badges = 0;
        self.total_score_boost = 0;
        self.common_count = 0;
        self.uncommon_count = 0;
        self.rare_count = 0;
        self.epic_count = 0;
        self.legendary_count = 0;
        self.highest_tier = 0;
        self.updated_at = clock.unix_timestamp;
        self.bump = bump;

        Ok(())
    }

    /// Add a badge to collection
    pub fn add_badge(&mut self, rarity: Rarity, score_boost: u32, badge_type: &BadgeType) -> Result<()> {
        self.total_badges = self.total_badges.saturating_add(1);
        self.active_badges = self.active_badges.saturating_add(1);
        self.total_score_boost = self.total_score_boost.saturating_add(score_boost);

        // Update rarity counts
        match rarity {
            Rarity::Common => self.common_count = self.common_count.saturating_add(1),
            Rarity::Uncommon => self.uncommon_count = self.uncommon_count.saturating_add(1),
            Rarity::Rare => self.rare_count = self.rare_count.saturating_add(1),
            Rarity::Epic => self.epic_count = self.epic_count.saturating_add(1),
            Rarity::Legendary => self.legendary_count = self.legendary_count.saturating_add(1),
        }

        // Update highest tier
        let tier = match badge_type {
            BadgeType::BronzeTier => 1,
            BadgeType::SilverTier => 2,
            BadgeType::GoldTier => 3,
            BadgeType::PlatinumTier => 4,
            _ => 0,
        };
        if tier > self.highest_tier {
            self.highest_tier = tier;
        }

        self.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    /// Remove a badge from collection (when revoked or expired)
    pub fn remove_badge(&mut self, rarity: Rarity, score_boost: u32) -> Result<()> {
        self.active_badges = self.active_badges.saturating_sub(1);
        self.total_score_boost = self.total_score_boost.saturating_sub(score_boost);

        // Update rarity counts
        match rarity {
            Rarity::Common => self.common_count = self.common_count.saturating_sub(1),
            Rarity::Uncommon => self.uncommon_count = self.uncommon_count.saturating_sub(1),
            Rarity::Rare => self.rare_count = self.rare_count.saturating_sub(1),
            Rarity::Epic => self.epic_count = self.epic_count.saturating_sub(1),
            Rarity::Legendary => self.legendary_count = self.legendary_count.saturating_sub(1),
        }

        self.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }
}
