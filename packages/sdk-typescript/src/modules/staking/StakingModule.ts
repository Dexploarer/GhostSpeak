import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import { BaseModule } from '../../core/BaseModule.js'
import {
  getStakeGhostInstructionAsync,
  getUnstakeGhostInstructionAsync,
  getInitializeStakingConfigInstructionAsync,
  type StakingAccount,
  type StakingConfig,
} from '../../generated/index.js'

export interface StakeParams {
  /** Agent address to stake for */
  agent: Address
  /** Agent's token account holding GHOST tokens */
  agentTokenAccount: Address
  /** Staking vault to receive tokens */
  stakingVault: Address
  /** Global staking config account */
  stakingConfig: Address
  /** Amount of GHOST tokens to stake (in lamports) */
  amount: bigint
  /** Lock duration in seconds */
  lockDuration: bigint
  /** The agent owner's transaction signer */
  agentOwner: TransactionSigner
}

export interface UnstakeParams {
  /** Staking account to unstake from */
  stakingAccount: Address
  /** Agent address */
  agent: Address
  /** Staking vault holding the tokens */
  stakingVault: Address
  /** Agent's token account to receive tokens */
  agentTokenAccount: Address
  /** The agent owner's transaction signer */
  agentOwner: TransactionSigner
}

export interface InitializeStakingConfigParams {
  /** Admin who can modify staking config */
  authority: TransactionSigner
  /** Minimum stake amount */
  minStake: bigint
  /** Treasury address to receive fees */
  treasury: Address
}

export class StakingModule extends BaseModule {
  /**
   * Initialize the global staking configuration (admin only)
   */
  async initializeStakingConfig(params: InitializeStakingConfigParams): Promise<string> {
    const instruction = await getInitializeStakingConfigInstructionAsync({
      authority: params.authority,
      minStake: params.minStake,
      treasury: params.treasury,
    }, { programAddress: this.programId })

    return this.execute('initializeStakingConfig', () => instruction, [params.authority])
  }

  /**
   * Stake GHOST tokens for an agent
   *
   * @param params - Staking parameters
   * @returns Transaction signature
   */
  async stake(params: StakeParams): Promise<string> {
    const instruction = await getStakeGhostInstructionAsync({
      ownerTokenAccount: params.agentTokenAccount,
      stakingVault: params.stakingVault,
      stakingConfig: params.stakingConfig,
      owner: params.agentOwner,
      amount: params.amount,
      lockDuration: params.lockDuration,
    }, { programAddress: this.programId })

    return this.execute('stakeGhost', () => instruction, [params.agentOwner])
  }

  /**
   * Unstake GHOST tokens from an agent
   *
   * @param params - Unstaking parameters
   * @returns Transaction signature
   */
  async unstake(params: UnstakeParams): Promise<string> {
    const instruction = await getUnstakeGhostInstructionAsync({
      stakingAccount: params.stakingAccount,
      stakingVault: params.stakingVault,
      ownerTokenAccount: params.agentTokenAccount,
      owner: params.agentOwner,
    }, { programAddress: this.programId })

    return this.execute('unstakeGhost', () => instruction, [params.agentOwner])
  }

  /**
   * Get staking account for an agent
   *
   * @param stakingAccountAddress - The staking account address
   * @returns Staking account data or null if not found
   */
  async getStakingAccount(stakingAccountAddress: Address): Promise<StakingAccount | null> {
    try {
      return await this.getAccount<StakingAccount>(stakingAccountAddress, 'fetchStakingAccount')
    } catch (error) {
      console.error('Error fetching staking account:', error)
      return null
    }
  }

  /**
   * Get the global staking configuration
   *
   * @param stakingConfigAddress - The staking config account address
   * @returns Staking config data or null if not initialized
   */
  async getStakingConfig(stakingConfigAddress: Address): Promise<StakingConfig | null> {
    try {
      return await this.getAccount<StakingConfig>(stakingConfigAddress, 'fetchStakingConfig')
    } catch (error) {
      console.error('Error fetching staking config:', error)
      return null
    }
  }
}
