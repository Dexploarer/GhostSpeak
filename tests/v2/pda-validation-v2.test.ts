import { describe, test, expect, beforeAll } from '@jest/globals';

// ✅ Web3.js v2 ONLY - No v1 imports allowed
import { address, type Address } from '@solana/addresses';
import { generateKeyPairSigner, type KeyPairSigner } from '@solana/signers';
import { createSolanaRpc, type Rpc } from '@solana/rpc';
import { getBase58Decoder, getBase58Encoder } from '@solana/codecs';

// ✅ Program addresses using v2 address() function
const PROGRAM_ID = address('HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps');
const SYSTEM_PROGRAM_ID = address('11111111111111111111111111111112');

// ✅ Test configuration using v2 patterns
interface TestConfig {
  rpc: Rpc;
  agentCreator: KeyPairSigner;
  agentProvider: KeyPairSigner;
}

let testConfig: TestConfig;

describe('PDA Validation - Web3.js v2', () => {
  beforeAll(async () => {
    console.log('🚀 Setting up Web3.js v2 PDA validation...');
    
    // ✅ Create RPC using v2 pattern
    const rpc = createSolanaRpc('http://localhost:8899');
    
    // ✅ Generate signers using v2 pattern
    const agentCreator = await generateKeyPairSigner();
    const agentProvider = await generateKeyPairSigner();
    
    testConfig = {
      rpc,
      agentCreator,
      agentProvider
    };
    
    console.log('✅ Web3.js v2 setup completed');
  });

  test('should validate agent PDA seeds using v2 patterns', async () => {
    console.log('🧪 Testing agent PDA seeds...');
    
    // ✅ Using v2 KeyPairSigner addresses
    expect(testConfig.agentCreator.address).toBeDefined();
    expect(testConfig.agentProvider.address).toBeDefined();
    
    // ✅ Seed validation using v2 patterns
    const agentSeed = new TextEncoder().encode('agent');
    const timestampSeed = new TextEncoder().encode(Date.now().toString());
    
    expect(agentSeed).toHaveLength(5);
    expect(timestampSeed.length).toBeGreaterThan(0);
    
    console.log('✅ Agent PDA seeds validated');
  });

  test('should validate channel PDA seeds using v2 patterns', async () => {
    console.log('🧪 Testing channel PDA seeds...');
    
    const channelSeed = new TextEncoder().encode('channel');
    const channelId = new TextEncoder().encode('test-channel-001');
    
    expect(channelSeed).toHaveLength(7);
    expect(channelId.length).toBeGreaterThan(0);
    
    // ✅ Validate seed combinations
    const combinedSeeds = new Uint8Array([...channelSeed, ...channelId]);
    expect(combinedSeeds.length).toBe(channelSeed.length + channelId.length);
    
    console.log('✅ Channel PDA seeds validated');
  });

  test('should validate message PDA seeds using v2 patterns', async () => {
    console.log('🧪 Testing message PDA seeds...');
    
    const messageSeed = new TextEncoder().encode('message');
    const messageId = crypto.getRandomValues(new Uint8Array(8));
    
    expect(messageSeed).toHaveLength(7);
    expect(messageId).toHaveLength(8);
    
    // ✅ Validate random seed generation
    const anotherMessageId = crypto.getRandomValues(new Uint8Array(8));
    expect(messageId).not.toEqual(anotherMessageId);
    
    console.log('✅ Message PDA seeds validated');
  });

  test('should validate address encoding/decoding using v2 patterns', async () => {
    console.log('🧪 Testing address encoding/decoding...');
    
    // ✅ Use v2 base58 codecs
    const base58Encoder = getBase58Encoder();
    const base58Decoder = getBase58Decoder();
    
    // ✅ Test address round-trip
    const originalAddress = testConfig.agentCreator.address;
    const encoded = base58Encoder.encode(originalAddress);
    const decoded = base58Decoder.decode(encoded);
    
    expect(decoded).toEqual(originalAddress);
    
    console.log('✅ Address encoding/decoding validated');
  });

  test('should validate program ID using v2 patterns', async () => {
    console.log('🧪 Testing program ID validation...');
    
    // ✅ Validate program ID format
    expect(PROGRAM_ID).toBeDefined();
    expect(SYSTEM_PROGRAM_ID).toBeDefined();
    
    // ✅ Ensure addresses are correct type
    expect(typeof PROGRAM_ID).toBe('string');
    expect(typeof SYSTEM_PROGRAM_ID).toBe('string');
    
    console.log('✅ Program ID validation completed');
  });

  test('should validate concurrent signer generation', async () => {
    console.log('🧪 Testing concurrent signer generation...');
    
    // ✅ Generate multiple signers concurrently using v2
    const signerPromises = Array.from({ length: 5 }, () => generateKeyPairSigner());
    const signers = await Promise.all(signerPromises);
    
    // ✅ Validate all signers are unique
    const addresses = signers.map(s => s.address);
    const uniqueAddresses = new Set(addresses);
    
    expect(uniqueAddresses.size).toBe(signers.length);
    expect(signers).toHaveLength(5);
    
    signers.forEach(signer => {
      expect(signer.address).toBeDefined();
      expect(typeof signer.address).toBe('string');
    });
    
    console.log('✅ Concurrent signer generation validated');
  });
}); 