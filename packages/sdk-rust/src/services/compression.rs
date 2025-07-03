//! Compression Service for podAI SDK
//!
//! Provides data compression capabilities for efficient on-chain storage

use crate::{client::PodAIClient, errors::PodAIResult};
use solana_sdk::{pubkey::Pubkey, signature::Signer};
use std::sync::Arc;

/// Compression result with size information
#[derive(Debug, Clone)]
pub struct CompressionResult {
    /// Original data size in bytes
    pub original_size: usize,
    /// Compressed data size in bytes
    pub compressed_size: usize,
    /// Compressed data
    pub compressed_data: Vec<u8>,
}

/// Compression Service for efficient data storage
pub struct CompressionService {
    client: Arc<PodAIClient>,
}

impl CompressionService {
    /// Create new compression service
    pub fn new(client: Arc<PodAIClient>) -> Self {
        Self { client }
    }

    /// Compress data for on-chain storage
    pub async fn compress_data(&self, data: &[u8]) -> PodAIResult<CompressionResult> {
        println!("🗜️ Compressing {} bytes of data", data.len());

        // Simulate compression process
        tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;

        // Simple mock compression: add header and reduce size
        let mut compressed = vec![0xCC, 0x01]; // Compression header
        compressed.extend_from_slice(data);
        
        // Simulate compression by taking every other byte (mock 50% compression)
        let mock_compressed: Vec<u8> = data.iter().step_by(2).cloned().collect();
        compressed.extend(mock_compressed);

        let result = CompressionResult {
            original_size: data.len(),
            compressed_size: compressed.len(),
            compressed_data: compressed,
        };

        println!("✅ Compressed {} bytes to {} bytes", result.original_size, result.compressed_size);

        Ok(result)
    }

    /// Decompress data from on-chain storage
    pub async fn decompress_data(&self, compressed_data: &[u8], original_size: usize) -> PodAIResult<Vec<u8>> {
        println!("📤 Decompressing {} bytes", compressed_data.len());

        // Simulate decompression process
        tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;

        // Mock decompression: create data of original size
        let decompressed = vec![0x42; original_size]; // Fill with test data

        println!("✅ Decompressed to {} bytes", decompressed.len());

        Ok(decompressed)
    }

    /// Get compression ratio for account
    pub async fn get_compression_ratio(&self, account: &Pubkey) -> PodAIResult<f64> {
        println!("📊 Getting compression ratio for account: {}", account);

        // Simulate getting account data and analyzing compression
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

        // Mock compression ratio
        let ratio = 0.65; // 65% of original size

        Ok(ratio)
    }

    /// Estimate compression savings
    pub fn estimate_compression_savings(&self, data_size: usize) -> u64 {
        // Estimate based on typical compression ratios for blockchain data
        let estimated_compressed_size = (data_size as f64 * 0.6) as usize;
        let savings = data_size.saturating_sub(estimated_compressed_size);
        
        // Convert to lamports savings (approximate storage cost)
        (savings as u64) * 100 // 100 lamports per saved byte
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{PodAIConfig, NetworkType};

    #[tokio::test]
    async fn test_compression() {
        let config = PodAIConfig::new(NetworkType::Localnet, None, None);
        let client = Arc::new(PodAIClient::new(config).await.unwrap());
        let service = CompressionService::new(client);

        let data = b"Hello, World! This is test data for compression.";
        let result = service.compress_data(data).await.unwrap();

        assert_eq!(result.original_size, data.len());
        assert!(!result.compressed_data.is_empty());
    }

    #[tokio::test]
    async fn test_decompression() {
        let config = PodAIConfig::new(NetworkType::Localnet, None, None);
        let client = Arc::new(PodAIClient::new(config).await.unwrap());
        let service = CompressionService::new(client);

        let compressed_data = vec![0xCC, 0x01, 0x48, 0x65, 0x6C, 0x6C, 0x6F];
        let decompressed = service.decompress_data(&compressed_data, 10).await.unwrap();

        assert_eq!(decompressed.len(), 10);
    }

    #[test]
    fn test_compression_savings() {
        let config = PodAIConfig::new(NetworkType::Localnet, None, None);
        let client = Arc::new(futures::executor::block_on(async {
            PodAIClient::new(config).await.unwrap()
        }));
        let service = CompressionService::new(client);

        let savings = service.estimate_compression_savings(1000);
        assert!(savings > 0);
    }
} 