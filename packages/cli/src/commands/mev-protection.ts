import { MevProtectionService } from '@podai/sdk';
import type { Address } from '@podai/sdk';
import { getRpc, getProgramId, getCommitment, getKeypair } from '../context-helpers';

/**
 * Apply MEV protection to a transaction using the real SDK MevProtectionService
 * @param options - Transaction and protection config
 */
export async function protectTransaction(options: { transaction: any, config: any }): Promise<void> {
  try {
    const rpc = await getRpc();
    const programId = getProgramId('mev-protection');
    const commitment = await getCommitment();
    const signer = await getKeypair();
    const mevProtectionService = new MevProtectionService(rpc, programId, commitment);
    const result = await mevProtectionService.protectTransaction(options.transaction, signer, options.config);
    console.log('🛡️ MEV protection result:', result);
  } catch (error) {
    console.error('❌ Failed to apply MEV protection:', error);
  }
}

// TODO: Add more MEV protection operations as SDK expands 