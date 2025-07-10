/**
 * GhostSpeak Protocol SDK - Minimal Bundle (<50KB)
 *
 * This is the ultra-lightweight version that includes only core functionality
 * for bundle-size-critical applications.
 */

// ===== ESSENTIAL TYPES ONLY =====
export type { Address } from '@solana/addresses';
export type { Commitment } from '@solana/rpc-types';
export type { Rpc, SolanaRpcApi } from '@solana/rpc';
export type { KeyPairSigner } from '@solana/signers';

// ===== CORE CLIENT (Minimal) =====
export { createMinimalClient } from './client-minimal';
export type { IMinimalClientConfig } from './client-minimal';

// ===== ESSENTIAL CONSTANTS =====
export const PODAI_PROGRAM_ID =
  '4ufTpHynyoWzSL3d2EL4PU1hSra1tKvQrQiBwJ82x385' as const;
export const DEVNET_RPC = 'https://api.devnet.solana.com' as const;
export const VERSION = '2.0.4' as const;
export const SDK_NAME = 'ghostspeak-sdk-minimal' as const;

// ===== BASIC TYPES =====
export interface IAgent {
  readonly address: Address;
  readonly name: string;
  readonly capabilities: readonly string[];
}

export interface IChannel {
  readonly address: Address;
  readonly name: string;
  readonly participants: readonly Address[];
}

export interface IMessage {
  readonly id: string;
  readonly content: string;
  readonly sender: Address;
  readonly timestamp: number;
}

// ===== UTILITY FUNCTIONS =====
export const lamportsToSol = (lamports: bigint): number => {
  return Number(lamports) / 1_000_000_000;
};

export const solToLamports = (sol: number): bigint => {
  return BigInt(Math.round(sol * 1_000_000_000));
};
