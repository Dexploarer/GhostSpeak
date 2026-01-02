/**
 * Type definitions for GhostSpeak solana-agent-kit plugin
 */

import type { Address } from '@solana/addresses';

/**
 * Ghost identity data for an agent
 */
export interface GhostIdentity {
  ghostAddress: Address;
  name: string;
  description: string;
  owner: string | null;
  status: string;
  ghostScore: number;
  reputationScore: number;
  externalIdentifiers: Array<{
    platform: string;
    externalId: string;
    verified: boolean;
  }>;
  didAddress: string | null;
  isVerified: boolean;
}

/**
 * Ghost registration parameters
 */
export interface RegisterGhostParams {
  name: string;
  description: string;
  capabilities?: string[];
  serviceEndpoint?: string;
  metadata?: Record<string, unknown>;
}

/**
 * External ID mapping parameters
 */
export interface MapExternalIdParams {
  platform: string;
  externalId: string;
}

/**
 * DID creation parameters
 */
export interface CreateDidParams {
  services?: Array<{
    id: string;
    type: string;
    serviceEndpoint: string;
  }>;
}

/**
 * Ghost verification result
 */
export interface VerificationResult {
  isVerified: boolean;
  ghostScore: number;
  reputationScore: number;
  verificationLevel: 'unverified' | 'basic' | 'verified' | 'elite';
  credentials: string[];
}

/**
 * Action result wrapper for solana-agent-kit
 */
export interface ActionResult<T = unknown> {
  status: 'success' | 'error';
  message?: string;
  result?: T;
  data?: T;
}

/**
 * Plugin configuration
 */
export interface GhostPluginConfig {
  /** Solana cluster (defaults to devnet) */
  cluster?: 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet';

  /** Custom GhostSpeak API URL */
  apiUrl?: string;

  /** Enable verbose logging */
  verbose?: boolean;
}
