/*!
 * Privacy Instructions Module
 *
 * Implements privacy controls for agent reputation data.
 * Allows agents to configure selective disclosure and access controls.
 */

use anchor_lang::prelude::*;
use crate::state::{
    Agent, PrivacySettings, PrivacyAccessGrant, PrivacyMode, PrivacyPreset,
    MetricVisibility, GhostSpeakError,
};
use crate::security::reentrancy::ReentrancyGuard;

// ============================================================================
// Initialize Privacy Settings
// ============================================================================

#[derive(Accounts)]
pub struct InitializePrivacySettings<'info> {
    #[account(mut)]
    pub agent_owner: Signer<'info>,

    #[account(
        has_one = owner @ GhostSpeakError::InvalidAgentOwner
    )]
    pub agent: Account<'info, Agent>,

    #[account(
        init,
        payer = agent_owner,
        space = PrivacySettings::space(),
        seeds = [b"privacy_settings", agent.key().as_ref()],
        bump
    )]
    pub privacy_settings: Account<'info, PrivacySettings>,

    #[account(
        mut,
        seeds = [b"reentrancy_guard"],
        bump = reentrancy_guard.bump
    )]
    pub reentrancy_guard: Account<'info, ReentrancyGuard>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_privacy_settings(
    ctx: Context<InitializePrivacySettings>,
) -> Result<()> {
    // Reentrancy protection
    let guard = &mut ctx.accounts.reentrancy_guard;
    guard.lock()?;

    let settings = &mut ctx.accounts.privacy_settings;
    let clock = Clock::get()?;

    settings.agent = ctx.accounts.agent.key();
    settings.mode = PrivacyMode::Public; // Default to public
    settings.metric_visibility = MetricVisibility::default();
    settings.authorized_viewers = Vec::new();
    settings.blocked_viewers = Vec::new();
    settings.auto_grant_clients = false;
    settings.auto_grant_after_payment = false;
    settings.access_grants_count = 0;
    settings.created_at = clock.unix_timestamp;
    settings.updated_at = clock.unix_timestamp;
    settings.bump = ctx.bumps.privacy_settings;

    // Release lock
    guard.unlock()?;

    emit!(PrivacySettingsInitializedEvent {
        agent: ctx.accounts.agent.key(),
        owner: ctx.accounts.agent_owner.key(),
        timestamp: clock.unix_timestamp,
    });

    msg!("Privacy settings initialized for agent: {}", ctx.accounts.agent.key());
    Ok(())
}

// ============================================================================
// Update Privacy Mode
// ============================================================================

#[derive(Accounts)]
pub struct UpdatePrivacyMode<'info> {
    #[account(mut)]
    pub agent_owner: Signer<'info>,

    #[account(
        has_one = owner @ GhostSpeakError::InvalidAgentOwner
    )]
    pub agent: Account<'info, Agent>,

    #[account(
        mut,
        seeds = [b"privacy_settings", agent.key().as_ref()],
        bump = privacy_settings.bump,
        has_one = agent @ GhostSpeakError::InvalidAgent
    )]
    pub privacy_settings: Account<'info, PrivacySettings>,

    #[account(
        mut,
        seeds = [b"reentrancy_guard"],
        bump = reentrancy_guard.bump
    )]
    pub reentrancy_guard: Account<'info, ReentrancyGuard>,
}

pub fn update_privacy_mode(
    ctx: Context<UpdatePrivacyMode>,
    new_mode: PrivacyMode,
) -> Result<()> {
    // Reentrancy protection
    let guard = &mut ctx.accounts.reentrancy_guard;
    guard.lock()?;

    let settings = &mut ctx.accounts.privacy_settings;
    let old_mode = settings.mode.clone();
    let clock = Clock::get()?;

    settings.mode = new_mode.clone();
    settings.updated_at = clock.unix_timestamp;

    // Release lock
    guard.unlock()?;

    emit!(PrivacyModeUpdatedEvent {
        agent: ctx.accounts.agent.key(),
        old_mode: format!("{:?}", old_mode),
        new_mode: format!("{:?}", new_mode),
        timestamp: clock.unix_timestamp,
    });

    msg!("Privacy mode updated for agent: {}", ctx.accounts.agent.key());
    Ok(())
}

// ============================================================================
// Set Metric Visibility
// ============================================================================

#[derive(Accounts)]
pub struct SetMetricVisibility<'info> {
    #[account(mut)]
    pub agent_owner: Signer<'info>,

    #[account(
        has_one = owner @ GhostSpeakError::InvalidAgentOwner
    )]
    pub agent: Account<'info, Agent>,

    #[account(
        mut,
        seeds = [b"privacy_settings", agent.key().as_ref()],
        bump = privacy_settings.bump,
        has_one = agent @ GhostSpeakError::InvalidAgent
    )]
    pub privacy_settings: Account<'info, PrivacySettings>,

    #[account(
        mut,
        seeds = [b"reentrancy_guard"],
        bump = reentrancy_guard.bump
    )]
    pub reentrancy_guard: Account<'info, ReentrancyGuard>,
}

pub fn set_metric_visibility(
    ctx: Context<SetMetricVisibility>,
    metric_visibility: MetricVisibility,
) -> Result<()> {
    // Reentrancy protection
    let guard = &mut ctx.accounts.reentrancy_guard;
    guard.lock()?;

    let settings = &mut ctx.accounts.privacy_settings;
    let clock = Clock::get()?;

    settings.metric_visibility = metric_visibility;
    settings.updated_at = clock.unix_timestamp;

    // Release lock
    guard.unlock()?;

    emit!(MetricVisibilityUpdatedEvent {
        agent: ctx.accounts.agent.key(),
        timestamp: clock.unix_timestamp,
    });

    msg!("Metric visibility updated for agent: {}", ctx.accounts.agent.key());
    Ok(())
}

// ============================================================================
// Grant Privacy Access
// ============================================================================

#[derive(Accounts)]
#[instruction(viewer: Pubkey)]
pub struct GrantPrivacyAccess<'info> {
    #[account(mut)]
    pub agent_owner: Signer<'info>,

    #[account(
        has_one = owner @ GhostSpeakError::InvalidAgentOwner
    )]
    pub agent: Account<'info, Agent>,

    #[account(
        mut,
        seeds = [b"privacy_settings", agent.key().as_ref()],
        bump = privacy_settings.bump,
        has_one = agent @ GhostSpeakError::InvalidAgent
    )]
    pub privacy_settings: Account<'info, PrivacySettings>,

    #[account(
        init,
        payer = agent_owner,
        space = PrivacyAccessGrant::space(),
        seeds = [b"privacy_access_grant", agent.key().as_ref(), viewer.as_ref()],
        bump
    )]
    pub access_grant: Account<'info, PrivacyAccessGrant>,

    #[account(
        mut,
        seeds = [b"reentrancy_guard"],
        bump = reentrancy_guard.bump
    )]
    pub reentrancy_guard: Account<'info, ReentrancyGuard>,

    pub system_program: Program<'info, System>,
}

pub fn grant_privacy_access(
    ctx: Context<GrantPrivacyAccess>,
    viewer: Pubkey,
    expires_at: Option<i64>,
    grant_reason: String,
) -> Result<()> {
    // Reentrancy protection
    let guard = &mut ctx.accounts.reentrancy_guard;
    guard.lock()?;

    // Validate reason length
    require!(
        grant_reason.len() <= 128,
        GhostSpeakError::InputTooLong
    );

    let grant = &mut ctx.accounts.access_grant;
    let settings = &mut ctx.accounts.privacy_settings;
    let clock = Clock::get()?;

    grant.agent = ctx.accounts.agent.key();
    grant.viewer = viewer;
    grant.granted_at = clock.unix_timestamp;
    grant.expires_at = expires_at;
    grant.is_revoked = false;
    grant.grant_reason = grant_reason;
    grant.bump = ctx.bumps.access_grant;

    // Update settings
    settings.access_grants_count = settings.access_grants_count.saturating_add(1);
    settings.updated_at = clock.unix_timestamp;

    // Release lock
    guard.unlock()?;

    emit!(PrivacyAccessGrantedEvent {
        agent: ctx.accounts.agent.key(),
        viewer,
        expires_at,
        timestamp: clock.unix_timestamp,
    });

    msg!("Privacy access granted to {} for agent: {}", viewer, ctx.accounts.agent.key());
    Ok(())
}

// ============================================================================
// Revoke Privacy Access
// ============================================================================

#[derive(Accounts)]
#[instruction(viewer: Pubkey)]
pub struct RevokePrivacyAccess<'info> {
    #[account(mut)]
    pub agent_owner: Signer<'info>,

    #[account(
        has_one = owner @ GhostSpeakError::InvalidAgentOwner
    )]
    pub agent: Account<'info, Agent>,

    #[account(
        mut,
        seeds = [b"privacy_settings", agent.key().as_ref()],
        bump = privacy_settings.bump,
        has_one = agent @ GhostSpeakError::InvalidAgent
    )]
    pub privacy_settings: Account<'info, PrivacySettings>,

    #[account(
        mut,
        seeds = [b"privacy_access_grant", agent.key().as_ref(), viewer.as_ref()],
        bump = access_grant.bump,
        has_one = agent @ GhostSpeakError::InvalidAgent
    )]
    pub access_grant: Account<'info, PrivacyAccessGrant>,

    #[account(
        mut,
        seeds = [b"reentrancy_guard"],
        bump = reentrancy_guard.bump
    )]
    pub reentrancy_guard: Account<'info, ReentrancyGuard>,
}

pub fn revoke_privacy_access(
    ctx: Context<RevokePrivacyAccess>,
    viewer: Pubkey,
) -> Result<()> {
    // Reentrancy protection
    let guard = &mut ctx.accounts.reentrancy_guard;
    guard.lock()?;

    let grant = &mut ctx.accounts.access_grant;
    let settings = &mut ctx.accounts.privacy_settings;
    let clock = Clock::get()?;

    require!(!grant.is_revoked, GhostSpeakError::InvalidState);

    grant.is_revoked = true;
    settings.updated_at = clock.unix_timestamp;

    // Release lock
    guard.unlock()?;

    emit!(PrivacyAccessRevokedEvent {
        agent: ctx.accounts.agent.key(),
        viewer,
        timestamp: clock.unix_timestamp,
    });

    msg!("Privacy access revoked from {} for agent: {}", viewer, ctx.accounts.agent.key());
    Ok(())
}

// ============================================================================
// Apply Privacy Preset
// ============================================================================

#[derive(Accounts)]
pub struct ApplyPrivacyPreset<'info> {
    #[account(mut)]
    pub agent_owner: Signer<'info>,

    #[account(
        has_one = owner @ GhostSpeakError::InvalidAgentOwner
    )]
    pub agent: Account<'info, Agent>,

    #[account(
        mut,
        seeds = [b"privacy_settings", agent.key().as_ref()],
        bump = privacy_settings.bump,
        has_one = agent @ GhostSpeakError::InvalidAgent
    )]
    pub privacy_settings: Account<'info, PrivacySettings>,

    #[account(
        mut,
        seeds = [b"reentrancy_guard"],
        bump = reentrancy_guard.bump
    )]
    pub reentrancy_guard: Account<'info, ReentrancyGuard>,
}

pub fn apply_privacy_preset(
    ctx: Context<ApplyPrivacyPreset>,
    preset: PrivacyPreset,
) -> Result<()> {
    // Reentrancy protection
    let guard = &mut ctx.accounts.reentrancy_guard;
    guard.lock()?;

    let settings = &mut ctx.accounts.privacy_settings;
    let clock = Clock::get()?;

    let (mode, visibility, auto_grant) = preset.to_settings();

    settings.mode = mode;
    settings.metric_visibility = visibility;
    settings.auto_grant_clients = auto_grant;
    settings.updated_at = clock.unix_timestamp;

    // Release lock
    guard.unlock()?;

    emit!(PrivacyPresetAppliedEvent {
        agent: ctx.accounts.agent.key(),
        preset: format!("{:?}", preset),
        timestamp: clock.unix_timestamp,
    });

    msg!("Privacy preset {:?} applied for agent: {}", preset, ctx.accounts.agent.key());
    Ok(())
}

// ============================================================================
// Events
// ============================================================================

#[event]
pub struct PrivacySettingsInitializedEvent {
    pub agent: Pubkey,
    pub owner: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct PrivacyModeUpdatedEvent {
    pub agent: Pubkey,
    pub old_mode: String,
    pub new_mode: String,
    pub timestamp: i64,
}

#[event]
pub struct MetricVisibilityUpdatedEvent {
    pub agent: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct PrivacyAccessGrantedEvent {
    pub agent: Pubkey,
    pub viewer: Pubkey,
    pub expires_at: Option<i64>,
    pub timestamp: i64,
}

#[event]
pub struct PrivacyAccessRevokedEvent {
    pub agent: Pubkey,
    pub viewer: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct PrivacyPresetAppliedEvent {
    pub agent: Pubkey,
    pub preset: String,
    pub timestamp: i64,
}
