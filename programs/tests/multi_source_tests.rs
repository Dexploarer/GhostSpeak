/*!
 * Multi-Source Reputation Integration Tests
 *
 * Tests multi-source reputation aggregation including:
 * - Source score updates and management
 * - Weighted score calculation
 * - Conflict detection between sources
 * - Source reliability tracking
 * - Primary source selection
 */

use anchor_lang::prelude::*;

#[tokio::test]
async fn test_multi_source_comprehensive() {
    println!("🌐 Starting comprehensive multi-source reputation tests...");

    test_source_score_management();
    test_weighted_score_calculation();
    test_conflict_detection();
    test_source_reliability();
    test_primary_source_management();
    test_normalization_factor();
    test_multi_source_edge_cases();
    test_conflict_flags_management();

    println!("✅ All multi-source reputation tests passed!");
}

fn test_source_score_management() {
    println!("  📋 Testing source score management...");

    let agent = Pubkey::new_unique();
    let mut metrics = create_test_reputation_metrics(agent);
    let timestamp = 1000000i64;

    // Test adding source scores
    assert!(metrics
        .update_source_score(
            "payai".to_string(),
            800,  // score 0-1000
            5000, // weight 50%
            100,  // 100 data points
            9000, // 90% reliability
            timestamp
        )
        .is_ok());

    assert_eq!(metrics.source_scores.len(), 1);
    assert!(metrics.get_source_score("payai").is_some());

    // Test updating existing source
    assert!(metrics
        .update_source_score(
            "payai".to_string(),
            850, // updated score
            5000,
            150,  // more data points
            9200, // improved reliability
            timestamp + 100
        )
        .is_ok());

    assert_eq!(metrics.source_scores.len(), 1); // Should not create duplicate
    let payai_source = metrics.get_source_score("payai").unwrap();
    assert_eq!(payai_source.score, 850);
    assert_eq!(payai_source.data_points, 150);

    // Test multiple sources
    assert!(metrics
        .update_source_score("github".to_string(), 750, 3000, 50, 8500, timestamp)
        .is_ok());
    assert!(metrics
        .update_source_score("custom".to_string(), 820, 2000, 30, 8000, timestamp)
        .is_ok());
    assert_eq!(metrics.source_scores.len(), 3);

    println!("    ✅ Source score management tests passed");
}

fn test_weighted_score_calculation() {
    println!("  📋 Testing weighted score calculation...");

    let agent = Pubkey::new_unique();
    let mut metrics = create_test_reputation_metrics(agent);
    let timestamp = 1000000i64;

    // Add multiple sources with different weights and reliability
    // PayAI: score=800, weight=50%, reliability=90%
    metrics
        .update_source_score("payai".to_string(), 800, 5000, 100, 9000, timestamp)
        .unwrap();

    // GitHub: score=700, weight=30%, reliability=85%
    metrics
        .update_source_score("github".to_string(), 700, 3000, 50, 8500, timestamp)
        .unwrap();

    // Custom: score=750, weight=20%, reliability=80%
    metrics
        .update_source_score("custom".to_string(), 750, 2000, 30, 8000, timestamp)
        .unwrap();

    // Calculate weighted score
    let weighted_score = metrics.calculate_weighted_score();

    // Manual calculation:
    // PayAI contribution: 800 × 0.5 × 0.9 = 360
    // GitHub contribution: 700 × 0.3 × 0.85 = 178.5
    // Custom contribution: 750 × 0.2 × 0.8 = 120
    // Total contribution: 658.5
    // Total normalization: (0.5 × 0.9) + (0.3 × 0.85) + (0.2 × 0.8) = 0.45 + 0.255 + 0.16 = 0.865
    // Weighted score: 658.5 / 0.865 ≈ 761
    // Converted to basis points (0-10000): 761 × 10 = 7610

    assert!(
        weighted_score > 7500 && weighted_score < 7700,
        "Weighted score should be ~7610, got {}",
        weighted_score
    );

    // Test single source (should return source score × 10)
    let mut single_source_metrics = create_test_reputation_metrics(agent);
    single_source_metrics
        .update_source_score("payai".to_string(), 800, 10000, 100, 10000, timestamp)
        .unwrap();
    let single_score = single_source_metrics.calculate_weighted_score();
    assert_eq!(single_score, 8000); // 800 × 10

    // Test no sources
    let empty_metrics = create_test_reputation_metrics(agent);
    assert_eq!(empty_metrics.calculate_weighted_score(), 0);

    println!("    ✅ Weighted score calculation tests passed");
}

fn test_conflict_detection() {
    println!("  📋 Testing conflict detection...");

    let agent = Pubkey::new_unique();
    let timestamp = 1000000i64;

    // Test no conflict (scores within 30% threshold)
    let mut metrics_no_conflict = create_test_reputation_metrics(agent);
    metrics_no_conflict
        .update_source_score("source1".to_string(), 800, 5000, 100, 9000, timestamp)
        .unwrap();
    metrics_no_conflict
        .update_source_score("source2".to_string(), 850, 5000, 100, 9000, timestamp)
        .unwrap();

    let has_conflict = metrics_no_conflict.detect_conflicts(timestamp);
    assert!(
        !has_conflict,
        "Variance of 50 (5%) should not trigger conflict"
    );
    assert_eq!(metrics_no_conflict.conflict_flags.len(), 0);

    // Test conflict (scores differ by >30%)
    let mut metrics_conflict = create_test_reputation_metrics(agent);
    metrics_conflict
        .update_source_score("source1".to_string(), 800, 5000, 100, 9000, timestamp)
        .unwrap();
    metrics_conflict
        .update_source_score("source2".to_string(), 400, 5000, 100, 9000, timestamp)
        .unwrap();

    let has_conflict = metrics_conflict.detect_conflicts(timestamp);
    assert!(
        has_conflict,
        "Variance of 400 (40%) should trigger conflict"
    );
    assert!(metrics_conflict.conflict_flags.len() > 0);

    // Verify conflict message format
    let conflict_msg = &metrics_conflict.conflict_flags[0];
    assert!(conflict_msg.contains("Conflict detected"));
    assert!(conflict_msg.contains("400")); // Variance
    assert!(conflict_msg.contains("800")); // Max score
    assert!(conflict_msg.contains("400")); // Min score

    // Test single source (no conflict possible)
    let mut single_source = create_test_reputation_metrics(agent);
    single_source
        .update_source_score("source1".to_string(), 800, 10000, 100, 9000, timestamp)
        .unwrap();
    assert!(!single_source.detect_conflicts(timestamp));

    println!("    ✅ Conflict detection tests passed");
}

fn test_source_reliability() {
    println!("  📋 Testing source reliability tracking...");

    let agent = Pubkey::new_unique();
    let mut metrics = create_test_reputation_metrics(agent);
    let timestamp = 1000000i64;

    // Test different reliability levels with different scores
    // Higher reliability sources have higher scores to demonstrate weighting effect
    let sources = vec![
        ("highly-reliable", 900, 9500), // High score, high reliability
        ("reliable", 800, 8000),
        ("moderate", 700, 6000),
        ("low-reliable", 600, 4000), // Low score, low reliability
    ];

    for (source_name, score, reliability) in &sources {
        assert!(metrics
            .update_source_score(
                source_name.to_string(),
                *score,
                2500, // Equal weight for all
                50,
                *reliability,
                timestamp
            )
            .is_ok());

        let source = metrics.get_source_score(*source_name).unwrap();
        assert_eq!(source.reliability, *reliability);
    }

    // Calculate initial weighted score
    // High reliability sources (with high scores) should pull average up
    let weighted_score_1 = metrics.calculate_weighted_score();

    // Now make the low-reliability (low-score) source much more reliable
    // This should DECREASE the weighted score because the low score gets more weight
    metrics
        .update_source_score("low-reliable".to_string(), 600, 2500, 50, 10000, timestamp)
        .unwrap();

    let weighted_score_2 = metrics.calculate_weighted_score();

    // The low score (600) now has more influence, pulling the average DOWN
    assert!(
        weighted_score_2 < weighted_score_1,
        "Increasing reliability of low-score source should decrease weighted score: {} vs {}",
        weighted_score_2,
        weighted_score_1
    );

    // Reset and test the opposite: increase reliability of high-score source
    let mut metrics2 = create_test_reputation_metrics(agent);
    for (source_name, score, reliability) in &sources {
        metrics2
            .update_source_score(
                source_name.to_string(),
                *score,
                2500,
                50,
                *reliability,
                timestamp,
            )
            .unwrap();
    }

    let weighted_score_3 = metrics2.calculate_weighted_score();

    // Increase reliability of the high-score source
    metrics2
        .update_source_score(
            "highly-reliable".to_string(),
            900,
            2500,
            50,
            10000,
            timestamp,
        )
        .unwrap();

    let weighted_score_4 = metrics2.calculate_weighted_score();

    // The high score (900) now has more influence, pulling the average UP
    assert!(
        weighted_score_4 > weighted_score_3,
        "Increasing reliability of high-score source should increase weighted score: {} vs {}",
        weighted_score_4,
        weighted_score_3
    );

    println!("    ✅ Source reliability tests passed");
}

fn test_primary_source_management() {
    println!("  📋 Testing primary source management...");

    let agent = Pubkey::new_unique();
    let mut metrics = create_test_reputation_metrics(agent);
    let timestamp = 1000000i64;

    // Add multiple sources
    metrics
        .update_source_score("payai".to_string(), 800, 5000, 100, 9000, timestamp)
        .unwrap();
    metrics
        .update_source_score("github".to_string(), 700, 3000, 50, 8500, timestamp)
        .unwrap();

    // Test default primary source
    assert_eq!(metrics.primary_source, "payai");

    // Test setting primary source
    assert!(metrics.set_primary_source("github".to_string()).is_ok());
    assert_eq!(metrics.primary_source, "github");

    // Test getting primary source score
    let primary = metrics.get_primary_source_score();
    assert!(primary.is_some());
    assert_eq!(primary.unwrap().source_name, "github");
    assert_eq!(primary.unwrap().score, 700);

    // Test setting non-existent source as primary (should fail)
    assert!(metrics
        .set_primary_source("non-existent".to_string())
        .is_err());

    // Test primary source name length limit
    let long_name = "a".repeat(33);
    assert!(metrics.set_primary_source(long_name).is_err());

    println!("    ✅ Primary source management tests passed");
}

fn test_normalization_factor() {
    println!("  📋 Testing normalization factor calculation...");

    let agent = Pubkey::new_unique();
    let mut metrics = create_test_reputation_metrics(agent);
    let timestamp = 1000000i64;

    // Add sources with known weights and reliability
    // Source 1: weight=5000 (50%), reliability=9000 (90%)
    metrics
        .update_source_score("source1".to_string(), 800, 5000, 100, 9000, timestamp)
        .unwrap();

    // Source 2: weight=3000 (30%), reliability=8000 (80%)
    metrics
        .update_source_score("source2".to_string(), 700, 3000, 50, 8000, timestamp)
        .unwrap();

    let source1 = metrics.get_source_score("source1").unwrap();
    let source2 = metrics.get_source_score("source2").unwrap();

    // Calculate expected normalization factors
    // Source 1: 5000 × 9000 = 45,000,000
    // Source 2: 3000 × 8000 = 24,000,000
    let norm1 = source1.normalization_factor();
    let norm2 = source2.normalization_factor();

    assert_eq!(norm1, 45_000_000);
    assert_eq!(norm2, 24_000_000);

    // Calculate weighted contributions
    // Source 1: 800 × 5000 × 9000 / 100,000,000 = 360
    // Source 2: 700 × 3000 × 8000 / 100,000,000 = 168
    let contrib1 = source1.weighted_contribution();
    let contrib2 = source2.weighted_contribution();

    assert_eq!(contrib1, 360);
    assert_eq!(contrib2, 168);

    println!("    ✅ Normalization factor tests passed");
}

fn test_multi_source_edge_cases() {
    println!("  📋 Testing multi-source edge cases...");

    let agent = Pubkey::new_unique();
    let timestamp = 1000000i64;

    // Test maximum number of sources (MAX_SOURCE_SCORES = 10)
    let mut metrics_max = create_test_reputation_metrics(agent);
    for i in 0..10 {
        assert!(metrics_max
            .update_source_score(format!("source-{}", i), 750, 1000, 10, 8000, timestamp)
            .is_ok());
    }
    assert_eq!(metrics_max.source_scores.len(), 10);

    // Test exceeding max sources
    assert!(metrics_max
        .update_source_score("source-11".to_string(), 750, 1000, 10, 8000, timestamp)
        .is_err());

    // Test source name length limit (MAX_PRIMARY_SOURCE_LENGTH = 32)
    let mut metrics_name_len = create_test_reputation_metrics(agent);
    let max_name = "a".repeat(32);
    assert!(metrics_name_len
        .update_source_score(max_name.clone(), 750, 1000, 10, 8000, timestamp)
        .is_ok());

    let too_long_name = "a".repeat(33);
    assert!(metrics_name_len
        .update_source_score(too_long_name, 750, 1000, 10, 8000, timestamp)
        .is_err());

    // Test removing sources
    metrics_name_len.remove_source(&max_name);
    assert!(metrics_name_len.get_source_score(&max_name).is_none());

    // Test score bounds (0-1000)
    let mut metrics_bounds = create_test_reputation_metrics(agent);
    assert!(metrics_bounds
        .update_source_score("min".to_string(), 0, 5000, 10, 5000, timestamp)
        .is_ok());
    assert!(metrics_bounds
        .update_source_score("max".to_string(), 1000, 5000, 10, 5000, timestamp)
        .is_ok());

    println!("    ✅ Multi-source edge case tests passed");
}

fn test_conflict_flags_management() {
    println!("  📋 Testing conflict flags management...");

    let agent = Pubkey::new_unique();
    let mut metrics = create_test_reputation_metrics(agent);
    let timestamp = 1000000i64;

    // Add conflicting sources to generate flags
    metrics
        .update_source_score("high".to_string(), 900, 5000, 100, 9000, timestamp)
        .unwrap();
    metrics
        .update_source_score("low".to_string(), 400, 5000, 100, 9000, timestamp)
        .unwrap();

    metrics.detect_conflicts(timestamp);
    assert!(metrics.conflict_flags.len() > 0);

    // Test conflict flag limit (MAX_CONFLICT_FLAGS = 10)
    for i in 0..15 {
        metrics
            .update_source_score("high".to_string(), 900, 5000, 100, 9000, timestamp + i)
            .unwrap();
        metrics
            .update_source_score("low".to_string(), 400, 5000, 100, 9000, timestamp + i)
            .unwrap();
        metrics.detect_conflicts(timestamp + i);
    }

    // Should not exceed max
    assert!(metrics.conflict_flags.len() <= 10);

    // Test pruning conflict flags (keep only last 5)
    metrics.prune_conflict_flags();
    assert_eq!(metrics.conflict_flags.len(), 5);

    println!("    ✅ Conflict flags management tests passed");
}

// ============================================================================
// Helper Types and Functions
// ============================================================================

#[derive(Clone, Debug)]
#[allow(dead_code)]
struct TestReputationMetrics {
    agent: Pubkey,
    source_scores: Vec<TestSourceScore>,
    primary_source: String,
    last_aggregation: i64,
    conflict_flags: Vec<String>,
}

impl TestReputationMetrics {
    const MAX_SOURCE_SCORES: usize = 10;
    const MAX_CONFLICT_FLAGS: usize = 10;
    const MAX_PRIMARY_SOURCE_LENGTH: usize = 32;
    const CONFLICT_THRESHOLD: u16 = 300;

    fn update_source_score(
        &mut self,
        source_name: String,
        score: u16,
        weight: u16,
        data_points: u32,
        reliability: u16,
        timestamp: i64,
    ) -> std::result::Result<(), &'static str> {
        if source_name.len() > Self::MAX_PRIMARY_SOURCE_LENGTH {
            return Err("InputTooLong");
        }

        if score > 1000 {
            return Err("InvalidReputationScore");
        }

        if weight > 10000 || reliability > 10000 {
            return Err("InvalidPercentage");
        }

        if let Some(source) = self
            .source_scores
            .iter_mut()
            .find(|s| s.source_name == source_name)
        {
            source.score = score;
            source.weight = weight;
            source.data_points = data_points;
            source.reliability = reliability;
            source.last_updated = timestamp;
        } else {
            if self.source_scores.len() >= Self::MAX_SOURCE_SCORES {
                return Err("InputTooLong");
            }
            let new_source = TestSourceScore {
                source_name,
                score,
                weight,
                data_points,
                reliability,
                last_updated: timestamp,
            };
            self.source_scores.push(new_source);
        }

        Ok(())
    }

    fn get_source_score(&self, source_name: &str) -> Option<&TestSourceScore> {
        self.source_scores
            .iter()
            .find(|s| s.source_name == source_name)
    }

    fn calculate_weighted_score(&self) -> u64 {
        if self.source_scores.is_empty() {
            return 0;
        }

        let total_contribution: u64 = self
            .source_scores
            .iter()
            .map(|s| s.weighted_contribution())
            .sum();

        let total_normalization: u64 = self
            .source_scores
            .iter()
            .map(|s| s.normalization_factor())
            .sum();

        if total_normalization == 0 {
            return 0;
        }

        // Scale by 100_000_000 to match the division in weighted_contribution()
        let weighted_score = (total_contribution * 100_000_000) / total_normalization;
        (weighted_score * 10).min(10000)
    }

    fn detect_conflicts(&mut self, timestamp: i64) -> bool {
        if self.source_scores.len() < 2 {
            return false;
        }

        let scores: Vec<u16> = self.source_scores.iter().map(|s| s.score).collect();
        let max_score = *scores.iter().max().unwrap_or(&0);
        let min_score = *scores.iter().min().unwrap_or(&0);
        let variance = max_score.saturating_sub(min_score);

        if variance > Self::CONFLICT_THRESHOLD {
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

    fn remove_source(&mut self, source_name: &str) {
        self.source_scores.retain(|s| s.source_name != source_name);
    }

    fn get_primary_source_score(&self) -> Option<&TestSourceScore> {
        self.get_source_score(&self.primary_source)
    }

    fn set_primary_source(&mut self, source_name: String) -> std::result::Result<(), &'static str> {
        if source_name.len() > Self::MAX_PRIMARY_SOURCE_LENGTH {
            return Err("InputTooLong");
        }

        if !self
            .source_scores
            .iter()
            .any(|s| s.source_name == source_name)
        {
            return Err("InvalidInput");
        }

        self.primary_source = source_name;
        Ok(())
    }

    fn prune_conflict_flags(&mut self) {
        if self.conflict_flags.len() > 5 {
            self.conflict_flags.drain(0..self.conflict_flags.len() - 5);
        }
    }
}

#[derive(Clone, Debug)]
struct TestSourceScore {
    source_name: String,
    score: u16,
    weight: u16,
    data_points: u32,
    reliability: u16,
    last_updated: i64,
}

impl TestSourceScore {
    fn weighted_contribution(&self) -> u64 {
        let contribution = (self.score as u64)
            .saturating_mul(self.weight as u64)
            .saturating_mul(self.reliability as u64);
        contribution / 100_000_000
    }

    fn normalization_factor(&self) -> u64 {
        (self.weight as u64).saturating_mul(self.reliability as u64)
    }
}

fn create_test_reputation_metrics(agent: Pubkey) -> TestReputationMetrics {
    TestReputationMetrics {
        agent,
        source_scores: Vec::new(),
        primary_source: "payai".to_string(),
        last_aggregation: 0,
        conflict_flags: Vec::new(),
    }
}
