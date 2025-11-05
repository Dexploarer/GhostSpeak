/*!
 * Reputation State Module
 *
 * Contains reputation related state structures for x402 payment tracking.
 */

use anchor_lang::prelude::*;

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
    /// PDA bump
    pub bump: u8,
}

impl ReputationMetrics {
    pub const LEN: usize = 8 + // discriminator
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
        1; // bump

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
                let diff = if v > avg { v - avg } else { avg - v };
                (diff * diff) / avg
            })
            .sum();

        let cv = variance / 7;

        // Convert to consistency score (lower cv = higher consistency)
        // Max CV of 100 = 0% consistency, CV of 0 = 100% consistency
        let clamped_cv = cv.min(10000);
        10000 - clamped_cv
    }
}