/**
 * Unit tests for Token 2022 utilities
 * 
 * Tests comprehensive Token 2022 ATA derivation, fee calculations,
 * and extension features for the GhostSpeak SDK.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { address } from '@solana/addresses'
import type { Address } from '@solana/addresses'
import {
  // Core ATA utilities
  deriveAssociatedTokenAddress,
  deriveSplTokenAssociatedTokenAddress,
  deriveToken2022AssociatedTokenAddress,
  getAssociatedTokenAccount,
  getAllAssociatedTokenAddresses,
  validateAssociatedTokenAddress,
  
  // Token program utilities
  getTokenProgramAddress,
  getTokenProgramFromAddress,
  TokenProgram,
  TokenExtension,
  
  // Amount formatting utilities
  formatTokenAmount,
  parseTokenAmount
} from '../../src/utils/token-utils.js'

import {
  // Fee calculation utilities
  calculateTransferFee,
  calculateRequiredAmountForNetTransfer,
  estimateAccumulatedFees,
  
  // Interest calculation utilities
  calculateInterest,
  calculateCompoundInterest,
  
  // Token account state utilities
  canTransfer,
  getRequiredExtensions,
  
  // Basis points utilities
  basisPointsToPercentage,
  percentageToBasisPoints,
  formatBasisPoints,
  
  // Compute estimation
  estimateComputeUnits,
  
  TokenAccountState
} from '../../src/utils/token-2022-extensions.js'

import {
  TOKEN_PROGRAM_ADDRESS,
  TOKEN_2022_PROGRAM_ADDRESS
} from '../../src/constants/system-addresses.js'

describe('Token 2022 Utilities', () => {
  // Test addresses
  const testOwner = address('11111111111111111111111111111111')
  const testMint = address('22222222222222222222222222222222')
  const testMint2022 = address('33333333333333333333333333333333')

  describe('Associated Token Account Derivation', () => {
    it('should derive ATA for SPL Token', async () => {
      const ata = await deriveSplTokenAssociatedTokenAddress(testOwner, testMint)
      expect(ata).toBeDefined()
      expect(typeof ata).toBe('string')
      expect(ata.length).toBe(44) // Base58 length for Solana address
    })

    it('should derive ATA for Token 2022', async () => {
      const ata = await deriveToken2022AssociatedTokenAddress(testOwner, testMint2022)
      expect(ata).toBeDefined()
      expect(typeof ata).toBe('string')
      expect(ata.length).toBe(44)
    })

    it('should derive different ATAs for different token programs', async () => {
      const splAta = await deriveSplTokenAssociatedTokenAddress(testOwner, testMint)
      const token2022Ata = await deriveToken2022AssociatedTokenAddress(testOwner, testMint)
      
      expect(splAta).not.toBe(token2022Ata)
    })

    it('should derive ATA with custom token program', async () => {
      const ata1 = await deriveAssociatedTokenAddress(testOwner, testMint, TOKEN_PROGRAM_ADDRESS)
      const ata2 = await deriveAssociatedTokenAddress(testOwner, testMint, TOKEN_2022_PROGRAM_ADDRESS)
      
      expect(ata1).not.toBe(ata2)
    })

    it('should get complete ATA information', async () => {
      const ataInfo = await getAssociatedTokenAccount(testOwner, testMint, TOKEN_PROGRAM_ADDRESS)
      
      expect(ataInfo).toMatchObject({
        owner: testOwner,
        mint: testMint,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
        isToken2022: false
      })
      expect(ataInfo.address).toBeDefined()
    })

    it('should get all possible ATA addresses', async () => {
      const addresses = await getAllAssociatedTokenAddresses(testOwner, testMint)
      
      expect(addresses).toHaveProperty('splToken')
      expect(addresses).toHaveProperty('token2022')
      expect(addresses.splToken).not.toBe(addresses.token2022)
    })

    it('should validate ATA addresses', async () => {
      const splAta = await deriveSplTokenAssociatedTokenAddress(testOwner, testMint)
      const result = await validateAssociatedTokenAddress(splAta, testOwner, testMint)
      
      expect(result.isValid).toBe(true)
      expect(result.program).toBe(TOKEN_PROGRAM_ADDRESS)
    })

    it('should reject invalid ATA addresses', async () => {
      const invalidAta = address('44444444444444444444444444444444')
      const result = await validateAssociatedTokenAddress(invalidAta, testOwner, testMint)
      
      expect(result.isValid).toBe(false)
      expect(result.program).toBeUndefined()
    })
  })

  describe('Token Program Utilities', () => {
    it('should convert TokenProgram enum to address', () => {
      expect(getTokenProgramAddress(TokenProgram.SPL_TOKEN)).toBe(TOKEN_PROGRAM_ADDRESS)
      expect(getTokenProgramAddress(TokenProgram.TOKEN_2022)).toBe(TOKEN_2022_PROGRAM_ADDRESS)
    })

    it('should convert address to TokenProgram enum', () => {
      expect(getTokenProgramFromAddress(TOKEN_PROGRAM_ADDRESS)).toBe(TokenProgram.SPL_TOKEN)
      expect(getTokenProgramFromAddress(TOKEN_2022_PROGRAM_ADDRESS)).toBe(TokenProgram.TOKEN_2022)
    })

    it('should throw on unknown token program address', () => {
      const unknownAddress = address('55555555555555555555555555555555')
      expect(() => getTokenProgramFromAddress(unknownAddress)).toThrow()
    })
  })

  describe('Amount Formatting', () => {
    it('should format token amounts correctly', () => {
      expect(formatTokenAmount(1000000n, 6)).toBe('1')
      expect(formatTokenAmount(1500000n, 6)).toBe('1.5')
      expect(formatTokenAmount(1234567n, 6)).toBe('1.234567')
      expect(formatTokenAmount(100n, 2)).toBe('1')
      expect(formatTokenAmount(150n, 2)).toBe('1.5')
    })

    it('should parse token amounts correctly', () => {
      expect(parseTokenAmount('1', 6)).toBe(1000000n)
      expect(parseTokenAmount('1.5', 6)).toBe(1500000n)
      expect(parseTokenAmount('1.234567', 6)).toBe(1234567n)
      expect(parseTokenAmount('1', 2)).toBe(100n)
      expect(parseTokenAmount('1.5', 2)).toBe(150n)
    })

    it('should handle edge cases in formatting', () => {
      expect(formatTokenAmount(0n, 6)).toBe('0')
      expect(formatTokenAmount(1n, 6)).toBe('0.000001')
      expect(parseTokenAmount('0', 6)).toBe(0n)
      expect(parseTokenAmount('0.000001', 6)).toBe(1n)
    })
  })

  describe('Transfer Fee Calculations', () => {
    const feeConfig = {
      transferFeeBasisPoints: 250, // 2.5%
      maximumFee: 1000000n, // 1 token max
      transferFeeConfigAuthority: null,
      withdrawWithheldAuthority: null
    }

    it('should calculate transfer fees correctly', () => {
      const result = calculateTransferFee(10000000n, feeConfig) // 10 tokens
      
      expect(result.transferAmount).toBe(10000000n)
      expect(result.feeAmount).toBe(250000n) // 2.5% of 10 tokens
      expect(result.netAmount).toBe(9750000n) // 10 - 0.25 = 9.75 tokens
      expect(result.feeBasisPoints).toBe(250)
      expect(result.wasFeeCapped).toBe(false)
    })

    it('should cap fees at maximum', () => {
      const result = calculateTransferFee(100000000n, feeConfig) // 100 tokens
      
      expect(result.transferAmount).toBe(100000000n)
      expect(result.feeAmount).toBe(1000000n) // Capped at 1 token
      expect(result.netAmount).toBe(99000000n) // 100 - 1 = 99 tokens
      expect(result.wasFeeCapped).toBe(true)
    })

    it('should calculate required amount for net transfer', () => {
      const result = calculateRequiredAmountForNetTransfer(9750000n, feeConfig)
      
      expect(result.netAmount).toBe(9750000n)
      expect(result.feeAmount).toBeGreaterThan(0n)
      expect(result.transferAmount).toBeGreaterThan(9750000n)
    })

    it('should estimate accumulated fees', () => {
      const transfers = [1000000n, 2000000n, 3000000n] // 1, 2, 3 tokens
      const result = estimateAccumulatedFees(transfers, feeConfig)
      
      expect(result.feeBreakdown).toHaveLength(3)
      expect(result.totalFees).toBeGreaterThan(0n)
      
      // Check individual calculations
      expect(result.feeBreakdown[0].feeAmount).toBe(25000n) // 2.5% of 1 token
      expect(result.feeBreakdown[1].feeAmount).toBe(50000n) // 2.5% of 2 tokens
      expect(result.feeBreakdown[2].feeAmount).toBe(75000n) // 2.5% of 3 tokens
      
      expect(result.totalFees).toBe(150000n) // Sum of all fees
    })
  })

  describe('Interest Calculations', () => {
    const interestConfig = {
      rateAuthority: null,
      currentRate: 500, // 5% annual rate
      lastUpdateTimestamp: 0n,
      preUpdateAverageRate: 500
    }

    it('should calculate simple interest', () => {
      const oneYear = 365n * 24n * 60n * 60n // seconds in a year
      const result = calculateInterest(10000000n, interestConfig, oneYear)
      
      expect(result.principal).toBe(10000000n)
      expect(result.annualRateBasisPoints).toBe(500)
      expect(result.timePeriodSeconds).toBe(oneYear)
      expect(result.interestAmount).toBe(500000n) // 5% of 10 tokens
      expect(result.newBalance).toBe(10500000n) // 10 + 0.5 = 10.5 tokens
    })

    it('should calculate compound interest', () => {
      const result = calculateCompoundInterest(
        10000000n, // 10 tokens
        500,       // 5% annual rate
        4,         // quarterly compounding
        1          // 1 year
      )
      
      expect(result.principal).toBe(10000000n)
      expect(result.interestAmount).toBeGreaterThan(500000n) // More than simple interest
      expect(result.newBalance).toBeGreaterThan(10500000n)
      expect(result.effectiveAnnualRate).toBeGreaterThan(5) // Effective rate > nominal rate
    })
  })

  describe('Token Account State', () => {
    it('should allow transfers for initialized accounts', () => {
      expect(canTransfer(TokenAccountState.INITIALIZED)).toBe(true)
    })

    it('should not allow transfers for uninitialized accounts', () => {
      expect(canTransfer(TokenAccountState.UNINITIALIZED)).toBe(false)
    })

    it('should not allow transfers for frozen accounts', () => {
      expect(canTransfer(TokenAccountState.INITIALIZED, false, true)).toBe(false)
    })

    it('should not allow transfers for non-transferable tokens', () => {
      expect(canTransfer(TokenAccountState.INITIALIZED, true)).toBe(false)
    })

    it('should get required extensions with dependencies', () => {
      const extensions = [TokenExtension.TRANSFER_FEE_AMOUNT]
      const required = getRequiredExtensions(extensions)
      
      expect(required).toContain(TokenExtension.TRANSFER_FEE_AMOUNT)
      expect(required).toContain(TokenExtension.TRANSFER_FEE_CONFIG)
    })
  })

  describe('Basis Points Utilities', () => {
    it('should convert basis points to percentage', () => {
      expect(basisPointsToPercentage(1000)).toBe(0.1) // 10%
      expect(basisPointsToPercentage(500)).toBe(0.05) // 5%
      expect(basisPointsToPercentage(10000)).toBe(1) // 100%
    })

    it('should convert percentage to basis points', () => {
      expect(percentageToBasisPoints(0.1)).toBe(1000) // 10%
      expect(percentageToBasisPoints(0.05)).toBe(500) // 5%
      expect(percentageToBasisPoints(1)).toBe(10000) // 100%
    })

    it('should format basis points as readable percentage', () => {
      expect(formatBasisPoints(1000)).toBe('10.00%')
      expect(formatBasisPoints(500)).toBe('5.00%')
      expect(formatBasisPoints(250)).toBe('2.50%')
    })
  })

  describe('Compute Unit Estimation', () => {
    it('should estimate compute units for basic operations', () => {
      expect(estimateComputeUnits('transfer')).toBe(15000n)
      expect(estimateComputeUnits('create_account')).toBe(25000n)
      expect(estimateComputeUnits('mint')).toBe(10000n)
      expect(estimateComputeUnits('burn')).toBe(10000n)
    })

    it('should add compute units for extensions', () => {
      const extensions = [TokenExtension.TRANSFER_FEE_CONFIG]
      const baseUnits = estimateComputeUnits('transfer', [])
      const withExtensions = estimateComputeUnits('transfer', extensions)
      
      expect(withExtensions).toBeGreaterThan(baseUnits)
    })

    it('should account for expensive extensions', () => {
      const confidentialExtensions = [TokenExtension.CONFIDENTIAL_TRANSFER_ACCOUNT]
      const result = estimateComputeUnits('transfer', confidentialExtensions)
      
      expect(result).toBeGreaterThan(50000n) // ZK proofs are expensive
    })
  })

  describe('Integration Tests', () => {
    it('should handle complete ATA derivation workflow', async () => {
      // Simulate a complete workflow for Token 2022
      const owner = address('66666666666666666666666666666666')
      const mint = address('77777777777777777777777777777777')
      
      // Get ATA info
      const ataInfo = await getAssociatedTokenAccount(owner, mint, TOKEN_2022_PROGRAM_ADDRESS)
      expect(ataInfo.isToken2022).toBe(true)
      
      // Validate the derived address
      const validation = await validateAssociatedTokenAddress(ataInfo.address, owner, mint)
      expect(validation.isValid).toBe(true)
      expect(validation.program).toBe(TOKEN_2022_PROGRAM_ADDRESS)
      
      // Get all possible addresses
      const allAddresses = await getAllAssociatedTokenAddresses(owner, mint)
      expect(allAddresses.token2022).toBe(ataInfo.address)
      expect(allAddresses.splToken).not.toBe(ataInfo.address)
    })

    it('should handle fee calculation workflow', () => {
      const amount = 5000000n // 5 tokens
      const feeConfig = {
        transferFeeBasisPoints: 100, // 1%
        maximumFee: 100000n, // 0.1 token max
        transferFeeConfigAuthority: null,
        withdrawWithheldAuthority: null
      }
      
      // Calculate fees
      const feeCalc = calculateTransferFee(amount, feeConfig)
      expect(feeCalc.feeAmount).toBe(50000n) // 1% of 5 tokens = 0.05 tokens
      
      // Format the amounts for display
      const formattedAmount = formatTokenAmount(feeCalc.transferAmount, 6)
      const formattedFee = formatTokenAmount(feeCalc.feeAmount, 6)
      const formattedNet = formatTokenAmount(feeCalc.netAmount, 6)
      
      expect(formattedAmount).toBe('5')
      expect(formattedFee).toBe('0.05')
      expect(formattedNet).toBe('4.95')
      
      // Format fee rate
      const feeRate = formatBasisPoints(feeConfig.transferFeeBasisPoints)
      expect(feeRate).toBe('1.00%')
    })
  })
})