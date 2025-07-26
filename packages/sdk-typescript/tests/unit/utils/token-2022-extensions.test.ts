/**
 * Token-2022 Extensions Unit Tests
 * 
 * Tests for advanced Token-2022 features including transfer fees,
 * interest-bearing tokens, and confidential transfers.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  calculateTransferFee,
  calculateInterest,
  createTransferFeeConfig,
  createInterestBearingConfig,
  parseTokenExtension
} from '../../../src/utils/token-2022-extensions'
import type {
  TransferFeeConfig,
  InterestBearingConfig
} from '../../../src/types/token-2022-types'

describe('Token-2022 Extensions', () => {
  describe('Transfer Fee Calculations', () => {
    it('should calculate transfer fees correctly', () => {
      const amount = BigInt(1000000) // 1 million base units
      const transferFeeConfig: TransferFeeConfig = {
        transferFeeBasisPoints: 100, // 1%
        maximumFee: BigInt(10000),   // 10k base units max
        transferFeeConfigAuthority: null,
        withdrawWithheldAuthority: null,
        withheldAmount: BigInt(0),
        olderTransferFee: {
          epoch: BigInt(100),
          transferFeeBasisPoints: 50,
          maximumFee: BigInt(5000)
        },
        newerTransferFee: {
          epoch: BigInt(101),
          transferFeeBasisPoints: 100,
          maximumFee: BigInt(10000)
        }
      }

      const result = calculateTransferFee(amount, transferFeeConfig)
      
      // 1% of 1 million = 10,000 (within max fee limit)
      expect(result.feeAmount).toBe(BigInt(10000))
      expect(result.netAmount).toBe(BigInt(990000))
    })

    it('should cap fees at maximum amount', () => {
      const amount = BigInt(10000000) // 10 million base units
      const transferFeeConfig: TransferFeeConfig = {
        transferFeeBasisPoints: 500, // 5%
        maximumFee: BigInt(50000),   // 50k base units max
        transferFeeConfigAuthority: null,
        withdrawWithheldAuthority: null,
        withheldAmount: BigInt(0),
        olderTransferFee: {
          epoch: BigInt(100),
          transferFeeBasisPoints: 250,
          maximumFee: BigInt(25000)
        },
        newerTransferFee: {
          epoch: BigInt(101),
          transferFeeBasisPoints: 500,
          maximumFee: BigInt(50000)
        }
      }

      const result = calculateTransferFee(amount, transferFeeConfig)
      
      // 5% would be 500k, but capped at 50k
      expect(result.feeAmount).toBe(BigInt(50000))
      expect(result.netAmount).toBe(BigInt(9950000))
    })

    it('should handle zero transfer fee', () => {
      const amount = BigInt(1000000)
      const transferFeeConfig: TransferFeeConfig = {
        transferFeeBasisPoints: 0,
        maximumFee: BigInt(0),
        transferFeeConfigAuthority: null,
        withdrawWithheldAuthority: null,
        withheldAmount: BigInt(0),
        olderTransferFee: {
          epoch: BigInt(100),
          transferFeeBasisPoints: 0,
          maximumFee: BigInt(0)
        },
        newerTransferFee: {
          epoch: BigInt(101),
          transferFeeBasisPoints: 0,
          maximumFee: BigInt(0)
        }
      }

      const result = calculateTransferFee(amount, transferFeeConfig)
      
      expect(result.feeAmount).toBe(BigInt(0))
      expect(result.netAmount).toBe(amount)
    })

    it('should handle small amounts with fractional fees', () => {
      const amount = BigInt(100) // Small amount
      const transferFeeConfig: TransferFeeConfig = {
        transferFeeBasisPoints: 100, // 1%
        maximumFee: BigInt(10000),
        transferFeeConfigAuthority: null,
        withdrawWithheldAuthority: null,
        withheldAmount: BigInt(0),
        olderTransferFee: {
          epoch: BigInt(100),
          transferFeeBasisPoints: 50,
          maximumFee: BigInt(5000)
        },
        newerTransferFee: {
          epoch: BigInt(101),
          transferFeeBasisPoints: 100,
          maximumFee: BigInt(10000)
        }
      }

      const result = calculateTransferFee(amount, transferFeeConfig)
      
      // 1% of 100 = 1 (rounded down from 1.0)
      expect(result.feeAmount).toBe(BigInt(1))
      expect(result.netAmount).toBe(BigInt(99))
    })
  })

  describe('Interest-Bearing Token Calculations', () => {
    it('should calculate compound interest correctly', () => {
      const amount = BigInt(1000000) // 1 million base units
      const currentTimestamp = BigInt(Math.floor(Date.now() / 1000))
      const initTimestamp = currentTimestamp - BigInt(365 * 24 * 60 * 60) // 1 year ago

      const interestConfig: InterestBearingConfig = {
        rateAuthority: null,
        initializationTimestamp: initTimestamp,
        preUpdateAverageRate: 0,
        lastUpdateTimestamp: initTimestamp,
        currentRate: 500 // 5% annual rate (500 basis points)
      }

      const result = calculateInterest(amount, interestConfig, currentTimestamp)
      
      // After 1 year at 5% should be close to 5% interest
      expect(result.interestAmount).toBeGreaterThan(BigInt(40000)) // At least 4%
      expect(result.interestAmount).toBeLessThan(BigInt(60000))    // At most 6%
      expect(result.newAmount).toBe(amount + result.interestAmount)
    })

    it('should handle zero interest rate', () => {
      const amount = BigInt(1000000)
      const currentTimestamp = BigInt(Math.floor(Date.now() / 1000))
      const initTimestamp = currentTimestamp - BigInt(365 * 24 * 60 * 60)

      const interestConfig: InterestBearingConfig = {
        rateAuthority: null,
        initializationTimestamp: initTimestamp,
        preUpdateAverageRate: 0,
        lastUpdateTimestamp: initTimestamp,
        currentRate: 0 // 0% interest
      }

      const result = calculateInterest(amount, interestConfig, currentTimestamp)
      
      expect(result.interestAmount).toBe(BigInt(0))
      expect(result.newAmount).toBe(amount)
    })

    it('should handle negative interest rates', () => {
      const amount = BigInt(1000000)
      const currentTimestamp = BigInt(Math.floor(Date.now() / 1000))
      const initTimestamp = currentTimestamp - BigInt(365 * 24 * 60 * 60)

      const interestConfig: InterestBearingConfig = {
        rateAuthority: null,
        initializationTimestamp: initTimestamp,
        preUpdateAverageRate: 0,
        lastUpdateTimestamp: initTimestamp,
        currentRate: -200 // -2% annual rate
      }

      const result = calculateInterest(amount, interestConfig, currentTimestamp)
      
      // Should reduce the amount
      expect(result.interestAmount).toBeLessThan(BigInt(0))
      expect(result.newAmount).toBeLessThan(amount)
    })

    it('should calculate interest for partial time periods', () => {
      const amount = BigInt(1000000)
      const currentTimestamp = BigInt(Math.floor(Date.now() / 1000))
      const initTimestamp = currentTimestamp - BigInt(182 * 24 * 60 * 60) // 6 months ago

      const interestConfig: InterestBearingConfig = {
        rateAuthority: null,
        initializationTimestamp: initTimestamp,
        preUpdateAverageRate: 0,
        lastUpdateTimestamp: initTimestamp,
        currentRate: 1000 // 10% annual rate
      }

      const result = calculateInterest(amount, interestConfig, currentTimestamp)
      
      // 6 months at 10% should be approximately 5%
      expect(result.interestAmount).toBeGreaterThan(BigInt(40000)) // At least 4%
      expect(result.interestAmount).toBeLessThan(BigInt(60000))    // At most 6%
    })
  })

  describe('Extension Configuration', () => {
    it('should create transfer fee config correctly', () => {
      const config = createTransferFeeConfig({
        transferFeeBasisPoints: 250, // 2.5%
        maximumFee: BigInt(25000),
        transferFeeConfigAuthority: 'So11111111111111111111111111111111111111112' as Address,
        withdrawWithheldAuthority: 'So11111111111111111111111111111111111111112' as Address
      })

      expect(config.transferFeeBasisPoints).toBe(250)
      expect(config.maximumFee).toBe(BigInt(25000))
      expect(config.transferFeeConfigAuthority).toBeDefined()
      expect(config.withdrawWithheldAuthority).toBeDefined()
    })

    it('should create interest bearing config correctly', () => {
      const currentTimestamp = BigInt(Math.floor(Date.now() / 1000))
      const config = createInterestBearingConfig({
        rateAuthority: 'So11111111111111111111111111111111111111112' as Address,
        currentRate: 750 // 7.5%
      })

      expect(config.currentRate).toBe(750)
      expect(config.rateAuthority).toBeDefined()
      expect(config.initializationTimestamp).toBeGreaterThan(currentTimestamp - BigInt(10))
    })

    it('should validate transfer fee basis points', () => {
      expect(() => {
        createTransferFeeConfig({
          transferFeeBasisPoints: 10001, // > 100%
          maximumFee: BigInt(1000),
          transferFeeConfigAuthority: null,
          withdrawWithheldAuthority: null
        })
      }).toThrow('Transfer fee basis points cannot exceed 10000')
    })

    it('should validate interest rate range', () => {
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

  describe('Extension Parsing', () => {
    it('should parse transfer fee extension correctly', () => {
      // Create mock extension data
      const transferFeeData = new Uint8Array(108) // Transfer fee extension size
      // Fill with realistic transfer fee data
      transferFeeData[0] = 100 // transferFeeBasisPoints (low byte)
      transferFeeData[1] = 0   // transferFeeBasisPoints (high byte)
      
      const parsed = parseTokenExtension('TransferFeeConfig', transferFeeData)
      
      expect(parsed).toBeDefined()
      expect(parsed.transferFeeBasisPoints).toBe(100)
    })

    it('should parse interest bearing extension correctly', () => {
      // Create mock extension data
      const interestData = new Uint8Array(40) // Interest bearing extension size
      const currentTimestamp = BigInt(Math.floor(Date.now() / 1000))
      
      // Fill with realistic interest bearing data
      const timestampBytes = new Uint8Array(8)
      for (let i = 0; i < 8; i++) {
        timestampBytes[i] = Number((currentTimestamp >> BigInt(i * 8)) & BigInt(0xFF))
      }
      interestData.set(timestampBytes, 0)
      
      const parsed = parseTokenExtension('InterestBearingConfig', interestData)
      
      expect(parsed).toBeDefined()
      expect(parsed.initializationTimestamp).toBeDefined()
    })

    it('should handle unknown extension types', () => {
      const unknownData = new Uint8Array(32)
      
      expect(() => {
        parseTokenExtension('UnknownExtension' as any, unknownData)
      }).toThrow('Unknown extension type')
    })

    it('should validate extension data length', () => {
      const shortData = new Uint8Array(10) // Too short for any extension
      
      expect(() => {
        parseTokenExtension('TransferFeeConfig', shortData)
      }).toThrow('Invalid extension data length')
    })
  })

  describe('Real-world Scenarios', () => {
    it('should handle marketplace transaction with transfer fees', () => {
      // Simulate a marketplace purchase with transfer fees
      const purchaseAmount = BigInt(5000000) // 5 million base units
      const transferFeeConfig: TransferFeeConfig = {
        transferFeeBasisPoints: 30, // 0.3% marketplace fee
        maximumFee: BigInt(100000), // 100k base units max
        transferFeeConfigAuthority: null,
        withdrawWithheldAuthority: null,
        withheldAmount: BigInt(0),
        olderTransferFee: {
          epoch: BigInt(100),
          transferFeeBasisPoints: 25,
          maximumFee: BigInt(75000)
        },
        newerTransferFee: {
          epoch: BigInt(101),
          transferFeeBasisPoints: 30,
          maximumFee: BigInt(100000)
        }
      }

      const feeResult = calculateTransferFee(purchaseAmount, transferFeeConfig)
      
      // 0.3% of 5M = 15k (well under max)
      expect(feeResult.feeAmount).toBe(BigInt(15000))
      expect(feeResult.netAmount).toBe(BigInt(4985000))
      
      // Verify seller receives net amount
      const sellerReceives = feeResult.netAmount
      const marketplaceFee = feeResult.feeAmount
      
      expect(sellerReceives + marketplaceFee).toBe(purchaseAmount)
    })

    it('should handle staking rewards with interest-bearing tokens', () => {
      // Simulate 3 months of staking at 12% APY
      const stakedAmount = BigInt(10000000) // 10 million base units
      const currentTimestamp = BigInt(Math.floor(Date.now() / 1000))
      const stakingStart = currentTimestamp - BigInt(90 * 24 * 60 * 60) // 3 months ago

      const interestConfig: InterestBearingConfig = {
        rateAuthority: null,
        initializationTimestamp: stakingStart,
        preUpdateAverageRate: 0,
        lastUpdateTimestamp: stakingStart,
        currentRate: 1200 // 12% APY
      }

      const result = calculateInterest(stakedAmount, interestConfig, currentTimestamp)
      
      // 3 months at 12% APY ≈ 3% total
      const expectedRewards = stakedAmount * BigInt(3) / BigInt(100)
      const tolerance = expectedRewards / BigInt(10) // 10% tolerance
      
      expect(result.interestAmount).toBeGreaterThan(expectedRewards - tolerance)
      expect(result.interestAmount).toBeLessThan(expectedRewards + tolerance)
      
      // Total should be original + rewards
      expect(result.newAmount).toBe(stakedAmount + result.interestAmount)
    })
  })
})