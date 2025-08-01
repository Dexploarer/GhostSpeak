#!/usr/bin/env tsx
/**
 * @fileoverview GhostSpeak script configuration system
 * @description Centralized configuration for all GhostSpeak scripts
 * @author GhostSpeak Development Team
 * @version 1.0.0
 */

import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { GHOSTSPEAK_PROGRAM_ID } from '../config/program-ids.js';

/**
 * GhostSpeak script configuration
 */
export interface GhostSpeakConfig {
  /** Network configurations */
  networks: {
    devnet: NetworkConfig;
    testnet: NetworkConfig;
    mainnet: NetworkConfig;
  };
  /** Program deployment configuration */
  programs: {
    ghostspeak: {
      programId: string;
      idlPath: string;
    };
  };
  /** Default values for various operations */
  defaults: {
    agent: {
      capabilities: string[];
      endpoint: string;
      description: string;
    };
    wallet: {
      minBalance: number; // in SOL
      paths: string[];
    };
    timeouts: {
      rpc: number; // milliseconds
      command: number; // milliseconds
    };
  };
  /** Health check configuration */
  healthCheck: {
    clusters: string[];
    checkInterval: number; // seconds
    maxRetries: number;
  };
}

/**
 * Network-specific configuration
 */
export interface NetworkConfig {
  /** RPC endpoint URL */
  rpcUrl: string;
  /** WebSocket endpoint URL */
  wsUrl?: string;
  /** Network name for display */
  name: string;
  /** Whether this is a production network */
  isProduction: boolean;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: GhostSpeakConfig = {
  networks: {
    devnet: {
      rpcUrl: 'https://api.devnet.solana.com',
      wsUrl: 'wss://api.devnet.solana.com',
      name: 'Devnet',
      isProduction: false
    },
    testnet: {
      rpcUrl: 'https://api.testnet.solana.com',
      wsUrl: 'wss://api.testnet.solana.com',
      name: 'Testnet',
      isProduction: false
    },
    mainnet: {
      rpcUrl: 'https://api.mainnet-beta.solana.com',
      wsUrl: 'wss://api.mainnet-beta.solana.com',
      name: 'Mainnet',
      isProduction: true
    }
  },
  programs: {
    ghostspeak: {
      programId: process.env.GHOSTSPEAK_PROGRAM_ID || GHOSTSPEAK_PROGRAM_ID.toString(),
      idlPath: 'target/idl/ghostspeak_marketplace.json'
    }
  },
  defaults: {
    agent: {
      capabilities: ['chat', 'search', 'analysis'],
      endpoint: 'https://api.example.com/agent',
      description: 'AI agent created via GhostSpeak protocol'
    },
    wallet: {
      minBalance: 0.1, // SOL
      paths: [
        process.env.ANCHOR_WALLET || '',
        path.join(process.env.HOME || '', '.config/solana/id.json'),
        path.join(process.cwd(), '.env.keypair')
      ].filter(Boolean)
    },
    timeouts: {
      rpc: 30000, // 30 seconds
      command: 120000 // 2 minutes
    }
  },
  healthCheck: {
    clusters: ['devnet', 'testnet'],
    checkInterval: 30, // seconds
    maxRetries: 3
  }
};

/**
 * Configuration manager for GhostSpeak scripts
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: GhostSpeakConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Get singleton instance of ConfigManager
   */
  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Load configuration from file or use defaults
   */
  private loadConfig(): GhostSpeakConfig {
    const configPaths = [
      path.join(process.cwd(), 'ghostspeak-scripts.json'),
      path.join(process.cwd(), 'scripts.config.json'),
      path.join(process.cwd(), '.ghostspeak', 'config.json')
    ];

    for (const configPath of configPaths) {
      if (existsSync(configPath)) {
        try {
          const fileConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
          return this.mergeConfig(DEFAULT_CONFIG, fileConfig);
        } catch (error) {
          console.warn(`Warning: Could not load config from ${configPath}:`, error);
        }
      }
    }

    // No config file found, use defaults with environment overrides
    return this.applyEnvironmentOverrides(DEFAULT_CONFIG);
  }

  /**
   * Merge user config with defaults
   */
  private mergeConfig(defaults: GhostSpeakConfig, userConfig: Partial<GhostSpeakConfig>): GhostSpeakConfig {
    return {
      ...defaults,
      ...userConfig,
      networks: {
        ...defaults.networks,
        ...userConfig.networks
      },
      programs: {
        ...defaults.programs,
        ...userConfig.programs
      },
      defaults: {
        ...defaults.defaults,
        ...userConfig.defaults
      }
    };
  }

  /**
   * Apply environment variable overrides
   */
  private applyEnvironmentOverrides(config: GhostSpeakConfig): GhostSpeakConfig {
    // Override RPC URLs from environment
    if (process.env.GHOSTSPEAK_DEVNET_RPC) {
      config.networks.devnet.rpcUrl = process.env.GHOSTSPEAK_DEVNET_RPC;
    }
    if (process.env.GHOSTSPEAK_TESTNET_RPC) {
      config.networks.testnet.rpcUrl = process.env.GHOSTSPEAK_TESTNET_RPC;
    }
    if (process.env.GHOSTSPEAK_MAINNET_RPC) {
      config.networks.mainnet.rpcUrl = process.env.GHOSTSPEAK_MAINNET_RPC;
    }

    // Override program ID from environment
    if (process.env.GHOSTSPEAK_PROGRAM_ID) {
      config.programs.ghostspeak.programId = process.env.GHOSTSPEAK_PROGRAM_ID;
    }

    return config;
  }

  /**
   * Get full configuration
   */
  public getConfig(): GhostSpeakConfig {
    return this.config;
  }

  /**
   * Get network configuration
   */
  public getNetwork(network: 'devnet' | 'testnet' | 'mainnet'): NetworkConfig {
    return this.config.networks[network];
  }

  /**
   * Get program configuration
   */
  public getProgram(name: 'ghostspeak'): { programId: string; idlPath: string } {
    return this.config.programs[name];
  }

  /**
   * Get default values
   */
  public getDefaults(): GhostSpeakConfig['defaults'] {
    return this.config.defaults;
  }

  /**
   * Get current network based on environment
   */
  public getCurrentNetwork(): NetworkConfig {
    const cluster = process.env.ANCHOR_PROVIDER_URL;
    
    if (cluster?.includes('testnet')) {
      return this.getNetwork('testnet');
    } else if (cluster?.includes('mainnet')) {
      return this.getNetwork('mainnet');
    } else {
      return this.getNetwork('devnet'); // default
    }
  }

  /**
   * Check if current network is production
   */
  public isProduction(): boolean {
    return this.getCurrentNetwork().isProduction;
  }
}

// Export convenience functions
export const getConfig = () => ConfigManager.getInstance().getConfig();
export const getNetwork = (network: 'devnet' | 'testnet' | 'mainnet') => 
  ConfigManager.getInstance().getNetwork(network);
export const getProgram = (name: 'ghostspeak') => 
  ConfigManager.getInstance().getProgram(name);
export const getDefaults = () => ConfigManager.getInstance().getDefaults();
export const getCurrentNetwork = () => ConfigManager.getInstance().getCurrentNetwork();
export const isProduction = () => ConfigManager.getInstance().isProduction();