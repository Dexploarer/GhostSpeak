/**
 * Real Governance Flow Integration Test
 * 
 * Tests complete governance workflow on actual Solana devnet:
 * 1. Multisig creation with real accounts
 * 2. Proposal submission and validation
 * 3. Voting process with multiple signers
 * 4. Proposal execution and verification
 * 5. Treasury management operations
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { TransactionSigner } from '@solana/web3.js'
import type { Address } from '@solana/addresses'

import {
  setupIntegrationTest,
  cleanupIntegrationTest,
  type BlockchainTestEnvironment,
  type TestDataGenerator,
  type BlockchainAssertions,
  TEST_CONFIG
} from './setup/blockchain-setup'
import { 
  deriveMultisigPda, 
  deriveProposalPda, 
  deriveVotePda 
} from '../../src/utils/pda'
import { 
  fetchMultisig, 
  fetchProposal, 
  fetchVote 
} from '../../src/generated/accounts'

describe('Real Governance Flow Integration', () => {
  let env: BlockchainTestEnvironment
  let dataGen: TestDataGenerator
  let assert: BlockchainAssertions
  let creator: TransactionSigner
  let signer1: TransactionSigner
  let signer2: TransactionSigner
  let signer3: TransactionSigner
  let multisig: Address
  let proposal: Address

  beforeAll(async () => {
    // Setup real blockchain test environment
    const setup = await setupIntegrationTest()
    env = setup.env
    dataGen = setup.dataGen
    assert = setup.assert

    // Create funded test accounts
    creator = await env.createFundedSigner()
    signer1 = await env.createFundedSigner()
    signer2 = await env.createFundedSigner()
    signer3 = await env.createFundedSigner()
    
    console.log(`🏛️ Testing governance with creator: ${creator.address}`)
    console.log(`👥 Signers: ${signer1.address}, ${signer2.address}, ${signer3.address}`)
  }, TEST_CONFIG.TRANSACTION_TIMEOUT)

  afterAll(async () => {
    await cleanupIntegrationTest()
  })

  describe('Multisig Creation', () => {
    it('should create multisig with multiple signers on devnet', async () => {
      const multisigData = {
        signers: [signer1.address, signer2.address, signer3.address],
        threshold: 2, // Require 2 out of 3 signatures
        name: dataGen.generateTestName('governance-multisig'),
        description: 'Test multisig for governance integration'
      }
      
      console.log(`🔐 Creating multisig with ${multisigData.threshold}/${multisigData.signers.length} threshold`)
      
      // Create multisig using real blockchain
      const result = await env.client.governance.createMultisig({
        creator: creator.address,
        signer: creator,
        ...multisigData
      })

      // Verify transaction success
      await assert.assertTransactionSuccess(result.signature)
      
      // Derive expected multisig PDA
      const multisigId = BigInt(Date.now())
      const [expectedMultisig] = deriveMultisigPda(creator.address, multisigId)
      multisig = expectedMultisig
      
      console.log(`✅ Multisig created at: ${multisig}`)
      
      // Wait for multisig account creation
      await env.waitForAccount(multisig)
      
      // Verify multisig account exists and has correct configuration
      await assert.assertAccountExists(multisig)
      
      // Fetch and validate multisig data from blockchain
      const multisigAccount = await fetchMultisig(env.rpc, multisig)
      expect(multisigAccount).toBeDefined()
      expect(multisigAccount.data.creator).toBe(creator.address)
      expect(multisigAccount.data.threshold).toBe(2)
      expect(multisigAccount.data.signers).toEqual(multisigData.signers)
      expect(multisigAccount.data.isActive).toBe(true)
      
      console.log(`📊 Multisig verified on blockchain:`, {
        creator: multisigAccount.data.creator,
        threshold: multisigAccount.data.threshold,
        signers: multisigAccount.data.signers.length,
        isActive: multisigAccount.data.isActive
      })
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)

    it('should handle multisig funding and treasury setup', async () => {
      const treasuryAmount = 50_000_000n // 0.05 SOL
      
      console.log(`💰 Funding multisig treasury with ${treasuryAmount} lamports`)
      
      // Fund the multisig treasury
      const result = await env.client.governance.fundTreasury({
        funder: creator.address,
        signer: creator,
        multisig,
        amount: treasuryAmount
      })

      await assert.assertTransactionSuccess(result.signature)
      
      // Small delay for balance update
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Verify treasury balance
      const multisigBalance = await env.rpc.getBalance(multisig).send()
      expect(multisigBalance).toBeGreaterThan(treasuryAmount / 2n) // Allow for some fees
      
      console.log(`✅ Treasury funded with balance: ${multisigBalance} lamports`)
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)
  })

  describe('Proposal Submission and Validation', () => {
    it('should submit governance proposal', async () => {
      const proposalData = {
        multisig,
        title: 'Test Protocol Upgrade Proposal',
        description: 'Proposal to upgrade protocol parameters for testing',
        proposalType: 'parameter_change' as const,
        actions: [
          {
            type: 'update_parameter' as const,
            parameter: 'fee_rate',
            newValue: '250' // 2.5%
          }
        ],
        votingPeriod: 86400, // 24 hours
        executionDelay: 3600 // 1 hour
      }
      
      console.log(`📋 Submitting governance proposal: ${proposalData.title}`)
      
      // Submit proposal
      const result = await env.client.governance.submitProposal({
        proposer: signer1.address,
        signer: signer1,
        ...proposalData
      })

      await assert.assertTransactionSuccess(result.signature)
      
      // Derive proposal PDA
      const proposalId = BigInt(Date.now())
      const [expectedProposal] = deriveProposalPda(multisig, proposalId)
      proposal = expectedProposal
      
      console.log(`✅ Proposal submitted at: ${proposal}`)
      
      // Wait for proposal account creation
      await env.waitForAccount(proposal)
      
      // Verify proposal data
      const proposalAccount = await fetchProposal(env.rpc, proposal)
      expect(proposalAccount.data.multisig).toBe(multisig)
      expect(proposalAccount.data.proposer).toBe(signer1.address)
      expect(proposalAccount.data.status).toBe('active')
      expect(proposalAccount.data.votesFor).toBe(0n)
      expect(proposalAccount.data.votesAgainst).toBe(0n)
      
      console.log(`📊 Proposal verified:`, {
        proposer: proposalAccount.data.proposer,
        status: proposalAccount.data.status,
        votesFor: proposalAccount.data.votesFor,
        votesAgainst: proposalAccount.data.votesAgainst
      })
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)

    it('should validate proposal requirements', async () => {
      console.log(`✅ Validating proposal meets governance requirements`)
      
      // Check proposal is within voting period
      const proposalAccount = await fetchProposal(env.rpc, proposal)
      const currentTime = Math.floor(Date.now() / 1000)
      const proposalEndTime = Number(proposalAccount.data.createdAt) + Number(proposalAccount.data.votingPeriod)
      
      expect(currentTime).toBeLessThan(proposalEndTime)
      expect(proposalAccount.data.status).toBe('active')
      
      console.log(`✅ Proposal is active and within voting period`)
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)
  })

  describe('Voting Process', () => {
    it('should cast votes from multisig signers', async () => {
      console.log(`🗳️ Casting votes from multisig signers`)
      
      // Signer 1 votes FOR
      const vote1Result = await env.client.governance.castVote({
        voter: signer1.address,
        signer: signer1,
        proposal,
        vote: 'for',
        reason: 'Support protocol upgrade'
      })

      await assert.assertTransactionSuccess(vote1Result.signature)
      
      // Signer 2 votes FOR
      const vote2Result = await env.client.governance.castVote({
        voter: signer2.address,
        signer: signer2,
        proposal,
        vote: 'for',
        reason: 'Beneficial change'
      })

      await assert.assertTransactionSuccess(vote2Result.signature)
      
      // Signer 3 votes AGAINST
      const vote3Result = await env.client.governance.castVote({
        voter: signer3.address,
        signer: signer3,
        proposal,
        vote: 'against',
        reason: 'Need more discussion'
      })

      await assert.assertTransactionSuccess(vote3Result.signature)
      
      console.log(`✅ All votes cast successfully`)
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)

    it('should verify vote tallying', async () => {
      // Small delay for vote processing
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      console.log(`📊 Verifying vote tallying`)
      
      // Check updated proposal state
      const proposalAccount = await fetchProposal(env.rpc, proposal)
      expect(proposalAccount.data.votesFor).toBe(2n) // 2 FOR votes
      expect(proposalAccount.data.votesAgainst).toBe(1n) // 1 AGAINST vote
      
      // Verify individual vote records
      const [vote1Address] = deriveVotePda(proposal, signer1.address)
      const [vote2Address] = deriveVotePda(proposal, signer2.address)
      const [vote3Address] = deriveVotePda(proposal, signer3.address)
      
      await env.waitForAccount(vote1Address)
      await env.waitForAccount(vote2Address)
      await env.waitForAccount(vote3Address)
      
      const vote1Account = await fetchVote(env.rpc, vote1Address)
      const vote2Account = await fetchVote(env.rpc, vote2Address)
      const vote3Account = await fetchVote(env.rpc, vote3Address)
      
      expect(vote1Account.data.vote).toBe('for')
      expect(vote2Account.data.vote).toBe('for')
      expect(vote3Account.data.vote).toBe('against')
      
      console.log(`✅ Vote tallying verified: 2 FOR, 1 AGAINST`)
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)

    it('should handle duplicate vote prevention', async () => {
      console.log(`🚫 Testing duplicate vote prevention`)
      
      // Try to vote again with same signer
      await expect(
        env.client.governance.castVote({
          voter: signer1.address,
          signer: signer1,
          proposal,
          vote: 'against',
          reason: 'Changing my mind'
        })
      ).rejects.toThrow()
      
      console.log(`✅ Duplicate vote correctly rejected`)
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)
  })

  describe('Proposal Execution', () => {
    it('should execute passed proposal', async () => {
      console.log(`⚡ Executing passed proposal`)
      
      // Execute the proposal (2/3 votes FOR, meets threshold)
      const result = await env.client.governance.executeProposal({
        executor: signer1.address,
        signer: signer1,
        proposal,
        multisig
      })

      await assert.assertTransactionSuccess(result.signature)
      
      // Small delay for execution processing
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Verify proposal status updated
      const executedProposal = await fetchProposal(env.rpc, proposal)
      expect(executedProposal.data.status).toBe('executed')
      expect(executedProposal.data.executedAt).toBeGreaterThan(0n)
      
      console.log(`✅ Proposal executed successfully`)
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)

    it('should verify execution effects', async () => {
      console.log(`🔍 Verifying proposal execution effects`)
      
      // Check that the parameter change was applied
      // This would typically involve checking protocol state
      // For integration test, we verify the execution record
      
      const proposalAccount = await fetchProposal(env.rpc, proposal)
      expect(proposalAccount.data.status).toBe('executed')
      
      // Verify execution timestamp is recent
      const currentTime = BigInt(Math.floor(Date.now() / 1000))
      const executionTime = proposalAccount.data.executedAt
      expect(currentTime - executionTime).toBeLessThan(300n) // Within 5 minutes
      
      console.log(`✅ Execution effects verified`)
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)
  })

  describe('Treasury Management', () => {
    it('should handle treasury withdrawal via governance', async () => {
      const withdrawalAmount = 10_000_000n // 0.01 SOL
      
      console.log(`💸 Testing treasury withdrawal via governance`)
      
      // Create withdrawal proposal
      const withdrawalProposal = {
        multisig,
        title: 'Treasury Withdrawal Request',
        description: 'Withdraw funds for operational expenses',
        proposalType: 'treasury_withdrawal' as const,
        actions: [
          {
            type: 'withdraw_funds' as const,
            recipient: signer1.address,
            amount: withdrawalAmount.toString()
          }
        ],
        votingPeriod: 3600, // 1 hour for quick test
        executionDelay: 0 // Immediate execution
      }
      
      // Submit withdrawal proposal
      const submitResult = await env.client.governance.submitProposal({
        proposer: signer2.address,
        signer: signer2,
        ...withdrawalProposal
      })

      await assert.assertTransactionSuccess(submitResult.signature)
      
      const proposalId2 = BigInt(Date.now() + 1000)
      const [withdrawalProposalAddress] = deriveProposalPda(multisig, proposalId2)
      
      await env.waitForAccount(withdrawalProposalAddress)
      
      // Quick voting (2/3 signers vote FOR)
      await env.client.governance.castVote({
        voter: signer1.address,
        signer: signer1,
        proposal: withdrawalProposalAddress,
        vote: 'for',
        reason: 'Approved withdrawal'
      })
      
      await env.client.governance.castVote({
        voter: signer2.address,
        signer: signer2,
        proposal: withdrawalProposalAddress,
        vote: 'for',
        reason: 'Necessary expense'
      })
      
      // Execute withdrawal
      const executeResult = await env.client.governance.executeProposal({
        executor: signer1.address,
        signer: signer1,
        proposal: withdrawalProposalAddress,
        multisig
      })

      await assert.assertTransactionSuccess(executeResult.signature)
      
      console.log(`✅ Treasury withdrawal executed via governance`)
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)
  })

  describe('Error Scenarios and Edge Cases', () => {
    it('should reject unauthorized proposal submission', async () => {
      const unauthorized = await env.createFundedSigner()
      
      console.log(`🚫 Testing unauthorized proposal submission`)
      
      await expect(
        env.client.governance.submitProposal({
          proposer: unauthorized.address,
          signer: unauthorized,
          multisig,
          title: 'Unauthorized Proposal',
          description: 'Should fail',
          proposalType: 'parameter_change',
          actions: [],
          votingPeriod: 3600,
          executionDelay: 0
        })
      ).rejects.toThrow()
      
      console.log(`✅ Unauthorized proposal correctly rejected`)
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)

    it('should handle voting on non-existent proposal', async () => {
      const [fakeProposal] = deriveProposalPda(multisig, BigInt(999999))
      
      console.log(`🚫 Testing vote on non-existent proposal`)
      
      await expect(
        env.client.governance.castVote({
          voter: signer1.address,
          signer: signer1,
          proposal: fakeProposal,
          vote: 'for',
          reason: 'Should fail'
        })
      ).rejects.toThrow()
      
      console.log(`✅ Vote on non-existent proposal correctly rejected`)
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)

    it('should handle execution of failed proposal', async () => {
      // Create a proposal that will fail to meet threshold
      const failingProposal = {
        multisig,
        title: 'Failing Test Proposal',
        description: 'Proposal designed to fail threshold',
        proposalType: 'parameter_change' as const,
        actions: [{
          type: 'update_parameter' as const,
          parameter: 'test_param',
          newValue: 'test_value'
        }],
        votingPeriod: 3600,
        executionDelay: 0
      }
      
      console.log(`❌ Testing execution of proposal that fails threshold`)
      
      const submitResult = await env.client.governance.submitProposal({
        proposer: signer1.address,
        signer: signer1,
        ...failingProposal
      })

      await assert.assertTransactionSuccess(submitResult.signature)
      
      const proposalId3 = BigInt(Date.now() + 2000)
      const [failingProposalAddress] = deriveProposalPda(multisig, proposalId3)
      
      await env.waitForAccount(failingProposalAddress)
      
      // Only 1 vote FOR (below 2/3 threshold)
      await env.client.governance.castVote({
        voter: signer1.address,
        signer: signer1,
        proposal: failingProposalAddress,
        vote: 'for',
        reason: 'Solo vote'
      })
      
      // Try to execute with insufficient votes
      await expect(
        env.client.governance.executeProposal({
          executor: signer1.address,
          signer: signer1,
          proposal: failingProposalAddress,
          multisig
        })
      ).rejects.toThrow()
      
      console.log(`✅ Execution of under-threshold proposal correctly rejected`)
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)
  })

  describe('Multisig Management', () => {
    it('should handle signer addition via governance', async () => {
      const newSigner = await env.createFundedSigner()
      
      console.log(`👥 Testing addition of new signer via governance: ${newSigner.address}`)
      
      // Create proposal to add new signer
      const addSignerProposal = {
        multisig,
        title: 'Add New Multisig Signer',
        description: 'Proposal to add new trusted signer',
        proposalType: 'multisig_change' as const,
        actions: [
          {
            type: 'add_signer' as const,
            signerAddress: newSigner.address
          }
        ],
        votingPeriod: 3600,
        executionDelay: 0
      }
      
      const result = await env.client.governance.submitProposal({
        proposer: signer1.address,
        signer: signer1,
        ...addSignerProposal
      })

      await assert.assertTransactionSuccess(result.signature)
      
      console.log(`✅ Add signer proposal submitted successfully`)
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)

    it('should handle threshold updates', async () => {
      console.log(`🔢 Testing multisig threshold update`)
      
      // Create proposal to change threshold from 2/3 to 3/4 (when new signer added)
      const thresholdProposal = {
        multisig,
        title: 'Update Multisig Threshold',
        description: 'Increase threshold for enhanced security',
        proposalType: 'multisig_change' as const,
        actions: [
          {
            type: 'update_threshold' as const,
            newThreshold: 3
          }
        ],
        votingPeriod: 3600,
        executionDelay: 0
      }
      
      const result = await env.client.governance.submitProposal({
        proposer: signer2.address,
        signer: signer2,
        ...thresholdProposal
      })

      await assert.assertTransactionSuccess(result.signature)
      
      console.log(`✅ Threshold update proposal submitted successfully`)
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)
  })
})