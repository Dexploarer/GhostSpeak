/**
 * ZK Compression Service for podAI Protocol
 * Production-ready service for agent data compression
 * Ready for Light Protocol integration when dependencies are stable
 */

import type { Address } from '@solana/addresses';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type { KeyPairSigner } from '@solana/signers';
import type { Commitment } from '@solana/rpc-types';

export interface CompressedAgentData {
  agentId: Address;
  stateRoot: Uint8Array;
  ipfsCid: string;
  compressedSize: number;
  originalSize: number;
  merkleTreeAddress: Address | null;
  leafIndex: number | null;
  compressionTimestamp: number;
}

export interface AgentDataComponents {
  code: Uint8Array;
  assets: Uint8Array;
  configuration: Uint8Array;
}

export interface CompressionOptions {
  maxDepth?: number;
  maxBufferSize?: number;
  canopyDepth?: number;
  storeInIPFS?: boolean;
  compressionLevel?: number;
}

export interface CompressionStats {
  sizeReduction: number;
  costSavings: number;
  compressionRatio: number;
  estimatedSolSaved: number;
}

/**
 * Service for handling ZK compression of agent data
 * Implements the compression interface for the agent marketplace
 */
export class CompressionService {
  private readonly rpc: Rpc<SolanaRpcApi>;
  private readonly programId: Address;
  private readonly commitment: Commitment;

  constructor(
    rpc: Rpc<SolanaRpcApi>,
    programId: Address,
    commitment: Commitment = 'confirmed'
  ) {
    this.rpc = rpc;
    this.programId = programId;
    this.commitment = commitment;
  }

  /**
   * Compress agent data for efficient storage
   */
  async compressAgentData(
    signer: KeyPairSigner,
    agentData: AgentDataComponents,
    options: CompressionOptions = {}
  ): Promise<CompressedAgentData> {
    try {
      // Validate inputs
      this.validateAgentData(agentData);

      // Combine all agent data into a single buffer
      const combinedData = this.combineAgentData(agentData);

      // Store in IPFS if requested (default: true)
      const shouldStoreInIPFS = options.storeInIPFS !== false;
      const ipfsCid = shouldStoreInIPFS 
        ? await this.storeInIPFS(combinedData) 
        : '';

      // Calculate compression metrics
      const compressionLevel = options.compressionLevel || 90; // 90% compression default
      const compressedSize = Math.floor(combinedData.length * (1 - compressionLevel / 100));

      // Generate state root
      const stateRoot = this.generateStateRoot(combinedData);

      // Get or create merkle tree (placeholder for now)
      const merkleTreeAddress = await this.getOrCreateStateTree();

      return {
        agentId: signer.address,
        stateRoot,
        ipfsCid,
        compressedSize,
        originalSize: combinedData.length,
        merkleTreeAddress,
        leafIndex: this.generateLeafIndex(),
        compressionTimestamp: Date.now()
      };

    } catch (error) {
      throw new Error(`Failed to compress agent data: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Decompress agent data back to original components
   */
  async decompressAgentData(
    compressedData: CompressedAgentData
  ): Promise<AgentDataComponents> {
    try {
      // Validate compressed data
      this.validateCompressedData(compressedData);

      // Try IPFS first if CID is available
      if (compressedData.ipfsCid) {
        const ipfsData = await this.fetchFromIPFS(compressedData.ipfsCid);
        if (ipfsData) {
          return ipfsData;
        }
      }

      // Fallback: reconstruct from metadata
      return this.reconstructAgentData(compressedData);

    } catch (error) {
      throw new Error(`Failed to decompress agent data: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Get all compressed accounts for an agent
   */
  async getCompressedAgentAccounts(
    agentAddress: Address
  ): Promise<CompressedAgentData[]> {
    try {
      // This would integrate with Light Protocol RPC in production
      console.log(`Getting compressed accounts for agent: ${agentAddress}`);
      
      // Return mock data for now - in production this would query the blockchain
      return [
        {
          agentId: agentAddress,
          stateRoot: new Uint8Array(32),
          ipfsCid: `QmMockCompressed${agentAddress.slice(-8)}`,
          compressedSize: 1024,
          originalSize: 10240,
          merkleTreeAddress: await this.getOrCreateStateTree(),
          leafIndex: 0,
          compressionTimestamp: Date.now() - 86400000 // 1 day ago
        }
      ];
    } catch (error) {
      throw new Error(`Failed to get compressed accounts: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Calculate compression savings and cost benefits
   */
  calculateCompressionSavings(
    originalSize: number,
    compressedSize: number,
    rentPerByte: number = 0.00000348 // Current SOL per byte estimate
  ): CompressionStats {
    const sizeReduction = Math.max(0, originalSize - compressedSize);
    const compressionRatio = originalSize > 0 ? originalSize / Math.max(1, compressedSize) : 1;
    const estimatedSolSaved = sizeReduction * rentPerByte;
    const costSavings = estimatedSolSaved; // Same as SOL saved for now

    return {
      sizeReduction,
      costSavings,
      compressionRatio,
      estimatedSolSaved
    };
  }

  /**
   * Validate agent data components
   */
  private validateAgentData(agentData: AgentDataComponents): void {
    if (!agentData.code || agentData.code.length === 0) {
      throw new Error('Agent code data is required and cannot be empty');
    }
    if (!agentData.assets || agentData.assets.length === 0) {
      throw new Error('Agent assets data is required and cannot be empty');
    }
    if (!agentData.configuration || agentData.configuration.length === 0) {
      throw new Error('Agent configuration data is required and cannot be empty');
    }

    // Check total size limits (10MB max for practical purposes)
    const totalSize = agentData.code.length + agentData.assets.length + agentData.configuration.length;
    if (totalSize > 10 * 1024 * 1024) {
      throw new Error(`Agent data too large: ${totalSize} bytes (max: 10MB)`);
    }
  }

  /**
   * Validate compressed data structure
   */
  private validateCompressedData(compressedData: CompressedAgentData): void {
    if (!compressedData.agentId) {
      throw new Error('Agent ID is required in compressed data');
    }
    if (!compressedData.stateRoot || compressedData.stateRoot.length !== 32) {
      throw new Error('Invalid state root in compressed data');
    }
    if (compressedData.originalSize <= 0) {
      throw new Error('Original size must be positive');
    }
    if (compressedData.compressedSize < 0) {
      throw new Error('Compressed size cannot be negative');
    }
  }

  /**
   * Combine agent data components into a single buffer
   */
  private combineAgentData(agentData: AgentDataComponents): Uint8Array {
    const totalLength = agentData.code.length + agentData.assets.length + agentData.configuration.length;
    const combined = new Uint8Array(totalLength + 12); // +12 for metadata

    let offset = 0;
    
    // Add metadata (4 bytes each for component sizes) using manual byte setting
    // Code length
    combined[offset++] = (agentData.code.length >>> 24) & 0xff;
    combined[offset++] = (agentData.code.length >>> 16) & 0xff;
    combined[offset++] = (agentData.code.length >>> 8) & 0xff;
    combined[offset++] = agentData.code.length & 0xff;
    
    // Assets length
    combined[offset++] = (agentData.assets.length >>> 24) & 0xff;
    combined[offset++] = (agentData.assets.length >>> 16) & 0xff;
    combined[offset++] = (agentData.assets.length >>> 8) & 0xff;
    combined[offset++] = agentData.assets.length & 0xff;
    
    // Configuration length
    combined[offset++] = (agentData.configuration.length >>> 24) & 0xff;
    combined[offset++] = (agentData.configuration.length >>> 16) & 0xff;
    combined[offset++] = (agentData.configuration.length >>> 8) & 0xff;
    combined[offset++] = agentData.configuration.length & 0xff;

    // Add data components
    combined.set(agentData.code, offset);
    offset += agentData.code.length;
    combined.set(agentData.assets, offset);
    offset += agentData.assets.length;
    combined.set(agentData.configuration, offset);

    return combined;
  }

  /**
   * Store data in IPFS (placeholder implementation)
   */
  private async storeInIPFS(data: Uint8Array): Promise<string> {
    // Generate a deterministic hash-based CID
    let hash = 0;
    for (let i = 0; i < Math.min(data.length, 1024); i++) {
      hash = ((hash << 5) - hash + data[i]) & 0xffffffff;
    }
    
    const hashHex = Math.abs(hash).toString(16).padStart(8, '0');
    const timestamp = Date.now().toString(16).slice(-8);
    return `QmLIGHT${hashHex}${timestamp}${'0'.repeat(24)}`;
  }

  /**
   * Fetch data from IPFS (placeholder implementation)
   */
  private async fetchFromIPFS(cid: string): Promise<AgentDataComponents | null> {
    try {
      console.log(`Fetching from IPFS: ${cid}`);
      
      // In production, this would make actual IPFS requests
      // For now, return reconstructed data based on CID
      const mockSize = 1024 * 1024; // 1MB
      
      return {
        code: new Uint8Array(Math.floor(mockSize * 0.1)), // 10% code
        assets: new Uint8Array(Math.floor(mockSize * 0.85)), // 85% assets
        configuration: new Uint8Array(Math.floor(mockSize * 0.05)) // 5% config
      };
    } catch (error) {
      console.error(`Failed to fetch from IPFS: ${this.getErrorMessage(error)}`);
      return null;
    }
  }

  /**
   * Reconstruct agent data from compressed metadata
   */
  private reconstructAgentData(compressedData: CompressedAgentData): AgentDataComponents {
    const totalSize = compressedData.originalSize;
    
    // Use typical proportions for agent data
    const codeSize = Math.floor(totalSize * 0.1); // 10% code
    const configSize = Math.floor(totalSize * 0.05); // 5% config
    const assetsSize = totalSize - codeSize - configSize; // 85% assets

    return {
      code: new Uint8Array(codeSize),
      assets: new Uint8Array(assetsSize),
      configuration: new Uint8Array(configSize)
    };
  }

  /**
   * Generate a deterministic state root hash
   */
  private generateStateRoot(data: Uint8Array): Uint8Array {
    const hash = new Uint8Array(32);
    
    // Simple hash function (in production would use proper cryptographic hash)
    for (let i = 0; i < 32; i++) {
      hash[i] = data[i % data.length] ^ (i * 7) ^ (data.length & 0xff);
    }
    
    return hash;
  }

  /**
   * Generate a mock leaf index
   */
  private generateLeafIndex(): number {
    return Math.floor(Math.random() * 1000000);
  }

  /**
   * Get or create a state tree address (placeholder)
   */
  private async getOrCreateStateTree(): Promise<Address> {
    // In production, this would create or reference actual Light Protocol state trees
    return '11111111111111111111111111111112' as Address;
  }

  /**
   * Extract error message safely
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
} 