/**
 * Token-2022 Cross-Program Invocation (CPI) Integration Tests
 * 
 * Tests the integration between GhostSpeak SDK and SPL Token-2022 program
 * including confidential transfers, transfer fees, and multi-extension operations.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { address } from '@solana/addresses'
import type { Address } from '@solana/addresses'
import {
  calculateTransferFee,
  calculateInterest,
  generateConfidentialTransferProof,
  createTransferFeeConfig,
  createInterestBearingConfig,
  estimateComputeUnits,
  TokenAccountState,
  canTransfer
} from '../../src/utils/token-2022-extensions'
import {
  generateElGamalKeypair,
  encryptAmount,
  decryptAmount,
  generateTransferProof,
  type ElGamalKeypair
} from '../../src/utils/elgamal-complete'

describe('Token-2022 CPI Integration Tests', () => {
  let senderKeypair: ElGamalKeypair
  let recipientKeypair: ElGamalKeypair
  let auditorKeypair: ElGamalKeypair
  let testMintAddress: Address
  
  beforeEach(() => {
    // Generate test keypairs
    senderKeypair = generateElGamalKeypair()
    recipientKeypair = generateElGamalKeypair()
    auditorKeypair = generateElGamalKeypair()
    testMintAddress = address('So11111111111111111111111111111111111111112')
  })

  describe('Confidential Transfer CPI', () => {
    it('should prepare confidential transfer with valid proof', async () => {
      const transferAmount = 1000000n // 1 million base units
      
      // Create encrypted balance for sender
      const senderBalance = encryptAmount(5000000n, senderKeypair.publicKey)
      
      // Generate transfer proof
      const transferProof = generateTransferProof(
        senderBalance,
        transferAmount,
        senderKeypair,
        recipientKeypair.publicKey
      )
      
      expect(transferProof.transferProof).toBeDefined()
      expect(transferProof.transferProof.encryptedTransferAmount).toHaveLength(32)
      expect(transferProof.transferProof.newSourceCommitment).toHaveLength(32)
      expect(transferProof.transferProof.equalityProof).toHaveLength(192)
      expect(transferProof.transferProof.validityProof).toHaveLength(96)
      expect(transferProof.transferProof.rangeProof).toHaveLength(674)
      
      // Verify the new source balance is correct
      const newBalance = decryptAmount(transferProof.newSourceBalance, senderKeypair.secretKey, 10000000n)
      expect(newBalance).toBe(4000000n)
      
      // Verify recipient can decrypt the transfer amount
      const receivedAmount = decryptAmount(transferProof.destCiphertext, recipientKeypair.secretKey, 2000000n)
      expect(receivedAmount).toBe(transferAmount)
    })

    it('should generate confidential transfer proof with auditor', async () => {
      const amount = 500000n
      
      const proof = await generateConfidentialTransferProof(
        amount,
        senderKeypair,
        recipientKeypair.publicKey,
        auditorKeypair.publicKey
      )
      
      expect(proof.encryptedAmount).toHaveLength(64)
      expect(proof.rangeProof).toHaveLength(674)
      expect(proof.validityProof).toHaveLength(96)
      expect(proof.auditorProof).toHaveLength(160) // 64 (ciphertext) + 96 (equality proof)
    })

    it('should handle zero amount confidential transfers', async () => {
      const zeroAmount = 0n
      
      const proof = await generateConfidentialTransferProof(
        zeroAmount,
        senderKeypair,
        recipientKeypair.publicKey
      )
      
      expect(proof.encryptedAmount).toHaveLength(64)
      expect(proof.rangeProof).toHaveLength(674)
      expect(proof.validityProof).toHaveLength(96)
      expect(proof.auditorProof).toBeUndefined()
    })

    it('should reject transfers with insufficient balance', () => {
      const senderBalance = encryptAmount(100n, senderKeypair.publicKey) // Low balance
      const transferAmount = 1000n // More than balance
      
      expect(() => {
        generateTransferProof(
          senderBalance,
          transferAmount,
          senderKeypair,
          recipientKeypair.publicKey
        )
      }).toThrow('Insufficient balance for transfer')
    })
  })

  describe('Transfer Fee CPI Integration', () => {
    it('should calculate fees for marketplace transactions', () => {
      const config = createTransferFeeConfig({
        transferFeeBasisPoints: 250, // 2.5%
        maximumFee: BigInt(100000),
        transferFeeConfigAuthority: testMintAddress,
        withdrawWithheldAuthority: testMintAddress
      })

      const transferAmount = BigInt(5000000) // 5M tokens
      const result = calculateTransferFee(transferAmount, config)
      
      // 2.5% of 5M = 125k, but capped at 100k
      expect(result.feeAmount).toBe(BigInt(100000))
      expect(result.netAmount).toBe(BigInt(4900000))
      expect(result.wasFeeCapped).toBe(true)
    })

    it('should handle small amounts with minimal fees', () => {
      const config = createTransferFeeConfig({
        transferFeeBasisPoints: 30, // 0.3%
        maximumFee: BigInt(1000),
        transferFeeConfigAuthority: null,
        withdrawWithheldAuthority: null
      })

      const smallAmount = BigInt(100)
      const result = calculateTransferFee(smallAmount, config)
      
      // 0.3% of 100 = 0.3, rounded down to 0
      expect(result.feeAmount).toBe(BigInt(0))
      expect(result.netAmount).toBe(smallAmount)
      expect(result.wasFeeCapped).toBe(false)
    })

    it('should validate transfer fee configuration limits', () => {
      // Should reject fee rates > 100%
      expect(() => {
        createTransferFeeConfig({
          transferFeeBasisPoints: 10001,
          maximumFee: BigInt(1000),
          transferFeeConfigAuthority: null,
          withdrawWithheldAuthority: null
        })
      }).toThrow('Transfer fee basis points cannot exceed 10000')
    })
  })

  describe('Interest-Bearing Token CPI', () => {
    it('should calculate compound interest for staking scenarios', () => {
      const config = createInterestBearingConfig({
        rateAuthority: testMintAddress,
        currentRate: 800 // 8% APY
      })

      const principal = BigInt(10000000) // 10M tokens
      const futureTimestamp = config.initializationTimestamp + BigInt(365 * 24 * 60 * 60) // 1 year later
      
      const result = calculateInterest(principal, config, futureTimestamp)
      
      // Should be approximately 8% interest
      expect(result.interestAmount).toBeGreaterThan(BigInt(700000)) // At least 7%
      expect(result.interestAmount).toBeLessThan(BigInt(900000))   // At most 9%
      expect(result.newAmount).toBe(principal + result.interestAmount)
    })

    it('should handle negative interest rates (deflationary tokens)', () => {
      const config = createInterestBearingConfig({
        rateAuthority: null,
        currentRate: -200 // -2% annual rate
      })

      const principal = BigInt(1000000)
      const futureTimestamp = config.initializationTimestamp + BigInt(182 * 24 * 60 * 60) // 6 months
      
      const result = calculateInterest(principal, config, futureTimestamp)
      
      // Should reduce the principal (negative interest)
      expect(result.interestAmount).toBeLessThan(BigInt(0))
      expect(result.newAmount).toBeLessThan(principal)
    })

    it('should validate interest rate ranges', () => {
      // Should reject rates outside i16 range
      expect(() => {
        createInterestBearingConfig({
          rateAuthority: null,
          currentRate: 32768 // > i16 max
        })
      }).toThrow('Interest rate must be within i16 range')

      expect(() => {
        createInterestBearingConfig({
          rateAuthority: null,
          currentRate: -32769 // < i16 min
        })
      }).toThrow('Interest rate must be within i16 range')
    })
  })

  describe('Multi-Extension Token Operations', () => {
    it('should estimate compute units for complex operations', () => {
      const extensions = [
        'TRANSFER_FEE_CONFIG',
        'CONFIDENTIAL_TRANSFER_MINT',
        'INTEREST_BEARING_CONFIG'
      ] as any[]

      const transferUnits = estimateComputeUnits('transfer', extensions)
      const createUnits = estimateComputeUnits('create_account', extensions)
      
      // Transfer with multiple extensions should be expensive
      expect(transferUnits).toBeGreaterThan(BigInt(70000)) // Base + 3 extensions
      expect(createUnits).toBeGreaterThan(BigInt(80000))   // Account creation + extensions
    })

    it('should validate account state for transfers', () => {
      // Normal account should allow transfers
      expect(canTransfer(TokenAccountState.INITIALIZED, false, false)).toBe(true)
      
      // Frozen account should not allow transfers
      expect(canTransfer(TokenAccountState.INITIALIZED, false, true)).toBe(false)
      
      // Non-transferable token should not allow transfers
      expect(canTransfer(TokenAccountState.INITIALIZED, true, false)).toBe(false)
      
      // Uninitialized account should not allow transfers
      expect(canTransfer(TokenAccountState.UNINITIALIZED, false, false)).toBe(false)
    })

    it('should handle fee calculation with interest-bearing tokens', () => {
      // Create a token with both transfer fees and interest
      const feeConfig = createTransferFeeConfig({
        transferFeeBasisPoints: 100, // 1%
        maximumFee: BigInt(50000),
        transferFeeConfigAuthority: testMintAddress,
        withdrawWithheldAuthority: testMintAddress
      })

      const interestConfig = createInterestBearingConfig({
        rateAuthority: testMintAddress,
        currentRate: 600 // 6% APY
      })

      // Calculate interest on principal first
      const principal = BigInt(1000000)
      const futureTime = interestConfig.initializationTimestamp + BigInt(30 * 24 * 60 * 60) // 30 days
      const interestResult = calculateInterest(principal, interestConfig, futureTime)
      
      // Then calculate transfer fee on the new balance
      const transferAmount = interestResult.newAmount
      const feeResult = calculateTransferFee(transferAmount, feeConfig)
      
      expect(interestResult.newAmount).toBeGreaterThan(principal)
      expect(feeResult.feeAmount).toBeGreaterThan(BigInt(0))
      expect(feeResult.netAmount).toBeLessThan(transferAmount)
    })
  })

  describe('CPI Error Handling', () => {
    it('should handle invalid ciphertext data', async () => {
      const invalidAmount = -1n
      
      await expect(
        generateConfidentialTransferProof(
          invalidAmount,
          senderKeypair,
          recipientKeypair.publicKey
        )
      ).rejects.toThrow('Amount must be between 0 and')
    })

    it('should handle compute unit overflow scenarios', () => {
      // Test with many extensions
      const manyExtensions = new Array(50).fill('TRANSFER_FEE_CONFIG') as any[]
      
      const units = estimateComputeUnits('transfer', manyExtensions)
      
      // Should handle large numbers gracefully
      expect(typeof units).toBe('bigint')
      expect(units).toBeGreaterThan(BigInt(0))
    })

    it('should validate transfer fee configurations', () => {
      // Zero maximum fee should work
      const config = createTransferFeeConfig({
        transferFeeBasisPoints: 0,
        maximumFee: BigInt(0),
        transferFeeConfigAuthority: null,
        withdrawWithheldAuthority: null
      })

      const result = calculateTransferFee(BigInt(1000000), config)
      expect(result.feeAmount).toBe(BigInt(0))
      expect(result.netAmount).toBe(BigInt(1000000))
    })
  })

  describe('Real-world Integration Scenarios', () => {
    it('should handle a complete marketplace transaction flow', async () => {
      // 1. Setup: Create a marketplace token with fees and confidential transfers
      const feeConfig = createTransferFeeConfig({
        transferFeeBasisPoints: 50, // 0.5% marketplace fee
        maximumFee: BigInt(10000),
        transferFeeConfigAuthority: testMintAddress,
        withdrawWithheldAuthority: testMintAddress
      })

      // 2. Buyer has encrypted balance
      const buyerBalance = encryptAmount(2000000n, senderKeypair.publicKey) // 2M tokens
      const purchaseAmount = 500000n // 500k tokens

      // 3. Generate confidential transfer proof
      const transferProof = generateTransferProof(
        buyerBalance,
        purchaseAmount,
        senderKeypair,
        recipientKeypair.publicKey
      )

      // 4. Calculate marketplace fees
      const feeResult = calculateTransferFee(purchaseAmount, feeConfig)

      // 5. Verify all components
      expect(transferProof.transferProof).toBeDefined()
      expect(feeResult.feeAmount).toBe(BigInt(2500)) // 0.5% of 500k
      expect(feeResult.netAmount).toBe(BigInt(497500))

      // 6. Verify balances
      const newBuyerBalance = decryptAmount(transferProof.newSourceBalance, senderKeypair.secretKey, 3000000n)
      const sellerReceived = decryptAmount(transferProof.destCiphertext, recipientKeypair.secretKey, 1000000n)
      
      expect(newBuyerBalance).toBe(1500000n) // 2M - 500k
      expect(sellerReceived).toBe(purchaseAmount)
    })

    it('should handle staking rewards with confidential balances', async () => {
      // 1. User stakes tokens (confidential balance)
      const stakedAmount = 5000000n
      const stakedBalance = encryptAmount(stakedAmount, senderKeypair.publicKey)

      // 2. Calculate rewards over time
      const rewardConfig = createInterestBearingConfig({
        rateAuthority: testMintAddress,
        currentRate: 1200 // 12% APY for staking
      })

      const stakingPeriod = BigInt(90 * 24 * 60 * 60) // 3 months
      const futureTime = rewardConfig.initializationTimestamp + stakingPeriod
      
      const rewardResult = calculateInterest(stakedAmount, rewardConfig, futureTime)

      // 3. Generate confidential proof for reward distribution
      const rewardAmount = rewardResult.interestAmount
      const rewardProof = await generateConfidentialTransferProof(
        rewardAmount,
        senderKeypair,
        senderKeypair.publicKey // Self-transfer for rewards
      )

      // 4. Verify rewards are reasonable (3 months at 12% APY ≈ 3%)
      const expectedReward = stakedAmount * BigInt(3) / BigInt(100)
      const tolerance = expectedReward / BigInt(10) // 10% tolerance

      expect(rewardResult.interestAmount).toBeGreaterThan(expectedReward - tolerance)
      expect(rewardResult.interestAmount).toBeLessThan(expectedReward + tolerance)
      expect(rewardProof.encryptedAmount).toHaveLength(64)
    })
  })
})