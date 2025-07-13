/**
 * @fileoverview Basic Agent Setup Example
 * @description Shows how to set up a SyminDx agent and register it on GhostSpeak Protocol
 */

import { createSyminDxExtension, Constants } from '../src/index';
import type { Address } from '@solana/addresses';

/**
 * Basic agent setup example
 */
async function basicAgentSetup() {
  console.log('🚀 Starting basic SyminDx agent setup...');
  
  try {
    // Create extension with development configuration
    const extension = await createSyminDxExtension({
      network: 'devnet',
      programId: '367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK' as Address,
      agentName: 'BasicAgent',
      agentDescription: 'A basic AI agent for demonstration purposes',
      agentCapabilities: ['text_generation', 'data_processing'],
      enableDebugLogging: true,
    });
    
    console.log('✅ Extension created successfully');
    
    // Initialize the extension
    await extension.initialize();
    console.log('✅ Extension initialized');
    
    // Check health status
    const health = await extension.getHealthStatus();
    console.log('🏥 Health status:', health);
    
    if (health.status !== 'healthy') {
      console.warn('⚠️ Extension is not fully healthy:', health.errors);
      return;
    }
    
    // Set up event listeners
    extension.events.subscribe('agent:registered', (event) => {
      console.log('🎉 Agent registered:', event.agentId);
    });
    
    extension.events.subscribe('system:error', (event) => {
      console.error('❌ System error:', event.message);
    });
    
    // Register the agent (requires a signer in real implementation)
    console.log('📝 Registering agent...');
    
    // Note: In a real implementation, you would need to provide a signer
    // For this example, we'll simulate the registration
    extension.events.simulateAgentRegistered('agent_123', {
      id: 'agent_123',
      name: 'BasicAgent',
      owner: '11111111111111111111111111111112' as Address,
      capabilities: ['text_generation', 'data_processing'],
      reputation: 0,
      isActive: true,
      lastActivity: Date.now(),
      metadata: {
        version: '1.0.0',
        description: 'A basic AI agent for demonstration purposes',
      },
    });
    
    // Get agent information from memory
    const agentResult = await extension.tools.getAgent('agent_123');
    if (agentResult.success) {
      console.log('👤 Agent information:', agentResult.data);
    }
    
    // Update agent activity
    await extension.memory.updateAgentActivity('agent_123');
    console.log('🔄 Agent activity updated');
    
    // Get memory statistics
    const stats = extension.memory.getStatistics();
    console.log('📊 Memory statistics:', stats);
    
    console.log('✅ Basic agent setup completed successfully');
    
  } catch (error) {
    console.error('❌ Error in basic agent setup:', error);
  }
}

/**
 * Agent configuration example
 */
async function agentConfiguration() {
  console.log('⚙️ Starting agent configuration example...');
  
  try {
    // Create extension with custom configuration
    const extension = await createSyminDxExtension({
      network: 'devnet',
      programId: '367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK' as Address,
      agentName: 'ConfiguredAgent',
      agentDescription: 'An agent with custom configuration',
      agentCapabilities: ['text_generation', 'code_analysis', 'sentiment_analysis'],
      enableDebugLogging: true,
      enableCircuitBreaker: true,
      retryConfig: {
        maxAttempts: 3,
        initialDelayMs: 1000,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
        jitterFactor: 0.1,
      },
      cacheConfig: {
        maxSize: 1000,
        ttlMs: 300000, // 5 minutes
        enableCompression: false,
      },
      eventConfig: {
        maxSubscriptions: 50,
        reconnectAttempts: 5,
        reconnectDelayMs: 1000,
        heartbeatIntervalMs: 30000,
      },
    });
    
    console.log('✅ Extension created with custom configuration');
    
    // Get configuration details
    const config = extension.config;
    console.log('📋 Network:', config.network);
    console.log('📋 Program ID:', config.programId);
    console.log('📋 Agent info:', config.agent);
    console.log('📋 Features:', config.features);
    console.log('📋 Cache config:', config.cacheConfig);
    console.log('📋 Event config:', config.eventConfig);
    
    console.log('✅ Agent configuration example completed');
    
  } catch (error) {
    console.error('❌ Error in agent configuration:', error);
  }
}

/**
 * Environment-based configuration example
 */
async function environmentConfiguration() {
  console.log('🌍 Starting environment configuration example...');
  
  try {
    // Set environment variables
    process.env.SYMINDX_NETWORK = 'devnet';
    process.env.SYMINDX_PROGRAM_ID = '367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK';
    process.env.SYMINDX_AGENT_NAME = 'EnvAgent';
    process.env.SYMINDX_DEBUG_LOGGING = 'true';
    process.env.SYMINDX_CIRCUIT_BREAKER = 'true';
    
    // Create extension using environment variables
    const extension = await createSyminDxExtension({
      // Minimal config - rest will be loaded from environment
      agentDescription: 'An agent configured via environment variables',
      agentCapabilities: ['text_generation'],
    });
    
    console.log('✅ Extension created using environment configuration');
    
    // Export configuration as environment variables
    const envVars = extension.config.toEnvironmentVariables();
    console.log('📤 Environment variables:', envVars);
    
    console.log('✅ Environment configuration example completed');
    
  } catch (error) {
    console.error('❌ Error in environment configuration:', error);
  }
}

/**
 * Run all examples
 */
async function runExamples() {
  console.log('🎯 Running basic agent setup examples...\n');
  
  await basicAgentSetup();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await agentConfiguration();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await environmentConfiguration();
  
  console.log('\n🎉 All examples completed successfully!');
}

// Run examples if this file is executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}

export {
  basicAgentSetup,
  agentConfiguration,
  environmentConfiguration,
  runExamples,
};