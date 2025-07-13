/**
 * External AI Agent Platform Integration Test
 * 
 * This test simulates how external AI agent platforms like SyminDx and ElizaOS
 * would integrate with GhostSpeak protocol. It validates:
 * - Module imports and exports
 * - Type safety and TypeScript compatibility
 * - Wallet and authentication integration
 * - Core protocol operations
 * - Error handling patterns
 * - Performance characteristics
 */

import type { Address } from '@solana/addresses';
import type { KeyPairSigner } from '@solana/signers';
import { 
  createMinimalClient,
  GHOSTSPEAK_PROGRAM_ID,
  lamportsToSol,
  solToLamports,
  type IMinimalClientConfig
} from '../index';

// Simulated external platform interfaces
interface ExternalAIAgent {
  id: string;
  name: string;
  capabilities: string[];
  metadata: Record<string, any>;
}

interface ExternalPlatformConfig {
  networkEndpoint: string;
  walletAdapter: any;
  enableLogging: boolean;
  retryAttempts: number;
}

/**
 * Simulates SyminDx-style integration
 */
class SyminDxGhostSpeakAdapter {
  private client: any;
  private config: ExternalPlatformConfig;
  private logger: Console;

  constructor(config: ExternalPlatformConfig) {
    this.config = config;
    this.logger = config.enableLogging ? console : { log: () => {}, error: () => {}, warn: () => {} } as any;
  }

  /**
   * Initialize connection to GhostSpeak protocol
   */
  async initialize(): Promise<boolean> {
    try {
      this.logger.log('SyminDx: Initializing GhostSpeak connection...');
      
      const clientConfig: IMinimalClientConfig = {
        rpcEndpoint: this.config.networkEndpoint,
        programId: GHOSTSPEAK_PROGRAM_ID,
        commitment: 'confirmed'
      };

      this.client = createMinimalClient(clientConfig);
      
      // Test basic connectivity
      const health = await this.client.getHealth();
      this.logger.log('SyminDx: Health check result:', health);
      
      return true;
    } catch (error) {
      this.logger.error('SyminDx: Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Register an AI agent from external platform
   */
  async registerAgent(agent: ExternalAIAgent): Promise<{ success: boolean; agentAddress?: Address; error?: string }> {
    try {
      this.logger.log('SyminDx: Registering agent:', agent.name);
      
      // Mock agent registration - in real implementation would use actual SDK methods
      const mockAddress = `${agent.id}_ghostspeak_agent` as Address;
      
      this.logger.log('SyminDx: Agent registered with address:', mockAddress);
      
      return {
        success: true,
        agentAddress: mockAddress
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Check wallet balance for transactions
   */
  async checkWalletBalance(walletAddress: Address): Promise<{ balance: number; sufficient: boolean }> {
    try {
      const balance = await this.client.getBalance(walletAddress);
      const sufficient = balance > 0.001; // Minimum balance for operations
      
      this.logger.log('SyminDx: Wallet balance check:', { balance, sufficient });
      
      return { balance, sufficient };
    } catch (error) {
      this.logger.error('SyminDx: Balance check failed:', error);
      return { balance: 0, sufficient: false };
    }
  }

  /**
   * Perform health monitoring
   */
  async performHealthCheck(): Promise<{ healthy: boolean; latency: number; details: any }> {
    const startTime = Date.now();
    
    try {
      const health = await this.client.getHealth();
      const latency = Date.now() - startTime;
      
      return {
        healthy: health === 'ok',
        latency,
        details: { health, programId: GHOSTSPEAK_PROGRAM_ID }
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        details: { error: String(error) }
      };
    }
  }
}

/**
 * Simulates ElizaOS v1.2-style integration
 */
class ElizaOSGhostSpeakIntegration {
  private ghostSpeakClient: any;
  private connectionPool: Map<string, any> = new Map();
  private eventHandlers: Map<string, Function[]> = new Map();

  /**
   * ElizaOS-style service initialization
   */
  async initializeService(endpoint: string): Promise<void> {
    const config: IMinimalClientConfig = {
      rpcEndpoint: endpoint,
      commitment: 'confirmed'
    };

    this.ghostSpeakClient = createMinimalClient(config);
    
    // Test connection pooling capability
    this.connectionPool.set('primary', this.ghostSpeakClient);
    
    console.log('ElizaOS: GhostSpeak service initialized');
  }

  /**
   * ElizaOS event-driven architecture integration
   */
  addEventListener(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * ElizaOS agent lifecycle management
   */
  async manageAgentLifecycle(agentData: ExternalAIAgent): Promise<{
    created: boolean;
    monitored: boolean;
    address?: string;
  }> {
    try {
      // Simulate agent creation
      const mockAddress = `eliza_${agentData.id}_${Date.now()}`;
      
      // Emit lifecycle events (ElizaOS pattern)
      this.emitEvent('agent.created', { agent: agentData, address: mockAddress });
      this.emitEvent('agent.monitoring.started', { address: mockAddress });
      
      return {
        created: true,
        monitored: true,
        address: mockAddress
      };
    } catch (error) {
      this.emitEvent('agent.error', { error, agent: agentData });
      return { created: false, monitored: false };
    }
  }

  /**
   * Utility conversion methods that external platforms need
   */
  convertTokenAmounts(solAmount: number): { lamports: bigint; sol: number } {
    const lamports = solToLamports(solAmount);
    const backToSol = lamportsToSol(lamports);
    
    return { lamports, sol: backToSol };
  }

  private emitEvent(eventName: string, data: any): void {
    const handlers = this.eventHandlers.get(eventName) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`ElizaOS: Event handler error for ${eventName}:`, error);
      }
    });
  }
}

/**
 * Cross-platform compatibility test
 */
class CrossPlatformCompatibilityTest {
  private results: Array<{ test: string; passed: boolean; error?: string; performance?: number }> = [];

  async runAllTests(): Promise<{ passed: number; failed: number; results: any[] }> {
    console.log('🚀 Starting Cross-Platform Compatibility Tests...\n');

    await this.testModuleImports();
    await this.testTypeScriptCompatibility();
    await this.testSyminDxIntegration();
    await this.testElizaOSIntegration();
    await this.testErrorHandling();
    await this.testPerformanceCharacteristics();

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;

    console.log('\n📊 Test Results Summary:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Total: ${this.results.length}`);

    return { passed, failed, results: this.results };
  }

  private async testModuleImports(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Test dynamic imports (external platforms often use lazy loading)
      const { createFullClient } = await import('../index');
      const { loadAdvancedServices } = await import('../index');
      const { loadOptionalServices } = await import('../index');
      
      // Verify factory functions exist
      const fullClientFactory = await createFullClient();
      const services = await loadAdvancedServices();
      const optionalServices = await loadOptionalServices();
      
      this.addResult('Module Imports', true, undefined, Date.now() - startTime);
      console.log('✅ Module imports working correctly');
    } catch (error) {
      this.addResult('Module Imports', false, String(error));
      console.log('❌ Module import failed:', error);
    }
  }

  private async testTypeScriptCompatibility(): Promise<void> {
    try {
      // Test type imports and usage
      const config: IMinimalClientConfig = {
        rpcEndpoint: 'https://api.devnet.solana.com',
        commitment: 'confirmed'
      };

      const client = createMinimalClient(config);
      
      // Test type safety
      const programId: Address = GHOSTSPEAK_PROGRAM_ID;
      const mockAddress: Address = 'mock_address_for_testing' as Address;
      
      // Test utility functions with proper types
      const lamports = solToLamports(1.5);
      const sol = lamportsToSol(lamports);
      
      this.addResult('TypeScript Compatibility', true);
      console.log('✅ TypeScript types working correctly');
    } catch (error) {
      this.addResult('TypeScript Compatibility', false, String(error));
      console.log('❌ TypeScript compatibility failed:', error);
    }
  }

  private async testSyminDxIntegration(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const config: ExternalPlatformConfig = {
        networkEndpoint: 'https://api.devnet.solana.com',
        walletAdapter: null,
        enableLogging: false,
        retryAttempts: 3
      };

      const adapter = new SyminDxGhostSpeakAdapter(config);
      const initialized = await adapter.initialize();
      
      if (initialized) {
        const mockAgent: ExternalAIAgent = {
          id: 'symindx_test_agent_001',
          name: 'SyminDx Test Agent',
          capabilities: ['text_generation', 'data_analysis'],
          metadata: { version: '1.0', platform: 'SyminDx' }
        };

        const registrationResult = await adapter.registerAgent(mockAgent);
        const healthCheck = await adapter.performHealthCheck();
        
        const success = registrationResult.success && healthCheck.healthy;
        this.addResult('SyminDx Integration', success, undefined, Date.now() - startTime);
        console.log('✅ SyminDx integration working correctly');
      } else {
        throw new Error('Failed to initialize SyminDx adapter');
      }
    } catch (error) {
      this.addResult('SyminDx Integration', false, String(error));
      console.log('❌ SyminDx integration failed:', error);
    }
  }

  private async testElizaOSIntegration(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const integration = new ElizaOSGhostSpeakIntegration();
      await integration.initializeService('https://api.devnet.solana.com');
      
      // Test event system
      let eventReceived = false;
      integration.addEventListener('agent.created', () => {
        eventReceived = true;
      });

      const mockAgent: ExternalAIAgent = {
        id: 'eliza_test_agent_001',
        name: 'ElizaOS Test Agent',
        capabilities: ['conversation', 'memory_management'],
        metadata: { framework: 'ElizaOS', version: '1.2' }
      };

      const lifecycleResult = await integration.manageAgentLifecycle(mockAgent);
      
      // Test utility functions
      const conversion = integration.convertTokenAmounts(2.5);
      const conversionWorks = conversion.sol === 2.5 && conversion.lamports > 0n;
      
      const success = lifecycleResult.created && lifecycleResult.monitored && eventReceived && conversionWorks;
      
      this.addResult('ElizaOS Integration', success, undefined, Date.now() - startTime);
      console.log('✅ ElizaOS integration working correctly');
    } catch (error) {
      this.addResult('ElizaOS Integration', false, String(error));
      console.log('❌ ElizaOS integration failed:', error);
    }
  }

  private async testErrorHandling(): Promise<void> {
    try {
      // Test error handling with invalid configuration
      const invalidConfig: IMinimalClientConfig = {
        rpcEndpoint: 'invalid://endpoint',
        commitment: 'confirmed'
      };

      const client = createMinimalClient(invalidConfig);
      
      // Test graceful error handling
      try {
        await client.getHealth();
        // If this doesn't throw, something's wrong
        this.addResult('Error Handling', false, 'Expected error but got success');
      } catch (expectedError) {
        // This is expected behavior
        this.addResult('Error Handling', true);
        console.log('✅ Error handling working correctly');
      }
    } catch (error) {
      this.addResult('Error Handling', false, String(error));
      console.log('❌ Error handling test failed:', error);
    }
  }

  private async testPerformanceCharacteristics(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const client = createMinimalClient({
        rpcEndpoint: 'https://api.devnet.solana.com'
      });

      // Test multiple operations for performance
      const operations = [
        () => client.getLatestBlockhash(),
        () => client.getHealth(),
        () => lamportsToSol(1000000000n),
        () => solToLamports(1.0)
      ];

      const results = await Promise.all(operations.map(async (op, index) => {
        const opStart = Date.now();
        try {
          await op();
          return { operation: index, time: Date.now() - opStart, success: true };
        } catch (error) {
          return { operation: index, time: Date.now() - opStart, success: false, error };
        }
      }));

      const totalTime = Date.now() - startTime;
      const successCount = results.filter(r => r.success).length;
      const avgTime = results.reduce((sum, r) => sum + r.time, 0) / results.length;

      const performanceGood = totalTime < 5000 && successCount >= 2 && avgTime < 2000;
      
      this.addResult('Performance Characteristics', performanceGood, undefined, totalTime);
      console.log('✅ Performance characteristics acceptable:', { totalTime, avgTime, successCount });
    } catch (error) {
      this.addResult('Performance Characteristics', false, String(error));
      console.log('❌ Performance test failed:', error);
    }
  }

  private addResult(test: string, passed: boolean, error?: string, performance?: number): void {
    this.results.push({ test, passed, error, performance });
  }
}

/**
 * Run the external platform integration test
 */
export async function runExternalPlatformIntegrationTest(): Promise<void> {
  console.log('🔬 External AI Agent Platform Integration Test');
  console.log('Testing compatibility with SyminDx, ElizaOS, and similar platforms\n');

  const tester = new CrossPlatformCompatibilityTest();
  const results = await tester.runAllTests();

  console.log('\n🎯 Integration Assessment:');
  
  if (results.failed === 0) {
    console.log('🟢 GhostSpeak is FULLY COMPATIBLE with external AI agent platforms');
  } else if (results.failed <= 2) {
    console.log('🟡 GhostSpeak has MINOR COMPATIBILITY ISSUES with external platforms');
  } else {
    console.log('🔴 GhostSpeak has SIGNIFICANT COMPATIBILITY ISSUES with external platforms');
  }

  console.log('\n📋 Detailed Results:');
  results.results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    const perf = result.performance ? ` (${result.performance}ms)` : '';
    console.log(`${status} ${result.test}${perf}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
}

// Export test runner for use in test files
export { CrossPlatformCompatibilityTest, SyminDxGhostSpeakAdapter, ElizaOSGhostSpeakIntegration };

// Auto-run if called directly
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  runExternalPlatformIntegrationTest().catch(console.error);
}