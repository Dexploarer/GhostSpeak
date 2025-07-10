/**
 * End-to-End Complete Workflow Tests
 * 
 * Tests complete user journeys through the GhostSpeak Protocol including
 * realistic scenarios from agent onboarding to service completion.
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { spawn } from 'bun';
import { join } from 'path';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';

// Test configuration
const CLI_PATH = join(__dirname, '..', 'dist', 'cli.js');
const TEST_TIMEOUT = 60000; // 60 seconds

// Test data
const TEST_SCENARIOS = {
  AI_CODING_ASSISTANT: {
    agentName: 'e2e-coding-assistant',
    description: 'AI assistant specializing in code generation and review',
    capabilities: ['javascript', 'typescript', 'python', 'code-review'],
    serviceFee: '5000',
    metadataUri: 'ipfs://QmCodingAssistantMetadata',
    serviceUrl: 'https://coding-assistant.example.com',
  },
  DATA_ANALYST: {
    agentName: 'e2e-data-analyst',
    description: 'AI agent for data analysis and visualization',
    capabilities: ['data-analysis', 'python', 'pandas', 'visualization'],
    serviceFee: '7500',
    metadataUri: 'ipfs://QmDataAnalystMetadata',
    serviceUrl: 'https://data-analyst.example.com',
  },
  CONTENT_CREATOR: {
    agentName: 'e2e-content-creator',
    description: 'AI agent for content writing and marketing',
    capabilities: ['writing', 'marketing', 'seo', 'social-media'],
    serviceFee: '3000',
    metadataUri: 'ipfs://QmContentCreatorMetadata',
    serviceUrl: 'https://content-creator.example.com',
  },
};

describe('End-to-End Complete Workflow Tests', () => {
  let tempDir: string;
  let registeredAgents: string[] = [];
  let createdChannels: string[] = [];
  let activeEscrows: string[] = [];

  beforeAll(async () => {
    // Create temporary directory for test files
    tempDir = await mkdtemp(join(tmpdir(), 'ghostspeak-e2e-'));
    
    // Initialize CLI configuration
    await writeFile(join(tempDir, '.ghostspeak-config.json'), JSON.stringify({
      network: 'devnet',
      rpcEndpoint: 'https://api.devnet.solana.com',
      programId: '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP',
      keyPath: join(tempDir, 'test-keypair.json'),
    }));
  });

  afterAll(async () => {
    // Cleanup temporary directory
    await rm(tempDir, { recursive: true, force: true });
  });

  // Helper function to run CLI commands
  async function runCLI(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
    const proc = spawn(['bun', CLI_PATH, ...args], {
      cwd: tempDir,
      env: { ...process.env, GHOSTSPEAK_CONFIG_DIR: tempDir },
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    return { code: exitCode, stdout, stderr };
  }

  describe('Complete Agent Onboarding Journey', () => {
    it('should complete full agent registration and setup workflow', async () => {
      const { AI_CODING_ASSISTANT } = TEST_SCENARIOS;
      
      // Step 1: Initialize CLI configuration
      const initResult = await runCLI(['config', 'init', '--network', 'devnet']);
      expect(initResult.code).toBe(0);

      // Step 2: Generate new keypair for agent
      const keypairResult = await runCLI(['config', 'generate-keypair']);
      expect(keypairResult.code).toBe(0);

      // Step 3: Fund the account (devnet)
      const fundResult = await runCLI(['config', 'airdrop', '2']);
      expect(fundResult.code).toBe(0);

      // Step 4: Register the agent
      const registerResult = await runCLI([
        'agent', 'register',
        '--name', AI_CODING_ASSISTANT.agentName,
        '--description', AI_CODING_ASSISTANT.description,
        '--capabilities', AI_CODING_ASSISTANT.capabilities.join(','),
        '--service-fee', AI_CODING_ASSISTANT.serviceFee,
        '--metadata-uri', AI_CODING_ASSISTANT.metadataUri,
        '--service-url', AI_CODING_ASSISTANT.serviceUrl,
      ]);
      
      expect(registerResult.code).toBe(0);
      expect(registerResult.stdout).toMatch(/✅.*registered|Agent.*created/i);
      
      // Extract agent ID from output
      const agentIdMatch = registerResult.stdout.match(/ID[:\s]+([a-zA-Z0-9]+)/);
      expect(agentIdMatch).not.toBeNull();
      const agentId = agentIdMatch![1];
      registeredAgents.push(agentId);

      // Step 5: Verify agent registration
      const statusResult = await runCLI(['agent', 'status', agentId]);
      expect(statusResult.code).toBe(0);
      expect(statusResult.stdout).toMatch(/Name.*AI_CODING_ASSISTANT.agentName/);
      expect(statusResult.stdout).toMatch(/Active.*true|Yes/i);

      // Step 6: Update agent profile
      const updateResult = await runCLI([
        'agent', 'update', agentId,
        '--description', 'Updated: ' + AI_CODING_ASSISTANT.description,
      ]);
      expect(updateResult.code).toBe(0);

      // Step 7: List agents to verify presence
      const listResult = await runCLI(['agent', 'list', '--active']);
      expect(listResult.code).toBe(0);
      expect(listResult.stdout).toMatch(new RegExp(AI_CODING_ASSISTANT.agentName));
    }, TEST_TIMEOUT);

    it('should handle agent verification process', async () => {
      const agentId = registeredAgents[0];
      expect(agentId).toBeDefined();

      // Submit for verification
      const verifyResult = await runCLI([
        'agent', 'verify', agentId,
        '--endpoint', TEST_SCENARIOS.AI_CODING_ASSISTANT.serviceUrl,
        '--capabilities', TEST_SCENARIOS.AI_CODING_ASSISTANT.capabilities.join(','),
      ]);

      // Verification might not be immediate, so we check the submission
      expect(verifyResult.code).toBe(0);
      expect(verifyResult.stdout).toMatch(/verification.*submitted|pending/i);
    }, TEST_TIMEOUT);
  });

  describe('Service Discovery and Marketplace Interaction', () => {
    beforeAll(async () => {
      // Register multiple agents for marketplace testing
      for (const [key, scenario] of Object.entries(TEST_SCENARIOS)) {
        if (key !== 'AI_CODING_ASSISTANT') { // Already registered
          const registerResult = await runCLI([
            'agent', 'register',
            '--name', scenario.agentName,
            '--description', scenario.description,
            '--capabilities', scenario.capabilities.join(','),
            '--service-fee', scenario.serviceFee,
            '--metadata-uri', scenario.metadataUri,
            '--service-url', scenario.serviceUrl,
          ]);
          
          if (registerResult.code === 0) {
            const agentIdMatch = registerResult.stdout.match(/ID[:\s]+([a-zA-Z0-9]+)/);
            if (agentIdMatch) {
              registeredAgents.push(agentIdMatch[1]);
            }
          }
        }
      }
    });

    it('should discover agents by capabilities', async () => {
      // Search for Python-capable agents
      const searchResult = await runCLI([
        'marketplace', 'search',
        '--capability', 'python',
        '--max-price', '10000',
      ]);

      expect(searchResult.code).toBe(0);
      expect(searchResult.stdout).toMatch(/Found.*agents?|Results/i);
      
      // Should find both coding assistant and data analyst
      expect(searchResult.stdout).toMatch(/coding-assistant|data-analyst/i);
    }, TEST_TIMEOUT);

    it('should filter agents by price range', async () => {
      const filterResult = await runCLI([
        'marketplace', 'search',
        '--min-price', '3000',
        '--max-price', '6000',
        '--sort-by', 'price',
      ]);

      expect(filterResult.code).toBe(0);
      expect(filterResult.stdout).toMatch(/Found.*agents?/i);
    }, TEST_TIMEOUT);

    it('should show detailed agent profiles', async () => {
      const agentId = registeredAgents[0];
      
      const profileResult = await runCLI(['marketplace', 'profile', agentId]);
      expect(profileResult.code).toBe(0);
      expect(profileResult.stdout).toMatch(/Agent Profile|Details/i);
      expect(profileResult.stdout).toMatch(/Capabilities/i);
      expect(profileResult.stdout).toMatch(/Service Fee/i);
    }, TEST_TIMEOUT);
  });

  describe('Communication and Channel Management', () => {
    it('should create and manage communication channels', async () => {
      // Create a public channel
      const createChannelResult = await runCLI([
        'channel', 'create',
        '--name', 'e2e-test-project-discussion',
        '--type', 'public',
        '--description', 'Channel for discussing E2E test project',
      ]);

      expect(createChannelResult.code).toBe(0);
      expect(createChannelResult.stdout).toMatch(/Channel.*created|✅/i);
      
      // Extract channel ID
      const channelIdMatch = createChannelResult.stdout.match(/ID[:\s]+([a-zA-Z0-9]+)/);
      expect(channelIdMatch).not.toBeNull();
      const channelId = channelIdMatch![1];
      createdChannels.push(channelId);

      // Join the channel
      const joinResult = await runCLI(['channel', 'join', channelId]);
      expect(joinResult.code).toBe(0);

      // Send messages
      const messages = [
        'Hello, I\'m looking for help with a Python data analysis project',
        'The project involves processing CSV files and creating visualizations',
        'Budget is around 7500 tokens, deadline is next week',
      ];

      for (const message of messages) {
        const sendResult = await runCLI([
          'channel', 'send', channelId,
          '--message', message,
          '--type', 'text',
        ]);
        expect(sendResult.code).toBe(0);
      }

      // List messages
      const messagesResult = await runCLI(['channel', 'messages', channelId]);
      expect(messagesResult.code).toBe(0);
      expect(messagesResult.stdout).toMatch(/data analysis project/i);
    }, TEST_TIMEOUT);

    it('should invite agents to channels', async () => {
      const channelId = createdChannels[0];
      const agentId = registeredAgents.find(id => 
        // Find the data analyst agent
        TEST_SCENARIOS.DATA_ANALYST.agentName.includes('data-analyst')
      );

      if (agentId && channelId) {
        const inviteResult = await runCLI([
          'channel', 'invite', channelId, agentId,
        ]);
        
        // Invitation might require agent acceptance
        expect(inviteResult.code).toBe(0);
        expect(inviteResult.stdout).toMatch(/invited|invitation sent/i);
      }
    }, TEST_TIMEOUT);
  });

  describe('Complete Service Transaction Workflow', () => {
    it('should execute full service purchase and delivery cycle', async () => {
      // Find a suitable agent (data analyst for our project)
      const dataAnalystAgent = registeredAgents[1]; // Assuming second agent is data analyst
      
      // Step 1: Create escrow for the service
      const createEscrowResult = await runCLI([
        'escrow', 'create',
        '--agent', dataAnalystAgent,
        '--amount', '7500',
        '--deadline', (Date.now() + 604800000).toString(), // 1 week
        '--description', 'Python data analysis and visualization project',
        '--requirements', 'CSV processing,Data visualization,Python pandas,Matplotlib/Seaborn',
      ]);

      expect(createEscrowResult.code).toBe(0);
      expect(createEscrowResult.stdout).toMatch(/Escrow.*created|✅/i);
      
      // Extract escrow ID
      const escrowIdMatch = createEscrowResult.stdout.match(/ID[:\s]+([a-zA-Z0-9]+)/);
      expect(escrowIdMatch).not.toBeNull();
      const escrowId = escrowIdMatch![1];
      activeEscrows.push(escrowId);

      // Step 2: Check escrow status
      const statusResult = await runCLI(['escrow', 'status', escrowId]);
      expect(statusResult.code).toBe(0);
      expect(statusResult.stdout).toMatch(/Status.*Active|Pending/i);

      // Step 3: Simulate work completion by agent
      const completeResult = await runCLI([
        'escrow', 'complete', escrowId,
        '--proof', 'ipfs://QmCompletionProofDataAnalysis',
        '--deliverables', 'data_analysis.py,visualizations.png,report.md',
        '--notes', 'Project completed as requested with additional insights',
      ]);

      expect(completeResult.code).toBe(0);
      expect(completeResult.stdout).toMatch(/completion.*submitted|work.*completed/i);

      // Step 4: Client reviews and releases escrow
      const releaseResult = await runCLI([
        'escrow', 'release', escrowId,
        '--rating', '5',
        '--review', 'Excellent work! Very thorough analysis and clear visualizations.',
      ]);

      expect(releaseResult.code).toBe(0);
      expect(releaseResult.stdout).toMatch(/escrow.*released|payment.*sent/i);

      // Step 5: Verify final status
      const finalStatusResult = await runCLI(['escrow', 'status', escrowId]);
      expect(finalStatusResult.code).toBe(0);
      expect(finalStatusResult.stdout).toMatch(/Status.*Completed|Released/i);
    }, TEST_TIMEOUT);

    it('should handle dispute resolution workflow', async () => {
      // Create another escrow for dispute testing
      const createEscrowResult = await runCLI([
        'escrow', 'create',
        '--agent', registeredAgents[2] || registeredAgents[0],
        '--amount', '3000',
        '--deadline', (Date.now() + 86400000).toString(), // 24 hours
        '--description', 'Content writing project for testing disputes',
        '--requirements', 'Blog post,SEO optimization,1000 words',
      ]);

      if (createEscrowResult.code === 0) {
        const escrowIdMatch = createEscrowResult.stdout.match(/ID[:\s]+([a-zA-Z0-9]+)/);
        if (escrowIdMatch) {
          const escrowId = escrowIdMatch[1];
          
          // Raise a dispute
          const disputeResult = await runCLI([
            'escrow', 'dispute', escrowId,
            '--reason', 'Work delivered does not match requirements',
            '--evidence', 'Original requirements vs delivered content comparison',
          ]);

          expect(disputeResult.code).toBe(0);
          expect(disputeResult.stdout).toMatch(/dispute.*raised|submitted/i);

          // Check dispute status
          const disputeStatusResult = await runCLI(['escrow', 'status', escrowId]);
          expect(disputeStatusResult.code).toBe(0);
          expect(disputeStatusResult.stdout).toMatch(/Status.*Disputed/i);
        }
      }
    }, TEST_TIMEOUT);
  });

  describe('Advanced Features and Edge Cases', () => {
    it('should handle bulk operations efficiently', async () => {
      // List all agents
      const listAgentsResult = await runCLI(['agent', 'list', '--limit', '50']);
      expect(listAgentsResult.code).toBe(0);

      // List all channels  
      const listChannelsResult = await runCLI(['channel', 'list', '--limit', '50']);
      expect(listChannelsResult.code).toBe(0);

      // List all escrows
      const listEscrowsResult = await runCLI(['escrow', 'list', '--status', 'all']);
      expect(listEscrowsResult.code).toBe(0);
    }, TEST_TIMEOUT);

    it('should handle configuration management', async () => {
      // Show current configuration
      const showConfigResult = await runCLI(['config', 'show']);
      expect(showConfigResult.code).toBe(0);
      expect(showConfigResult.stdout).toMatch(/Network.*devnet/i);

      // Test configuration validation
      const validateResult = await runCLI(['config', 'validate']);
      expect(validateResult.code).toBe(0);
    }, TEST_TIMEOUT);

    it('should provide helpful error messages', async () => {
      // Test invalid agent ID
      const invalidAgentResult = await runCLI(['agent', 'status', 'invalid-agent-id']);
      expect(invalidAgentResult.code).not.toBe(0);
      expect(invalidAgentResult.stderr).toMatch(/not found|invalid/i);

      // Test invalid escrow operation
      const invalidEscrowResult = await runCLI(['escrow', 'release', 'non-existent-escrow']);
      expect(invalidEscrowResult.code).not.toBe(0);
      expect(invalidEscrowResult.stderr).toMatch(/not found|invalid/i);

      // Test missing required parameters
      const missingParamResult = await runCLI(['agent', 'register']);
      expect(missingParamResult.code).not.toBe(0);
      expect(missingParamResult.stderr).toMatch(/required|missing/i);
    }, TEST_TIMEOUT);

    it('should maintain data consistency across sessions', async () => {
      // Verify registered agents persist
      const listResult = await runCLI(['agent', 'list']);
      expect(listResult.code).toBe(0);
      
      for (const agentName of Object.values(TEST_SCENARIOS).map(s => s.agentName)) {
        expect(listResult.stdout).toMatch(new RegExp(agentName));
      }

      // Verify channels persist
      if (createdChannels.length > 0) {
        const channelListResult = await runCLI(['channel', 'list']);
        expect(channelListResult.code).toBe(0);
        expect(channelListResult.stdout).toMatch(/test-project-discussion/);
      }
    }, TEST_TIMEOUT);
  });

  describe('Performance and Reliability', () => {
    it('should handle rapid successive operations', async () => {
      const startTime = Date.now();
      
      // Perform multiple operations rapidly
      const operations = await Promise.allSettled([
        runCLI(['agent', 'list', '--limit', '10']),
        runCLI(['marketplace', 'search', '--capability', 'python']),
        runCLI(['channel', 'list', '--limit', '10']),
        runCLI(['escrow', 'list', '--status', 'active']),
      ]);

      const duration = Date.now() - startTime;
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(30000); // 30 seconds
      
      // Most operations should succeed
      const successful = operations.filter(op => 
        op.status === 'fulfilled' && op.value.code === 0
      );
      expect(successful.length).toBeGreaterThan(operations.length / 2);
    }, TEST_TIMEOUT);

    it('should recover gracefully from network issues', async () => {
      // Test with invalid RPC endpoint
      const invalidConfigResult = await runCLI([
        'config', 'set',
        '--rpc-endpoint', 'https://invalid-endpoint.example.com',
      ]);
      
      if (invalidConfigResult.code === 0) {
        // Try an operation that should fail gracefully
        const testOpResult = await runCLI(['agent', 'list']);
        expect(testOpResult.stderr).toMatch(/network|connection|timeout/i);
        
        // Restore valid configuration
        await runCLI([
          'config', 'set',
          '--rpc-endpoint', 'https://api.devnet.solana.com',
        ]);
      }
    }, TEST_TIMEOUT);
  });
});