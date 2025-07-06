import { CompressionService } from '@podai/sdk';
import type { Address } from '@podai/sdk';
import { getRpc, getProgramId, getCommitment, getKeypair } from '../context-helpers';

/**
 * Compress data using the real SDK CompressionService
 * @param data - Data to compress (Uint8Array)
 * @param options - Compression options (optional)
 */
export async function compressData(data: Uint8Array, options?: any): Promise<void> {
  try {
    const rpc = await getRpc();
    const programId = getProgramId('compression');
    const commitment = await getCommitment();
    const compressionService = new CompressionService(rpc, programId, commitment);
    const result = compressionService.compressData(data);
    console.log('🗜️ Compressed data:', result);
  } catch (error) {
    console.error('❌ Failed to compress data:', error);
  }
}

/**
 * Decompress data using the real SDK CompressionService
 * @param data - Compressed data (Uint8Array)
 * @param options - Decompression options (must include originalSize)
 */
export async function decompressData(data: Uint8Array, options: { originalSize: number }): Promise<void> {
  try {
    const rpc = await getRpc();
    const programId = getProgramId('compression');
    const commitment = await getCommitment();
    const compressionService = new CompressionService(rpc, programId, commitment);
    const result = compressionService.decompressData(data, options.originalSize);
    console.log('🗜️ Decompressed data:', result);
  } catch (error) {
    console.error('❌ Failed to decompress data:', error);
  }
}

// TODO: Add more compression operations as SDK expands 