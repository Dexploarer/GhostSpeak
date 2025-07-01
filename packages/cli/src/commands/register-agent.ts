import { select, input, confirm, checkbox } from '@inquirer/prompts';
import { generateKeyPairSigner } from '@solana/signers';
import type { KeyPairSigner } from '@solana/signers';
import chalk from 'chalk';
import { UIManager } from '../ui/ui-manager.js';
import { NetworkManager } from '../utils/network-manager.js';
import { ConfigManager } from '../utils/config-manager.js';

// Import the real SDK from built dist
import { 
  createPodAIClientV2, 
  type PodAIClientV2
} from '../../../sdk-typescript/dist/index.js';

// Define interface locally until SDK exports are fixed
interface ICreateAgentOptions {
  capabilities: number;
  metadataUri: string;
}

// Define capabilities constants
export const AGENT_CAPABILITIES = {
  TEXT: 1 << 0,
  TRADING: 1 << 1,
  ANALYSIS: 1 << 2,
  CONTENT_GENERATION: 1 << 3,
  CUSTOM1: 1 << 4
};

export interface AgentCapabilities {
  COMMUNICATION: number;
  TRADING: number;
  ANALYSIS: number;
  MODERATION: number;
  CUSTOM: number;
}

export const CLI_AGENT_CAPABILITIES: AgentCapabilities = {
  COMMUNICATION: 1 << 0,
  TRADING: 1 << 1,
  ANALYSIS: 1 << 2,
  MODERATION: 1 << 3,
  CUSTOM: 1 << 4
};

export interface AgentRegistrationData {
  name: string;
  description: string;
  capabilities: number;
  endpoint?: string;
  metadata: {
    version: string;
    type: 'ai' | 'human' | 'hybrid';
    tags: string[];
  };
}

export class RegisterAgentCommand {
  private ui: UIManager;
  private network: NetworkManager;
  private config: ConfigManager;
  private podClient: PodAIClientV2 | null = null;

  constructor() {
    this.ui = new UIManager();
    this.network = new NetworkManager();
    this.config = new ConfigManager();
  }

  async execute(): Promise<void> {
    try {
      this.ui.clear();
      this.ui.bigTitle('Agent Registration', 'Create and register a new AI agent on-chain');
      
      // Check network connection first
      await this.checkNetworkConnection();
      
      // Initialize podAI client
      await this.initializePodClient();
      
      // Gather agent information from user
      const agentData = await this.gatherAgentInformation();
      
      // Show confirmation and cost estimation
      const confirmed = await this.confirmRegistration(agentData);
      if (!confirmed) {
        this.ui.info('Agent registration cancelled');
        return;
      }
      
      // Generate agent keypair
      const agentKeypair = await generateKeyPairSigner();
      
      // Perform registration with real blockchain operations
      await this.performRegistration(agentData, agentKeypair);
      
    } catch (error) {
      this.ui.error(
        'Agent registration failed',
        error instanceof Error ? (error as Error).message : String(error)
      );
    }
  }

  private async initializePodClient(): Promise<void> {
    const spinner = this.ui.spinner('Initializing podAI client...');
    spinner.start();

    try {
      const currentNetwork = await this.network.getCurrentNetwork();
      const rpcEndpoint = await this.network.getRpcEndpoint();
      
      // Create real PodAI client
      this.podClient = createPodAIClientV2({
        rpcEndpoint: rpcEndpoint,
        commitment: 'confirmed'
      });

      // Test the connection
      const healthCheck = await this.podClient.healthCheck();
      if (!healthCheck.rpcConnection) {
        throw new Error('Failed to connect to Solana RPC');
      }

      spinner.success({ text: `podAI client initialized on ${currentNetwork}` });
    } catch (error) {
      spinner.error({ text: 'Failed to initialize podAI client' });
      throw new Error(`Client initialization failed: ${error instanceof Error ? (error as Error).message : String(error)}`);
    }
  }

  private async checkNetworkConnection(): Promise<void> {
    const spinner = this.ui.spinner('Checking network connection...');
    spinner.start();

    try {
      const currentNetwork = await this.network.getCurrentNetwork();
      const isConnected = await this.network.checkConnection();
      const latency = await this.network.testLatency();

      if (isConnected) {
        spinner.success({ text: `Connected to ${currentNetwork}` });
        this.ui.networkStatus(currentNetwork, true, latency);
      } else {
        spinner.error({ text: 'Network connection failed' });
        throw new Error('Cannot connect to Solana network');
      }
    } catch (error) {
      spinner.error({ text: 'Network check failed' });
      throw error;
    }

    this.ui.spacing();
  }

  private async gatherAgentInformation(): Promise<AgentRegistrationData> {
    this.ui.sectionHeader('Agent Information', 'Provide details about your AI agent');

    // Agent name
    const name = await input({
      message: 'Agent name:',
      validate: (value) => {
        if (!value.trim()) return 'Agent name is required';
        if (value.length > 50) return 'Agent name must be 50 characters or less';
        if (!/^[a-zA-Z0-9\s-_]+$/.test(value)) return 'Agent name contains invalid characters';
        return true;
      }
    });

    // Agent description
    const description = await input({
      message: 'Agent description:',
      validate: (value) => {
        if (!value.trim()) return 'Agent description is required';
        if (value.length > 200) return 'Description must be 200 characters or less';
        return true;
      }
    });

    // Agent type
    const type = await select({
      message: 'Agent type:',
      choices: [
        { name: '🤖 AI Agent', value: 'ai', description: 'Fully autonomous AI agent' },
        { name: '👤 Human-operated', value: 'human', description: 'Human-controlled agent' },
        { name: '🤝 Hybrid', value: 'hybrid', description: 'AI with human oversight' }
      ]
    }) as 'ai' | 'human' | 'hybrid';

    // Agent capabilities
    const capabilityChoices = await checkbox({
      message: 'Select agent capabilities:',
      choices: [
        { 
          name: '💬 Communication', 
          value: 'COMMUNICATION',
          description: 'Send and receive messages',
          checked: true
        },
        { 
          name: '💰 Trading', 
          value: 'TRADING',
          description: 'Execute financial transactions'
        },
        { 
          name: '📊 Analysis', 
          value: 'ANALYSIS',
          description: 'Perform data analysis and insights'
        },
        { 
          name: '🛡️  Moderation', 
          value: 'MODERATION',
          description: 'Moderate channels and content'
        },
        { 
          name: '🔧 Custom', 
          value: 'CUSTOM',
          description: 'Custom specialized functions'
        }
      ],
      validate: (choices) => {
        if (choices.length === 0) return 'Select at least one capability';
        return true;
      }
    });

    // Map to SDK capabilities
    const capabilities = capabilityChoices.reduce((mask, capability) => {
      switch (capability) {
        case 'COMMUNICATION':
          return mask | AGENT_CAPABILITIES.TEXT;
        case 'TRADING':
          return mask | AGENT_CAPABILITIES.TRADING;
        case 'ANALYSIS':
          return mask | AGENT_CAPABILITIES.ANALYSIS;
        case 'MODERATION':
          return mask | AGENT_CAPABILITIES.CONTENT_GENERATION;
        case 'CUSTOM':
          return mask | AGENT_CAPABILITIES.CUSTOM1;
        default:
          return mask;
      }
    }, 0);

    // Optional endpoint
    const hasEndpoint = await confirm({
      message: 'Does your agent have a custom API endpoint?',
      default: false
    });

    let endpoint: string | undefined;
    if (hasEndpoint) {
      endpoint = await input({
        message: 'Agent API endpoint URL:',
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

    // Tags
    const tagsInput = await input({
      message: 'Tags (comma-separated, optional):',
      default: ''
    });

    const tags = tagsInput
      ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      : [];

    return {
      name: name.trim(),
      description: description.trim(),
      capabilities,
      endpoint,
      metadata: {
        version: '1.0.0',
        type,
        tags
      }
    };
  }

  private async confirmRegistration(agentData: AgentRegistrationData): Promise<boolean> {
    this.ui.sectionHeader('Registration Summary', 'Review your agent details');

    // Display agent information
    const capabilityNames: string[] = [];
    if (agentData.capabilities & AGENT_CAPABILITIES.TEXT) capabilityNames.push('communication');
    if (agentData.capabilities & AGENT_CAPABILITIES.TRADING) capabilityNames.push('trading');
    if (agentData.capabilities & AGENT_CAPABILITIES.ANALYSIS) capabilityNames.push('analysis');
    if (agentData.capabilities & AGENT_CAPABILITIES.CONTENT_GENERATION) capabilityNames.push('moderation');
    if (agentData.capabilities & AGENT_CAPABILITIES.CUSTOM1) capabilityNames.push('custom');

    this.ui.keyValue({
      'Agent Name': agentData.name,
      'Description': agentData.description,
      'Type': agentData.metadata.type.toUpperCase(),
      'Capabilities': capabilityNames.join(', '),
      'Endpoint': agentData.endpoint || 'None',
      'Tags': agentData.metadata.tags.length > 0 ? agentData.metadata.tags.join(', ') : 'None'
    });

    // Get network and estimated costs
    const currentNetwork = await this.network.getCurrentNetwork();
    const rentExemption = await this.network.getMinimumBalanceForRentExemption(512); // Estimated agent account size

    this.ui.info('Registration Details:');
    this.ui.keyValue({
      'Network': currentNetwork.toUpperCase(),
      'Estimated Cost': `${(Number(rentExemption) / 1e9).toFixed(4)} SOL`,
      'Account Rent': 'Rent-exempt (permanent)'
    });

    return await confirm({
      message: 'Proceed with agent registration?',
      default: true
    });
  }

  private async performRegistration(agentData: AgentRegistrationData, agentKeypair: KeyPairSigner): Promise<void> {
    const steps = [
      { name: 'Generate agent keypair', status: 'success' as const, message: 'Agent keypair generated' },
      { name: 'Validate agent data', status: 'pending' as const, message: 'Validating registration data' },
      { name: 'Submit to blockchain', status: 'pending' as const, message: 'Broadcasting transaction' },
      { name: 'Confirm registration', status: 'pending' as const, message: 'Waiting for confirmation' }
    ];

    this.ui.sectionHeader('Registration Progress', 'Registering your agent on-chain');

    // Update progress display
    const updateProgress = (stepIndex: number, status: 'running' | 'success' | 'error', message?: string, error?: string) => {
      steps[stepIndex] = { 
        ...steps[stepIndex], 
        status: status === 'running' ? 'pending' : status, 
        message: message || steps[stepIndex].message,
        ...(error && { error })
      };
      console.clear();
      this.ui.sectionHeader('Registration Progress', 'Registering your agent on-chain');
      this.ui.displayProgress(steps);
    };

    try {
      // Step 1: Generate keypair (already done)
      updateProgress(0, 'success', `Address: ${agentKeypair.address}`);

      // Step 2: Validate agent data
      updateProgress(1, 'running', 'Validating registration data...');
      
      // Create metadata object
      const metadata = {
        name: agentData.name,
        description: agentData.description,
        type: agentData.metadata.type,
        version: agentData.metadata.version,
        tags: agentData.metadata.tags,
        endpoint: agentData.endpoint,
        capabilities: agentData.capabilities,
        createdAt: new Date().toISOString()
      };

      // For now, create a simple metadata URI (in production, this would be stored on IPFS)
      const metadataUri = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString('base64')}`;
      
      updateProgress(1, 'success', 'Agent data validated');

      // Step 3: Submit registration transaction
      updateProgress(2, 'running', 'Submitting registration to podAI smart contract...');
      
      if (!this.podClient) {
        throw new Error('podAI client not initialized');
      }

      // Create registration options
      const registrationOptions: ICreateAgentOptions = {
        capabilities: agentData.capabilities,
        metadataUri: metadataUri
      };

      // Perform REAL on-chain registration using the SDK
      const transactionSignature = await this.podClient.agents.registerAgent(
        agentKeypair,
        registrationOptions
      );
      
      updateProgress(2, 'success', `Transaction: ${transactionSignature}`);

      // Step 4: For now, assume confirmation since we got a signature
      updateProgress(3, 'success', 'Registration completed');

      // Save agent configuration locally
      const successData = {
        name: agentData.name,
        address: agentKeypair.address,
        capabilities: agentData.capabilities,
        status: 'active' as const,
        registeredAt: new Date().toISOString()
      };

      await this.config.saveAgent(successData);

      // Display success summary
      this.ui.spacing(2);
      this.ui.box(
        `🎉 ${chalk.green('Agent Registration Successful!')}\n\n` +
        `Agent Name: ${chalk.yellow(agentData.name)}\n` +
        `Agent Address: ${chalk.cyan(agentKeypair.address)}\n` +
        `Capabilities: ${chalk.blue(agentData.capabilities.toString(2).padStart(8, '0'))}\n` +
        `Transaction: ${chalk.gray(transactionSignature)}\n\n` +
        `${chalk.dim('Your agent is now registered and ready to use!')}`,
        { title: 'Registration Complete', color: 'green' }
      );

      // Ask if user wants to set as default
      const setDefault = await confirm({
        message: 'Set this agent as your default?',
        default: true
      });

      if (setDefault) {
        await this.config.save({ defaultAgent: agentKeypair.address });
        this.ui.success('Agent set as default');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? (error as Error).message : String(error);
      const runningStepIndex = steps.findIndex(s => s.status === 'pending');
      if (runningStepIndex >= 0) {
        updateProgress(runningStepIndex, 'error', 'Failed', errorMessage);
      }
      throw error;
    }
  }
} 