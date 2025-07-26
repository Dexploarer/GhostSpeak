/**
 * Token-2022 Core Features Unit Tests
 * 
 * Fast unit tests for Token-2022 features without heavy cryptographic operations.
 * Focuses on transfer fees, interest calculations, and configuration validation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { address } from '@solana/addresses'
import type { Address } from '@solana/addresses'
import {
  calculateTransferFee,
  calculateInterest,
  createTransferFeeConfig,
  createInterestBearingConfig,
  estimateComputeUnits,
  TokenAccountState,
  canTransfer,
  basisPointsToPercentage,
  percentageToBasisPoints,
  formatBasisPoints,
  estimateAccumulatedFees,
  calculateRequiredAmountForNetTransfer
} from '../../src/utils/token-2022-extensions'

describe('Token-2022 Core Features', () => {
  let testMintAddress: Address
  
  beforeEach(() => {
    testMintAddress = address('So11111111111111111111111111111111111111112')
  })

  describe('Transfer Fee Calculations', () => {
    it('should calculate basic transfer fees correctly', () => {
      const config = createTransferFeeConfig({
        transferFeeBasisPoints: 100, // 1%
        maximumFee: BigInt(10000),
        transferFeeConfigAuthority: null,
        withdrawWithheldAuthority: null
      })

      const amount = BigInt(1000000)
      const result = calculateTransferFee(amount, config)
      
      expect(result.feeAmount).toBe(BigInt(10000)) // 1% of 1M
      expect(result.netAmount).toBe(BigInt(990000))
      expect(result.wasFeeCapped).toBe(false)
    })

    it('should apply maximum fee caps', () => {
      const config = createTransferFeeConfig({
        transferFeeBasisPoints: 1000, // 10%
        maximumFee: BigInt(50000), // Cap at 50k
        transferFeeConfigAuthority: null,
        withdrawWithheldAuthority: null
      })

      const largeAmount = BigInt(1000000) // Would be 100k fee without cap
      const result = calculateTransferFee(largeAmount, config)
      
      expect(result.feeAmount).toBe(BigInt(50000)) // Capped
      expect(result.netAmount).toBe(BigInt(950000))
      expect(result.wasFeeCapped).toBe(true)
    })

    it('should calculate reverse transfers (desired net amount)', () => {
      const config = createTransferFeeConfig({
        transferFeeBasisPoints: 250, // 2.5%
        maximumFee: BigInt(100000),
        transferFeeConfigAuthority: null,
        withdrawWithheldAuthority: null
      })

      const desiredNet = BigInt(975000) // Want recipient to receive this
      const result = calculateRequiredAmountForNetTransfer(desiredNet, config)
      
      // Should calculate gross amount needed
      expect(result.netAmount).toBe(desiredNet)
      expect(result.feeAmount).toBeGreaterThan(BigInt(0))
      expect(result.transferAmount).toBe(result.netAmount + result.feeAmount)
    })

    it('should estimate accumulated fees for multiple transfers', () => {
      const config = createTransferFeeConfig({
        transferFeeBasisPoints: 50, // 0.5%
        maximumFee: BigInt(5000),
        transferFeeConfigAuthority: null,
        withdrawWithheldAuthority: null
      })

      const transfers = [
        BigInt(100000),
        BigInt(200000),
        BigInt(300000)
      ]

      const result = estimateAccumulatedFees(transfers, config)
      
      expect(result.totalFees).toBe(BigInt(3000)) // 500 + 1000 + 1500
      expect(result.feeBreakdown).toHaveLength(3)
      expect(result.feeBreakdown[0].feeAmount).toBe(BigInt(500))
      expect(result.feeBreakdown[1].feeAmount).toBe(BigInt(1000))
      expect(result.feeBreakdown[2].feeAmount).toBe(BigInt(1500))
    })
  })

  describe('Interest-Bearing Token Calculations', () => {
    it('should calculate simple interest correctly', () => {
      const config = createInterestBearingConfig({
        rateAuthority: testMintAddress,
        currentRate: 1000 // 10% APY
      })

      const principal = BigInt(1000000)
      const oneYearLater = config.initializationTimestamp + BigInt(365 * 24 * 60 * 60)
      
      const result = calculateInterest(principal, config, oneYearLater)
      
      // Should be approximately 10% interest
      expect(result.interestAmount).toBeGreaterThan(BigInt(95000)) // At least 9.5%
      expect(result.interestAmount).toBeLessThan(BigInt(105000))   // At most 10.5%
      expect(result.newAmount).toBe(principal + result.interestAmount)
    })

    it('should handle fractional time periods', () => {
      const config = createInterestBearingConfig({
        rateAuthority: null,
        currentRate: 1200 // 12% APY
      })

      const principal = BigInt(2000000)
      const quarterYear = config.initializationTimestamp + BigInt(91 * 24 * 60 * 60) // ~3 months
      
      const result = calculateInterest(principal, config, quarterYear)
      
      // Should be approximately 3% (quarter of 12%)
      const expectedQuarterly = principal * BigInt(3) / BigInt(100)
      const tolerance = expectedQuarterly / BigInt(10) // 10% tolerance
      
      expect(result.interestAmount).toBeGreaterThan(expectedQuarterly - tolerance)
      expect(result.interestAmount).toBeLessThan(expectedQuarterly + tolerance)
    })

    it('should handle zero and negative interest rates', () => {
      const zeroConfig = createInterestBearingConfig({
        rateAuthority: null,
        currentRate: 0
      })

      const negativeConfig = createInterestBearingConfig({
        rateAuthority: null,
        currentRate: -500 // -5% (deflationary)
      })

      const principal = BigInt(1000000)
      const futureTime = zeroConfig.initializationTimestamp + BigInt(365 * 24 * 60 * 60)

      const zeroResult = calculateInterest(principal, zeroConfig, futureTime)
      const negativeResult = calculateInterest(principal, negativeConfig, futureTime)

      expect(zeroResult.interestAmount).toBe(BigInt(0))
      expect(zeroResult.newAmount).toBe(principal)
      
      expect(negativeResult.interestAmount).toBeLessThan(BigInt(0))
      expect(negativeResult.newAmount).toBeLessThan(principal)
    })
  })

  describe('Configuration Validation', () => {
    it('should validate transfer fee basis points', () => {
      // Valid configurations
      expect(() => createTransferFeeConfig({
        transferFeeBasisPoints: 0,
        maximumFee: BigInt(0),
        transferFeeConfigAuthority: null,
        withdrawWithheldAuthority: null
      })).not.toThrow()

      expect(() => createTransferFeeConfig({
        transferFeeBasisPoints: 10000, // 100%
        maximumFee: BigInt(1000000),
        transferFeeConfigAuthority: testMintAddress,
        withdrawWithheldAuthority: testMintAddress
      })).not.toThrow()

      // Invalid configuration
      expect(() => createTransferFeeConfig({
        transferFeeBasisPoints: 10001, // > 100%
        maximumFee: BigInt(1000),
        transferFeeConfigAuthority: null,
        withdrawWithheldAuthority: null
      })).toThrow('Transfer fee basis points cannot exceed 10000')
    })

    it('should validate interest rate ranges', () => {
      // Valid rates
      expect(() => createInterestBearingConfig({
        rateAuthority: null,
        currentRate: 32767 // i16 max
      })).not.toThrow()

      expect(() => createInterestBearingConfig({
        rateAuthority: null,
        currentRate: -32768 // i16 min
      })).not.toThrow()

      // Invalid rates
      expect(() => createInterestBearingConfig({
        rateAuthority: null,
        currentRate: 32768 // > i16 max
      })).toThrow('Interest rate must be within i16 range')

      expect(() => createInterestBearingConfig({
        rateAuthority: null,
        currentRate: -32769 // < i16 min
      })).toThrow('Interest rate must be within i16 range')
    })
  })

  describe('Utility Functions', () => {
    it('should convert between basis points and percentages', () => {
      expect(basisPointsToPercentage(100)).toBe(0.01) // 1%
      expect(basisPointsToPercentage(2500)).toBe(0.25) // 25%
      expect(basisPointsToPercentage(10000)).toBe(1.0) // 100%

      expect(percentageToBasisPoints(0.01)).toBe(100) // 1%
      expect(percentageToBasisPoints(0.25)).toBe(2500) // 25%
      expect(percentageToBasisPoints(1.0)).toBe(10000) // 100%
    })

    it('should format basis points as readable percentages', () => {
      expect(formatBasisPoints(100)).toBe('1.00%')
      expect(formatBasisPoints(250)).toBe('2.50%')
      expect(formatBasisPoints(12345)).toBe('123.45%')
    })

    it('should estimate compute units for operations', () => {
      const baseTransfer = estimateComputeUnits('transfer', [])
      const transferWithFees = estimateComputeUnits('transfer', ['TRANSFER_FEE_CONFIG'] as any)
      const complexTransfer = estimateComputeUnits('transfer', [
        'TRANSFER_FEE_CONFIG',
        'CONFIDENTIAL_TRANSFER_MINT',
        'INTEREST_BEARING_CONFIG'
      ] as any)

      expect(baseTransfer).toBe(BigInt(15000))
      expect(transferWithFees).toBeGreaterThan(baseTransfer)
      expect(complexTransfer).toBeGreaterThan(transferWithFees)
    })
  })

  describe('Account State Management', () => {
    it('should validate account transfer eligibility', () => {
      // Valid scenarios
      expect(canTransfer(TokenAccountState.INITIALIZED, false, false)).toBe(true)
      
      // Invalid scenarios
      expect(canTransfer(TokenAccountState.UNINITIALIZED, false, false)).toBe(false)
      expect(canTransfer(TokenAccountState.FROZEN, false, false)).toBe(false)
      expect(canTransfer(TokenAccountState.INITIALIZED, true, false)).toBe(false) // Non-transferable
      expect(canTransfer(TokenAccountState.INITIALIZED, false, true)).toBe(false) // Frozen
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle large amounts efficiently', () => {
      const config = createTransferFeeConfig({
        transferFeeBasisPoints: 1, // 0.01%
        maximumFee: BigInt('18446744073709551615'), // u64 max
        transferFeeConfigAuthority: null,
        withdrawWithheldAuthority: null
      })

      const largeAmount = BigInt('9223372036854775807') // i64 max
      
      expect(() => {
        calculateTransferFee(largeAmount, config)
      }).not.toThrow()
    })

    it('should handle edge case amounts', () => {
      const config = createTransferFeeConfig({
        transferFeeBasisPoints: 10000, // 100%
        maximumFee: BigInt(1000000),
        transferFeeConfigAuthority: null,
        withdrawWithheldAuthority: null
      })

      // Zero amount
      const zeroResult = calculateTransferFee(BigInt(0), config)
      expect(zeroResult.feeAmount).toBe(BigInt(0))
      expect(zeroResult.netAmount).toBe(BigInt(0))

      // Small amount
      const smallResult = calculateTransferFee(BigInt(1), config)
      expect(smallResult.feeAmount).toBe(BigInt(1)) // 100% of 1
      expect(smallResult.netAmount).toBe(BigInt(0))
    })

    it('should handle rapid calculations without performance degradation', () => {
      const config = createTransferFeeConfig({
        transferFeeBasisPoints: 100,
        maximumFee: BigInt(10000),
        transferFeeConfigAuthority: null,
        withdrawWithheldAuthority: null
      })

      const startTime = performance.now()
      
      // Perform 1000 calculations
      for (let i = 0; i < 1000; i++) {
        calculateTransferFee(BigInt(1000000 + i), config)
      }
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      
      // Should complete in reasonable time (< 100ms)
      expect(totalTime).toBeLessThan(100)
    })
  })

  describe('Real-world Scenarios', () => {
    it('should handle marketplace fee structures', () => {
      // Typical marketplace: 2.5% fee, capped at 1000 tokens
      const marketplaceConfig = createTransferFeeConfig({
        transferFeeBasisPoints: 250,
        maximumFee: BigInt(1000000000), // 1000 tokens cap (high enough for test)
        transferFeeConfigAuthority: testMintAddress,
        withdrawWithheldAuthority: testMintAddress
      })

      // Small purchase: 100 tokens
      const smallPurchase = calculateTransferFee(BigInt(100000000), marketplaceConfig)
      expect(smallPurchase.feeAmount).toBe(BigInt(2500000)) // 2.5 tokens (2.5% of 100)
      expect(smallPurchase.wasFeeCapped).toBe(false)

      // Large purchase: 100,000 tokens (would be 2500 tokens fee, but capped)
      const largePurchase = calculateTransferFee(BigInt(100000000000), marketplaceConfig)
      expect(largePurchase.feeAmount).toBe(BigInt(1000000000)) // Capped at 1000 tokens
      expect(largePurchase.wasFeeCapped).toBe(true)
    })

    it('should handle DeFi staking rewards', () => {
      // High-yield staking: 15% APY
      const stakingConfig = createInterestBearingConfig({
        rateAuthority: testMintAddress,
        currentRate: 1500
      })

      const stakedAmount = BigInt(50000000000) // 50,000 tokens
      
      // Monthly rewards
      const monthlyTime = stakingConfig.initializationTimestamp + BigInt(30 * 24 * 60 * 60)
      const monthlyRewards = calculateInterest(stakedAmount, stakingConfig, monthlyTime)
      
      // Should be approximately 1.25% (15% / 12 months)
      const expectedMonthly = stakedAmount * BigInt(125) / BigInt(10000)
      const tolerance = expectedMonthly / BigInt(20) // 5% tolerance
      
      expect(monthlyRewards.interestAmount).toBeGreaterThan(expectedMonthly - tolerance)
      expect(monthlyRewards.interestAmount).toBeLessThan(expectedMonthly + tolerance)
    })

    it('should handle combined fee and interest scenarios', () => {
      // Token with both features
      const feeConfig = createTransferFeeConfig({
        transferFeeBasisPoints: 75, // 0.75%
        maximumFee: BigInt(50000000), // 50 tokens max
        transferFeeConfigAuthority: testMintAddress,
        withdrawWithheldAuthority: testMintAddress
      })

      const interestConfig = createInterestBearingConfig({
        rateAuthority: testMintAddress,
        currentRate: 800 // 8% APY
      })

      // User holds tokens for 6 months, then transfers
      const principal = BigInt(10000000000) // 10,000 tokens
      const sixMonths = interestConfig.initializationTimestamp + BigInt(182 * 24 * 60 * 60)
      
      // Calculate interest first
      const interestResult = calculateInterest(principal, interestConfig, sixMonths)
      
      // Then calculate fees on the new balance
      const feeResult = calculateTransferFee(interestResult.newAmount, feeConfig)
      
      expect(interestResult.newAmount).toBeGreaterThan(principal) // Earned interest
      expect(feeResult.feeAmount).toBeGreaterThan(BigInt(0)) // Paid some fees
      expect(feeResult.netAmount).toBeLessThan(interestResult.newAmount) // Net after fees
    })
  })
})