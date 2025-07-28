/*!
 * Analytics Events Module
 * 
 * Provides comprehensive event emission for real-time analytics tracking.
 * Emits detailed events for all critical operations to enable real-time
 * analytics, monitoring, and data aggregation.
 */

// Removed unused imports: AnalyticsDashboard, MarketAnalytics
use crate::*;

// =====================================================
// REAL-TIME ANALYTICS EVENT EMISSION
// =====================================================

/// Emit comprehensive analytics events for agent operations
pub fn emit_agent_analytics_event(
    agent: Pubkey,
    operation: AgentOperation,
    metrics: AgentMetrics,
) -> Result<()> {
    let clock = Clock::get()?;
    
    emit!(AgentAnalyticsEvent {
        agent,
        operation: operation.to_string(),
        revenue: metrics.revenue,
        transaction_count: metrics.transaction_count,
        success_rate: metrics.success_rate,
        average_rating: metrics.average_rating,
        response_time: metrics.response_time,
        timestamp: clock.unix_timestamp,
    });
    
    // Also emit performance update for dashboard tracking
    emit!(AgentPerformanceUpdatedEvent {
        agent,
        revenue: metrics.revenue,
        success_rate: metrics.success_rate,
        response_time: metrics.response_time,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}

/// Emit transaction analytics event with detailed metrics
pub fn emit_transaction_analytics_event(
    transaction_type: TransactionType,
    amount: u64,
    parties: TransactionParties,
    status: TransactionStatus,
) -> Result<()> {
    let clock = Clock::get()?;
    
    emit!(TransactionAnalyticsEvent {
        transaction_type: transaction_type.to_string(),
        amount,
        from: parties.from,
        to: parties.to,
        status: status.to_string(),
        timestamp: clock.unix_timestamp,
        block_height: clock.slot,
    });
    
    // Also emit volume update for market analytics
    emit!(MarketVolumeUpdatedEvent {
        volume: amount,
        transaction_type: transaction_type.to_string(),
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}

/// Emit marketplace activity event for real-time tracking
pub fn emit_marketplace_activity_event(
    activity_type: MarketplaceActivity,
    agent: Pubkey,
    service: Option<Pubkey>,
    value: u64,
) -> Result<()> {
    let clock = Clock::get()?;
    
    emit!(MarketplaceActivityEvent {
        activity_type: activity_type.to_string(),
        agent,
        service,
        value,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}

/// Emit network health metrics event
pub fn emit_network_health_event(
    active_agents: u32,
    transaction_throughput: u64,
    average_latency: u64,
    error_rate: u32,
) -> Result<()> {
    let clock = Clock::get()?;
    
    emit!(NetworkHealthEvent {
        active_agents,
        transaction_throughput,
        average_latency,
        error_rate,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}

/// Emit user engagement metrics event
pub fn emit_user_engagement_event(
    user: Pubkey,
    action: UserAction,
    session_duration: Option<u64>,
    interaction_count: u32,
) -> Result<()> {
    let clock = Clock::get()?;
    
    emit!(UserEngagementEvent {
        user,
        action: action.to_string(),
        session_duration,
        interaction_count,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}

/// Emit service performance metrics event
pub fn emit_service_performance_event(
    service: Pubkey,
    provider: Pubkey,
    execution_time: u64,
    success: bool,
    quality_score: Option<u32>,
) -> Result<()> {
    let clock = Clock::get()?;
    
    emit!(ServicePerformanceEvent {
        service,
        provider,
        execution_time,
        success,
        quality_score,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}

/// Emit economic metrics event for financial analytics
pub fn emit_economic_metrics_event(
    total_value_locked: u64,
    daily_volume: u64,
    fee_revenue: u64,
    unique_users: u32,
) -> Result<()> {
    let clock = Clock::get()?;
    
    emit!(EconomicMetricsEvent {
        total_value_locked,
        daily_volume,
        fee_revenue,
        unique_users,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}

// =====================================================
// EVENT STRUCTURES
// =====================================================

#[event]
pub struct AgentAnalyticsEvent {
    pub agent: Pubkey,
    pub operation: String,
    pub revenue: u64,
    pub transaction_count: u32,
    pub success_rate: u32,
    pub average_rating: u32,
    pub response_time: u64,
    pub timestamp: i64,
}

#[event]
pub struct TransactionAnalyticsEvent {
    pub transaction_type: String,
    pub amount: u64,
    pub from: Pubkey,
    pub to: Pubkey,
    pub status: String,
    pub timestamp: i64,
    pub block_height: u64,
}

#[event]
pub struct MarketplaceActivityEvent {
    pub activity_type: String,
    pub agent: Pubkey,
    pub service: Option<Pubkey>,
    pub value: u64,
    pub timestamp: i64,
}

#[event]
pub struct NetworkHealthEvent {
    pub active_agents: u32,
    pub transaction_throughput: u64,
    pub average_latency: u64,
    pub error_rate: u32,
    pub timestamp: i64,
}

#[event]
pub struct UserEngagementEvent {
    pub user: Pubkey,
    pub action: String,
    pub session_duration: Option<u64>,
    pub interaction_count: u32,
    pub timestamp: i64,
}

#[event]
pub struct ServicePerformanceEvent {
    pub service: Pubkey,
    pub provider: Pubkey,
    pub execution_time: u64,
    pub success: bool,
    pub quality_score: Option<u32>,
    pub timestamp: i64,
}

#[event]
pub struct EconomicMetricsEvent {
    pub total_value_locked: u64,
    pub daily_volume: u64,
    pub fee_revenue: u64,
    pub unique_users: u32,
    pub timestamp: i64,
}

#[event]
pub struct MarketVolumeUpdatedEvent {
    pub volume: u64,
    pub transaction_type: String,
    pub timestamp: i64,
}

#[event]
pub struct AgentPerformanceUpdatedEvent {
    pub agent: Pubkey,
    pub revenue: u64,
    pub success_rate: u32,
    pub response_time: u64,
    pub timestamp: i64,
}

// =====================================================
// ENUMS FOR EVENT TYPES
// =====================================================

#[derive(Debug, Clone)]
pub enum AgentOperation {
    Register,
    Update,
    Activate,
    Deactivate,
    ServiceListed,
    ServicePurchased,
    JobCompleted,
    RatingReceived,
}

impl std::fmt::Display for AgentOperation {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AgentOperation::Register => write!(f, "register"),
            AgentOperation::Update => write!(f, "update"),
            AgentOperation::Activate => write!(f, "activate"),
            AgentOperation::Deactivate => write!(f, "deactivate"),
            AgentOperation::ServiceListed => write!(f, "service_listed"),
            AgentOperation::ServicePurchased => write!(f, "service_purchased"),
            AgentOperation::JobCompleted => write!(f, "job_completed"),
            AgentOperation::RatingReceived => write!(f, "rating_received"),
        }
    }
}

#[derive(Debug, Clone)]
pub enum TransactionType {
    ServicePurchase,
    EscrowCreation,
    EscrowCompletion,
    EscrowRefund,
    DirectPayment,
    AuctionBid,
    DisputeResolution,
}

impl std::fmt::Display for TransactionType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TransactionType::ServicePurchase => write!(f, "service_purchase"),
            TransactionType::EscrowCreation => write!(f, "escrow_creation"),
            TransactionType::EscrowCompletion => write!(f, "escrow_completion"),
            TransactionType::EscrowRefund => write!(f, "escrow_refund"),
            TransactionType::DirectPayment => write!(f, "direct_payment"),
            TransactionType::AuctionBid => write!(f, "auction_bid"),
            TransactionType::DisputeResolution => write!(f, "dispute_resolution"),
        }
    }
}

#[derive(Debug, Clone)]
pub enum TransactionStatus {
    Pending,
    Processing,
    Completed,
    Failed,
    Cancelled,
}

impl std::fmt::Display for TransactionStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TransactionStatus::Pending => write!(f, "pending"),
            TransactionStatus::Processing => write!(f, "processing"),
            TransactionStatus::Completed => write!(f, "completed"),
            TransactionStatus::Failed => write!(f, "failed"),
            TransactionStatus::Cancelled => write!(f, "cancelled"),
        }
    }
}

#[derive(Debug, Clone)]
pub enum MarketplaceActivity {
    ServiceListed,
    ServiceDelisted,
    ServiceUpdated,
    AuctionCreated,
    AuctionFinalized,
    JobPosted,
    JobAccepted,
}

impl std::fmt::Display for MarketplaceActivity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            MarketplaceActivity::ServiceListed => write!(f, "service_listed"),
            MarketplaceActivity::ServiceDelisted => write!(f, "service_delisted"),
            MarketplaceActivity::ServiceUpdated => write!(f, "service_updated"),
            MarketplaceActivity::AuctionCreated => write!(f, "auction_created"),
            MarketplaceActivity::AuctionFinalized => write!(f, "auction_finalized"),
            MarketplaceActivity::JobPosted => write!(f, "job_posted"),
            MarketplaceActivity::JobAccepted => write!(f, "job_accepted"),
        }
    }
}

#[derive(Debug, Clone)]
pub enum UserAction {
    Login,
    Logout,
    ServiceView,
    ServicePurchase,
    MessageSent,
    ChannelJoined,
    DisputeFiled,
}

impl std::fmt::Display for UserAction {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            UserAction::Login => write!(f, "login"),
            UserAction::Logout => write!(f, "logout"),
            UserAction::ServiceView => write!(f, "service_view"),
            UserAction::ServicePurchase => write!(f, "service_purchase"),
            UserAction::MessageSent => write!(f, "message_sent"),
            UserAction::ChannelJoined => write!(f, "channel_joined"),
            UserAction::DisputeFiled => write!(f, "dispute_filed"),
        }
    }
}

// =====================================================
// HELPER STRUCTURES
// =====================================================

pub struct AgentMetrics {
    pub revenue: u64,
    pub transaction_count: u32,
    pub success_rate: u32,
    pub average_rating: u32,
    pub response_time: u64,
}

pub struct TransactionParties {
    pub from: Pubkey,
    pub to: Pubkey,
}