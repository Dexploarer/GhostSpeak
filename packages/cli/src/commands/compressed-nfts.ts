import { CompressedNftService } from '@podai/sdk';
import type { Address, ICompressedNftConfig } from '@podai/sdk';
import { getRpc, getProgramId, getCommitment, getKeypair } from '../context-helpers';

/**
 * Create a compressed NFT using the real SDK CompressedNftService
 * @param options - Compressed NFT creation options (merkleTree, config)
 */
export async function createCompressedNft(options: { merkleTree: Address, config: ICompressedNftConfig }): Promise<void> {
  try {
    const rpc = await getRpc();
    const programId = getProgramId('compressed-nfts');
    const commitment = await getCommitment();
    const signer = await getKeypair();
    const compressedNftService = new CompressedNftService(rpc, programId, commitment);
    const result = await compressedNftService.createCompressedNft(signer, options.merkleTree, options.config);
    console.log('🌲 Compressed NFT created:', result);
  } catch (error) {
    console.error('❌ Failed to create compressed NFT:', error);
  }
}

// TODO: Add more compressed NFT operations as SDK expands 