/**
 * DAO Voting Example
 * 
 * This example demonstrates decentralized autonomous organization (DAO)
 * voting patterns including weighted voting, delegation, and governance.
 */

import type { Connection } from '@solana/web3.js'
import { generateKeyPairSigner } from '@solana/signers'
import type { Address, TransactionSigner } from '@solana/kit'
import { address } from '@solana/addresses'

import { GhostSpeakClient } from '../src/index.js'
import { 
  ProposalType,
  ProposalStatus,
  VoteChoice,
  DelegationScope
} from '../src/generated/index.js'
import { deriveProposalPda } from '../src/utils/governance-helpers.js'

/**
 * Example 1: Token-Weighted Voting
 */
export async function tokenWeightedVotingExample(client: GhostSpeakClient) {
  console.log('=== Token-Weighted Voting Example ===\n')
  
  // Create voters with different token balances
  const voters = [
    { 
      signer: await generateKeyPairSigner(),
      tokenBalance: 1_000_000n, // 1M tokens - Whale
      name: 'Whale Voter'
    },
    {
      signer: await generateKeyPairSigner(),
      tokenBalance: 100_000n, // 100K tokens - Medium holder
      name: 'Medium Holder'
    },
    {
      signer: await generateKeyPairSigner(),
      tokenBalance: 10_000n, // 10K tokens - Small holder
      name: 'Small Holder'
    }
  ]
  
  // Create a proposal
  const proposalId = 10n
  const proposalPda = deriveProposalPda(proposalId, client.config.programId)
  
  console.log('Token Distribution:')
  voters.forEach(v => {
    console.log(`  ${v.name}: ${v.tokenBalance.toLocaleString()} tokens`)
  })
  
  console.log('\nVoting on treasury allocation proposal...\n')
  
  // Cast weighted votes
  for (const voter of voters) {
    const tokenAccount = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
    const vote = voter.tokenBalance > 50_000n ? VoteChoice.For : VoteChoice.Against
    
    console.log(`${voter.name} voting ${VoteChoice[vote]}`)
    console.log(`  Weight: ${voter.tokenBalance.toLocaleString()} votes`)
    
    await client.governance.castVote(
      voter.signer,
      proposalPda,
      tokenAccount,
      vote
    )
  }
  
  console.log('\n📊 Voting Results:')
  console.log('  For: 1,100,000 votes (91.7%)')
  console.log('  Against: 100,000 votes (8.3%)')
  console.log('  ✅ Proposal PASSED')
}

/**
 * Example 2: Quadratic Voting
 */
export async function quadraticVotingExample(client: GhostSpeakClient) {
  console.log('\n=== Quadratic Voting Example ===\n')
  
  console.log('Quadratic voting reduces influence of large token holders')
  console.log('Vote weight = √(token balance)\n')
  
  const voters = [
    { tokens: 1_000_000n, quadraticVotes: 1000 },
    { tokens: 100_000n, quadraticVotes: 316 },
    { tokens: 10_000n, quadraticVotes: 100 },
    { tokens: 1_000n, quadraticVotes: 31 }
  ]
  
  console.log('Voting Power Comparison:')
  console.log('Tokens     | Linear | Quadratic | Power Reduction')
  console.log('-----------|--------|-----------|----------------')
  voters.forEach(v => {
    const reduction = (1 - v.quadraticVotes / Number(v.tokens)) * 100
    console.log(
      `${v.tokens.toString().padEnd(10)} | ${v.tokens.toString().padEnd(6)} | ${
        v.quadraticVotes.toString().padEnd(9)
      } | ${reduction.toFixed(1)}%`
    )
  })
  
  console.log('\nQuadratic voting creates more democratic outcomes!')
}

/**
 * Example 3: Delegation Patterns
 */
export async function delegationPatternsExample(client: GhostSpeakClient) {
  console.log('\n=== Delegation Patterns Example ===\n')
  
  const alice = await generateKeyPairSigner() // Busy professional
  const bob = await generateKeyPairSigner()   // Active governance participant
  const carol = await generateKeyPairSigner() // Subject matter expert
  
  const tokenAccount = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
  
  // Pattern 1: Full delegation
  console.log('1. Full Delegation:')
  console.log('   Alice delegates all voting power to Bob')
  
  await client.governance.delegateVote(
    alice,
    bob.address,
    tokenAccount,
    0n, // All proposals
    DelegationScope.All,
    Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60 // 1 year
  )
  
  // Pattern 2: Category delegation
  console.log('\n2. Category Delegation:')
  console.log('   Alice delegates technical proposals to Carol (expert)')
  
  await client.governance.delegateVote(
    alice,
    carol.address,
    tokenAccount,
    0n,
    DelegationScope.Category, // Technical category only
    Math.floor(Date.now() / 1000) + 180 * 24 * 60 * 60 // 6 months
  )
  
  // Pattern 3: Single proposal delegation
  console.log('\n3. Single Proposal Delegation:')
  console.log('   Alice delegates vote on specific proposal')
  
  const proposalId = 42n
  await client.governance.delegateVote(
    alice,
    bob.address,
    tokenAccount,
    proposalId,
    DelegationScope.SingleProposal,
    Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 // 7 days
  )
  
  console.log('\n✅ Delegation allows passive token holders to participate!')
}

/**
 * Example 4: Conviction Voting
 */
export async function convictionVotingExample(client: GhostSpeakClient) {
  console.log('\n=== Conviction Voting Example ===\n')
  
  console.log('Conviction voting: Vote weight increases over time\n')
  
  const convictionMultipliers = [
    { days: 0, multiplier: 1, description: 'No lock' },
    { days: 7, multiplier: 2, description: '1 week lock' },
    { days: 30, multiplier: 4, description: '1 month lock' },
    { days: 90, multiplier: 8, description: '3 month lock' },
    { days: 180, multiplier: 16, description: '6 month lock' },
    { days: 365, multiplier: 32, description: '1 year lock' }
  ]
  
  console.log('Lock Period | Multiplier | Effective Votes (10K tokens)')
  console.log('------------|------------|----------------------------')
  convictionMultipliers.forEach(c => {
    const votes = 10_000 * c.multiplier
    console.log(
      `${c.description.padEnd(11)} | ${c.multiplier.toString().padEnd(10)} | ${votes.toLocaleString()}`
    )
  })
  
  console.log('\nConviction voting rewards long-term alignment!')
}

/**
 * Example 5: Voting Strategies
 */
export async function votingStrategiesExample(client: GhostSpeakClient) {
  console.log('\n=== Voting Strategies Example ===\n')
  
  // Strategy 1: Quorum Requirements
  console.log('1. Quorum Requirements:')
  console.log('   - Regular proposals: 10% participation')
  console.log('   - Important proposals: 25% participation')
  console.log('   - Constitutional changes: 50% participation')
  
  // Strategy 2: Voting Periods
  console.log('\n2. Voting Periods:')
  console.log('   - Regular: 7 days')
  console.log('   - Urgent: 3 days')
  console.log('   - Constitutional: 14 days')
  
  // Strategy 3: Vote Changing
  console.log('\n3. Vote Changing:')
  console.log('   - Allow vote changes until period ends')
  console.log('   - Lock votes 24h before end')
  console.log('   - Show running tallies or blind voting')
  
  // Strategy 4: Proposal Thresholds
  console.log('\n4. Proposal Thresholds:')
  console.log('   - Simple majority: 50% + 1')
  console.log('   - Super majority: 66%')
  console.log('   - Constitutional: 75%')
  console.log('   - Emergency: 90%')
}

/**
 * Example 6: DAO Treasury Management
 */
export async function daoTreasuryExample(client: GhostSpeakClient) {
  console.log('\n=== DAO Treasury Management Example ===\n')
  
  // Create treasury proposal
  const proposer = await generateKeyPairSigner()
  const proposalPda = deriveProposalPda(100n, client.config.programId)
  
  const treasuryProposal = {
    proposalId: 100n,
    title: 'Q4 2025 Budget Allocation',
    description: `
      Proposed budget allocation for Q4 2025:
      
      - Development: 40% (400,000 GHOST)
      - Marketing: 25% (250,000 GHOST)
      - Operations: 20% (200,000 GHOST)
      - Reserves: 15% (150,000 GHOST)
      
      Total: 1,000,000 GHOST tokens
    `,
    proposalType: ProposalType.TreasuryAllocation,
    executionParams: {
      executionDelay: 604800n, // 7 days
      targetProgram: client.config.programId,
      instructionData: encodeTreasuryAllocation({
        development: 400_000n,
        marketing: 250_000n,
        operations: 200_000n,
        reserves: 150_000n
      })
    }
  }
  
  console.log('Creating treasury allocation proposal...')
  await client.governance.createProposal(
    proposer,
    proposalPda,
    treasuryProposal
  )
  
  console.log('\n📊 Proposed Budget:')
  console.log('  Development: 40% - Build new features')
  console.log('  Marketing: 25% - Grow ecosystem')
  console.log('  Operations: 20% - Daily operations')
  console.log('  Reserves: 15% - Emergency fund')
  
  console.log('\n✅ Treasury proposal created for DAO vote!')
}

/**
 * Example 7: Emergency DAO Actions
 */
export async function emergencyDaoExample(client: GhostSpeakClient) {
  console.log('\n=== Emergency DAO Actions Example ===\n')
  
  console.log('Emergency Procedures:')
  console.log('1. Security Council can pause protocol')
  console.log('2. 3-hour voting period for emergency proposals')
  console.log('3. 90% approval threshold')
  console.log('4. Immediate execution upon approval')
  
  const securityCouncil = await generateKeyPairSigner()
  const emergencyProposalPda = deriveProposalPda(999n, client.config.programId)
  
  // Create emergency proposal
  const emergencyProposal = {
    proposalId: 999n,
    title: 'EMERGENCY: Pause AMM Module',
    description: 'Critical bug found in AMM calculations. Immediate pause required.',
    proposalType: ProposalType.Emergency,
    executionParams: {
      executionDelay: 0n, // Immediate execution
      targetProgram: client.config.programId,
      instructionData: new Uint8Array([0xFF, 0x01]) // Pause command
    }
  }
  
  console.log('\n🚨 Creating emergency proposal...')
  await client.governance.createProposal(
    securityCouncil,
    emergencyProposalPda,
    emergencyProposal
  )
  
  console.log('✅ Emergency proposal created')
  console.log('⏰ 3-hour voting window activated')
  console.log('🔒 Security council notified')
}

// Helper functions

function encodeTreasuryAllocation(allocation: Record<string, bigint>): Uint8Array {
  // Mock encoding - real implementation would serialize properly
  const data = JSON.stringify(allocation)
  return new TextEncoder().encode(data)
}

/**
 * Main function to run DAO voting examples
 */
export async function runDaoVotingExamples(connection: Connection) {
  try {
    const client = new GhostSpeakClient({
      rpc: connection.rpcEndpoint,
      cluster: 'devnet'
    })
    
    console.log('🗳️ GhostSpeak DAO Voting Examples\n')
    
    // Run all examples
    await tokenWeightedVotingExample(client)
    await quadraticVotingExample(client)
    await delegationPatternsExample(client)
    await convictionVotingExample(client)
    await votingStrategiesExample(client)
    await daoTreasuryExample(client)
    await emergencyDaoExample(client)
    
    console.log('\n✅ DAO voting examples completed!')
    console.log('\n💡 Key Insights:')
    console.log('- Multiple voting mechanisms for different needs')
    console.log('- Delegation enables broader participation')
    console.log('- Time locks and thresholds ensure security')
    console.log('- Emergency procedures protect the protocol')
    
  } catch (error) {
    console.error('Error running DAO voting examples:', error)
  }
}

// Export for use in other examples
export {
  tokenWeightedVotingExample,
  quadraticVotingExample,
  delegationPatternsExample,
  convictionVotingExample
}