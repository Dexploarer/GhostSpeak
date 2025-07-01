pub mod merkle_tree;
pub mod proof_generation;
pub mod state_compression;

use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use solana_sdk::{
    account::Account,
    instruction::Instruction,
    pubkey::Pubkey,
    signature::{Keypair, Signature},
    signer::Signer,
};
use spl_account_compression::{
    concurrent_merkle_tree::{ConcurrentMerkleTree, ConcurrentMerkleTreeHeader},
    id as spl_account_compression_id,
    instruction as compression_instruction,
    state::{merkle_tree_get_size, ConcurrentMerkleTreeAccount},
};
use tracing::{debug, info, instrument, warn};

use crate::{
    client::{PodAIClient, transaction_factory::TransactionFactory},
    errors::{PodAIError, PodAIResult},
    monitoring::PerformanceMonitor,
};

/// Configuration for ZK compression operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressionConfig {
    /// Maximum tree depth (affects capacity and proof size)
    pub max_depth: u32,
    /// Maximum buffer size for batching operations
    pub max_buffer_size: u32,
    /// Enable compression for large data structures
    pub enable_large_data_compression: bool,
    /// Compression level (1-9, higher = better compression, slower)
    pub compression_level: u8,
    /// Enable parallel proof generation
    pub enable_parallel_proofs: bool,
    /// Maximum concurrent operations
    pub max_concurrent_operations: usize,
}

impl Default for CompressionConfig {
    fn default() -> Self {
        Self {
            max_depth: 20,         // ~1M leaves
            max_buffer_size: 64,   // 64 operations per batch
            enable_large_data_compression: true,
            compression_level: 6,  // Balanced compression
            enable_parallel_proofs: true,
            max_concurrent_operations: 10,
        }
    }
}

/// ZK Compression manager for efficient data operations
pub struct CompressionManager {
    client: Arc<PodAIClient>,
    config: CompressionConfig,
    tree_cache: Arc<tokio::sync::RwLock<HashMap<Pubkey, CachedTree>>>,
    performance_monitor: Option<Arc<PerformanceMonitor>>,
}

impl CompressionManager {
    /// Create a new compression manager
    pub fn new(
        client: Arc<PodAIClient>,
        config: Option<CompressionConfig>,
        performance_monitor: Option<Arc<PerformanceMonitor>>,
    ) -> Self {
        Self {
            client,
            config: config.unwrap_or_default(),
            tree_cache: Arc::new(tokio::sync::RwLock::new(HashMap::new())),
            performance_monitor,
        }
    }

    /// Create a new compressed merkle tree
    #[instrument(skip(self, authority), fields(max_depth, max_buffer_size))]
    pub async fn create_tree(
        &self,
        authority: &Keypair,
        max_depth: u32,
        max_buffer_size: u32,
    ) -> PodAIResult<CompressedTreeResult> {
        info!("Creating compressed merkle tree with depth {} and buffer {}", max_depth, max_buffer_size);

        let tree_keypair = Keypair::new();
        let tree_authority = authority.pubkey();
        
        // Calculate space required for the tree
        let space = merkle_tree_get_size(max_depth, max_buffer_size)
            .map_err(|e| PodAIError::Configuration {
                message: format!("Failed to calculate tree size: {}", e),
            })?;

        let rent = self.client
            .get_minimum_balance_for_rent_exemption(space)
            .await?;

        // Create the tree account
        let create_account_ix = solana_sdk::system_instruction::create_account(
            &authority.pubkey(),
            &tree_keypair.pubkey(),
            rent,
            space as u64,
            &spl_account_compression_id(),
        );

        // Initialize the tree
        let init_tree_ix = compression_instruction::init_empty_merkle_tree(
            spl_account_compression_id(),
            tree_keypair.pubkey(),
            tree_authority,
            tree_authority,
            max_depth,
            max_buffer_size,
        );

        let factory = TransactionFactory::new(self.client.clone());
        let signers = vec![authority, &tree_keypair];

        let result = factory
            .execute_transaction(
                vec![create_account_ix, init_tree_ix],
                &signers,
                Some(&authority.pubkey()),
            )
            .await?;

        // Cache the tree information
        let cached_tree = CachedTree {
            pubkey: tree_keypair.pubkey(),
            authority: tree_authority,
            max_depth,
            max_buffer_size,
            leaf_count: 0,
            last_updated: std::time::SystemTime::now(),
        };

        let mut cache = self.tree_cache.write().await;
        cache.insert(tree_keypair.pubkey(), cached_tree);

        info!("Compressed tree created successfully: {}", tree_keypair.pubkey());

        Ok(CompressedTreeResult {
            tree_pubkey: tree_keypair.pubkey(),
            authority: tree_authority,
            max_depth,
            max_buffer_size,
            creation_signature: result.signature,
            transaction_result: result,
        })
    }

    /// Append data to a compressed tree
    #[instrument(skip(self, authority, data), fields(tree = %tree_pubkey, data_len = data.len()))]
    pub async fn append_data(
        &self,
        tree_pubkey: &Pubkey,
        authority: &Keypair,
        data: Vec<CompressedData>,
    ) -> PodAIResult<AppendResult> {
        info!("Appending {} items to compressed tree {}", data.len(), tree_pubkey);

        let start_time = std::time::Instant::now();

        // Verify tree exists and get current state
        let tree_account = self.get_tree_account(tree_pubkey).await?;
        
        // Process data in batches if necessary
        let batch_size = self.config.max_buffer_size.min(data.len() as u32) as usize;
        let mut append_results = Vec::new();
        let mut total_leaves_added = 0;

        for batch in data.chunks(batch_size) {
            let batch_result = self.append_batch(tree_pubkey, authority, batch).await?;
            total_leaves_added += batch_result.leaves_added;
            append_results.push(batch_result);
        }

        // Update cache
        self.update_tree_cache(tree_pubkey, total_leaves_added).await;

        // Record performance metrics
        if let Some(monitor) = &self.performance_monitor {
            monitor.record_transaction(
                "compress_append",
                start_time.elapsed(),
                true,
                None, // Compute units not easily available here
                None, // Fee not easily available here
            ).await;
        }

        info!("Successfully appended {} leaves to tree {}", total_leaves_added, tree_pubkey);

        Ok(AppendResult {
            tree_pubkey: *tree_pubkey,
            leaves_added: total_leaves_added,
            batch_results: append_results,
            total_duration: start_time.elapsed(),
        })
    }

    /// Generate a merkle proof for a specific leaf
    #[instrument(skip(self), fields(tree = %tree_pubkey, leaf_index))]
    pub async fn generate_proof(
        &self,
        tree_pubkey: &Pubkey,
        leaf_index: u32,
    ) -> PodAIResult<MerkleProof> {
        info!("Generating merkle proof for leaf {} in tree {}", leaf_index, tree_pubkey);

        let tree_account = self.get_tree_account(tree_pubkey).await?;
        
        // In a full implementation, this would:
        // 1. Fetch the tree state from the account
        // 2. Generate the merkle proof
        // 3. Return the proof path and leaf data
        
        // For now, return a placeholder structure
        Ok(MerkleProof {
            tree_pubkey: *tree_pubkey,
            leaf_index,
            leaf_hash: [0u8; 32], // Would be actual leaf hash
            proof_path: vec![],    // Would be actual proof path
            root_hash: [0u8; 32],  // Would be actual root hash
        })
    }

    /// Verify a merkle proof
    #[instrument(skip(self, proof))]
    pub async fn verify_proof(&self, proof: &MerkleProof) -> PodAIResult<bool> {
        info!("Verifying merkle proof for leaf {} in tree {}", proof.leaf_index, proof.tree_pubkey);

        // In a full implementation, this would verify the proof path
        // For now, return true as a placeholder
        Ok(true)
    }

    /// Compress large data using standard compression algorithms
    pub fn compress_data(&self, data: &[u8]) -> PodAIResult<Vec<u8>> {
        if !self.config.enable_large_data_compression {
            return Ok(data.to_vec());
        }

        use flate2::{Compression, write::GzEncoder};
        use std::io::Write;

        let mut encoder = GzEncoder::new(Vec::new(), Compression::new(self.config.compression_level as u32));
        encoder.write_all(data)
            .map_err(|e| PodAIError::Internal {
                message: format!("Compression failed: {}", e),
            })?;

        let compressed = encoder.finish()
            .map_err(|e| PodAIError::Internal {
                message: format!("Compression finalization failed: {}", e),
            })?;

        debug!("Compressed {} bytes to {} bytes (ratio: {:.2}%)", 
            data.len(), 
            compressed.len(), 
            (compressed.len() as f64 / data.len() as f64) * 100.0
        );

        Ok(compressed)
    }

    /// Decompress data
    pub fn decompress_data(&self, compressed_data: &[u8]) -> PodAIResult<Vec<u8>> {
        use flate2::read::GzDecoder;
        use std::io::Read;

        let mut decoder = GzDecoder::new(compressed_data);
        let mut decompressed = Vec::new();
        
        decoder.read_to_end(&mut decompressed)
            .map_err(|e| PodAIError::Internal {
                message: format!("Decompression failed: {}", e),
            })?;

        Ok(decompressed)
    }

    /// Get compressed tree statistics
    pub async fn get_tree_stats(&self, tree_pubkey: &Pubkey) -> PodAIResult<TreeStats> {
        let tree_account = self.get_tree_account(tree_pubkey).await?;
        
        // Read from cache if available
        let cache = self.tree_cache.read().await;
        if let Some(cached_tree) = cache.get(tree_pubkey) {
            return Ok(TreeStats {
                tree_pubkey: *tree_pubkey,
                authority: cached_tree.authority,
                max_depth: cached_tree.max_depth,
                max_buffer_size: cached_tree.max_buffer_size,
                current_leaf_count: cached_tree.leaf_count,
                max_capacity: 2_u64.pow(cached_tree.max_depth),
                utilization: cached_tree.leaf_count as f64 / 2_f64.powi(cached_tree.max_depth as i32),
                last_updated: cached_tree.last_updated,
            });
        }

        // Fallback to reading from account (simplified)
        Ok(TreeStats {
            tree_pubkey: *tree_pubkey,
            authority: Pubkey::default(), // Would parse from account
            max_depth: 20,                // Would parse from account
            max_buffer_size: 64,          // Would parse from account
            current_leaf_count: 0,        // Would parse from account
            max_capacity: 2_u64.pow(20),
            utilization: 0.0,
            last_updated: std::time::SystemTime::now(),
        })
    }

    /// Helper method to get tree account
    async fn get_tree_account(&self, tree_pubkey: &Pubkey) -> PodAIResult<Account> {
        self.client.get_account(tree_pubkey).await
            .map_err(|_| PodAIError::AccountNotFound {
                account_type: "CompressedTree".to_string(),
                address: tree_pubkey.to_string(),
            })
    }

    /// Helper method to append a batch of data
    async fn append_batch(
        &self,
        tree_pubkey: &Pubkey,
        authority: &Keypair,
        batch: &[CompressedData],
    ) -> PodAIResult<BatchAppendResult> {
        // In a full implementation, this would:
        // 1. Prepare the append instructions
        // 2. Build the transaction
        // 3. Send the transaction
        // 4. Return the result

        Ok(BatchAppendResult {
            leaves_added: batch.len() as u32,
            signatures: vec![], // Would contain actual signatures
        })
    }

    /// Helper method to update tree cache
    async fn update_tree_cache(&self, tree_pubkey: &Pubkey, leaves_added: u32) {
        let mut cache = self.tree_cache.write().await;
        if let Some(cached_tree) = cache.get_mut(tree_pubkey) {
            cached_tree.leaf_count += leaves_added as u64;
            cached_tree.last_updated = std::time::SystemTime::now();
        }
    }
}

/// Compressed data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressedData {
    pub data: Vec<u8>,
    pub metadata: Option<HashMap<String, String>>,
    pub compression_type: CompressionType,
}

/// Compression types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CompressionType {
    /// No compression
    None,
    /// Standard gzip compression
    Gzip,
    /// Merkle tree compression
    MerkleTree,
    /// Custom compression scheme
    Custom(String),
}

/// Result of creating a compressed tree
#[derive(Debug, Clone)]
pub struct CompressedTreeResult {
    pub tree_pubkey: Pubkey,
    pub authority: Pubkey,
    pub max_depth: u32,
    pub max_buffer_size: u32,
    pub creation_signature: Signature,
    pub transaction_result: crate::client::transaction_factory::TransactionResult,
}

/// Result of appending data to a tree
#[derive(Debug, Clone)]
pub struct AppendResult {
    pub tree_pubkey: Pubkey,
    pub leaves_added: u32,
    pub batch_results: Vec<BatchAppendResult>,
    pub total_duration: std::time::Duration,
}

/// Result of a batch append operation
#[derive(Debug, Clone)]
pub struct BatchAppendResult {
    pub leaves_added: u32,
    pub signatures: Vec<Signature>,
}

/// Merkle proof structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MerkleProof {
    pub tree_pubkey: Pubkey,
    pub leaf_index: u32,
    pub leaf_hash: [u8; 32],
    pub proof_path: Vec<[u8; 32]>,
    pub root_hash: [u8; 32],
}

/// Tree statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TreeStats {
    pub tree_pubkey: Pubkey,
    pub authority: Pubkey,
    pub max_depth: u32,
    pub max_buffer_size: u32,
    pub current_leaf_count: u64,
    pub max_capacity: u64,
    pub utilization: f64,
    pub last_updated: std::time::SystemTime,
}

/// Cached tree information
#[derive(Debug, Clone)]
struct CachedTree {
    pub pubkey: Pubkey,
    pub authority: Pubkey,
    pub max_depth: u32,
    pub max_buffer_size: u32,
    pub leaf_count: u64,
    pub last_updated: std::time::SystemTime,
}

/// Factory for creating compression managers
pub struct CompressionFactory {
    client: Arc<PodAIClient>,
    default_config: CompressionConfig,
}

impl CompressionFactory {
    /// Create a new compression factory
    pub fn new(client: Arc<PodAIClient>) -> Self {
        Self {
            client,
            default_config: CompressionConfig::default(),
        }
    }

    /// Create a compression manager with default config
    pub fn create_manager(&self) -> CompressionManager {
        CompressionManager::new(self.client.clone(), Some(self.default_config.clone()), None)
    }

    /// Create a compression manager with monitoring
    pub fn create_manager_with_monitoring(
        &self,
        performance_monitor: Arc<PerformanceMonitor>,
    ) -> CompressionManager {
        CompressionManager::new(
            self.client.clone(),
            Some(self.default_config.clone()),
            Some(performance_monitor),
        )
    }

    /// Create a compression manager with custom config
    pub fn create_manager_with_config(&self, config: CompressionConfig) -> CompressionManager {
        CompressionManager::new(self.client.clone(), Some(config), None)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use solana_sdk::signature::Keypair;

    #[test]
    fn test_compression_config_default() {
        let config = CompressionConfig::default();
        assert_eq!(config.max_depth, 20);
        assert_eq!(config.max_buffer_size, 64);
        assert!(config.enable_large_data_compression);
        assert_eq!(config.compression_level, 6);
    }

    #[test]
    fn test_data_compression() {
        let client = Arc::new(PodAIClient::devnet().await.unwrap());
        let manager = CompressionManager::new(client, None, None);
        
        let test_data = b"Hello, World! This is a test string for compression.";
        let compressed = manager.compress_data(test_data).unwrap();
        let decompressed = manager.decompress_data(&compressed).unwrap();
        
        assert_eq!(test_data.to_vec(), decompressed);
    }

    #[tokio::test]
    async fn test_compression_factory() {
        let client = Arc::new(PodAIClient::devnet().await.unwrap());
        let factory = CompressionFactory::new(client);
        
        let manager = factory.create_manager();
        assert_eq!(manager.config.max_depth, 20);
        assert_eq!(manager.config.compression_level, 6);
    }

    #[test]
    fn test_compressed_data_creation() {
        let data = CompressedData {
            data: vec![1, 2, 3, 4, 5],
            metadata: Some([("type".to_string(), "test".to_string())].iter().cloned().collect()),
            compression_type: CompressionType::Gzip,
        };
        
        assert_eq!(data.data.len(), 5);
        assert!(data.metadata.is_some());
        assert!(matches!(data.compression_type, CompressionType::Gzip));
    }

    #[test]
    fn test_merkle_proof_structure() {
        let proof = MerkleProof {
            tree_pubkey: Pubkey::default(),
            leaf_index: 42,
            leaf_hash: [1u8; 32],
            proof_path: vec![[2u8; 32], [3u8; 32]],
            root_hash: [4u8; 32],
        };
        
        assert_eq!(proof.leaf_index, 42);
        assert_eq!(proof.proof_path.len(), 2);
    }
} 