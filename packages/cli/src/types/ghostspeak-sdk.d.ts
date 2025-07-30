/**
 * Type declarations for @ghostspeak/sdk
 * Temporary file until SDK build issues are resolved
 */

declare module '@ghostspeak/sdk' {
  import type { Address } from '@solana/addresses'
  import type { TransactionSigner } from '@solana/kit'
  
  // Constants
  export const GHOSTSPEAK_PROGRAM_ID: Address
  export const NATIVE_MINT_ADDRESS: Address
  
  // Main client
  export class LegacyGhostSpeakClient {
    constructor(config: ClientConfig)
    config: {
      rpc: RpcClient
      programId: Address
    }
    agent: AgentClient
    marketplace: MarketplaceClient
    escrow: EscrowClient
    auction: AuctionClient
    dispute: DisputeClient
    governance: GovernanceClient
    channel: ChannelClient
    workOrder: WorkOrderClient
    reputation: ReputationClient
    compliance: ComplianceClient
    analytics: AnalyticsClient
    bulkDeals: BulkDealsClient
    a2a: A2AClient
  }
  
  // Client configuration
  export interface ClientConfig {
    rpc: RpcClient
    programId: Address
    commitment?: string
  }
  
  // RPC Client types
  export interface RpcClient {
    getBalance(address: Address): Promise<{ value: bigint }>
    getAccountInfo(address: Address): Promise<AccountInfo | null>
    sendTransaction(transaction: any): Promise<string>
    confirmTransaction(signature: string, commitment?: string): Promise<void>
    getProgramAccounts(programId: Address, options?: any): { send(): Promise<ProgramAccount[]> }
    requestAirdrop(address: Address, lamports: bigint): { send(): Promise<string> }
  }
  
  export interface AccountInfo {
    data: Buffer
    executable: boolean
    lamports: bigint
    owner: Address
  }
  
  export interface ProgramAccount {
    pubkey: Address
    account: AccountInfo
  }
  
  // PDA derivation functions
  export function deriveAgentPda(programId: Address, owner: Address, agentId: string): Promise<Address>
  export function deriveServiceListingPda(programId: Address, owner: Address, listingId: string): Promise<Address>
  export function deriveUserRegistryPda(programId: Address, owner: Address): Promise<Address>
  export function deriveMultisigPda(programId: Address, creator: Address, multisigId: string): Promise<Address>
  export function deriveProposalPda(programId: Address, multisig: Address, proposalId: string): Promise<Address>
  export function deriveEscrowPda(programId: Address, creator: Address, escrowId: string): Promise<Address>
  
  // Utility functions
  export function generateUniqueId(prefix: string): string
  export function solToLamports(sol: string | number): bigint
  export function lamportsToSol(lamports: bigint): string
  export function getDefaultPaymentToken(): Address
  
  // Client interfaces
  export interface AgentClient {
    register(signer: TransactionSigner, params: RegisterAgentParams): Promise<TransactionResult>
    update(signer: TransactionSigner, params: UpdateAgentParams): Promise<TransactionResult>
    listByOwner(params: { owner: Address }): Promise<AgentWithAddress[]>
    getById(agentId: string): Promise<Agent | null>
    getAnalytics(agentAddress: Address): Promise<AgentAnalytics>
    verifyOwnership(agentId: string, owner: Address): Promise<boolean>
  }
  
  export interface MarketplaceClient {
    createServiceListing(signer: TransactionSigner, params: CreateServiceParams): Promise<TransactionResult>
    updateServiceListing(signer: TransactionSigner, params: UpdateServiceParams): Promise<TransactionResult>
    getServiceListings(): Promise<ServiceListingWithAddress[]>
    getServiceById(listingId: string): Promise<ServiceListing | null>
    purchase(signer: TransactionSigner, params: PurchaseParams): Promise<TransactionResult>
    createJob(signer: TransactionSigner, params: CreateJobParams): Promise<TransactionResult>
    listJobs(params?: ListJobsParams): Promise<JobPosting[]>
    applyToJob(signer: TransactionSigner, params: ApplyToJobParams): Promise<TransactionResult>
  }
  
  export interface EscrowClient {
    create(signer: TransactionSigner, params: CreateEscrowParams): Promise<TransactionResult>
    release(signer: TransactionSigner, escrowId: string): Promise<TransactionResult>
    cancel(signer: TransactionSigner, escrowId: string): Promise<TransactionResult>
    getById(escrowId: string): Promise<Escrow | null>
    listByUser(userAddress: Address): Promise<Escrow[]>
  }
  
  export interface AuctionClient {
    create(signer: TransactionSigner, params: CreateAuctionParams): Promise<TransactionResult>
    bid(signer: TransactionSigner, params: BidParams): Promise<TransactionResult>
    finalize(signer: TransactionSigner, auctionId: string): Promise<TransactionResult>
    cancel(signer: TransactionSigner, auctionId: string): Promise<TransactionResult>
    listActive(): Promise<Auction[]>
    getById(auctionId: string): Promise<Auction | null>
  }
  
  export interface DisputeClient {
    file(signer: TransactionSigner, params: FileDisputeParams): Promise<TransactionResult>
    submitEvidence(signer: TransactionSigner, params: SubmitEvidenceParams): Promise<TransactionResult>
    resolveDispute(signer: TransactionSigner, params: ResolveDisputeParams): Promise<TransactionResult>
    listDisputes(params?: ListDisputesParams): Promise<DisputeSummary[]>
    getActiveDisputes(userAddress: Address): Promise<DisputeSummary[]>
    getEvidenceHistory(disputeAddress: Address): Promise<Evidence[]>
  }
  
  export interface GovernanceClient {
    createMultisig(signer: TransactionSigner, params: CreateMultisigParams): Promise<TransactionResult>
    createProposal(signer: TransactionSigner, params: CreateProposalParams): Promise<TransactionResult>
    vote(signer: TransactionSigner, params: VoteParams): Promise<TransactionResult>
    executeProposal(signer: TransactionSigner, proposalId: string): Promise<TransactionResult>
    listMultisigs(): Promise<Multisig[]>
    listProposals(multisigAddress?: Address): Promise<Proposal[]>
  }
  
  export interface ChannelClient {
    create(signer: TransactionSigner, params: CreateChannelParams): Promise<TransactionResult>
    sendMessage(signer: TransactionSigner, channelId: Address, params: SendMessageParams): Promise<TransactionResult>
    listByParticipant(params: { participant: Address }): Promise<Channel[]>
    getMessages(channelId: Address): Promise<Message[]>
  }
  
  export interface WorkOrderClient {
    create(signer: TransactionSigner, params: CreateWorkOrderParams): Promise<TransactionResult>
    update(signer: TransactionSigner, params: UpdateWorkOrderParams): Promise<TransactionResult>
    complete(signer: TransactionSigner, workOrderId: string): Promise<TransactionResult>
    listByUser(userAddress: Address): Promise<WorkOrder[]>
  }
  
  export interface ReputationClient {
    getScore(agentAddress: Address): Promise<ReputationScore>
    getHistory(agentAddress: Address): Promise<ReputationHistory[]>
  }
  
  export interface ComplianceClient {
    verifyAgent(agentAddress: Address): Promise<ComplianceStatus>
    reportViolation(signer: TransactionSigner, params: ReportViolationParams): Promise<TransactionResult>
  }
  
  export interface AnalyticsClient {
    getMarketStats(): Promise<MarketStats>
    getAgentStats(agentAddress: Address): Promise<AgentStats>
  }
  
  export interface BulkDealsClient {
    createBulkDeal(signer: TransactionSigner, params: CreateBulkDealParams): Promise<TransactionResult>
    acceptBulkDeal(signer: TransactionSigner, dealId: string): Promise<TransactionResult>
  }
  
  export interface A2AClient {
    initiateConnection(signer: TransactionSigner, params: A2AConnectionParams): Promise<TransactionResult>
    acceptConnection(signer: TransactionSigner, connectionId: string): Promise<TransactionResult>
  }
  
  // Types
  export interface DisputeSummary {
    id: string
    dispute: Address
    escrowAddress: Address
    status: DisputeStatus
    claimant: string
    respondent: string
    severity: string
    createdAt: number
    reason: string
    evidenceCount: number
    workOrder?: string
    transaction?: string
    description?: string
  }
  
  export enum DisputeStatus {
    Open = 'open',
    UnderReview = 'under_review',
    Resolved = 'resolved',
    Escalated = 'escalated'
  }
  
  export interface Agent {
    id: string
    address: Address
    owner: Address
    name: string
    description: string
    capabilities: string[]
    isActive: boolean
    reputationScore: number
    createdAt: number
  }
  
  export interface ServiceListing {
    id: string
    address: Address
    agent: Address
    title: string
    description: string
    price: bigint
    isActive?: boolean
    paymentToken?: Address
    serviceType?: string
  }
  
  // Diagnostic functions
  export function diagnoseAccountFromChain(rpc: RpcClient, address: Address, options?: DiagnosticOptions): Promise<DiagnosticReport>
  export function diagnoseBatchFromChain(rpc: RpcClient, programIds: Address[], options?: BatchDiagnosticOptions): Promise<BatchDiagnosticReport>
  export function getMigrationInstructions(plan: MigrationPlan): string[]
  export function exportDiagnosticReport(report: DiagnosticReport | BatchDiagnosticReport, filename: string): Promise<void>
  
  export interface DiagnosticOptions {
    logToConsole?: boolean
  }
  
  export interface BatchDiagnosticOptions extends DiagnosticOptions {
    maxConcurrent?: number
  }
  
  export interface MigrationPlan {
    migrationType: string
    steps?: string[]
  }
  
  // Diagnostic types
  export interface DiagnosticReport {
    address: string
    accountExists: boolean
    discriminatorValidation: {
      isValid: boolean
      errorMessage?: string
    }
    migrationPlan: {
      migrationType: string
    }
    debugInfo?: {
      expectedDiscriminator: number[]
      actualDiscriminator?: number[]
      dataPreview: number[]
    }
    recommendations: string[]
  }
  
  export interface BatchDiagnosticReport {
    summary: {
      total: number
      valid: number
      invalid: number
      needsMigration: number
      notExists: number
    }
    globalRecommendations: string[]
    reports: DiagnosticReport[]
  }
  
  // Work order types
  export enum WorkOrderStatus {
    Open = 'open',
    InProgress = 'in_progress',
    Submitted = 'submitted',
    Completed = 'completed',
    Cancelled = 'cancelled',
    Disputed = 'disputed'
  }
  
  // Auction types
  export enum AuctionType {
    English = 'english',
    Dutch = 'dutch',
    Sealed = 'sealed'
  }
  
  // Job posting types
  export interface JobPosting {
    id: string
    address: Address
    title: string
    description: string
    budget: bigint
    deadline: number
    poster: Address
    category?: string
    applicationsCount?: number
    isActive?: boolean
  }
  
  // Service listing types
  export interface ServiceListingWithAddress {
    address: Address
    data: ServiceListing
  }
  
  // Parameter types
  export interface RegisterAgentParams {
    name: string
    description: string
    capabilities: string[]
    agentId?: string
  }
  
  export interface UpdateAgentParams {
    agentId: string
    name?: string
    description?: string
    capabilities?: string[]
    isActive?: boolean
  }
  
  export interface CreateServiceParams {
    agentAddress: Address
    title: string
    description: string
    price: bigint
    serviceType?: string
    paymentToken?: Address
  }
  
  export interface UpdateServiceParams {
    listingId: string
    title?: string
    description?: string
    price?: bigint
    isActive?: boolean
  }
  
  export interface PurchaseParams {
    listingId: string
    amount?: bigint
  }
  
  export interface CreateJobParams {
    title: string
    description: string
    budget: bigint
    deadline: number
    category?: string
  }
  
  export interface ListJobsParams {
    category?: string
    minBudget?: bigint
    maxBudget?: bigint
    isActive?: boolean
  }
  
  export interface ApplyToJobParams {
    jobId: string
    agentAddress: Address
    proposedPrice?: bigint
    message?: string
  }
  
  export interface CreateEscrowParams {
    provider: Address
    amount: bigint
    description?: string
    paymentToken?: Address
  }
  
  export interface CreateAuctionParams {
    item: string
    description: string
    startingPrice: bigint
    auctionType: AuctionType
    duration: number
    reservePrice?: bigint
  }
  
  export interface BidParams {
    auctionId: string
    amount: bigint
  }
  
  export interface FileDisputeParams {
    escrowAddress: Address
    reason: string
    severity: 'low' | 'medium' | 'high'
    description?: string
  }
  
  export interface SubmitEvidenceParams {
    disputeAddress: Address
    evidenceType: string
    evidenceData: string
    description?: string
  }
  
  export interface ResolveDisputeParams {
    dispute: Address
    resolution: string
    rulingInFavorOfComplainant: boolean
  }
  
  export interface ListDisputesParams {
    status?: string
    escrowAddress?: Address
  }
  
  export interface CreateMultisigParams {
    name: string
    signers: Address[]
    threshold: number
    multisigType: 'standard' | 'governance'
    multisigId: bigint
  }
  
  export interface CreateProposalParams {
    multisig: Address
    title: string
    description: string
    proposalType: string
    votingDuration: number
    proposalId: bigint
  }
  
  export interface VoteParams {
    proposal: Address
    vote: 'yes' | 'no' | 'abstain'
  }
  
  export interface CreateChannelParams {
    name: string
    description?: string
    visibility: 'public' | 'private'
    participants: Address[]
  }
  
  export interface SendMessageParams {
    channelId: string
    content: string
    messageType?: string
  }
  
  export interface CreateWorkOrderParams {
    title: string
    description: string
    requirements: string[]
    budget: bigint
    deadline: number
  }
  
  export interface UpdateWorkOrderParams {
    workOrderId: string
    status: WorkOrderStatus
    progress?: number
    notes?: string
  }
  
  export interface ReportViolationParams {
    agentAddress: Address
    violationType: string
    description: string
    evidence?: string
  }
  
  export interface CreateBulkDealParams {
    title: string
    description: string
    items: string[]
    totalPrice: bigint
    deadline: number
  }
  
  export interface A2AConnectionParams {
    targetAgent: Address
    connectionType: string
    message?: string
  }
  
  // Data structure types
  export interface AgentWithAddress {
    address: Address
    data: Agent
  }
  
  export interface AgentAnalytics {
    totalEarnings: bigint
    completedJobs: number
    activeJobs: number
    failedJobs: number
    successRate: number
    averageRating: number
    totalJobs: number
    responseTime: number
    disputes: number
    disputesWon: number
  }
  
  export interface Escrow {
    id: string
    address: Address
    client: Address
    provider: Address
    amount: bigint
    status: string
    createdAt: number
    description?: string
  }
  
  export interface Auction {
    id: string
    address: Address
    seller: Address
    item: string
    description: string
    currentBid: bigint
    highestBidder?: Address
    auctionType: AuctionType
    endTime: number
    status: string
  }
  
  export interface Evidence {
    id: string
    evidenceType: string
    evidenceData: string
    submitter: Address
    timestamp: number
    description?: string
  }
  
  export interface Multisig {
    address: Address
    name: string
    signers: Address[]
    threshold: number
    multisigType: string
    balance?: bigint
  }
  
  export interface Proposal {
    address: Address
    proposal: Address
    multisig: Address
    title: string
    description: string
    proposalType: string
    status: string
    votingEndsAt: number
    yesVotes: number
    noVotes: number
    abstainVotes: number
    totalVotes: number
    eligibleVoters?: number
  }
  
  export interface Channel {
    id: { toString(): string }
    channelId?: Address
    name: string
    creator?: Address
    participants?: Address[]
    channelType?: string
    visibility?: string
    isPrivate?: boolean
    messageCount?: number
    createdAt?: bigint
    lastActivity?: bigint
    isActive?: boolean
  }
  
  export interface Message {
    id: string
    sender: Address
    content: string
    timestamp: number
    messageType?: string
  }
  
  export interface WorkOrder {
    id: string
    address: Address
    client: Address
    provider?: Address
    title: string
    description: string
    requirements: string[]
    budget: bigint
    deadline: number
    status: WorkOrderStatus
    progress?: number
  }
  
  export interface ReputationScore {
    score: number
    totalJobs: number
    successRate: number
    averageRating: number
    badges: string[]
  }
  
  export interface ReputationHistory {
    timestamp: number
    action: string
    scoreChange: number
    newScore: number
  }
  
  export interface ComplianceStatus {
    isVerified: boolean
    verificationDate?: number
    violations: number
    status: 'active' | 'suspended' | 'banned'
  }
  
  export interface MarketStats {
    totalAgents: number
    activeAgents: number
    totalTransactions: number
    totalVolume: bigint
    averageTransactionSize: bigint
  }
  
  export interface AgentStats {
    totalEarnings: bigint
    completedJobs: number
    averageJobSize: bigint
    topCategories: string[]
    clientRetentionRate: number
  }
  
  // Transaction result type
  export interface TransactionResult {
    signature: string
    [key: string]: any
  }
  
  export type GhostSpeakError = Error
}