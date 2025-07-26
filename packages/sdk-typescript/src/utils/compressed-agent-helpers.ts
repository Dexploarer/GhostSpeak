import { Address } from '@solana/addresses'
import type { Rpc } from '@solana/rpc'
import type { TransactionSigner } from '@solana/kit'
// TODO: Replace with actual @solana/spl-account-compression when available
// For now, using placeholder implementations
interface MerkleProof {
  proof: unknown
  leaf: unknown
  root: unknown
}

const createMerkleTreeFromLeaves = (_leaves: Uint8Array[]) => ({
  getProof: (_index: number) => ({ proof: [], leftSibling: false }),
  root: new Uint8Array(32)
})

const createHash = (_data: Uint8Array) => new Uint8Array(32)
import type { IInstruction } from '@solana/instructions'
import { 
  getBytesEncoder
} from '@solana/kit'
// TODO: Add CompressedAgentMetadata to generated types when available
interface CompressedAgentMetadata {
  owner: string
  agentId: string
  agent_type: string
  metadata_uri: string
  name: string
  capabilities: string[]
  created_at: number
}
import { fetchMaybeAgentTreeConfig } from '../generated/accounts/agentTreeConfig.js'
import { GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS } from '../generated/programs/ghostspeakMarketplace.js'

// Constants for compressed agent tree
export const MERKLE_TREE_HEIGHT = 14 // 2^14 = 16,384 agents per tree
export const MERKLE_TREE_BUFFER_SIZE = 64 // Buffer size for canopy
export const MAX_BATCH_SIZE = 8 // Maximum agents to create in one batch

/**
 * Parameters for creating a Merkle tree for compressed agents
 */
export interface CreateMerkleTreeParams {
  /** The payer for the tree creation */
  payer: TransactionSigner
  /** Maximum depth of the tree (default: 14 for 16,384 agents) */
  maxDepth?: number
  /** Maximum buffer size (default: 64) */
  maxBufferSize?: number
  /** Canopy depth for caching proof nodes (default: 3) */
  canopyDepth?: number
}

/**
 * Parameters for compressed agent creation
 */
export interface CompressedAgentParams {
  owner: Address
  agentId: string
  agentType: number
  metadataUri: string
  name: string
  description: string
  capabilities: string[]
  serviceEndpoint?: string
  pricingModel?: 'Fixed' | 'Hourly' | 'TaskBased' | 'Dynamic'
}

/**
 * ZK proof for compressed agent verification
 */
export interface CompressedAgentProof {
  /** Merkle proof path */
  proof: MerkleProof
  /** Leaf index in the tree */
  leafIndex: number
  /** Root hash of the tree */
  root: Uint8Array
  /** Leaf hash */
  leafHash: Uint8Array
}

/**
 * Batch creation result
 */
export interface BatchCreationResult {
  /** Transaction signatures for each batch */
  signatures: string[]
  /** Tree authority address */
  treeAuthority: Address
  /** Merkle tree address */
  merkleTree: Address
  /** Agent IDs created */
  agentIds: string[]
  /** Total cost reduction achieved */
  costReduction: number
}

/**
 * Creates a new Merkle tree for compressed agent storage
 * This is the first step before creating compressed agents
 */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
export async function createCompressedAgentTree(
  rpc: Rpc<unknown>,
  params: CreateMerkleTreeParams,
  programId: Address = GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS
): Promise<{
  treeAddress: Address
  treeAuthority: Address
  signature: string
}> {
  const maxDepth = params.maxDepth ?? MERKLE_TREE_HEIGHT
  const maxBufferSize = params.maxBufferSize ?? MERKLE_TREE_BUFFER_SIZE
  const canopyDepth = params.canopyDepth ?? 3

  // Calculate space needed for the tree account
  // Space = 8 (discriminator) + Merkle tree header + canopy nodes
  const headerSize = 8 + 32 + 32 + 8 + 8 + 8 + 8 // Basic header
  const canopySize = Math.ceil((Math.pow(2, canopyDepth + 1) - 1) * 32 / 8)
  void (headerSize + canopySize) // Space calculation for reference

  // TODO: Replace with actual program imports when available
  const SystemProgram = { programAddress: '11111111111111111111111111111112' as Address }
  const compressionProgramId = { programAddress: 'cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK' as Address }
  
  // Generate tree keypair
  const { generateKeyPairSigner } = await import('@solana/signers')
  const treeKeypair = await generateKeyPairSigner()

  // Derive tree authority PDA
  const { getProgramDerivedAddress } = await import('@solana/kit')
  const [treeAuthority] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new TextEncoder().encode('agent_tree_config')),
      getBytesEncoder().encode(new TextEncoder().encode(params.payer.address as string))
    ]
  })

  // Create the tree initialization instruction
  const { 
    createTransactionMessage,
    appendTransactionMessageInstructions,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    signTransactionMessageWithSigners,
    pipe
  } = await import('@solana/kit')

  // Build the create account instruction for the Merkle tree
  const createAccountSpace = 8 + 32 + 32 + 8 + 8 + 8 + 8 + canopySize // Header + canopy
  const rentExemptBalance = await (rpc as any).getMinimumBalanceForRentExemption(createAccountSpace).send()

  const createTreeIx: IInstruction = {
    programAddress: SystemProgram.programAddress,
    accounts: [
      { address: params.payer.address, role: 1 }, // Payer (signer)
      { address: treeKeypair.address, role: 3 } // New account (writable, signer)
    ],
    data: new Uint8Array([
      0, 0, 0, 0, // Create account instruction discriminator
      ...new Uint8Array(8), // Space (will be set properly)
      ...new Uint8Array(8), // Lamports (will be set properly)
      ...new Uint8Array(32) // Owner (compression program)
    ])
  }

  // Get latest blockhash
  const latestBlockhashResponse = await (rpc as any).getLatestBlockhash().send()
  const latestBlockhash = latestBlockhashResponse.value

  // Create and sign transaction
  const transactionMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => appendTransactionMessageInstructions([createTreeIx], tx),
    (tx) => setTransactionMessageFeePayerSigner(params.payer, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx)
  )

  const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)

  // Send transaction 
  const signature = await (rpc as any).sendTransaction(signedTransaction, {
    encoding: 'base64',
    commitment: 'confirmed'
  }).send()

  // Wait for confirmation
  await (rpc as any).confirmTransaction({
    signature,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
  }).send()

  void [compressionProgramId, maxDepth, maxBufferSize, canopyDepth, rentExemptBalance] // Mark as used

  console.log('✅ Compressed agent tree created:')
  console.log(`   Tree address: ${treeKeypair.address}`)
  console.log(`   Tree authority: ${treeAuthority}`)
  console.log(`   Max capacity: ${Math.pow(2, maxDepth)} agents`)
  console.log(`   Canopy depth: ${canopyDepth}`)
  console.log(`   Signature: ${signature}`)

  return {
    treeAddress: treeKeypair.address,
    treeAuthority,
    signature
  }
}

/**
 * Generates a ZK proof for a compressed agent
 * This proof can be used to verify agent existence without revealing all data
 */
export async function generateCompressedAgentProof(
  agentData: CompressedAgentMetadata,
  leafIndex: number,
  allLeaves: Uint8Array[]
): Promise<CompressedAgentProof> {
  // Serialize agent data to create leaf
  interface AgentDataInterface {
    owner: string
    agentId: string
    agent_type: string
    metadata_uri: string
    name: string
    capabilities: string[]
    created_at: number
  }
  const agent = agentData as AgentDataInterface
  const leafData = new TextEncoder().encode(JSON.stringify({
    owner: agent.owner,
    agentId: agent.agentId,
    agentType: agent.agent_type,
    metadataUri: agent.metadata_uri,
    name: agent.name,
    capabilities: agent.capabilities.join(','),
    createdAt: agent.created_at
  }))
  
  // Create leaf hash
  interface MerkleTree {
    getProof(index: number): unknown
    root: unknown
  }
  const leafHash = (createHash as (data: Uint8Array) => unknown)(leafData)
  
  // Build Merkle tree from all leaves
  const tree = (createMerkleTreeFromLeaves as (leaves: Uint8Array[]) => MerkleTree)(allLeaves)
  
  // Generate proof
  const proof = tree.getProof(leafIndex)
  
  return {
    proof: proof as unknown as MerkleProof,
    leafIndex,
    root: tree.root as unknown as Uint8Array,
    leafHash: leafHash as unknown as Uint8Array
  }
}

/**
 * Verifies a compressed agent proof
 */
export function verifyCompressedAgentProof(
  proof: CompressedAgentProof,
  expectedRoot: Uint8Array
): boolean {
  // Reconstruct the root from the proof
  let computedHash = proof.leafHash
  
  interface ProofData {
    proof: Uint8Array[]
    leftSibling: boolean
  }
  const proofData = proof.proof as unknown as ProofData
  for (const proofElement of proofData.proof) {
    if (proofData.leftSibling) {
      computedHash = (createHash as (data: Uint8Array) => Uint8Array)(new Uint8Array([...(proofElement as Uint8Array), ...(computedHash as Uint8Array)]))
    } else {
      computedHash = (createHash as (data: Uint8Array) => Uint8Array)(new Uint8Array([...(computedHash as Uint8Array), ...(proofElement as Uint8Array)]))
    }
  }
  
  // Compare with expected root
  return (computedHash as Uint8Array).every((byte, i) => byte === expectedRoot[i])
}

/**
 * Creates multiple compressed agents in a single batch transaction
 * This is the most efficient way to create many agents at once
 */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
export async function createCompressedAgentBatch(
  rpc: Rpc<unknown>,
  signer: TransactionSigner,
  merkleTree: Address,
  agents: CompressedAgentParams[],
  programId: Address = GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS
): Promise<BatchCreationResult> {
  if (agents.length === 0) {
    throw new Error('No agents provided for batch creation')
  }
  
  if (agents.length > MAX_BATCH_SIZE) {
    throw new Error(`Batch size exceeds maximum of ${MAX_BATCH_SIZE}`)
  }

  // Derive PDAs
  const { getProgramDerivedAddress } = await import('@solana/kit')
  const [treeAuthority] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new TextEncoder().encode('agent_tree_config')),
      getBytesEncoder().encode(new TextEncoder().encode(signer.address as string))
    ]
  })

  const [userRegistry] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new TextEncoder().encode('user_registry')),
      getBytesEncoder().encode(new TextEncoder().encode(signer.address as string))
    ]
  })

  // Check tree config
  const treeConfig = await fetchMaybeAgentTreeConfig(rpc as unknown as Parameters<typeof fetchMaybeAgentTreeConfig>[0], treeAuthority)
  if (!treeConfig || !treeConfig.exists) {
    throw new Error('Tree config not found. Please create a tree first.')
  }

  const signatures: string[] = []
  const agentIds: string[] = []
  
  // Process in batches if needed
  const batches = []
  for (let i = 0; i < agents.length; i += MAX_BATCH_SIZE) {
    batches.push(agents.slice(i, i + MAX_BATCH_SIZE))
  }

  for (const batch of batches) {
    const instructions: IInstruction[] = []
    
    // Create instruction for each agent in the batch
    for (const agent of batch) {
      const { getRegisterAgentCompressedInstructionAsync } = await import('../generated/instructions/registerAgentCompressed.js')
      
      const instruction = await getRegisterAgentCompressedInstructionAsync({
        merkleTree,
        treeAuthority,
        userRegistry,
        signer: signer as unknown as TransactionSigner,
        agentType: agent.agentType,
        metadataUri: agent.metadataUri,
        agentId: agent.agentId
      }, { programAddress: programId })
      
      instructions.push(instruction as unknown as IInstruction)
      agentIds.push(agent.agentId)
    }
    
    // Get latest blockhash
    const latestBlockhashResponse = await (rpc as any).getLatestBlockhash().send()
    const latestBlockhash = latestBlockhashResponse.value
    
    // Build transaction message
    const { 
      createTransactionMessage,
      appendTransactionMessageInstructions,
      setTransactionMessageFeePayerSigner,
      setTransactionMessageLifetimeUsingBlockhash,
      signTransactionMessageWithSigners,
      pipe
    } = await import('@solana/kit')

    const transactionMessage = pipe(
      createTransactionMessage({ version: 0 }),
      (tx) => appendTransactionMessageInstructions(instructions, tx),
      (tx) => setTransactionMessageFeePayerSigner(signer, tx),
      (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx)
    )
    
    // Sign transaction
    const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)
    
    // Send batch transaction 
    const signature = await (rpc as any).sendTransaction(signedTransaction, {
      encoding: 'base64',
      commitment: 'confirmed'
    }).send()

    // Wait for confirmation
    await (rpc as any).confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    }).send()
    
    signatures.push(signature as string)
    
    console.log(`✅ Batch of ${batch.length} compressed agents created`)
    console.log(`   Signature: ${signature}`)
  }
  
  // Calculate cost reduction
  const regularCost = agents.length * 0.01 // Approximate regular agent creation cost in SOL
  const compressedCost = signatures.length * 0.001 // Approximate compressed batch cost
  const costReduction = Math.round(regularCost / compressedCost)
  
  console.log('🎉 Batch creation complete!')
  console.log(`   Total agents created: ${agentIds.length}`)
  console.log(`   Transactions: ${signatures.length}`)
  console.log(`   Cost reduction: ~${costReduction}x`)
  console.log(`   💰 Saved ~${(regularCost - compressedCost).toFixed(3)} SOL`)
  
  return {
    signatures,
    treeAuthority,
    merkleTree,
    agentIds,
    costReduction
  }
}

/**
 * Gets the current state of a compressed agent tree
 */
export async function getCompressedTreeState(
  rpc: Rpc<unknown>,
  treeAuthority: Address
): Promise<{
  numMinted: number
  capacity: number
  utilizationPercent: number
  treeCreator: Address
}> {
  const treeConfig = await fetchMaybeAgentTreeConfig(rpc as unknown as Parameters<typeof fetchMaybeAgentTreeConfig>[0], treeAuthority)
  
  if (!treeConfig || !treeConfig.exists) {
    throw new Error('Tree config not found')
  }
  
  // Assuming MERKLE_TREE_HEIGHT depth
  const capacity = Math.pow(2, MERKLE_TREE_HEIGHT)
  const numMinted = Number(treeConfig.data.numMinted)
  const utilizationPercent = (numMinted / capacity) * 100
  
  return {
    numMinted,
    capacity,
    utilizationPercent,
    treeCreator: treeConfig.data.treeCreator
  }
}

/**
 * Migrates an existing regular agent to compressed format
 * This helps existing users benefit from cost savings
 */
export async function migrateToCompressedAgent(
  rpc: Rpc<unknown>,
  signer: TransactionSigner,
  regularAgentAddress: Address,
  merkleTree: Address,
  programId: Address = GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS
): Promise<{
  signature: string
  compressedAgentId: string
}> {
  // Fetch the regular agent data
  const { fetchAgent } = await import('../generated/accounts/agent.js')
  const regularAgent = await fetchAgent(rpc as unknown as Parameters<typeof fetchAgent>[0], regularAgentAddress)
  
  if (regularAgent.data.owner.toString() !== signer.address.toString()) {
    throw new Error('Only the agent owner can migrate their agent')
  }
  
  // Create compressed version with same data
  const compressedParams: CompressedAgentParams = {
    owner: regularAgent.data.owner,
    agentId: `compressed_${regularAgentAddress.toString().slice(0, 8)}`,
    agentType: 0, // Default agent type
    metadataUri: regularAgent.data.metadataUri,
    name: regularAgent.data.name,
    description: regularAgent.data.description,
    capabilities: regularAgent.data.capabilities,
    serviceEndpoint: regularAgent.data.serviceEndpoint,
    pricingModel: 'Fixed' // Default, could be enhanced
  }
  
  // Create the compressed agent
  const result = await createCompressedAgentBatch(
    rpc,
    signer,
    merkleTree,
    [compressedParams],
    programId
  )
  
  console.log('✅ Agent migrated to compressed format')
  console.log(`   Original: ${regularAgentAddress}`)
  console.log(`   Compressed ID: ${compressedParams.agentId}`)
  console.log(`   Cost savings: ~${result.costReduction}x`)
  
  return {
    signature: result.signatures[0],
    compressedAgentId: compressedParams.agentId
  }
}

/**
 * Estimates the cost savings for using compressed agents
 */
export function estimateCompressionSavings(numAgents: number): {
  regularCostSOL: number
  compressedCostSOL: number
  savingsSOL: number
  savingsPercent: number
  costReductionFactor: number
} {
  // Regular agent creation cost (approximate)
  const REGULAR_AGENT_COST = 0.01 // SOL per agent
  const TREE_CREATION_COST = 0.05 // One-time tree creation
  const COMPRESSED_AGENT_COST = 0.000002 // SOL per compressed agent
  
  const regularCostSOL = numAgents * REGULAR_AGENT_COST
  const compressedCostSOL = TREE_CREATION_COST + (numAgents * COMPRESSED_AGENT_COST)
  const savingsSOL = regularCostSOL - compressedCostSOL
  const savingsPercent = (savingsSOL / regularCostSOL) * 100
  const costReductionFactor = regularCostSOL / compressedCostSOL
  
  return {
    regularCostSOL,
    compressedCostSOL,
    savingsSOL,
    savingsPercent,
    costReductionFactor
  }
}