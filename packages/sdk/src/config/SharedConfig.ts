/**
 * SharedConfig - Unified configuration system for CLI and SDK
 * 
 * This module provides a shared configuration system that both CLI and SDK
 * can use to maintain consistent state and settings across the entire system.
 */

import { existsSync } from 'fs';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { Keypair } from '@solana/web3.js';
import { address, type Address } from '@solana/addresses';

export interface NetworkConfig {
  network: 'devnet' | 'testnet' | 'mainnet-beta';
  rpcUrl: string;
  wsUrl?: string;
  commitment?: 'processed' | 'confirmed' | 'finalized';
}

export interface WalletConfig {
  keypairPath?: string;
  publicKey?: string;
  privateKey?: Uint8Array;
}

export interface AgentInfo {
  address: Address;
  name: string;
  type: string;
  description?: string;
  capabilities?: string[];
  createdAt: Date;
  lastUsed: Date;
}

export interface ChannelInfo {
  address: Address;
  name: string;
  type: 'public' | 'private';
  description?: string;
  participants?: Address[];
  createdAt: Date;
  lastUsed: Date;
}

export interface SharedConfiguration {
  // Network configuration
  network: NetworkConfig;
  
  // Wallet configuration
  wallet: WalletConfig;
  
  // Application state
  state: {
    currentAgent?: string;
    currentChannel?: string;
    lastActivity?: Date;
  };
  
  // Registered entities
  agents: Record<string, AgentInfo>;
  channels: Record<string, ChannelInfo>;
  
  // Feature flags
  features: {
    compressionEnabled: boolean;
    confidentialTransfersEnabled: boolean;
    mevProtectionEnabled: boolean;
    offlineModeEnabled: boolean;
  };
  
  // Performance settings
  performance: {
    maxConcurrentRequests: number;
    requestTimeout: number;
    retryAttempts: number;
    cacheEnabled: boolean;
    cacheTTL: number;
  };
  
  // Developer settings
  developer: {
    debugMode: boolean;
    verboseLogging: boolean;
    showTransactionDetails: boolean;
    simulateTransactions: boolean;
  };
  
  // Security settings
  security: {
    confirmTransactions: boolean;
    maxTransactionValue: bigint;
    requireApprovalForLargeTransactions: boolean;
    encryptLocalStorage: boolean;
  };
}

const DEFAULT_CONFIG: SharedConfiguration = {
  network: {
    network: 'devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    commitment: 'confirmed',
  },
  wallet: {},
  state: {},
  agents: {},
  channels: {},
  features: {
    compressionEnabled: true,
    confidentialTransfersEnabled: false,
    mevProtectionEnabled: false,
    offlineModeEnabled: false,
  },
  performance: {
    maxConcurrentRequests: 10,
    requestTimeout: 30000,
    retryAttempts: 3,
    cacheEnabled: true,
    cacheTTL: 300000, // 5 minutes
  },
  developer: {
    debugMode: false,
    verboseLogging: false,
    showTransactionDetails: false,
    simulateTransactions: true,
  },
  security: {
    confirmTransactions: true,
    maxTransactionValue: BigInt(1_000_000_000), // 1 SOL in lamports
    requireApprovalForLargeTransactions: true,
    encryptLocalStorage: false,
  },
};

export class SharedConfig {
  private static instance: SharedConfig | null = null;
  private config: SharedConfiguration;
  private readonly configPath: string;
  private listeners: Map<string, Set<(config: SharedConfiguration) => void>> = new Map();
  
  private constructor(config: SharedConfiguration, configPath: string) {
    this.config = config;
    this.configPath = configPath;
  }
  
  /**
   * Load or create the shared configuration
   */
  static async load(customPath?: string): Promise<SharedConfig> {
    if (SharedConfig.instance) {
      return SharedConfig.instance;
    }
    
    const configPath = customPath || join(homedir(), '.ghostspeak', 'shared-config.json');
    
    try {
      let config: SharedConfiguration;
      
      if (existsSync(configPath)) {
        const configData = await readFile(configPath, 'utf8');
        const loadedConfig = JSON.parse(configData, (key, value) => {
          // Handle BigInt deserialization
          if (key === 'maxTransactionValue' && typeof value === 'string') {
            return BigInt(value);
          }
          // Handle Date deserialization
          if ((key === 'createdAt' || key === 'lastUsed' || key === 'lastActivity') && typeof value === 'string') {
            return new Date(value);
          }
          return value;
        });
        
        // Deep merge with defaults
        config = deepMerge(DEFAULT_CONFIG, loadedConfig);
      } else {
        config = { ...DEFAULT_CONFIG };
        
        // Create config directory
        const configDir = dirname(configPath);
        if (!existsSync(configDir)) {
          await mkdir(configDir, { recursive: true });
        }
        
        // Save default config
        await writeFile(configPath, JSON.stringify(config, replacer, 2), 'utf8');
      }
      
      SharedConfig.instance = new SharedConfig(config, configPath);
      return SharedConfig.instance;
    } catch (error) {
      console.error('Error loading shared configuration:', error);
      SharedConfig.instance = new SharedConfig(DEFAULT_CONFIG, configPath);
      return SharedConfig.instance;
    }
  }
  
  /**
   * Save the configuration to disk
   */
  async save(): Promise<void> {
    try {
      const configDir = dirname(this.configPath);
      if (!existsSync(configDir)) {
        await mkdir(configDir, { recursive: true });
      }
      
      await writeFile(
        this.configPath,
        JSON.stringify(this.config, replacer, 2),
        'utf8'
      );
      
      // Notify listeners
      this.notifyListeners('save');
    } catch (error) {
      throw new Error(
        `Failed to save shared configuration: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * Get the current configuration
   */
  get(): SharedConfiguration {
    return deepClone(this.config);
  }
  
  /**
   * Update configuration values
   */
  async update(updates: DeepPartial<SharedConfiguration>): Promise<void> {
    this.config = deepMerge(this.config, updates);
    await this.save();
    this.notifyListeners('update');
  }
  
  /**
   * Get network configuration
   */
  getNetwork(): NetworkConfig {
    return { ...this.config.network };
  }
  
  /**
   * Set network configuration
   */
  async setNetwork(network: Partial<NetworkConfig>): Promise<void> {
    this.config.network = { ...this.config.network, ...network };
    await this.save();
    this.notifyListeners('network');
  }
  
  /**
   * Get or load wallet keypair
   */
  async getKeypair(): Promise<Keypair | null> {
    if (this.config.wallet.privateKey) {
      return Keypair.fromSecretKey(this.config.wallet.privateKey);
    }
    
    if (this.config.wallet.keypairPath && existsSync(this.config.wallet.keypairPath)) {
      try {
        const keypairData = await readFile(this.config.wallet.keypairPath, 'utf8');
        const secretKey = new Uint8Array(JSON.parse(keypairData));
        return Keypair.fromSecretKey(secretKey);
      } catch (error) {
        console.error('Error loading keypair:', error);
      }
    }
    
    return null;
  }
  
  /**
   * Set wallet configuration
   */
  async setWallet(wallet: WalletConfig): Promise<void> {
    this.config.wallet = { ...this.config.wallet, ...wallet };
    await this.save();
    this.notifyListeners('wallet');
  }
  
  /**
   * Add or update an agent
   */
  async addAgent(agent: AgentInfo): Promise<void> {
    this.config.agents[agent.name] = agent;
    await this.save();
    this.notifyListeners('agents');
  }
  
  /**
   * Get agent by name
   */
  getAgent(name: string): AgentInfo | undefined {
    return this.config.agents[name];
  }
  
  /**
   * List all agents
   */
  listAgents(): AgentInfo[] {
    return Object.values(this.config.agents);
  }
  
  /**
   * Add or update a channel
   */
  async addChannel(channel: ChannelInfo): Promise<void> {
    this.config.channels[channel.name] = channel;
    await this.save();
    this.notifyListeners('channels');
  }
  
  /**
   * Get channel by name
   */
  getChannel(name: string): ChannelInfo | undefined {
    return this.config.channels[name];
  }
  
  /**
   * List all channels
   */
  listChannels(): ChannelInfo[] {
    return Object.values(this.config.channels);
  }
  
  /**
   * Subscribe to configuration changes
   */
  subscribe(event: string, listener: (config: SharedConfiguration) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(listener);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(event);
      if (listeners) {
        listeners.delete(listener);
      }
    };
  }
  
  /**
   * Notify listeners of changes
   */
  private notifyListeners(event: string): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(this.config));
    }
    
    // Also notify 'all' listeners
    const allListeners = this.listeners.get('all');
    if (allListeners) {
      allListeners.forEach(listener => listener(this.config));
    }
  }
  
  /**
   * Reset configuration to defaults
   */
  async reset(): Promise<void> {
    this.config = deepClone(DEFAULT_CONFIG);
    await this.save();
    this.notifyListeners('reset');
  }
}

// Helper functions
function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = result[key];
      
      if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue) && !(sourceValue instanceof Date) && !(sourceValue instanceof Uint8Array)) {
        if (targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
          result[key] = deepMerge(targetValue as any, sourceValue as any);
        } else {
          result[key] = sourceValue as any;
        }
      } else {
        result[key] = sourceValue as any;
      }
    }
  }
  
  return result;
}

function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Uint8Array) return new Uint8Array(obj) as any;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;
  if (typeof obj === 'bigint') return obj as any;
  
  const cloned: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  
  return cloned;
}

function replacer(key: string, value: any): any {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
}

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export default SharedConfig;