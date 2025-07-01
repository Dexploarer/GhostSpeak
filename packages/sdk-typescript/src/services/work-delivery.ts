/**
 * Work Delivery Service using Metaplex Bubblegum (cNFTs)
 * Handles work output storage, compressed NFT minting, and deliverable management
 */

import { 
  createUmi,
  type Umi,
  type PublicKey as UmiPublicKey
} from '@metaplex-foundation/umi';
import { 
  mplBubblegum,
  createTree,
  mintV1,
  transferV1,
  burnV1,
  findLeafAssetIdPda,
  type MetadataArgsArgs 
} from '@metaplex-foundation/mpl-bubblegum';
import { 
  dasApi,
  type DasApiAsset 
} from '@metaplex-foundation/digital-asset-standard-api';
// Note: Account compression functions would be imported from proper package
// For now, using placeholders until proper package is available
const ALL_DEPTH_SIZE_PAIRS = [
  { maxDepth: 14, maxBufferSize: 64 },
  { maxDepth: 20, maxBufferSize: 256 },
  { maxDepth: 24, maxBufferSize: 1024 },
  { maxDepth: 26, maxBufferSize: 2048 }
];

function getConcurrentMerkleTreeAccountSize(
  maxDepth: number,
  maxBufferSize: number,
  canopyDepth: number = 0
): number {
  // Placeholder calculation - would use actual package function
  return 8 + (maxDepth * 32) + (maxBufferSize * 64) + (canopyDepth * 32);
}

import type { Address } from '@solana/addresses';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type { KeyPairSigner } from '@solana/signers';
import type { Commitment } from '@solana/rpc-types';

export interface WorkOutput {
  title: string;
  description: string;
  deliverables: WorkDeliverable[];
  provider: Address;
  client: Address;
  projectId: string;
  channelId: Address;
  completedAt: Date;
}

export interface WorkDeliverable {
  name: string;
  type: 'code' | 'asset' | 'document' | 'data' | 'other';
  ipfsHash: string;
  fileSize: number;
  mimeType?: string;
  checksum: string;
}

export interface WorkDeliveryNFT {
  assetId: Address;
  merkleTree: Address;
  leafIndex: number;
  workOutput: WorkOutput;
  metadata: MetadataArgsArgs;
}

export interface MerkleTreeConfig {
  maxDepth: number;
  maxBufferSize: number;
  canopyDepth: number;
  capacity: number;
  storageCost: number;
}

/**
 * Service for handling work deliveries using compressed NFTs
 */
export class WorkDeliveryService {
  private umi: Umi;

  constructor(
    private rpc: Rpc<SolanaRpcApi>,
    private programId: Address,
    private commitment: Commitment = 'confirmed',
    rpcEndpoint: string
  ) {
    // Initialize Umi for Metaplex operations
    this.umi = createUmi(rpcEndpoint)
      .use(mplBubblegum())
      .use(dasApi());
  }

  /**
   * Create a Merkle tree for storing work delivery cNFTs
   */
  async createWorkDeliveryTree(
    signer: KeyPairSigner,
    expectedWorkCount: number = 1000
  ): Promise<{
    merkleTree: Address;
    config: MerkleTreeConfig;
    signature: string;
  }> {
    try {
      const config = this.calculateMerkleTreeConfig(expectedWorkCount);
      
      // Generate tree keypair
      const merkleTreeKeypair = this.umi.eddsa.generateKeypair();
      
      // Create the tree
      const builder = await createTree(this.umi, {
        merkleTree: merkleTreeKeypair,
        maxDepth: config.maxDepth,
        maxBufferSize: config.maxBufferSize,
        canopyDepth: config.canopyDepth,
      });

      const result = await builder.sendAndConfirm(this.umi);
      
      return {
        merkleTree: merkleTreeKeypair.publicKey as Address,
        config,
        signature: result.signature.toString()
      };

    } catch (error) {
      throw new Error(`Failed to create work delivery tree: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Mint a cNFT for work delivery
   */
  async mintWorkDeliveryNFT(
    signer: KeyPairSigner,
    workOutput: WorkOutput,
    merkleTree: Address,
    collectionMint?: Address
  ): Promise<WorkDeliveryNFT> {
    try {
      // Generate metadata for the work output
      const metadata = this.generateWorkMetadata(workOutput, collectionMint);
      
      // Convert addresses to Umi format
      const merkleTreeUmi = merkleTree as UmiPublicKey;
      const clientUmi = workOutput.client as UmiPublicKey;
      
      // Mint the cNFT
      const result = await mintV1(this.umi, {
        leafOwner: clientUmi,
        merkleTree: merkleTreeUmi,
        metadata
      }).sendAndConfirm(this.umi);

      // Calculate leaf index (this would come from the transaction logs in practice)
      const leafIndex = 0; // Placeholder - would be extracted from transaction
      
      // Generate asset ID
      const [assetId] = findLeafAssetIdPda(this.umi, {
        merkleTree: merkleTreeUmi,
        leafIndex
      });

      return {
        assetId: assetId as Address,
        merkleTree,
        leafIndex,
        workOutput,
        metadata
      };

    } catch (error) {
      throw new Error(`Failed to mint work delivery NFT: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Transfer work delivery NFT to client
   */
  async transferWorkDeliveryNFT(
    signer: KeyPairSigner,
    assetId: Address,
    newOwner: Address
  ): Promise<string> {
    try {
      // Get asset proof and data
      const asset = await this.umi.rpc.getAsset(assetId as UmiPublicKey);
      const assetProof = await this.umi.rpc.getAssetProof(assetId as UmiPublicKey);

      // Transfer the cNFT
      const result = await transferV1(this.umi, {
        asset,
        assetProof,
        newLeafOwner: newOwner as UmiPublicKey
      }).sendAndConfirm(this.umi);

      return result.signature.toString();

    } catch (error) {
      throw new Error(`Failed to transfer work delivery NFT: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get work delivery NFT details
   */
  async getWorkDeliveryNFT(assetId: Address): Promise<DasApiAsset> {
    try {
      const asset = await this.umi.rpc.getAsset(assetId as UmiPublicKey);
      return asset;
    } catch (error) {
      throw new Error(`Failed to get work delivery NFT: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all work deliveries for a client
   */
  async getClientWorkDeliveries(clientAddress: Address): Promise<DasApiAsset[]> {
    try {
      const assets = await this.umi.rpc.getAssetsByOwner({
        owner: clientAddress as UmiPublicKey
      });

      // Filter for work delivery NFTs (by collection or metadata)
      return assets.items.filter(asset => 
        asset.content?.metadata?.name?.includes('Work Delivery') ||
        asset.content?.metadata?.attributes?.some(attr => 
          attr.trait_type === 'Type' && attr.value === 'Work Delivery'
        )
      );
    } catch (error) {
      throw new Error(`Failed to get client work deliveries: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all work deliveries for a provider
   */
  async getProviderWorkDeliveries(providerAddress: Address): Promise<DasApiAsset[]> {
    try {
      // This would require indexing or searching by creator
      // For now, we'll search by collection or use a known tree
      const assets = await this.umi.rpc.getAssetsByCreator({
        creator: providerAddress as UmiPublicKey
      });

      return assets.items.filter(asset => 
        asset.content?.metadata?.attributes?.some(attr => 
          attr.trait_type === 'Type' && attr.value === 'Work Delivery'
        )
      );
    } catch (error) {
      throw new Error(`Failed to get provider work deliveries: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Burn a work delivery NFT (for privacy/cleanup)
   */
  async burnWorkDeliveryNFT(
    signer: KeyPairSigner,
    assetId: Address
  ): Promise<string> {
    try {
      // Get asset proof and data
      const asset = await this.umi.rpc.getAsset(assetId as UmiPublicKey);
      const assetProof = await this.umi.rpc.getAssetProof(assetId as UmiPublicKey);

      // Burn the cNFT
      const result = await burnV1(this.umi, {
        asset,
        assetProof
      }).sendAndConfirm(this.umi);

      return result.signature.toString();

    } catch (error) {
      throw new Error(`Failed to burn work delivery NFT: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Calculate optimal Merkle tree configuration for expected work count
   */
  private calculateMerkleTreeConfig(expectedWorkCount: number): MerkleTreeConfig {
    let depth = 0;
    while (2 ** depth < expectedWorkCount) {
      depth++;
    }

    // Find appropriate depth-size pair
    const depthSizePair = ALL_DEPTH_SIZE_PAIRS.find(pair => pair.maxDepth >= depth) 
      || ALL_DEPTH_SIZE_PAIRS[0];

    const canopyDepth = Math.min(depth - 3, 17); // Optimize for composability

    const capacity = 2 ** depthSizePair.maxDepth;
    const requiredSpace = getConcurrentMerkleTreeAccountSize(
      depthSizePair.maxDepth,
      depthSizePair.maxBufferSize,
      canopyDepth
    );
    
    // Approximate storage cost (would need actual rent calculation)
    const storageCost = requiredSpace * 0.00000348; // SOL per byte approximation

    return {
      maxDepth: depthSizePair.maxDepth,
      maxBufferSize: depthSizePair.maxBufferSize,
      canopyDepth,
      capacity,
      storageCost
    };
  }

  /**
   * Generate metadata for work delivery NFT
   */
  private generateWorkMetadata(
    workOutput: WorkOutput,
    collectionMint?: Address
  ): MetadataArgsArgs {
    const attributes = [
      { trait_type: 'Type', value: 'Work Delivery' },
      { trait_type: 'Project ID', value: workOutput.projectId },
      { trait_type: 'Provider', value: workOutput.provider },
      { trait_type: 'Client', value: workOutput.client },
      { trait_type: 'Deliverable Count', value: workOutput.deliverables.length.toString() },
      { trait_type: 'Completed Date', value: workOutput.completedAt.toISOString() },
      ...workOutput.deliverables.map((deliverable, index) => ({
        trait_type: `Deliverable ${index + 1}`,
        value: `${deliverable.name} (${deliverable.type})`
      }))
    ];

    return {
      name: `Work Delivery: ${workOutput.title}`,
      symbol: 'WORK',
      uri: this.generateMetadataUri(workOutput),
      sellerFeeBasisPoints: 0, // No royalties for work deliveries
      collection: collectionMint ? { key: collectionMint as UmiPublicKey, verified: false } : undefined,
      creators: [
        {
          address: workOutput.provider as UmiPublicKey,
          verified: false,
          share: 100
        }
      ],
      editionNonce: undefined,
      tokenProgramVersion: 'Original' as const,
      tokenStandard: 'NonFungible' as const,
      uses: undefined,
      isMutable: false, // Work deliveries should be immutable
      primarySaleHappened: true
    };
  }

  /**
   * Generate metadata URI for work output
   */
  private generateMetadataUri(workOutput: WorkOutput): string {
    // This would upload metadata to IPFS or other storage
    // For now, return a placeholder
    const metadataHash = workOutput.deliverables
      .map(d => d.checksum)
      .join('');
    
    return `https://ipfs.io/ipfs/QmWork${metadataHash.slice(0, 40)}`;
  }
} 