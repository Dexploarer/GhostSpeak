/*!
 * podAI Marketplace Program - Revolutionary AI Agent Platform
 * 
 * A decentralized marketplace for AI agents built on Solana, enabling:
 * - Agent-to-Agent (A2A) and Human-to-Agent (H2A) communication
 * - Human purchasing of agent services and direct job hiring
 * - Work delivery as compressed NFTs (cNFTs)
 * - SPL Token 2022 payments with confidential transfers
 * - Agent replication and genome marketplace
 * - Privacy-preserving interactions across the ecosystem
 */

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

// Use explicit imports to avoid borsh ambiguity

declare_id!("4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP");

// =====================================================
// DATA STRUCTURES
// =====================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum PricingModel {
    Fixed,
    Hourly,
    PerTask,
    Subscription,
    Auction,           // NEW: Auction-based pricing
    Dynamic,           // NEW: Market-responsive pricing
    RevenueShare,      // NEW: Percentage-based revenue sharing
    Tiered,            // NEW: Premium/standard/basic tiers
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ChannelType {
    Direct,
    Group,
    Public,
    Private,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum MessageType {
    Text,
    File,
    Image,
    Audio,
    System,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum WorkOrderStatus {
    Created,
    Open,
    Submitted,
    InProgress,
    Approved,
    Completed,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ApplicationStatus {
    Submitted,
    Accepted,
    Rejected,
    Withdrawn,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ContractStatus {
    Active,
    Completed,
    Cancelled,
    Disputed,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Deliverable {
    Code,
    Document,
    Design,
    Analysis,
    Other,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AgentRegistrationData {
    pub name: String,
    pub description: String,
    pub capabilities: Vec<String>,
    pub pricing_model: PricingModel,
    pub genome_hash: String,
    pub is_replicable: bool,
    pub replication_fee: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AgentUpdateData {
    pub name: Option<String>,
    pub description: Option<String>,
    pub capabilities: Option<Vec<String>>,
    pub pricing_model: Option<PricingModel>,
    pub is_active: Option<bool>,
    pub is_replicable: Option<bool>,
    pub replication_fee: Option<u64>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ChannelCreationData {
    pub channel_id: u64,
    pub participants: Vec<Pubkey>,
    pub channel_type: ChannelType,
    pub is_private: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MessageData {
    pub content: String,
    pub message_type: MessageType,
    pub is_encrypted: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct WorkOrderData {
    pub order_id: u64,
    pub provider: Pubkey,
    pub title: String,
    pub description: String,
    pub requirements: Vec<String>,
    pub payment_amount: u64,
    pub payment_token: Pubkey,
    pub deadline: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct WorkDeliveryData {
    pub deliverables: Vec<Deliverable>,
    pub ipfs_hash: String,
    pub metadata_uri: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ServiceListingData {
    pub title: String,
    pub description: String,
    pub price: u64,
    pub token_mint: Pubkey,
    pub service_type: String,
    pub payment_token: Pubkey,
    pub estimated_delivery: i64,
    pub tags: Vec<String>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ServicePurchaseData {
    pub listing_id: u64,
    pub quantity: u32,
    pub requirements: Vec<String>,
    pub custom_instructions: String,
    pub deadline: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct JobPostingData {
    pub title: String,
    pub description: String,
    pub requirements: Vec<String>,
    pub budget: u64,
    pub deadline: i64,
    pub skills_needed: Vec<String>,
    pub budget_min: u64,
    pub budget_max: u64,
    pub payment_token: Pubkey,
    pub job_type: String,
    pub experience_level: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct JobApplicationData {
    pub cover_letter: String,
    pub proposed_price: u64,
    pub estimated_duration: u32,
    pub proposed_rate: u64,
    pub estimated_delivery: i64,
    pub portfolio_items: Vec<String>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct JobCompletionData {
    pub deliverables: Vec<Deliverable>,
    pub ipfs_hash: String,
    pub metadata_uri: String,
    pub work_summary: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ReviewData {
    pub rating: u8,
    pub comment: String,
    pub review_type: String,
    pub work_reference: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ReplicationTemplateData {
    pub genome_hash: String,
    pub base_capabilities: Vec<String>,
    pub replication_fee: u64,
    pub max_replications: u32,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AgentCustomization {
    pub name: String,
    pub description: Option<String>,
    pub additional_capabilities: Vec<String>,
    pub pricing_model: PricingModel,
    pub is_replicable: bool,
    pub replication_fee: Option<u64>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum AuctionType {
    English,           // Ascending price auction
    Dutch,             // Descending price auction
    SealedBid,         // Blind bidding
    Vickrey,           // Second-price sealed bid
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum NegotiationStatus {
    InitialOffer,
    CounterOffer,
    Accepted,
    Rejected,
    Expired,
    AutoAccepted,
}

// NEW: Advanced pricing data structures
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AuctionData {
    pub auction_type: AuctionType,
    pub starting_price: u64,
    pub reserve_price: u64,
    pub current_bid: u64,
    pub current_bidder: Option<Pubkey>,
    pub auction_end_time: i64,
    pub minimum_bid_increment: u64,
    pub total_bids: u32,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DynamicPricingData {
    pub base_price: u64,
    pub demand_multiplier: f64,
    pub supply_multiplier: f64,
    pub reputation_bonus: f64,
    pub time_surge_multiplier: f64,
    pub last_price_update: i64,
    pub price_update_interval: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct NegotiationData {
    pub initial_offer: u64,
    pub current_offer: u64,
    pub counter_offers: Vec<u64>,
    pub negotiation_deadline: i64,
    pub status: NegotiationStatus,
    pub terms: Vec<String>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TieredPricingData {
    pub basic_price: u64,
    pub standard_price: u64,
    pub premium_price: u64,
    pub basic_features: Vec<String>,
    pub standard_features: Vec<String>,
    pub premium_features: Vec<String>,
}

// =====================================================
// AUTOMATED DYNAMIC PRICING ENGINE
// =====================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum PricingAlgorithm {
    DemandBased,      // Price increases with demand
    ReputationBased,  // Higher reputation = higher prices
    SurgePricing,     // Time-based surge pricing
    MarketAverage,    // Based on market median
    PerformanceBased, // Based on success rate
    Seasonal,         // Time-of-year adjustments
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DynamicPricingConfig {
    pub algorithm: PricingAlgorithm,
    pub base_price: u64,
    pub min_price: u64,
    pub max_price: u64,
    pub demand_multiplier: f64,
    pub reputation_multiplier: f64,
    pub surge_multiplier: f64,
    pub update_frequency: i64, // seconds
    pub last_update: i64,
}

#[account]
pub struct DynamicPricingEngine {
    pub agent: Pubkey,
    pub owner: Pubkey,
    pub config: DynamicPricingConfig,
    pub current_price: u64,
    pub demand_metrics: DemandMetrics,
    pub reputation_score: f64,
    pub total_adjustments: u32,
    pub created_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DemandMetrics {
    pub requests_last_hour: u32,
    pub requests_last_day: u32,
    pub requests_last_week: u32,
    pub average_response_time: f64,
    pub completion_rate: f64,
    pub customer_satisfaction: f64,
}

// =====================================================
// FULL AUCTION MARKETPLACE
// =====================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum AuctionStatus {
    Active,
    Ended,
    Cancelled,
    Settled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AuctionBid {
    pub bidder: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
    pub is_winning: bool,
}

#[account]
pub struct AuctionMarketplace {
    pub auction: Pubkey,
    pub agent: Pubkey,
    pub creator: Pubkey,
    pub auction_type: AuctionType,
    pub status: AuctionStatus,
    pub starting_price: u64,
    pub reserve_price: u64,
    pub current_bid: u64,
    pub current_bidder: Option<Pubkey>,
    pub auction_start_time: i64,
    pub auction_end_time: i64,
    pub minimum_bid_increment: u64,
    pub total_bids: u32,
    pub bids: Vec<AuctionBid>,
    pub winner: Option<Pubkey>,
    pub created_at: i64,
    pub bump: u8,
}

// =====================================================
// NEGOTIATION CHATBOT
// =====================================================



#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct NegotiationMessage {
    pub sender: Pubkey,
    pub message: String,
    pub offer_amount: Option<u64>,
    pub timestamp: i64,
    pub is_auto_generated: bool,
}

#[account]
pub struct NegotiationChatbot {
    pub negotiation: Pubkey,
    pub initiator: Pubkey,
    pub counterparty: Pubkey,
    pub initial_offer: u64,
    pub current_offer: u64,
    pub status: NegotiationStatus,
    pub messages: Vec<NegotiationMessage>,
    pub counter_offers: Vec<u64>,
    pub auto_accept_threshold: u64,
    pub negotiation_deadline: i64,
    pub created_at: i64,
    pub bump: u8,
}

// =====================================================
// BULK/ENTERPRISE DEALS
// =====================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum DealType {
    VolumeDiscount,
    EnterpriseSLA,
    CustomContract,
    Subscription,
    Retainer,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct VolumeTier {
    pub min_volume: u32,
    pub discount_percentage: f64,
    pub price_per_unit: u64,
}

#[account]
pub struct BulkDeal {
    pub deal: Pubkey,
    pub agent: Pubkey,
    pub customer: Pubkey,
    pub deal_type: DealType,
    pub total_volume: u32,
    pub total_value: u64,
    pub discount_percentage: f64,
    pub volume_tiers: Vec<VolumeTier>,
    pub sla_terms: String,
    pub contract_duration: i64,
    pub start_date: i64,
    pub end_date: i64,
    pub is_active: bool,
    pub created_at: i64,
    pub bump: u8,
}

// =====================================================
// ROYALTY STREAMS & RESALE MARKETS
// =====================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RoyaltyConfig {
    pub creator_share: f64,      // Percentage to original creator
    pub platform_share: f64,     // Percentage to platform
    pub resale_share: f64,       // Percentage on resales
    pub perpetual_share: f64,    // Percentage for perpetual earnings
}

#[account]
pub struct RoyaltyStream {
    pub agent: Pubkey,
    pub creator: Pubkey,
    pub config: RoyaltyConfig,
    pub total_earnings: u64,
    pub total_resales: u32,
    pub resale_volume: u64,
    pub last_payout: i64,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
pub struct ResaleMarket {
    pub agent: Pubkey,
    pub seller: Pubkey,
    pub buyer: Option<Pubkey>,
    pub listing_price: u64,
    pub original_price: u64,
    pub royalty_paid: u64,
    pub is_sold: bool,
    pub listed_at: i64,
    pub sold_at: Option<i64>,
    pub bump: u8,
}

// =====================================================
// AUTOMATED DISPUTE RESOLUTION
// =====================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum DisputeStatus {
    Filed,
    UnderReview,
    EvidenceSubmitted,
    Resolved,
    Escalated,
    Closed,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum DisputeResolution {
    Refund,
    PartialRefund,
    ServiceCompletion,
    NoAction,
    Penalty,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DisputeEvidence {
    pub submitter: Pubkey,
    pub evidence_type: String,
    pub evidence_data: String,
    pub timestamp: i64,
    pub is_verified: bool,
}

#[account]
pub struct DisputeCase {
    pub dispute: Pubkey,
    pub transaction: Pubkey,
    pub complainant: Pubkey,
    pub respondent: Pubkey,
    pub reason: String,
    pub status: DisputeStatus,
    pub resolution: Option<DisputeResolution>,
    pub evidence: Vec<DisputeEvidence>,
    pub ai_score: f64,           // AI confidence in resolution
    pub human_review: bool,      // Whether human review is needed
    pub created_at: i64,
    pub resolved_at: Option<i64>,
    pub bump: u8,
}

// =====================================================
// ANALYTICS & INSIGHTS
// =====================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AgentAnalytics {
    pub total_revenue: u64,
    pub total_jobs: u32,
    pub success_rate: f64,
    pub average_rating: f64,
    pub response_time_avg: f64,
    pub customer_retention: f64,
    pub market_share: f64,
    pub trend_direction: f64,    // Positive/negative trend
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MarketAnalytics {
    pub total_volume: u64,
    pub active_agents: u32,
    pub average_price: u64,
    pub price_volatility: f64,
    pub demand_trend: f64,
    pub supply_trend: f64,
    pub market_cap: u64,
}

#[account]
pub struct AnalyticsDashboard {
    pub owner: Pubkey,
    pub agent_analytics: Option<AgentAnalytics>,
    pub market_analytics: MarketAnalytics,
    pub last_updated: i64,
    pub update_frequency: i64,
    pub created_at: i64,
    pub bump: u8,
}

// =====================================================
// PLUG-IN/EXTENSION SYSTEM
// =====================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ExtensionType {
    PricingModel,
    AgentCapability,
    Integration,
    Analytics,
    Security,
    Custom,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ExtensionStatus {
    Pending,
    Approved,
    Rejected,
    Active,
    Suspended,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ExtensionMetadata {
    pub name: String,
    pub description: String,
    pub version: String,
    pub author: String,
    pub repository: String,
    pub license: String,
    pub dependencies: Vec<String>,
    pub extension_type: ExtensionType,  // Add this field
}

#[account]
pub struct Extension {
    pub extension: Pubkey,
    pub developer: Pubkey,
    pub extension_type: ExtensionType,
    pub status: ExtensionStatus,
    pub metadata: ExtensionMetadata,
    pub code_hash: String,       // IPFS hash of extension code
    pub install_count: u32,
    pub rating: f64,
    pub revenue_share: f64,      // Percentage to developer
    pub total_earnings: u64,
    pub created_at: i64,
    pub bump: u8,
}

// =====================================================
// INCENTIVE & REWARD SYSTEM
// =====================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct IncentiveConfig {
    pub referral_bonus: f64,     // Percentage for referrals
    pub volume_bonus: f64,       // Bonus for high volume
    pub quality_bonus: f64,      // Bonus for high ratings
    pub retention_bonus: f64,    // Bonus for customer retention
    pub innovation_bonus: f64,   // Bonus for new features
}

#[account]
pub struct AgentIncentives {
    pub agent: Pubkey,
    pub total_referrals: u32,
    pub referral_earnings: u64,
    pub volume_bonus_earned: u64,
    pub quality_bonus_earned: u64,
    pub retention_bonus_earned: u64,
    pub innovation_bonus_earned: u64,
    pub total_incentives: u64,
    pub last_payout: i64,
}

#[account]
pub struct IncentiveProgram {
    pub program: Pubkey,
    pub config: IncentiveConfig,
    pub total_distributed: u64,
    pub active_agents: u32,
    pub created_at: i64,
    pub bump: u8,
}

// =====================================================
// CONSTANTS FOR NEW ACCOUNTS
// =====================================================

impl DynamicPricingEngine {
    pub const LEN: usize = 8 + 32 + 32 + 200 + 8 + 100 + 8 + 4 + 8 + 1;
}

impl AuctionMarketplace {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 1 + 1 + 8 + 8 + 8 + 32 + 8 + 8 + 8 + 4 + 1000 + 32 + 8 + 1;
}

impl NegotiationChatbot {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 8 + 1 + 1000 + 8 + 8 + 8 + 1;
}

impl BulkDeal {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 1 + 4 + 8 + 8 + 200 + 8 + 8 + 8 + 1 + 8 + 1;
}

impl RoyaltyStream {
    pub const LEN: usize = 8 + 32 + 32 + 100 + 8 + 4 + 8 + 8 + 1;
}

impl ResaleMarket {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 8 + 8 + 8 + 1 + 8 + 8 + 1;
}

impl DisputeCase {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 32 + 200 + 1 + 1 + 1000 + 8 + 1 + 8 + 8 + 1;
}

impl AnalyticsDashboard {
    pub const LEN: usize = 8 + 32 + 200 + 200 + 8 + 8 + 8 + 1;
}

impl Extension {
    pub const LEN: usize = 8 + 32 + 32 + 1 + 1 + 300 + 100 + 4 + 8 + 8 + 8 + 1;
}

impl IncentiveProgram {
    pub const LEN: usize = 8 + 32 + 200 + 8 + 4 + 8 + 1;
}

// =====================================================
// PROGRAM
// =====================================================

#[program]
pub mod podai_marketplace {
    use super::*;

    // =====================================================
    // AGENT MANAGEMENT
    // =====================================================

    /// Register a new AI agent in the marketplace
    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        agent_data: AgentRegistrationData,
    ) -> Result<()> {
        let agent = &mut ctx.accounts.agent;
        let clock = Clock::get()?;

        agent.owner = ctx.accounts.owner.key();
        agent.name = agent_data.name.clone();
        agent.description = agent_data.description.clone();
        agent.capabilities = agent_data.capabilities.clone();
        agent.pricing_model = agent_data.pricing_model;
        agent.reputation_score = 0;
        agent.total_jobs_completed = 0;
        agent.total_earnings = 0;
        agent.is_active = true;
        agent.created_at = clock.unix_timestamp;
        agent.updated_at = clock.unix_timestamp;
        agent.genome_hash = agent_data.genome_hash.clone();
        agent.is_replicable = agent_data.is_replicable;
        agent.replication_fee = agent_data.replication_fee;
        agent.bump = ctx.bumps.agent;

        emit!(AgentRegisteredEvent {
            agent: agent.key(),
            owner: ctx.accounts.owner.key(),
            name: agent_data.name.clone(),
            capabilities: agent_data.capabilities.clone(),
        });

        Ok(())
    }

    /// Update agent information and capabilities
    pub fn update_agent(
        ctx: Context<UpdateAgent>,
        update_data: AgentUpdateData,
    ) -> Result<()> {
        let agent = &mut ctx.accounts.agent;
        let clock = Clock::get()?;

        if let Some(name) = update_data.name {
            agent.name = name.clone();
        }
        if let Some(description) = update_data.description {
            agent.description = description;
        }
        if let Some(capabilities) = update_data.capabilities {
            agent.capabilities = capabilities.clone();
        }
        if let Some(pricing_model) = update_data.pricing_model {
            agent.pricing_model = pricing_model;
        }
        if let Some(is_active) = update_data.is_active {
            agent.is_active = is_active;
        }
        if let Some(is_replicable) = update_data.is_replicable {
            agent.is_replicable = is_replicable;
        }
        if let Some(replication_fee) = update_data.replication_fee {
            agent.replication_fee = replication_fee;
        }
        agent.updated_at = clock.unix_timestamp;

        emit!(AgentUpdatedEvent {
            agent: agent.key(),
            owner: ctx.accounts.owner.key(),
            name: agent.name.clone(),
        });

        Ok(())
    }

    // =====================================================
    // CHANNEL COMMUNICATION SYSTEM
    // =====================================================

    /// Create a communication channel between agents
    pub fn create_channel(
        ctx: Context<CreateChannel>,
        channel_data: ChannelCreationData,
    ) -> Result<()> {
        let channel = &mut ctx.accounts.channel;
        let clock = Clock::get()?;

        channel.creator = ctx.accounts.creator.key();
        channel.participants = channel_data.participants.clone();
        channel.channel_type = channel_data.channel_type;
        channel.is_private = channel_data.is_private;
        channel.message_count = 0;
        channel.created_at = clock.unix_timestamp;
        channel.last_activity = clock.unix_timestamp;
        channel.is_active = true;
        channel.bump = ctx.bumps.channel;

        emit!(ChannelCreatedEvent {
            channel: channel.key(),
            creator: ctx.accounts.creator.key(),
            channel_type: channel_data.channel_type,
        });

        Ok(())
    }

    /// Send a message in a channel
    pub fn send_message(
        ctx: Context<SendMessage>,
        message_data: MessageData,
    ) -> Result<()> {
        let message = &mut ctx.accounts.message;
        let channel = &mut ctx.accounts.channel;
        let clock = Clock::get()?;

        message.channel = channel.key();
        message.sender = ctx.accounts.sender.key();
        message.content = message_data.content.clone();
        message.message_type = message_data.message_type;
        message.timestamp = clock.unix_timestamp;
        message.is_encrypted = message_data.is_encrypted;
        message.bump = ctx.bumps.message;

        channel.message_count += 1;
        channel.last_activity = clock.unix_timestamp;

        emit!(MessageSentEvent {
            message: message.key(),
            channel: channel.key(),
            sender: ctx.accounts.sender.key(),
            message_type: message_data.message_type,
        });

        Ok(())
    }

    // =====================================================
    // WORK DELIVERY SYSTEM
    // =====================================================

    /// Create a work order between agents
    pub fn create_work_order(
        ctx: Context<CreateWorkOrder>,
        work_order_data: WorkOrderData,
    ) -> Result<()> {
        let work_order = &mut ctx.accounts.work_order;
        let clock = Clock::get()?;

        work_order.client = ctx.accounts.client.key();
        work_order.provider = work_order_data.provider;
        work_order.title = work_order_data.title.clone();
        work_order.description = work_order_data.description.clone();
        work_order.requirements = work_order_data.requirements.clone();
        work_order.payment_amount = work_order_data.payment_amount;
        work_order.payment_token = work_order_data.payment_token;
        work_order.deadline = work_order_data.deadline;
        work_order.status = WorkOrderStatus::Created;
        work_order.created_at = clock.unix_timestamp;
        work_order.updated_at = clock.unix_timestamp;
        work_order.bump = ctx.bumps.work_order;

        emit!(WorkOrderCreatedEvent {
            work_order: work_order.key(),
            client: ctx.accounts.client.key(),
            provider: work_order_data.provider,
            title: work_order_data.title.clone(),
            payment_amount: work_order_data.payment_amount,
        });

        Ok(())
    }

    /// Submit work delivery (creates cNFT)
    pub fn submit_work_delivery(
        ctx: Context<SubmitWorkDelivery>,
        delivery_data: WorkDeliveryData,
    ) -> Result<()> {
        let work_delivery = &mut ctx.accounts.work_delivery;
        let work_order = &mut ctx.accounts.work_order;
        let clock = Clock::get()?;

        work_delivery.work_order = work_order.key();
        work_delivery.provider = ctx.accounts.provider.key();
        work_delivery.client = work_order.client;
        work_delivery.deliverables = delivery_data.deliverables.clone();
        work_delivery.ipfs_hash = delivery_data.ipfs_hash.clone();
        work_delivery.metadata_uri = delivery_data.metadata_uri.clone();
        work_delivery.submitted_at = clock.unix_timestamp;
        work_delivery.is_approved = false;
        work_delivery.bump = ctx.bumps.work_delivery;

        work_order.status = WorkOrderStatus::Submitted;
        work_order.updated_at = clock.unix_timestamp;

        emit!(WorkDeliverySubmittedEvent {
            work_delivery: work_delivery.key(),
            work_order: work_order.key(),
            provider: ctx.accounts.provider.key(),
            ipfs_hash: delivery_data.ipfs_hash.clone(),
        });

        Ok(())
    }

    // =====================================================
    // PAYMENT SYSTEM (SPL Token 2022)
    // =====================================================

    /// Process payment for completed work
    pub fn process_payment(
        ctx: Context<ProcessPayment>,
        amount: u64,
        use_confidential_transfer: bool,
    ) -> Result<()> {
        let payment = &mut ctx.accounts.payment;
        let work_order = &mut ctx.accounts.work_order;
        let clock = Clock::get()?;

        payment.work_order = work_order.key();
        payment.payer = ctx.accounts.payer.key();
        payment.recipient = ctx.accounts.provider_agent.owner;
        payment.amount = amount;
        payment.token_mint = ctx.accounts.token_mint.key();
        payment.is_confidential = use_confidential_transfer;
        payment.paid_at = clock.unix_timestamp;
        payment.bump = ctx.bumps.payment;

        work_order.status = WorkOrderStatus::Completed;
        work_order.updated_at = clock.unix_timestamp;

        emit!(PaymentProcessedEvent {
            payment: payment.key(),
            payer: ctx.accounts.payer.key(),
            recipient: ctx.accounts.provider_agent.owner,
            amount,
            is_confidential: use_confidential_transfer,
        });

        Ok(())
    }

    // =====================================================
    // HUMAN PURCHASING & JOB HIRING SYSTEM
    // =====================================================

    /// Create a service listing for human customers to purchase
    pub fn create_service_listing(
        ctx: Context<CreateServiceListing>,
        listing_data: ServiceListingData,
    ) -> Result<()> {
        let listing = &mut ctx.accounts.service_listing;
        let agent = &ctx.accounts.agent;
        let clock = Clock::get()?;

        // Verify agent is active and owned by the caller
        require!(agent.is_active, PodAIMarketplaceError::AgentNotActive);
        require!(agent.owner == ctx.accounts.creator.key(), PodAIMarketplaceError::UnauthorizedAccess);

        listing.agent = agent.key();
        listing.owner = ctx.accounts.creator.key();
        listing.title = listing_data.title.clone();
        listing.description = listing_data.description.clone();
        listing.service_type = listing_data.service_type;
        listing.price = listing_data.price;
        listing.payment_token = listing_data.payment_token;
        listing.estimated_delivery = listing_data.estimated_delivery;
        listing.tags = listing_data.tags.clone();
        listing.is_active = true;
        listing.total_orders = 0;
        listing.rating = 0.0;
        listing.created_at = clock.unix_timestamp;
        listing.updated_at = clock.unix_timestamp;
        listing.bump = ctx.bumps.service_listing;

        emit!(ServiceListingCreatedEvent {
            listing: listing.key(),
            creator: ctx.accounts.creator.key(),
            title: listing_data.title.clone(),
            price: listing_data.price,
        });
        Ok(())
    }

    /// Purchase a service from an agent (human customer buying)
    pub fn purchase_service(
        ctx: Context<PurchaseService>,
        purchase_data: ServicePurchaseData,
    ) -> Result<()> {
        let purchase = &mut ctx.accounts.service_purchase;
        let listing = &ctx.accounts.service_listing;
        let clock = Clock::get()?;

        // Verify listing is active
        require!(listing.is_active, PodAIMarketplaceError::ServiceNotActive);

        purchase.listing = listing.key();
        purchase.customer = ctx.accounts.buyer.key();
        purchase.agent = listing.agent;
        purchase.listing_id = 0; // Set appropriately if needed
        purchase.quantity = purchase_data.quantity;
        purchase.requirements = purchase_data.requirements.clone();
        purchase.custom_instructions = purchase_data.custom_instructions.clone();
        purchase.payment_amount = listing.price;
        purchase.payment_token = listing.payment_token;
        purchase.deadline = purchase_data.deadline;
        purchase.status = PurchaseStatus::Paid;
        purchase.purchased_at = clock.unix_timestamp;
        purchase.updated_at = clock.unix_timestamp;
        purchase.bump = ctx.bumps.service_purchase;

        emit!(ServicePurchasedEvent {
            purchase: purchase.key(),
            listing: listing.key(),
            buyer: ctx.accounts.buyer.key(),
            quantity: purchase_data.quantity,
        });
        Ok(())
    }

    /// Create a job posting for agents to apply to (human hiring)
    pub fn create_job_posting(
        ctx: Context<CreateJobPosting>,
        job_data: JobPostingData,
    ) -> Result<()> {
        let job_posting = &mut ctx.accounts.job_posting;
        let clock = Clock::get()?;

        job_posting.employer = ctx.accounts.employer.key();
        job_posting.title = job_data.title.clone();
        job_posting.description = job_data.description.clone();
        job_posting.requirements = job_data.requirements.clone();
        job_posting.budget = job_data.budget;
        job_posting.deadline = job_data.deadline;
        job_posting.skills_needed = job_data.skills_needed.clone();
        job_posting.budget_min = job_data.budget_min;
        job_posting.budget_max = job_data.budget_max;
        job_posting.payment_token = job_data.payment_token;
        job_posting.job_type = job_data.job_type.clone();
        job_posting.experience_level = job_data.experience_level.clone();
        job_posting.is_active = true;
        job_posting.applications_count = 0;
        job_posting.created_at = clock.unix_timestamp;
        job_posting.updated_at = clock.unix_timestamp;
        job_posting.bump = ctx.bumps.job_posting;

        emit!(JobPostingCreatedEvent {
            job_posting: job_posting.key(),
            employer: ctx.accounts.employer.key(),
            title: job_data.title.clone(),
            budget_min: job_data.budget_min,
            budget_max: job_data.budget_max,
        });

        Ok(())
    }

    /// Agent applies to a job posting
    pub fn apply_to_job(
        ctx: Context<ApplyToJob>,
        application_data: JobApplicationData,
    ) -> Result<()> {
        let application = &mut ctx.accounts.job_application;
        let job_posting = &mut ctx.accounts.job_posting;
        let agent = &ctx.accounts.agent;
        let clock = Clock::get()?;

        // Verify job posting is active
        require!(job_posting.is_active, PodAIMarketplaceError::JobNotActive);
        
        // Verify agent is active
        require!(agent.is_active, PodAIMarketplaceError::AgentNotActive);

        application.job_posting = job_posting.key();
        application.agent = agent.key();
        application.agent_owner = ctx.accounts.agent_owner.key();
        application.cover_letter = application_data.cover_letter;
        application.proposed_rate = application_data.proposed_rate;
        application.estimated_delivery = application_data.estimated_delivery;
        application.portfolio_items = application_data.portfolio_items;
        application.status = ApplicationStatus::Submitted;
        application.applied_at = clock.unix_timestamp;
        application.bump = ctx.bumps.job_application;

        // Update job posting
        job_posting.applications_count += 1;
        job_posting.updated_at = clock.unix_timestamp;

        emit!(JobApplicationSubmittedEvent {
            job_posting: job_posting.key(),
            application: application.key(),
            agent: agent.key(),
            proposed_rate: application_data.proposed_rate,
        });

        Ok(())
    }

    /// Employer accepts a job application
    pub fn accept_job_application(
        ctx: Context<AcceptJobApplication>,
    ) -> Result<()> {
        let application = &mut ctx.accounts.job_application;
        let job_posting = &mut ctx.accounts.job_posting;
        let job_contract = &mut ctx.accounts.job_contract;
        let clock = Clock::get()?;

        // Verify application is still pending
        require!(
            application.status == ApplicationStatus::Submitted,
            PodAIMarketplaceError::InvalidApplicationStatus
        );

        // Create job contract
        job_contract.job_posting = job_posting.key();
        job_contract.application = application.key();
        job_contract.employer = job_posting.employer;
        job_contract.agent = application.agent;
        job_contract.agreed_rate = application.proposed_rate;
        job_contract.deadline = application.estimated_delivery;
        job_contract.payment_token = job_posting.payment_token;
        job_contract.status = ContractStatus::Active;
        job_contract.created_at = clock.unix_timestamp;
        job_contract.updated_at = clock.unix_timestamp;
        job_contract.bump = ctx.bumps.job_contract;

        // Update application status
        application.status = ApplicationStatus::Accepted;

        // Deactivate job posting
        job_posting.is_active = false;
        job_posting.updated_at = clock.unix_timestamp;

        emit!(JobApplicationAcceptedEvent {
            job_posting: job_posting.key(),
            application: application.key(),
            contract: job_contract.key(),
            employer: job_posting.employer,
            agent: application.agent,
        });

        Ok(())
    }

    /// Complete a hired job and process payment
    pub fn complete_hired_job(
        ctx: Context<CompleteHiredJob>,
        completion_data: JobCompletionData,
    ) -> Result<()> {
        let job_contract = &mut ctx.accounts.job_contract;
        let job_completion = &mut ctx.accounts.job_completion;
        let agent = &mut ctx.accounts.agent;
        let clock = Clock::get()?;

        // Verify contract is active
        require!(
            job_contract.status == ContractStatus::Active,
            PodAIMarketplaceError::InvalidContractStatus
        );

        job_completion.contract = job_contract.key();
        job_completion.agent = job_contract.agent;
        job_completion.employer = job_contract.employer;
        job_completion.deliverables = completion_data.deliverables;
        job_completion.work_summary = completion_data.work_summary;
        job_completion.ipfs_hash = completion_data.ipfs_hash;
        job_completion.metadata_uri = completion_data.metadata_uri;
        job_completion.completed_at = clock.unix_timestamp;
        job_completion.is_approved = false;
        job_completion.bump = ctx.bumps.job_completion;

        // Update contract status
        job_contract.status = ContractStatus::Completed;
        job_contract.updated_at = clock.unix_timestamp;

        // Update agent stats
        agent.total_jobs_completed += 1;
        agent.total_earnings += job_contract.agreed_rate;
        agent.reputation_score += 1;

        emit!(HiredJobCompletedEvent {
            contract: job_contract.key(),
            completion: job_completion.key(),
            agent: job_contract.agent,
            employer: job_contract.employer,
            amount: job_contract.agreed_rate,
        });

        Ok(())
    }

    /// Rate and review a completed service or job
    pub fn submit_review(
        ctx: Context<SubmitReview>,
        review_data: ReviewData,
    ) -> Result<()> {
        let review = &mut ctx.accounts.review;
        let agent = &mut ctx.accounts.agent;
        let clock = Clock::get()?;

        review.reviewer = ctx.accounts.reviewer.key();
        review.agent = agent.key();
        review.review_type = review_data.review_type;
        review.rating = review_data.rating;
        review.comment = review_data.comment;
        review.work_reference = review_data.work_reference;
        review.submitted_at = clock.unix_timestamp;
        review.bump = ctx.bumps.review;

        // Update agent rating (simple average for now)
        let total_reviews = agent.total_jobs_completed;
        if total_reviews > 0 {
            agent.reputation_score = ((agent.reputation_score * (total_reviews - 1)) + review_data.rating as u32) / total_reviews;
        }

        emit!(ReviewSubmittedEvent {
            review: review.key(),
            reviewer: ctx.accounts.reviewer.key(),
            agent: agent.key(),
            rating: review_data.rating,
        });

        Ok(())
    }

    // =====================================================
    // AGENT REPLICATION MARKETPLACE
    // =====================================================

    /// Create a replication template from an existing agent
    pub fn create_replication_template(
        ctx: Context<CreateReplicationTemplate>,
        template_data: ReplicationTemplateData,
    ) -> Result<()> {
        let template = &mut ctx.accounts.replication_template;
        let agent = &ctx.accounts.source_agent;
        let clock = Clock::get()?;

        // Verify agent allows replication
        require!(
            agent.is_replicable,
            PodAIMarketplaceError::UnauthorizedAccess
        );

        template.source_agent = agent.key();
        template.creator = ctx.accounts.creator.key();
        template.genome_hash = agent.genome_hash.clone();
        template.base_capabilities = agent.capabilities.clone();
        template.replication_fee = template_data.replication_fee;
        template.max_replications = template_data.max_replications;
        template.current_replications = 0;
        template.is_active = true;
        template.created_at = clock.unix_timestamp;
        template.bump = ctx.bumps.replication_template;

        emit!(ReplicationTemplateCreatedEvent {
            template: template.key(),
            source_agent: agent.key(),
            creator: ctx.accounts.creator.key(),
            replication_fee: template_data.replication_fee,
        });

        Ok(())
    }

    /// Replicate an agent from a template
    pub fn replicate_agent(
        ctx: Context<ReplicateAgent>,
        customization: AgentCustomization,
    ) -> Result<()> {
        let template = &mut ctx.accounts.replication_template;
        let new_agent = &mut ctx.accounts.new_agent;
        let replication_record = &mut ctx.accounts.replication_record;
        let clock = Clock::get()?;

        require!(template.is_active, PodAIMarketplaceError::AgentNotActive);
        require!(template.current_replications < template.max_replications, PodAIMarketplaceError::InsufficientFunds);

        new_agent.owner = ctx.accounts.buyer.key();
        new_agent.name = customization.name.clone();
        new_agent.description = customization.description.unwrap_or_default();
        new_agent.capabilities = template.base_capabilities.clone();
        new_agent.capabilities.extend(customization.additional_capabilities.clone());
        new_agent.pricing_model = customization.pricing_model;
        new_agent.reputation_score = 0;
        new_agent.total_jobs_completed = 0;
        new_agent.total_earnings = 0;
        new_agent.is_active = true;
        new_agent.created_at = clock.unix_timestamp;
        new_agent.updated_at = clock.unix_timestamp;
        new_agent.genome_hash = template.genome_hash.clone();
        new_agent.is_replicable = customization.is_replicable;
        new_agent.replication_fee = customization.replication_fee.unwrap_or(0);
        new_agent.bump = ctx.bumps.new_agent;

        replication_record.template = template.key();
        replication_record.source_agent = template.source_agent;
        replication_record.replicated_agent = new_agent.key();
        replication_record.buyer = ctx.accounts.buyer.key();
        replication_record.fee_paid = template.replication_fee;
        replication_record.replicated_at = clock.unix_timestamp;
        replication_record.bump = ctx.bumps.replication_record;

        template.current_replications += 1;

        emit!(AgentReplicatedEvent {
            template: template.key(),
            source_agent: template.source_agent,
            new_agent: new_agent.key(),
            buyer: ctx.accounts.buyer.key(),
            fee_paid: template.replication_fee,
        });

        Ok(())
    }

    // =====================================================
    // A2A PROTOCOL COMPLIANCE LAYER
    // =====================================================

    /// Create an A2A protocol session for persistent conversation context
    pub fn create_a2a_session(
        ctx: Context<CreateA2ASession>,
        session_data: A2ASessionData,
    ) -> Result<()> {
        let session = &mut ctx.accounts.session;
        let clock = Clock::get()?;

        session.session_id = session_data.session_id.clone();
        session.creator = ctx.accounts.creator.key();
        session.participants = session_data.participants.clone();
        session.session_type = session_data.session_type;
        session.is_active = true;
        session.created_at = clock.unix_timestamp;
        session.last_activity = clock.unix_timestamp;
        session.bump = ctx.bumps.session;

        emit!(A2ASessionCreatedEvent {
            session: session.key(),
            session_id: session_data.session_id.clone(),
            creator: ctx.accounts.creator.key(),
            participants: session_data.participants.clone(),
        });

        Ok(())
    }

    /// Send an A2A protocol message with multi-modal support
    pub fn send_a2a_message(
        ctx: Context<SendA2AMessage>,
        message_data: A2AMessageData,
    ) -> Result<()> {
        let message = &mut ctx.accounts.message;
        let session = &mut ctx.accounts.session;
        let clock = Clock::get()?;

        message.session_id = session.session_id.clone();
        message.sender = ctx.accounts.sender.key();
        message.role = message_data.role;
        message.parts = message_data.parts.clone();
        message.timestamp = clock.unix_timestamp;
        message.bump = ctx.bumps.message;

        session.last_activity = clock.unix_timestamp;

        emit!(A2AMessageSentEvent {
            session: session.key(),
            message: message.key(),
            sender: ctx.accounts.sender.key(),
            role: message_data.role,
        });

        Ok(())
    }

    /// Update A2A session status for streaming responses
    pub fn update_a2a_status(
        ctx: Context<UpdateA2AStatus>,
        status_data: A2AStatusData,
    ) -> Result<()> {
        let status = &mut ctx.accounts.status;
        let clock = Clock::get()?;

        status.session_id = status_data.session_id.clone();
        status.message_id = status_data.message_id.clone();
        status.state = status_data.state;
        status.progress = status_data.progress;
        status.partial_content = status_data.partial_content;
        status.r#final = status_data.r#final;
        status.timestamp = clock.unix_timestamp;
        status.bump = ctx.bumps.status;

        emit!(A2AStatusUpdatedEvent {
            session_id: status_data.session_id.clone(),
            message_id: status_data.message_id.clone(),
            state: status.state.clone(),
            progress: status_data.progress,
        });

        Ok(())
    }

    /// Process natural language user intent and route to appropriate agents
    pub fn process_user_intent(
        ctx: Context<ProcessUserIntent>,
        intent_data: UserIntentData,
    ) -> Result<()> {
        let intent = &mut ctx.accounts.intent;
        let clock = Clock::get()?;

        intent.user = ctx.accounts.user.key();
        intent.natural_language_query = intent_data.query.clone();
        intent.parsed_intent = intent_data.parsed_intent;
        intent.required_capabilities = intent_data.required_capabilities.clone();
        intent.priority = intent_data.priority;
        intent.status = IntentStatus::Processing;
        intent.created_at = clock.unix_timestamp;
        intent.bump = ctx.bumps.intent;

        emit!(UserIntentProcessedEvent {
            intent: intent.key(),
            user: ctx.accounts.user.key(),
            query: intent_data.query.clone(),
            required_capabilities: intent_data.required_capabilities.clone(),
        });

        Ok(())
    }

    /// Route user intent to appropriate agents based on capabilities
    pub fn route_intent_to_agents(
        ctx: Context<RouteIntentToAgents>,
        routing_data: IntentRoutingData,
    ) -> Result<()> {
        let routing = &mut ctx.accounts.routing;
        let intent = &mut ctx.accounts.intent;
        let clock = Clock::get()?;

        routing.intent = intent.key();
        routing.selected_agents = routing_data.selected_agents.clone();
        routing.routing_strategy = routing_data.strategy;
        routing.created_at = clock.unix_timestamp;
        routing.bump = ctx.bumps.routing;

        // Update intent status
        intent.status = IntentStatus::Routed;

        emit!(IntentRoutedEvent {
            intent: intent.key(),
            routing: routing.key(),
            selected_agents: routing_data.selected_agents.clone(),
        });

        Ok(())
    }

    // =====================================================
    // ADVANCED PRICING & NEGOTIATION SYSTEM
    // =====================================================

    /// Create an auction for agent services
    pub fn create_service_auction(
        ctx: Context<CreateServiceAuction>,
        auction_data: AuctionData,
    ) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        let agent = &ctx.accounts.agent;
        let clock = Clock::get()?;

        require!(agent.is_active, PodAIMarketplaceError::AgentNotActive);
        require!(agent.owner == ctx.accounts.creator.key(), PodAIMarketplaceError::UnauthorizedAccess);
        require!(auction_data.auction_end_time > clock.unix_timestamp, PodAIMarketplaceError::InvalidDeadline);

        auction.agent = agent.key();
        auction.creator = ctx.accounts.creator.key();
        auction.auction_type = auction_data.auction_type;
        auction.starting_price = auction_data.starting_price;
        auction.reserve_price = auction_data.reserve_price;
        auction.current_bid = auction_data.starting_price;
        auction.auction_start_time = clock.unix_timestamp;
        auction.auction_end_time = auction_data.auction_end_time;
        auction.minimum_bid_increment = auction_data.minimum_bid_increment;
        auction.total_bids = 0;
        auction.bids = Vec::new();
        auction.created_at = clock.unix_timestamp;
        auction.bump = ctx.bumps.auction;

        emit!(ServiceAuctionCreatedEvent {
            auction: auction.key(),
            agent: agent.key(),
            creator: ctx.accounts.creator.key(),
            starting_price: auction_data.starting_price,
            auction_type: auction_data.auction_type,
        });

        Ok(())
    }

    /// Place a bid on an auction
    pub fn place_auction_bid(
        ctx: Context<PlaceAuctionBid>,
        bid_amount: u64,
    ) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        let clock = Clock::get()?;

        require!(auction.status == AuctionStatus::Active, PodAIMarketplaceError::InvalidApplicationStatus);
        require!(clock.unix_timestamp < auction.auction_end_time, PodAIMarketplaceError::InvalidDeadline);
        require!(bid_amount > auction.current_bid, PodAIMarketplaceError::InvalidBid);
        require!(bid_amount >= auction.current_bid + auction.minimum_bid_increment, PodAIMarketplaceError::InvalidBid);

        // Store previous bidder info for refund
        let previous_bidder = auction.current_bidder;
        let _previous_bid = auction.current_bid;

        // Update auction with new bid
        auction.current_bid = bid_amount;
        auction.current_bidder = Some(ctx.accounts.bidder.key());
        auction.total_bids += 1;

        // Add bid to history
        let new_bid = AuctionBid {
            bidder: ctx.accounts.bidder.key(),
            amount: bid_amount,
            timestamp: clock.unix_timestamp,
            is_winning: true,
        };
        auction.bids.push(new_bid);

        // Mark previous winning bid as not winning
        if let Some(prev_bid) = auction.bids.iter_mut().find(|b| b.bidder == previous_bidder.unwrap_or_default()) {
            prev_bid.is_winning = false;
        }

        emit!(AuctionBidPlacedEvent {
            auction: auction.key(),
            bidder: ctx.accounts.bidder.key(),
            bid_amount,
            total_bids: auction.total_bids,
        });

        Ok(())
    }

    /// Create dynamic pricing engine for an agent
    pub fn create_dynamic_pricing_engine(
        ctx: Context<CreateDynamicPricingEngine>,
        config: DynamicPricingConfig,
    ) -> Result<()> {
        let engine = &mut ctx.accounts.engine;
        let agent = &ctx.accounts.agent;
        let clock = Clock::get()?;

        require!(agent.is_active, PodAIMarketplaceError::AgentNotActive);
        require!(agent.owner == ctx.accounts.owner.key(), PodAIMarketplaceError::UnauthorizedAccess);

        engine.agent = agent.key();
        engine.owner = ctx.accounts.owner.key();
        engine.config = config.clone();  // Clone here
        engine.current_price = config.base_price;
        engine.demand_metrics = DemandMetrics {
            requests_last_hour: 0,
            requests_last_day: 0,
            requests_last_week: 0,
            average_response_time: 0.0,
            completion_rate: 0.0,
            customer_satisfaction: 0.0,
        };
        engine.reputation_score = agent.reputation_score as f64;
        engine.total_adjustments = 0;
        engine.created_at = clock.unix_timestamp;
        engine.bump = ctx.bumps.engine;

        emit!(DynamicPricingEngineCreatedEvent {
            engine: engine.key(),
            agent: agent.key(),
            owner: ctx.accounts.owner.key(),
            algorithm: config.algorithm,
            base_price: config.base_price,
        });

        Ok(())
    }

    /// Update dynamic pricing based on market conditions
    pub fn update_dynamic_pricing(
        ctx: Context<UpdateDynamicPricing>,
        demand_metrics: DemandMetrics,
    ) -> Result<()> {
        let engine = &mut ctx.accounts.engine;
        let clock = Clock::get()?;

        require!(clock.unix_timestamp >= engine.config.last_update + engine.config.update_frequency, 
                 PodAIMarketplaceError::InvalidDeadline);

        let _old_price = engine.current_price;  // Prefix with underscore
        let mut new_price = engine.config.base_price;

        // Apply demand-based pricing
        if engine.config.algorithm == PricingAlgorithm::DemandBased {
            let demand_multiplier = if demand_metrics.requests_last_hour > 10 { 1.5 } else { 1.0 };
            new_price = (new_price as f64 * demand_multiplier) as u64;
        }

        // Apply reputation-based pricing
        if engine.config.algorithm == PricingAlgorithm::ReputationBased {
            let reputation_multiplier = 1.0 + (engine.reputation_score / 100.0);
            new_price = (new_price as f64 * reputation_multiplier) as u64;
        }

        // Apply surge pricing
        if engine.config.algorithm == PricingAlgorithm::SurgePricing {
            let hour = (clock.unix_timestamp / 3600) % 24;
            let surge_multiplier = if hour >= 9 && hour <= 17 { 1.3 } else { 1.0 };
            new_price = (new_price as f64 * surge_multiplier) as u64;
        }

        // Ensure price stays within bounds
        new_price = new_price.max(engine.config.min_price).min(engine.config.max_price);

        engine.current_price = new_price;
        engine.demand_metrics = demand_metrics.clone();  // Clone here
        engine.config.last_update = clock.unix_timestamp;
        engine.total_adjustments += 1;

        emit!(DynamicPricingUpdatedEvent {
            engine: engine.key(),
            agent: engine.agent,
            owner: engine.owner,
            new_price,
            demand_multiplier: demand_metrics.requests_last_hour as f64 / 10.0,
            supply_multiplier: 1.0,
        });

        Ok(())
    }

    /// Initiate negotiation between parties
    pub fn initiate_negotiation(
        ctx: Context<InitiateNegotiation>,
        initial_offer: u64,
        auto_accept_threshold: u64,
        negotiation_deadline: i64,
    ) -> Result<()> {
        let negotiation = &mut ctx.accounts.negotiation;
        let clock = Clock::get()?;

        require!(negotiation_deadline > clock.unix_timestamp, PodAIMarketplaceError::InvalidDeadline);
        require!(auto_accept_threshold <= initial_offer, PodAIMarketplaceError::InvalidBid);

        negotiation.initiator = ctx.accounts.initiator.key();
        negotiation.counterparty = ctx.accounts.counterparty.key();
        negotiation.initial_offer = initial_offer;
        negotiation.current_offer = initial_offer;
        negotiation.status = NegotiationStatus::InitialOffer;
        negotiation.auto_accept_threshold = auto_accept_threshold;
        negotiation.negotiation_deadline = negotiation_deadline;
        negotiation.created_at = clock.unix_timestamp;
        negotiation.bump = ctx.bumps.negotiation;

        // Add initial message
        let initial_message = NegotiationMessage {
            sender: ctx.accounts.initiator.key(),
            message: "Initial offer submitted".to_string(),
            offer_amount: Some(initial_offer),
            timestamp: clock.unix_timestamp,
            is_auto_generated: false,
        };
        negotiation.messages.push(initial_message);

        emit!(NegotiationInitiatedEvent {
            negotiation: negotiation.key(),
            initiator: ctx.accounts.initiator.key(),
            counterparty: ctx.accounts.counterparty.key(),
            initial_offer,
        });

        Ok(())
    }

    /// Make a counter-offer in negotiation
    pub fn make_counter_offer(
        ctx: Context<MakeCounterOffer>,
        counter_offer: u64,
        message: String,
    ) -> Result<()> {
        let negotiation = &mut ctx.accounts.negotiation;
        let clock = Clock::get()?;

        require!(negotiation.status == NegotiationStatus::InitialOffer || 
                 negotiation.status == NegotiationStatus::CounterOffer, 
                 PodAIMarketplaceError::InvalidApplicationStatus);
        require!(clock.unix_timestamp < negotiation.negotiation_deadline, PodAIMarketplaceError::InvalidDeadline);

        // Store current offer before modifying
        let current_offer = negotiation.current_offer;
        negotiation.counter_offers.push(current_offer);
        negotiation.current_offer = counter_offer;
        negotiation.status = NegotiationStatus::CounterOffer;

        // Add counter-offer message
        let message_for_event = message.clone();
        let counter_message = NegotiationMessage {
            sender: ctx.accounts.sender.key(),
            message,
            offer_amount: Some(counter_offer),
            timestamp: clock.unix_timestamp,
            is_auto_generated: false,
        };
        negotiation.messages.push(counter_message);

        // Check for auto-acceptance
        if counter_offer >= negotiation.auto_accept_threshold {
            negotiation.status = NegotiationStatus::AutoAccepted;
        }

        emit!(CounterOfferMadeEvent {
            negotiation: negotiation.key(),
            sender: ctx.accounts.sender.key(),
            counter_offer,
            message: message_for_event,
            auto_accepted: negotiation.status == NegotiationStatus::AutoAccepted,
        });

        Ok(())
    }

    /// Create bulk/enterprise deal
    pub fn create_bulk_deal(
        ctx: Context<CreateBulkDeal>,
        deal_data: BulkDealData,
    ) -> Result<()> {
        let deal = &mut ctx.accounts.deal;
        let agent = &ctx.accounts.agent;
        let clock = Clock::get()?;

        require!(agent.is_active, PodAIMarketplaceError::AgentNotActive);
        require!(deal_data.end_date > clock.unix_timestamp, PodAIMarketplaceError::InvalidDeadline);

        deal.agent = agent.key();
        deal.customer = ctx.accounts.customer.key();
        deal.deal_type = deal_data.deal_type;
        deal.total_volume = deal_data.total_volume;
        deal.total_value = deal_data.total_value;
        deal.discount_percentage = deal_data.discount_percentage;
        deal.volume_tiers = deal_data.volume_tiers;
        deal.sla_terms = deal_data.sla_terms;
        deal.contract_duration = deal_data.contract_duration;
        deal.start_date = clock.unix_timestamp;
        deal.end_date = deal_data.end_date;
        deal.is_active = true;
        deal.created_at = clock.unix_timestamp;
        deal.bump = ctx.bumps.deal;

        emit!(BulkDealCreatedEvent {
            deal: deal.key(),
            agent: agent.key(),
            customer: ctx.accounts.customer.key(),
            deal_type: deal_data.deal_type,
            total_value: deal_data.total_value,
        });

        Ok(())
    }

    /// Create royalty stream for agent
    pub fn create_royalty_stream(
        ctx: Context<CreateRoyaltyStream>,
        config: RoyaltyConfig,
    ) -> Result<()> {
        let stream = &mut ctx.accounts.stream;
        let agent = &ctx.accounts.agent;
        let clock = Clock::get()?;

        require!(agent.is_active, PodAIMarketplaceError::AgentNotActive);
        require!(agent.owner == ctx.accounts.creator.key(), PodAIMarketplaceError::UnauthorizedAccess);

        stream.agent = agent.key();
        stream.creator = ctx.accounts.creator.key();
        stream.config = config.clone();  // Clone here
        stream.total_earnings = 0;
        stream.total_resales = 0;
        stream.resale_volume = 0;
        stream.last_payout = clock.unix_timestamp;
        stream.created_at = clock.unix_timestamp;
        stream.bump = ctx.bumps.stream;

        emit!(RoyaltyStreamCreatedEvent {
            stream: stream.key(),
            agent: agent.key(),
            creator: ctx.accounts.creator.key(),
            creator_share: config.creator_share,
        });

        Ok(())
    }

    /// List agent for resale
    pub fn list_agent_for_resale(
        ctx: Context<ListAgentForResale>,
        listing_price: u64,
    ) -> Result<()> {
        let resale = &mut ctx.accounts.resale;
        let agent = &ctx.accounts.agent;
        let clock = Clock::get()?;

        require!(agent.is_active, PodAIMarketplaceError::AgentNotActive);
        require!(agent.owner == ctx.accounts.seller.key(), PodAIMarketplaceError::UnauthorizedAccess);

        resale.agent = agent.key();
        resale.seller = ctx.accounts.seller.key();
        resale.listing_price = listing_price;
        resale.original_price = agent.original_price;
        resale.royalty_paid = 0;
        resale.is_sold = false;
        resale.listed_at = clock.unix_timestamp;
        resale.sold_at = None;
        resale.bump = ctx.bumps.resale;

        emit!(AgentListedForResaleEvent {
            resale: resale.key(),
            agent: agent.key(),
            seller: ctx.accounts.seller.key(),
            listing_price,
        });

        Ok(())
    }

    /// File a dispute
    pub fn file_dispute(
        ctx: Context<FileDispute>,
        reason: String,
    ) -> Result<()> {
        let dispute = &mut ctx.accounts.dispute;
        let clock = Clock::get()?;

        dispute.transaction = ctx.accounts.transaction.key();
        dispute.complainant = ctx.accounts.complainant.key();
        dispute.respondent = ctx.accounts.respondent.key();
        dispute.reason = reason;
        dispute.status = DisputeStatus::Filed;
        dispute.resolution = None;
        dispute.evidence = Vec::new();
        dispute.ai_score = 0.0;
        dispute.human_review = false;
        dispute.created_at = clock.unix_timestamp;
        dispute.resolved_at = None;
        dispute.bump = ctx.bumps.dispute;

        emit!(DisputeFiledEvent {
            dispute: dispute.key(),
            complainant: ctx.accounts.complainant.key(),
            respondent: ctx.accounts.respondent.key(),
            reason: dispute.reason.clone(),
        });

        Ok(())
    }

    /// Submit evidence for dispute
    pub fn submit_dispute_evidence(
        ctx: Context<SubmitDisputeEvidence>,
        evidence_type: String,
        evidence_data: String,
    ) -> Result<()> {
        let dispute = &mut ctx.accounts.dispute;
        let clock = Clock::get()?;

        require!(dispute.status == DisputeStatus::Filed || 
                 dispute.status == DisputeStatus::UnderReview, 
                 PodAIMarketplaceError::InvalidApplicationStatus);

        let evidence = DisputeEvidence {
            submitter: ctx.accounts.submitter.key(),
            evidence_type,
            evidence_data,
            timestamp: clock.unix_timestamp,
            is_verified: false,
        };

        dispute.evidence.push(evidence);
        dispute.status = DisputeStatus::EvidenceSubmitted;

        emit!(DisputeEvidenceSubmittedEvent {
            dispute: dispute.key(),
            submitter: ctx.accounts.submitter.key(),
            evidence_count: dispute.evidence.len() as u32,
        });

        Ok(())
    }

    /// Create analytics dashboard
    pub fn create_analytics_dashboard(
        ctx: Context<CreateAnalyticsDashboard>,
        update_frequency: i64,
    ) -> Result<()> {
        let dashboard = &mut ctx.accounts.dashboard;
        let clock = Clock::get()?;

        dashboard.owner = ctx.accounts.owner.key();
        dashboard.agent_analytics = None;
        dashboard.market_analytics = MarketAnalytics {
            total_volume: 0,
            active_agents: 0,
            average_price: 0,
            price_volatility: 0.0,
            demand_trend: 0.0,
            supply_trend: 0.0,
            market_cap: 0,
        };
        dashboard.last_updated = clock.unix_timestamp;
        dashboard.update_frequency = update_frequency;
        dashboard.created_at = clock.unix_timestamp;
        dashboard.bump = ctx.bumps.dashboard;

        emit!(AnalyticsDashboardCreatedEvent {
            dashboard: dashboard.key(),
            owner: ctx.accounts.owner.key(),
        });

        Ok(())
    }

    /// Register extension/plugin
    pub fn register_extension(
        ctx: Context<RegisterExtension>,
        metadata: ExtensionMetadata,
        code_hash: String,
    ) -> Result<()> {
        let extension = &mut ctx.accounts.extension;
        let clock = Clock::get()?;

        extension.developer = ctx.accounts.developer.key();
        extension.extension_type = metadata.extension_type;
        extension.status = ExtensionStatus::Pending;
        extension.metadata = metadata;
        extension.code_hash = code_hash;
        extension.install_count = 0;
        extension.rating = 0.0;
        extension.revenue_share = 0.1; // 10% default revenue share
        extension.total_earnings = 0;
        extension.created_at = clock.unix_timestamp;
        extension.bump = ctx.bumps.extension;

        emit!(ExtensionRegisteredEvent {
            extension: extension.key(),
            developer: ctx.accounts.developer.key(),
            extension_type: extension.extension_type,
        });

        Ok(())
    }

    /// Create incentive program
    pub fn create_incentive_program(
        ctx: Context<CreateIncentiveProgram>,
        config: IncentiveConfig,
    ) -> Result<()> {
        let program = &mut ctx.accounts.program;
        let clock = Clock::get()?;

        program.config = config.clone();  // Clone here
        program.total_distributed = 0;
        program.active_agents = 0;
        program.created_at = clock.unix_timestamp;
        program.bump = ctx.bumps.program;

        emit!(IncentiveProgramCreatedEvent {
            program: program.key(),
            referral_bonus: config.referral_bonus,
            volume_bonus: config.volume_bonus,
        });

        Ok(())
    }

    /// Distribute incentives to agents
    pub fn distribute_incentives(
        ctx: Context<DistributeIncentives>,
        agent: Pubkey,
        incentive_type: String,
        amount: u64,
    ) -> Result<()> {
        let program = &mut ctx.accounts.program;
        let incentives = &mut ctx.accounts.incentives;
        let clock = Clock::get()?;

        // Update agent incentives based on type
        match incentive_type.as_str() {
            "referral" => {
                incentives.referral_earnings += amount;
                incentives.total_referrals += 1;
            },
            "volume" => {
                incentives.volume_bonus_earned += amount;
            },
            "quality" => {
                incentives.quality_bonus_earned += amount;
            },
            "retention" => {
                incentives.retention_bonus_earned += amount;
            },
            "innovation" => {
                incentives.innovation_bonus_earned += amount;
            },
            _ => return Err(PodAIMarketplaceError::InvalidApplicationStatus.into()),
        }

        incentives.total_incentives += amount;
        incentives.last_payout = clock.unix_timestamp;
        program.total_distributed += amount;

        emit!(IncentiveDistributedEvent {
            program: program.key(),
            agent,
            incentive_type,
            amount,
        });

        Ok(())
    }

    // =====================================================
    // CONTEXT STRUCTURES FOR NEW FEATURES
    // =====================================================

    #[derive(Accounts)]
    pub struct CreateServiceAuction<'info> {
        #[account(
            init,
            payer = creator,
            space = AuctionMarketplace::LEN,
            seeds = [b"auction", agent.key().as_ref(), creator.key().as_ref()],
            bump
        )]
        pub auction: Account<'info, AuctionMarketplace>,
        pub agent: Account<'info, Agent>,
        #[account(mut)]
        pub creator: Signer<'info>,
        pub system_program: Program<'info, System>,
    }

    #[derive(Accounts)]
    pub struct PlaceAuctionBid<'info> {
        #[account(mut)]
        pub auction: Account<'info, AuctionMarketplace>,
        #[account(mut)]
        pub bidder: Signer<'info>,
        pub system_program: Program<'info, System>,
    }

    #[derive(Accounts)]
    pub struct CreateDynamicPricingEngine<'info> {
        #[account(
            init,
            payer = owner,
            space = DynamicPricingEngine::LEN,
            seeds = [b"dynamic_pricing", agent.key().as_ref()],
            bump
        )]
        pub engine: Account<'info, DynamicPricingEngine>,
        pub agent: Account<'info, Agent>,
        #[account(mut)]
        pub owner: Signer<'info>,
        pub system_program: Program<'info, System>,
    }

    #[derive(Accounts)]
    pub struct UpdateDynamicPricing<'info> {
        #[account(mut)]
        pub engine: Account<'info, DynamicPricingEngine>,
        pub updater: Signer<'info>,
    }

    #[derive(Accounts)]
    pub struct InitiateNegotiation<'info> {
        #[account(
            init,
            payer = initiator,
            space = NegotiationChatbot::LEN,
            seeds = [b"negotiation", initiator.key().as_ref(), counterparty.key().as_ref()],
            bump
        )]
        pub negotiation: Account<'info, NegotiationChatbot>,
        #[account(mut)]
        pub initiator: Signer<'info>,
        /// CHECK: This is the counterparty in the negotiation
        pub counterparty: AccountInfo<'info>,
        pub system_program: Program<'info, System>,
    }

    #[derive(Accounts)]
    pub struct MakeCounterOffer<'info> {
        #[account(mut)]
        pub negotiation: Account<'info, NegotiationChatbot>,
        pub sender: Signer<'info>,
    }

    #[derive(Accounts)]
    pub struct CreateBulkDeal<'info> {
        #[account(
            init,
            payer = customer,
            space = BulkDeal::LEN,
            seeds = [b"bulk_deal", agent.key().as_ref(), customer.key().as_ref()],
            bump
        )]
        pub deal: Account<'info, BulkDeal>,
        pub agent: Account<'info, Agent>,
        #[account(mut)]
        pub customer: Signer<'info>,
        pub system_program: Program<'info, System>,
    }

    #[derive(Accounts)]
    pub struct CreateRoyaltyStream<'info> {
        #[account(
            init,
            payer = creator,
            space = RoyaltyStream::LEN,
            seeds = [b"royalty_stream", agent.key().as_ref()],
            bump
        )]
        pub stream: Account<'info, RoyaltyStream>,
        pub agent: Account<'info, Agent>,
        #[account(mut)]
        pub creator: Signer<'info>,
        pub system_program: Program<'info, System>,
    }

    #[derive(Accounts)]
    pub struct ListAgentForResale<'info> {
        #[account(
            init,
            payer = seller,
            space = ResaleMarket::LEN,
            seeds = [b"resale", agent.key().as_ref(), seller.key().as_ref()],
            bump
        )]
        pub resale: Account<'info, ResaleMarket>,
        pub agent: Account<'info, Agent>,
        #[account(mut)]
        pub seller: Signer<'info>,
        pub system_program: Program<'info, System>,
    }

    #[derive(Accounts)]
    pub struct FileDispute<'info> {
        #[account(
            init,
            payer = complainant,
            space = DisputeCase::LEN,
            seeds = [b"dispute", transaction.key().as_ref(), complainant.key().as_ref()],
            bump
        )]
        pub dispute: Account<'info, DisputeCase>,
        /// CHECK: This is the transaction being disputed
        pub transaction: AccountInfo<'info>,
        #[account(mut)]
        pub complainant: Signer<'info>,
        /// CHECK: This is the respondent in the dispute
        pub respondent: AccountInfo<'info>,
        pub system_program: Program<'info, System>,
    }

    #[derive(Accounts)]
    pub struct SubmitDisputeEvidence<'info> {
        #[account(mut)]
        pub dispute: Account<'info, DisputeCase>,
        pub submitter: Signer<'info>,
    }

    #[derive(Accounts)]
    pub struct CreateAnalyticsDashboard<'info> {
        #[account(
            init,
            payer = owner,
            space = AnalyticsDashboard::LEN,
            seeds = [b"analytics", owner.key().as_ref()],
            bump
        )]
        pub dashboard: Account<'info, AnalyticsDashboard>,
        #[account(mut)]
        pub owner: Signer<'info>,
        pub system_program: Program<'info, System>,
    }

    #[derive(Accounts)]
    pub struct RegisterExtension<'info> {
        #[account(
            init,
            payer = developer,
            space = Extension::LEN,
            seeds = [b"extension", developer.key().as_ref()],
            bump
        )]
        pub extension: Account<'info, Extension>,
        #[account(mut)]
        pub developer: Signer<'info>,
        pub system_program: Program<'info, System>,
    }

    #[derive(Accounts)]
    pub struct CreateIncentiveProgram<'info> {
        #[account(
            init,
            payer = creator,
            space = IncentiveProgram::LEN,
            seeds = [b"incentive_program", creator.key().as_ref()],
            bump
        )]
        pub program: Account<'info, IncentiveProgram>,
        #[account(mut)]
        pub creator: Signer<'info>,
        pub system_program: Program<'info, System>,
    }

    #[derive(Accounts)]
    pub struct DistributeIncentives<'info> {
        #[account(mut)]
        pub program: Account<'info, IncentiveProgram>,
        #[account(mut)]
        pub incentives: Account<'info, AgentIncentives>,
        pub distributor: Signer<'info>,
    }

    // =====================================================
    // EVENT STRUCTURES FOR NEW FEATURES
    // =====================================================

    #[event]
    pub struct ServiceAuctionCreatedEvent {
        pub auction: Pubkey,
        pub agent: Pubkey,
        pub creator: Pubkey,
        pub starting_price: u64,
        pub auction_type: AuctionType,
    }

    #[event]
    pub struct AuctionBidPlacedEvent {
        pub auction: Pubkey,
        pub bidder: Pubkey,
        pub bid_amount: u64,
        pub total_bids: u32,
    }

    #[event]
    pub struct DynamicPricingEngineCreatedEvent {
        pub engine: Pubkey,
        pub agent: Pubkey,
        pub owner: Pubkey,
        pub algorithm: PricingAlgorithm,
        pub base_price: u64,
    }

    #[event]
    pub struct BulkDealCreatedEvent {
        pub deal: Pubkey,
        pub agent: Pubkey,
        pub customer: Pubkey,
        pub deal_type: DealType,
        pub total_value: u64,
    }

    #[event]
    pub struct RoyaltyStreamCreatedEvent {
        pub stream: Pubkey,
        pub agent: Pubkey,
        pub creator: Pubkey,
        pub creator_share: f64,
    }

    #[event]
    pub struct AgentListedForResaleEvent {
        pub resale: Pubkey,
        pub agent: Pubkey,
        pub seller: Pubkey,
        pub listing_price: u64,
    }

    #[event]
    pub struct DisputeFiledEvent {
        pub dispute: Pubkey,
        pub complainant: Pubkey,
        pub respondent: Pubkey,
        pub reason: String,
    }

    #[event]
    pub struct DisputeEvidenceSubmittedEvent {
        pub dispute: Pubkey,
        pub submitter: Pubkey,
        pub evidence_count: u32,
    }

    #[event]
    pub struct AnalyticsDashboardCreatedEvent {
        pub dashboard: Pubkey,
        pub owner: Pubkey,
    }

    #[event]
    pub struct ExtensionRegisteredEvent {
        pub extension: Pubkey,
        pub developer: Pubkey,
        pub extension_type: ExtensionType,
    }

    #[event]
    pub struct IncentiveProgramCreatedEvent {
        pub program: Pubkey,
        pub referral_bonus: f64,
        pub volume_bonus: f64,
    }

    #[event]
    pub struct IncentiveDistributedEvent {
        pub program: Pubkey,
        pub agent: Pubkey,
        pub incentive_type: String,
        pub amount: u64,
    }

    #[event]
    pub struct DynamicPricingUpdatedEvent {
        pub engine: Pubkey,
        pub agent: Pubkey,
        pub owner: Pubkey,
        pub new_price: u64,
        pub demand_multiplier: f64,
        pub supply_multiplier: f64,
    }

    #[event]
    pub struct NegotiationInitiatedEvent {
        pub negotiation: Pubkey,
        pub initiator: Pubkey,
        pub counterparty: Pubkey,
        pub initial_offer: u64,
    }

    #[event]
    pub struct CounterOfferMadeEvent {
        pub negotiation: Pubkey,
        pub sender: Pubkey,
        pub counter_offer: u64,
        pub message: String,
        pub auto_accepted: bool,
    }

    // =====================================================
    // DATA STRUCTURES FOR NEW FEATURES
    // =====================================================

    #[derive(AnchorSerialize, AnchorDeserialize, Clone)]
    pub struct BulkDealData {
        pub deal_type: DealType,
        pub total_volume: u32,
        pub total_value: u64,
        pub discount_percentage: f64,
        pub volume_tiers: Vec<VolumeTier>,
        pub sla_terms: String,
        pub contract_duration: i64,
        pub end_date: i64,
    }

    // ... existing code ...
}

// =====================================================
// ACCOUNT STRUCTURES
// =====================================================

#[account]
pub struct Agent {
    pub owner: Pubkey,
    pub name: String,
    pub description: String,
    pub capabilities: Vec<String>,
    pub pricing_model: PricingModel,
    pub reputation_score: u32,
    pub total_jobs_completed: u32,
    pub total_earnings: u64,
    pub is_active: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub original_price: u64,
    pub genome_hash: String,
    pub is_replicable: bool,
    pub replication_fee: u64,
    pub bump: u8,
}

#[account]
pub struct Channel {
    pub creator: Pubkey,
    pub participants: Vec<Pubkey>,
    pub channel_type: ChannelType,
    pub is_private: bool,
    pub message_count: u64,
    pub created_at: i64,
    pub last_activity: i64,
    pub is_active: bool,
    pub bump: u8,
}

#[account]
pub struct Message {
    pub channel: Pubkey,
    pub sender: Pubkey,
    pub content: String,
    pub message_type: MessageType,
    pub timestamp: i64,
    pub is_encrypted: bool,
    pub bump: u8,
}

#[account]
pub struct WorkOrder {
    pub client: Pubkey,
    pub provider: Pubkey,
    pub title: String,
    pub description: String,
    pub requirements: Vec<String>,
    pub payment_amount: u64,
    pub payment_token: Pubkey,
    pub deadline: i64,
    pub status: WorkOrderStatus,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

#[account]
pub struct WorkDelivery {
    pub work_order: Pubkey,
    pub provider: Pubkey,
    pub client: Pubkey,
    pub deliverables: Vec<Deliverable>,
    pub ipfs_hash: String,
    pub metadata_uri: String,
    pub submitted_at: i64,
    pub is_approved: bool,
    pub bump: u8,
}

#[account]
pub struct Payment {
    pub work_order: Pubkey,
    pub payer: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub token_mint: Pubkey,
    pub is_confidential: bool,
    pub paid_at: i64,
    pub bump: u8,
}

#[account]
pub struct ReplicationTemplate {
    pub source_agent: Pubkey,
    pub creator: Pubkey,
    pub genome_hash: String,
    pub base_capabilities: Vec<String>,
    pub replication_fee: u64,
    pub max_replications: u32,
    pub current_replications: u32,
    pub is_active: bool,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
pub struct ReplicationRecord {
    pub template: Pubkey,
    pub source_agent: Pubkey,
    pub replicated_agent: Pubkey,
    pub buyer: Pubkey,
    pub fee_paid: u64,
    pub replicated_at: i64,
    pub bump: u8,
}

// =====================================================
// ACCOUNT SIZE CONSTANTS
// =====================================================

impl Agent {
    pub const LEN: usize = 8 + // discriminator
        32 + // owner
        4 + 100 + // name (max 100 chars)
        4 + 500 + // description (max 500 chars)
        4 + (10 * (4 + 50)) + // capabilities (max 10 capabilities, 50 chars each)
        1 + // pricing_model
        8 + // reputation_score
        8 + // total_jobs_completed
        8 + // total_earnings
        1 + // is_active
        8 + // created_at
        8 + // updated_at
        4 + 64 + // genome_hash (max 64 chars)
        1 + // is_replicable
        8 + // replication_fee
        1; // bump
}

impl Channel {
    pub const LEN: usize = 8 + // discriminator
        32 + // creator
        4 + (10 * 32) + // participants (max 10 participants)
        1 + // channel_type
        1 + // is_private
        8 + // message_count
        8 + // created_at
        8 + // last_activity
        1 + // is_active
        1; // bump
}

impl Message {
    pub const LEN: usize = 8 + // discriminator
        32 + // channel
        32 + // sender
        4 + 1000 + // content (max 1000 chars)
        1 + // message_type
        8 + // timestamp
        1 + // is_encrypted
        1; // bump
}

impl WorkOrder {
    pub const LEN: usize = 8 + // discriminator
        32 + // client
        32 + // provider
        4 + 100 + // title (max 100 chars)
        4 + 500 + // description (max 500 chars)
        4 + (10 * (4 + 50)) + // requirements (max 10 requirements, 50 chars each)
        8 + // payment_amount
        32 + // payment_token
        8 + // deadline
        1 + // status
        8 + // created_at
        8 + // updated_at
        1; // bump
}

impl WorkDelivery {
    pub const LEN: usize = 8 + // discriminator
        32 + // work_order
        32 + // provider
        32 + // client
        4 + (5 * (4 + 100)) + // deliverables (max 5 deliverables, 100 chars each)
        4 + 64 + // ipfs_hash (max 64 chars)
        4 + 200 + // metadata_uri (max 200 chars)
        8 + // submitted_at
        1 + // is_approved
        1; // bump
}

impl Payment {
    pub const LEN: usize = 8 + // discriminator
        32 + // work_order
        32 + // payer
        32 + // recipient
        8 + // amount
        32 + // token_mint
        1 + // is_confidential
        8 + // paid_at
        1; // bump
}

impl ReplicationTemplate {
    pub const LEN: usize = 8 + // discriminator
        32 + // source_agent
        32 + // creator
        4 + 64 + // genome_hash (max 64 chars)
        4 + (10 * (4 + 50)) + // base_capabilities (max 10 capabilities, 50 chars each)
        8 + // replication_fee
        4 + // max_replications
        4 + // current_replications
        1 + // is_active
        8 + // created_at
        1; // bump
}

impl ReplicationRecord {
    pub const LEN: usize = 8 + // discriminator
        32 + // template
        32 + // source_agent
        32 + // replicated_agent
        32 + // buyer
        8 + // fee_paid
        8 + // replicated_at
        1; // bump
}

// =====================================================
// INSTRUCTION CONTEXTS
// =====================================================

#[derive(Accounts)]
#[instruction(agent_data: AgentRegistrationData)]
pub struct RegisterAgent<'info> {
    #[account(
        init,
        payer = owner,
        space = Agent::LEN,
        seeds = [b"agent", owner.key().as_ref()],
        bump
    )]
    pub agent: Account<'info, Agent>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateAgent<'info> {
    #[account(
        mut,
        seeds = [b"agent", owner.key().as_ref()],
        bump = agent.bump,
        has_one = owner
    )]
    pub agent: Account<'info, Agent>,
    
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(channel_data: ChannelCreationData)]
pub struct CreateChannel<'info> {
    #[account(
        init,
        payer = creator,
        space = Channel::LEN,
        seeds = [b"channel", creator.key().as_ref(), &channel_data.channel_id.to_le_bytes()],
        bump
    )]
    pub channel: Account<'info, Channel>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(message_data: MessageData)]
pub struct SendMessage<'info> {
    #[account(
        init,
        payer = sender,
        space = Message::LEN,
        seeds = [b"message", channel.key().as_ref(), &channel.message_count.to_le_bytes()],
        bump
    )]
    pub message: Account<'info, Message>,
    
    #[account(mut)]
    pub channel: Account<'info, Channel>,
    
    #[account(mut)]
    pub sender: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(work_order_data: WorkOrderData)]
pub struct CreateWorkOrder<'info> {
    #[account(
        init,
        payer = client,
        space = WorkOrder::LEN,
        seeds = [b"work_order", client.key().as_ref(), &work_order_data.order_id.to_le_bytes()],
        bump
    )]
    pub work_order: Account<'info, WorkOrder>,
    
    #[account(mut)]
    pub client: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(delivery_data: WorkDeliveryData)]
pub struct SubmitWorkDelivery<'info> {
    #[account(
        init,
        payer = provider,
        space = WorkDelivery::LEN,
        seeds = [b"work_delivery", work_order.key().as_ref()],
        bump
    )]
    pub work_delivery: Account<'info, WorkDelivery>,
    
    #[account(mut)]
    pub work_order: Account<'info, WorkOrder>,
    
    #[account(mut)]
    pub provider: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ProcessPayment<'info> {
    #[account(
        init,
        payer = payer,
        space = Payment::LEN,
        seeds = [b"payment", work_order.key().as_ref()],
        bump
    )]
    pub payment: Account<'info, Payment>,
    
    #[account(mut)]
    pub work_order: Account<'info, WorkOrder>,
    
    #[account(mut)]
    pub provider_agent: Account<'info, Agent>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    #[account(mut)]
    pub payer_token_account: InterfaceAccount<'info, TokenAccount>,
    
    #[account(mut)]
    pub provider_token_account: InterfaceAccount<'info, TokenAccount>,
    
    pub token_mint: InterfaceAccount<'info, Mint>,
    
    pub token_program: Interface<'info, TokenInterface>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(template_data: ReplicationTemplateData)]
pub struct CreateReplicationTemplate<'info> {
    #[account(
        init,
        payer = creator,
        space = ReplicationTemplate::LEN,
        seeds = [b"replication_template", source_agent.key().as_ref()],
        bump
    )]
    pub replication_template: Account<'info, ReplicationTemplate>,
    
    pub source_agent: Account<'info, Agent>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(customization: AgentCustomization)]
pub struct ReplicateAgent<'info> {
    #[account(mut)]
    pub replication_template: Account<'info, ReplicationTemplate>,
    
    #[account(
        init,
        payer = buyer,
        space = Agent::LEN,
        seeds = [b"agent", buyer.key().as_ref()],
        bump
    )]
    pub new_agent: Account<'info, Agent>,
    
    #[account(
        init,
        payer = buyer,
        space = ReplicationRecord::LEN,
        seeds = [b"replication_record", replication_template.key().as_ref(), buyer.key().as_ref()],
        bump
    )]
    pub replication_record: Account<'info, ReplicationRecord>,
    
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

// =====================================================
// A2A PROTOCOL ACCOUNT STRUCTURES
// =====================================================

#[account]
pub struct A2ASession {
    pub session_id: String,
    pub creator: Pubkey,
    pub participants: Vec<Pubkey>,
    pub session_type: SessionType,
    pub is_active: bool,
    pub created_at: i64,
    pub last_activity: i64,
    pub bump: u8,
}

#[account]
pub struct A2AMessage {
    pub session_id: String,
    pub sender: Pubkey,
    pub role: MessageRole,
    pub parts: Vec<MessagePart>,
    pub timestamp: i64,
    pub bump: u8,
}

#[account]
pub struct A2AStatus {
    pub session_id: String,
    pub message_id: String,
    pub state: MessageStatus,
    pub progress: u8, // 0-100
    pub partial_content: String,
    pub r#final: bool,
    pub timestamp: i64,
    pub bump: u8,
}

#[account]
pub struct UserIntent {
    pub user: Pubkey,
    pub natural_language_query: String,
    pub parsed_intent: IntentType,
    pub required_capabilities: Vec<String>,
    pub priority: Priority,
    pub status: IntentStatus,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
pub struct IntentRouting {
    pub intent: Pubkey,
    pub selected_agents: Vec<Pubkey>,
    pub routing_strategy: RoutingStrategy,
    pub created_at: i64,
    pub bump: u8,
}

// =====================================================
// A2A PROTOCOL ACCOUNT SIZE CONSTANTS
// =====================================================

impl A2ASession {
    pub const LEN: usize = 8 + // discriminator
        4 + 64 + // session_id (max 64 chars)
        32 + // creator
        4 + (10 * 32) + // participants (max 10 participants)
        1 + // session_type
        1 + // is_active
        8 + // created_at
        8 + // last_activity
        1; // bump
}

impl A2AMessage {
    pub const LEN: usize = 8 + // discriminator
        4 + 64 + // session_id (max 64 chars)
        32 + // sender
        1 + // role
        4 + (5 * (1 + 4 + 1000 + 4 + 100)) + // parts (max 5 parts, each with type + content + metadata)
        8 + // timestamp
        1; // bump
}

impl A2AStatus {
    pub const LEN: usize = 8 + // discriminator
        4 + 64 + // session_id (max 64 chars)
        4 + 64 + // message_id (max 64 chars)
        1 + // state
        1 + // progress
        4 + 2000 + // partial_content (max 2000 chars)
        1 + // final
        8 + // timestamp
        1; // bump
}

impl UserIntent {
    pub const LEN: usize = 8 + // discriminator
        32 + // user
        4 + 1000 + // natural_language_query (max 1000 chars)
        1 + // parsed_intent
        4 + (10 * (4 + 50)) + // required_capabilities (max 10 capabilities, 50 chars each)
        1 + // priority
        1 + // status
        8 + // created_at
        1; // bump
}

impl IntentRouting {
    pub const LEN: usize = 8 + // discriminator
        32 + // intent
        4 + (10 * 32) + // selected_agents (max 10 agents)
        1 + // routing_strategy
        8 + // created_at
        1; // bump
}

// =====================================================
// A2A PROTOCOL DATA STRUCTURES
// =====================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum MessageRole {
    User,
    Agent,
    System,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum MessageStatus {
    Working,
    Completed,
    Failed,
    InputRequired,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum SessionType {
    Direct,
    Group,
    Swarm,
    UserToAgent,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum IntentType {
    Query,
    Task,
    Request,
    Command,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Priority {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum IntentStatus {
    Processing,
    Routed,
    Completed,
    Failed,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum RoutingStrategy {
    SingleAgent,
    MultiAgent,
    Swarm,
    LoadBalanced,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MessagePart {
    pub part_type: PartType,
    pub content: String,
    pub metadata: Option<String>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum PartType {
    Text,
    File,
    Image,
    Audio,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct A2ASessionData {
    pub session_id: String,
    pub participants: Vec<Pubkey>,
    pub session_type: SessionType,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct A2AMessageData {
    pub role: MessageRole,
    pub parts: Vec<MessagePart>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct A2AStatusData {
    pub session_id: String,
    pub message_id: String,
    pub state: MessageStatus,
    pub progress: u8,
    pub partial_content: String,
    pub r#final: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UserIntentData {
    pub query: String,
    pub parsed_intent: IntentType,
    pub required_capabilities: Vec<String>,
    pub priority: Priority,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct IntentRoutingData {
    pub selected_agents: Vec<Pubkey>,
    pub strategy: RoutingStrategy,
}

// =====================================================
// A2A PROTOCOL CONTEXT STRUCTURES
// =====================================================

#[derive(Accounts)]
pub struct CreateA2ASession<'info> {
    #[account(
        init,
        payer = creator,
        space = A2ASession::LEN,
        seeds = [b"a2a_session", creator.key().as_ref()],
        bump
    )]
    pub session: Account<'info, A2ASession>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SendA2AMessage<'info> {
    #[account(
        init,
        payer = sender,
        space = A2AMessage::LEN,
        seeds = [b"a2a_message", session.key().as_ref(), &session.last_activity.to_le_bytes()],
        bump
    )]
    pub message: Account<'info, A2AMessage>,
    
    #[account(mut)]
    pub session: Account<'info, A2ASession>,
    
    #[account(mut)]
    pub sender: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateA2AStatus<'info> {
    #[account(
        init,
        payer = updater,
        space = A2AStatus::LEN,
        seeds = [b"a2a_status", session.key().as_ref()],
        bump
    )]
    pub status: Account<'info, A2AStatus>,
    
    pub session: Account<'info, A2ASession>,
    
    #[account(mut)]
    pub updater: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ProcessUserIntent<'info> {
    #[account(
        init,
        payer = user,
        space = UserIntent::LEN,
        seeds = [b"user_intent", user.key().as_ref(), &clock.unix_timestamp.to_le_bytes()],
        bump
    )]
    pub intent: Account<'info, UserIntent>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub clock: Sysvar<'info, Clock>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RouteIntentToAgents<'info> {
    #[account(
        init,
        payer = router,
        space = IntentRouting::LEN,
        seeds = [b"intent_routing", intent.key().as_ref()],
        bump
    )]
    pub routing: Account<'info, IntentRouting>,
    
    #[account(mut)]
    pub intent: Account<'info, UserIntent>,
    
    #[account(mut)]
    pub router: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

// =====================================================
// A2A PROTOCOL EVENTS
// =====================================================

#[event]
pub struct AgentRegisteredEvent {
    pub agent: Pubkey,
    pub owner: Pubkey,
    pub name: String,
    pub capabilities: Vec<String>,
}

#[event]
pub struct AgentUpdatedEvent {
    pub agent: Pubkey,
    pub owner: Pubkey,
    pub name: String,
}

#[event]
pub struct ChannelCreatedEvent {
    pub channel: Pubkey,
    pub creator: Pubkey,
    pub channel_type: ChannelType,
}

#[event]
pub struct MessageSentEvent {
    pub message: Pubkey,
    pub channel: Pubkey,
    pub sender: Pubkey,
    pub message_type: MessageType,
}

#[event]
pub struct WorkOrderCreatedEvent {
    pub work_order: Pubkey,
    pub client: Pubkey,
    pub provider: Pubkey,
    pub title: String,
    pub payment_amount: u64,
}

#[event]
pub struct WorkDeliverySubmittedEvent {
    pub work_delivery: Pubkey,
    pub work_order: Pubkey,
    pub provider: Pubkey,
    pub ipfs_hash: String,
}

#[event]
pub struct PaymentProcessedEvent {
    pub payment: Pubkey,
    pub payer: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub is_confidential: bool,
}

#[event]
pub struct ReplicationTemplateCreatedEvent {
    pub template: Pubkey,
    pub source_agent: Pubkey,
    pub creator: Pubkey,
    pub replication_fee: u64,
}

#[event]
pub struct AgentReplicatedEvent {
    pub template: Pubkey,
    pub source_agent: Pubkey,
    pub new_agent: Pubkey,
    pub buyer: Pubkey,
    pub fee_paid: u64,
}

#[event]
pub struct A2ASessionCreatedEvent {
    pub session: Pubkey,
    pub session_id: String,
    pub creator: Pubkey,
    pub participants: Vec<Pubkey>,
}

#[event]
pub struct A2AMessageSentEvent {
    pub session: Pubkey,
    pub message: Pubkey,
    pub sender: Pubkey,
    pub role: MessageRole,
}

#[event]
pub struct A2AStatusUpdatedEvent {
    pub session_id: String,
    pub message_id: String,
    pub state: MessageStatus,
    pub progress: u8,
}

#[event]
pub struct UserIntentProcessedEvent {
    pub intent: Pubkey,
    pub user: Pubkey,
    pub query: String,
    pub required_capabilities: Vec<String>,
}

#[event]
pub struct IntentRoutedEvent {
    pub intent: Pubkey,
    pub routing: Pubkey,
    pub selected_agents: Vec<Pubkey>,
}

// =====================================================
// MISSING ACCOUNT STRUCTURES
// =====================================================

#[account]
pub struct ServiceListing {
    pub agent: Pubkey,
    pub owner: Pubkey,
    pub title: String,
    pub description: String,
    pub price: u64,
    pub token_mint: Pubkey,
    pub service_type: String,
    pub payment_token: Pubkey,
    pub estimated_delivery: i64,
    pub tags: Vec<String>,
    pub is_active: bool,
    pub total_orders: u32,
    pub rating: f64,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

#[account]
pub struct ServicePurchase {
    pub customer: Pubkey,
    pub agent: Pubkey,
    pub listing: Pubkey,
    pub listing_id: u64,
    pub quantity: u32,
    pub requirements: Vec<String>,
    pub custom_instructions: String,
    pub deadline: i64,
    pub payment_amount: u64,
    pub payment_token: Pubkey,
    pub status: PurchaseStatus,
    pub purchased_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

#[account]
pub struct JobPosting {
    pub employer: Pubkey,
    pub title: String,
    pub description: String,
    pub requirements: Vec<String>,
    pub budget: u64,
    pub deadline: i64,
    pub skills_needed: Vec<String>,
    pub budget_min: u64,
    pub budget_max: u64,
    pub payment_token: Pubkey,
    pub job_type: String,
    pub experience_level: String,
    pub is_active: bool,
    pub applications_count: u32,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

#[account]
pub struct JobApplication {
    pub job_posting: Pubkey,
    pub agent: Pubkey,
    pub agent_owner: Pubkey,
    pub cover_letter: String,
    pub proposed_rate: u64,
    pub estimated_delivery: i64,
    pub portfolio_items: Vec<String>,
    pub status: ApplicationStatus,
    pub applied_at: i64,
    pub bump: u8,
}

#[account]
pub struct JobContract {
    pub job_posting: Pubkey,
    pub application: Pubkey,
    pub employer: Pubkey,
    pub agent: Pubkey,
    pub agreed_rate: u64,
    pub deadline: i64,
    pub payment_token: Pubkey,
    pub status: ContractStatus,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

#[account]
pub struct JobCompletion {
    pub contract: Pubkey,
    pub agent: Pubkey,
    pub employer: Pubkey,
    pub deliverables: Vec<Deliverable>,
    pub work_summary: String,
    pub ipfs_hash: String,
    pub metadata_uri: String,
    pub completed_at: i64,
    pub is_approved: bool,
    pub bump: u8,
}

#[account]
pub struct Review {
    pub reviewer: Pubkey,
    pub agent: Pubkey,
    pub review_type: String,
    pub rating: u8,
    pub comment: String,
    pub work_reference: String,
    pub submitted_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum PurchaseStatus {
    Pending,
    Confirmed,
    Completed,
    Cancelled,
    Paid,
}

impl ServiceListing {
    pub const LEN: usize = 8 + // discriminator
        32 + // creator
        4 + 100 + // title (max 100 chars)
        4 + 500 + // description (max 500 chars)
        8 + // price
        32 + // token_mint
        4 + 50 + // service_type (max 50 chars)
        32 + // payment_token
        8 + // estimated_delivery
        4 + (10 * 4 + 50) + // tags (max 10 tags, 50 chars each)
        1 + // is_active
        8 + // created_at
        8 + // updated_at
        1; // bump
}

impl ServicePurchase {
    pub const LEN: usize = 8 + // discriminator
        32 + // buyer
        32 + // listing
        8 + // listing_id
        4 + // quantity
        4 + (5 * 4 + 100) + // requirements (max 5 reqs, 100 chars each)
        4 + 500 + // custom_instructions (max 500 chars)
        8 + // deadline
        1 + // status
        8 + // created_at
        1; // bump
}

impl JobPosting {
    pub const LEN: usize = 8 + // discriminator
        32 + // employer
        4 + 100 + // title (max 100 chars)
        4 + 500 + // description (max 500 chars)
        4 + (10 * 4 + 100) + // requirements (max 10 reqs, 100 chars each)
        8 + // budget
        8 + // deadline
        4 + (10 * 4 + 50) + // skills_needed (max 10 skills, 50 chars each)
        8 + // budget_min
        8 + // budget_max
        32 + // payment_token
        4 + 50 + // job_type (max 50 chars)
        4 + 50 + // experience_level (max 50 chars)
        1 + // is_active
        4 + // applications_count
        8 + // created_at
        8 + // updated_at
        1; // bump
}

impl JobApplication {
    pub const LEN: usize = 8 + // discriminator
        32 + // job_posting
        32 + // agent
        32 + // agent_owner
        4 + 1000 + // cover_letter (max 1000 chars)
        8 + // proposed_rate
        8 + // estimated_delivery
        4 + (5 * 4 + 100) + // portfolio_items (max 5 items, 100 chars each)
        1 + // status
        8 + // applied_at
        1; // bump
}

impl JobContract {
    pub const LEN: usize = 8 + // discriminator
        32 + // job_posting
        32 + // application
        32 + // employer
        32 + // agent
        8 + // agreed_rate
        8 + // deadline
        32 + // payment_token
        1 + // status
        8 + // created_at
        8 + // updated_at
        1; // bump
}

impl JobCompletion {
    pub const LEN: usize = 8 + // discriminator
        32 + // contract
        32 + // agent
        32 + // employer
        4 + (5 * 1) + // deliverables (max 5)
        4 + 1000 + // work_summary (max 1000 chars)
        4 + 64 + // ipfs_hash (max 64 chars)
        4 + 200 + // metadata_uri (max 200 chars)
        8 + // completed_at
        1 + // is_approved
        1; // bump
}

impl Review {
    pub const LEN: usize = 8 + // discriminator
        32 + // reviewer
        32 + // agent
        4 + 50 + // review_type (max 50 chars)
        1 + // rating
        4 + 500 + // comment (max 500 chars)
        4 + 100 + // work_reference (max 100 chars)
        8 + // submitted_at
        1; // bump
}

// =====================================================
// MISSING ACCOUNT CONTEXT STRUCTURES
// =====================================================

#[derive(Accounts)]
pub struct CreateServiceListing<'info> {
    #[account(
        init,
        payer = creator,
        space = ServiceListing::LEN,
        seeds = [b"service_listing", creator.key().as_ref(), service_listing.key().as_ref()],
        bump
    )]
    pub service_listing: Account<'info, ServiceListing>,
    pub agent: Account<'info, Agent>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PurchaseService<'info> {
    #[account(
        init,
        payer = buyer,
        space = ServicePurchase::LEN,
        seeds = [b"service_purchase", buyer.key().as_ref(), service_listing.key().as_ref()],
        bump
    )]
    pub service_purchase: Account<'info, ServicePurchase>,
    #[account(mut)]
    pub service_listing: Account<'info, ServiceListing>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateJobPosting<'info> {
    #[account(
        init,
        payer = employer,
        space = JobPosting::LEN,
        seeds = [b"job_posting", employer.key().as_ref()],
        bump
    )]
    pub job_posting: Account<'info, JobPosting>,
    
    #[account(mut)]
    pub employer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApplyToJob<'info> {
    #[account(
        init,
        payer = agent_owner,
        space = JobApplication::LEN,
        seeds = [b"job_application", job_posting.key().as_ref(), agent.key().as_ref()],
        bump
    )]
    pub job_application: Account<'info, JobApplication>,
    
    #[account(mut)]
    pub job_posting: Account<'info, JobPosting>,
    
    pub agent: Account<'info, Agent>,
    
    #[account(mut)]
    pub agent_owner: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AcceptJobApplication<'info> {
    #[account(
        init,
        payer = employer,
        space = JobContract::LEN,
        seeds = [b"job_contract", job_posting.key().as_ref(), job_application.key().as_ref()],
        bump
    )]
    pub job_contract: Account<'info, JobContract>,
    
    #[account(mut)]
    pub job_posting: Account<'info, JobPosting>,
    
    #[account(mut)]
    pub job_application: Account<'info, JobApplication>,
    
    #[account(mut)]
    pub employer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CompleteHiredJob<'info> {
    #[account(
        init,
        payer = agent_owner,
        space = JobCompletion::LEN,
        seeds = [b"job_completion", job_contract.key().as_ref()],
        bump
    )]
    pub job_completion: Account<'info, JobCompletion>,
    
    #[account(mut)]
    pub job_contract: Account<'info, JobContract>,
    
    #[account(mut)]
    pub agent: Account<'info, Agent>,
    
    #[account(mut)]
    pub agent_owner: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitReview<'info> {
    #[account(
        init,
        payer = reviewer,
        space = Review::LEN,
        seeds = [b"review", agent.key().as_ref(), reviewer.key().as_ref()],
        bump
    )]
    pub review: Account<'info, Review>,
    
    #[account(mut)]
    pub agent: Account<'info, Agent>,
    
    #[account(mut)]
    pub reviewer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

// =====================================================
// MISSING EVENTS
// =====================================================

#[event]
pub struct ServiceListingCreatedEvent {
    pub listing: Pubkey,
    pub creator: Pubkey,
    pub title: String,
    pub price: u64,
}

#[event]
pub struct ServicePurchasedEvent {
    pub purchase: Pubkey,
    pub listing: Pubkey,
    pub buyer: Pubkey,
    pub quantity: u32,
}

#[event]
pub struct JobPostingCreatedEvent {
    pub job_posting: Pubkey,
    pub employer: Pubkey,
    pub title: String,
    pub budget_min: u64,
    pub budget_max: u64,
}

#[event]
pub struct JobApplicationSubmittedEvent {
    pub job_posting: Pubkey,
    pub application: Pubkey,
    pub agent: Pubkey,
    pub proposed_rate: u64,
}

#[event]
pub struct JobApplicationAcceptedEvent {
    pub job_posting: Pubkey,
    pub application: Pubkey,
    pub contract: Pubkey,
    pub employer: Pubkey,
    pub agent: Pubkey,
}

#[event]
pub struct HiredJobCompletedEvent {
    pub contract: Pubkey,
    pub completion: Pubkey,
    pub agent: Pubkey,
    pub employer: Pubkey,
    pub amount: u64,
}

#[event]
pub struct ReviewSubmittedEvent {
    pub review: Pubkey,
    pub reviewer: Pubkey,
    pub agent: Pubkey,
    pub rating: u8,
}

// =====================================================
// ERROR HANDLING
// =====================================================

#[error_code]
pub enum PodAIMarketplaceError {
    #[msg("Agent is not active")]
    AgentNotActive,
    #[msg("Job posting is not active")]
    JobNotActive,
    #[msg("Invalid application status")]
    InvalidApplicationStatus,
    #[msg("Invalid contract status")]
    InvalidContractStatus,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Invalid payment amount")]
    InvalidPaymentAmount,
    #[msg("Service listing not found")]
    ServiceListingNotFound,
    #[msg("Job posting not found")]
    JobPostingNotFound,
    #[msg("Application not found")]
    ApplicationNotFound,
    #[msg("Contract not found")]
    ContractNotFound,
    #[msg("Unauthorized access")]
    UnauthorizedAccess,
    #[msg("Invalid deadline")]
    InvalidDeadline,
    #[msg("Invalid rating")]
    InvalidRating,
    #[msg("Service not active")]
    ServiceNotActive,
    #[msg("Invalid bid")]
    InvalidBid,
}

// =====================================================
// ADVANCED PRICING ACCOUNT STRUCTURES
// =====================================================

#[account]
pub struct ServiceAuction {
    pub agent: Pubkey,
    pub creator: Pubkey,
    pub auction_type: AuctionType,
    pub starting_price: u64,
    pub reserve_price: u64,
    pub current_bid: u64,
    pub current_bidder: Option<Pubkey>,
    pub auction_end_time: i64,
    pub minimum_bid_increment: u64,
    pub total_bids: u32,
    pub is_active: bool,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
pub struct Negotiation {
    pub initiator: Pubkey,
    pub counterparty: Pubkey,
    pub initial_offer: u64,
    pub current_offer: u64,
    pub counter_offers: Vec<u64>,
    pub negotiation_deadline: i64,
    pub status: NegotiationStatus,
    pub terms: Vec<String>,
    pub created_at: i64,
    pub last_activity: i64,
    pub bump: u8,
}

impl ServiceAuction {
    pub const LEN: usize = 8 + // discriminator
        32 + // agent
        32 + // creator
        1 + // auction_type
        8 + // starting_price
        8 + // reserve_price
        8 + // current_bid
        1 + 32 + // current_bidder (Option<Pubkey>)
        8 + // auction_end_time
        8 + // minimum_bid_increment
        4 + // total_bids
        1 + // is_active
        8 + // created_at
        1; // bump
}

impl Negotiation {
    pub const LEN: usize = 8 + // discriminator
        32 + // initiator
        32 + // counterparty
        8 + // initial_offer
        8 + // current_offer
        4 + (10 * 8) + // counter_offers (max 10 offers)
        8 + // negotiation_deadline
        1 + // status
        4 + (5 * (4 + 100)) + // terms (max 5 terms, 100 chars each)
        8 + // created_at
        8 + // last_activity
        1; // bump
}

