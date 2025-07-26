import { describe, it, expect, beforeEach } from 'vitest'
import { address } from '@solana/addresses'
import {
  createVerifyTransferProofInstruction,
  createVerifyWithdrawProofInstruction,
  createVerifyRangeProofInstruction,
  createVerifyValidityProofInstruction,
  createVerifyEqualityProofInstruction,
  createVerifyTransferWithFeeProofInstruction,
  createCloseProofContextInstruction,
  createBatchVerifyRangeProofInstructions,
  createBatchVerifyValidityProofInstructions,
  createBatchVerifyEqualityProofInstructions,
  type ProofVerificationAccounts
} from '../../src/utils/zk-proof-instructions'
import {
  ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS,
  ProofInstruction,
  type TransferProofData,
  type WithdrawProofData,
  type TransferWithFeeProofData,
  PROOF_SIZES
} from '../../src/constants/zk-proof-program'
import type { TransactionSigner } from '@solana/kit'

describe('ZK Proof Instructions', () => {
  let proofContext: ReturnType<typeof address>
  let systemProgram: ReturnType<typeof address>
  let authority: TransactionSigner
  let accounts: ProofVerificationAccounts

  beforeEach(() => {
    // Setup test addresses
    proofContext = address('proofContext11111111111111111111111111111111')
    systemProgram = address('11111111111111111111111111111111')
    authority = {
      address: address('authority111111111111111111111111111111111'),
      signAndSendTransactions: async () => { throw new Error('Mock signer') }
    }
    
    accounts = {
      proofContext,
      systemProgram
    }
  })

  describe('createVerifyTransferProofInstruction', () => {
    it('should create a valid transfer proof verification instruction', () => {
      const proofData: TransferProofData = {
        encryptedTransferAmount: new Uint8Array(64),
        newSourceCommitment: new Uint8Array(32),
        equalityProof: new Uint8Array(192),
        validityProof: new Uint8Array(96),
        rangeProof: new Uint8Array(674)
      }

      const instruction = createVerifyTransferProofInstruction(accounts, proofData)

      expect(instruction.programAddress).toBe(ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS)
      expect(instruction.accounts).toHaveLength(2)
      expect(instruction.accounts[0].address).toBe(proofContext)
      expect(instruction.accounts[0].role).toBe(2) // WritableNonSigner
      expect(instruction.accounts[1].address).toBe(systemProgram)
      expect(instruction.accounts[1].role).toBe(0) // ReadonlyNonSigner
      expect(instruction.data).toBeInstanceOf(Uint8Array)
      expect(instruction.data[0]).toBe(ProofInstruction.VerifyTransfer)
    })

    it('should create instruction without system program', () => {
      const accountsNoSystem: ProofVerificationAccounts = { proofContext }
      const proofData: TransferProofData = {
        encryptedTransferAmount: new Uint8Array(64),
        newSourceCommitment: new Uint8Array(32),
        equalityProof: new Uint8Array(192),
        validityProof: new Uint8Array(96),
        rangeProof: new Uint8Array(674)
      }

      const instruction = createVerifyTransferProofInstruction(accountsNoSystem, proofData)

      expect(instruction.accounts).toHaveLength(1)
      expect(instruction.accounts[0].address).toBe(proofContext)
    })
  })

  describe('createVerifyWithdrawProofInstruction', () => {
    it('should create a valid withdraw proof verification instruction', () => {
      const proofData: WithdrawProofData = {
        encryptedWithdrawAmount: new Uint8Array(64),
        newSourceCommitment: new Uint8Array(32),
        equalityProof: new Uint8Array(192),
        rangeProof: new Uint8Array(674)
      }

      const instruction = createVerifyWithdrawProofInstruction(accounts, proofData)

      expect(instruction.programAddress).toBe(ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS)
      expect(instruction.accounts).toHaveLength(2)
      expect(instruction.data).toBeInstanceOf(Uint8Array)
      expect(instruction.data[0]).toBe(ProofInstruction.VerifyWithdraw)
    })
  })

  describe('createVerifyRangeProofInstruction', () => {
    it('should create a valid range proof verification instruction', () => {
      const commitment = new Uint8Array(32).fill(1)
      const rangeProof = new Uint8Array(674).fill(2)

      const instruction = createVerifyRangeProofInstruction(accounts, commitment, rangeProof)

      expect(instruction.programAddress).toBe(ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS)
      expect(instruction.accounts).toHaveLength(1)
      expect(instruction.accounts[0].address).toBe(proofContext)
      expect(instruction.data).toBeInstanceOf(Uint8Array)
      expect(instruction.data[0]).toBe(ProofInstruction.VerifyRangeProof)
      
      // Check that commitment is included in data
      const dataView = new Uint8Array(instruction.data)
      const commitmentStart = 1 // After instruction byte
      const commitmentEnd = commitmentStart + PROOF_SIZES.COMMITMENT
      expect(dataView.slice(commitmentStart, commitmentEnd)).toEqual(commitment)
    })
  })

  describe('createVerifyValidityProofInstruction', () => {
    it('should create a valid validity proof verification instruction', () => {
      const ciphertext = new Uint8Array(64).fill(3)
      const validityProof = new Uint8Array(96).fill(4)

      const instruction = createVerifyValidityProofInstruction(accounts, ciphertext, validityProof)

      expect(instruction.programAddress).toBe(ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS)
      expect(instruction.accounts).toHaveLength(1)
      expect(instruction.data).toBeInstanceOf(Uint8Array)
      expect(instruction.data[0]).toBe(ProofInstruction.VerifyValidityProof)
    })
  })

  describe('createVerifyEqualityProofInstruction', () => {
    it('should create a valid equality proof verification instruction', () => {
      const ciphertext1 = new Uint8Array(64).fill(5)
      const ciphertext2 = new Uint8Array(64).fill(6)
      const equalityProof = new Uint8Array(192).fill(7)

      const instruction = createVerifyEqualityProofInstruction(
        accounts,
        ciphertext1,
        ciphertext2,
        equalityProof
      )

      expect(instruction.programAddress).toBe(ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS)
      expect(instruction.accounts).toHaveLength(1)
      expect(instruction.data).toBeInstanceOf(Uint8Array)
      expect(instruction.data[0]).toBe(ProofInstruction.VerifyEqualityProof)
    })
  })

  describe('createVerifyTransferWithFeeProofInstruction', () => {
    it('should create a valid transfer with fee proof verification instruction', () => {
      const proofData: TransferWithFeeProofData = {
        transferProof: {
          encryptedTransferAmount: new Uint8Array(64),
          newSourceCommitment: new Uint8Array(32),
          equalityProof: new Uint8Array(192),
          validityProof: new Uint8Array(96),
          rangeProof: new Uint8Array(674)
        },
        encryptedFeeAmount: new Uint8Array(64),
        feeCommitment: new Uint8Array(32),
        feeValidityProof: new Uint8Array(96)
      }

      const instruction = createVerifyTransferWithFeeProofInstruction(accounts, proofData)

      expect(instruction.programAddress).toBe(ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS)
      expect(instruction.accounts).toHaveLength(2)
      expect(instruction.data).toBeInstanceOf(Uint8Array)
      expect(instruction.data[0]).toBe(ProofInstruction.VerifyTransferWithFee)
    })
  })

  describe('createCloseProofContextInstruction', () => {
    it('should create a valid close proof context instruction', () => {
      const rentRecipient = address('recipient1111111111111111111111111111111111')

      const instruction = createCloseProofContextInstruction(
        proofContext,
        authority,
        rentRecipient
      )

      expect(instruction.programAddress).toBe(ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS)
      expect(instruction.accounts).toHaveLength(3)
      expect(instruction.accounts[0].address).toBe(proofContext)
      expect(instruction.accounts[0].role).toBe(2) // WritableNonSigner
      expect(instruction.accounts[1].address).toBe(authority.address)
      expect(instruction.accounts[1].role).toBe(3) // WritableSigner
      expect(instruction.accounts[2].address).toBe(rentRecipient)
      expect(instruction.accounts[2].role).toBe(2) // WritableNonSigner
      expect(instruction.data).toBeInstanceOf(Uint8Array)
      expect(instruction.data[0]).toBe(ProofInstruction.CloseContextState)
    })
  })

  describe('Batch Instructions', () => {
    describe('createBatchVerifyRangeProofInstructions', () => {
      it('should create batch range proof instructions', () => {
        const proofs = [
          { commitment: new Uint8Array(32).fill(1), rangeProof: new Uint8Array(674).fill(2) },
          { commitment: new Uint8Array(32).fill(3), rangeProof: new Uint8Array(674).fill(4) },
          { commitment: new Uint8Array(32).fill(5), rangeProof: new Uint8Array(674).fill(6) }
        ]

        const instructions = createBatchVerifyRangeProofInstructions(accounts, proofs)

        expect(instructions).toHaveLength(1) // All fit in one instruction
        expect(instructions[0].programAddress).toBe(ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS)
        expect(instructions[0].data[0]).toBe(ProofInstruction.VerifyBatchedRangeProof)
      })

      it('should split large batches into multiple instructions', () => {
        const proofs = Array(10).fill(null).map((_, i) => ({
          commitment: new Uint8Array(32).fill(i),
          rangeProof: new Uint8Array(674).fill(i)
        }))

        const instructions = createBatchVerifyRangeProofInstructions(accounts, proofs)

        expect(instructions.length).toBeGreaterThan(1) // Should be split
        instructions.forEach(instruction => {
          expect(instruction.programAddress).toBe(ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS)
          expect(instruction.data[0]).toBe(ProofInstruction.VerifyBatchedRangeProof)
        })
      })
    })

    describe('createBatchVerifyValidityProofInstructions', () => {
      it('should create batch validity proof instructions', () => {
        const proofs = [
          { ciphertext: new Uint8Array(64).fill(1), validityProof: new Uint8Array(96).fill(2) },
          { ciphertext: new Uint8Array(64).fill(3), validityProof: new Uint8Array(96).fill(4) }
        ]

        const instructions = createBatchVerifyValidityProofInstructions(accounts, proofs)

        expect(instructions).toHaveLength(1)
        expect(instructions[0].programAddress).toBe(ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS)
        expect(instructions[0].data[0]).toBe(ProofInstruction.VerifyBatchedValidityProof)
      })
    })

    describe('createBatchVerifyEqualityProofInstructions', () => {
      it('should create individual equality proof instructions', () => {
        const proofs = [
          {
            ciphertext1: new Uint8Array(64).fill(1),
            ciphertext2: new Uint8Array(64).fill(2),
            equalityProof: new Uint8Array(192).fill(3)
          },
          {
            ciphertext1: new Uint8Array(64).fill(4),
            ciphertext2: new Uint8Array(64).fill(5),
            equalityProof: new Uint8Array(192).fill(6)
          }
        ]

        const instructions = createBatchVerifyEqualityProofInstructions(accounts, proofs)

        expect(instructions).toHaveLength(2) // One per proof (not batched)
        instructions.forEach(instruction => {
          expect(instruction.programAddress).toBe(ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS)
          expect(instruction.data[0]).toBe(ProofInstruction.VerifyEqualityProof)
        })
      })
    })
  })

  describe('Serialization', () => {
    it('should properly serialize transfer proof data', () => {
      const proofData: TransferProofData = {
        encryptedTransferAmount: new Uint8Array(64).fill(0xAB),
        newSourceCommitment: new Uint8Array(32).fill(0xCD),
        equalityProof: new Uint8Array(192).fill(0xEF),
        validityProof: new Uint8Array(96).fill(0x12),
        rangeProof: new Uint8Array(674).fill(0x34)
      }

      const instruction = createVerifyTransferProofInstruction(accounts, proofData)
      const data = new Uint8Array(instruction.data)

      // Check instruction discriminator
      expect(data[0]).toBe(ProofInstruction.VerifyTransfer)
      
      // Check that all proof components are included
      expect(data.length).toBeGreaterThan(
        1 + 64 + 32 + 192 + 96 + 674 // instruction + all proof components
      )
    })

    it('should properly serialize withdraw proof data', () => {
      const proofData: WithdrawProofData = {
        encryptedWithdrawAmount: new Uint8Array(64).fill(0x56),
        newSourceCommitment: new Uint8Array(32).fill(0x78),
        equalityProof: new Uint8Array(192).fill(0x9A),
        rangeProof: new Uint8Array(674).fill(0xBC)
      }

      const instruction = createVerifyWithdrawProofInstruction(accounts, proofData)
      const data = new Uint8Array(instruction.data)

      expect(data[0]).toBe(ProofInstruction.VerifyWithdraw)
      expect(data.length).toBeGreaterThan(
        1 + 64 + 32 + 192 + 674 // instruction + all proof components
      )
    })
  })
})