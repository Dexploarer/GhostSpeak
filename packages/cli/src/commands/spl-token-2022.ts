import { logger } from '../utils/logger.js';
import {
  getRpc,
  getCommitment,
  getKeypair,
  getGhostspeakSdk,
} from '../context-helpers';

import type {
  SplToken2022Config,
  TransferFeeConfig,
  InterestBearingConfig,
  NonTransferableConfig,
  TransferHookConfig,
  MetadataPointerConfig,
  ConfidentialTransferConfig,
  TransactionResult,
} from '../types';
import type { BN } from '@coral-xyz/anchor';
import type { PublicKey } from '@solana/web3.js';

/**
 * Token extension options
 */
export interface TokenExtensions {
  transferFee?: TransferFeeConfig;
  interestBearing?: InterestBearingConfig;
  nonTransferable?: boolean;
  permanentDelegate?: PublicKey;
  transferHook?: TransferHookConfig;
  metadataPointer?: MetadataPointerConfig;
  confidentialTransfer?: ConfidentialTransferConfig;
}

/**
 * Mint token options
 */
export interface MintTokenOptions {
  mintAuthority: string;
  decimals: number;
  extensions?: TokenExtensions;
  initialSupply?: BN;
  freezeAuthority?: string;
}

export async function mintToken(options: MintTokenOptions): Promise<void> {
  try {
    const sdk = await getGhostspeakSdk();
    const rpc = await getRpc();
    const commitment = await getCommitment();
    const signer = await getKeypair();
    const splToken2022Service = new sdk.SplToken2022Service(rpc, commitment);
    const result: TransactionResult = await splToken2022Service.mintToken(
      signer,
      options.mintAuthority,
      options.decimals,
      options.extensions
    );
    logger.cli.info('✅ Minted token:', result);
  } catch (error) {
    logger.cli.error('❌ Failed to mint token:', error);
  }
}

// TODO: Add more SPL Token 2022 operations as SDK expands
