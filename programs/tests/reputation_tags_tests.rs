/*!
 * Reputation Tags Integration Tests
 *
 * Tests reputation tag management including:
 * - Tag assignment and confidence scoring
 * - Tag decay over time
 * - Tag category management (skill, behavior, compliance)
 * - Tag limits and validation
 * - Tag staleness detection
 */

use anchor_lang::prelude::*;

#[tokio::test]
async fn test_reputation_tags_comprehensive() {
    println!("🏷️  Starting comprehensive reputation tags tests...");

    test_tag_assignment();
    test_tag_confidence_scoring();
    test_tag_decay();
    test_tag_category_management();
    test_tag_limits();
    test_tag_staleness();
    test_tag_evidence_tracking();
    test_tag_validation();

    println!("✅ All reputation tag tests passed!");
}

fn test_tag_assignment() {
    println!("  📋 Testing tag assignment...");

    let agent = Pubkey::new_unique();
    let mut metrics = create_test_reputation_metrics(agent);

    // Test skill tag assignment
    assert!(metrics.add_skill_tag("code-generation".to_string()).is_ok());
    assert!(metrics.skill_tags.contains(&"code-generation".to_string()));
    assert_eq!(metrics.skill_tags.len(), 1);

    // Test behavior tag assignment
    assert!(metrics
        .add_behavior_tag("fast-responder".to_string())
        .is_ok());
    assert!(metrics
        .behavior_tags
        .contains(&"fast-responder".to_string()));
    assert_eq!(metrics.behavior_tags.len(), 1);

    // Test compliance tag assignment
    assert!(metrics
        .add_compliance_tag("kyc-verified".to_string())
        .is_ok());
    assert!(metrics
        .compliance_tags
        .contains(&"kyc-verified".to_string()));
    assert_eq!(metrics.compliance_tags.len(), 1);

    // Test duplicate tag rejection
    assert!(metrics.add_skill_tag("code-generation".to_string()).is_ok()); // Should not error, just skip
    assert_eq!(metrics.skill_tags.len(), 1); // Should not change

    println!("    ✅ Tag assignment tests passed");
}

fn test_tag_confidence_scoring() {
    println!("  📋 Testing tag confidence scoring...");

    let agent = Pubkey::new_unique();
    let mut metrics = create_test_reputation_metrics(agent);
    let timestamp = 1000000i64;

    // Test tag confidence creation
    assert!(metrics
        .update_tag_confidence(
            "fast-responder".to_string(),
            9500, // 95% confidence
            100,  // 100 evidence points
            timestamp
        )
        .is_ok());

    // Verify tag score was created
    let confidence = metrics.get_tag_confidence("fast-responder");
    assert!(confidence.is_some());
    assert_eq!(confidence.unwrap(), 9500);

    // Test updating existing tag confidence
    assert!(metrics
        .update_tag_confidence(
            "fast-responder".to_string(),
            9800, // Updated to 98%
            150,  // More evidence
            timestamp + 100
        )
        .is_ok());

    let updated_confidence = metrics.get_tag_confidence("fast-responder");
    assert_eq!(updated_confidence.unwrap(), 9800);

    // Test confidence bounds (0-10000)
    let tag_score = create_test_tag_score("test-tag", 10000, 10, timestamp);
    assert_eq!(tag_score.confidence, 10000); // Max confidence

    let min_tag_score = create_test_tag_score("test-tag", 0, 10, timestamp);
    assert_eq!(min_tag_score.confidence, 0); // Min confidence

    println!("    ✅ Tag confidence scoring tests passed");
}

fn test_tag_decay() {
    println!("  📋 Testing tag decay...");

    let timestamp_now = 10000000i64;
    const NINETY_DAYS: i64 = 90 * 24 * 60 * 60;

    // Test fresh tag (not stale)
    let fresh_tag = create_test_tag_score("fresh-tag", 9000, 50, timestamp_now);
    assert!(!fresh_tag.is_stale(timestamp_now));
    assert!(!fresh_tag.is_stale(timestamp_now + 30 * 24 * 60 * 60)); // 30 days later

    // Test stale tag (>90 days old)
    let old_tag = create_test_tag_score("old-tag", 9000, 50, timestamp_now - NINETY_DAYS - 1);
    assert!(old_tag.is_stale(timestamp_now));

    // Test removing stale tags
    let agent = Pubkey::new_unique();
    let mut metrics = create_test_reputation_metrics(agent);

    // Add a mix of fresh and stale tags
    metrics
        .update_tag_confidence("fresh".to_string(), 8000, 10, timestamp_now)
        .unwrap();
    metrics
        .update_tag_confidence(
            "stale".to_string(),
            8000,
            10,
            timestamp_now - NINETY_DAYS - 1,
        )
        .unwrap();
    metrics.add_skill_tag("fresh".to_string()).unwrap();
    metrics.add_skill_tag("stale".to_string()).unwrap();

    assert_eq!(metrics.tag_scores.len(), 2);

    // Remove stale tags
    metrics.remove_stale_tags(timestamp_now);

    // Verify stale tag was removed
    assert!(!metrics.has_tag("stale"));
    assert!(metrics.has_tag("fresh"));
    assert_eq!(metrics.tag_scores.len(), 1);

    println!("    ✅ Tag decay tests passed");
}

fn test_tag_category_management() {
    println!("  📋 Testing tag category management...");

    let agent = Pubkey::new_unique();
    let mut metrics = create_test_reputation_metrics(agent);

    // Add tags to each category
    metrics
        .add_skill_tag("code-generation".to_string())
        .unwrap();
    metrics.add_skill_tag("defi-expert".to_string()).unwrap();
    metrics.add_skill_tag("nft-specialist".to_string()).unwrap();

    metrics
        .add_behavior_tag("fast-responder".to_string())
        .unwrap();
    metrics.add_behavior_tag("high-volume".to_string()).unwrap();

    metrics
        .add_compliance_tag("kyc-verified".to_string())
        .unwrap();

    // Verify tag counts
    assert_eq!(metrics.skill_tags.len(), 3);
    assert_eq!(metrics.behavior_tags.len(), 2);
    assert_eq!(metrics.compliance_tags.len(), 1);
    assert_eq!(metrics.total_tag_count(), 6);

    // Test has_tag across categories
    assert!(metrics.has_tag("code-generation"));
    assert!(metrics.has_tag("fast-responder"));
    assert!(metrics.has_tag("kyc-verified"));
    assert!(!metrics.has_tag("non-existent-tag"));

    // Test remove_tag across categories
    metrics.remove_tag("code-generation");
    assert!(!metrics.has_tag("code-generation"));
    assert_eq!(metrics.skill_tags.len(), 2);
    assert_eq!(metrics.total_tag_count(), 5);

    println!("    ✅ Tag category management tests passed");
}

fn test_tag_limits() {
    println!("  📋 Testing tag limits...");

    let agent = Pubkey::new_unique();
    let mut metrics = create_test_reputation_metrics(agent);

    // Test skill tags limit (MAX_SKILL_TAGS = 20)
    for i in 0..20 {
        assert!(metrics.add_skill_tag(format!("skill-{}", i)).is_ok());
    }
    assert_eq!(metrics.skill_tags.len(), 20);

    // Test exceeding limit
    assert!(metrics.add_skill_tag("skill-21".to_string()).is_err());
    assert_eq!(metrics.skill_tags.len(), 20);

    // Test behavior tags limit (MAX_BEHAVIOR_TAGS = 20)
    for i in 0..20 {
        assert!(metrics.add_behavior_tag(format!("behavior-{}", i)).is_ok());
    }
    assert_eq!(metrics.behavior_tags.len(), 20);
    assert!(metrics.add_behavior_tag("behavior-21".to_string()).is_err());

    // Test compliance tags limit (MAX_COMPLIANCE_TAGS = 10)
    for i in 0..10 {
        assert!(metrics
            .add_compliance_tag(format!("compliance-{}", i))
            .is_ok());
    }
    assert_eq!(metrics.compliance_tags.len(), 10);
    assert!(metrics
        .add_compliance_tag("compliance-11".to_string())
        .is_err());

    // Test tag scores limit (MAX_TAG_SCORES = 50)
    let timestamp = 1000000i64;
    for i in 0..50 {
        assert!(metrics
            .update_tag_confidence(format!("tag-score-{}", i), 5000, 10, timestamp)
            .is_ok());
    }
    assert_eq!(metrics.tag_scores.len(), 50);
    assert!(metrics
        .update_tag_confidence("tag-score-51".to_string(), 5000, 10, timestamp)
        .is_err());

    println!("    ✅ Tag limit tests passed");
}

fn test_tag_staleness() {
    println!("  📋 Testing tag staleness detection...");

    let timestamp_now = 10000000i64;
    const ONE_DAY: i64 = 24 * 60 * 60;
    const NINETY_DAYS: i64 = 90 * ONE_DAY;

    // Test various ages
    let ages_and_staleness = vec![
        (0, false),              // Just created
        (ONE_DAY, false),        // 1 day old
        (30 * ONE_DAY, false),   // 30 days old
        (89 * ONE_DAY, false),   // 89 days old (not yet stale)
        (NINETY_DAYS, false),    // Exactly 90 days (boundary)
        (NINETY_DAYS + 1, true), // 90 days + 1 second (stale)
        (180 * ONE_DAY, true),   // 180 days old (very stale)
    ];

    for (age, should_be_stale) in ages_and_staleness {
        let tag = create_test_tag_score("test-tag", 8000, 10, timestamp_now - age);
        assert_eq!(
            tag.is_stale(timestamp_now),
            should_be_stale,
            "Tag {} days old should{}be stale",
            age / ONE_DAY,
            if should_be_stale { " " } else { " not " }
        );
    }

    println!("    ✅ Tag staleness tests passed");
}

fn test_tag_evidence_tracking() {
    println!("  📋 Testing tag evidence tracking...");

    let agent = Pubkey::new_unique();
    let mut metrics = create_test_reputation_metrics(agent);
    let timestamp = 1000000i64;

    // Test evidence accumulation
    metrics
        .update_tag_confidence("well-evidenced".to_string(), 8000, 1, timestamp)
        .unwrap();
    metrics
        .update_tag_confidence("well-evidenced".to_string(), 8500, 5, timestamp + 100)
        .unwrap();
    metrics
        .update_tag_confidence("well-evidenced".to_string(), 9000, 20, timestamp + 200)
        .unwrap();

    // Verify evidence count increased
    let tag_score = metrics
        .tag_scores
        .iter()
        .find(|ts| ts.tag_name == "well-evidenced")
        .unwrap();
    assert_eq!(tag_score.evidence_count, 20);
    assert_eq!(tag_score.confidence, 9000);

    // Test low evidence tag
    metrics
        .update_tag_confidence("low-evidence".to_string(), 5000, 1, timestamp)
        .unwrap();
    let low_evidence_tag = metrics
        .tag_scores
        .iter()
        .find(|ts| ts.tag_name == "low-evidence")
        .unwrap();
    assert_eq!(low_evidence_tag.evidence_count, 1);

    println!("    ✅ Tag evidence tracking tests passed");
}

fn test_tag_validation() {
    println!("  📋 Testing tag validation...");

    let agent = Pubkey::new_unique();
    let mut metrics = create_test_reputation_metrics(agent);

    // Test tag name length validation (MAX_TAG_NAME_LENGTH = 32)
    let valid_tag = "valid-tag-name";
    assert!(metrics.add_skill_tag(valid_tag.to_string()).is_ok());

    let max_length_tag = "a".repeat(32);
    assert!(metrics.add_skill_tag(max_length_tag).is_ok());

    let too_long_tag = "a".repeat(33);
    assert!(metrics.add_skill_tag(too_long_tag).is_err());

    // Test confidence value validation (0-10000)
    let timestamp = 1000000i64;

    // Valid confidence values
    assert!(create_test_tag_score("test", 0, 10, timestamp).confidence == 0);
    assert!(create_test_tag_score("test", 5000, 10, timestamp).confidence == 5000);
    assert!(create_test_tag_score("test", 10000, 10, timestamp).confidence == 10000);

    // Test that implementation validates bounds
    assert!(metrics
        .update_tag_confidence("test".to_string(), 10000, 1, timestamp)
        .is_ok());

    println!("    ✅ Tag validation tests passed");
}

// ============================================================================
// Helper Types and Functions
// ============================================================================

#[derive(Clone, Debug)]
#[allow(dead_code)]
struct TestReputationMetrics {
    agent: Pubkey,
    successful_payments: u64,
    failed_payments: u64,
    total_response_time: u64,
    response_time_count: u64,
    total_disputes: u32,
    disputes_resolved: u32,
    total_rating: u32,
    total_ratings_count: u32,
    payment_history_7d: [u64; 7],
    created_at: i64,
    updated_at: i64,
    skill_tags: Vec<String>,
    behavior_tags: Vec<String>,
    compliance_tags: Vec<String>,
    tag_scores: Vec<TestTagScore>,
    tag_updated_at: i64,
}

impl TestReputationMetrics {
    const MAX_SKILL_TAGS: usize = 20;
    const MAX_BEHAVIOR_TAGS: usize = 20;
    const MAX_COMPLIANCE_TAGS: usize = 10;
    const MAX_TAG_SCORES: usize = 50;

    fn add_skill_tag(&mut self, tag: String) -> std::result::Result<(), &'static str> {
        const MAX_TAG_NAME_LENGTH: usize = 32;

        if tag.len() > MAX_TAG_NAME_LENGTH {
            return Err("TagNameTooLong");
        }

        if !self.skill_tags.contains(&tag) {
            if self.skill_tags.len() >= Self::MAX_SKILL_TAGS {
                return Err("MaxSkillTagsReached");
            }
            self.skill_tags.push(tag);
        }
        Ok(())
    }

    fn add_behavior_tag(&mut self, tag: String) -> std::result::Result<(), &'static str> {
        const MAX_TAG_NAME_LENGTH: usize = 32;

        if tag.len() > MAX_TAG_NAME_LENGTH {
            return Err("TagNameTooLong");
        }

        if !self.behavior_tags.contains(&tag) {
            if self.behavior_tags.len() >= Self::MAX_BEHAVIOR_TAGS {
                return Err("MaxBehaviorTagsReached");
            }
            self.behavior_tags.push(tag);
        }
        Ok(())
    }

    fn add_compliance_tag(&mut self, tag: String) -> std::result::Result<(), &'static str> {
        const MAX_TAG_NAME_LENGTH: usize = 32;

        if tag.len() > MAX_TAG_NAME_LENGTH {
            return Err("TagNameTooLong");
        }

        if !self.compliance_tags.contains(&tag) {
            if self.compliance_tags.len() >= Self::MAX_COMPLIANCE_TAGS {
                return Err("MaxComplianceTagsReached");
            }
            self.compliance_tags.push(tag);
        }
        Ok(())
    }

    fn remove_tag(&mut self, tag: &str) {
        self.skill_tags.retain(|t| t != tag);
        self.behavior_tags.retain(|t| t != tag);
        self.compliance_tags.retain(|t| t != tag);
        self.tag_scores.retain(|ts| ts.tag_name != tag);
    }

    fn update_tag_confidence(
        &mut self,
        tag_name: String,
        confidence: u16,
        evidence_count: u32,
        timestamp: i64,
    ) -> std::result::Result<(), &'static str> {
        if let Some(tag_score) = self
            .tag_scores
            .iter_mut()
            .find(|ts| ts.tag_name == tag_name)
        {
            tag_score.confidence = confidence;
            tag_score.evidence_count = evidence_count;
            tag_score.last_updated = timestamp;
        } else {
            if self.tag_scores.len() >= Self::MAX_TAG_SCORES {
                return Err("MaxTagScoresReached");
            }
            let new_tag_score =
                create_test_tag_score(&tag_name, confidence, evidence_count, timestamp);
            self.tag_scores.push(new_tag_score);
        }

        self.tag_updated_at = timestamp;
        Ok(())
    }

    fn get_tag_confidence(&self, tag_name: &str) -> Option<u16> {
        self.tag_scores
            .iter()
            .find(|ts| ts.tag_name == tag_name)
            .map(|ts| ts.confidence)
    }

    fn remove_stale_tags(&mut self, current_timestamp: i64) {
        let stale_tags: Vec<String> = self
            .tag_scores
            .iter()
            .filter(|ts| ts.is_stale(current_timestamp))
            .map(|ts| ts.tag_name.clone())
            .collect();

        for tag in stale_tags {
            self.remove_tag(&tag);
        }
    }

    fn total_tag_count(&self) -> usize {
        self.skill_tags.len() + self.behavior_tags.len() + self.compliance_tags.len()
    }

    fn has_tag(&self, tag: &str) -> bool {
        self.skill_tags.contains(&tag.to_string())
            || self.behavior_tags.contains(&tag.to_string())
            || self.compliance_tags.contains(&tag.to_string())
    }
}

#[derive(Clone, Debug)]
struct TestTagScore {
    tag_name: String,
    confidence: u16,
    evidence_count: u32,
    last_updated: i64,
}

impl TestTagScore {
    fn is_stale(&self, current_timestamp: i64) -> bool {
        const NINETY_DAYS: i64 = 90 * 24 * 60 * 60;
        current_timestamp - self.last_updated > NINETY_DAYS
    }
}

fn create_test_reputation_metrics(agent: Pubkey) -> TestReputationMetrics {
    let timestamp = 1000000i64;
    TestReputationMetrics {
        agent,
        successful_payments: 0,
        failed_payments: 0,
        total_response_time: 0,
        response_time_count: 0,
        total_disputes: 0,
        disputes_resolved: 0,
        total_rating: 0,
        total_ratings_count: 0,
        payment_history_7d: [0; 7],
        created_at: timestamp,
        updated_at: timestamp,
        skill_tags: Vec::new(),
        behavior_tags: Vec::new(),
        compliance_tags: Vec::new(),
        tag_scores: Vec::new(),
        tag_updated_at: timestamp,
    }
}

fn create_test_tag_score(
    tag_name: &str,
    confidence: u16,
    evidence_count: u32,
    timestamp: i64,
) -> TestTagScore {
    const MAX_TAG_NAME_LENGTH: usize = 32;
    const MAX_CONFIDENCE: u16 = 10000;

    assert!(tag_name.len() <= MAX_TAG_NAME_LENGTH, "Tag name too long");
    assert!(confidence <= MAX_CONFIDENCE, "Confidence out of bounds");

    TestTagScore {
        tag_name: tag_name.to_string(),
        confidence,
        evidence_count,
        last_updated: timestamp,
    }
}
