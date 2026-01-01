/**
 * Wallet/Signer Management for GhostSpeak Plugin
 *
 * Provides wallet and signer functionality for ElizaOS agents to:
 * - Register agents on-chain
 * - Issue verifiable credentials
 * - Sign transactions
 * - Manage keys securely
 */

import type { IAgentRuntime } from '@elizaos/core';
import { logger } from '@elizaos/core';
import { generateKeyPairSigner, createKeyPairSignerFromBytes } from '@solana/signers';
import type { KeyPairSigner } from '@solana/signers';
import { address } from '@solana/addresses';
import type { Address } from '@solana/addresses';
import bs58 from 'bs58';

/**
 * Wallet configuration for an agent
 */
export interface AgentWallet {
  publicKey: Address;
  privateKey?: Uint8Array; // Optional for security
  address: Address;
}

/**
 * Get agent signer from runtime or environment
 *
 * Priority order:
 * 1. runtime.wallet (if agent has wallet configured)
 * 2. AGENT_WALLET_PRIVATE_KEY environment variable
 * 3. Generate new keypair (dev mode only)
 *
 * @param runtime - ElizaOS agent runtime
 * @param allowGenerate - Whether to generate new keypair if none found (default: false)
 * @returns KeyPairSigner for signing transactions
 */
export async function getAgentSigner(
  runtime: IAgentRuntime,
  allowGenerate = false
): Promise<KeyPairSigner> {
  // Try to get wallet from runtime
  if ((runtime as any).wallet?.privateKey) {
    logger.debug('Using wallet from agent runtime');

    try {
      const privateKeyBytes = parsePrivateKey((runtime as any).wallet.privateKey);
      const signer = await createKeyPairSignerFromBytes(privateKeyBytes);

      logger.info({
        agentId: runtime.agentId,
        walletAddress: signer.address,
      }, 'Agent signer loaded from runtime wallet');

      return signer;
    } catch (error) {
      logger.error({ error }, 'Failed to load wallet from runtime');
      throw new Error('Invalid wallet in runtime');
    }
  }

  // Try to get from environment variable
  if (process.env.AGENT_WALLET_PRIVATE_KEY) {
    logger.debug('Using wallet from environment variable');

    try {
      const privateKeyBytes = parsePrivateKey(process.env.AGENT_WALLET_PRIVATE_KEY);
      const signer = await createKeyPairSignerFromBytes(privateKeyBytes);

      logger.info({
        agentId: runtime.agentId,
        walletAddress: signer.address,
      }, 'Agent signer loaded from environment');

      return signer;
    } catch (error) {
      logger.error({ error }, 'Failed to load wallet from environment');
      throw new Error('Invalid AGENT_WALLET_PRIVATE_KEY');
    }
  }

  // Generate new keypair (dev mode only)
  if (allowGenerate) {
    logger.warn({ agentId: runtime.agentId },
      'No wallet found, generating new keypair (DEV MODE ONLY)'
    );

    const signer = await generateKeyPairSigner();

    logger.info({
      agentId: runtime.agentId,
      walletAddress: signer.address,
    }, 'Generated new keypair for agent');

    return signer;
  }

  // No wallet found
  throw new Error(
    'No wallet configured for agent. Please set runtime.wallet or AGENT_WALLET_PRIVATE_KEY'
  );
}

/**
 * Parse private key from various formats
 *
 * Supports:
 * - Base58 string (most common)
 * - Hex string (0x prefix)
 * - Number array JSON string
 * - Uint8Array (passthrough)
 *
 * @param privateKey - Private key in any supported format
 * @returns Uint8Array of private key bytes
 */
function parsePrivateKey(privateKey: string | Uint8Array): Uint8Array {
  if (privateKey instanceof Uint8Array) {
    return privateKey;
  }

  const keyString = privateKey.trim();

  // Try base58 first (most common format)
  try {
    const bytes = bs58.decode(keyString);
    if (bytes.length === 64) {
      return bytes;
    }
  } catch {
    // Not base58, try other formats
  }

  // Try hex format (0x prefix)
  if (keyString.startsWith('0x')) {
    try {
      const hex = keyString.slice(2);
      const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
      if (bytes.length === 64) {
        return bytes;
      }
    } catch {
      // Not valid hex
    }
  }

  // Try JSON array format [1,2,3,...]
  if (keyString.startsWith('[')) {
    try {
      const numbers = JSON.parse(keyString);
      if (Array.isArray(numbers) && numbers.length === 64) {
        return new Uint8Array(numbers);
      }
    } catch {
      // Not valid JSON array
    }
  }

  throw new Error(
    'Invalid private key format. Expected base58, hex (0x...), or JSON array'
  );
}

/**
 * Validate that an agent has a wallet configured
 *
 * @param runtime - ElizaOS agent runtime
 * @returns true if wallet is configured
 */
export function hasWalletConfigured(runtime: IAgentRuntime): boolean {
  return !!(
    (runtime as any).wallet?.privateKey ||
    process.env.AGENT_WALLET_PRIVATE_KEY
  );
}

/**
 * Get agent's public address without loading full signer
 *
 * Useful for read-only operations that don't need signing
 *
 * @param runtime - ElizaOS agent runtime
 * @returns Agent's Solana address
 */
export async function getAgentAddress(runtime: IAgentRuntime): Promise<Address> {
  if ((runtime as any).wallet?.address) {
    return address((runtime as any).wallet.address);
  }

  if ((runtime as any).wallet?.publicKey) {
    return address((runtime as any).wallet.publicKey);
  }

  // Need to load signer to get address
  const signer = await getAgentSigner(runtime);
  return signer.address;
}

/**
 * Airdrop SOL to agent wallet (devnet only)
 *
 * Used for funding agent wallets for transaction fees
 *
 * @param runtime - ElizaOS agent runtime
 * @param amount - Amount of SOL to airdrop (default: 1 SOL)
 * @returns Transaction signature
 */
export async function airdropToAgent(
  runtime: IAgentRuntime,
  amount = 1_000_000_000 // 1 SOL in lamports
): Promise<string> {
  const cluster = process.env.SOLANA_CLUSTER || 'devnet';

  if (cluster !== 'devnet') {
    throw new Error('Airdrop only available on devnet');
  }

  const { createSolanaRpc } = await import('@solana/rpc');
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const rpc = createSolanaRpc(rpcUrl);

  const agentAddress = await getAgentAddress(runtime);

  logger.info({
    agentId: runtime.agentId,
    address: agentAddress,
    amount,
  }, 'Requesting SOL airdrop');

  const signature = await rpc.requestAirdrop(agentAddress, BigInt(amount)).send();

  logger.info({
    agentId: runtime.agentId,
    signature,
  }, 'Airdrop successful');

  return signature.toString();
}

/**
 * Get SOL balance for agent wallet
 *
 * @param runtime - ElizaOS agent runtime
 * @returns Balance in lamports
 */
export async function getAgentBalance(runtime: IAgentRuntime): Promise<bigint> {
  const { createSolanaRpc } = await import('@solana/rpc');
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const rpc = createSolanaRpc(rpcUrl);

  const agentAddress = await getAgentAddress(runtime);
  const balance = await rpc.getBalance(agentAddress).send();

  return balance.value;
}

/**
 * Format balance from lamports to SOL
 *
 * @param lamports - Balance in lamports
 * @returns Formatted SOL amount
 */
export function formatSolBalance(lamports: bigint): string {
  const sol = Number(lamports) / 1_000_000_000;
  return `${sol.toFixed(4)} SOL`;
}

/**
 * Ensure agent has minimum SOL balance for transactions
 *
 * Auto-airdrops on devnet if balance is below threshold
 *
 * @param runtime - ElizaOS agent runtime
 * @param minBalance - Minimum balance in lamports (default: 0.1 SOL)
 * @returns true if balance is sufficient
 */
export async function ensureFundedWallet(
  runtime: IAgentRuntime,
  minBalance = 100_000_000 // 0.1 SOL
): Promise<boolean> {
  const balance = await getAgentBalance(runtime);

  if (balance >= BigInt(minBalance)) {
    logger.debug({
      agentId: runtime.agentId,
      balance: formatSolBalance(balance),
    }, 'Agent wallet has sufficient balance');
    return true;
  }

  // Auto-airdrop on devnet
  const cluster = process.env.SOLANA_CLUSTER || 'devnet';
  if (cluster === 'devnet') {
    logger.warn({
      agentId: runtime.agentId,
      balance: formatSolBalance(balance),
      minBalance: formatSolBalance(BigInt(minBalance)),
    }, 'Agent wallet balance low, requesting airdrop');

    await airdropToAgent(runtime, 1_000_000_000); // 1 SOL
    return true;
  }

  // Mainnet - need manual funding
  logger.error({
    agentId: runtime.agentId,
    balance: formatSolBalance(balance),
    minBalance: formatSolBalance(BigInt(minBalance)),
  }, 'Agent wallet has insufficient balance (mainnet - requires manual funding)');

  return false;
}

/**
 * Export public key for sharing/display
 *
 * @param runtime - ElizaOS agent runtime
 * @returns Base58-encoded public key
 */
export async function exportPublicKey(runtime: IAgentRuntime): Promise<string> {
  const agentAddress = await getAgentAddress(runtime);
  return agentAddress.toString();
}
