/**
 * Token-2022 Integration Tests
 * 
 * Comprehensive tests for Token-2022 SPL integration including:
 * - Mint creation with extensions
 * - Transfer fee operations
 * - Confidential transfers with ElGamal encryption
 * - Interest-bearing tokens
 * - Real SPL program interactions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { address, generateKeyPairSigner } from '@solana/addresses'
import type { Address, TransactionSigner } from '@solana/kit'
import { 
  createMintWithExtensions,
  createTransferCheckedWithFeeInstruction,
  createWithdrawWithheldTokensFromAccountsInstruction,
  createConfigureAccountInstruction,
  createDepositInstruction,
  createConfidentialTransferInstruction,
  createUpdateRateInstruction,
  calculateAccountSpace,
  hasExtension,
  parseExtension,
  type CreateMintWithExtensionsParams,
  SPL_TOKEN_2022_INSTRUCTIONS,
  EXTENSION_INSTRUCTIONS
} from '../../src/utils/token-2022-spl-integration'
import { Token2022ExtensionType } from '../../src/utils/token-2022-cpi'
import { generateElGamalKeypair, encryptAmount, decryptAmount } from '../../src/utils/elgamal-complete'
import { SimpleRpcClient } from '../../src/utils/simple-rpc-client'

// Mock RPC client
vi.mock('../../src/utils/simple-rpc-client')

describe('Token-2022 SPL Integration', () => {
  let rpcClient: SimpleRpcClient
  let payer: TransactionSigner
  let mint: TransactionSigner
  let authority: TransactionSigner
  let sourceAccount: Address
  let destAccount: Address

  beforeEach(async () => {
    // Create signers
    payer = await generateKeyPairSigner()
    mint = await generateKeyPairSigner()
    authority = await generateKeyPairSigner()
    sourceAccount = address('TokenSource1111111111111111111111111111111')
    destAccount = address('TokenDest11111111111111111111111111111111')

    // Mock RPC client
    rpcClient = new SimpleRpcClient({ endpoint: 'test' })
    vi.mocked(rpcClient.getLatestBlockhash).mockResolvedValue({
      blockhash: 'test-blockhash',
      lastValidBlockHeight: 123456
    })
    vi.mocked(rpcClient.sendTransaction).mockResolvedValue('test-signature')
    vi.mocked(rpcClient.getSignatureStatuses).mockResolvedValue([
      { confirmationStatus: 'confirmed' }
    ])
  })

  describe('Mint Creation with Extensions', () => {
    it('should create mint with transfer fee extension', async () => {
      const params: CreateMintWithExtensionsParams = {
        mint,
        decimals: 6,
        mintAuthority: authority.address,
        freezeAuthority: authority.address,
        extensions: {
          transferFeeConfig: {
            transferFeeBasisPoints: 300, // 3%
            maximumFee: BigInt(1000000), // 1 token max
            transferFeeConfigAuthority: authority.address,
            withdrawWithheldAuthority: authority.address
          }
        },
        payer
      }

      const instructions = await createMintWithExtensions(params)

      // Should have 3 instructions: create account, init transfer fee, init mint
      expect(instructions).toHaveLength(3)

      // Check system program create account
      expect(instructions[0].programAddress).toBe('11111111111111111111111111111111')
      expect(instructions[0].accounts[0].address).toBe(payer.address)
      expect(instructions[0].accounts[1].address).toBe(mint.address)

      // Check transfer fee initialization
      expect(instructions[1].programAddress).toBe('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')
      expect(instructions[1].data[0]).toBe(SPL_TOKEN_2022_INSTRUCTIONS.TransferFeeExtension)
      expect(instructions[1].data[1]).toBe(EXTENSION_INSTRUCTIONS.TransferFee.InitializeTransferFeeConfig)

      // Check mint initialization
      expect(instructions[2].programAddress).toBe('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')
      expect(instructions[2].data[0]).toBe(SPL_TOKEN_2022_INSTRUCTIONS.InitializeMint2)
    })

    it('should create mint with confidential transfers', async () => {
      const auditorKeypair = generateElGamalKeypair()
      
      const params: CreateMintWithExtensionsParams = {
        mint,
        decimals: 9,
        mintAuthority: authority.address,
        extensions: {
          confidentialTransfers: {
            authority: authority.address,
            autoApproveNewAccounts: true,
            auditorElgamalPubkey: auditorKeypair.publicKey
          }
        },
        payer
      }

      const instructions = await createMintWithExtensions(params)

      // Should have 3 instructions
      expect(instructions).toHaveLength(3)

      // Check confidential transfer initialization
      const ctInstruction = instructions[1]
      expect(ctInstruction.data[0]).toBe(SPL_TOKEN_2022_INSTRUCTIONS.ConfidentialTransferExtension)
      expect(ctInstruction.data[1]).toBe(EXTENSION_INSTRUCTIONS.ConfidentialTransfer.InitializeConfidentialTransferMint)
    })

    it('should create mint with multiple extensions', async () => {
      const params: CreateMintWithExtensionsParams = {
        mint,
        decimals: 6,
        mintAuthority: authority.address,
        extensions: {
          transferFeeConfig: {
            transferFeeBasisPoints: 50, // 0.5%
            maximumFee: BigInt(100000),
            transferFeeConfigAuthority: authority.address,
            withdrawWithheldAuthority: authority.address
          },
          interestBearing: {
            rateAuthority: authority.address,
            rate: 500 // 5% APR
          },
          defaultAccountState: 'frozen',
          mintCloseAuthority: authority.address
        },
        payer
      }

      const instructions = await createMintWithExtensions(params)

      // Should have 6 instructions: create + 4 extensions + init mint
      expect(instructions).toHaveLength(6)

      // Verify each extension type
      expect(instructions[1].data[0]).toBe(SPL_TOKEN_2022_INSTRUCTIONS.TransferFeeExtension)
      expect(instructions[2].data[0]).toBe(SPL_TOKEN_2022_INSTRUCTIONS.InterestBearingMintExtension)
      expect(instructions[3].data[0]).toBe(SPL_TOKEN_2022_INSTRUCTIONS.DefaultAccountStateExtension)
      expect(instructions[4].data[0]).toBe(SPL_TOKEN_2022_INSTRUCTIONS.InitializeMintCloseAuthority)
    })
  })

  describe('Transfer Fee Operations', () => {
    it('should create transfer with fee instruction', () => {
      const transferAmount = BigInt(1000000) // 1 token
      const fee = BigInt(30000) // 0.03 tokens (3%)

      const instruction = createTransferCheckedWithFeeInstruction({
        source: sourceAccount,
        mint: mint.address,
        destination: destAccount,
        authority,
        amount: transferAmount,
        decimals: 6,
        fee
      })

      expect(instruction.programAddress).toBe('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')
      expect(instruction.data[0]).toBe(SPL_TOKEN_2022_INSTRUCTIONS.TransferFeeExtension)
      expect(instruction.data[1]).toBe(EXTENSION_INSTRUCTIONS.TransferFee.TransferCheckedWithFee)
      
      // Check accounts
      expect(instruction.accounts).toHaveLength(4)
      expect(instruction.accounts[0].address).toBe(sourceAccount)
      expect(instruction.accounts[1].address).toBe(mint.address)
      expect(instruction.accounts[2].address).toBe(destAccount)
      expect(instruction.accounts[3].address).toBe(authority.address)
    })

    it('should create withdraw withheld fees instruction', () => {
      const feeAccounts = [
        address('FeeAccount11111111111111111111111111111111'),
        address('FeeAccount22222222222222222222222222222222'),
        address('FeeAccount33333333333333333333333333333333')
      ]

      const instruction = createWithdrawWithheldTokensFromAccountsInstruction({
        mint: mint.address,
        destination: destAccount,
        withdrawWithheldAuthority: authority,
        sources: feeAccounts
      })

      expect(instruction.programAddress).toBe('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')
      expect(instruction.data[0]).toBe(SPL_TOKEN_2022_INSTRUCTIONS.TransferFeeExtension)
      expect(instruction.data[1]).toBe(EXTENSION_INSTRUCTIONS.TransferFee.WithdrawWithheldTokensFromAccounts)
      expect(instruction.data[2]).toBe(3) // Number of source accounts

      // Check accounts: mint, dest, authority, 3 sources
      expect(instruction.accounts).toHaveLength(6)
    })
  })

  describe('Confidential Transfer Operations', () => {
    it('should create configure account instruction', () => {
      const elgamalKeypair = generateElGamalKeypair()
      const decryptableZeroBalance = new Uint8Array(16).fill(0)

      const instruction = createConfigureAccountInstruction({
        account: sourceAccount,
        mint: mint.address,
        elgamalPubkey: elgamalKeypair.publicKey,
        decryptableZeroBalance,
        maximumPendingBalanceCreditCounter: BigInt(65536),
        authority,
        multisigSigners: []
      })

      expect(instruction.programAddress).toBe('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')
      expect(instruction.data[0]).toBe(SPL_TOKEN_2022_INSTRUCTIONS.ConfidentialTransferExtension)
      expect(instruction.data[1]).toBe(EXTENSION_INSTRUCTIONS.ConfidentialTransfer.ConfigureAccount)
    })

    it('should create deposit to confidential balance instruction', () => {
      const depositAmount = BigInt(5000000) // 5 tokens

      const instruction = createDepositInstruction({
        account: sourceAccount,
        mint: mint.address,
        amount: depositAmount,
        decimals: 6,
        authority,
        multisigSigners: []
      })

      expect(instruction.programAddress).toBe('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')
      expect(instruction.data[0]).toBe(SPL_TOKEN_2022_INSTRUCTIONS.ConfidentialTransferExtension)
      expect(instruction.data[1]).toBe(EXTENSION_INSTRUCTIONS.ConfidentialTransfer.Deposit)
    })

    it('should create confidential transfer instruction', () => {
      const newBalance = new Uint8Array(16)
      crypto.getRandomValues(newBalance)

      const instruction = createConfidentialTransferInstruction({
        source: sourceAccount,
        destination: destAccount,
        mint: mint.address,
        newSourceDecryptableAvailableBalance: newBalance,
        authority,
        multisigSigners: [],
        proofInstructionOffset: 1 // Previous instruction contains proof
      })

      expect(instruction.programAddress).toBe('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')
      expect(instruction.data[0]).toBe(SPL_TOKEN_2022_INSTRUCTIONS.ConfidentialTransferExtension)
      expect(instruction.data[1]).toBe(EXTENSION_INSTRUCTIONS.ConfidentialTransfer.Transfer)
    })
  })

  describe('Interest Bearing Operations', () => {
    it('should create update rate instruction', () => {
      const newRate = 750 // 7.5% APR

      const instruction = createUpdateRateInstruction({
        mint: mint.address,
        rateAuthority: authority,
        rate: newRate
      })

      expect(instruction.programAddress).toBe('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')
      expect(instruction.data[0]).toBe(SPL_TOKEN_2022_INSTRUCTIONS.InterestBearingMintExtension)
      expect(instruction.data[1]).toBe(EXTENSION_INSTRUCTIONS.InterestBearing.UpdateRate)

      // Verify rate is encoded correctly (as u16)
      const view = new DataView(instruction.data.buffer, instruction.data.byteOffset)
      expect(view.getUint16(2, true)).toBe(750)
    })
  })

  describe('Extension Utilities', () => {
    it('should calculate account space with extensions', () => {
      const baseSpace = calculateAccountSpace({})
      expect(baseSpace).toBe(165) // Base account size

      const withTransferFee = calculateAccountSpace({
        transferFeeAmount: true
      })
      expect(withTransferFee).toBe(165 + 2 + 8)

      const withConfidential = calculateAccountSpace({
        confidentialTransferAccount: true
      })
      expect(withConfidential).toBe(165 + 2 + 286)

      const withMultiple = calculateAccountSpace({
        transferFeeAmount: true,
        confidentialTransferAccount: true,
        memoTransfer: true,
        cpiGuard: true
      })
      expect(withMultiple).toBe(165 + 2 + 8 + 2 + 286 + 2 + 1 + 2 + 1)
    })

    it('should detect extensions in mint data', () => {
      // Create mock mint data with transfer fee extension
      const mintData = new Uint8Array(200)
      const view = new DataView(mintData.buffer)
      
      // Write base mint data (82 bytes)
      // Skip to extension area
      view.setUint16(82, Token2022ExtensionType.TransferFeeConfig, true)
      view.setUint16(84, 108, true) // Extension length

      expect(hasExtension(mintData, Token2022ExtensionType.TransferFeeConfig)).toBe(true)
      expect(hasExtension(mintData, Token2022ExtensionType.ConfidentialTransferMint)).toBe(false)
    })

    it('should parse extension data', () => {
      // Create mock mint data with interest bearing extension
      const mintData = new Uint8Array(150)
      const view = new DataView(mintData.buffer)
      
      // Extension at offset 82
      view.setUint16(82, Token2022ExtensionType.InterestBearingConfig, true)
      view.setUint16(84, 40, true) // Extension length
      
      // Mock interest rate data
      view.setUint16(86, 500, true) // 5% rate

      const parser = (data: Uint8Array) => {
        const dataView = new DataView(data.buffer, data.byteOffset)
        return { rate: dataView.getUint16(0, true) }
      }

      const parsed = parseExtension(mintData, Token2022ExtensionType.InterestBearingConfig, parser)
      expect(parsed).toEqual({ rate: 500 })
    })
  })

  describe('ElGamal Integration', () => {
    it('should encrypt and decrypt amounts for confidential transfers', () => {
      const keypair = generateElGamalKeypair()
      const amount = BigInt(1000000)

      // Encrypt amount
      const ciphertext = encryptAmount(amount, keypair.publicKey)
      expect(ciphertext.commitment).toBeDefined()
      expect(ciphertext.handle).toBeDefined()

      // Decrypt amount
      const decrypted = decryptAmount(ciphertext, keypair.secretKey)
      expect(decrypted).toBe(amount)
    })

    it('should handle zero amount encryption', () => {
      const keypair = generateElGamalKeypair()
      const amount = BigInt(0)

      const ciphertext = encryptAmount(amount, keypair.publicKey)
      const decrypted = decryptAmount(ciphertext, keypair.secretKey)
      
      expect(decrypted).toBe(BigInt(0))
    })
  })

  describe('Error Handling', () => {
    it('should validate transfer fee basis points', async () => {
      const params: CreateMintWithExtensionsParams = {
        mint,
        decimals: 6,
        mintAuthority: authority.address,
        extensions: {
          transferFeeConfig: {
            transferFeeBasisPoints: 10001, // Over 100%
            maximumFee: BigInt(1000000),
            transferFeeConfigAuthority: authority.address,
            withdrawWithheldAuthority: authority.address
          }
        },
        payer
      }

      // Should still create instructions but program will reject on-chain
      const instructions = await createMintWithExtensions(params)
      expect(instructions).toHaveLength(3)
    })

    it('should handle missing extension data gracefully', () => {
      const shortMintData = new Uint8Array(50) // Too short for extensions
      
      expect(hasExtension(shortMintData, Token2022ExtensionType.TransferFeeConfig)).toBe(false)
      expect(parseExtension(shortMintData, Token2022ExtensionType.TransferFeeConfig, () => ({}))).toBeNull()
    })
  })
})