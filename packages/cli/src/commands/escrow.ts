import { EscrowService } from '@podai/sdk';
import type { Address } from '@podai/sdk';
import { getRpc, getProgramId, getCommitment, getKeypair } from '../context-helpers';

/**
 * Create a new escrow using the real SDK EscrowService
 * @param options - Escrow creation options (beneficiary, amount, etc.)
 */
export async function createEscrow(options: any): Promise<void> {
  try {
    const rpc = await getRpc();
    const programId = getProgramId('escrow');
    const commitment = await getCommitment();
    const signer = await getKeypair();
    const escrowService = new EscrowService(rpc, programId, commitment);
    // For now, use createEscrow with mock data
    const beneficiary = options?.beneficiary || 'mock-beneficiary';
    const amount = options?.amount || 1_000_000n;
    const result = await escrowService.createEscrow(signer, beneficiary, amount);
    console.log('✅ Created escrow:', result);
  } catch (error) {
    console.error('❌ Failed to create escrow:', error);
  }
}

/**
 * Release an escrow using the real SDK EscrowService
 * @param escrowId - The ID of the escrow
 * @param options - Release options (signer, etc.)
 */
export async function releaseEscrow(escrowId: Address, options?: any): Promise<void> {
  try {
    const rpc = await getRpc();
    const programId = getProgramId('escrow');
    const commitment = await getCommitment();
    const signer = await getKeypair();
    const escrowService = new EscrowService(rpc, programId, commitment);
    // For now, use releaseFunds with mock data
    const signature = await escrowService.releaseFunds(signer, escrowId);
    console.log('✅ Released escrow. Signature:', signature);
  } catch (error) {
    console.error('❌ Failed to release escrow:', error);
  }
}

// TODO: Add more escrow operations as SDK expands 