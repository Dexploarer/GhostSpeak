/**
 * Governance Workflows Example
 * 
 * This example demonstrates complete governance workflows including
 * multi-sig management, proposal creation, voting, and execution.
 */

import type { Rpc } from '@solana/kit'
import { generateKeyPairSigner } from '@solana/signers'
import type { Address, TransactionSigner } from '@solana/kit'
import { address } from '@solana/addresses'

import { GhostSpeakClient } from '../src/index.js'
import { 
  ProposalType,
  ProposalStatus,
  VoteChoice,
  DelegationScope,
  type MultisigConfig,
  type ExecutionParams
} from '../src/generated/index.js'
import { deriveMultisigPda, deriveProposalPda } from '../src/utils/governance-helpers.js'

/**
 * Example 1: Create and Manage Multi-signature Wallet
 */
export async function createMultisigWalletExample(client: GhostSpeakClient) {
  console.log('=== Creating Multi-signature Wallet ===\n')
  
  // Generate signers
  const owner = await generateKeyPairSigner()
  const signer1 = await generateKeyPairSigner()
  const signer2 = await generateKeyPairSigner()
  const signer3 = await generateKeyPairSigner()
  
  // Derive multisig PDA
  const multisigId = 1n
  const multisigPda = deriveMultisigPda(multisigId, client.config.programId)
  
  // Create multisig with 2-of-3 threshold
  const multisigParams = {
    multisigId,
    threshold: 2, // Require 2 signatures
    signers: [signer1.address, signer2.address, signer3.address],
    config: {
      requireSequentialSigning: false, // Allow parallel signing
      allowOwnerOffCurve: false // Standard Ed25519 keys only
    } as MultisigConfig
  }
  
  console.log('Creating 2-of-3 multisig wallet...')
  console.log('Signers:', multisigParams.signers)
  console.log('Threshold:', multisigParams.threshold)
  
  const signature = await client.governance.createMultisig(
    owner,
    multisigPda,
    multisigParams
  )
  
  console.log('✅ Multisig created!')
  console.log('Signature:', signature)
  console.log('Multisig PDA:', multisigPda)
  
  return { multisigPda, owner, signers: [signer1, signer2, signer3] }
}

/**
 * Example 2: Create Governance Proposal
 */
export async function createProposalExample(
  client: GhostSpeakClient,
  proposer: TransactionSigner
) {
  console.log('\n=== Creating Governance Proposal ===\n')
  
  // Derive proposal PDA
  const proposalId = 1n
  const proposalPda = deriveProposalPda(proposalId, client.config.programId)
  
  // Create parameter change proposal
  const proposalParams = {
    proposalId,
    title: 'Increase Service Fee Cap',
    description: `
      This proposal increases the maximum service fee from 5% to 7% to better
      compensate high-quality AI agents and incentivize premium services.
      
      Current: 5% (500 basis points)
      Proposed: 7% (700 basis points)
      
      Rationale:
      - Premium AI services require higher compute costs
      - Competitive rates attract better service providers
      - Revenue sharing improves protocol sustainability
    `,
    proposalType: ProposalType.ParameterChange,
    executionParams: {
      executionDelay: 172800n, // 48 hour delay after approval
      targetProgram: client.config.programId,
      instructionData: encodeParameterUpdate('max_service_fee', 700)
    } as ExecutionParams
  }
  
  console.log('Creating proposal:')
  console.log('Title:', proposalParams.title)
  console.log('Type:', ProposalType[proposalParams.proposalType])
  console.log('Execution delay:', proposalParams.executionParams.executionDelay, 'seconds')
  
  const signature = await client.governance.createProposal(
    proposer,
    proposalPda,
    proposalParams
  )
  
  console.log('✅ Proposal created!')
  console.log('Signature:', signature)
  console.log('Proposal PDA:', proposalPda)
  
  return proposalPda
}

/**
 * Example 3: Voting on Proposals
 */
export async function votingExample(
  client: GhostSpeakClient,
  proposalPda: Address,
  voters: { signer: TransactionSigner; tokenAccount: Address; vote: VoteChoice }[]
) {
  console.log('\n=== Voting on Proposal ===\n')
  
  for (const voter of voters) {
    console.log(`\nVoter ${voter.signer.address} voting ${VoteChoice[voter.vote]}...`)
    
    const reasoning = getVoteReasoning(voter.vote)
    const signature = await client.governance.castVote(
      voter.signer,
      proposalPda,
      voter.tokenAccount,
      voter.vote,
      reasoning
    )
    
    console.log('✅ Vote cast!')
    console.log('Signature:', signature)
    if (reasoning) {
      console.log('Reasoning:', reasoning)
    }
  }
  
  // Tally votes after voting period
  console.log('\n📊 Tallying votes...')
  const tallyAuthority = voters[0].signer // First voter acts as tally authority
  const tallySignature = await client.governance.tallyVotes(
    tallyAuthority,
    proposalPda
  )
  
  console.log('✅ Votes tallied!')
  console.log('Signature:', tallySignature)
}

/**
 * Example 4: Vote Delegation
 */
export async function voteDelegationExample(
  client: GhostSpeakClient,
  delegator: TransactionSigner,
  delegate: Address,
  delegatorTokenAccount: Address
) {
  console.log('\n=== Vote Delegation Example ===\n')
  
  // Delegate for all proposals in a category
  const delegation1 = await client.governance.delegateVote(
    delegator,
    delegate,
    delegatorTokenAccount,
    0n, // 0 means all proposals
    DelegationScope.Category,
    Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 // 30 days
  )
  
  console.log('✅ Delegated votes for all proposals in category')
  console.log('Signature:', delegation1)
  console.log('Delegate:', delegate)
  console.log('Scope:', DelegationScope[DelegationScope.Category])
  
  // Delegate for a specific proposal
  const proposalId = 5n
  const delegation2 = await client.governance.delegateVote(
    delegator,
    delegate,
    delegatorTokenAccount,
    proposalId,
    DelegationScope.SingleProposal,
    Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 // 7 days
  )
  
  console.log('\n✅ Delegated votes for specific proposal')
  console.log('Signature:', delegation2)
  console.log('Proposal ID:', proposalId)
}

/**
 * Example 5: Execute Approved Proposal
 */
export async function executeProposalExample(
  client: GhostSpeakClient,
  executor: TransactionSigner,
  proposalPda: Address
) {
  console.log('\n=== Executing Approved Proposal ===\n')
  
  // In real scenario, would check proposal status first
  console.log('Checking proposal status...')
  const proposal = await client.governance.getProposal(proposalPda)
  
  if (!proposal) {
    console.log('❌ Proposal not found')
    return
  }
  
  // Mock status check (in real implementation)
  const isApproved = true // Would check actual status
  const delayPassed = true // Would check timestamp
  
  if (!isApproved) {
    console.log('❌ Proposal not approved yet')
    return
  }
  
  if (!delayPassed) {
    console.log('❌ Execution delay not passed yet')
    return
  }
  
  console.log('✅ Proposal ready for execution')
  console.log('Executing proposal instructions...')
  
  const signature = await client.governance.executeProposal(
    executor,
    proposalPda,
    client.config.programId
  )
  
  console.log('✅ Proposal executed!')
  console.log('Signature:', signature)
}

/**
 * Example 6: Complete Governance Workflow
 */
export async function completeGovernanceWorkflow(client: GhostSpeakClient) {
  console.log('\n=== Complete Governance Workflow ===\n')
  
  try {
    // Step 1: Create multisig treasury
    console.log('Step 1: Creating multisig treasury...')
    const { multisigPda, owner, signers } = await createMultisigWalletExample(client)
    
    // Step 2: Create proposal
    console.log('\nStep 2: Creating governance proposal...')
    const proposer = signers[0] // First signer creates proposal
    const proposalPda = await createProposalExample(client, proposer)
    
    // Step 3: Voting phase
    console.log('\nStep 3: Voting phase...')
    
    // Generate token accounts for voters (in real scenario, these would exist)
    const voters = await Promise.all(signers.map(async (signer) => ({
      signer,
      tokenAccount: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), // Mock
      vote: Math.random() > 0.3 ? VoteChoice.For : VoteChoice.Against // 70% approval rate
    })))
    
    await votingExample(client, proposalPda, voters)
    
    // Step 4: Execute proposal (after delay)
    console.log('\nStep 4: Waiting for execution delay...')
    console.log('(In production, would wait 48 hours)')
    
    // Mock delay passed
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    await executeProposalExample(client, proposer, proposalPda)
    
    console.log('\n🎉 Governance workflow completed successfully!')
    
  } catch (error) {
    console.error('❌ Governance workflow failed:', error)
    throw error
  }
}

/**
 * Example 7: Emergency Actions
 */
export async function emergencyActionsExample(
  client: GhostSpeakClient,
  emergencyCouncil: TransactionSigner[]
) {
  console.log('\n=== Emergency Actions Example ===\n')
  
  // Create emergency proposal with shortened timeline
  const emergencyProposal = {
    proposalId: 999n,
    title: 'EMERGENCY: Pause Protocol',
    description: 'Critical vulnerability discovered. Pause all operations immediately.',
    proposalType: ProposalType.Emergency,
    executionParams: {
      executionDelay: 3600n, // 1 hour only for emergency
      targetProgram: client.config.programId,
      instructionData: encodePauseInstruction()
    } as ExecutionParams
  }
  
  console.log('🚨 Creating emergency proposal...')
  const proposalPda = deriveProposalPda(
    emergencyProposal.proposalId,
    client.config.programId
  )
  
  const signature = await client.governance.createProposal(
    emergencyCouncil[0],
    proposalPda,
    emergencyProposal
  )
  
  console.log('✅ Emergency proposal created!')
  console.log('Fast-tracked execution in 1 hour')
  
  // Emergency council votes immediately
  console.log('\n🗳️ Emergency council voting...')
  for (const councilMember of emergencyCouncil) {
    await client.governance.castVote(
      councilMember,
      proposalPda,
      address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      VoteChoice.For,
      'Confirmed vulnerability. Approve emergency pause.'
    )
  }
  
  console.log('✅ Emergency proposal approved by council')
}

// Helper functions

function encodeParameterUpdate(param: string, value: number): Uint8Array {
  // Mock encoding - in real implementation would use proper serialization
  const encoder = new TextEncoder()
  const data = encoder.encode(`${param}:${value}`)
  return new Uint8Array([0x01, ...data]) // 0x01 = parameter update instruction
}

function encodePauseInstruction(): Uint8Array {
  // Mock pause instruction
  return new Uint8Array([0xFF, 0x00]) // 0xFF = emergency pause
}

function getVoteReasoning(vote: VoteChoice): string | undefined {
  const reasonings = {
    [VoteChoice.For]: 'This proposal will improve protocol efficiency and user experience.',
    [VoteChoice.Against]: 'The proposed changes may introduce unnecessary complexity.',
    [VoteChoice.Abstain]: 'Need more data before making an informed decision.'
  }
  
  return reasonings[vote]
}

/**
 * Main function to run governance examples
 */
export async function runGovernanceExamples(connection: Connection) {
  try {
    const client = new GhostSpeakClient({
      rpc: connection.rpcEndpoint,
      cluster: 'devnet'
    })
    
    console.log('🏛️ GhostSpeak Governance Examples\n')
    
    // Run complete workflow
    await completeGovernanceWorkflow(client)
    
    // Additional examples
    console.log('\n📝 Additional Governance Features:')
    console.log('- Multi-signature treasury management')
    console.log('- Proposal categories and filtering')
    console.log('- Weighted voting based on token holdings')
    console.log('- Time-locked execution for safety')
    console.log('- Emergency procedures for critical issues')
    console.log('- Vote delegation for passive participants')
    console.log('- On-chain proposal execution')
    
  } catch (error) {
    console.error('Error running governance examples:', error)
  }
}

// Export for use in other examples
export {
  createMultisigWalletExample as createMultisig,
  createProposalExample as createProposal,
  votingExample as demonstrateVoting,
  executeProposalExample as executeProposal
}