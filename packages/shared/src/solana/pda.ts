/**
 * Program Derived Address (PDA) utilities
 */

import { address, type Address, getProgramDerivedAddress } from '@solana/addresses';
import { getUtf8Codec } from '@solana/codecs-strings';

export const PROGRAM_ID = '4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB' as Address;
export const AGENT_SEED = 'agent';
export const EXTERNAL_ID_SEED = 'external_id';

/**
 * Derive Agent PDA address
 */
export async function deriveAgentAddress(owner: string, agentId: string): Promise<Address> {
  const utf8Codec = getUtf8Codec();

  const [pda] = await getProgramDerivedAddress({
    programAddress: PROGRAM_ID,
    seeds: [
      utf8Codec.encode(AGENT_SEED),
      address(owner),
      utf8Codec.encode(agentId),
    ],
  });

  return pda;
}

/**
 * Derive ExternalIdMapping PDA address
 */
export async function deriveExternalIdMappingAddress(
  platform: string,
  externalId: string
): Promise<Address> {
  const utf8Codec = getUtf8Codec();

  const [pda] = await getProgramDerivedAddress({
    programAddress: PROGRAM_ID,
    seeds: [
      utf8Codec.encode(EXTERNAL_ID_SEED),
      utf8Codec.encode(platform),
      utf8Codec.encode(externalId),
    ],
  });

  return pda;
}
