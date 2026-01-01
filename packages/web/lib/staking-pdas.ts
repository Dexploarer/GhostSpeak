/**
 * Staking PDA Derivation Utilities
 *
 * Provides functions to derive Program Derived Addresses (PDAs) for the staking program.
 * PDAs are deterministic addresses derived from seeds and the program ID.
 */

import { address, type Address } from '@solana/addresses'
import { getProgramDerivedAddress } from '@solana/addresses'
import { getGhostMint } from './b2b-token-accounts'
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from '@solana-program/token'
import { GHOSTSPEAK_PROGRAM_ID } from '@ghostspeak/sdk/browser'
import bs58 from 'bs58'

/**
 * Derive the global staking config PDA
 *
 * Seeds: ["config"]
 */
export async function deriveStakingConfigPda(): Promise<Address> {
  const seeds = [new TextEncoder().encode('config')]

  const [pda] = await getProgramDerivedAddress({
    programAddress: GHOSTSPEAK_PROGRAM_ID,
    seeds,
  })

  return pda
}

/**
 * Derive the staking vault PDA (holds all staked GHOST tokens)
 *
 * Seeds: ["vault"]
 */
export async function deriveStakingVaultPda(): Promise<Address> {
  const seeds = [new TextEncoder().encode('vault')]

  const [pda] = await getProgramDerivedAddress({
    programAddress: GHOSTSPEAK_PROGRAM_ID,
    seeds,
  })

  return pda
}

/**
 * Derive the staking account PDA for a specific owner and agent
 *
 * Seeds: ["staking", owner_address, agent_address]
 */
export async function deriveStakingAccountPda(
  owner: Address,
  agent: Address
): Promise<Address> {
  // Convert Address (base58 strings) to bytes using bs58
  const ownerBytes = bs58.decode(owner)
  const agentBytes = bs58.decode(agent)

  const seeds = [new TextEncoder().encode('staking'), ownerBytes, agentBytes]

  const [pda] = await getProgramDerivedAddress({
    programAddress: GHOSTSPEAK_PROGRAM_ID,
    seeds,
  })

  return pda
}

/**
 * Derive the agent's GHOST token account (Associated Token Account)
 *
 * This is the agent owner's ATA for holding GHOST tokens.
 */
export async function deriveAgentTokenAccount(
  agentOwner: Address,
  network: 'mainnet' | 'devnet' = 'devnet'
): Promise<Address> {
  const ghostMint = getGhostMint(network)

  const [ata] = await findAssociatedTokenPda({
    mint: ghostMint,
    owner: agentOwner,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  })

  return ata
}

/**
 * Derive all PDAs needed for staking in one call
 *
 * Returns all PDAs needed to execute a stake transaction
 */
export async function deriveAllStakingPdas(
  agentOwner: Address,
  agentAddress: Address,
  network: 'mainnet' | 'devnet' = 'devnet'
): Promise<{
  stakingConfig: Address
  stakingVault: Address
  stakingAccount: Address
  agentTokenAccount: Address
}> {
  const [stakingConfig, stakingVault, stakingAccount, agentTokenAccount] = await Promise.all([
    deriveStakingConfigPda(),
    deriveStakingVaultPda(),
    deriveStakingAccountPda(agentOwner, agentAddress),
    deriveAgentTokenAccount(agentOwner, network),
  ])

  return {
    stakingConfig,
    stakingVault,
    stakingAccount,
    agentTokenAccount,
  }
}

/**
 * Derive PDAs needed for unstaking
 */
export async function deriveUnstakingPdas(
  agentOwner: Address,
  agentAddress: Address,
  network: 'mainnet' | 'devnet' = 'devnet'
): Promise<{
  stakingAccount: Address
  stakingVault: Address
  agentTokenAccount: Address
}> {
  const [stakingAccount, stakingVault, agentTokenAccount] = await Promise.all([
    deriveStakingAccountPda(agentOwner, agentAddress),
    deriveStakingVaultPda(),
    deriveAgentTokenAccount(agentOwner, network),
  ])

  return {
    stakingAccount,
    stakingVault,
    agentTokenAccount,
  }
}
