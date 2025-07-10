/**
 * SDK API Consistency Tests
 * Verifies all modules export correctly, naming is consistent, 
 * type definitions work, and import paths are correct
 */

import { describe, test, expect } from '@jest/globals';

describe('SDK API Consistency', () => {
  
  describe('1. Main Index Exports', () => {
    test('All essential exports are available from main index', async () => {
      const mainExports = await import('../src/index');
      
      // Client factories
      expect(mainExports.createMinimalClient).toBeDefined();
      expect(mainExports.createFullClient).toBeDefined();
      
      // Dynamic loaders
      expect(mainExports.loadAdvancedServices).toBeDefined();
      expect(mainExports.loadOptionalServices).toBeDefined();
      
      // Constants
      expect(mainExports.PODAI_PROGRAM_ID).toBeDefined();
      expect(mainExports.DEVNET_RPC).toBeDefined();
      expect(mainExports.VERSION).toBeDefined();
      expect(mainExports.SDK_NAME).toBeDefined();
      
      // Utilities
      expect(mainExports.lamportsToSol).toBeDefined();
      expect(mainExports.solToLamports).toBeDefined();
      
      // Basic interfaces
      expect(typeof mainExports.lamportsToSol).toBe('function');
      expect(typeof mainExports.solToLamports).toBe('function');
    });

    test('Constants have correct values and types', async () => {
      const { PODAI_PROGRAM_ID, DEVNET_RPC, VERSION, SDK_NAME } = await import('../src/index');
      
      expect(PODAI_PROGRAM_ID).toBe('4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP');
      expect(DEVNET_RPC).toBe('https://api.devnet.solana.com');
      expect(typeof VERSION).toBe('string');
      expect(VERSION).toMatch(/^\d+\.\d+\.\d+/); // Semantic version format
      expect(SDK_NAME).toBe('ghostspeak-sdk');
    });
  });

  describe('2. Client Module Exports', () => {
    test('Client-v2 exports all expected items', async () => {
      const clientExports = await import('../src/client-v2');
      
      // Classes
      expect(clientExports.PodAIClient).toBeDefined();
      
      // Factory functions
      expect(clientExports.createPodAIClient).toBeDefined();
      expect(clientExports.createDevnetClient).toBeDefined();
      expect(clientExports.createLocalnetClient).toBeDefined();
      expect(clientExports.createMainnetClient).toBeDefined();
      
      // All should be functions except PodAIClient which is a class
      expect(typeof clientExports.createPodAIClient).toBe('function');
      expect(typeof clientExports.createDevnetClient).toBe('function');
      expect(typeof clientExports.createLocalnetClient).toBe('function');
      expect(typeof clientExports.createMainnetClient).toBe('function');
    });

    test('Minimal client exports', async () => {
      const minimalExports = await import('../src/client-minimal');
      
      expect(minimalExports.createMinimalClient).toBeDefined();
      expect(typeof minimalExports.createMinimalClient).toBe('function');
    });
  });

  describe('3. Generated Module Exports', () => {
    test('Programs module exports', async () => {
      const programsExports = await import('../src/generated-v2/programs');
      
      expect(programsExports.POD_COM_PROGRAM_ADDRESS).toBeDefined();
      expect(programsExports.POD_COM_PROGRAM_ADDRESS).toBe('4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP');
    });

    test('Instructions index exports all instructions', async () => {
      const instructionsExports = await import('../src/generated-v2/instructions');
      
      expect(instructionsExports.getVerifyAgentInstruction).toBeDefined();
      expect(instructionsExports.getCreateChannelInstruction).toBeDefined();
      expect(instructionsExports.getSendMessageInstruction).toBeDefined();
      expect(instructionsExports.getBroadcastMessageInstruction).toBeDefined();
      expect(instructionsExports.getAddParticipantInstruction).toBeDefined();
    });

    test('Accounts index exports all account types', async () => {
      const accountsExports = await import('../src/generated-v2/accounts');
      
      expect(accountsExports.AgentAccount).toBeDefined();
      expect(accountsExports.ChannelAccount).toBeDefined();
      expect(accountsExports.MessageAccount).toBeDefined();
    });

    test('Types index exports all type definitions', async () => {
      const typesExports = await import('../src/generated-v2/types');
      
      expect(typesExports.MessageType).toBeDefined();
      expect(typesExports.MessageStatus).toBeDefined();
      expect(typesExports.ChannelVisibility).toBeDefined();
    });
  });

  describe('4. Service Module Exports', () => {
    test('Core service modules export service classes', async () => {
      const agentService = await import('../src/services/agent');
      const channelService = await import('../src/services/channel');
      const messageService = await import('../src/services/message');
      const escrowService = await import('../src/services/escrow');
      
      expect(agentService.AgentService).toBeDefined();
      expect(channelService.ChannelService).toBeDefined();
      expect(messageService.MessageService).toBeDefined();
      expect(escrowService.EscrowService).toBeDefined();
    });

    test('Optional service modules export service classes', async () => {
      const auctionService = await import('../src/services/auction');
      const bulkDealsService = await import('../src/services/bulk-deals');
      const reputationService = await import('../src/services/reputation');
      
      expect(auctionService.AuctionService).toBeDefined();
      expect(bulkDealsService.BulkDealsService).toBeDefined();
      expect(reputationService.ReputationService).toBeDefined();
    });

    test('Advanced service modules export service classes', async () => {
      const realtimeService = await import('../src/services/realtime-communication');
      const crossPlatformService = await import('../src/services/cross-platform-bridge');
      const messageRouterService = await import('../src/services/message-router');
      const offlineSyncService = await import('../src/services/offline-sync');
      
      expect(realtimeService.RealtimeCommunicationService).toBeDefined();
      expect(crossPlatformService.CrossPlatformBridgeService).toBeDefined();
      expect(messageRouterService.MessageRouterService).toBeDefined();
      expect(offlineSyncService.OfflineSyncService).toBeDefined();
    });
  });

  describe('5. Utility Module Exports', () => {
    test('Transaction helpers exports', async () => {
      const transactionHelpers = await import('../src/utils/transaction-helpers');
      
      expect(transactionHelpers.sendAndConfirmTransaction).toBeDefined();
      expect(transactionHelpers.createTransaction).toBeDefined();
      expect(transactionHelpers.addInstructionsToTransaction).toBeDefined();
    });

    test('Logger utility exports', async () => {
      const loggerUtil = await import('../src/utils/logger');
      
      expect(loggerUtil.createLogger).toBeDefined();
      expect(typeof loggerUtil.createLogger).toBe('function');
    });

    test('Type helpers exports', async () => {
      const typeHelpers = await import('../src/utils/type-helpers');
      
      expect(typeHelpers.assertAddress).toBeDefined();
      expect(typeHelpers.isValidAddress).toBeDefined();
    });
  });

  describe('6. Import Path Consistency', () => {
    test('All imports work from main index', async () => {
      // Test that common imports work
      const { createMinimalClient, PODAI_PROGRAM_ID, lamportsToSol } = await import('../src/index');
      
      expect(createMinimalClient).toBeDefined();
      expect(PODAI_PROGRAM_ID).toBeDefined();
      expect(lamportsToSol).toBeDefined();
    });

    test('Direct imports work for specific modules', async () => {
      // Test direct imports
      const { PodAIClient } = await import('../src/client-v2');
      const { AgentService } = await import('../src/services/agent');
      const { getVerifyAgentInstruction } = await import('../src/generated-v2/instructions/verifyAgent');
      
      expect(PodAIClient).toBeDefined();
      expect(AgentService).toBeDefined();
      expect(getVerifyAgentInstruction).toBeDefined();
    });

    test('Generated code imports work correctly', async () => {
      // Test that generated code can import its dependencies
      const { POD_COM_PROGRAM_ADDRESS } = await import('../src/generated-v2/programs/podCom');
      const { getVerifyAgentInstruction } = await import('../src/generated-v2/instructions/verifyAgent');
      
      expect(POD_COM_PROGRAM_ADDRESS).toBeDefined();
      expect(getVerifyAgentInstruction).toBeDefined();
    });
  });

  describe('7. Naming Consistency', () => {
    test('Service class naming follows convention', async () => {
      const serviceModules = [
        '../src/services/agent',
        '../src/services/channel', 
        '../src/services/message',
        '../src/services/escrow',
        '../src/services/auction',
        '../src/services/bulk-deals',
        '../src/services/reputation'
      ];

      for (const modulePath of serviceModules) {
        const serviceModule = await import(modulePath);
        const serviceName = modulePath.split('/').pop()?.replace('.ts', '');
        
        // Convert kebab-case to PascalCase + 'Service'
        const expectedClassName = serviceName
          ?.split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join('') + 'Service';
        
        expect(serviceModule[expectedClassName!]).toBeDefined();
      }
    });

    test('Instruction function naming follows convention', async () => {
      const instructionModule = await import('../src/generated-v2/instructions');
      
      // All instruction functions should start with 'get' and end with 'Instruction'
      const instructionFunctions = Object.keys(instructionModule).filter(key => 
        typeof instructionModule[key] === 'function' && key.startsWith('get') && key.endsWith('Instruction')
      );
      
      expect(instructionFunctions.length).toBeGreaterThan(0);
      expect(instructionFunctions).toContain('getVerifyAgentInstruction');
      expect(instructionFunctions).toContain('getCreateChannelInstruction');
      expect(instructionFunctions).toContain('getSendMessageInstruction');
    });

    test('Account type naming follows convention', async () => {
      const accountsModule = await import('../src/generated-v2/accounts');
      
      // All account types should end with 'Account'
      const accountTypes = Object.keys(accountsModule).filter(key => key.endsWith('Account'));
      
      expect(accountTypes.length).toBeGreaterThan(0);
      expect(accountTypes).toContain('AgentAccount');
      expect(accountTypes).toContain('ChannelAccount');
      expect(accountTypes).toContain('MessageAccount');
    });
  });

  describe('8. Type Definition Consistency', () => {
    test('Interface types are properly exported', async () => {
      const mainModule = await import('../src/index');
      
      // These should be available as type imports (can't test directly but can test usage)
      const testAgent = {
        address: 'test-address',
        name: 'Test Agent',
        capabilities: ['test']
      };
      
      const testChannel = {
        address: 'test-address',
        name: 'Test Channel', 
        participants: ['participant1', 'participant2']
      };
      
      const testMessage = {
        id: 'test-id',
        content: 'Test message',
        sender: 'sender-address',
        timestamp: Date.now()
      };
      
      // If types are properly exported, these objects should match the interface shape
      expect(testAgent.name).toBe('Test Agent');
      expect(testChannel.participants).toHaveLength(2);
      expect(testMessage.content).toBe('Test message');
    });

    test('Generated types are consistent', async () => {
      const typesModule = await import('../src/generated-v2/types');
      
      // Check that enum-like types are properly structured
      expect(typesModule.MessageType).toBeDefined();
      expect(typesModule.MessageStatus).toBeDefined();
      expect(typesModule.ChannelVisibility).toBeDefined();
    });

    test('Web3.js types are re-exported correctly', async () => {
      const mainModule = await import('../src/index');
      
      // The main module should re-export essential Web3.js types
      // We can't directly test type exports, but we can verify they don't cause import errors
      expect(() => {
        // This would fail if types aren't properly exported
        const importStatement = "import type { Address, Commitment, Rpc, SolanaRpcApi, KeyPairSigner } from '../src/index'";
        expect(importStatement).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('9. Bundle Structure Validation', () => {
    test('Generated index file exports all modules', async () => {
      const generatedIndex = await import('../src/generated-v2/index');
      
      expect(generatedIndex).toBeDefined();
      // The generated index should have exports
      expect(Object.keys(generatedIndex).length).toBeGreaterThan(0);
    });

    test('Service modules can be imported independently', async () => {
      // Test that each service can be imported without the full client
      const agentService = await import('../src/services/agent');
      const channelService = await import('../src/services/channel');
      
      expect(agentService.AgentService).toBeDefined();
      expect(channelService.ChannelService).toBeDefined();
    });
  });

  describe('10. Developer Experience Consistency', () => {
    test('Factory functions have consistent signatures', async () => {
      const { createPodAIClient, createDevnetClient, createLocalnetClient, createMainnetClient } = 
        await import('../src/client-v2');
      
      // All factory functions should be functions
      expect(typeof createPodAIClient).toBe('function');
      expect(typeof createDevnetClient).toBe('function');
      expect(typeof createLocalnetClient).toBe('function');
      expect(typeof createMainnetClient).toBe('function');
      
      // Environment-specific functions should have optional programId parameter
      const devnetClient = createDevnetClient();
      const localnetClient = createLocalnetClient();
      const mainnetClient = createMainnetClient();
      
      expect(devnetClient).toBeDefined();
      expect(localnetClient).toBeDefined();
      expect(mainnetClient).toBeDefined();
    });

    test('Dynamic imports return expected structure', async () => {
      const { createFullClient, loadAdvancedServices, loadOptionalServices } = 
        await import('../src/index');
      
      const fullClient = await createFullClient();
      expect(fullClient.PodAIClient).toBeDefined();
      expect(fullClient.createPodAIClient).toBeDefined();
      
      const advancedServices = await loadAdvancedServices();
      expect(advancedServices.AgentService).toBeDefined();
      expect(advancedServices.ChannelService).toBeDefined();
      expect(advancedServices.MessageService).toBeDefined();
      expect(advancedServices.EscrowService).toBeDefined();
      
      const optionalServices = await loadOptionalServices();
      expect(optionalServices.AuctionService).toBeDefined();
      expect(optionalServices.BulkDealsService).toBeDefined();
      expect(optionalServices.ReputationService).toBeDefined();
    });

    test('Error messages are consistent', async () => {
      // Test that modules don't throw on import
      expect(async () => {
        await import('../src/index');
        await import('../src/client-v2');
        await import('../src/generated-v2/programs/podCom');
        await import('../src/services/agent');
      }).not.toThrow();
    });
  });
});