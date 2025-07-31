import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ChannelModule } from '../../../src/modules/channels/ChannelModule.js'
import { address } from '@solana/addresses'
import type { GhostSpeakClient } from '../../../src/core/GhostSpeakClient.js'
import type { TransactionSigner } from '@solana/kit'
import { ChannelType, ChannelPermission } from '../../../src/generated/index.js'

// Mock the generated instruction functions
vi.mock('../../../src/generated/index.js', () => ({
  getCreateChannelInstructionAsync: vi.fn().mockResolvedValue({
    instruction: {
      programAddress: address('11111111111111111111111111111111'),
      accounts: [],
      data: new Uint8Array()
    }
  }),
  getSendMessageInstructionAsync: vi.fn().mockResolvedValue({
    instruction: {
      programAddress: address('11111111111111111111111111111111'),
      accounts: [],
      data: new Uint8Array()
    }
  }),
  getSetChannelPermissionsInstructionAsync: vi.fn().mockResolvedValue({
    instruction: {
      programAddress: address('11111111111111111111111111111111'),
      accounts: [],
      data: new Uint8Array()
    }
  }),
  getAddReactionInstruction: vi.fn().mockReturnValue({
    programAddress: address('11111111111111111111111111111111'),
    accounts: [],
    data: new Uint8Array()
  }),
  getAddAttachmentInstructionAsync: vi.fn().mockResolvedValue({
    instruction: {
      programAddress: address('11111111111111111111111111111111'),
      accounts: [],
      data: new Uint8Array()
    }
  }),
  ChannelType: {
    Direct: 'Direct',
    Group: 'Group',
    Broadcast: 'Broadcast'
  },
  ChannelPermission: {
    Read: 'Read',
    Write: 'Write',
    Admin: 'Admin'
  }
}))

describe('ChannelModule', () => {
  let channelModule: ChannelModule
  let mockClient: GhostSpeakClient
  let mockUser1: TransactionSigner
  let mockUser2: TransactionSigner

  beforeEach(() => {
    // Create mock client with IPFS config
    mockClient = {
      programId: address('GHOSTkqvqLvgbLqxqQ9826T72UWSgCGcMrw27LwaCy8'),
      config: {
        endpoint: 'https://api.devnet.solana.com',
        ipfs: {
          enabled: true,
          gateway: 'https://ipfs.io/ipfs',
          pinning: {
            service: 'pinata',
            apiKey: 'test-key',
            apiSecret: 'test-secret'
          }
        }
      },
      sendTransaction: vi.fn().mockResolvedValue('mock-signature'),
      fetchAccount: vi.fn().mockResolvedValue({
        data: {
          messages: [],
          participants: [
            address('User1Wa11etAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'),
            address('User2Wa11etAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')
          ],
          channelType: ChannelType.Direct
        }
      })
    } as unknown as GhostSpeakClient

    // Create mock signers
    mockUser1 = {
      address: address('User1Wa11etAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'),
      keyPair: {} as CryptoKeyPair,
      signMessages: vi.fn(),
      signTransactions: vi.fn()
    }

    mockUser2 = {
      address: address('User2Wa11etAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'),
      keyPair: {} as CryptoKeyPair,
      signMessages: vi.fn(),
      signTransactions: vi.fn()
    }

    // Create channel module instance
    channelModule = new ChannelModule(mockClient)
  })

  describe('createChannel', () => {
    it('should create a direct channel', async () => {
      const result = await channelModule.createChannel({
        channelId: 'channel-direct',
        channelType: ChannelType.Direct,
        participants: [mockUser1.address, mockUser2.address],
        signers: [mockUser1]
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })

    it('should create a group channel', async () => {
      const mockUser3 = {
        address: address('User3Wa11etAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'),
        keyPair: {} as CryptoKeyPair,
        signMessages: vi.fn(),
        signTransactions: vi.fn()
      }

      const result = await channelModule.createChannel({
        channelId: 'channel-group',
        channelType: ChannelType.Group,
        participants: [mockUser1.address, mockUser2.address, mockUser3.address],
        metadata: {
          name: 'Test Group',
          description: 'A test group channel'
        },
        signers: [mockUser1]
      })

      expect(result).toBe('mock-signature')
    })

    it('should create a broadcast channel', async () => {
      const result = await channelModule.createChannel({
        channelId: 'channel-broadcast',
        channelType: ChannelType.Broadcast,
        participants: [mockUser1.address], // Only creator can broadcast
        signers: [mockUser1]
      })

      expect(result).toBe('mock-signature')
    })
  })

  describe('sendMessage', () => {
    it('should send a text message', async () => {
      const result = await channelModule.sendMessage({
        channelId: 'channel-direct',
        content: 'Hello, world!',
        signers: [mockUser1]
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })

    it('should send an encrypted message', async () => {
      const result = await channelModule.sendMessage({
        channelId: 'channel-direct',
        content: 'Secret message',
        encrypted: true,
        signers: [mockUser1]
      })

      expect(result).toBe('mock-signature')
    })

    it('should send a message with large content to IPFS', async () => {
      const largeContent = 'A'.repeat(2000) // Large content

      const result = await channelModule.sendMessage({
        channelId: 'channel-direct',
        content: largeContent,
        signers: [mockUser1]
      })

      expect(result).toBe('mock-signature')
    })
  })

  describe('setPermissions', () => {
    it('should set channel permissions', async () => {
      const result = await channelModule.setPermissions({
        channelId: 'channel-group',
        user: mockUser2.address,
        permissions: [ChannelPermission.Read, ChannelPermission.Write],
        signers: [mockUser1]
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })

    it('should grant admin permissions', async () => {
      const result = await channelModule.setPermissions({
        channelId: 'channel-group',
        user: mockUser2.address,
        permissions: [ChannelPermission.Admin],
        signers: [mockUser1]
      })

      expect(result).toBe('mock-signature')
    })
  })

  describe('addReaction', () => {
    it('should add a reaction to a message', async () => {
      const result = await channelModule.addReaction({
        channelId: 'channel-direct',
        messageId: 0n,
        reaction: '👍',
        signers: [mockUser1]
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })

    it('should validate emoji reactions', async () => {
      const result = await channelModule.addReaction({
        channelId: 'channel-direct',
        messageId: 0n,
        reaction: '❤️',
        signers: [mockUser1]
      })

      expect(result).toBe('mock-signature')
    })
  })

  describe('addAttachment', () => {
    it('should add an attachment to a channel', async () => {
      const attachment = {
        name: 'document.pdf',
        size: 1024n,
        mimeType: 'application/pdf',
        uri: 'ipfs://QmTestHash'
      }

      const result = await channelModule.addAttachment({
        channelId: 'channel-direct',
        attachment,
        signers: [mockUser1]
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })

    it('should handle image attachments', async () => {
      const attachment = {
        name: 'image.png',
        size: 2048n,
        mimeType: 'image/png',
        uri: 'ipfs://QmImageHash'
      }

      const result = await channelModule.addAttachment({
        channelId: 'channel-direct',
        attachment,
        signers: [mockUser1]
      })

      expect(result).toBe('mock-signature')
    })
  })

  describe('getChannelMessages', () => {
    it('should fetch channel messages', async () => {
      mockClient.fetchAccount = vi.fn().mockResolvedValue({
        data: {
          messages: [
            {
              sender: mockUser1.address,
              content: 'Hello',
              timestamp: BigInt(Date.now()),
              encrypted: false
            },
            {
              sender: mockUser2.address,
              content: 'Hi there!',
              timestamp: BigInt(Date.now()),
              encrypted: false
            }
          ],
          participants: [mockUser1.address, mockUser2.address],
          channelType: ChannelType.Direct
        }
      })

      const messages = await channelModule.getChannelMessages('channel-direct')

      expect(messages).toHaveLength(2)
      expect(messages[0].content).toBe('Hello')
      expect(messages[1].content).toBe('Hi there!')
    })
  })
})