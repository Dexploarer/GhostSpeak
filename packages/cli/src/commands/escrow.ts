import { logger } from '../utils/logger.js';
import {
  getRpc,
  getProgramId,
  getCommitment,
  getKeypair,
  getGhostspeakSdk,
} from '../context-helpers';

export async function depositEscrow(
  channel: string,
  amount: number
): Promise<void> {
  try {
    const sdk = await getGhostspeakSdk();
    const rpc = await getRpc();
    const programId = getProgramId('escrow');
    const commitment = await getCommitment();
    const signer = await getKeypair();
    const escrowService = new sdk.EscrowService(rpc, programId, commitment);
    const result = await escrowService.deposit(signer, channel, amount);
    logger.escrow.info('✅ Escrow deposit:', result);
  } catch (error) {
    logger.escrow.error('❌ Failed to deposit escrow:', error);
  }
}
