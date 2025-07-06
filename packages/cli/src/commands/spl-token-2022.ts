import { SplToken2022Service } from '@podai/sdk';
import type { Address, ITokenExtensions } from '@podai/sdk';
import { getRpc, getCommitment, getKeypair } from '../context-helpers';

/**
 * Mint a new SPL Token 2022 using the real SDK SplToken2022Service
 * @param options - Minting options (mintAuthority, decimals, extensions, etc.)
 */
export async function mintToken(options: { mintAuthority: Address, decimals: number, extensions?: ITokenExtensions }): Promise<void> {
  try {
    const rpc = await getRpc();
    const commitment = await getCommitment();
    const payer = await getKeypair();
    const splToken2022Service = new SplToken2022Service(rpc, commitment);
    const result = splToken2022Service.createMint(
      payer,
      options.mintAuthority,
      null,
      options.decimals,
      options.extensions
    );
    console.log('🪙 SPL Token 2022 mint created:', result);
  } catch (error) {
    console.error('❌ Failed to mint SPL Token 2022:', error);
  }
}

// TODO: Add more SPL Token 2022 operations as SDK expands 