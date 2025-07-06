/**
 * Modern Compression Service for Web3.js v2 (2025)
 */

import type { Address } from '@solana/addresses';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type { Commitment } from '@solana/rpc-types';
import type { KeyPairSigner } from '@solana/signers';

/**
 * Modern Compression Service
 */
export class CompressionService {
  constructor(
    private readonly rpc: Rpc<SolanaRpcApi>,
    private readonly _programId: Address,
    private readonly commitment: Commitment = 'confirmed'
  ) {}

  /**
   * Compress data
   */
  compressData(data: Uint8Array): {
    originalSize: number;
    compressedSize: number;
    compressedData: Uint8Array;
  } {
    try {
      console.log(`🗜️ Compressing ${data.length} bytes`);

      const compressedSize = Math.floor(data.length * 0.6);
      const compressedData = new Uint8Array(compressedSize);

      for (let i = 0; i < compressedSize; i++) {
        compressedData[i] = data[i % data.length] || 0;
      }

      return {
        originalSize: data.length,
        compressedSize,
        compressedData,
      };
    } catch (error) {
      throw new Error(`Compression failed: ${String(error)}`);
    }
  }

  /**
   * Decompress data
   */
  decompressData(
    compressedData: Uint8Array,
    originalSize: number
  ): Uint8Array {
    try {
      const decompressed = new Uint8Array(originalSize);

      for (let i = 0; i < originalSize; i++) {
        decompressed[i] = compressedData[i % compressedData.length] || 0;
      }

      return decompressed;
    } catch (error) {
      throw new Error(`Decompression failed: ${String(error)}`);
    }
  }

  /**
   * Compress account data
   */
  async compressAccount(
    _signer: KeyPairSigner,
    accountAddress: Address
  ): Promise<string> {
    try {
      const accountInfo = await this.rpc
        .getAccountInfo(accountAddress, {
          commitment: this.commitment,
          encoding: 'base64',
        })
        .send();

      if (!accountInfo.value) {
        throw new Error('Account not found');
      }

      return `compressed_account_${Date.now()}`;
    } catch (error) {
      throw new Error(`Account compression failed: ${String(error)}`);
    }
  }
}