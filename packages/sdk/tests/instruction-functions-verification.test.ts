/**
 * Instruction Functions Verification Tests
 * Tests that all instruction functions are accessible and work correctly
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { generateKeyPairSigner } from '@solana/signers';
import type { Address } from '@solana/addresses';

// Import all instruction builders
import { getVerifyAgentInstruction } from '../src/generated-v2/instructions/verifyAgent';
import { getCreateChannelInstruction } from '../src/generated-v2/instructions/createChannel';
import { getSendMessageInstruction } from '../src/generated-v2/instructions/sendMessage';
import { getBroadcastMessageInstruction } from '../src/generated-v2/instructions/broadcastMessage';
import { getAddParticipantInstruction } from '../src/generated-v2/instructions/addParticipant';
import { POD_COM_PROGRAM_ADDRESS } from '../src/generated-v2/programs/podCom';

describe('Instruction Functions Verification', () => {
  let testKeypair: any;
  let testKeypair2: any;
  let testChannelAddress: Address;

  beforeAll(async () => {
    testKeypair = await generateKeyPairSigner();
    testKeypair2 = await generateKeyPairSigner();
    testChannelAddress = testKeypair.address; // Use as mock channel address
  });

  describe('1. Instruction Function Accessibility', () => {
    test('All instruction functions are exported and accessible', () => {
      expect(typeof getVerifyAgentInstruction).toBe('function');
      expect(typeof getCreateChannelInstruction).toBe('function');
      expect(typeof getSendMessageInstruction).toBe('function');
      expect(typeof getBroadcastMessageInstruction).toBe('function');
      expect(typeof getAddParticipantInstruction).toBe('function');
    });
  });

  describe('2. Verify Agent Instruction', () => {
    test('Creates valid instruction with all parameters', () => {
      const instruction = getVerifyAgentInstruction({
        agentVerification: testKeypair.address,
        agent: testKeypair,
        payer: testKeypair,
        agentPubkey: testKeypair.address,
        serviceEndpoint: 'https://agent.example.com/api',
        supportedCapabilities: ['chat', 'translation', 'summarization'],
        verifiedAt: BigInt(Date.now())
      });

      expect(instruction.programAddress).toBe(POD_COM_PROGRAM_ADDRESS);
      expect(instruction.accounts).toHaveLength(4);
      expect(instruction.data).toBeInstanceOf(Uint8Array);
      expect(instruction.data.length).toBeGreaterThan(0);
    });

    test('Handles different capability arrays', () => {
      const singleCapability = getVerifyAgentInstruction({
        agentVerification: testKeypair.address,
        agent: testKeypair,
        payer: testKeypair,
        agentPubkey: testKeypair.address,
        serviceEndpoint: 'https://simple-agent.com',
        supportedCapabilities: ['chat'],
        verifiedAt: BigInt(Date.now())
      });

      const multipleCapabilities = getVerifyAgentInstruction({
        agentVerification: testKeypair.address,
        agent: testKeypair,
        payer: testKeypair,
        agentPubkey: testKeypair.address,
        serviceEndpoint: 'https://complex-agent.com',
        supportedCapabilities: ['chat', 'translation', 'image-generation', 'code-analysis'],
        verifiedAt: BigInt(Date.now())
      });

      expect(singleCapability.data.length).toBeLessThan(multipleCapabilities.data.length);
    });

    test('Validates account structure', () => {
      const instruction = getVerifyAgentInstruction({
        agentVerification: testKeypair.address,
        agent: testKeypair,
        payer: testKeypair,
        agentPubkey: testKeypair.address,
        serviceEndpoint: 'https://test.com',
        supportedCapabilities: ['test'],
        verifiedAt: BigInt(Date.now())
      });

      // Check account structure
      expect(instruction.accounts[0]).toBeDefined(); // agentVerification
      expect(instruction.accounts[1]).toBeDefined(); // agent
      expect(instruction.accounts[2]).toBeDefined(); // payer
      expect(instruction.accounts[3]).toBeDefined(); // systemProgram
    });
  });

  describe('3. Create Channel Instruction', () => {
    test('Creates valid channel instruction', () => {
      const instruction = getCreateChannelInstruction({
        channel: testChannelAddress,
        creator: testKeypair,
        payer: testKeypair,
        channelName: 'Test Channel',
        isPublic: true,
        maxParticipants: 100
      });

      expect(instruction.programAddress).toBe(POD_COM_PROGRAM_ADDRESS);
      expect(instruction.accounts).toHaveLength(4);
      expect(instruction.data).toBeInstanceOf(Uint8Array);
    });

    test('Handles different channel configurations', () => {
      const publicChannel = getCreateChannelInstruction({
        channel: testChannelAddress,
        creator: testKeypair,
        payer: testKeypair,
        channelName: 'Public Channel',
        isPublic: true,
        maxParticipants: 1000
      });

      const privateChannel = getCreateChannelInstruction({
        channel: testChannelAddress,
        creator: testKeypair,
        payer: testKeypair,
        channelName: 'Private Channel',
        isPublic: false,
        maxParticipants: 10
      });

      expect(publicChannel.data).not.toEqual(privateChannel.data);
    });
  });

  describe('4. Send Message Instruction', () => {
    test('Creates valid message instruction', () => {
      const instruction = getSendMessageInstruction({
        message: testKeypair.address,
        channel: testChannelAddress,
        sender: testKeypair,
        payer: testKeypair,
        messageContent: 'Hello, this is a test message!',
        messageType: { __kind: 'Text' }
      });

      expect(instruction.programAddress).toBe(POD_COM_PROGRAM_ADDRESS);
      expect(instruction.accounts).toHaveLength(5);
      expect(instruction.data).toBeInstanceOf(Uint8Array);
    });

    test('Handles different message types', () => {
      const textMessage = getSendMessageInstruction({
        message: testKeypair.address,
        channel: testChannelAddress,
        sender: testKeypair,
        payer: testKeypair,
        messageContent: 'Text message',
        messageType: { __kind: 'Text' }
      });

      const systemMessage = getSendMessageInstruction({
        message: testKeypair.address,
        channel: testChannelAddress,
        sender: testKeypair,
        payer: testKeypair,
        messageContent: 'System notification',
        messageType: { __kind: 'System' }
      });

      expect(textMessage.data).not.toEqual(systemMessage.data);
    });

    test('Validates message content length', () => {
      const shortMessage = getSendMessageInstruction({
        message: testKeypair.address,
        channel: testChannelAddress,
        sender: testKeypair,
        payer: testKeypair,
        messageContent: 'Short',
        messageType: { __kind: 'Text' }
      });

      const longMessage = getSendMessageInstruction({
        message: testKeypair.address,
        channel: testChannelAddress,
        sender: testKeypair,
        payer: testKeypair,
        messageContent: 'This is a much longer message that contains significantly more content and should result in a larger instruction data payload',
        messageType: { __kind: 'Text' }
      });

      expect(longMessage.data.length).toBeGreaterThan(shortMessage.data.length);
    });
  });

  describe('5. Broadcast Message Instruction', () => {
    test('Creates valid broadcast instruction', () => {
      const instruction = getBroadcastMessageInstruction({
        message: testKeypair.address,
        channel: testChannelAddress,
        broadcaster: testKeypair,
        payer: testKeypair,
        messageContent: 'Broadcast to all participants!',
        messageType: { __kind: 'Broadcast' }
      });

      expect(instruction.programAddress).toBe(POD_COM_PROGRAM_ADDRESS);
      expect(instruction.accounts).toHaveLength(5);
      expect(instruction.data).toBeInstanceOf(Uint8Array);
    });
  });

  describe('6. Add Participant Instruction', () => {
    test('Creates valid add participant instruction', () => {
      const instruction = getAddParticipantInstruction({
        channel: testChannelAddress,
        participant: testKeypair2.address,
        authority: testKeypair,
        payer: testKeypair
      });

      expect(instruction.programAddress).toBe(POD_COM_PROGRAM_ADDRESS);
      expect(instruction.accounts).toHaveLength(4);
      expect(instruction.data).toBeInstanceOf(Uint8Array);
    });
  });

  describe('7. Parameter Validation', () => {
    test('Instructions handle different signer types', () => {
      // Test with different keypairs for different roles
      const instruction = getVerifyAgentInstruction({
        agentVerification: testKeypair.address,
        agent: testKeypair,
        payer: testKeypair2, // Different payer
        agentPubkey: testKeypair.address,
        serviceEndpoint: 'https://test.com',
        supportedCapabilities: ['test'],
        verifiedAt: BigInt(Date.now())
      });

      expect(instruction.accounts[1]).not.toEqual(instruction.accounts[2]);
    });

    test('Instructions handle timestamp variations', () => {
      const now = BigInt(Date.now());
      const past = now - BigInt(86400000); // 24 hours ago
      const future = now + BigInt(86400000); // 24 hours from now

      const pastInstruction = getVerifyAgentInstruction({
        agentVerification: testKeypair.address,
        agent: testKeypair,
        payer: testKeypair,
        agentPubkey: testKeypair.address,
        serviceEndpoint: 'https://test.com',
        supportedCapabilities: ['test'],
        verifiedAt: past
      });

      const futureInstruction = getVerifyAgentInstruction({
        agentVerification: testKeypair.address,
        agent: testKeypair,
        payer: testKeypair,
        agentPubkey: testKeypair.address,
        serviceEndpoint: 'https://test.com',
        supportedCapabilities: ['test'],
        verifiedAt: future
      });

      expect(pastInstruction.data).not.toEqual(futureInstruction.data);
    });
  });

  describe('8. Account Validation', () => {
    test('All instructions have correct account count', () => {
      const verifyAgent = getVerifyAgentInstruction({
        agentVerification: testKeypair.address,
        agent: testKeypair,
        payer: testKeypair,
        agentPubkey: testKeypair.address,
        serviceEndpoint: 'https://test.com',
        supportedCapabilities: ['test'],
        verifiedAt: BigInt(Date.now())
      });
      expect(verifyAgent.accounts).toHaveLength(4);

      const createChannel = getCreateChannelInstruction({
        channel: testChannelAddress,
        creator: testKeypair,
        payer: testKeypair,
        channelName: 'Test',
        isPublic: true,
        maxParticipants: 100
      });
      expect(createChannel.accounts).toHaveLength(4);

      const sendMessage = getSendMessageInstruction({
        message: testKeypair.address,
        channel: testChannelAddress,
        sender: testKeypair,
        payer: testKeypair,
        messageContent: 'Test',
        messageType: { __kind: 'Text' }
      });
      expect(sendMessage.accounts).toHaveLength(5);
    });

    test('Account roles are properly assigned', () => {
      const instruction = getVerifyAgentInstruction({
        agentVerification: testKeypair.address,
        agent: testKeypair,
        payer: testKeypair,
        agentPubkey: testKeypair.address,
        serviceEndpoint: 'https://test.com',
        supportedCapabilities: ['test'],
        verifiedAt: BigInt(Date.now())
      });

      // Check that accounts have the expected properties
      expect(instruction.accounts[0]).toBeDefined(); // agentVerification
      expect(instruction.accounts[1]).toBeDefined(); // agent (signer)
      expect(instruction.accounts[2]).toBeDefined(); // payer (signer)
      expect(instruction.accounts[3]).toBeDefined(); // systemProgram
    });
  });

  describe('9. Error Handling in Instructions', () => {
    test('Instructions handle edge case parameters', () => {
      // Empty capabilities array
      expect(() => {
        getVerifyAgentInstruction({
          agentVerification: testKeypair.address,
          agent: testKeypair,
          payer: testKeypair,
          agentPubkey: testKeypair.address,
          serviceEndpoint: 'https://test.com',
          supportedCapabilities: [],
          verifiedAt: BigInt(Date.now())
        });
      }).not.toThrow();

      // Very long service endpoint
      expect(() => {
        getVerifyAgentInstruction({
          agentVerification: testKeypair.address,
          agent: testKeypair,
          payer: testKeypair,
          agentPubkey: testKeypair.address,
          serviceEndpoint: 'https://very-long-domain-name-that-exceeds-normal-length.example.com/api/v1/agents/sophisticated-ai-model',
          supportedCapabilities: ['test'],
          verifiedAt: BigInt(Date.now())
        });
      }).not.toThrow();

      // Zero timestamp
      expect(() => {
        getVerifyAgentInstruction({
          agentVerification: testKeypair.address,
          agent: testKeypair,
          payer: testKeypair,
          agentPubkey: testKeypair.address,
          serviceEndpoint: 'https://test.com',
          supportedCapabilities: ['test'],
          verifiedAt: BigInt(0)
        });
      }).not.toThrow();
    });

    test('Channel instructions handle edge cases', () => {
      // Empty channel name
      expect(() => {
        getCreateChannelInstruction({
          channel: testChannelAddress,
          creator: testKeypair,
          payer: testKeypair,
          channelName: '',
          isPublic: true,
          maxParticipants: 1
        });
      }).not.toThrow();

      // Maximum participants = 0
      expect(() => {
        getCreateChannelInstruction({
          channel: testChannelAddress,
          creator: testKeypair,
          payer: testKeypair,
          channelName: 'Test',
          isPublic: true,
          maxParticipants: 0
        });
      }).not.toThrow();
    });

    test('Message instructions handle edge cases', () => {
      // Empty message content
      expect(() => {
        getSendMessageInstruction({
          message: testKeypair.address,
          channel: testChannelAddress,
          sender: testKeypair,
          payer: testKeypair,
          messageContent: '',
          messageType: { __kind: 'Text' }
        });
      }).not.toThrow();
    });
  });

  describe('10. Data Encoding Validation', () => {
    test('Instruction data is properly encoded', () => {
      const instruction = getVerifyAgentInstruction({
        agentVerification: testKeypair.address,
        agent: testKeypair,
        payer: testKeypair,
        agentPubkey: testKeypair.address,
        serviceEndpoint: 'https://test.com',
        supportedCapabilities: ['test'],
        verifiedAt: BigInt(Date.now())
      });

      // Data should be non-empty Uint8Array
      expect(instruction.data).toBeInstanceOf(Uint8Array);
      expect(instruction.data.length).toBeGreaterThan(8); // At least discriminator + some data
      
      // First 8 bytes should be the discriminator
      expect(instruction.data.slice(0, 8)).toEqual(new Uint8Array([42, 158, 201, 44, 92, 88, 134, 201]));
    });

    test('Different inputs produce different encoded data', () => {
      const instruction1 = getVerifyAgentInstruction({
        agentVerification: testKeypair.address,
        agent: testKeypair,
        payer: testKeypair,
        agentPubkey: testKeypair.address,
        serviceEndpoint: 'https://agent1.com',
        supportedCapabilities: ['chat'],
        verifiedAt: BigInt(1000000)
      });

      const instruction2 = getVerifyAgentInstruction({
        agentVerification: testKeypair.address,
        agent: testKeypair,
        payer: testKeypair,
        agentPubkey: testKeypair.address,
        serviceEndpoint: 'https://agent2.com',
        supportedCapabilities: ['translation'],
        verifiedAt: BigInt(2000000)
      });

      expect(instruction1.data).not.toEqual(instruction2.data);
    });
  });
});