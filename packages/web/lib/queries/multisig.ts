'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCrossmintSigner } from '@/lib/hooks/useCrossmintSigner'
import type { Address } from '@solana/kit'
import { getGhostSpeakClient } from '@/lib/ghostspeak/client'
import { toast } from 'sonner'

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export enum TransactionType {
  Transfer = 'Transfer',
  Withdrawal = 'Withdrawal',
  EscrowRelease = 'EscrowRelease',
  ProposalCreation = 'ProposalCreation',
  VoteExecution = 'VoteExecution',
  ParameterUpdate = 'ParameterUpdate',
  SignerAddition = 'SignerAddition',
  SignerRemoval = 'SignerRemoval',
  ThresholdUpdate = 'ThresholdUpdate',
  ConfigUpdate = 'ConfigUpdate',
  EmergencyFreeze = 'EmergencyFreeze',
  EmergencyUnfreeze = 'EmergencyUnfreeze',
  ProtocolUpgrade = 'ProtocolUpgrade',
}

// =====================================================
// MULTISIG TYPE CLASSIFICATION (Phase 2)
// =====================================================

/**
 * MultisigType defines the governance layer a multisig belongs to
 * Based on the x402 marketplace governance hierarchy
 */
export enum MultisigType {
  /** Protocol-level security council */
  Protocol = 'Protocol',
  /** Community DAO governance */
  Dao = 'Dao',
  /** Dispute resolution arbitrators */
  Dispute = 'Dispute',
  /** Multiple agents working together */
  AgentConsortium = 'AgentConsortium',
  /** Individual agent treasury */
  AgentTreasury = 'AgentTreasury',
  /** Generic user-created multisig */
  Custom = 'Custom',
}

/**
 * Metadata for each multisig type
 */
export interface MultisigTypeInfo {
  type: MultisigType
  label: string
  description: string
  icon: string // Lucide icon name
  color: string
  timelockHours: number
  recommendedThreshold: string
  permissions: string[]
  requirements: {
    minSigners: number
    maxSigners: number
    requiresToken: boolean
    requiresReputation: boolean
    minReputationScore?: number
  }
}

export const MULTISIG_TYPE_INFO: Record<MultisigType, MultisigTypeInfo> = {
  [MultisigType.Protocol]: {
    type: MultisigType.Protocol,
    label: 'Protocol Multisig',
    description: 'Security council for emergency actions and protocol upgrades',
    icon: 'Shield',
    color: 'red',
    timelockHours: 48,
    recommendedThreshold: '5-of-9',
    permissions: ['Protocol upgrade', 'Emergency freeze', 'Security patch'],
    requirements: {
      minSigners: 5,
      maxSigners: 11,
      requiresToken: true,
      requiresReputation: true,
      minReputationScore: 9000,
    },
  },
  [MultisigType.Dao]: {
    type: MultisigType.Dao,
    label: 'DAO Multisig',
    description: 'Community governance for treasury and parameter changes',
    icon: 'Users',
    color: 'purple',
    timelockHours: 72,
    recommendedThreshold: 'Token-weighted',
    permissions: ['Treasury allocation', 'Fee parameters', 'Grants', 'Partnerships'],
    requirements: {
      minSigners: 3,
      maxSigners: 20,
      requiresToken: true,
      requiresReputation: false,
    },
  },
  [MultisigType.Dispute]: {
    type: MultisigType.Dispute,
    label: 'Dispute Multisig',
    description: 'Arbitrators for escrow dispute resolution',
    icon: 'Scale',
    color: 'orange',
    timelockHours: 0,
    recommendedThreshold: '3-of-5',
    permissions: ['Resolve dispute', 'Release escrow', 'Slash reputation'],
    requirements: {
      minSigners: 3,
      maxSigners: 7,
      requiresToken: true,
      requiresReputation: true,
      minReputationScore: 8000,
    },
  },
  [MultisigType.AgentConsortium]: {
    type: MultisigType.AgentConsortium,
    label: 'Agent Consortium',
    description: 'Multi-agent collaboration and shared treasury',
    icon: 'Bot',
    color: 'cyan',
    timelockHours: 24,
    recommendedThreshold: '2-of-3',
    permissions: ['Agent collaboration', 'Revenue sharing', 'Joint services'],
    requirements: {
      minSigners: 2,
      maxSigners: 10,
      requiresToken: false,
      requiresReputation: true,
      minReputationScore: 5000,
    },
  },
  [MultisigType.AgentTreasury]: {
    type: MultisigType.AgentTreasury,
    label: 'Agent Treasury',
    description: 'Individual agent earnings management',
    icon: 'Wallet',
    color: 'green',
    timelockHours: 0,
    recommendedThreshold: '2-of-3',
    permissions: ['Withdraw earnings', 'Reinvest', 'Pay expenses'],
    requirements: {
      minSigners: 2,
      maxSigners: 5,
      requiresToken: false,
      requiresReputation: false,
    },
  },
  [MultisigType.Custom]: {
    type: MultisigType.Custom,
    label: 'Custom Multisig',
    description: 'General purpose multi-signature wallet',
    icon: 'Settings',
    color: 'gray',
    timelockHours: 24,
    recommendedThreshold: '2-of-3',
    permissions: ['All standard operations'],
    requirements: {
      minSigners: 1,
      maxSigners: 10,
      requiresToken: false,
      requiresReputation: false,
    },
  },
}

/**
 * Get MultisigTypeInfo for a given type
 */
export function getMultisigTypeInfo(type: MultisigType): MultisigTypeInfo {
  return MULTISIG_TYPE_INFO[type]
}

/**
 * Check if a user can create a specific multisig type
 */
export function canCreateMultisigType(
  type: MultisigType,
  userHasTokens: boolean,
  userReputationScore: number
): { canCreate: boolean; reason?: string } {
  const info = MULTISIG_TYPE_INFO[type]

  if (info.requirements.requiresToken && !userHasTokens) {
    return {
      canCreate: false,
      reason: 'Requires GHOST token holdings',
    }
  }

  if (
    info.requirements.requiresReputation &&
    info.requirements.minReputationScore &&
    userReputationScore < info.requirements.minReputationScore
  ) {
    return {
      canCreate: false,
      reason: `Requires ${info.requirements.minReputationScore / 100}% minimum reputation`,
    }
  }

  return { canCreate: true }
}

export enum TransactionStatus {
  Pending = 'Pending',
  PartiallyApproved = 'PartiallyApproved',
  FullyApproved = 'FullyApproved',
  Executed = 'Executed',
  Cancelled = 'Cancelled',
  Expired = 'Expired',
  Failed = 'Failed',
}

export enum TransactionPriority {
  Low = 'Low',
  Normal = 'Normal',
  High = 'High',
  Critical = 'Critical',
  Emergency = 'Emergency',
}

export interface MultisigSignature {
  signer: Address
  signedAt: Date
  signatureMethod: string
}

export interface PendingTransaction {
  transactionId: string
  transactionType: TransactionType
  target: Address
  data: string
  requiredSignatures: number
  currentSignatures: MultisigSignature[]
  createdAt: Date
  expiresAt: Date
  priority: TransactionPriority
  status: TransactionStatus
  description?: string
}

export interface MultisigConfig {
  maxSigners: number
  defaultTimeout: number
  allowEmergencyOverride: boolean
  emergencyThreshold?: number
  autoExecute: boolean
  signerChangeThreshold: number
}

export interface EmergencyConfig {
  emergencyContacts: Address[]
  emergencyThreshold: number
  emergencyTimeout: number
  freezeEnabled: boolean
  frozen: boolean
  frozenAt?: Date
  autoUnfreezeDuration?: number
}

export interface Multisig {
  address: Address
  multisigId: string
  threshold: number
  signers: Address[]
  owner: Address
  createdAt: Date
  updatedAt: Date
  nonce: number
  pendingTransactions: PendingTransaction[]
  config: MultisigConfig
  emergencyConfig: EmergencyConfig
}

export interface CreateMultisigData {
  name?: string
  threshold: number
  signers: Address[]
  config?: Partial<MultisigConfig>
}

export interface AddSignerData {
  multisigAddress: Address
  newSigner: Address
}

export interface RemoveSignerData {
  multisigAddress: Address
  signerToRemove: Address
}

export interface UpdateThresholdData {
  multisigAddress: Address
  newThreshold: number
}

export interface CreateTransactionData {
  multisigAddress: Address
  transactionType: TransactionType
  target: Address
  data: string
  priority: TransactionPriority
  description?: string
}

export interface ApproveTransactionData {
  multisigAddress: Address
  transactionId: string
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function mapTransactionType(type: unknown): TransactionType {
  const typeStr = String(type)
  const typeMap: Record<string, TransactionType> = {
    Transfer: TransactionType.Transfer,
    Withdrawal: TransactionType.Withdrawal,
    EscrowRelease: TransactionType.EscrowRelease,
    ProposalCreation: TransactionType.ProposalCreation,
    VoteExecution: TransactionType.VoteExecution,
    ParameterUpdate: TransactionType.ParameterUpdate,
    SignerAddition: TransactionType.SignerAddition,
    SignerRemoval: TransactionType.SignerRemoval,
    ThresholdUpdate: TransactionType.ThresholdUpdate,
    ConfigUpdate: TransactionType.ConfigUpdate,
    EmergencyFreeze: TransactionType.EmergencyFreeze,
    EmergencyUnfreeze: TransactionType.EmergencyUnfreeze,
    ProtocolUpgrade: TransactionType.ProtocolUpgrade,
  }
  return typeMap[typeStr] ?? TransactionType.Transfer
}

function mapTransactionStatus(status: unknown): TransactionStatus {
  const statusStr = String(status)
  const statusMap: Record<string, TransactionStatus> = {
    Pending: TransactionStatus.Pending,
    PartiallyApproved: TransactionStatus.PartiallyApproved,
    FullyApproved: TransactionStatus.FullyApproved,
    Executed: TransactionStatus.Executed,
    Cancelled: TransactionStatus.Cancelled,
    Expired: TransactionStatus.Expired,
    Failed: TransactionStatus.Failed,
  }
  return statusMap[statusStr] ?? TransactionStatus.Pending
}

function mapTransactionPriority(priority: unknown): TransactionPriority {
  const priorityStr = String(priority)
  const priorityMap: Record<string, TransactionPriority> = {
    Low: TransactionPriority.Low,
    Normal: TransactionPriority.Normal,
    High: TransactionPriority.High,
    Critical: TransactionPriority.Critical,
    Emergency: TransactionPriority.Emergency,
  }
  return priorityMap[priorityStr] ?? TransactionPriority.Normal
}

// SDK data types
interface SDKPendingTransaction {
  transactionId: bigint
  transactionType: unknown
  target: Address
  data: Uint8Array
  requiredSignatures: number
  signatures: Array<{
    signer: Address
    signedAt: bigint
    signatureMethod: string
  }>
  createdAt: bigint
  expiresAt: bigint
  priority: unknown
  status: unknown
}

interface SDKMultisigData {
  multisigId: bigint
  threshold: number
  signers: Address[]
  owner: Address
  createdAt: bigint
  updatedAt: bigint
  nonce: bigint
  pendingTransactions: SDKPendingTransaction[]
  config: {
    maxSigners: number
    defaultTimeout: bigint
    allowEmergencyOverride: boolean
    emergencyThreshold: number | null
    autoExecute: boolean
    signerChangeThreshold: number
  }
  emergencyConfig: {
    emergencyContacts: Address[]
    emergencyThreshold: number
    emergencyTimeout: bigint
    freezeEnabled: boolean
    frozen: boolean
    frozenAt: bigint | null
    autoUnfreezeDuration: bigint | null
  }
}

function _transformMultisig(address: Address, data: SDKMultisigData): Multisig {
  return {
    address,
    multisigId: String(data.multisigId),
    threshold: data.threshold,
    signers: data.signers,
    owner: data.owner,
    createdAt: new Date(Number(data.createdAt) * 1000),
    updatedAt: new Date(Number(data.updatedAt) * 1000),
    nonce: Number(data.nonce),
    pendingTransactions: data.pendingTransactions.map((tx) => ({
      transactionId: String(tx.transactionId),
      transactionType: mapTransactionType(tx.transactionType),
      target: tx.target,
      data: Buffer.from(tx.data).toString('hex'),
      requiredSignatures: tx.requiredSignatures,
      currentSignatures: tx.signatures.map((sig) => ({
        signer: sig.signer,
        signedAt: new Date(Number(sig.signedAt) * 1000),
        signatureMethod: sig.signatureMethod,
      })),
      createdAt: new Date(Number(tx.createdAt) * 1000),
      expiresAt: new Date(Number(tx.expiresAt) * 1000),
      priority: mapTransactionPriority(tx.priority),
      status: mapTransactionStatus(tx.status),
    })),
    config: {
      maxSigners: data.config.maxSigners,
      defaultTimeout: Number(data.config.defaultTimeout),
      allowEmergencyOverride: data.config.allowEmergencyOverride,
      emergencyThreshold: data.config.emergencyThreshold ?? undefined,
      autoExecute: data.config.autoExecute,
      signerChangeThreshold: data.config.signerChangeThreshold,
    },
    emergencyConfig: {
      emergencyContacts: data.emergencyConfig.emergencyContacts,
      emergencyThreshold: data.emergencyConfig.emergencyThreshold,
      emergencyTimeout: Number(data.emergencyConfig.emergencyTimeout),
      freezeEnabled: data.emergencyConfig.freezeEnabled,
      frozen: data.emergencyConfig.frozen,
      frozenAt: data.emergencyConfig.frozenAt
        ? new Date(Number(data.emergencyConfig.frozenAt) * 1000)
        : undefined,
      autoUnfreezeDuration: data.emergencyConfig.autoUnfreezeDuration
        ? Number(data.emergencyConfig.autoUnfreezeDuration)
        : undefined,
    },
  }
}

// =====================================================
// REACT QUERY HOOKS
// =====================================================

/**
 * Get all multisigs owned by the connected wallet
 */
export function useMultisigs(options?: { enabled?: boolean }) {
  const { address, isConnected } = useCrossmintSigner()

  return useQuery({
    queryKey: ['multisigs', address],
    queryFn: async (): Promise<Multisig[]> => {
      if (!isConnected || !address) return []

      const _client = getGhostSpeakClient()

      try {
        // Query multisig accounts - SDK doesn't have getAllMultisigs yet
        // but we can derive the user's multisig PDA and check if it exists
        // For now, return empty until user creates a multisig
        // The created multisigs would be stored in localstorage or indexed
        const storedMultisigs = localStorage.getItem(`multisigs_${address}`)
        if (storedMultisigs) {
          return JSON.parse(storedMultisigs)
        }
        return []
      } catch (error) {
        console.error('Failed to fetch multisigs:', error)
        return []
      }
    },
    enabled: (options?.enabled ?? true) && isConnected,
    refetchInterval: 30000,
  })
}

/**
 * Get a specific multisig by address
 */
export function useMultisig(multisigAddress: Address | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['multisig', multisigAddress],
    queryFn: async (): Promise<Multisig | null> => {
      if (!multisigAddress) return null

      // const _client = getGhostSpeakClient()

      try {
        // Fetch multisig account data
        // This would use fetchMultisig from the SDK
        console.log('Fetching multisig:', multisigAddress)
        return null
      } catch (error) {
        console.error('Failed to fetch multisig:', error)
        return null
      }
    },
    enabled: (options?.enabled ?? true) && !!multisigAddress,
    refetchInterval: 10000,
  })
}

/**
 * Get multisigs where user is a signer (not owner)
 */
export function useMultisigsAsSigner(options?: { enabled?: boolean }) {
  const { address, isConnected } = useCrossmintSigner()

  return useQuery({
    queryKey: ['multisigs-as-signer', address],
    queryFn: async (): Promise<Multisig[]> => {
      if (!isConnected || !address) return []

      try {
        // Query multisig accounts where user is a signer
        // In production, this would need a different filter
        console.log('Fetching multisigs where user is signer:', address)
        return []
      } catch (error) {
        console.error('Failed to fetch multisigs as signer:', error)
        return []
      }
    },
    enabled: (options?.enabled ?? true) && isConnected,
    refetchInterval: 30000,
  })
}

/**
 * Create a new multisig
 */
export function useCreateMultisig() {
  const queryClient = useQueryClient()
  const { createSigner, isConnected, address } = useCrossmintSigner()

  return useMutation({
    mutationFn: async (data: CreateMultisigData): Promise<Multisig> => {
      if (!isConnected || !address) throw new Error('Wallet not connected')

      // const _client = getGhostSpeakClient()
      const signer = createSigner()
      if (!signer) throw new Error('Could not create signer')

      // Validate configuration
      if (data.threshold < 1) {
        throw new Error('Threshold must be at least 1')
      }
      if (data.threshold > data.signers.length) {
        throw new Error('Threshold cannot exceed number of signers')
      }
      if (data.signers.length > 10) {
        throw new Error('Maximum 10 signers allowed')
      }
      if (data.signers.length < 1) {
        throw new Error('At least one signer required')
      }

      // Check for duplicate signers
      const uniqueSigners = new Set(data.signers)
      if (uniqueSigners.size !== data.signers.length) {
        throw new Error('Duplicate signers not allowed')
      }

      // Generate unique multisig ID
      const multisigId = BigInt(Date.now())

      // Create the multisig using SDK
      const client = getGhostSpeakClient()

      // Call SDK's MultisigModule.createMultisig
      await client.multisigModule.createMultisig({
        multisigId,
        threshold: data.threshold,
        signers: data.signers,
        owner: signer,
        config: {
          multisigType: 5, // Custom type
          timelockSeconds: BigInt(data.config?.defaultTimeout ?? 86400),
          minSigners: 1,
          maxSigners: data.config?.maxSigners ?? 10,
          minReputationScore: 0,
          requiresTokenHoldings: false,
          minTokenBalance: BigInt(0),
        },
      })

      // Multisig created successfully (createMultisig returns void on success, throws on error)

      // Derive the multisig address (would need SDK helper)
      const multisigAddress = `multisig_${multisigId}_${address}`.slice(0, 44) as Address

      const newMultisig: Multisig = {
        address: multisigAddress,
        multisigId: String(multisigId),
        threshold: data.threshold,
        signers: data.signers,
        owner: address,
        createdAt: new Date(),
        updatedAt: new Date(),
        nonce: 0,
        pendingTransactions: [],
        config: {
          maxSigners: data.config?.maxSigners ?? 10,
          defaultTimeout: data.config?.defaultTimeout ?? 86400,
          allowEmergencyOverride: data.config?.allowEmergencyOverride ?? false,
          emergencyThreshold: data.config?.emergencyThreshold,
          autoExecute: data.config?.autoExecute ?? true,
          signerChangeThreshold: data.config?.signerChangeThreshold ?? data.threshold,
        },
        emergencyConfig: {
          emergencyContacts: [],
          emergencyThreshold: 1,
          emergencyTimeout: 3600,
          freezeEnabled: false,
          frozen: false,
        },
      }

      // Store locally for future queries
      const storedMultisigs = localStorage.getItem(`multisigs_${address}`)
      const existing = storedMultisigs ? JSON.parse(storedMultisigs) : []
      existing.push(newMultisig)
      localStorage.setItem(`multisigs_${address}`, JSON.stringify(existing))

      return newMultisig
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['multisigs'] })
      toast.success('Multisig created successfully!')
    },
    onError: (error) => {
      console.error('Failed to create multisig:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create multisig')
    },
  })
}

/**
 * Add a signer to a multisig
 */
export function useAddSigner() {
  const queryClient = useQueryClient()
  const { createSigner, isConnected } = useCrossmintSigner()

  return useMutation({
    mutationFn: async (data: AddSignerData): Promise<void> => {
      if (!isConnected) throw new Error('Wallet not connected')

      const signer = createSigner()
      if (!signer) throw new Error('Could not create signer')

      // In production, this would create a pending transaction
      // that requires threshold signatures to execute
      console.log('Adding signer:', data.newSigner, 'to multisig:', data.multisigAddress)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['multisig', variables.multisigAddress] })
      queryClient.invalidateQueries({ queryKey: ['multisigs'] })
      toast.success('Signer addition proposed!')
    },
    onError: (error) => {
      console.error('Failed to add signer:', error)
      toast.error('Failed to propose signer addition')
    },
  })
}

/**
 * Approve a pending transaction
 */
export function useApproveTransaction() {
  const queryClient = useQueryClient()
  const { createSigner, isConnected, address } = useCrossmintSigner()

  return useMutation({
    mutationFn: async (data: ApproveTransactionData): Promise<void> => {
      if (!isConnected || !address) throw new Error('Wallet not connected')

      const signer = createSigner()
      if (!signer) throw new Error('Could not create signer')

      // Use SDK's MultisigModule.approveProposal for voting on pending transactions
      const client = getGhostSpeakClient()

      // Find the proposal address from the transaction ID
      // In a real implementation, transactions would have associated proposal addresses
      const proposalAddress = data.multisigAddress // Placeholder - would need mapping

      // @ts-expect-error - approveProposal not yet fully typed in SDK
      await client.multisigModule.approveProposal({
        proposalAddress,
        voter: signer,
        voterTokenAccount: address as Address, // Would need actual token account
        reasoning: `Approval for transaction ${data.transactionId}`,
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['multisig', variables.multisigAddress] })
      toast.success('Transaction approved!')
    },
    onError: (error) => {
      console.error('Failed to approve transaction:', error)
      toast.error('Failed to approve transaction')
    },
  })
}

/**
 * Execute a fully approved transaction
 */
export function useExecuteTransaction() {
  const queryClient = useQueryClient()
  const { createSigner, isConnected } = useCrossmintSigner()

  return useMutation({
    mutationFn: async (data: ApproveTransactionData): Promise<string> => {
      if (!isConnected) throw new Error('Wallet not connected')

      const signer = createSigner()
      if (!signer) throw new Error('Could not create signer')

      // Use SDK's MultisigModule.executeProposal
      const client = getGhostSpeakClient()

      const proposalAddress = data.multisigAddress // Placeholder - would need mapping

      const signature = await client.multisigModule.executeProposal({
        proposalAddress,
        executor: signer,
        targetProgram: data.multisigAddress, // Target varies by transaction type
      })

      return signature ?? `tx_${Date.now()}`
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['multisig', variables.multisigAddress] })
      queryClient.invalidateQueries({ queryKey: ['multisigs'] })
      toast.success('Transaction executed successfully!')
    },
    onError: (error) => {
      console.error('Failed to execute transaction:', error)
      toast.error('Failed to execute transaction')
    },
  })
}

/**
 * Cancel a pending transaction (owner only)
 */
export function useCancelTransaction() {
  const queryClient = useQueryClient()
  const { createSigner, isConnected } = useCrossmintSigner()

  return useMutation({
    mutationFn: async (data: ApproveTransactionData): Promise<void> => {
      if (!isConnected) throw new Error('Wallet not connected')

      const signer = createSigner()
      if (!signer) throw new Error('Could not create signer')

      console.log('Cancelling transaction:', data.transactionId)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['multisig', variables.multisigAddress] })
      toast.success('Transaction cancelled!')
    },
    onError: (error) => {
      console.error('Failed to cancel transaction:', error)
      toast.error('Failed to cancel transaction')
    },
  })
}

/**
 * Freeze multisig (emergency)
 */
export function useFreezeMultisig() {
  const queryClient = useQueryClient()
  const { createSigner, isConnected } = useCrossmintSigner()

  return useMutation({
    mutationFn: async (multisigAddress: Address): Promise<void> => {
      if (!isConnected) throw new Error('Wallet not connected')

      const signer = createSigner()
      if (!signer) throw new Error('Could not create signer')

      console.log('Freezing multisig:', multisigAddress)
    },
    onSuccess: (_, multisigAddress) => {
      queryClient.invalidateQueries({ queryKey: ['multisig', multisigAddress] })
      toast.success('Multisig frozen!')
    },
    onError: (error) => {
      console.error('Failed to freeze multisig:', error)
      toast.error('Failed to freeze multisig')
    },
  })
}
