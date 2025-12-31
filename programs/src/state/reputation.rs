/*!
 * Reputation State Module
 *
 * Contains reputation related state structures for x402 payment tracking.
 */

use anchor_lang::prelude::*;

/// Source score tracking for multi-source reputation aggregation
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct SourceScore {
    /// Source identifier (e.g., "payai", "github", "custom-webhook")
    pub source_name: String,
    /// Reputation score from this source (0-1000)
    pub score: u16,
    /// Weight in basis points (0-10000, where 10000 = 100%)
    pub weight: u16,
    /// Number of data points contributing to this score
    pub data_points: u32,
    /// Source reliability score in basis points (0-10000)
    pub reliability: u16,
    /// Last time this source was updated
    pub last_updated: i64,
}

impl SourceScore {
    pub const MAX_SOURCE_NAME_LENGTH: usize = 32;
    pub const MIN_SCORE: u16 = 0;
    pub const MAX_SCORE: u16 = 1000;
    pub const MIN_WEIGHT: u16 = 0;
    pub const MAX_WEIGHT: u16 = 10000;
    pub const MIN_RELIABILITY: u16 = 0;
    pub const MAX_RELIABILITY: u16 = 10000;

    /// Create a new source score
    pub fn new(
        source_name: String,
        score: u16,
        weight: u16,
        data_points: u32,
        reliability: u16,
        timestamp: i64,
    ) -> Result<Self> {
        require!(
            source_name.len() <= Self::MAX_SOURCE_NAME_LENGTH,
            crate::GhostSpeakError::InputTooLong
        );
        require!(
            score <= Self::MAX_SCORE,
            crate::GhostSpeakError::InvalidReputationScore
        );
        require!(
            weight <= Self::MAX_WEIGHT,
            crate::GhostSpeakError::InvalidPercentage
        );
        require!(
            reliability <= Self::MAX_RELIABILITY,
            crate::GhostSpeakError::InvalidPercentage
        );

        Ok(Self {
            source_name,
            score,
            weight,
            data_points,
            reliability,
            last_updated: timestamp,
        })
    }

    /// Calculate weighted contribution to overall score
    /// Returns contribution in basis points
    pub fn weighted_contribution(&self) -> u64 {
        // score × weight × reliability / (10000 × 10000)
        // Result is in basis points (0-10000)
        let contribution = (self.score as u64)
            .saturating_mul(self.weight as u64)
            .saturating_mul(self.reliability as u64);
        contribution / 100_000_000 // Divide by 10000 * 10000
    }

    /// Calculate normalization factor (weight × reliability)
    pub fn normalization_factor(&self) -> u64 {
        (self.weight as u64).saturating_mul(self.reliability as u64)
    }
}

/// Tag score with confidence tracking
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct TagScore {
    /// Tag name (e.g., "fast-responder", "defi-expert")
    pub tag_name: String,
    /// Confidence score in basis points (0-10000)
    pub confidence: u16,
    /// Number of supporting data points for this tag
    pub evidence_count: u32,
    /// Last time this tag was updated
    pub last_updated: i64,
}

impl TagScore {
    pub const MAX_TAG_NAME_LENGTH: usize = 32;
    pub const MIN_CONFIDENCE: u16 = 0;
    pub const MAX_CONFIDENCE: u16 = 10000;

    /// Create a new tag score
    pub fn new(tag_name: String, confidence: u16, evidence_count: u32, timestamp: i64) -> Result<Self> {
        require!(
            tag_name.len() <= Self::MAX_TAG_NAME_LENGTH,
            crate::GhostSpeakError::TagNameTooLong
        );
        require!(
            confidence <= Self::MAX_CONFIDENCE,
            crate::GhostSpeakError::InvalidConfidence
        );

        Ok(Self {
            tag_name,
            confidence,
            evidence_count,
            last_updated: timestamp,
        })
    }

    /// Check if tag is stale (older than 90 days)
    pub fn is_stale(&self, current_timestamp: i64) -> bool {
        const NINETY_DAYS: i64 = 90 * 24 * 60 * 60;
        current_timestamp - self.last_updated > NINETY_DAYS
    }
}

/// x402 payment tracking metrics for reputation calculation
#[account]
pub struct ReputationMetrics {
    /// Agent public key
    pub agent: Pubkey,
    /// Total successful x402 payments received
    pub successful_payments: u64,
    /// Total failed x402 payment attempts
    pub failed_payments: u64,
    /// Cumulative response time in milliseconds
    pub total_response_time: u64,
    /// Number of response time measurements
    pub response_time_count: u64,
    /// Total disputes filed against agent for x402 services
    pub total_disputes: u32,
    /// Disputes resolved favorably
    pub disputes_resolved: u32,
    /// Sum of all client ratings (0-5 scale)
    pub total_rating: u32,
    /// Number of ratings submitted
    pub total_ratings_count: u32,
    /// Rolling 7-day payment volume (daily buckets)
    pub payment_history_7d: [u64; 7],
    /// Creation timestamp
    pub created_at: i64,
    /// Last update timestamp
    pub updated_at: i64,
    /// Skill-based reputation tags (e.g., "code-generation", "defi-expert")
    pub skill_tags: Vec<String>,
    /// Behavior-based tags (e.g., "fast-responder", "dispute-free")
    pub behavior_tags: Vec<String>,
    /// Compliance-based tags (e.g., "kyc-verified", "audited-code")
    pub compliance_tags: Vec<String>,
    /// Tag confidence scores with evidence
    pub tag_scores: Vec<TagScore>,
    /// Last time tags were updated
    pub tag_updated_at: i64,
    /// Multi-source reputation scores (max 10 sources)
    pub source_scores: Vec<SourceScore>,
    /// Primary reputation source (default: "payai")
    pub primary_source: String,
    /// Last time multi-source aggregation was performed
    pub last_aggregation: i64,
    /// Conflict flags describing score discrepancies
    pub conflict_flags: Vec<String>,
    /// PDA bump
    pub bump: u8,
}

impl ReputationMetrics {
    pub const MAX_SKILL_TAGS: usize = 20;
    pub const MAX_BEHAVIOR_TAGS: usize = 20;
    pub const MAX_COMPLIANCE_TAGS: usize = 10;
    pub const MAX_TAG_SCORES: usize = 50; // Total max tags across all categories
    pub const MAX_SOURCE_SCORES: usize = 10; // Max reputation sources
    pub const MAX_CONFLICT_FLAGS: usize = 10; // Max conflict descriptions
    pub const MAX_PRIMARY_SOURCE_LENGTH: usize = 32;
    pub const CONFLICT_THRESHOLD: u16 = 300; // 30% variance triggers conflict flag

    // Dynamic account size - will be resized as needed
    // Base size without vectors
    pub const BASE_LEN: usize = 8 + // discriminator
        32 + // agent
        8 + // successful_payments
        8 + // failed_payments
        8 + // total_response_time
        8 + // response_time_count
        4 + // total_disputes
        4 + // disputes_resolved
        4 + // total_rating
        4 + // total_ratings_count
        (8 * 7) + // payment_history_7d
        8 + // created_at
        8 + // updated_at
        4 + // skill_tags vec length prefix
        4 + // behavior_tags vec length prefix
        4 + // compliance_tags vec length prefix
        4 + // tag_scores vec length prefix
        8 + // tag_updated_at
        4 + // source_scores vec length prefix
        36 + // primary_source (32 chars + prefix)
        8 + // last_aggregation
        4 + // conflict_flags vec length prefix
        1; // bump

    // Estimated max size with all tags and sources
    pub const LEN: usize = Self::BASE_LEN +
        (Self::MAX_SKILL_TAGS * 36) + // Each tag ~32 chars + length prefix
        (Self::MAX_BEHAVIOR_TAGS * 36) +
        (Self::MAX_COMPLIANCE_TAGS * 36) +
        (Self::MAX_TAG_SCORES * 52) + // TagScore: 32 (name) + 2 (confidence) + 4 (evidence) + 8 (timestamp) + prefixes
        (Self::MAX_SOURCE_SCORES * 84) + // SourceScore: 32 (name) + 2 (score) + 2 (weight) + 4 (data_points) + 2 (reliability) + 8 (timestamp) + prefixes
        (Self::MAX_CONFLICT_FLAGS * 68); // Each flag ~64 chars + prefix

    /// Calculate average response time in milliseconds
    pub fn avg_response_time(&self) -> u64 {
        if self.response_time_count > 0 {
            self.total_response_time / self.response_time_count
        } else {
            0
        }
    }

    /// Calculate payment success rate (basis points)
    pub fn success_rate(&self) -> u64 {
        let total = self.successful_payments + self.failed_payments;
        if total > 0 {
            (self.successful_payments * 10000) / total
        } else {
            0
        }
    }

    /// Calculate average rating (0-100 scale)
    pub fn avg_rating(&self) -> u64 {
        if self.total_ratings_count > 0 {
            ((self.total_rating as u64) * 100) / (self.total_ratings_count as u64 * 5)
        } else {
            0
        }
    }

    /// Calculate dispute resolution rate (basis points)
    pub fn dispute_resolution_rate(&self) -> u64 {
        if self.total_disputes > 0 {
            ((self.disputes_resolved as u64) * 10000) / (self.total_disputes as u64)
        } else {
            10000 // Perfect score if no disputes
        }
    }

    /// Update rolling 7-day payment history
    pub fn update_payment_history(&mut self, amount: u64, current_timestamp: i64) {
        let day_index = ((current_timestamp / 86400) % 7) as usize;
        self.payment_history_7d[day_index] = self.payment_history_7d[day_index].saturating_add(amount);
    }

    /// Calculate volume consistency score (0-10000 basis points)
    pub fn volume_consistency_score(&self) -> u64 {
        let total: u64 = self.payment_history_7d.iter().sum();
        if total == 0 {
            return 0;
        }

        let avg = total / 7;
        if avg == 0 {
            return 0;
        }

        // Calculate coefficient of variation
        let variance: u64 = self.payment_history_7d
            .iter()
            .map(|&v| {
                let diff = v.abs_diff(avg);
                (diff * diff) / avg
            })
            .sum();

        let cv = variance / 7;

        // Convert to consistency score (lower cv = higher consistency)
        // Max CV of 100 = 0% consistency, CV of 0 = 100% consistency
        let clamped_cv = cv.min(10000);
        10000 - clamped_cv
    }

    // =====================================================
    // TAG MANAGEMENT METHODS
    // =====================================================

    /// Add a skill tag if not already present and under limit
    pub fn add_skill_tag(&mut self, tag: String) -> Result<()> {
        require!(
            tag.len() <= TagScore::MAX_TAG_NAME_LENGTH,
            crate::GhostSpeakError::TagNameTooLong
        );

        if !self.skill_tags.contains(&tag) {
            require!(
                self.skill_tags.len() < Self::MAX_SKILL_TAGS,
                crate::GhostSpeakError::MaxSkillTagsReached
            );
            self.skill_tags.push(tag);
        }
        Ok(())
    }

    /// Add a behavior tag if not already present and under limit
    pub fn add_behavior_tag(&mut self, tag: String) -> Result<()> {
        require!(
            tag.len() <= TagScore::MAX_TAG_NAME_LENGTH,
            crate::GhostSpeakError::TagNameTooLong
        );

        if !self.behavior_tags.contains(&tag) {
            require!(
                self.behavior_tags.len() < Self::MAX_BEHAVIOR_TAGS,
                crate::GhostSpeakError::MaxBehaviorTagsReached
            );
            self.behavior_tags.push(tag);
        }
        Ok(())
    }

    /// Add a compliance tag if not already present and under limit
    pub fn add_compliance_tag(&mut self, tag: String) -> Result<()> {
        require!(
            tag.len() <= TagScore::MAX_TAG_NAME_LENGTH,
            crate::GhostSpeakError::TagNameTooLong
        );

        if !self.compliance_tags.contains(&tag) {
            require!(
                self.compliance_tags.len() < Self::MAX_COMPLIANCE_TAGS,
                crate::GhostSpeakError::MaxComplianceTagsReached
            );
            self.compliance_tags.push(tag);
        }
        Ok(())
    }

    /// Remove a tag from all categories
    pub fn remove_tag(&mut self, tag: &str) {
        self.skill_tags.retain(|t| t != tag);
        self.behavior_tags.retain(|t| t != tag);
        self.compliance_tags.retain(|t| t != tag);
        self.tag_scores.retain(|ts| ts.tag_name != tag);
    }

    /// Update or create tag confidence score
    pub fn update_tag_confidence(
        &mut self,
        tag_name: String,
        confidence: u16,
        evidence_count: u32,
        timestamp: i64,
    ) -> Result<()> {
        // Find existing tag score
        if let Some(tag_score) = self.tag_scores.iter_mut().find(|ts| ts.tag_name == tag_name) {
            tag_score.confidence = confidence;
            tag_score.evidence_count = evidence_count;
            tag_score.last_updated = timestamp;
        } else {
            // Create new tag score
            require!(
                self.tag_scores.len() < Self::MAX_TAG_SCORES,
                crate::GhostSpeakError::MaxTagScoresReached
            );
            let new_tag_score = TagScore::new(tag_name, confidence, evidence_count, timestamp)?;
            self.tag_scores.push(new_tag_score);
        }

        self.tag_updated_at = timestamp;
        Ok(())
    }

    /// Get tag confidence score
    pub fn get_tag_confidence(&self, tag_name: &str) -> Option<u16> {
        self.tag_scores
            .iter()
            .find(|ts| ts.tag_name == tag_name)
            .map(|ts| ts.confidence)
    }

    /// Remove stale tags (older than 90 days)
    pub fn remove_stale_tags(&mut self, current_timestamp: i64) {
        let stale_tags: Vec<String> = self.tag_scores
            .iter()
            .filter(|ts| ts.is_stale(current_timestamp))
            .map(|ts| ts.tag_name.clone())
            .collect();

        for tag in stale_tags {
            self.remove_tag(&tag);
        }
    }

    /// Get total tag count across all categories
    pub fn total_tag_count(&self) -> usize {
        self.skill_tags.len() + self.behavior_tags.len() + self.compliance_tags.len()
    }

    /// Check if agent has a specific tag
    pub fn has_tag(&self, tag: &str) -> bool {
        self.skill_tags.contains(&tag.to_string()) ||
        self.behavior_tags.contains(&tag.to_string()) ||
        self.compliance_tags.contains(&tag.to_string())
    }

    // =====================================================
    // MULTI-SOURCE REPUTATION METHODS
    // =====================================================

    /// Add or update a source score
    pub fn update_source_score(
        &mut self,
        source_name: String,
        score: u16,
        weight: u16,
        data_points: u32,
        reliability: u16,
        timestamp: i64,
    ) -> Result<()> {
        require!(
            source_name.len() <= Self::MAX_PRIMARY_SOURCE_LENGTH,
            crate::GhostSpeakError::InputTooLong
        );

        // Find existing source or add new one
        if let Some(source) = self.source_scores.iter_mut().find(|s| s.source_name == source_name) {
            // Update existing source
            source.score = score;
            source.weight = weight;
            source.data_points = data_points;
            source.reliability = reliability;
            source.last_updated = timestamp;
        } else {
            // Add new source
            require!(
                self.source_scores.len() < Self::MAX_SOURCE_SCORES,
                crate::GhostSpeakError::InputTooLong
            );
            let new_source = SourceScore::new(
                source_name,
                score,
                weight,
                data_points,
                reliability,
                timestamp,
            )?;
            self.source_scores.push(new_source);
        }

        Ok(())
    }

    /// Get a source score by name
    pub fn get_source_score(&self, source_name: &str) -> Option<&SourceScore> {
        self.source_scores.iter().find(|s| s.source_name == source_name)
    }

    /// Calculate weighted aggregate score from all sources
    /// Returns score in basis points (0-10000)
    pub fn calculate_weighted_score(&self) -> u64 {
        if self.source_scores.is_empty() {
            return 0;
        }

        let total_contribution: u64 = self.source_scores
            .iter()
            .map(|s| s.weighted_contribution())
            .sum();

        let total_normalization: u64 = self.source_scores
            .iter()
            .map(|s| s.normalization_factor())
            .sum();

        if total_normalization == 0 {
            return 0;
        }

        // weighted_score = Σ(score × weight × reliability) / Σ(weight × reliability)
        // Scale to 0-1000 range (multiply by 1000 and divide by 10000)
        let weighted_score = (total_contribution * 10000) / total_normalization;

        // Convert from 0-1000 to 0-10000 basis points
        (weighted_score * 10).min(10000)
    }

    /// Detect conflicts between source scores
    /// Returns true if max_score - min_score > CONFLICT_THRESHOLD (300 = 30%)
    pub fn detect_conflicts(&mut self, timestamp: i64) -> bool {
        if self.source_scores.len() < 2 {
            return false;
        }

        let scores: Vec<u16> = self.source_scores.iter().map(|s| s.score).collect();
        let max_score = *scores.iter().max().unwrap_or(&0);
        let min_score = *scores.iter().min().unwrap_or(&0);
        let variance = max_score.saturating_sub(min_score);

        if variance > Self::CONFLICT_THRESHOLD {
            // Add conflict flag
            let flag = format!(
                "Conflict detected at {}: variance {} (max: {}, min: {})",
                timestamp, variance, max_score, min_score
            );

            if self.conflict_flags.len() < Self::MAX_CONFLICT_FLAGS {
                self.conflict_flags.push(flag);
            }

            true
        } else {
            false
        }
    }

    /// Remove a source score
    pub fn remove_source(&mut self, source_name: &str) {
        self.source_scores.retain(|s| s.source_name != source_name);
    }

    /// Get primary source score
    pub fn get_primary_source_score(&self) -> Option<&SourceScore> {
        self.get_source_score(&self.primary_source)
    }

    /// Update primary source
    pub fn set_primary_source(&mut self, source_name: String) -> Result<()> {
        require!(
            source_name.len() <= Self::MAX_PRIMARY_SOURCE_LENGTH,
            crate::GhostSpeakError::InputTooLong
        );

        // Verify source exists
        require!(
            self.source_scores.iter().any(|s| s.source_name == source_name),
            crate::GhostSpeakError::InvalidInput
        );

        self.primary_source = source_name;
        Ok(())
    }

    /// Clear old conflict flags (keep only last 5)
    pub fn prune_conflict_flags(&mut self) {
        if self.conflict_flags.len() > 5 {
            self.conflict_flags.drain(0..self.conflict_flags.len() - 5);
        }
    }

    // =====================================================
    // PRIVACY-AWARE HELPER METHODS
    // =====================================================

    /// Calculate Ghost Score (0-1000) from weighted sources
    pub fn ghost_score(&self) -> u32 {
        // Convert from basis points (0-10000) to 0-1000 scale
        (self.calculate_weighted_score() / 10) as u32
    }

    /// Get visible score based on privacy settings
    /// Returns the score representation according to privacy mode
    pub fn get_visible_score(
        &self,
        privacy_mode: &crate::state::privacy::PrivacyMode,
        viewer: &Pubkey,
        privacy_settings: Option<&crate::state::privacy::PrivacySettings>,
    ) -> String {
        use crate::state::privacy::{PrivacyMode, ReputationTier, ScoreRange};

        // Calculate the actual score
        let score = self.ghost_score();

        match privacy_mode {
            PrivacyMode::Public => {
                // Show exact score
                format!("{}/1000", score)
            }
            PrivacyMode::TierOnly => {
                // Show only the tier
                let tier = ReputationTier::from_score(score);
                tier.to_string()
            }
            PrivacyMode::RangeOnly => {
                // Show score range (100-point buckets)
                let range = ScoreRange::from_score(score);
                range.to_string()
            }
            PrivacyMode::Private => {
                // Check if viewer has access
                if let Some(settings) = privacy_settings {
                    if self.can_viewer_access(viewer, settings) {
                        format!("{}/1000", score)
                    } else {
                        "Score Hidden".to_string()
                    }
                } else {
                    "Score Hidden".to_string()
                }
            }
            PrivacyMode::Custom => {
                // Check metric-specific visibility
                if let Some(settings) = privacy_settings {
                    use crate::state::privacy::VisibilityLevel;

                    match settings.metric_visibility.ghost_score {
                        VisibilityLevel::Public => format!("{}/1000", score),
                        VisibilityLevel::TierOnly => {
                            let tier = ReputationTier::from_score(score);
                            tier.to_string()
                        }
                        VisibilityLevel::AuthorizedOnly => {
                            if self.can_viewer_access(viewer, settings) {
                                format!("{}/1000", score)
                            } else {
                                "Authorization Required".to_string()
                            }
                        }
                        VisibilityLevel::Hidden => "Score Hidden".to_string(),
                    }
                } else {
                    format!("{}/1000", score)
                }
            }
        }
    }

    /// Check if a viewer can access private metrics
    pub fn can_viewer_access(
        &self,
        viewer: &Pubkey,
        privacy_settings: &crate::state::privacy::PrivacySettings,
    ) -> bool {
        // Check if viewer is in authorized list
        if privacy_settings.authorized_viewers.contains(viewer) {
            return true;
        }

        // Check if viewer is blocked
        if privacy_settings.blocked_viewers.contains(viewer) {
            return false;
        }

        // For now, return false for unauthorized viewers
        // In production, this would check for valid PrivacyAccessGrant PDAs
        false
    }

    /// Get visible metrics based on privacy settings
    /// Returns a filtered view of metrics according to visibility rules
    pub fn get_visible_metrics(
        &self,
        viewer: &Pubkey,
        privacy_settings: Option<&crate::state::privacy::PrivacySettings>,
    ) -> VisibleMetrics {

        if let Some(settings) = privacy_settings {
            let can_access = self.can_viewer_access(viewer, settings);

            VisibleMetrics {
                ghost_score: self.get_metric_value(
                    self.ghost_score() as u64,
                    &settings.metric_visibility.ghost_score,
                    can_access,
                ),
                jobs_completed: self.get_metric_value(
                    self.successful_payments,
                    &settings.metric_visibility.jobs_completed,
                    can_access,
                ),
                success_rate: self.get_metric_value(
                    self.success_rate(),
                    &settings.metric_visibility.success_rate,
                    can_access,
                ),
                response_time: self.get_metric_value(
                    self.avg_response_time(),
                    &settings.metric_visibility.response_time,
                    can_access,
                ),
                dispute_count: self.get_metric_value(
                    self.total_disputes as u64,
                    &settings.metric_visibility.dispute_count,
                    can_access,
                ),
                satisfaction_rating: self.get_metric_value(
                    self.avg_rating(),
                    &settings.metric_visibility.satisfaction_rating,
                    can_access,
                ),
                client_feedback_count: self.get_metric_value(
                    self.total_ratings_count as u64,
                    &settings.metric_visibility.client_feedback_count,
                    can_access,
                ),
                total_earnings: None, // Always hidden for privacy
            }
        } else {
            // No privacy settings = full public access
            VisibleMetrics {
                ghost_score: Some(self.ghost_score() as u64),
                jobs_completed: Some(self.successful_payments),
                success_rate: Some(self.success_rate()),
                response_time: Some(self.avg_response_time()),
                dispute_count: Some(self.total_disputes as u64),
                satisfaction_rating: Some(self.avg_rating()),
                client_feedback_count: Some(self.total_ratings_count as u64),
                total_earnings: None,
            }
        }
    }

    /// Helper to get metric value based on visibility level
    fn get_metric_value(
        &self,
        value: u64,
        visibility: &crate::state::privacy::VisibilityLevel,
        can_access: bool,
    ) -> Option<u64> {
        use crate::state::privacy::VisibilityLevel;

        match visibility {
            VisibilityLevel::Public => Some(value),
            VisibilityLevel::TierOnly => {
                // Return tier bucket instead of exact value
                Some((value / 100) * 100)
            }
            VisibilityLevel::AuthorizedOnly => {
                if can_access {
                    Some(value)
                } else {
                    None
                }
            }
            VisibilityLevel::Hidden => None,
        }
    }
}

/// Filtered view of reputation metrics respecting privacy settings
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct VisibleMetrics {
    pub ghost_score: Option<u64>,
    pub jobs_completed: Option<u64>,
    pub success_rate: Option<u64>,
    pub response_time: Option<u64>,
    pub dispute_count: Option<u64>,
    pub satisfaction_rating: Option<u64>,
    pub client_feedback_count: Option<u64>,
    pub total_earnings: Option<u64>,
}