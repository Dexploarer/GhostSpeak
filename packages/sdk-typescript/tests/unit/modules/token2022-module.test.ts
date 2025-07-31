import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Token2022Module } from '../../../src/modules/token2022/Token2022Module.js'
import { address } from '@solana/addresses'
import type { GhostSpeakClient } from '../../../src/core/GhostSpeakClient.js'
import type { TransactionSigner } from '@solana/kit'
import { AccountState } from '../../../src/generated/index.js'

// Mock the generated instruction functions
vi.mock('../../../src/generated/index.js', () => ({
  getCreateToken2022MintInstructionAsync: vi.fn().mockResolvedValue({
    instruction: {
      programAddress: address('11111111111111111111111111111111'),
      accounts: [],
      data: new Uint8Array()
    }
  }),
  getInitializeTransferFeeConfigInstructionAsync: vi.fn().mockResolvedValue({
    instruction: {
      programAddress: address('11111111111111111111111111111111'),
      accounts: [],
      data: new Uint8Array()
    }
  }),
  getInitializeConfidentialTransferMintInstructionAsync: vi.fn().mockResolvedValue({
    instruction: {
      programAddress: address('11111111111111111111111111111111'),
      accounts: [],
      data: new Uint8Array()
    }
  }),
  getInitializeInterestBearingConfigInstructionAsync: vi.fn().mockResolvedValue({
    instruction: {
      programAddress: address('11111111111111111111111111111111'),
      accounts: [],
      data: new Uint8Array()
    }
  }),
  getInitializeMintCloseAuthorityInstructionAsync: vi.fn().mockResolvedValue({
    instruction: {
      programAddress: address('11111111111111111111111111111111'),
      accounts: [],
      data: new Uint8Array()
    }
  }),
  getInitializeDefaultAccountStateInstructionAsync: vi.fn().mockResolvedValue({
    instruction: {
      programAddress: address('11111111111111111111111111111111'),
      accounts: [],
      data: new Uint8Array()
    }
  }),
  getApproveExtensionInstruction: vi.fn().mockReturnValue({
    programAddress: address('11111111111111111111111111111111'),
    accounts: [],
    data: new Uint8Array()
  }),
  AccountState: {
    Uninitialized: 'Uninitialized',
    Initialized: 'Initialized',
    Frozen: 'Frozen'
  }
}))

// Mock generateKeyPairSigner
vi.mock('@solana/signers', () => ({
  generateKeyPairSigner: vi.fn().mockResolvedValue({
    address: address('GeneratedMintAddressAAAAAAAAAAAAAAAAAAAAAAAAA'),
    keyPair: {} as CryptoKeyPair,
    signMessages: vi.fn(),
    signTransactions: vi.fn()
  })
}))

describe('Token2022Module', () => {
  let token2022Module: Token2022Module
  let mockClient: GhostSpeakClient
  let mockSigner: TransactionSigner
  let mockAgentAddress: Address

  beforeEach(() => {
    // Create mock client
    mockClient = {
      programId: address('GHOSTkqvqLvgbLqxqQ9826T72UWSgCGcMrw27LwaCy8'),
      config: {
        endpoint: 'https://api.devnet.solana.com'
      },
      sendTransaction: vi.fn().mockResolvedValue('mock-signature'),
      fetchAccount: vi.fn().mockResolvedValue({
        data: {
          mintAuthority: address('AuthorityWa11etAAAAAAAAAAAAAAAAAAAAAAAAAAAA'),
          supply: 1000000n,
          decimals: 6,
          isInitialized: true,
          freezeAuthority: null,
          extensions: []
        }
      })
    } as unknown as GhostSpeakClient

    // Create mock signer
    mockSigner = {
      address: address('SignerWa11etAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'),
      keyPair: {} as CryptoKeyPair,
      signMessages: vi.fn(),
      signTransactions: vi.fn()
    }

    mockAgentAddress = address('AgentAddressAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')

    // Create token2022 module instance
    token2022Module = new Token2022Module(mockClient)
  })

  describe('createMint', () => {
    it('should create a basic Token-2022 mint', async () => {
      const result = await token2022Module.createMint({
        signer: mockSigner,
        agentAddress: mockAgentAddress,
        decimals: 6,
        freezeAuthority: mockSigner.address
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })

    it('should create a mint without freeze authority', async () => {
      const result = await token2022Module.createMint({
        signer: mockSigner,
        agentAddress: mockAgentAddress,
        decimals: 9
      })

      expect(result).toBe('mock-signature')
    })
  })

  describe('createMintWithTransferFees', () => {
    it('should create a mint with transfer fees', async () => {
      const result = await token2022Module.createMintWithTransferFees({
        signer: mockSigner,
        agentAddress: mockAgentAddress,
        decimals: 6,
        transferFeeBasisPoints: 100, // 1%
        maxFee: 1000000n, // 1 token max fee
        withdrawWithheldAuthority: mockSigner.address
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })

    it('should create a mint with transfer fees and default withdraw authority', async () => {
      const result = await token2022Module.createMintWithTransferFees({
        signer: mockSigner,
        agentAddress: mockAgentAddress,
        decimals: 6,
        transferFeeBasisPoints: 50, // 0.5%
        maxFee: 500000n
      })

      expect(result).toBe('mock-signature')
    })
  })

  describe('createMintWithConfidentialTransfers', () => {
    it('should create a mint with confidential transfers', async () => {
      const auditorPubkey = new Uint8Array(32).fill(1) // Mock ElGamal pubkey

      const result = await token2022Module.createMintWithConfidentialTransfers({
        signer: mockSigner,
        agentAddress: mockAgentAddress,
        decimals: 6,
        auditorElgamalPubkey: auditorPubkey,
        autoApproveNewAccounts: true
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })

    it('should create a mint with confidential transfers without auditor', async () => {
      const result = await token2022Module.createMintWithConfidentialTransfers({
        signer: mockSigner,
        agentAddress: mockAgentAddress,
        decimals: 6,
        autoApproveNewAccounts: false
      })

      expect(result).toBe('mock-signature')
    })
  })

  describe('createMintWithInterestBearing', () => {
    it('should create a mint with interest bearing', async () => {
      const result = await token2022Module.createMintWithInterestBearing({
        signer: mockSigner,
        agentAddress: mockAgentAddress,
        decimals: 6,
        interestRate: 500, // 5% APY
        rateAuthority: mockSigner.address
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })

    it('should create a mint with interest bearing and default rate authority', async () => {
      const result = await token2022Module.createMintWithInterestBearing({
        signer: mockSigner,
        agentAddress: mockAgentAddress,
        decimals: 6,
        interestRate: 250 // 2.5% APY
      })

      expect(result).toBe('mock-signature')
    })
  })

  describe('createAdvancedMint', () => {
    it('should create a mint with all extensions', async () => {
      const result = await token2022Module.createAdvancedMint({
        signer: mockSigner,
        agentAddress: mockAgentAddress,
        decimals: 6,
        transferFeeBasisPoints: 100,
        maxFee: 1000000n,
        interestRate: 300,
        autoApproveConfidential: true,
        defaultAccountState: AccountState.Initialized
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })

    it('should create a mint with all extensions except default account state', async () => {
      const result = await token2022Module.createAdvancedMint({
        signer: mockSigner,
        agentAddress: mockAgentAddress,
        decimals: 9,
        transferFeeBasisPoints: 50,
        maxFee: 500000n,
        interestRate: 200,
        autoApproveConfidential: false
      })

      expect(result).toBe('mock-signature')
    })
  })

  describe('getMint', () => {
    it('should fetch mint account data', async () => {
      const mintAddress = address('MintAddressAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')
      
      const mint = await token2022Module.getMint(mintAddress)

      expect(mint).toEqual({
        mintAuthority: address('AuthorityWa11etAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'),
        supply: 1000000n,
        decimals: 6,
        isInitialized: true,
        freezeAuthority: null,
        extensions: []
      })
      expect(mockClient.fetchAccount).toHaveBeenCalled()
    })
  })

  describe('getAllMints', () => {
    it('should fetch all mints created by the program', async () => {
      // Mock getProgramAccounts
      token2022Module.getProgramAccounts = vi.fn().mockResolvedValue([
        {
          address: address('Mint1AddressAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'),
          data: {
            mintAuthority: mockSigner.address,
            decimals: 6,
            supply: 1000000n
          }
        },
        {
          address: address('Mint2AddressAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'),
          data: {
            mintAuthority: mockSigner.address,
            decimals: 9,
            supply: 5000000n
          }
        }
      ])

      const mints = await token2022Module.getAllMints()

      expect(mints).toHaveLength(2)
      expect(mints[0].data.decimals).toBe(6)
      expect(mints[1].data.decimals).toBe(9)
    })
  })

  describe('getMintsByAuthority', () => {
    it('should fetch mints by authority', async () => {
      const authorityAddress = address('AuthorityWa11etAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')
      
      // Mock getProgramAccounts with filters
      token2022Module.getProgramAccounts = vi.fn().mockResolvedValue([
        {
          address: address('Mint1AddressAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'),
          data: {
            mintAuthority: authorityAddress,
            decimals: 6,
            supply: 1000000n
          }
        }
      ])

      const mints = await token2022Module.getMintsByAuthority(authorityAddress)

      expect(mints).toHaveLength(1)
      expect(mints[0].data.mintAuthority).toBe(authorityAddress)
    })
  })

  describe('direct instruction access', () => {
    it('should provide direct access to create mint instruction', async () => {
      const mockMint = {
        address: address('DirectMintAddressAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'),
        keyPair: {} as CryptoKeyPair,
        signMessages: vi.fn(),
        signTransactions: vi.fn()
      }

      const instruction = await token2022Module.getCreateToken2022MintInstruction({
        authority: mockSigner,
        agent: mockAgentAddress,
        mint: mockMint,
        decimals: 6,
        freezeAuthority: null,
        enableTransferFee: false,
        enableConfidentialTransfers: false,
        enableInterestBearing: false
      })

      expect(instruction).toHaveProperty('instruction')
    })

    it('should provide direct access to transfer fee config instruction', async () => {
      const mintAddress = address('MintAddressAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')

      const instruction = await token2022Module.getInitializeTransferFeeConfigInstruction({
        authority: mockSigner,
        mint: mintAddress,
        transferFeeBasisPoints: 100,
        maximumFee: 1000000n,
        transferFeeAuthority: mockSigner.address,
        withdrawWithheldAuthority: null
      })

      expect(instruction).toHaveProperty('instruction')
    })

    it('should provide direct access to confidential transfer instruction', async () => {
      const mintAddress = address('MintAddressAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')
      const auditorPubkey = new Uint8Array(32).fill(1)

      const instruction = await token2022Module.getInitializeConfidentialTransferMintInstruction({
        authority: mockSigner,
        mint: mintAddress,
        autoApproveNewAccounts: true,
        auditorElgamalPubkey: auditorPubkey
      })

      expect(instruction).toHaveProperty('instruction')
    })

    it('should provide direct access to interest bearing config instruction', async () => {
      const mintAddress = address('MintAddressAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')

      const instruction = await token2022Module.getInitializeInterestBearingConfigInstruction({
        mint: mintAddress,
        authority: mockSigner,
        rate: 500,
        rateAuthority: mockSigner.address
      })

      expect(instruction).toHaveProperty('instruction')
    })

    it('should provide direct access to mint close authority instruction', async () => {
      const mintAddress = address('MintAddressAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')

      const instruction = await token2022Module.getInitializeMintCloseAuthorityInstruction({
        mint: mintAddress,
        authority: mockSigner,
        closeAuthority: mockSigner.address
      })

      expect(instruction).toHaveProperty('instruction')
    })

    it('should provide direct access to default account state instruction', async () => {
      const mintAddress = address('MintAddressAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')

      const instruction = await token2022Module.getInitializeDefaultAccountStateInstruction({
        mint: mintAddress,
        authority: mockSigner,
        state: AccountState.Frozen
      })

      expect(instruction).toHaveProperty('instruction')
    })

    it('should provide direct access to approve extension instruction', () => {
      const mintAddress = address('MintAddressAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')
      const extensionAddress = address('ExtensionAddressAAAAAAAAAAAAAAAAAAAAAAAAAAAA')

      const instruction = token2022Module.getApproveExtensionInstruction({
        mint: mintAddress,
        authority: mockSigner,
        extension: extensionAddress
      })

      expect(instruction).toHaveProperty('programAddress')
    })
  })

  describe('error handling', () => {
    it('should handle empty instruction factories in executeMultiple', async () => {
      // This tests the private executeMultiple method indirectly
      await expect(
        token2022Module.createAdvancedMint({
          signer: mockSigner,
          agentAddress: mockAgentAddress,
          decimals: 6,
          transferFeeBasisPoints: 100,
          maxFee: 1000000n,
          interestRate: 300
        })
      ).resolves.toBe('mock-signature')
    })

    it('should handle instruction creation failures', async () => {
      // Mock an instruction factory that throws
      const originalMethod = token2022Module.getCreateToken2022MintInstruction
      token2022Module.getCreateToken2022MintInstruction = vi.fn().mockRejectedValue(new Error('Instruction creation failed'))

      await expect(
        token2022Module.createMint({
          signer: mockSigner,
          agentAddress: mockAgentAddress,
          decimals: 6
        })
      ).rejects.toThrow()

      // Restore original method
      token2022Module.getCreateToken2022MintInstruction = originalMethod
    })
  })

  describe('keypair generation', () => {
    it('should generate keypairs for mints', async () => {
      // Test keypair generation indirectly through mint creation
      const result = await token2022Module.createMint({
        signer: mockSigner,
        agentAddress: mockAgentAddress,
        decimals: 6
      })

      expect(result).toBe('mock-signature')
      // The generateKeyPairSigner mock should have been called
    })
  })
})