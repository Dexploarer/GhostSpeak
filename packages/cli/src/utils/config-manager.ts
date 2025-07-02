import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { address } from '@solana/addresses';

export interface CLIConfig {
  network: 'devnet' | 'testnet' | 'mainnet-beta';
  rpcUrl?: string;
  walletPath?: string;
  defaultAgent?: string;
  preferences: {
    theme: 'dark' | 'light';
    verbose: boolean;
    autoApprove: boolean;
  };
  lastUsed: Date;
}

export interface AgentConfig {
  address: string;
  name: string;
  capabilities: number;
  reputation: number;
  lastActive: Date;
}

export interface IConfig {
  network: string;
  rpcUrl: string;
  walletPath?: string;
  testMode?: boolean;
}

export class ConfigManager {
  private configDir: string;
  private configPath: string;
  private agentsPath: string;
  private config: IConfig;

  constructor() {
    this.configDir = join(homedir(), '.podai');
    this.configPath = join(this.configDir, 'config.json');
    this.agentsPath = join(this.configDir, 'agents.json');
    this.config = this.loadConfig();
    
    // Auto-detect test mode from environment
    if (process.env.NODE_ENV === 'test' || process.env.GHOSTSPEAK_TEST_MODE === 'true') {
      this.config.testMode = true;
    }

    this.ensureConfigDir();
  }

  /**
   * Ensure configuration directory exists
   */
  private ensureConfigDir(): void {
    if (!existsSync(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true });
    }
  }

  /**
   * Load CLI configuration
   */
  async load(): Promise<CLIConfig> {
    try {
      if (!existsSync(this.configPath)) {
        return this.getDefaultConfig();
      }

      const configData = readFileSync(this.configPath, 'utf-8');
      const config = JSON.parse(configData);
      
      // Merge with defaults to handle missing fields
      return {
        ...this.getDefaultConfig(),
        ...config,
        lastUsed: new Date(config.lastUsed)
      };
    } catch (error) {
      console.warn('Failed to load config, using defaults:', error);
      return this.getDefaultConfig();
    }
  }

  /**
   * Save CLI configuration
   */
  async save(config: Partial<CLIConfig>): Promise<void> {
    try {
      const currentConfig = await this.load();
      const updatedConfig = {
        ...currentConfig,
        ...config,
        lastUsed: new Date()
      };

      writeFileSync(this.configPath, JSON.stringify(updatedConfig, null, 2));
    } catch (error) {
      throw new Error(`Failed to save config: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): CLIConfig {
    return {
      network: 'devnet',
      preferences: {
        theme: 'dark',
        verbose: false,
        autoApprove: false
      },
      lastUsed: new Date()
    };
  }

  /**
   * Load saved agents
   */
  async loadAgents(): Promise<AgentConfig[]> {
    try {
      if (!existsSync(this.agentsPath)) {
        return [];
      }

      const agentsData = readFileSync(this.agentsPath, 'utf-8');
      const agents = JSON.parse(agentsData);
      
      return agents.map((agent: any) => ({
        ...agent,
        lastActive: new Date(agent.lastActive)
      }));
    } catch (error) {
      console.warn('Failed to load agents:', error);
      return [];
    }
  }

  /**
   * Save agent configuration
   */
  async saveAgent(agent: AgentConfig): Promise<void> {
    try {
      const agents = await this.loadAgents();
      const existingIndex = agents.findIndex(a => a.address === agent.address);
      
      if (existingIndex >= 0) {
        agents[existingIndex] = agent;
      } else {
        agents.push(agent);
      }

      writeFileSync(this.agentsPath, JSON.stringify(agents, null, 2));
    } catch (error) {
      throw new Error(`Failed to save agent: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Remove agent configuration
   */
  async removeAgent(address: string): Promise<void> {
    try {
      const agents = await this.loadAgents();
      const filteredAgents = agents.filter(a => a.address !== address);
      
      writeFileSync(this.agentsPath, JSON.stringify(filteredAgents, null, 2));
    } catch (error) {
      throw new Error(`Failed to remove agent: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get RPC URL for current network
   */
  async getRpcUrl(): Promise<string> {
    const config = await this.load();
    
    if (config.rpcUrl) {
      return config.rpcUrl;
    }

    // Default RPC URLs
    switch (config.network) {
      case 'devnet':
        return 'https://api.devnet.solana.com';
      case 'testnet':
        return 'https://api.testnet.solana.com';
      case 'mainnet-beta':
        return 'https://api.mainnet-beta.solana.com';
      default:
        return 'https://api.devnet.solana.com';
    }
  }

  /**
   * Validate agent address using Web3.js v2
   */
  validateAgentAddress(addressString: string): boolean {
    try {
      address(addressString);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get configuration file paths for debugging
   */
  getPaths(): { configDir: string; configPath: string; agentsPath: string } {
    return {
      configDir: this.configDir,
      configPath: this.configPath,
      agentsPath: this.agentsPath
    };
  }

  isTestMode(): boolean {
    return this.config.testMode || false;
  }

  private loadConfig(): IConfig {
    try {
      if (!existsSync(this.configPath)) {
        return {
          network: 'devnet',
          rpcUrl: 'https://api.devnet.solana.com',
          testMode: false
        };
      }

      const configData = readFileSync(this.configPath, 'utf-8');
      const config = JSON.parse(configData);
      
      return {
        network: config.network || 'devnet',
        rpcUrl: config.rpcUrl || 'https://api.devnet.solana.com',
        walletPath: config.walletPath,
        testMode: config.testMode || false
      };
    } catch (error) {
      return {
        network: 'devnet',
        rpcUrl: 'https://api.devnet.solana.com',
        testMode: false
      };
    }
  }
}