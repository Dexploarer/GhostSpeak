import { describe, it, expect, beforeEach, vi } from 'vitest'
import { address } from '@solana/addresses'
import {
  createInitializeMintInstruction,
  createMintToInstruction,
  createTransferCheckedInstruction,
  createTransferCheckedWithFeeInstruction,
  createConfidentialTransferInstruction,
  createAssociatedTokenAccountInstruction,
  calculateTransferFee,
  getAssociatedTokenAddress,
  createInitializeMintWithExtensionsInstructions,
  TOKEN_2022_PROGRAM_ADDRESS,
  ATA_PROGRAM_ADDRESS,
  TokenInstruction,
  ExtensionType,
  type CreateMintInstructionParams,
  type MintToInstructionParams,
  type TransferInstructionParams,
  type TransferWithFeeParams,
  type ConfidentialTransferParams
} from '../../../src/utils/token-2022-cpi-enhanced.js'
import type { TransactionSigner } from '@solana/kit'

describe('Token-2022 CPI Enhanced', () => {
  let payer: TransactionSigner
  let mintAuthority: TransactionSigner
  let owner: TransactionSigner
  let mint: ReturnType<typeof address>
  let sourceAccount: ReturnType<typeof address>
  let destAccount: ReturnType<typeof address>

  beforeEach(() => {
    // Setup test addresses and signers using valid base58 addresses
    payer = {
      address: address('11111111111111111111111111111112'),
      signAndSendTransactions: async () => { throw new Error('Mock signer') }
    }
    
    mintAuthority = {
      address: address('11111111111111111111111111111113'),
      signAndSendTransactions: async () => { throw new Error('Mock signer') }
    }
    
    owner = {
      address: address('11111111111111111111111111111114'),
      signAndSendTransactions: async () => { throw new Error('Mock signer') }
    }
    
    mint = address('11111111111111111111111111111115')
    sourceAccount = address('11111111111111111111111111111116')
    destAccount = address('11111111111111111111111111111117')
  })

  describe('Mint Instructions', () => {
    it('should create initialize mint instruction', () => {
      const params: CreateMintInstructionParams = {
        mint,
        mintAuthority: mintAuthority.address,
        freezeAuthority: address('11111111111111111111111111111118'),
        decimals: 9,
        payer
      }

      const instruction = createInitializeMintInstruction(params)

      expect(instruction.programAddress).toBe(TOKEN_2022_PROGRAM_ADDRESS)
      expect(instruction.accounts).toHaveLength(2)
      expect(instruction.accounts[0].address).toBe(mint)
      expect(instruction.accounts[0].role).toBe(2) // WritableNonSigner
      expect(instruction.data[0]).toBe(TokenInstruction.InitializeMint)
      expect(instruction.data[1]).toBe(9) // decimals
    })

    it('should create mint to instruction', () => {
      const params: MintToInstructionParams = {
        mint,
        destination: destAccount,
        authority: mintAuthority,
        amount: 1000000n
      }

      const instruction = createMintToInstruction(params)

      expect(instruction.programAddress).toBe(TOKEN_2022_PROGRAM_ADDRESS)
      expect(instruction.accounts).toHaveLength(3)
      expect(instruction.accounts[0].address).toBe(mint)
      expect(instruction.accounts[1].address).toBe(destAccount)
      expect(instruction.accounts[2].address).toBe(mintAuthority.address)
      expect(instruction.data[0]).toBe(TokenInstruction.MintTo)
      
      // Check amount encoding (little-endian)
      const amountView = new DataView(instruction.data.buffer, 1, 8)
      expect(amountView.getBigUint64(0, true)).toBe(1000000n)
    })

    it('should create mint with extensions', () => {
      const instructions = createInitializeMintWithExtensionsInstructions(
        mint,
        mintAuthority.address,
        undefined,
        6,
        payer,
        {
          transferFeeConfig: {
            transferFeeConfigAuthority: address('11111111111111111111111111111119'),
            withdrawWithheldAuthority: address('1111111111111111111111111111111A'),
            transferFeeBasisPoints: 50, // 0.5%
            maximumFee: 1000000n
          },
          defaultAccountState: {
            state: 'frozen'
          },
          confidentialTransferMint: {
            authority: address('1111111111111111111111111111111B'),
            autoApproveNewAccounts: true,
            auditorElgamalPubkey: new Uint8Array(32).fill(42)
          }
        }
      )

      expect(instructions).toHaveLength(4) // 3 extensions + mint init
      expect(instructions[0].data[0]).toBe(TokenInstruction.TransferFeeExtension)
      expect(instructions[1].data[0]).toBe(TokenInstruction.DefaultAccountStateExtension)
      expect(instructions[2].data[0]).toBe(TokenInstruction.ConfidentialTransferExtension)
      expect(instructions[3].data[0]).toBe(TokenInstruction.InitializeMint)
    })
  })

  describe('Transfer Instructions', () => {
    it('should create transfer checked instruction', () => {
      const params: TransferInstructionParams = {
        source: sourceAccount,
        destination: destAccount,
        owner,
        amount: 500000n,
        mint,
        decimals: 6
      }

      const instruction = createTransferCheckedInstruction(params)

      expect(instruction.programAddress).toBe(TOKEN_2022_PROGRAM_ADDRESS)
      expect(instruction.accounts).toHaveLength(4)
      expect(instruction.accounts[0].address).toBe(sourceAccount)
      expect(instruction.accounts[1].address).toBe(mint)
      expect(instruction.accounts[2].address).toBe(destAccount)
      expect(instruction.accounts[3].address).toBe(owner.address)
      expect(instruction.data[0]).toBe(TokenInstruction.TransferChecked)
      
      // Check amount and decimals
      const amountView = new DataView(instruction.data.buffer, 1, 8)
      expect(amountView.getBigUint64(0, true)).toBe(500000n)
      expect(instruction.data[9]).toBe(6) // decimals
    })

    it('should create transfer with fee instruction', () => {
      const params: TransferWithFeeParams = {
        source: sourceAccount,
        destination: destAccount,
        owner,
        amount: 1000000n,
        mint,
        decimals: 6,
        expectedFee: 5000n
      }

      const instruction = createTransferCheckedWithFeeInstruction(params)

      expect(instruction.programAddress).toBe(TOKEN_2022_PROGRAM_ADDRESS)
      expect(instruction.data[0]).toBe(TokenInstruction.TransferFeeExtension)
      expect(instruction.data[1]).toBe(0) // TransferCheckedWithFee sub-instruction
      
      // Check amount and fee encoding
      const dataView = new DataView(instruction.data.buffer)
      expect(dataView.getBigUint64(2, true)).toBe(1000000n) // amount
      expect(dataView.getBigUint64(11, true)).toBe(5000n) // fee
    })

    it('should create confidential transfer instruction', () => {
      const proofContext = address('1111111111111111111111111111111C')
      const params: ConfidentialTransferParams = {
        source: sourceAccount,
        destination: destAccount,
        owner,
        mint,
        proofContext
      }

      const instruction = createConfidentialTransferInstruction(params)

      expect(instruction.programAddress).toBe(TOKEN_2022_PROGRAM_ADDRESS)
      expect(instruction.accounts).toHaveLength(5)
      expect(instruction.accounts[4].address).toBe(proofContext)
      expect(instruction.data[0]).toBe(TokenInstruction.ConfidentialTransferExtension)
      expect(instruction.data[1]).toBe(1) // Transfer sub-instruction
    })

    it('should include context state account when provided', () => {
      const proofContext = address('1111111111111111111111111111111C')
      const contextState = address('1111111111111111111111111111111D')
      
      const params: ConfidentialTransferParams = {
        source: sourceAccount,
        destination: destAccount,
        owner,
        mint,
        proofContext,
        contextStateAccount: contextState
      }

      const instruction = createConfidentialTransferInstruction(params)

      expect(instruction.accounts).toHaveLength(6)
      expect(instruction.accounts[5].address).toBe(contextState)
    })
  })

  describe('Associated Token Account', () => {
    it('should create ATA instruction', () => {
      const associatedToken = address('1111111111111111111111111111111E')
      
      const instruction = createAssociatedTokenAccountInstruction({
        owner: owner.address,
        mint,
        payer,
        associatedToken
      })

      expect(instruction.programAddress).toBe(ATA_PROGRAM_ADDRESS)
      expect(instruction.accounts).toHaveLength(6)
      expect(instruction.accounts[0].address).toBe(payer.address)
      expect(instruction.accounts[0].role).toBe(3) // WritableSigner
      expect(instruction.accounts[1].address).toBe(associatedToken)
      expect(instruction.accounts[2].address).toBe(owner.address)
      expect(instruction.accounts[3].address).toBe(mint)
      expect(instruction.data).toHaveLength(0)
    })

    it('should derive ATA address', async () => {
      const ata = await getAssociatedTokenAddress(mint, owner.address)
      
      expect(ata).toBeDefined()
      expect(typeof ata).toBe('string')
      // The mock implementation creates a deterministic address from the inputs
    })
  })

  describe('Fee Calculations', () => {
    it('should calculate transfer fee correctly', () => {
      // 0.5% fee with 1M max
      const fee1 = calculateTransferFee(1000000n, 50, 1000000n)
      expect(fee1).toBe(5000n) // 0.5% of 1M = 5K

      // Fee capped at maximum
      const fee2 = calculateTransferFee(1000000000n, 50, 1000000n)
      expect(fee2).toBe(1000000n) // Capped at max

      // No fee
      const fee3 = calculateTransferFee(1000000n, 0, 1000000n)
      expect(fee3).toBe(0n)
    })
  })

  describe('Codec Encoding', () => {
    it('should properly encode addresses in instructions', () => {
      const instruction = createInitializeMintInstruction({
        mint,
        mintAuthority: mintAuthority.address,
        freezeAuthority: address('11111111111111111111111111111118'),
        decimals: 9,
        payer
      })

      // The data should contain properly encoded addresses
      expect(instruction.data.length).toBeGreaterThan(65) // At least instruction + decimals + 2 addresses
    })

    it('should encode optional addresses correctly', () => {
      const instruction = createInitializeMintInstruction({
        mint,
        mintAuthority: mintAuthority.address,
        freezeAuthority: undefined, // No freeze authority
        decimals: 9,
        payer
      })

      // Should encode None option properly
      expect(instruction.data).toBeDefined()
      expect(instruction.data.length).toBeGreaterThan(33) // At least instruction + decimals + mint authority + None
    })
  })

  describe('Error Cases', () => {
    it('should validate decimals in transfer checked', () => {
      const params: TransferInstructionParams = {
        source: sourceAccount,
        destination: destAccount,
        owner,
        amount: 500000n,
        mint,
        decimals: 255 // Max u8 value
      }

      const instruction = createTransferCheckedInstruction(params)
      expect(instruction.data[9]).toBe(255)
    })

    it('should handle large amounts', () => {
      const params: MintToInstructionParams = {
        mint,
        destination: destAccount,
        authority: mintAuthority,
        amount: 2n ** 64n - 1n // Max u64
      }

      const instruction = createMintToInstruction(params)
      const amountView = new DataView(instruction.data.buffer, 1, 8)
      expect(amountView.getBigUint64(0, true)).toBe(2n ** 64n - 1n)
    })
  })
})