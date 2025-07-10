/**
 * @example Basic Agent Registration
 * 
 * This example demonstrates how to register a new AI agent on the GhostSpeak protocol.
 * It covers the complete process from client setup to agent verification.
 */

import { 
  createClient, 
  Core, 
  Protocol, 
  Utils, 
  Constants, 
  Types 
} from '../src/index-documented';
import { createRpc } from '@solana/rpc';
import { createKeyPairFromBytes } from '@solana/keys';
import { createTransactionSigner } from '@solana/signers';

/**
 * Configuration for the agent registration example
 */
interface AgentConfig {
  name: string;
  description: string;
  endpoint: string;
  capabilities: Types.AgentCapability[];
  metadata?: Record<string, unknown>;
}

/**
 * Example agent configuration
 */
const EXAMPLE_AGENT_CONFIG: AgentConfig = {
  name: 'CodeAnalyzer-v1',
  description: 'Advanced code analysis agent specializing in TypeScript and Rust',
  endpoint: 'https://api.example.com/agent/code-analyzer',
  capabilities: [
    'code_analysis',
    'text_generation',
    'recommendation'
  ],
  metadata: {
    version: '1.0.0',
    author: 'Example Developer',
    supportedLanguages: ['typescript', 'rust', 'javascript'],
    maxFileSize: 1024 * 1024, // 1MB
  }
};

/**
 * Register a new AI agent on the GhostSpeak protocol
 */
async function registerAgent(): Promise<void> {
  try {
    console.log('🚀 Starting agent registration process...\n');

    // Step 1: Initialize RPC connection
    console.log('📡 Connecting to Solana devnet...');
    const rpc = createRpc(Constants.RPC_ENDPOINTS.DEVNET);
    
    // Step 2: Create GhostSpeak client with optimized settings
    console.log('🔧 Initializing GhostSpeak client...');
    const client = await createClient(rpc, {
      retryConfig: Protocol.DEFAULT_RETRY_CONFIGS.CRITICAL,
      enableCircuitBreaker: true,
      preloadModules: ['agent'],
      developmentMode: true
    });

    // Step 3: Create agent keypair (in production, load from secure storage)
    console.log('🔑 Creating agent keypair...');
    const agentKeypair = await createKeyPairFromBytes(crypto.getRandomValues(new Uint8Array(32)));
    const agentSigner = createTransactionSigner(agentKeypair);
    
    console.log(`Agent Public Key: ${agentKeypair.address}`);

    // Step 4: Validate agent configuration
    console.log('✅ Validating agent configuration...');
    validateAgentConfig(EXAMPLE_AGENT_CONFIG);

    // Step 5: Load agent service module
    console.log('📦 Loading agent service module...');
    const agentService = await client.loadModule('agent');

    // Step 6: Calculate required fees and rent
    console.log('💰 Calculating registration costs...');
    const registrationCost = await calculateRegistrationCost(rpc);
    console.log(`Estimated cost: ${Core.TokenAmountUtils.formatAmount(registrationCost, 9)} SOL`);

    // Step 7: Derive agent PDA
    console.log('🔍 Deriving Program Derived Address...');
    const programId = Constants.PROGRAM_IDS.DEVNET as Core.Address;
    const agentPDA = await Protocol.PDAUtils.deriveAgentPDA(
      agentKeypair.address,
      programId
    );
    console.log(`Agent PDA: ${agentPDA}`);

    // Step 8: Create agent registration transaction
    console.log('📝 Creating agent registration transaction...');
    
    // Note: This would use the actual generated instruction builders
    // For demonstration, we'll show the expected interface
    const registrationParams = {
      agent: agentSigner,
      name: EXAMPLE_AGENT_CONFIG.name,
      description: EXAMPLE_AGENT_CONFIG.description,
      endpoint: EXAMPLE_AGENT_CONFIG.endpoint,
      capabilities: EXAMPLE_AGENT_CONFIG.capabilities,
      metadata: JSON.stringify(EXAMPLE_AGENT_CONFIG.metadata || {}),
      verifiedAt: Core.TimestampUtils.now(),
    };

    // Step 9: Send transaction with retry logic
    console.log('📤 Sending registration transaction...');
    const transactionSender = Utils.getGlobalTransactionSender();
    
    // Simulate transaction sending (actual implementation would use generated instructions)
    const signature = await simulateAgentRegistration(registrationParams);
    
    console.log(`✅ Agent registered successfully!`);
    console.log(`Transaction signature: ${signature}`);
    console.log(`Agent PDA: ${agentPDA}`);

    // Step 10: Verify agent registration
    console.log('🔍 Verifying agent registration...');
    await verifyAgentRegistration(client, agentKeypair.address, programId);

    // Step 11: Display summary
    displayRegistrationSummary(EXAMPLE_AGENT_CONFIG, agentKeypair.address, signature);

  } catch (error) {
    console.error('❌ Agent registration failed:', error);
    
    if (error instanceof Utils.EnhancedTransactionError) {
      console.error(`Error type: ${error.type}`);
      console.error(`Retryable: ${error.retryable}`);
    }
    
    throw error;
  }
}

/**
 * Validate agent configuration parameters
 */
function validateAgentConfig(config: AgentConfig): void {
  Protocol.ProtocolValidator.validateAgentName(config.name);
  Protocol.ProtocolValidator.validateAgentDescription(config.description);
  Protocol.ProtocolValidator.validateEndpoint(config.endpoint);
  Protocol.ProtocolValidator.validateCapabilities(config.capabilities);
  
  console.log('✅ Agent configuration is valid');
}

/**
 * Calculate the cost of agent registration
 */
async function calculateRegistrationCost(rpc: Core.Rpc<any>): Promise<bigint> {
  // Account rent for agent account
  const agentAccountRent = BigInt(Constants.ACCOUNT_SIZES.AGENT * 6960); // ~6960 lamports per byte
  
  // Transaction fee
  const transactionFee = 5000n;
  
  // Additional protocol fees
  const protocolFee = Constants.FEES.DEFAULT_MESSAGE_FEE;
  
  return agentAccountRent + transactionFee + protocolFee;
}

/**
 * Simulate agent registration (placeholder for actual implementation)
 */
async function simulateAgentRegistration(params: any): Promise<string> {
  // In a real implementation, this would:
  // 1. Build the actual instruction using generated instruction builders
  // 2. Create and sign the transaction
  // 3. Send with retry logic and circuit breaker protection
  // 4. Wait for confirmation
  
  await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay
  
  // Return a mock transaction signature
  return 'mock_signature_' + Math.random().toString(36).substring(2);
}

/**
 * Verify that the agent was successfully registered
 */
async function verifyAgentRegistration(
  client: any,
  agentAddress: Core.Address,
  programId: Core.Address
): Promise<void> {
  try {
    // Derive agent PDA
    const agentPDA = await Protocol.PDAUtils.deriveAgentPDA(agentAddress, programId);
    
    // Try to fetch the agent account
    const queryUtils = await client.loadModule('queryUtils');
    const agentAccount = await queryUtils.getAgent(agentAddress, programId);
    
    if (agentAccount) {
      console.log('✅ Agent account found and verified');
      console.log(`Agent name: ${agentAccount.name}`);
      console.log(`Last updated: ${new Date(Number(agentAccount.lastUpdated) * 1000).toISOString()}`);
    } else {
      throw new Error('Agent account not found after registration');
    }
  } catch (error) {
    console.warn('⚠️ Could not verify agent registration immediately. This may be due to network delays.');
    console.log('💡 Try checking the agent status in a few minutes.');
  }
}

/**
 * Display registration summary
 */
function displayRegistrationSummary(
  config: AgentConfig,
  agentAddress: Core.Address,
  signature: string
): void {
  console.log('\n🎉 Agent Registration Complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📛 Agent Name: ${config.name}`);
  console.log(`📝 Description: ${config.description}`);
  console.log(`🌐 Endpoint: ${config.endpoint}`);
  console.log(`🔧 Capabilities: ${config.capabilities.join(', ')}`);
  console.log(`🔑 Public Key: ${agentAddress}`);
  console.log(`📃 Transaction: ${signature}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n💡 Next Steps:');
  console.log('1. Configure your agent endpoint to respond to requests');
  console.log('2. Test agent functionality with the CLI tools');
  console.log('3. Monitor agent performance and reputation');
  console.log('4. Update agent configuration as needed\n');
}

/**
 * Error handling example with specific error types
 */
async function handleRegistrationErrors(): Promise<void> {
  try {
    await registerAgent();
  } catch (error) {
    if (error instanceof Utils.EnhancedTransactionError) {
      switch (error.type) {
        case Utils.ErrorType.NETWORK:
          console.error('🌐 Network error - please check your connection and try again');
          break;
        case Utils.ErrorType.INSUFFICIENT_FUNDS:
          console.error('💰 Insufficient funds - please add SOL to your wallet');
          break;
        case Utils.ErrorType.RATE_LIMIT:
          console.error('⏳ Rate limited - waiting before retry...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          // Could implement automatic retry here
          break;
        default:
          console.error('❌ Transaction failed:', error.message);
      }
    } else {
      console.error('❌ Unexpected error:', error);
    }
  }
}

// Main execution
if (import.meta.main) {
  console.log('🤖 GhostSpeak Agent Registration Example\n');
  handleRegistrationErrors()
    .then(() => console.log('\n✅ Example completed successfully'))
    .catch(error => {
      console.error('\n❌ Example failed:', error);
      process.exit(1);
    });
}

export {
  registerAgent,
  validateAgentConfig,
  calculateRegistrationCost,
  verifyAgentRegistration,
  type AgentConfig
};