import { ConfidentialTransferService } from '@podai/sdk';
import type { Address } from '@podai/sdk';
import { getRpc, getProgramId, getCommitment, getKeypair } from '../context-helpers';

/**
 * Execute a confidential transfer using the real SDK ConfidentialTransferService
 * @param options - Confidential transfer options (source, destination, amount, etc.)
 */
export async function confidentialTransfer(options: { source: Address, destination: Address, amount: bigint }): Promise<void> {
  try {
    const rpc = await getRpc();
    const programId = getProgramId('confidential-transfer');
    const commitment = await getCommitment();
    const signer = await getKeypair();
    const confidentialTransferService = new ConfidentialTransferService(rpc, programId, commitment);
    const signature = await confidentialTransferService.confidentialTransfer(
      signer,
      options.source,
      options.destination,
      options.amount
    );
    console.log('🔒 Confidential transfer complete. Signature:', signature);
  } catch (error) {
    console.error('❌ Failed to execute confidential transfer:', error);
  }
}

// TODO: Add more confidential transfer operations as SDK expands 