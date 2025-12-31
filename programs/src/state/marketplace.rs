/*!
 * Marketplace State Module
 *
 * Contains data structures for the reputation marketplace where agents
 * can list services, be discovered by clients, and build reputation-backed
 * service agreements.
 */

use anchor_lang::prelude::*;
use super::GhostSpeakError;

// PDA Seeds
pub const AGENT_LISTING_SEED: &[u8] = b"agent_listing";
pub const MARKETPLACE_CONFIG_SEED: &[u8] = b"marketplace_config";
pub const SEARCH_INDEX_SEED: &[u8] = b"search_index";

/// Agent listing status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum ListingStatus {
    /// Listing is active and accepting clients
    Active,
    /// Listing is paused by the agent
    Paused,
    /// Listing is suspended by marketplace (policy violation)
    Suspended,
    /// Listing is closed/archived
    Closed,
}

/// Service category for agent capabilities
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum ServiceCategory {
    /// AI code generation and review
    CodeGeneration,
    /// Data analysis and insights
    DataAnalysis,
    /// Content creation (text, images, etc.)
    ContentCreation,
    /// Trading and financial automation
    TradingAutomation,
    /// Smart contract auditing
    SecurityAudit,
    /// General AI assistance
    GeneralAssistance,
    /// Research and summarization
    Research,
    /// Custom category
    Custom,
}

/// Pricing tier for marketplace display
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum PricingTier {
    /// Free tier (may have limitations)
    Free,
    /// Budget tier ($0.01 - $0.10 per call)
    Budget,
    /// Standard tier ($0.10 - $1.00 per call)
    Standard,
    /// Premium tier ($1.00 - $10.00 per call)
    Premium,
    /// Enterprise tier ($10.00+ per call)
    Enterprise,
}

/// Marketplace listing for an AI agent
#[account]
pub struct AgentListing {
    /// Agent account this listing represents
    pub agent: Pubkey,
    /// Owner of the listing
    pub owner: Pubkey,
    /// Listing status
    pub status: ListingStatus,
    /// Service category
    pub category: ServiceCategory,
    /// Pricing tier
    pub pricing_tier: PricingTier,
    /// Price per call in smallest token unit (e.g., lamports, USDC base units)
    pub price_per_call: u64,
    /// Minimum Ghost Score required to use this service (0-1000)
    pub min_client_score: u32,
    /// Whether this listing requires escrow
    pub requires_escrow: bool,
    /// Featured listing (boosted in search)
    pub is_featured: bool,
    /// Total views on this listing
    pub total_views: u64,
    /// Total inquiries received
    pub total_inquiries: u64,
    /// Total jobs completed through this listing
    pub total_jobs: u64,
    /// Average client satisfaction (0-10000 basis points)
    pub avg_satisfaction: u32,
    /// Listing created timestamp
    pub created_at: i64,
    /// Last updated timestamp
    pub updated_at: i64,
    /// Featured until timestamp (0 if not featured)
    pub featured_until: i64,
    /// Tags for search (max 5 tags)
    pub tags: Vec<String>,
    /// Promotional description (short pitch)
    pub description: String,
    /// Response time SLA in seconds
    pub response_time_sla: u32,
    /// Success rate requirement (0-10000 basis points)
    pub min_success_rate: u32,
    /// PDA bump
    pub bump: u8,
}

impl AgentListing {
    // Reduced sizes for memory optimization
    pub const MAX_TAGS: usize = 5;
    pub const MAX_TAG_LEN: usize = 24;
    pub const MAX_DESC_LEN: usize = 128;

    pub const LEN: usize = 8 + // discriminator
        32 + // agent
        32 + // owner
        1 + // status enum
        1 + // category enum
        1 + // pricing_tier enum
        8 + // price_per_call
        4 + // min_client_score
        1 + // requires_escrow
        1 + // is_featured
        8 + // total_views
        8 + // total_inquiries
        8 + // total_jobs
        4 + // avg_satisfaction
        8 + // created_at
        8 + // updated_at
        8 + // featured_until
        4 + (4 + Self::MAX_TAG_LEN) * Self::MAX_TAGS + // tags
        4 + Self::MAX_DESC_LEN + // description
        4 + // response_time_sla
        4 + // min_success_rate
        1; // bump

    /// Initialize a new agent listing
    pub fn initialize(
        &mut self,
        agent: Pubkey,
        owner: Pubkey,
        category: ServiceCategory,
        price_per_call: u64,
        description: String,
        bump: u8,
    ) -> Result<()> {
        require!(
            description.len() <= Self::MAX_DESC_LEN,
            GhostSpeakError::DescriptionTooLong
        );

        let clock = Clock::get()?;

        self.agent = agent;
        self.owner = owner;
        self.status = ListingStatus::Active;
        self.category = category;
        self.pricing_tier = Self::calculate_pricing_tier(price_per_call);
        self.price_per_call = price_per_call;
        self.min_client_score = 0; // No minimum by default
        self.requires_escrow = false;
        self.is_featured = false;
        self.total_views = 0;
        self.total_inquiries = 0;
        self.total_jobs = 0;
        self.avg_satisfaction = 0;
        self.created_at = clock.unix_timestamp;
        self.updated_at = clock.unix_timestamp;
        self.featured_until = 0;
        self.tags = Vec::new();
        self.description = description;
        self.response_time_sla = 300; // Default 5 minutes
        self.min_success_rate = 0;
        self.bump = bump;

        Ok(())
    }

    /// Calculate pricing tier from price
    fn calculate_pricing_tier(price: u64) -> PricingTier {
        // Assuming USDC (6 decimals) pricing
        let price_usdc = price as f64 / 1_000_000.0;

        if price_usdc == 0.0 {
            PricingTier::Free
        } else if price_usdc < 0.10 {
            PricingTier::Budget
        } else if price_usdc < 1.0 {
            PricingTier::Standard
        } else if price_usdc < 10.0 {
            PricingTier::Premium
        } else {
            PricingTier::Enterprise
        }
    }

    /// Record a view on this listing
    pub fn record_view(&mut self) -> Result<()> {
        self.total_views = self.total_views.saturating_add(1);
        Ok(())
    }

    /// Record an inquiry
    pub fn record_inquiry(&mut self) -> Result<()> {
        self.total_inquiries = self.total_inquiries.saturating_add(1);
        Ok(())
    }

    /// Record a completed job
    pub fn record_job(&mut self, satisfaction_score: u32) -> Result<()> {
        self.total_jobs = self.total_jobs.saturating_add(1);

        // Update average satisfaction
        let total_satisfaction = (self.avg_satisfaction as u64) * (self.total_jobs - 1) as u64;
        let new_total = total_satisfaction + satisfaction_score as u64;
        self.avg_satisfaction = (new_total / self.total_jobs as u64) as u32;

        self.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    /// Feature this listing
    pub fn set_featured(&mut self, duration_seconds: i64) -> Result<()> {
        let clock = Clock::get()?;
        self.is_featured = true;
        self.featured_until = clock.unix_timestamp + duration_seconds;
        Ok(())
    }

    /// Check if listing is currently featured
    pub fn is_currently_featured(&self, current_time: i64) -> bool {
        self.is_featured && current_time < self.featured_until
    }

    /// Validate listing data
    pub fn validate(&self) -> Result<()> {
        require!(
            self.description.len() <= Self::MAX_DESC_LEN,
            GhostSpeakError::DescriptionTooLong
        );
        require!(
            self.tags.len() <= Self::MAX_TAGS,
            GhostSpeakError::InvalidInput
        );
        for tag in &self.tags {
            require!(
                tag.len() <= Self::MAX_TAG_LEN,
                GhostSpeakError::InvalidInput
            );
        }
        Ok(())
    }
}

/// Global marketplace configuration
#[account]
pub struct MarketplaceConfig {
    /// Authority that can update marketplace settings
    pub authority: Pubkey,
    /// Featured listing fee (in GHOST tokens)
    pub featured_fee: u64,
    /// Minimum Ghost Score to create listing
    pub min_listing_score: u32,
    /// Maximum tags per listing
    pub max_tags: u8,
    /// Total active listings
    pub total_listings: u64,
    /// Total featured listings
    pub total_featured: u64,
    /// Marketplace fee percentage (basis points, e.g., 250 = 2.5%)
    pub marketplace_fee_bps: u16,
    /// Fee collection account
    pub fee_collector: Pubkey,
    /// Created timestamp
    pub created_at: i64,
    /// PDA bump
    pub bump: u8,
}

impl MarketplaceConfig {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        8 + // featured_fee
        4 + // min_listing_score
        1 + // max_tags
        8 + // total_listings
        8 + // total_featured
        2 + // marketplace_fee_bps
        32 + // fee_collector
        8 + // created_at
        1; // bump

    /// Initialize marketplace configuration
    pub fn initialize(
        &mut self,
        authority: Pubkey,
        fee_collector: Pubkey,
        bump: u8,
    ) -> Result<()> {
        let clock = Clock::get()?;

        self.authority = authority;
        self.featured_fee = 1_000_000_000; // 1 GHOST
        self.min_listing_score = 250; // Bronze tier minimum
        self.max_tags = 5;
        self.total_listings = 0;
        self.total_featured = 0;
        self.marketplace_fee_bps = 250; // 2.5% marketplace fee
        self.fee_collector = fee_collector;
        self.created_at = clock.unix_timestamp;
        self.bump = bump;

        Ok(())
    }

    /// Calculate marketplace fee for a transaction
    pub fn calculate_fee(&self, amount: u64) -> u64 {
        (amount as u128 * self.marketplace_fee_bps as u128 / 10000) as u64
    }
}

/// Search index entry for efficient agent discovery
/// This is a simplified index - in production, you'd use off-chain indexing
#[account]
pub struct SearchIndex {
    /// Category this index entry is for
    pub category: ServiceCategory,
    /// Pricing tier filter
    pub pricing_tier: PricingTier,
    /// Minimum Ghost Score filter
    pub min_score: u32,
    /// Agent listings matching these filters (up to 50 per index)
    pub listings: Vec<Pubkey>,
    /// Last updated
    pub updated_at: i64,
    /// PDA bump
    pub bump: u8,
}

impl SearchIndex {
    pub const MAX_LISTINGS_PER_INDEX: usize = 50;

    pub const LEN: usize = 8 + // discriminator
        1 + // category enum
        1 + // pricing_tier enum
        4 + // min_score
        4 + (32 * Self::MAX_LISTINGS_PER_INDEX) + // listings
        8 + // updated_at
        1; // bump
}
