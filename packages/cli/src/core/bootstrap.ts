/**
 * Service bootstrap for dependency injection setup
 */

import { container, ServiceTokens } from './Container.js'
import { AgentService } from '../services/AgentService.js'
import { WalletService } from '../services/wallet-service.js'
import { BlockchainService } from '../services/blockchain/BlockchainService.js'
import { StorageService } from '../services/storage/StorageService.js'
import { LoggerService } from './logger.js'
import type { IWalletService, IBlockchainService, IStorageService } from '../types/services.js'

/**
 * Initialize all services in the dependency injection container
 */
export function bootstrapServices(): void {
  // Initialize logger service first
  container.register(ServiceTokens.LOGGER_SERVICE, () => new LoggerService())

  // Initialize storage service first (no dependencies)
  container.register(ServiceTokens.STORAGE_SERVICE, () => new StorageService())
  
  // Initialize wallet service (no dependencies)
  container.register(ServiceTokens.WALLET_SERVICE, () => new WalletService())
  
  // Initialize blockchain service (no dependencies)
  container.register(ServiceTokens.BLOCKCHAIN_SERVICE, () => new BlockchainService())
  
  // Initialize agent service (depends on other services)
  container.register(ServiceTokens.AGENT_SERVICE, () => {
    const logger = container.resolve<LoggerService>(ServiceTokens.LOGGER_SERVICE)
    const walletService = container.resolve<IWalletService>(ServiceTokens.WALLET_SERVICE)
    const blockchainService = container.resolve<IBlockchainService>(ServiceTokens.BLOCKCHAIN_SERVICE)
    const storageService = container.resolve<IStorageService>(ServiceTokens.STORAGE_SERVICE)
    
    return new AgentService({
      logger,
      walletService,
      blockchainService,
      storageService
    })
  })
  
  
  // Warm up frequently used services for better performance
  container.warmUp([
    ServiceTokens.LOGGER_SERVICE,
    ServiceTokens.WALLET_SERVICE,
    ServiceTokens.STORAGE_SERVICE,
    ServiceTokens.AGENT_SERVICE
  ])
}