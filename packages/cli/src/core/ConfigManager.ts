import { existsSync } from 'fs';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { homedir } from 'os';
import { join, dirname } from 'path';

export interface GhostSpeakConfig {
  // Network settings
  network: 'devnet' | 'testnet' | 'mainnet-beta';
  rpcUrl?: string;

  // User preferences
  defaultAgent?: string;
  defaultChannel?: string;
  theme: 'dark' | 'light' | 'auto';
  animations: boolean;
  verbose: boolean;

  // Agent settings
  agents: Record<
    string,
    {
      address: string;
      type: string;
      description?: string;
      lastUsed: Date;
    }
  >;

  // Channel settings
  channels: Record<
    string,
    {
      address: string;
      type: 'public' | 'private';
      description?: string;
      lastUsed: Date;
    }
  >;

  // Developer settings
  developer: {
    autoSave: boolean;
    debugMode: boolean;
    showTransactionDetails: boolean;
  };

  // Security settings
  security: {
    confirmTransactions: boolean;
    maxTransactionValue: number;
    requirePinForLargeTransactions: boolean;
  };
}

const DEFAULT_CONFIG: GhostSpeakConfig = {
  network: 'devnet',
  theme: 'auto',
  animations: true,
  verbose: false,
  agents: {},
  channels: {},
  developer: {
    autoSave: true,
    debugMode: false,
    showTransactionDetails: false,
  },
  security: {
    confirmTransactions: true,
    maxTransactionValue: 1000000000, // 1 SOL in lamports
    requirePinForLargeTransactions: true,
  },
};

export class ConfigManager {
  private static instance: ConfigManager | null = null;
  private config: GhostSpeakConfig;
  private readonly configPath: string;

  private constructor(config: GhostSpeakConfig, configPath: string) {
    this.config = config;
    this.configPath = configPath;
  }

  static async load(customPath?: string): Promise<ConfigManager> {
    if (ConfigManager.instance) {
      return ConfigManager.instance;
    }

    const configPath =
      customPath || join(homedir(), '.ghostspeak', 'config.json');

    try {
      let config: GhostSpeakConfig;

      if (existsSync(configPath)) {
        try {
          const configData = await readFile(configPath, 'utf8');
          const loadedConfig = JSON.parse(configData);

          // Merge with defaults to ensure all fields exist
          config = {
            ...DEFAULT_CONFIG,
            ...loadedConfig,
            agents: { ...DEFAULT_CONFIG.agents, ...loadedConfig.agents },
            channels: { ...DEFAULT_CONFIG.channels, ...loadedConfig.channels },
            developer: { ...DEFAULT_CONFIG.developer, ...loadedConfig.developer },
            security: { ...DEFAULT_CONFIG.security, ...loadedConfig.security },
          };
        } catch (parseError) {
          console.warn(`Warning: Config file corrupted, using defaults. Error: ${parseError}`);
          config = { ...DEFAULT_CONFIG };
          
          // Try to back up the corrupted file
          try {
            const backupPath = `${configPath}.backup.${Date.now()}`;
            await writeFile(backupPath, await readFile(configPath, 'utf8'), 'utf8');
          } catch {
            // Ignore backup errors
          }
        }
      } else {
        config = { ...DEFAULT_CONFIG };

        // Create config directory if it doesn't exist
        const configDir = dirname(configPath);
        try {
          if (!existsSync(configDir)) {
            await mkdir(configDir, { recursive: true });
          }

          // Save default config
          await writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
        } catch (fsError) {
          // If we can't write the config, continue with defaults
          console.warn(`Warning: Could not save default config: ${fsError}`);
        }
      }

      ConfigManager.instance = new ConfigManager(config, configPath);
      return ConfigManager.instance;
    } catch (error) {
      // For critical errors, return instance with defaults
      console.error(`Error loading configuration: ${error}`);
      ConfigManager.instance = new ConfigManager(DEFAULT_CONFIG, configPath);
      return ConfigManager.instance;
    }
  }

  async save(): Promise<void> {
    try {
      const configDir = dirname(this.configPath);
      
      // Ensure directory exists
      try {
        if (!existsSync(configDir)) {
          await mkdir(configDir, { recursive: true });
        }
      } catch (mkdirError) {
        throw new Error(
          `Cannot create config directory ${configDir}: ${mkdirError instanceof Error ? mkdirError.message : String(mkdirError)}`
        );
      }

      // Create a backup of existing config before saving
      if (existsSync(this.configPath)) {
        try {
          const backupPath = `${this.configPath}.backup`;
          await writeFile(backupPath, await readFile(this.configPath, 'utf8'), 'utf8');
        } catch {
          // Non-critical: continue even if backup fails
        }
      }

      // Write the new config
      await writeFile(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        'utf8'
      );
    } catch (error) {
      throw new Error(
        `Failed to save configuration: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  get(): GhostSpeakConfig {
    return { ...this.config };
  }

  set<K extends keyof GhostSpeakConfig>(
    key: K,
    value: GhostSpeakConfig[K]
  ): void {
    this.config[key] = value;
  }

  // Agent management
  addAgent(
    name: string,
    address: string,
    type: string,
    description?: string
  ): void {
    this.config.agents[name] = {
      address,
      type,
      description,
      lastUsed: new Date(),
    };
  }

  removeAgent(name: string): boolean {
    if (this.config.agents[name]) {
      delete this.config.agents[name];

      // Clear as default if it was the default
      if (this.config.defaultAgent === name) {
        this.config.defaultAgent = undefined;
      }

      return true;
    }
    return false;
  }

  getAgent(name: string) {
    return this.config.agents[name];
  }

  listAgents(): Array<{
    name: string;
    agent: GhostSpeakConfig['agents'][string];
  }> {
    return Object.entries(this.config.agents).map(([name, agent]) => ({
      name,
      agent,
    }));
  }

  // Channel management
  addChannel(
    name: string,
    address: string,
    type: 'public' | 'private',
    description?: string
  ): void {
    this.config.channels[name] = {
      address,
      type,
      description,
      lastUsed: new Date(),
    };
  }

  removeChannel(name: string): boolean {
    if (this.config.channels[name]) {
      delete this.config.channels[name];

      // Clear as default if it was the default
      if (this.config.defaultChannel === name) {
        this.config.defaultChannel = undefined;
      }

      return true;
    }
    return false;
  }

  getChannel(name: string) {
    return this.config.channels[name];
  }

  listChannels(): Array<{
    name: string;
    channel: GhostSpeakConfig['channels'][string];
  }> {
    return Object.entries(this.config.channels).map(([name, channel]) => ({
      name,
      channel,
    }));
  }

  // Network configuration
  setNetwork(network: GhostSpeakConfig['network'], rpcUrl?: string): void {
    this.config.network = network;
    if (rpcUrl) {
      this.config.rpcUrl = rpcUrl;
    }
  }

  getNetworkConfig(): { network: string; rpcUrl?: string } {
    return {
      network: this.config.network,
      rpcUrl: this.config.rpcUrl,
    };
  }

  // Theme and appearance
  setTheme(theme: GhostSpeakConfig['theme']): void {
    this.config.theme = theme;
  }

  toggleAnimations(): void {
    this.config.animations = !this.config.animations;
  }

  // Developer settings
  toggleDebugMode(): void {
    this.config.developer.debugMode = !this.config.developer.debugMode;
  }

  setVerbose(verbose: boolean): void {
    this.config.verbose = verbose;
  }

  // Security settings
  updateSecuritySettings(
    settings: Partial<GhostSpeakConfig['security']>
  ): void {
    this.config.security = { ...this.config.security, ...settings };
  }

  // Utility methods
  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
  }

  export(): string {
    return JSON.stringify(this.config, null, 2);
  }

  async import(configJson: string): Promise<void> {
    try {
      let importedConfig;
      try {
        importedConfig = JSON.parse(configJson);
      } catch (parseError) {
        throw new Error(
          `Invalid JSON format: ${parseError instanceof Error ? parseError.message : String(parseError)}`
        );
      }

      // Validate imported config has basic structure
      if (typeof importedConfig !== 'object' || importedConfig === null) {
        throw new Error('Configuration must be a valid object');
      }

      // Backup current config before importing
      const backupConfig = { ...this.config };

      try {
        // Merge imported config with defaults to ensure all required fields exist
        this.config = {
          ...DEFAULT_CONFIG,
          ...importedConfig,
          agents: { ...DEFAULT_CONFIG.agents, ...(importedConfig.agents || {}) },
          channels: { ...DEFAULT_CONFIG.channels, ...(importedConfig.channels || {}) },
          developer: { ...DEFAULT_CONFIG.developer, ...(importedConfig.developer || {}) },
          security: { ...DEFAULT_CONFIG.security, ...(importedConfig.security || {}) },
        };

        await this.save();
      } catch (saveError) {
        // Restore backup on save failure
        this.config = backupConfig;
        throw new Error(
          `Failed to save imported configuration: ${saveError instanceof Error ? saveError.message : String(saveError)}`
        );
      }
    } catch (error) {
      throw new Error(
        `Failed to import configuration: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
