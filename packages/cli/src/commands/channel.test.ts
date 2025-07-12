import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { createChannel } from './channel';
import type { CreateChannelOptions } from './channel';

// Mock dependencies
mock.module('../context-helpers.js', () => ({
  getRpc: mock(() => Promise.resolve({})),
  getRpcSubscriptions: mock(() => Promise.resolve({})),
  getProgramId: mock(() => Promise.resolve('test-program-id')),
  getCommitment: mock(() => Promise.resolve('confirmed')),
  getKeypair: mock(() => Promise.resolve({ address: 'test-address' })),
  getGhostspeakSdk: mock(() => Promise.resolve({
    ChannelService: class {
      constructor() {}
      createChannel = mock(() => Promise.resolve({
        channelId: 'test-channel-id',
        channelPda: 'test-channel-pda',
        signature: 'test-signature'
      }))
    }
  }))
}));

mock.module('../services/channel-wrapper.js', () => ({
  createChannelServiceWrapper: mock((service: any) => service)
}));

mock.module('../utils/network-diagnostics.js', () => ({
  preOperationCheck: mock(() => Promise.resolve()),
  getNetworkErrorMessage: mock(() => 'Network error')
}));

mock.module('../utils/prompts.js', () => ({
  confirm: mock(() => Promise.resolve(true)),
  ProgressIndicator: class {
    start = mock();
    update = mock();
    succeed = mock();
    fail = mock();
  },
  success: mock(),
  error: mock(),
  info: mock(),
  createTable: mock()
}));

// Capture console output
let consoleOutput: string[] = [];
const originalLog = console.log;

beforeEach(() => {
  consoleOutput = [];
  console.log = (...args: any[]) => {
    consoleOutput.push(args.join(' '));
  };
});

afterEach(() => {
  console.log = originalLog;
});

describe('Channel Creation Non-Interactive Mode', () => {
  test('should skip confirmation in non-interactive mode', async () => {
    const options: CreateChannelOptions = {
      nonInteractive: true,
      description: 'Test channel'
    };
    
    await createChannel('TestChannel', options);
    
    // Check that non-interactive message was shown
    expect(consoleOutput.some(line => 
      line.includes('Non-interactive mode: proceeding with channel creation')
    )).toBe(true);
    
    // Check that channel details were NOT shown
    expect(consoleOutput.some(line => 
      line.includes('📋 Channel Details:')
    )).toBe(false);
    
    // Check minimal output format
    expect(consoleOutput.some(line => 
      line.includes('Channel ID: test-channel-id')
    )).toBe(true);
    
    expect(consoleOutput.some(line => 
      line.includes('Transaction: test-signature')
    )).toBe(true);
  });
  
  test('should skip confirmation with --yes flag', async () => {
    const options: CreateChannelOptions = {
      yes: true,
      description: 'Test channel'
    };
    
    await createChannel('YesChannel', options);
    
    // Should behave same as non-interactive
    expect(consoleOutput.some(line => 
      line.includes('Non-interactive mode: proceeding with channel creation')
    )).toBe(true);
    
    // Channel details should be skipped
    expect(consoleOutput.some(line => 
      line.includes('📋 Channel Details:')
    )).toBe(false);
  });
  
  test('should show full details in interactive mode', async () => {
    const options: CreateChannelOptions = {
      description: 'Interactive test channel',
      isPrivate: false,
      maxParticipants: 100,
      encryptionEnabled: false
    };
    
    await createChannel('InteractiveChannel', options);
    
    // Should show channel details
    expect(consoleOutput.some(line => 
      line.includes('📋 Channel Details:')
    )).toBe(true);
    
    // Should show full success output
    expect(consoleOutput.some(line => 
      line.includes('✨ Channel Created Successfully!')
    )).toBe(true);
    
    // Should show next steps
    expect(consoleOutput.some(line => 
      line.includes('💡 Next Steps:')
    )).toBe(true);
  });
  
  test('should handle CI environment as non-interactive', async () => {
    process.env.CI = 'true';
    
    const options: CreateChannelOptions = {
      description: 'CI test channel'
    };
    
    await createChannel('CIChannel', options);
    
    // Should behave as non-interactive
    expect(consoleOutput.some(line => 
      line.includes('Non-interactive mode: proceeding with channel creation')
    )).toBe(true);
    
    // Cleanup
    delete process.env.CI;
  });
});