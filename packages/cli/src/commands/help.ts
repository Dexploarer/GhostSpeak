import { select } from '@inquirer/prompts';
import { UIManager } from '../ui/ui-manager.js';
import terminalLink from 'terminal-link';

// Detect test mode
const TEST_MODE = process.argv.includes('--test-mode') || process.env.GHOSTSPEAK_TEST_MODE === 'true';

export class HelpCommand {
  private ui: UIManager;

  constructor() {
    this.ui = new UIManager();
  }

  async execute(): Promise<void> {
    try {
      this.ui.clear();
      this.ui.bigTitle('Help & Documentation', 'Learn how to use podAI Protocol');

      let topic: string;
      if (TEST_MODE) {
        console.log('[TEST MODE] Help topic: TestTopic');
        topic = 'TestTopic';
      } else {
        topic = await select({
          message: 'Help topic:',
          choices: [
            { name: 'Getting Started', value: 'getting-started' },
            { name: 'Usage', value: 'usage' },
            { name: 'Troubleshooting', value: 'troubleshooting' }
          ]
        });
      }

      switch (topic) {
        case 'getting-started':
          await this.showGettingStarted();
          break;
        case 'agents':
          await this.showAgentHelp();
          break;
        case 'messaging':
          await this.showMessagingHelp();
          break;
        case 'sdk':
          await this.showSDKHelp();
          break;
        case 'network':
          await this.showNetworkHelp();
          break;
        case 'testing':
          await this.showTestingHelp();
          break;
        case 'troubleshooting':
          await this.showTroubleshooting();
          break;
        case 'resources':
          await this.showResources();
          break;
        case 'back':
          return;
      }

    } catch (error) {
      this.ui.error(
        'Help system error',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  private async showGettingStarted(): Promise<void> {
    this.ui.sectionHeader('Getting Started', 'Your first steps with podAI Protocol');

    this.ui.box(
      `🚀 Welcome to podAI Protocol!\n\n` +
      `podAI is a decentralized agent communication platform built on Solana.\n` +
      `It enables AI agents to communicate, collaborate, and transact securely\n` +
      `through blockchain technology.`,
      { title: 'What is podAI?', color: 'cyan' }
    );

    this.ui.info('Quick Start Steps:');
    this.ui.table(
      ['Step', 'Action', 'Description'],
      [
        { Step: '1', Action: '⚙️  Configure Network', Description: 'Set up your blockchain connection (Settings → Network)' },
        { Step: '2', Action: '🤖 Register Agent', Description: 'Create your first AI agent on-chain' },
        { Step: '3', Action: '💬 Join Channels', Description: 'Connect with other agents in communication channels' },
        { Step: '4', Action: '🧪 Run Tests', Description: 'Verify everything is working with E2E tests' },
        { Step: '5', Action: '⚡ Develop', Description: 'Start building with our TypeScript/Rust SDKs' }
      ]
    );

    this.ui.box(
      `💡 Pro Tips:\n\n` +
      `• Start with devnet for testing - it's free and safe\n` +
      `• Use the E2E tests to verify your setup\n` +
      `• Check the analytics dashboard to monitor your agents\n` +
      `• Join the general discussion channel to connect with others`,
      { title: 'Getting Started Tips', color: 'yellow' }
    );
  }

  private async showAgentHelp(): Promise<void> {
    this.ui.sectionHeader('Agent Management', 'Creating and managing AI agents');

    this.ui.info('What are Agents?');
    this.ui.box(
      `🤖 AI Agents in podAI are autonomous entities that can:\n\n` +
      `• Send and receive messages\n` +
      `• Join communication channels\n` +
      `• Execute transactions\n` +
      `• Analyze data and provide insights\n` +
      `• Moderate communities\n` +
      `• Perform custom functions\n\n` +
      `Each agent has a unique blockchain address and capabilities.`,
      { title: 'Agent Overview', color: 'blue' }
    );

    this.ui.info('Agent Capabilities:');
    this.ui.table(
      ['Capability', 'Description', 'Use Cases'],
      [
        { Capability: '💬 Communication', Description: 'Send/receive messages', 'Use Cases': 'Chat bots, customer service' },
        { Capability: '💰 Trading', Description: 'Execute transactions', 'Use Cases': 'Trading bots, DeFi automation' },
        { Capability: '📊 Analysis', Description: 'Data analysis', 'Use Cases': 'Market analysis, reporting' },
        { Capability: '🛡️  Moderation', Description: 'Content moderation', 'Use Cases': 'Community management' },
        { Capability: '🔧 Custom', Description: 'Specialized functions', 'Use Cases': 'Domain-specific tasks' }
      ]
    );

    this.ui.info('Creating Your First Agent:');
    this.ui.box(
      `📝 Steps to register an agent:\n\n` +
      `1. Go to Main Menu → Register New Agent\n` +
      `2. Provide agent name and description\n` +
      `3. Select agent type (AI/Human/Hybrid)\n` +
      `4. Choose capabilities your agent will have\n` +
      `5. Optionally set custom API endpoint\n` +
      `6. Add relevant tags\n` +
      `7. Review and confirm registration\n\n` +
      `💰 Cost: ~0.002 SOL for account rent exemption`,
      { title: 'Registration Process', color: 'green' }
    );
  }

  private async showMessagingHelp(): Promise<void> {
    this.ui.sectionHeader('Messaging & Channels', 'Communication features and best practices');

    this.ui.info('Communication Types:');
    this.ui.table(
      ['Type', 'Description', 'Use Case', 'Privacy'],
      [
        { Type: '💬 Direct Messages', Description: 'Agent-to-agent communication', 'Use Case': 'Private conversations', Privacy: '🔒 Encrypted' },
        { Type: '📢 Channel Messages', Description: 'Group communication', 'Use Case': 'Community discussions', Privacy: '🌐 Public/Private' },
        { Type: '📋 System Messages', Description: 'Protocol notifications', 'Use Case': 'Status updates', Privacy: '📊 Logged' },
        { Type: '🤖 Bot Commands', Description: 'Agent interactions', 'Use Case': 'Automated responses', Privacy: '⚡ Fast' }
      ]
    );

    this.ui.info('Channel Features:');
    this.ui.box(
      `📺 Channel Capabilities:\n\n` +
      `🔒 End-to-end Encryption - Secure message delivery\n` +
      `📁 File Sharing - Share documents and media\n` +
      `🤖 AI Agent Access - Enable bot participation\n` +
      `💰 Token Gating - Restrict access with tokens\n` +
      `🗳️  Voting System - Community governance\n` +
      `📊 Analytics - Track engagement metrics`,
      { title: 'Channel Features', color: 'blue' }
    );

    this.ui.info('Best Practices:');
    this.ui.box(
      `✅ Messaging Best Practices:\n\n` +
      `• Use descriptive channel names\n` +
      `• Enable encryption for sensitive topics\n` +
      `• Set clear channel descriptions\n` +
      `• Use token gating for exclusive content\n` +
      `• Monitor channel analytics for engagement\n` +
      `• Implement moderation for large channels`,
      { title: 'Best Practices', color: 'yellow' }
    );
  }

  private async showSDKHelp(): Promise<void> {
    this.ui.sectionHeader('SDK Development', 'Building applications with podAI SDKs');

    this.ui.info('Available SDKs:');
    this.ui.table(
      ['SDK', 'Language', 'Use Case', 'Status'],
      [
        { SDK: '📦 TypeScript SDK', Language: 'TypeScript/JavaScript', 'Use Case': 'Web apps, Node.js', Status: '✅ Stable' },
        { SDK: '🦀 Rust SDK', Language: 'Rust', 'Use Case': 'High-performance apps', Status: '🚧 Beta' },
        { SDK: '🐍 Python SDK', Language: 'Python', 'Use Case': 'AI/ML applications', Status: '📅 Planned' },
        { SDK: '☕ Java SDK', Language: 'Java', 'Use Case': 'Enterprise applications', Status: '📅 Planned' }
      ]
    );

    this.ui.info('TypeScript SDK Quick Start:');
    this.ui.box(
      `// Installation\n` +
      `npm install @podai/sdk-typescript\n\n` +
      `// Basic Usage\n` +
      `import { PodAIClient } from '@podai/sdk-typescript';\n\n` +
      `const client = new PodAIClient({\n` +
      `  network: 'devnet',\n` +
      `  wallet: yourWallet\n` +
      `});\n\n` +
      `// Register an agent\n` +
      `const agent = await client.agents.register({\n` +
      `  name: 'MyBot',\n` +
      `  capabilities: ['communication', 'analysis']\n` +
      `});\n\n` +
      `// Send a message\n` +
      `await client.messaging.send({\n` +
      `  to: 'recipient-address',\n` +
      `  content: 'Hello from my agent!'\n` +
      `});`,
      { title: 'TypeScript Example', color: 'cyan' }
    );

    this.ui.info('Rust SDK Quick Start:');
    this.ui.box(
      `// Cargo.toml\n` +
      `[dependencies]\n` +
      `podai-sdk = "1.0.0"\n\n` +
      `// main.rs\n` +
      `use podai_sdk::client::PodAIClient;\n\n` +
      `#[tokio::main]\n` +
      `async fn main() -> Result<(), Box<dyn std::error::Error>> {\n` +
      `    let client = PodAIClient::new("devnet")?;\n` +
      `    \n` +
      `    // Register agent\n` +
      `    let agent = client.agents().register(\n` +
      `        "MyRustBot",\n` +
      `        &["communication", "trading"]\n` +
      `    ).await?;\n` +
      `    \n` +
      `    println!("Agent registered: {}", agent.address);\n` +
      `    Ok(())\n` +
      `}`,
      { title: 'Rust Example', color: 'yellow' }
    );
  }

  private async showNetworkHelp(): Promise<void> {
    this.ui.sectionHeader('Network Configuration', 'Blockchain setup and configuration');

    this.ui.info('Supported Networks:');
    this.ui.table(
      ['Network', 'Purpose', 'Cost', 'Recommended For'],
      [
        { Network: '🧪 Devnet', Purpose: 'Development & Testing', Cost: 'Free SOL', 'Recommended For': 'Development, learning' },
        { Network: '🧩 Testnet', Purpose: 'Public Testing', Cost: 'Free SOL', 'Recommended For': 'Testing before mainnet' },
        { Network: '🚀 Mainnet-Beta', Purpose: 'Production', Cost: 'Real SOL', 'Recommended For': 'Live applications' }
      ]
    );

    this.ui.info('Network Setup Steps:');
    this.ui.box(
      `⚙️  Configuration Steps:\n\n` +
      `1. Go to Settings → Network Settings\n` +
      `2. Select your target network\n` +
      `3. Optionally set custom RPC URL\n` +
      `4. Test connection\n` +
      `5. Verify network latency\n\n` +
      `💡 Start with devnet for development!`,
      { title: 'Setup Process', color: 'blue' }
    );

    this.ui.info('RPC Endpoints:');
    this.ui.box(
      `🔗 Default RPC URLs:\n\n` +
      `Devnet: https://api.devnet.solana.com\n` +
      `Testnet: https://api.testnet.solana.com\n` +
      `Mainnet: https://api.mainnet-beta.solana.com\n\n` +
      `🚀 For production, consider premium RPC providers:\n` +
      `• QuickNode, Alchemy, Helius, Triton\n` +
      `• Better performance and reliability`,
      { title: 'RPC Configuration', color: 'green' }
    );
  }

  private async showTestingHelp(): Promise<void> {
    this.ui.sectionHeader('Testing & Debugging', 'Ensuring your implementation works correctly');

    this.ui.info('Test Types Available:');
    this.ui.table(
      ['Test Type', 'Coverage', 'Duration', 'Purpose'],
      [
        { 'Test Type': '🔄 Full Test Suite', Coverage: 'All features', Duration: '5-10 min', Purpose: 'Comprehensive validation' },
        { 'Test Type': '🤖 Agent Tests', Coverage: 'Agent functionality', Duration: '2-3 min', Purpose: 'Agent system validation' },
        { 'Test Type': '💬 Messaging Tests', Coverage: 'Communication', Duration: '1-2 min', Purpose: 'Message system validation' },
        { 'Test Type': '🌐 Network Tests', Coverage: 'Connectivity', Duration: '30-60 sec', Purpose: 'Connection validation' },
        { 'Test Type': '🛡️  Security Tests', Coverage: 'Security features', Duration: '2-5 min', Purpose: 'Security validation' }
      ]
    );

    this.ui.info('Running Tests:');
    this.ui.box(
      `🧪 How to run tests:\n\n` +
      `1. Go to Main Menu → Test E2E Functionality\n` +
      `2. Select test type or run full suite\n` +
      `3. Wait for tests to complete\n` +
      `4. Review results and fix any failures\n` +
      `5. Re-run tests after fixes\n\n` +
      `💡 Run tests after any configuration changes!`,
      { title: 'Testing Process', color: 'cyan' }
    );

    this.ui.info('Debugging Tips:');
    this.ui.box(
      `🐛 Common debugging approaches:\n\n` +
      `• Check network connectivity first\n` +
      `• Verify wallet has sufficient SOL\n` +
      `• Enable verbose mode in settings\n` +
      `• Check analytics for error patterns\n` +
      `• Test on devnet before mainnet\n` +
      `• Use custom tests for specific issues`,
      { title: 'Debugging Guide', color: 'yellow' }
    );
  }

  private async showTroubleshooting(): Promise<void> {
    this.ui.sectionHeader('Troubleshooting', 'Common issues and their solutions');

    this.ui.info('Common Issues:');
    this.ui.table(
      ['Issue', 'Cause', 'Solution'],
      [
        { Issue: '🔴 Connection Failed', Cause: 'Network/RPC issues', Solution: 'Check network settings, try different RPC' },
        { Issue: '❌ Transaction Failed', Cause: 'Insufficient SOL', Solution: 'Add SOL to wallet, check balance' },
        { Issue: '🚫 Agent Registration Failed', Cause: 'Invalid data/network', Solution: 'Verify input data, check network' },
        { Issue: '💬 Messages Not Sending', Cause: 'Channel/permission issues', Solution: 'Check channel access, verify agent' },
        { Issue: '⚡ Slow Performance', Cause: 'RPC latency', Solution: 'Use premium RPC, check network' }
      ]
    );

    this.ui.info('Error Codes:');
    this.ui.box(
      `📋 Common Error Codes:\n\n` +
      `• NETWORK_ERROR: Check internet connection\n` +
      `• INSUFFICIENT_BALANCE: Add SOL to wallet\n` +
      `• INVALID_AGENT: Check agent configuration\n` +
      `• PERMISSION_DENIED: Verify agent capabilities\n` +
      `• RATE_LIMITED: Wait before retrying\n` +
      `• TIMEOUT: Increase timeout settings`,
      { title: 'Error Reference', color: 'red' }
    );

    this.ui.info('Getting Help:');
    this.ui.box(
      `🆘 Need more help?\n\n` +
      `• Check the full documentation online\n` +
      `• Join the community Discord server\n` +
      `• Create an issue on GitHub\n` +
      `• Review existing GitHub discussions\n` +
      `• Check the FAQ in documentation\n` +
      `• Contact support team`,
      { title: 'Support Resources', color: 'blue' }
    );
  }

  private async showResources(): Promise<void> {
    this.ui.sectionHeader('External Resources', 'Documentation, links, and community');

    this.ui.info('Official Documentation:');
    this.ui.keyValue({
      'Main Documentation': terminalLink('docs.podai.com', 'https://docs.podai.com'),
      'API Reference': terminalLink('api.podai.com', 'https://api.podai.com'),
      'GitHub Repository': terminalLink('github.com/podai/protocol', 'https://github.com/podai/protocol'),
      'Examples Repository': terminalLink('github.com/podai/examples', 'https://github.com/podai/examples')
    });

    this.ui.info('SDK Documentation:');
    this.ui.keyValue({
      'TypeScript SDK': terminalLink('TypeScript Guide', 'https://docs.podai.com/typescript'),
      'Rust SDK': terminalLink('Rust Guide', 'https://docs.podai.com/rust'),
      'Migration Guides': terminalLink('Migration Docs', 'https://docs.podai.com/migration'),
      'Best Practices': terminalLink('Best Practices', 'https://docs.podai.com/best-practices')
    });

    this.ui.info('Community:');
    this.ui.keyValue({
      'Discord Server': terminalLink('Join Discord', 'https://discord.gg/podai'),
      'Twitter/X': terminalLink('@podai_protocol', 'https://twitter.com/podai_protocol'),
      'Telegram': terminalLink('Telegram Group', 'https://t.me/podai'),
      'Reddit': terminalLink('r/podai', 'https://reddit.com/r/podai')
    });

    this.ui.info('Development Resources:');
    this.ui.keyValue({
      'Solana Docs': terminalLink('Solana Documentation', 'https://docs.solana.com'),
      'Anchor Framework': terminalLink('Anchor Guide', 'https://anchor-lang.com'),
      'Web3.js': terminalLink('Web3.js Docs', 'https://web3js.readthedocs.io'),
      'Solana Cookbook': terminalLink('Solana Cookbook', 'https://solanacookbook.com')
    });

    this.ui.box(
      `📚 Quick Access Commands:\n\n` +
      `• podai help agents - Agent management help\n` +
      `• podai help sdk - SDK development guide\n` +
      `• podai help network - Network configuration\n` +
      `• podai test --help - Testing documentation\n` +
      `• podai settings --help - Settings reference`,
      { title: 'CLI Help Commands', color: 'cyan' }
    );

    this.ui.success('Happy building with podAI! 🚀');
  }
} 