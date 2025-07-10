import { logger } from '../utils/logger.js';
import {
  getRpc,
  getProgramId,
  getCommitment,
  getKeypair,
  getGhostspeakSdk,
} from '../context-helpers';

export async function compressData(data: string): Promise<void> {
  try {
    const sdk = await getGhostspeakSdk();
    const rpc = await getRpc();
    const programId = getProgramId('compression');
    const commitment = await getCommitment();
    const signer = await getKeypair();
    const compressionService = new sdk.CompressionService(
      rpc,
      programId,
      commitment
    );
    const result = await compressionService.compress(signer, data);
    logger.compression.info('✅ Compressed data:', result);
  } catch (error) {
    logger.compression.error('❌ Failed to compress data:', error);
  }
}

/**
 * Decompress data using the real SDK CompressionService
 * @param data - Compressed data (Uint8Array)
 * @param options - Decompression options (must include originalSize)
 */
export async function decompressData(
  data: Uint8Array,
  options: { originalSize: number }
): Promise<void> {
  try {
    const rpc = await getRpc();
    const programId = getProgramId('compression');
    const commitment = await getCommitment();
    const compressionService = new sdk.CompressionService(
      rpc,
      programId,
      commitment
    );
    const result = compressionService.decompressData(
      data,
      options.originalSize
    );
    logger.compression.info('🗜️ Decompressed data:', result);
  } catch (error) {
    logger.compression.error('❌ Failed to decompress data:', error);
  }
}

// TODO: Add more compression operations as SDK expands
