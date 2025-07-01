import { promises as fs } from 'fs';
import { join } from 'path';
import { existsSync } from 'fs';

export type ProjectContext = 
  | 'rust-project'
  | 'typescript-project'
  | 'workspace-both'
  | 'ghostspeak-workspace'
  | 'general'
  | 'agent-project'
  | 'marketplace';

export interface IProjectInfo {
  context: ProjectContext;
  type: 'development' | 'monitoring' | 'marketplace' | 'agent-interaction';
  path: string;
  features: string[];
  sdks: ('typescript' | 'rust')[];
  hasAgents: boolean;
  networkConfig?: {
    network: string;
    rpcUrl: string;
  };
  agentConfig?: {
    registeredAgents: number;
    activeChannels: number;
  };
}

export class ContextDetector {
  private currentPath: string;

  constructor(path?: string) {
    this.currentPath = path || process.cwd();
  }

  async detectContext(): Promise<IProjectInfo> {
    return await this.analyzeDirectory();
  }

  private async analyzeDirectory(): Promise<IProjectInfo> {
    // Check for workspace indicators
    if (await this.isGhostSpeakWorkspace()) {
      return this.createWorkspaceContext();
    }

    // Check for TypeScript project
    if (await this.isTypeScriptProject()) {
      return this.createTypeScriptContext();
    }

    // Check for Rust project
    if (await this.isRustProject()) {
      return this.createRustContext();
    }

    // Check for mixed workspace
    if (await this.isMixedWorkspace()) {
      return this.createMixedWorkspaceContext();
    }

    // Check for agent marketplace context
    if (await this.isMarketplaceContext()) {
      return this.createMarketplaceContext();
    }

    // Default to general context
    return this.createGeneralContext();
  }

  private async isGhostSpeakWorkspace(): Promise<boolean> {
    const indicators = ['packages/core', 'packages/sdk-rust', 'packages/sdk-typescript', 'packages/cli'];
    return indicators.some(indicator => existsSync(join(this.currentPath, indicator)));
  }

  private async isTypeScriptProject(): Promise<boolean> {
    const packageJsonPath = join(this.currentPath, 'package.json');
    if (!existsSync(packageJsonPath)) return false;

    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      return !!(packageJson.dependencies?.['@ghostspeak/sdk'] || packageJson.devDependencies?.['@ghostspeak/sdk'] || packageJson.name?.includes('ghostspeak'));
    } catch {
      return false;
    }
  }

  private async isRustProject(): Promise<boolean> {
    const cargoTomlPath = join(this.currentPath, 'Cargo.toml');
    if (!existsSync(cargoTomlPath)) return false;

    try {
      const cargoToml = await fs.readFile(cargoTomlPath, 'utf-8');
      return cargoToml.includes('podai-sdk') || cargoToml.includes('ghostspeak') || cargoToml.includes('agent');
    } catch {
      return false;
    }
  }

  private async isMixedWorkspace(): Promise<boolean> {
    const hasTypeScript = existsSync(join(this.currentPath, 'typescript')) || existsSync(join(this.currentPath, 'package.json'));
    const hasRust = existsSync(join(this.currentPath, 'rust')) || existsSync(join(this.currentPath, 'Cargo.toml'));
    return hasTypeScript && hasRust;
  }

  private async isMarketplaceContext(): Promise<boolean> {
    const indicators = ['.ghostspeak/marketplace', 'marketplace.config.json', 'agents.json'];
    return indicators.some(indicator => existsSync(join(this.currentPath, indicator)));
  }

  private async createWorkspaceContext(): Promise<IProjectInfo> {
    return {
      context: 'ghostspeak-workspace',
      type: 'development',
      path: this.currentPath,
      features: ['core', 'sdk-rust', 'sdk-typescript', 'cli'],
      sdks: ['typescript', 'rust'],
      hasAgents: true,
      networkConfig: await this.detectNetworkConfig(),
    };
  }

  private async createTypeScriptContext(): Promise<IProjectInfo> {
    const features = await this.detectTypeScriptFeatures();
    return {
      context: 'typescript-project',
      type: 'development',
      path: this.currentPath,
      features,
      sdks: ['typescript'],
      hasAgents: features.includes('agents'),
      networkConfig: await this.detectNetworkConfig(),
    };
  }

  private async createRustContext(): Promise<IProjectInfo> {
    const features = await this.detectRustFeatures();
    return {
      context: 'rust-project',
      type: 'development',
      path: this.currentPath,
      features,
      sdks: ['rust'],
      hasAgents: features.includes('agents'),
      networkConfig: await this.detectNetworkConfig(),
    };
  }

  private async createMixedWorkspaceContext(): Promise<IProjectInfo> {
    return {
      context: 'workspace-both',
      type: 'development',
      path: this.currentPath,
      features: ['agents', 'messaging', 'channels', 'marketplace'],
      sdks: ['typescript', 'rust'],
      hasAgents: true,
      networkConfig: await this.detectNetworkConfig(),
    };
  }

  private async createMarketplaceContext(): Promise<IProjectInfo> {
    const agentConfig = await this.detectAgentConfig();
    return {
      context: 'marketplace',
      type: 'marketplace',
      path: this.currentPath,
      features: ['marketplace', 'agents', 'human-interaction'],
      sdks: [],
      hasAgents: true,
      agentConfig,
      networkConfig: await this.detectNetworkConfig(),
    };
  }

  private async createGeneralContext(): Promise<IProjectInfo> {
    return {
      context: 'general',
      type: 'monitoring',
      path: this.currentPath,
      features: ['monitoring', 'marketplace', 'human-interaction'],
      sdks: [],
      hasAgents: false,
      networkConfig: await this.detectNetworkConfig(),
    };
  }

  private async detectTypeScriptFeatures(): Promise<string[]> {
    const features: string[] = [];
    
    try {
      const packageJsonPath = join(this.currentPath, 'package.json');
      if (existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        const allDeps = {...packageJson.dependencies, ...packageJson.devDependencies, ...packageJson.peerDependencies};

        if (allDeps['@ghostspeak/sdk']) features.push('agents', 'messaging');
        if (packageJson.name?.includes('channel')) features.push('channels');
        if (packageJson.name?.includes('marketplace')) features.push('marketplace');
        if (packageJson.name?.includes('escrow')) features.push('escrow');
      }

      const srcPath = join(this.currentPath, 'src');
      if (existsSync(srcPath)) {
        const files = await fs.readdir(srcPath);
        if (files.some(f => f.includes('agent'))) features.push('agents');
        if (files.some(f => f.includes('message'))) features.push('messaging');
        if (files.some(f => f.includes('channel'))) features.push('channels');
        if (files.some(f => f.includes('marketplace'))) features.push('marketplace');
        if (files.some(f => f.includes('escrow'))) features.push('escrow');
      }
    } catch {
      features.push('agents', 'messaging');
    }

    return features.length > 0 ? features : ['agents', 'messaging'];
  }

  private async detectRustFeatures(): Promise<string[]> {
    const features: string[] = [];
    
    try {
      const cargoTomlPath = join(this.currentPath, 'Cargo.toml');
      if (existsSync(cargoTomlPath)) {
        const cargoToml = await fs.readFile(cargoTomlPath, 'utf-8');
        
        if (cargoToml.includes('agents')) features.push('agents');
        if (cargoToml.includes('messaging')) features.push('messaging');
        if (cargoToml.includes('channels')) features.push('channels');
        if (cargoToml.includes('marketplace')) features.push('marketplace');
        if (cargoToml.includes('escrow')) features.push('escrow');
        if (cargoToml.includes('compression')) features.push('compression');
      }

      const srcPath = join(this.currentPath, 'src');
      if (existsSync(srcPath)) {
        const files = await fs.readdir(srcPath);
        if (files.some(f => f.includes('agent'))) features.push('agents');
        if (files.some(f => f.includes('message'))) features.push('messaging');
        if (files.some(f => f.includes('channel'))) features.push('channels');
        if (files.some(f => f.includes('marketplace'))) features.push('marketplace');
        if (files.some(f => f.includes('escrow'))) features.push('escrow');
      }
    } catch {
      features.push('agents', 'messaging');
    }

    return features.length > 0 ? features : ['agents', 'messaging'];
  }

  private async detectNetworkConfig(): Promise<{ network: string; rpcUrl: string } | undefined> {
    try {
      const configPath = join(this.currentPath, '.ghostspeak', 'config.json');
      if (existsSync(configPath)) {
        const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
        return { network: config.network || 'devnet', rpcUrl: config.rpcUrl || 'https://api.devnet.solana.com' };
      }

      if (process.env.GHOSTSPEAK_NETWORK) {
        return { network: process.env.GHOSTSPEAK_NETWORK, rpcUrl: process.env.GHOSTSPEAK_RPC_URL || 'https://api.devnet.solana.com' };
      }

      return { network: 'devnet', rpcUrl: 'https://api.devnet.solana.com' };
    } catch {
      return undefined;
    }
  }

  private async detectAgentConfig(): Promise<{ registeredAgents: number; activeChannels: number } | undefined> {
    try {
      const agentsPath = join(this.currentPath, '.ghostspeak', 'agents.json');
      if (existsSync(agentsPath)) {
        const agents = JSON.parse(await fs.readFile(agentsPath, 'utf-8'));
        return { registeredAgents: agents.registered?.length || 0, activeChannels: agents.channels?.length || 0 };
      }
      return { registeredAgents: 0, activeChannels: 0 };
    } catch {
      return undefined;
    }
  }

  async getProjectType(): Promise<ProjectContext> {
    const info = await this.detectContext();
    return info.context;
  }

  async isInProject(): Promise<boolean> {
    const info = await this.detectContext();
    return info.type === 'development';
  }

  async hasSDK(sdk: 'typescript' | 'rust'): Promise<boolean> {
    const info = await this.detectContext();
    return info.sdks.includes(sdk);
  }

  async getAvailableFeatures(): Promise<string[]> {
    const info = await this.detectContext();
    return info.features;
  }
}
