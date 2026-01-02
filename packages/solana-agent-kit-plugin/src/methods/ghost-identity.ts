/**
 * Ghost identity management methods for solana-agent-kit
 */

import type { SolanaAgentKit } from 'solana-agent-kit';
import { ExternalIdResolver } from '@ghostspeak/sdk';
import type { Address } from '@solana/addresses';
import type {
  GhostIdentity,
  RegisterGhostParams,
  MapExternalIdParams,
  VerificationResult,
  GhostPluginConfig,
} from '../types/index.js';
import { address } from '@solana/addresses';

/**
 * Get GhostSpeak API resolver from config
 */
function getResolver(config?: GhostPluginConfig): ExternalIdResolver {
  return new ExternalIdResolver({
    cluster: config?.cluster || 'devnet',
    apiUrl: config?.apiUrl,
  });
}

/**
 * Register a Ghost identity for this agent
 *
 * @param _agent - SolanaAgentKit instance (unused - for future on-chain registration)
 * @param _params - Registration parameters (unused - for future on-chain registration)
 */
export async function registerGhost(
  _agent: SolanaAgentKit,
  _params: RegisterGhostParams
): Promise<{ ghostAddress: Address; signature: string }> {
  // TODO: Implement using @ghostspeak/sdk after completing Phase 1.3
  // For now, return placeholder
  throw new Error('registerGhost not yet implemented - requires SDK instruction builders');
}

/**
 * Get Ghost identity for an agent address
 *
 * @param _agent - SolanaAgentKit instance (unused - API-based lookup)
 * @param ghostAddress - Agent's Ghost address
 * @param config - Plugin configuration
 */
export async function getGhostIdentity(
  _agent: SolanaAgentKit,
  ghostAddress: Address | string,
  config?: GhostPluginConfig
): Promise<GhostIdentity> {
  const resolver = getResolver(config);
  const ghost = await resolver.getGhost(ghostAddress);

  return {
    ghostAddress: address(ghost.address),
    name: ghost.name,
    description: ghost.description,
    owner: ghost.owner,
    status: ghost.status,
    ghostScore: ghost.ghostScore,
    reputationScore: ghost.reputationScore,
    externalIdentifiers: ghost.externalIdentifiers,
    didAddress: ghost.didAddress,
    isVerified: ghost.isVerified,
  };
}

/**
 * Resolve external ID to Ghost address
 *
 * @param _agent - SolanaAgentKit instance (unused - API-based lookup)
 * @param params - External ID mapping parameters
 * @param config - Plugin configuration
 */
export async function resolveExternalId(
  _agent: SolanaAgentKit,
  params: MapExternalIdParams,
  config?: GhostPluginConfig
): Promise<Address> {
  const resolver = getResolver(config);
  return await resolver.resolve(params.platform, params.externalId);
}

/**
 * Get Ghost Score for an agent
 *
 * @param _agent - SolanaAgentKit instance (unused - API-based lookup)
 * @param ghostAddress - Agent's Ghost address
 * @param config - Plugin configuration
 */
export async function getGhostScore(
  _agent: SolanaAgentKit,
  ghostAddress: Address | string,
  config?: GhostPluginConfig
): Promise<{
  score: number;
  maxScore: number;
  components: Array<{
    source: string;
    score: number;
    weight: number;
  }>;
}> {
  const resolver = getResolver(config);
  return await resolver.getGhostScore(ghostAddress);
}

/**
 * Verify Ghost identity and get verification result
 *
 * @param _agent - SolanaAgentKit instance (unused - API-based lookup)
 * @param ghostAddress - Agent's Ghost address
 * @param config - Plugin configuration
 */
export async function verifyGhost(
  _agent: SolanaAgentKit,
  ghostAddress: Address | string,
  config?: GhostPluginConfig
): Promise<VerificationResult> {
  const resolver = getResolver(config);
  const ghost = await resolver.getGhost(ghostAddress);
  const score = await resolver.getGhostScore(ghostAddress);

  // Determine verification level based on Ghost Score
  let verificationLevel: VerificationResult['verificationLevel'] = 'unverified';
  if (ghost.isVerified) {
    if (score.score >= 800) {
      verificationLevel = 'elite';
    } else if (score.score >= 500) {
      verificationLevel = 'verified';
    } else {
      verificationLevel = 'basic';
    }
  }

  return {
    isVerified: ghost.isVerified,
    ghostScore: score.score,
    reputationScore: ghost.reputationScore,
    verificationLevel,
    credentials: ghost.credentials,
  };
}

/**
 * Check if an external ID exists and is mapped to a Ghost
 *
 * @param _agent - SolanaAgentKit instance (unused - API-based lookup)
 * @param params - External ID mapping parameters
 * @param config - Plugin configuration
 */
export async function checkExternalIdExists(
  _agent: SolanaAgentKit,
  params: MapExternalIdParams,
  config?: GhostPluginConfig
): Promise<boolean> {
  const resolver = getResolver(config);
  return await resolver.exists(params.platform, params.externalId);
}

/**
 * Get all external IDs for a Ghost
 *
 * @param _agent - SolanaAgentKit instance (unused - API-based lookup)
 * @param ghostAddress - Agent's Ghost address
 * @param config - Plugin configuration
 */
export async function getExternalIds(
  _agent: SolanaAgentKit,
  ghostAddress: Address | string,
  config?: GhostPluginConfig
): Promise<Array<{
  platform: string;
  externalId: string;
  verified: boolean;
  verifiedAt: number;
}>> {
  const resolver = getResolver(config);
  return await resolver.getExternalIds(ghostAddress);
}
