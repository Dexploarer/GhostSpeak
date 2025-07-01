import { select, input, confirm } from '@inquirer/prompts';
import { UIManager } from '../ui/ui-manager.js';
import { NetworkManager } from '../utils/network-manager.js';
import { ConfigManager } from '../utils/config-manager.js';

export class SettingsCommand {
  private ui: UIManager;
  private network: NetworkManager;
  private config: ConfigManager;

  constructor() {
    this.ui = new UIManager();
    this.network = new NetworkManager();
    this.config = new ConfigManager();
  }

  async execute(): Promise<void> {
    try {
      this.ui.clear();
      this.ui.bigTitle('Settings', 'Configure your podAI CLI preferences');

      const choice = await select({
        message: 'What would you like to configure?',
        choices: [
          { name: '🌐 Network Settings', value: 'network', description: 'Configure blockchain network' },
          { name: '👤 Agent Settings', value: 'agent', description: 'Manage your agents' },
          { name: '🎨 UI Preferences', value: 'ui', description: 'Customize interface' },
          { name: '🔧 Advanced Settings', value: 'advanced', description: 'Advanced configuration' },
          { name: '📄 View Current Settings', value: 'view', description: 'Display all settings' },
          { name: '🔄 Reset to Defaults', value: 'reset', description: 'Reset all settings' },
          { name: '↩️  Back to Main Menu', value: 'back' }
        ]
      });

      switch (choice) {
        case 'network':
          await this.configureNetwork();
          break;
        case 'agent':
          await this.configureAgent();
          break;
        case 'ui':
          await this.configureUI();
          break;
        case 'advanced':
          await this.configureAdvanced();
          break;
        case 'view':
          await this.viewSettings();
          break;
        case 'reset':
          await this.resetSettings();
          break;
        case 'back':
          return;
      }

    } catch (error) {
      this.ui.error(
        'Settings configuration failed',
        error instanceof Error ? (error as Error).message : String(error)
      );
    }
  }

  private async configureNetwork(): Promise<void> {
    this.ui.sectionHeader('Network Settings', 'Configure blockchain network connection');

    const currentConfig = await this.config.load();
    const currentNetwork = currentConfig.network;
    const currentRpcUrl = await this.config.getRpcUrl();

    this.ui.info('Current Network Configuration:');
    this.ui.keyValue({
      'Active Network': currentNetwork.toUpperCase(),
      'RPC URL': currentRpcUrl,
      'Connection Status': await this.network.checkConnection() ? '🟢 Connected' : '🔴 Disconnected'
    });

    const networkChoice = await select({
      message: 'Select network:',
      choices: [
        { 
          name: '🧪 Devnet', 
          value: 'devnet', 
          description: 'Development network (recommended for testing)'
        },
        { 
          name: '🧩 Testnet', 
          value: 'testnet', 
          description: 'Public test network'
        },
        { 
          name: '🚀 Mainnet-Beta', 
          value: 'mainnet-beta', 
          description: 'Production network'
        },
        { 
          name: '🔧 Custom RPC', 
          value: 'custom', 
          description: 'Use custom RPC endpoint'
        }
      ],
      default: currentNetwork
    });

    let rpcUrl: string | undefined;

    if (networkChoice === 'custom') {
      rpcUrl = await input({
        message: 'Enter custom RPC URL:',
        validate: (value) => {
          try {
            new URL(value);
            return true;
          } catch {
            return 'Please enter a valid URL';
          }
        }
      });
    }

    const confirmed = await confirm({
      message: `Switch to ${networkChoice}${rpcUrl ? ` (${rpcUrl})` : ''}?`,
      default: true
    });

    if (confirmed) {
      const spinner = this.ui.spinner('Updating network configuration...');
      spinner.start();

      try {
        await this.network.switchNetwork(
          networkChoice as 'devnet' | 'testnet' | 'mainnet-beta', 
          rpcUrl
        );

        // Test new connection
        const isConnected = await this.network.checkConnection();
        
        if (isConnected) {
          spinner.success({ text: 'Network configuration updated successfully!' });
          this.ui.success(`Switched to ${networkChoice.toUpperCase()}`);
          
          const latency = await this.network.testLatency();
          this.ui.networkStatus(networkChoice, true, latency);
        } else {
          spinner.error({ text: 'Failed to connect to new network' });
          this.ui.error('Could not connect to the selected network');
        }

      } catch (error) {
        spinner.error({ text: 'Network configuration failed' });
        throw error;
      }
    }
  }

  private async configureAgent(): Promise<void> {
    this.ui.sectionHeader('Agent Settings', 'Manage your AI agents');

    const agents = await this.config.loadAgents();
    const currentConfig = await this.config.load();

    if (agents.length === 0) {
      this.ui.info('No agents configured. Register an agent first using the main menu.');
      return;
    }

    this.ui.info('Your Agents:');
    this.ui.table(
      ['Name', 'Address', 'Status', 'Last Active'],
      agents.map(agent => ({
        Name: agent.name + (currentConfig.defaultAgent === agent.address ? ' (Default)' : ''),
        Address: agent.address.slice(0, 8) + '...',
        Status: agent.reputation > 90 ? '🟢 Excellent' : agent.reputation > 70 ? '🟡 Good' : '🔴 Needs Attention',
        'Last Active': agent.lastActive.toLocaleDateString()
      }))
    );

    const agentChoice = await select({
      message: 'Select an agent to configure:',
      choices: [
        ...agents.map(agent => ({
          name: `${agent.name} (${agent.address.slice(0, 8)}...)`,
          value: agent.address
        })),
        { name: '↩️  Back', value: 'back' }
      ]
    });

    if (agentChoice === 'back') return;

    const selectedAgent = agents.find(a => a.address === agentChoice);
    if (!selectedAgent) return;

    const agentAction = await select({
      message: `What would you like to do with ${selectedAgent.name}?`,
      choices: [
        { name: '⭐ Set as Default', value: 'default' },
        { name: '📝 Update Name', value: 'rename' },
        { name: '📊 View Details', value: 'details' },
        { name: '🗑️  Remove Agent', value: 'remove' }
      ]
    });

    switch (agentAction) {
      case 'default':
        await this.config.save({ defaultAgent: selectedAgent.address });
        this.ui.success(`${selectedAgent.name} set as default agent`);
        break;

      case 'rename':
        const newName = await input({
          message: 'Enter new agent name:',
          default: selectedAgent.name,
          validate: (value) => {
            if (!value.trim()) return 'Agent name is required';
            if (value.length > 50) return 'Name must be 50 characters or less';
            return true;
          }
        });

        selectedAgent.name = newName.trim();
        await this.config.saveAgent(selectedAgent);
        this.ui.success('Agent name updated successfully');
        break;

      case 'details':
        this.ui.keyValue({
          'Name': selectedAgent.name,
          'Address': selectedAgent.address,
          'Capabilities': selectedAgent.capabilities.toString(),
          'Reputation': `${selectedAgent.reputation}%`,
          'Last Active': selectedAgent.lastActive.toLocaleString()
        });
        break;

      case 'remove':
        const confirmRemoval = await confirm({
          message: `Are you sure you want to remove ${selectedAgent.name}?`,
          default: false
        });

        if (confirmRemoval) {
          await this.config.removeAgent(selectedAgent.address);
          
          // If this was the default agent, clear the default
          if (currentConfig.defaultAgent === selectedAgent.address) {
            await this.config.save({ defaultAgent: undefined });
          }
          
          this.ui.success('Agent removed from local configuration');
          this.ui.warning('Note: This does not deactivate the agent on-chain');
        }
        break;
    }
  }

  private async configureUI(): Promise<void> {
    this.ui.sectionHeader('UI Preferences', 'Customize your interface experience');

    const currentConfig = await this.config.load();

    this.ui.info('Current UI Settings:');
    this.ui.keyValue({
      'Theme': currentConfig.preferences.theme.toUpperCase(),
      'Verbose Mode': currentConfig.preferences.verbose ? 'Enabled' : 'Disabled',
      'Auto-approve': currentConfig.preferences.autoApprove ? 'Enabled' : 'Disabled'
    });

    const uiChoice = await select({
      message: 'What would you like to configure?',
      choices: [
        { name: '🎨 Change Theme', value: 'theme' },
        { name: '📝 Toggle Verbose Mode', value: 'verbose' },
        { name: '⚡ Auto-approve Settings', value: 'auto-approve' },
        { name: '🔄 Reset UI Settings', value: 'reset-ui' }
      ]
    });

    switch (uiChoice) {
      case 'theme':
        const newTheme = await select({
          message: 'Select theme:',
          choices: [
            { name: '🌙 Dark Theme', value: 'dark' },
            { name: '☀️  Light Theme', value: 'light' }
          ],
          default: currentConfig.preferences.theme
        });

        await this.config.save({
          preferences: {
            ...currentConfig.preferences,
            theme: newTheme as 'dark' | 'light'
          }
        });
        
        this.ui.success(`Theme changed to ${newTheme}`);
        break;

      case 'verbose':
        const newVerbose = !currentConfig.preferences.verbose;
        
        await this.config.save({
          preferences: {
            ...currentConfig.preferences,
            verbose: newVerbose
          }
        });
        
        this.ui.success(`Verbose mode ${newVerbose ? 'enabled' : 'disabled'}`);
        break;

      case 'auto-approve':
        const newAutoApprove = await confirm({
          message: 'Enable auto-approve for routine operations?',
          default: currentConfig.preferences.autoApprove
        });

        await this.config.save({
          preferences: {
            ...currentConfig.preferences,
            autoApprove: newAutoApprove
          }
        });
        
        this.ui.success(`Auto-approve ${newAutoApprove ? 'enabled' : 'disabled'}`);
        if (newAutoApprove) {
          this.ui.warning('Auto-approve will skip confirmation for some operations');
        }
        break;
    }
  }

  private async configureAdvanced(): Promise<void> {
    this.ui.sectionHeader('Advanced Settings', 'Expert configuration options');

    const advancedChoice = await select({
      message: 'Select advanced setting:',
      choices: [
        { name: '🔍 Debug Mode', value: 'debug' },
        { name: '⏱️  Timeout Settings', value: 'timeouts' },
        { name: '💾 Cache Settings', value: 'cache' },
        { name: '📁 Data Directories', value: 'directories' },
        { name: '🔐 Security Settings', value: 'security' }
      ]
    });

    switch (advancedChoice) {
      case 'debug':
        this.ui.info('Debug mode settings - Coming Soon!');
        break;
      case 'timeouts':
        this.ui.info('Timeout configuration - Coming Soon!');
        break;
      case 'cache':
        this.ui.info('Cache management - Coming Soon!');
        break;
      case 'directories':
        const paths = this.config.getPaths();
        this.ui.keyValue({
          'Config Directory': paths.configDir,
          'Config File': paths.configPath,
          'Agents File': paths.agentsPath
        });
        break;
      case 'security':
        this.ui.info('Security settings - Coming Soon!');
        break;
    }
  }

  private async viewSettings(): Promise<void> {
    this.ui.sectionHeader('Current Settings', 'All configuration values');

    const config = await this.config.load();
    const agents = await this.config.loadAgents();
    const rpcUrl = await this.config.getRpcUrl();

    // Network Settings
    this.ui.info('Network Configuration:');
    this.ui.keyValue({
      'Active Network': config.network.toUpperCase(),
      'RPC URL': rpcUrl,
      'Custom RPC': config.rpcUrl || 'Not set'
    });

    // Agent Settings
    this.ui.info('Agent Configuration:');
    this.ui.keyValue({
      'Default Agent': config.defaultAgent || 'Not set',
      'Total Agents': agents.length.toString(),
      'Wallet Path': config.walletPath || 'Not set'
    });

    // UI Preferences
    this.ui.info('UI Preferences:');
    this.ui.keyValue({
      'Theme': config.preferences.theme.toUpperCase(),
      'Verbose Mode': config.preferences.verbose ? 'Enabled' : 'Disabled',
      'Auto-approve': config.preferences.autoApprove ? 'Enabled' : 'Disabled'
    });

    // System Information
    this.ui.info('System Information:');
    const paths = this.config.getPaths();
    this.ui.keyValue({
      'Config Directory': paths.configDir,
      'Last Updated': config.lastUsed.toLocaleString(),
      'CLI Version': '1.0.0'
    });
  }

  private async resetSettings(): Promise<void> {
    this.ui.sectionHeader('Reset Settings', 'Restore default configuration');

    this.ui.warning('This will reset ALL settings to their default values');
    this.ui.info('Your agents will not be removed, but network and preferences will be reset');

    const confirmed = await confirm({
      message: 'Are you sure you want to reset all settings?',
      default: false
    });

    if (confirmed) {
      const spinner = this.ui.spinner('Resetting configuration...');
      spinner.start();

      try {
        // Reset to default config (keeping agents)
        await this.config.save({
          network: 'devnet',
          rpcUrl: undefined,
          walletPath: undefined,
          defaultAgent: undefined,
          preferences: {
            theme: 'dark',
            verbose: false,
            autoApprove: false
          }
        });

        spinner.success({ text: 'Settings reset to defaults' });
        this.ui.success('All settings have been reset to their default values');
        this.ui.info('Your saved agents were preserved');

      } catch (error) {
        spinner.error({ text: 'Failed to reset settings' });
        throw error;
      }
    }
  }
} 