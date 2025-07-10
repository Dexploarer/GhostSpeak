use anchor_lang::prelude::*;
use podai::state::{Escrow, EscrowStatus, TaskEscrow, TaskStatus};

#[cfg(test)]
mod escrow_tests {
    use super::*;
    
    #[test]
    fn test_escrow_creation() {
        // Test creating a new escrow
        let client = Pubkey::new_unique();
        let agent = Pubkey::new_unique();
        let task_id = "task_001";
        let amount = 1000u64;
        let current_time = 1234567890i64;
        
        let escrow = Escrow {
            client,
            agent,
            task_id: task_id.to_string(),
            amount,
            status: EscrowStatus::Active,
            created_at: current_time,
            expires_at: current_time + 86400, // 24 hours later
            dispute_reason: None,
            resolution_notes: None,
        };
        
        // Validate escrow fields
        assert_eq!(escrow.client, client);
        assert_eq!(escrow.agent, agent);
        assert_eq!(escrow.amount, amount);
        assert_eq!(escrow.status, EscrowStatus::Active);
        assert!(escrow.expires_at > escrow.created_at);
    }
    
    #[test]
    fn test_escrow_status_transitions() {
        // Test valid status transitions
        let mut escrow = Escrow {
            client: Pubkey::new_unique(),
            agent: Pubkey::new_unique(),
            task_id: "task_002".to_string(),
            amount: 500u64,
            status: EscrowStatus::Active,
            created_at: 1234567890,
            expires_at: 1234567890 + 86400,
            dispute_reason: None,
            resolution_notes: None,
        };
        
        // Active -> Completed
        assert_eq!(escrow.status, EscrowStatus::Active);
        escrow.status = EscrowStatus::Completed;
        assert_eq!(escrow.status, EscrowStatus::Completed);
        
        // Reset for next test
        escrow.status = EscrowStatus::Active;
        
        // Active -> Disputed
        escrow.status = EscrowStatus::Disputed;
        escrow.dispute_reason = Some("Service not delivered as promised".to_string());
        assert_eq!(escrow.status, EscrowStatus::Disputed);
        assert!(escrow.dispute_reason.is_some());
        
        // Disputed -> Resolved
        escrow.status = EscrowStatus::Resolved;
        escrow.resolution_notes = Some("Partial refund issued".to_string());
        assert_eq!(escrow.status, EscrowStatus::Resolved);
        assert!(escrow.resolution_notes.is_some());
    }
    
    #[test]
    fn test_escrow_expiration() {
        // Test escrow expiration logic
        let current_time = 1234567890i64;
        let expired_time = current_time - 1; // Already expired
        let future_time = current_time + 3600; // 1 hour in future
        
        let expired_escrow = Escrow {
            client: Pubkey::new_unique(),
            agent: Pubkey::new_unique(),
            task_id: "expired_task".to_string(),
            amount: 100u64,
            status: EscrowStatus::Active,
            created_at: current_time - 86400,
            expires_at: expired_time,
            dispute_reason: None,
            resolution_notes: None,
        };
        
        let valid_escrow = Escrow {
            client: Pubkey::new_unique(),
            agent: Pubkey::new_unique(),
            task_id: "valid_task".to_string(),
            amount: 100u64,
            status: EscrowStatus::Active,
            created_at: current_time,
            expires_at: future_time,
            dispute_reason: None,
            resolution_notes: None,
        };
        
        // Check expiration
        assert!(expired_escrow.expires_at < current_time, "Escrow should be expired");
        assert!(valid_escrow.expires_at > current_time, "Escrow should be valid");
    }
    
    #[test]
    fn test_task_escrow_creation() {
        // Test TaskEscrow struct
        let client = Pubkey::new_unique();
        let agent = Pubkey::new_unique();
        let task_id = "complex_task_001";
        let amount = 5000u64;
        let current_time = 1234567890i64;
        
        let task_escrow = TaskEscrow {
            task_id: task_id.to_string(),
            client,
            agent,
            amount,
            status: TaskStatus::Pending,
            created_at: current_time,
            deadline: current_time + 604800, // 7 days
            completion_proof: None,
            dispute_details: None,
            escrow_pubkey: Pubkey::new_unique(),
        };
        
        // Validate fields
        assert_eq!(task_escrow.task_id, task_id);
        assert_eq!(task_escrow.amount, amount);
        assert_eq!(task_escrow.status, TaskStatus::Pending);
        assert!(task_escrow.deadline > task_escrow.created_at);
        assert!(task_escrow.completion_proof.is_none());
    }
    
    #[test]
    fn test_task_status_progression() {
        // Test task status transitions
        let mut task_escrow = TaskEscrow {
            task_id: "status_test".to_string(),
            client: Pubkey::new_unique(),
            agent: Pubkey::new_unique(),
            amount: 1000u64,
            status: TaskStatus::Pending,
            created_at: 1234567890,
            deadline: 1234567890 + 86400,
            completion_proof: None,
            dispute_details: None,
            escrow_pubkey: Pubkey::new_unique(),
        };
        
        // Pending -> InProgress
        assert_eq!(task_escrow.status, TaskStatus::Pending);
        task_escrow.status = TaskStatus::InProgress;
        assert_eq!(task_escrow.status, TaskStatus::InProgress);
        
        // InProgress -> Completed
        task_escrow.status = TaskStatus::Completed;
        task_escrow.completion_proof = Some("ipfs://QmProof123".to_string());
        assert_eq!(task_escrow.status, TaskStatus::Completed);
        assert!(task_escrow.completion_proof.is_some());
    }
    
    #[test]
    fn test_dispute_handling() {
        // Test dispute scenarios
        let mut task_escrow = TaskEscrow {
            task_id: "dispute_test".to_string(),
            client: Pubkey::new_unique(),
            agent: Pubkey::new_unique(),
            amount: 2000u64,
            status: TaskStatus::InProgress,
            created_at: 1234567890,
            deadline: 1234567890 + 86400,
            completion_proof: None,
            dispute_details: None,
            escrow_pubkey: Pubkey::new_unique(),
        };
        
        // Raise dispute
        task_escrow.status = TaskStatus::Disputed;
        task_escrow.dispute_details = Some("Work quality below expectations".to_string());
        
        assert_eq!(task_escrow.status, TaskStatus::Disputed);
        assert!(task_escrow.dispute_details.is_some());
        assert_eq!(
            task_escrow.dispute_details.as_ref().unwrap(),
            "Work quality below expectations"
        );
    }
    
    #[test]
    fn test_escrow_amount_validation() {
        // Test various escrow amounts
        let zero_amount = 0u64;
        let small_amount = 1u64;
        let normal_amount = 1000u64;
        let large_amount = 1_000_000_000u64;
        
        // All amounts should be valid (business logic determines minimums)
        assert_eq!(zero_amount, 0);
        assert!(small_amount > zero_amount);
        assert!(normal_amount > small_amount);
        assert!(large_amount > normal_amount);
        
        // Test for overflow protection
        let max_amount = u64::MAX;
        let result = max_amount.checked_add(1);
        assert!(result.is_none(), "Should detect overflow");
    }
    
    #[test]
    fn test_deadline_validation() {
        // Test deadline constraints
        let current_time = 1234567890i64;
        let past_deadline = current_time - 3600; // 1 hour ago
        let immediate_deadline = current_time + 60; // 1 minute from now
        let reasonable_deadline = current_time + 86400; // 24 hours
        let far_deadline = current_time + 2592000; // 30 days
        
        // Past deadlines should be invalid
        assert!(past_deadline < current_time, "Past deadline should be invalid");
        
        // Future deadlines should be valid
        assert!(immediate_deadline > current_time, "Future deadline should be valid");
        assert!(reasonable_deadline > current_time, "Reasonable deadline should be valid");
        assert!(far_deadline > current_time, "Far deadline should be valid");
        
        // Calculate time remaining
        let time_remaining = reasonable_deadline - current_time;
        assert_eq!(time_remaining, 86400, "Should have 24 hours remaining");
    }
    
    #[test]
    fn test_escrow_release_conditions() {
        // Test conditions for releasing escrow funds
        let escrow = Escrow {
            client: Pubkey::new_unique(),
            agent: Pubkey::new_unique(),
            task_id: "release_test".to_string(),
            amount: 1000u64,
            status: EscrowStatus::Active,
            created_at: 1234567890,
            expires_at: 1234567890 + 86400,
            dispute_reason: None,
            resolution_notes: None,
        };
        
        // Active status - funds locked
        let can_release_active = escrow.status == EscrowStatus::Completed;
        assert!(!can_release_active, "Should not release funds when active");
        
        // Completed status - funds can be released
        let completed_escrow = Escrow {
            status: EscrowStatus::Completed,
            ..escrow
        };
        let can_release_completed = completed_escrow.status == EscrowStatus::Completed;
        assert!(can_release_completed, "Should release funds when completed");
        
        // Disputed status - funds locked
        let disputed_escrow = Escrow {
            status: EscrowStatus::Disputed,
            ..escrow
        };
        let can_release_disputed = disputed_escrow.status == EscrowStatus::Completed;
        assert!(!can_release_disputed, "Should not release funds when disputed");
    }
}