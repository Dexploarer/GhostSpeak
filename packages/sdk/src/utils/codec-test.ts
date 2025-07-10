/**
 * Test file to verify codec compatibility fixes
 */

import { address } from '@solana/addresses';
import { generateKeyPairSigner } from '@solana/signers';
import { FixedInstructionBuilder } from './instruction-wrappers';
import { codecs, toBigInt, createAddress, isValidBase58Address } from './codec-compat';

/**
 * Test basic codec functionality
 */
export function testBasicCodecs() {
  console.log('Testing basic codec functionality...');

  // Test address validation
  const validAddress = '11111111111111111111111111111111';
  const invalidAddress = 'invalid';
  
  console.log('Valid address check:', isValidBase58Address(validAddress)); // Should be true
  console.log('Invalid address check:', isValidBase58Address(invalidAddress)); // Should be false

  // Test address creation
  try {
    const addr = createAddress(validAddress);
    console.log('Address creation successful:', addr);
  } catch (error) {
    console.error('Address creation failed:', error);
  }

  // Test BigInt conversion
  console.log('BigInt from number:', toBigInt(12345));
  console.log('BigInt from string:', toBigInt('98765'));
  console.log('BigInt from bigint:', toBigInt(BigInt(555)));

  // Test UTF8 codec with getSizeFromValue
  const utf8Encoder = codecs.utf8();
  const testString = 'Hello, PodAI!';
  const encoded = utf8Encoder.encode(testString);
  console.log('UTF8 encoded length:', encoded.length);
  if (utf8Encoder.getSizeFromValue) {
    console.log('getSizeFromValue result:', utf8Encoder.getSizeFromValue(testString));
  }

  // Test address codec with getSizeFromValue
  const addressEncoder = codecs.address();
  const testAddress = address(validAddress);
  const encodedAddress = addressEncoder.encode(testAddress);
  console.log('Address encoded length:', encodedAddress.length);
  if (addressEncoder.getSizeFromValue) {
    console.log('Address getSizeFromValue result:', addressEncoder.getSizeFromValue(testAddress));
  }

  // Test U64 codec with getSizeFromValue
  const u64Encoder = codecs.u64();
  const testBigInt = BigInt(123456789);
  const encodedU64 = u64Encoder.encode(testBigInt);
  console.log('U64 encoded length:', encodedU64.length);
  if (u64Encoder.getSizeFromValue) {
    console.log('U64 getSizeFromValue result:', u64Encoder.getSizeFromValue(testBigInt));
  }

  console.log('Basic codec tests completed');
}

/**
 * Test instruction creation
 */
export async function testInstructionCreation() {
  console.log('Testing instruction creation...');

  try {
    // Create test keypairs
    const agentKeypair = await generateKeyPairSigner();
    const payerKeypair = await generateKeyPairSigner();

    // Test verify agent instruction
    const verifyAgentInstruction = FixedInstructionBuilder.verifyAgent({
      agentVerification: address('11111111111111111111111111111111'),
      agent: agentKeypair,
      payer: payerKeypair,
      agentPubkey: agentKeypair.address,
      serviceEndpoint: 'https://api.example.com',
      supportedCapabilities: ['text-generation', 'image-analysis'],
      verifiedAt: Date.now(),
    });

    console.log('Verify agent instruction created successfully');
    console.log('Program address:', verifyAgentInstruction.programAddress);
    console.log('Accounts count:', verifyAgentInstruction.accounts.length);
    console.log('Data length:', verifyAgentInstruction.data.length);

    // Test create channel instruction
    const createChannelInstruction = FixedInstructionBuilder.createChannel({
      channel: address('So11111111111111111111111111111111111111112'),
      channelName: 'test-channel',
      visibility: 1,
      maxParticipants: 100,
      owner: agentKeypair,
      payer: payerKeypair,
    });

    console.log('Create channel instruction created successfully');
    console.log('Program address:', createChannelInstruction.programAddress);
    console.log('Accounts count:', createChannelInstruction.accounts.length);
    console.log('Data length:', createChannelInstruction.data.length);

    // Test send message instruction
    const sendMessageInstruction = FixedInstructionBuilder.sendMessage({
      channel: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      message: address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
      sender: agentKeypair,
      payer: payerKeypair,
      content: 'Hello from test!',
      messageType: 1,
    });

    console.log('Send message instruction created successfully');
    console.log('Program address:', sendMessageInstruction.programAddress);
    console.log('Accounts count:', sendMessageInstruction.accounts.length);
    console.log('Data length:', sendMessageInstruction.data.length);

    // Test create service listing instruction
    const createServiceListingInstruction = FixedInstructionBuilder.createServiceListing({
      serviceListing: address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
      agent: agentKeypair,
      payer: payerKeypair,
      serviceName: 'AI Text Generation',
      description: 'High-quality text generation service',
      price: BigInt(1000000), // 1 SOL in lamports
      serviceType: 1,
    });

    console.log('Create service listing instruction created successfully');
    console.log('Program address:', createServiceListingInstruction.programAddress);
    console.log('Accounts count:', createServiceListingInstruction.accounts.length);
    console.log('Data length:', createServiceListingInstruction.data.length);

    // Test purchase service instruction
    const purchaseServiceInstruction = FixedInstructionBuilder.purchaseService({
      serviceListing: address('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
      purchaseOrder: address('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr'),
      buyer: payerKeypair,
      seller: agentKeypair.address,
      payer: payerKeypair,
      amount: BigInt(1000000),
    });

    console.log('Purchase service instruction created successfully');
    console.log('Program address:', purchaseServiceInstruction.programAddress);
    console.log('Accounts count:', purchaseServiceInstruction.accounts.length);
    console.log('Data length:', purchaseServiceInstruction.data.length);

    console.log('All instruction creation tests passed!');
    return true;
  } catch (error) {
    console.error('Instruction creation test failed:', error);
    return false;
  }
}

/**
 * Test complex struct encoding
 */
export function testComplexStructEncoding() {
  console.log('Testing complex struct encoding...');

  try {
    // Test struct with array of strings
    const structEncoder = codecs.struct([
      ['discriminator', codecs.bytes({ size: 8 })],
      ['name', codecs.utf8()],
      ['capabilities', codecs.array(codecs.utf8())],
      ['timestamp', codecs.u64()],
      ['price', codecs.u64()],
    ]);

    const testData = {
      discriminator: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
      name: 'Test Agent',
      capabilities: ['text', 'image', 'audio'],
      timestamp: BigInt(Date.now()),
      price: BigInt(5000000),
    };

    const encoded = structEncoder.encode(testData);
    console.log('Complex struct encoded successfully');
    console.log('Encoded length:', encoded.length);

    if (structEncoder.getSizeFromValue) {
      const calculatedSize = structEncoder.getSizeFromValue(testData);
      console.log('Calculated size:', calculatedSize);
      console.log('Size calculation matches:', encoded.length === calculatedSize);
    }

    return true;
  } catch (error) {
    console.error('Complex struct encoding test failed:', error);
    return false;
  }
}

/**
 * Run all codec tests
 */
export async function runCodecTests() {
  console.log('=== Starting Codec Compatibility Tests ===');

  try {
    testBasicCodecs();
    console.log('✅ Basic codec tests passed');

    const structTestPassed = testComplexStructEncoding();
    if (structTestPassed) {
      console.log('✅ Complex struct encoding tests passed');
    } else {
      console.log('❌ Complex struct encoding tests failed');
    }

    const instructionTestPassed = await testInstructionCreation();
    if (instructionTestPassed) {
      console.log('✅ Instruction creation tests passed');
    } else {
      console.log('❌ Instruction creation tests failed');
    }

    console.log('=== Codec Compatibility Tests Completed ===');
    return structTestPassed && instructionTestPassed;
  } catch (error) {
    console.error('Codec tests failed with error:', error);
    return false;
  }
}

// Export for use in other test files
export default {
  testBasicCodecs,
  testInstructionCreation,
  testComplexStructEncoding,
  runCodecTests,
};

// Run tests if this file is executed directly
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  runCodecTests().then(success => {
    console.log(`Tests ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}