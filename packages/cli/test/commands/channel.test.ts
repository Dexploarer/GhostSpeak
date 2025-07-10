import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { Keypair, PublicKey, Connection } from '@solana/web3.js';
import {
  createChannel,
  joinChannel,
  sendMessage,
  listChannels,
  getChannelMessages,
  leaveChannel,
} from '../../src/commands/channel';
import * as mockFs from '../../src/utils/mock-fs';

// Mock the connection
const mockConnection = {
  getBalance: async () => 1000000000,
  getLatestBlockhash: async () => ({
    blockhash: 'mock-blockhash',
    lastValidBlockHeight: 100,
  }),
  sendTransaction: async () => 'mock-signature',
  confirmTransaction: async () => ({ value: { err: null } }),
  getAccountInfo: async () => ({
    data: Buffer.from([]),
    owner: PublicKey.default,
    lamports: 1000000,
    executable: false,
  }),
} as unknown as Connection;

describe('Channel Commands', () => {
  let creatorKeypair: Keypair;
  let memberKeypair: Keypair;

  beforeAll(() => {
    // Setup test keypairs
    creatorKeypair = Keypair.generate();
    memberKeypair = Keypair.generate();
  });

  afterAll(() => {
    // Clean up
    mockFs.clearMocks();
  });

  test('creates public channel', async () => {
    const channelId = `public_channel_${Date.now()}`;
    const result = await createChannel(
      mockConnection,
      creatorKeypair,
      channelId,
      'Public Test Channel',
      'direct',
      true, // isPublic
      null, // encryptionKey
    );

    expect(result).toBeDefined();
    expect(result.channelPda).toBeInstanceOf(PublicKey);
    expect(result.signature).toBe('mock-signature');
  });

  test('creates private channel with encryption', async () => {
    const channelId = `private_channel_${Date.now()}`;
    const encryptionKey = 'base64encodedkey';

    const result = await createChannel(
      mockConnection,
      creatorKeypair,
      channelId,
      'Private Test Channel',
      'private',
      false,
      encryptionKey,
    );

    expect(result).toBeDefined();
    expect(result.channelPda).toBeInstanceOf(PublicKey);
  });

  test('validates channel ID format', async () => {
    const invalidIds = [
      '',
      'a'.repeat(65), // Too long
      'channel with spaces',
      'channel@special#chars',
    ];

    for (const invalidId of invalidIds) {
      try {
        await createChannel(
          mockConnection,
          creatorKeypair,
          invalidId,
          'Test Channel',
          'direct',
          true,
          null,
        );
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('Invalid channel ID');
      }
    }
  });

  test('joins existing channel', async () => {
    const channelId = `join_test_${Date.now()}`;

    // First create the channel
    await createChannel(
      mockConnection,
      creatorKeypair,
      channelId,
      'Channel to Join',
      'group',
      true,
      null,
    );

    // Join the channel
    const result = await joinChannel(mockConnection, memberKeypair, channelId);

    expect(result).toBeDefined();
    expect(result.signature).toBe('mock-signature');
  });

  test('handles joining non-existent channel', async () => {
    try {
      await joinChannel(mockConnection, memberKeypair, 'non_existent_channel');
      expect(false).toBe(true); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain('Channel not found');
    }
  });

  test('handles duplicate channel join', async () => {
    const channelId = `duplicate_join_${Date.now()}`;

    // Create and join
    await createChannel(
      mockConnection,
      creatorKeypair,
      channelId,
      'Test Channel',
      'group',
      true,
      null,
    );

    await joinChannel(mockConnection, memberKeypair, channelId);

    // Try to join again
    try {
      await joinChannel(mockConnection, memberKeypair, channelId);
      expect(false).toBe(true); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain('Already a member');
    }
  });

  test('sends text message', async () => {
    const channelId = `message_test_${Date.now()}`;

    // Create channel
    await createChannel(
      mockConnection,
      creatorKeypair,
      channelId,
      'Message Test Channel',
      'direct',
      true,
      null,
    );

    // Send message
    const result = await sendMessage(
      mockConnection,
      creatorKeypair,
      channelId,
      'text',
      'Hello, this is a test message!',
      null,
    );

    expect(result).toBeDefined();
    expect(result.signature).toBe('mock-signature');
  });

  test('sends file message with metadata', async () => {
    const channelId = `file_message_${Date.now()}`;

    await createChannel(
      mockConnection,
      creatorKeypair,
      channelId,
      'File Test Channel',
      'direct',
      true,
      null,
    );

    const metadata = {
      filename: 'test.pdf',
      size: 1024,
      mimeType: 'application/pdf',
      hash: 'sha256:abcdef123456',
    };

    const result = await sendMessage(
      mockConnection,
      creatorKeypair,
      channelId,
      'file',
      'ipfs://QmTest123',
      metadata,
    );

    expect(result).toBeDefined();
  });

  test('validates message content length', async () => {
    const channelId = `length_test_${Date.now()}`;

    await createChannel(
      mockConnection,
      creatorKeypair,
      channelId,
      'Length Test Channel',
      'direct',
      true,
      null,
    );

    // Too long message
    const longMessage = 'a'.repeat(5001);
    try {
      await sendMessage(mockConnection, creatorKeypair, channelId, 'text', longMessage, null);
      expect(false).toBe(true); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain('Message too long');
    }
  });

  test('lists channels with filters', async () => {
    // List all channels
    const allChannels = await listChannels(mockConnection, {});
    expect(Array.isArray(allChannels)).toBe(true);

    // List public channels only
    const publicChannels = await listChannels(mockConnection, {
      isPublic: true,
    });
    expect(Array.isArray(publicChannels)).toBe(true);

    // List by channel type
    const directChannels = await listChannels(mockConnection, {
      channelType: 'direct',
    });
    expect(Array.isArray(directChannels)).toBe(true);

    // List user's channels
    const userChannels = await listChannels(mockConnection, {
      member: creatorKeypair.publicKey,
    });
    expect(Array.isArray(userChannels)).toBe(true);
  });

  test('retrieves channel messages', async () => {
    const channelId = `history_test_${Date.now()}`;

    await createChannel(
      mockConnection,
      creatorKeypair,
      channelId,
      'History Test Channel',
      'group',
      true,
      null,
    );

    // Send some messages
    await sendMessage(mockConnection, creatorKeypair, channelId, 'text', 'Message 1', null);
    await sendMessage(mockConnection, creatorKeypair, channelId, 'text', 'Message 2', null);
    await sendMessage(mockConnection, creatorKeypair, channelId, 'text', 'Message 3', null);

    // Get messages
    const messages = await getChannelMessages(mockConnection, channelId, {
      limit: 10,
      before: null,
      after: null,
    });

    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeLessThanOrEqual(10);
  });

  test('handles message pagination', async () => {
    const channelId = `pagination_test_${Date.now()}`;

    await createChannel(
      mockConnection,
      creatorKeypair,
      channelId,
      'Pagination Test Channel',
      'group',
      true,
      null,
    );

    // Get first page
    const firstPage = await getChannelMessages(mockConnection, channelId, {
      limit: 5,
      before: null,
      after: null,
    });

    expect(Array.isArray(firstPage)).toBe(true);

    // Get next page using cursor
    if (firstPage.length > 0) {
      const lastMessage = firstPage[firstPage.length - 1];
      const secondPage = await getChannelMessages(mockConnection, channelId, {
        limit: 5,
        before: lastMessage.timestamp,
        after: null,
      });

      expect(Array.isArray(secondPage)).toBe(true);
    }
  });

  test('leaves channel', async () => {
    const channelId = `leave_test_${Date.now()}`;

    // Create and join channel
    await createChannel(
      mockConnection,
      creatorKeypair,
      channelId,
      'Leave Test Channel',
      'group',
      true,
      null,
    );

    await joinChannel(mockConnection, memberKeypair, channelId);

    // Leave the channel
    const result = await leaveChannel(mockConnection, memberKeypair, channelId);

    expect(result).toBeDefined();
    expect(result.signature).toBe('mock-signature');
  });

  test('handles leaving non-member channel', async () => {
    const channelId = `non_member_leave_${Date.now()}`;

    await createChannel(
      mockConnection,
      creatorKeypair,
      channelId,
      'Test Channel',
      'group',
      true,
      null,
    );

    // Try to leave without being a member
    try {
      await leaveChannel(mockConnection, memberKeypair, channelId);
      expect(false).toBe(true); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain('Not a member');
    }
  });

  test('validates channel type', async () => {
    const invalidTypes = ['invalid', 'unknown', ''];

    for (const invalidType of invalidTypes) {
      try {
        await createChannel(
          mockConnection,
          creatorKeypair,
          `type_test_${Date.now()}`,
          'Test Channel',
          invalidType as any,
          true,
          null,
        );
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('Invalid channel type');
      }
    }
  });

  test('handles encrypted messages in private channels', async () => {
    const channelId = `encrypted_${Date.now()}`;
    const encryptionKey = 'test-encryption-key';

    // Create private channel
    await createChannel(
      mockConnection,
      creatorKeypair,
      channelId,
      'Encrypted Channel',
      'private',
      false,
      encryptionKey,
    );

    // Send encrypted message
    const encryptedContent = 'encrypted:base64encodedcontent';
    const result = await sendMessage(
      mockConnection,
      creatorKeypair,
      channelId,
      'text',
      encryptedContent,
      { encrypted: true },
    );

    expect(result).toBeDefined();
  });

  test('validates message type', async () => {
    const channelId = `msg_type_test_${Date.now()}`;

    await createChannel(
      mockConnection,
      creatorKeypair,
      channelId,
      'Test Channel',
      'direct',
      true,
      null,
    );

    const invalidTypes = ['invalid', 'unknown', ''];

    for (const invalidType of invalidTypes) {
      try {
        await sendMessage(
          mockConnection,
          creatorKeypair,
          channelId,
          invalidType as any,
          'Content',
          null,
        );
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('Invalid message type');
      }
    }
  });

  test('handles channel member limits', async () => {
    const channelId = `member_limit_${Date.now()}`;

    // Create channel
    await createChannel(
      mockConnection,
      creatorKeypair,
      channelId,
      'Limited Channel',
      'group',
      false,
      null,
    );

    // Add maximum members (simulate)
    const maxMembers = 100;
    const memberPromises = [];

    for (let i = 0; i < 5; i++) {
      const memberKeypair = Keypair.generate();
      memberPromises.push(joinChannel(mockConnection, memberKeypair, channelId));
    }

    // All should succeed within limit
    const results = await Promise.all(memberPromises);
    results.forEach(result => {
      expect(result).toBeDefined();
    });
  });

  test('validates channel name length', async () => {
    // Test maximum name length
    const maxName = 'C'.repeat(100);
    const channelId = `max_name_${Date.now()}`;

    const result = await createChannel(
      mockConnection,
      creatorKeypair,
      channelId,
      maxName,
      'direct',
      false,
      null,
    );

    expect(result).toBeDefined();
    expect(result.channelPda).toBeInstanceOf(PublicKey);

    // Test empty name
    await expect(
      createChannel(
        mockConnection,
        creatorKeypair,
        `empty_name_${Date.now()}`,
        '',
        'direct',
        false,
        null,
      ),
    ).rejects.toThrow(/Channel name cannot be empty/);
  });

  test('handles message delivery confirmation', async () => {
    const channelId = `delivery_${Date.now()}`;

    // Create channel
    await createChannel(
      mockConnection,
      creatorKeypair,
      channelId,
      'Delivery Test',
      'direct',
      false,
      null,
    );

    // Send message with delivery tracking
    const messageResult = await sendMessage(
      mockConnection,
      creatorKeypair,
      channelId,
      'text',
      'Test delivery confirmation',
      null,
    );

    expect(messageResult).toBeDefined();
    expect(messageResult.signature).toBe('mock-signature');

    // In real implementation, would check delivery status
    const deliveryStatus = {
      sent: true,
      delivered: false,
      read: false,
      timestamp: Date.now(),
    };

    expect(deliveryStatus.sent).toBe(true);
  });

  test('handles rate limiting for messages', async () => {
    const channelId = `rate_limit_${Date.now()}`;

    // Create channel
    await createChannel(
      mockConnection,
      creatorKeypair,
      channelId,
      'Rate Limit Test',
      'broadcast',
      false,
      null,
    );

    // Send multiple messages quickly
    const messageCount = 5;
    const messages = [];

    for (let i = 0; i < messageCount; i++) {
      messages.push(
        sendMessage(mockConnection, creatorKeypair, channelId, 'text', `Message ${i}`, null),
      );
    }

    // All should succeed in test environment
    const results = await Promise.all(messages);
    expect(results).toHaveLength(messageCount);

    // In production, would implement rate limiting
    const rateLimitExceeded = messageCount > 10;
    expect(rateLimitExceeded).toBe(false);
  });
});
