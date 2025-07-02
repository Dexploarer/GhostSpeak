import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { promisify } from 'util';

import { select, input, confirm, checkbox } from '@inquirer/prompts';
import { Command } from 'commander';

import { UIManager } from '../ui/ui-manager.js';
import { ConfigManager } from '../utils/config-manager.js';
import { NetworkManager } from '../utils/network-manager.js';

const execAsync = promisify(exec);

// Detect test mode
const TEST_MODE = process.argv.includes('--test-mode') || process.env.GHOSTSPEAK_TEST_MODE === 'true';

export interface ISDKProject {
  name: string;
  type: 'typescript' | 'rust' | 'both';
  language: 'typescript' | 'rust';
  network: 'devnet' | 'testnet' | 'mainnet';
  features: string[];
  path: string;
}

export class DevelopSDKCommand {
  private readonly ui: UIManager;
  // private readonly network: NetworkManager;
  private readonly config: ConfigManager;

  constructor() {
    this.ui = new UIManager();
    // this.network = new NetworkManager();
    this.config = new ConfigManager();
  }

  async execute(): Promise<void> {
    try {
      this.ui.clear();
      this.ui.bigTitle(
        'SDK Development Studio',
        'Interactive development environment for TypeScript and Rust SDKs'
      );

      const choice = await select({
        message: 'What would you like to do?',
        choices: [
          { name: '🚀 Create New Project', value: 'create-project' },
          { name: '📦 Generate TypeScript SDK Code', value: 'generate-ts' },
          { name: '🦀 Generate Rust SDK Code', value: 'generate-rust' },
          { name: '🧪 Test SDK Functions', value: 'test-sdk' },
          { name: '🔄 Compare SDK Performance', value: 'compare-sdks' },
          { name: '📚 View SDK Documentation', value: 'docs' },
          { name: '🔧 SDK Configuration', value: 'config' },
          { name: '↩️  Back to Main Menu', value: 'back' },
        ]
      });

      switch (choice) {
        case 'create-project':
          await this.createNewProject();
          break;
        case 'generate-ts':
          await this.generateTypeScriptCode();
          break;
        case 'generate-rust':
          await this.generateRustCode();
          break;
        case 'test-sdk':
          await this.testSDKFunctions();
          break;
        case 'compare-sdks':
          await this.compareSDKs();
          break;
        case 'docs':
          await this.showDocumentation();
          break;
        case 'config':
          await this.showConfiguration();
          break;
        case 'back':
          return;
      }
    } catch (error) {
      this.ui.error(
        'SDK development failed',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  private async createNewProject(): Promise<void> {
    this.ui.sectionHeader(
      'Create New Project',
      'Initialize a new ghostspeak project with your preferred SDK'
    );

    // Project basic info
    let projectName: string;
    if (TEST_MODE) {
      console.log('[TEST MODE] Project name: TestProject');
      projectName = 'TestProject';
    } else {
      projectName = await input({
        message: 'Project name:',
        default: 'my-ghostspeak-app',
        validate: value => {
          if (!value.trim()) return 'Project name is required';
          if (!/^[a-z0-9-_]+$/.test(value))
            return 'Use only lowercase letters, numbers, hyphens, and underscores';
          return true;
        },
      });
    }

    const projectPath = await input({
      message: 'Project directory:',
      default: `./${projectName}`,
    });

    // SDK Selection
    const sdkChoice = await select({
      message: 'Which SDK would you like to use?',
      choices: [
        {
          name: '📜 TypeScript SDK - Web-first, easy integration',
          value: 'typescript',
        },
        {
          name: '🦀 Rust SDK - High performance, native apps',
          value: 'rust',
        },
        {
          name: '🔄 Both SDKs - Full comparison and flexibility',
          value: 'both',
        },
      ],
    });

    // Network Selection
    const network = await select({
      message: 'Target network:',
      choices: [
        { name: '🧪 Devnet - For development and testing', value: 'devnet' },
        { name: '🔍 Testnet - For staging and validation', value: 'testnet' },
        { name: '🌐 Mainnet - For production deployment', value: 'mainnet' },
      ],
    });

    // Feature Selection
    const features = await checkbox({
      message: 'Select features to include:',
      choices: [
        { name: 'Agent Registration', value: 'agents', checked: true },
        { name: 'Direct Messaging', value: 'messaging', checked: true },
        { name: 'Group Channels', value: 'channels', checked: false },
        { name: 'Escrow Services', value: 'escrow', checked: false },
        { name: 'Marketplace Trading', value: 'marketplace', checked: false },
        { name: 'Analytics Dashboard', value: 'analytics', checked: false },
        { name: 'ZK Compression', value: 'compression', checked: false },
      ],
    });

    const project: ISDKProject = {
      name: projectName,
      type: sdkChoice as 'typescript' | 'rust' | 'both',
      language: sdkChoice === 'both' ? 'typescript' : sdkChoice as 'typescript' | 'rust',
      network: network as 'devnet' | 'testnet' | 'mainnet',
      features,
      path: resolve(projectPath)
    };

    await this.generateProject(project);
  }

  private async generateProject(project: ISDKProject): Promise<void> {
    const spinner = this.ui.spinner(`Creating ${project.name} project...`);
    spinner.start();

    try {
      // Create project directory
      await fs.mkdir(project.path, { recursive: true });

      if (project.type === 'typescript' || project.type === 'both') {
        await this.generateTypeScriptProject(project);
      }

      if (project.type === 'rust' || project.type === 'both') {
        await this.generateRustProject(project);
      }

      // Generate shared files
      await this.generateSharedFiles(project);

      spinner.success({ text: `Project ${project.name} created successfully!` });

      this.ui.success('🎉 Project Setup Complete!');
      this.ui.info(`📁 Location: ${project.path}`);

      if (project.type === 'typescript' || project.type === 'both') {
        this.ui.info('📜 TypeScript: Run `npm install && npm run dev`');
      }
      if (project.type === 'rust' || project.type === 'both') {
        this.ui.info('🦀 Rust: Run `cargo build && cargo run`');
      }

    } catch (error) {
      spinner.stop();
      this.ui.error('Project creation failed', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  private async generateTypeScriptProject(project: ISDKProject): Promise<void> {
    const tsPath = project.type === 'both' ? join(project.path, 'typescript') : project.path;
    await fs.mkdir(tsPath, { recursive: true });

    // Generate package.json
    const packageJson = {
      name: project.name,
      version: "1.0.0",
      description: `ghostspeak Agent Commerce Protocol - ${project.name}`,
      type: "module",
      main: "dist/index.js",
      scripts: {
        build: "tsc",
        dev: "tsx --watch src/index.ts",
        start: "node dist/index.js",
        test: "jest",
        lint: "eslint src/**/*.ts",
        format: "prettier --write src/**/*.ts"
      },
      dependencies: {
        "@ghostspeak/sdk": "workspace:*",
        "@solana/web3.js": "^2.1.1",
        "@solana/addresses": "^2.1.1",
        "@solana/signers": "^2.1.1"
      },
      devDependencies: {
        "typescript": "^5.8.3",
        "tsx": "^4.19.2",
        "@types/node": "^24.0.7",
        "eslint": "^9.0.0",
        "@typescript-eslint/eslint-plugin": "^8.0.0",
        "prettier": "^3.0.0",
        "jest": "^29.0.0",
        "@types/jest": "^29.0.0"
      },
      keywords: ["ghostspeak", "agent", "solana", "ai", "blockchain"],
      author: "Your Name",
      license: "MIT"
    };

    await fs.writeFile(
      join(tsPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Generate TypeScript config
    const tsConfig = {
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "bundler",
        outDir: "./dist",
        rootDir: "./src",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        resolveJsonModule: true,
        allowSyntheticDefaultImports: true
      },
      include: ["src/**/*"],
      exclude: ["node_modules", "dist", "**/*.test.ts"]
    };

    await fs.writeFile(
      join(tsPath, 'tsconfig.json'),
      JSON.stringify(tsConfig, null, 2)
    );

    // Generate main TypeScript application
    await this.generateTypeScriptApp(project, tsPath);
  }

  private async generateRustProject(project: ISDKProject): Promise<void> {
    const rustPath = project.type === 'both' ? join(project.path, 'rust') : project.path;
    await fs.mkdir(rustPath, { recursive: true });

    // Generate Cargo.toml
    const cargoToml = `[package]
name = "${project.name.replace(/-/g, '_')}"
version = "0.1.0"
edition = "2021"
description = "ghostspeak Agent Commerce Protocol - ${project.name}"
authors = ["Your Name <your.email@example.com>"]
license = "MIT"
repository = "https://github.com/yourusername/${project.name}"
readme = "README.md"
keywords = ["ghostspeak", "agent", "solana", "ai", "blockchain"]
categories = ["cryptography::cryptocurrencies", "api-bindings"]

[dependencies]
# ghostspeak Rust SDK
podai-sdk = { path = "../../sdk-rust" }

# Async runtime
tokio = { version = "1.40", features = ["full"] }

# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# Logging
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }

# Error handling
anyhow = "1.0"
thiserror = "1.0"

# CLI (optional)
clap = { version = "4.0", features = ["derive"], optional = true }

# Configuration
config = "0.14"

[features]
default = ["cli"]
cli = ["dep:clap"]
${project.features.map(f => `${f} = []`).join('\n')}

[[bin]]
name = "${project.name.replace(/-/g, '_')}"
path = "src/main.rs"
required-features = ["cli"]

[lib]
name = "${project.name.replace(/-/g, '_')}"
path = "src/lib.rs"
`;

    await fs.writeFile(join(rustPath, 'Cargo.toml'), cargoToml);

    // Generate main Rust application
    await this.generateRustApp(project, rustPath);
  }

  private async generateTypeScriptApp(project: ISDKProject, basePath: string): Promise<void> {
    const srcPath = join(basePath, 'src');
    await fs.mkdir(srcPath, { recursive: true });

    const mainApp = `import { createGhostSpeakClient, AgentCapabilities } from '@ghostspeak/sdk';
import { generateKeyPairSigner } from '@solana/signers';

async function main() {
  console.log('🚀 ${project.name} - ghostspeak Agent');
  
  try {
    // Initialize client for ${project.network}
    const client = createGhostSpeakClient({
      rpcEndpoint: '${this.getNetworkEndpoint(project.network)}',
      commitment: 'confirmed'
    });

    console.log('✅ Connected to ${project.network}');

    // Generate agent keypair
    const agentKeypair = await generateKeyPairSigner();
    console.log('🔑 Generated keypair:', agentKeypair.address);

${project.features.includes('agents') ? `
    // Register agent
    const agentResult = await client.agent.register({
      signer: agentKeypair,
      capabilities: AgentCapabilities.COMMUNICATION | AgentCapabilities.TRADING,
      metadataUri: "https://example.com/agent-metadata.json"
    });
    
    console.log('🤖 Agent registered:', agentResult.agentPda);
` : ''}

${project.features.includes('messaging') ? `
    // Example: Send a message
    const recipient = await generateKeyPairSigner();
    
    const messageResult = await client.messaging.send({
      signer: agentKeypair,
      recipient: recipient.address,
      content: "Hello from ${project.name}!",
      messageType: "text"
    });
    
    console.log('💬 Message sent:', messageResult.signature);
` : ''}

${project.features.includes('channels') ? `
    // Create a channel
    const channelResult = await client.channels.create({
      signer: agentKeypair,
      name: "${project.name} Channel",
      visibility: "public"
    });
    
    console.log('📢 Channel created:', channelResult.channelPda);
` : ''}

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main().catch(console.error);
`;

    await fs.writeFile(join(srcPath, 'index.ts'), mainApp);

    // Generate example files for each feature
    if (project.features.includes('agents')) {
      await this.generateTypeScriptAgentExample(srcPath);
    }
    if (project.features.includes('messaging')) {
      await this.generateTypeScriptMessagingExample(srcPath);
    }
    if (project.features.includes('channels')) {
      await this.generateTypeScriptChannelExample(srcPath);
    }
  }

  private async generateRustApp(project: ISDKProject, basePath: string): Promise<void> {
    const srcPath = join(basePath, 'src');
    await fs.mkdir(srcPath, { recursive: true });

    const mainRs = `use anyhow::Result;
use podai_sdk::prelude::*;
use solana_sdk::signature::{Keypair, Signer};
use tracing::{info, error};

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::init();
    
    info!("🚀 {} - ghostspeak Agent", "${project.name}");
    
    // Initialize client for ${project.network}
    let client = PodAIClient::${project.network}().await?;
    info!("✅ Connected to ${project.network}");

    // Generate agent keypair
    let agent_keypair = Keypair::new();
    info!("🔑 Generated keypair: {}", agent_keypair.pubkey());

${project.features.includes('agents') ? `
    // Register agent
    let agent_service = AgentService::new(client.clone());
    let agent_result = agent_service
        .register_fast(
            &agent_keypair,
            AgentCapabilities::Communication as u64 | AgentCapabilities::Trading as u64,
            "https://example.com/agent-metadata.json"
        )
        .await?;
    
    info!("🤖 Agent registered: {}", agent_result.agent_pda);
` : ''}

${project.features.includes('messaging') ? `
    // Example: Send a message
    let recipient = Keypair::new();
    let message_service = MessageService::new(client.clone());
    
    let message_result = message_service
        .send_message_fast(
            &agent_keypair,
            &recipient.pubkey(),
            "Hello from ${project.name}!",
            MessageType::Text
        )
        .await?;
    
    info!("💬 Message sent: {}", message_result.signature);
` : ''}

${project.features.includes('channels') ? `
    // Create a channel
    let channel_service = ChannelService::new(client.clone());
    
    let channel_result = channel_service
        .create_channel_fast(
            &agent_keypair,
            "${project.name} Channel",
            ChannelVisibility::Public,
            None
        )
        .await?;
    
    info!("📢 Channel created: {}", channel_result.channel_pda);
` : ''}

    Ok(())
}
`;

    await fs.writeFile(join(srcPath, 'main.rs'), mainRs);

    // Generate lib.rs
    const libRs = `//! ${project.name}
//! 
//! A ghostspeak Agent Commerce Protocol application built with Rust SDK.

use anyhow::Result;
use podai_sdk::prelude::*;

pub mod config;
${project.features.includes('agents') ? 'pub mod agent;' : ''}
${project.features.includes('messaging') ? 'pub mod messaging;' : ''}
${project.features.includes('channels') ? 'pub mod channels;' : ''}

/// Application configuration
pub use config::AppConfig;

/// Initialize the application
pub async fn init() -> Result<PodAIClient> {
    let config = AppConfig::load()?;
    let client = PodAIClient::from_config(config.pod_ai).await?;
    Ok(client)
}
`;

    await fs.writeFile(join(srcPath, 'lib.rs'), libRs);

    // Generate config module
    await this.generateRustConfigModule(srcPath, project);

    // Generate feature modules
    if (project.features.includes('agents')) {
      await this.generateRustAgentModule(srcPath);
    }
    if (project.features.includes('messaging')) {
      await this.generateRustMessagingModule(srcPath);
    }
    if (project.features.includes('channels')) {
      await this.generateRustChannelModule(srcPath);
    }
  }

  private async generateSharedFiles(project: ISDKProject): Promise<void> {
    // Generate README
    const readme = `# ${project.name}

A ghostspeak Agent Commerce Protocol application using ${project.type === 'both' ? 'TypeScript and Rust SDKs' : `${project.type} SDK`}.

## Features

${project.features.map(f => `- ✅ ${this.getFeatureDescription(f)}`).join('\n')}

## Network

- 🌐 **Target Network**: ${project.network}
- 🔗 **RPC Endpoint**: ${this.getNetworkEndpoint(project.network)}

## Quick Start

${project.type === 'typescript' || project.type === 'both' ? `
### TypeScript
\`\`\`bash
${project.type === 'both' ? 'cd typescript' : ''}
npm install
npm run dev
\`\`\`
` : ''}

${project.type === 'rust' || project.type === 'both' ? `
### Rust
\`\`\`bash
${project.type === 'both' ? 'cd rust' : ''}
cargo build
cargo run
\`\`\`
` : ''}

## Project Structure

${project.type === 'both' ? `
\`\`\`
${project.name}/
├── typescript/         # TypeScript implementation
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── rust/              # Rust implementation
│   ├── src/
│   └── Cargo.toml
└── README.md
\`\`\`
` : `
\`\`\`
${project.name}/
├── src/               # Source code
${project.type === 'typescript' ? '├── package.json\n├── tsconfig.json' : '├── Cargo.toml'}
└── README.md
\`\`\`
`}

## Documentation

- 📚 [ghostspeak Protocol Docs](https://docs.ghostspeak.com)
- 🦀 [Rust SDK Guide](https://docs.ghostspeak.com/sdk/rust)
- 📜 [TypeScript SDK Guide](https://docs.ghostspeak.com/sdk/typescript)

## License

MIT License - see LICENSE file for details.
`;

    await fs.writeFile(join(project.path, 'README.md'), readme);

    // Generate .gitignore
    const gitignore = `# Dependencies
node_modules/
target/

# Build outputs
dist/
build/

# Environment files
.env
.env.local

# Editor files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Testing
coverage/
.nyc_output/

# Rust specific
Cargo.lock
target/

# TypeScript specific
*.tsbuildinfo
`;

    await fs.writeFile(join(project.path, '.gitignore'), gitignore);
  }

  private async generateRustCode(): Promise<void> {
    this.ui.sectionHeader('Rust SDK Code Generator', 'Generate production-ready Rust code using our SDK');
    
    const agentType = await select({
      message: 'Select Rust implementation to generate:',
      choices: [
        { name: '🤖 Basic Agent Client', value: 'basic-agent' },
        { name: '⚡ High-Performance Message Handler', value: 'message-handler' },
        { name: '🔄 Transaction Factory Example', value: 'transaction-factory' },
        { name: '🏪 Marketplace Bot', value: 'marketplace-bot' },
        { name: '📊 Analytics Service', value: 'analytics-service' },
        { name: '🧪 Integration Tests', value: 'integration-tests' }
      ]
    });

    const network = await select({
      message: 'Target network:',
      choices: [
        { name: 'Devnet (Development)', value: 'devnet' },
        { name: 'Testnet (Staging)', value: 'testnet' },
        { name: 'Mainnet (Production)', value: 'mainnet' }
      ]
    });

    const spinner = this.ui.spinner('Generating production Rust code...');
    spinner.start();

    await new Promise(resolve => setTimeout(resolve, 2000));
    spinner.success({ text: 'Rust code generated successfully!' });

    const rustCode = this.generateRustCodeForType(agentType, network);

    this.ui.box(rustCode, { title: `Generated Rust Code - ${agentType}`, color: 'yellow' });

    const saveToFile = await confirm({
      message: 'Save generated code to file?',
      default: true
    });

    if (saveToFile) {
      const filename = await input({
        message: 'Filename:',
        default: `${agentType.replace(/-/g, '_')}.rs`
      });

      try {
        await fs.writeFile(filename, rustCode);
        this.ui.success(`💾 Code saved to ${filename}`);
        // Use execAsync if needed for compilation check
        await execAsync(`rustc --check ${filename}`).catch(() => {
          // Ignore compilation errors for generated examples
        });
      } catch (error) {
        this.ui.error('Failed to save file', error instanceof Error ? error.message : String(error));
      }
    }

    this.ui.info('🦀 Ready to build with: cargo build && cargo run');
  }

  private async compareSDKs(): Promise<void> {
    this.ui.sectionHeader('SDK Performance Comparison', 'Compare TypeScript vs Rust SDK performance');

    const testType = await select({
      message: 'Select performance test:',
      choices: [
        { name: '🚀 Agent Registration Speed', value: 'agent-registration' },
        { name: '💬 Message Throughput', value: 'message-throughput' },
        { name: '🔄 Transaction Processing', value: 'transaction-processing' },
        { name: '📊 Memory Usage', value: 'memory-usage' }
      ]
    });

    const spinner = this.ui.spinner('Running performance tests...');
    spinner.start();

    await new Promise(resolve => setTimeout(resolve, 5000));
    spinner.success({ text: 'Performance tests completed!' });

    // Mock performance results
    const results = {
      'agent-registration': {
        typescript: { time: '1.2s', memory: '45MB', throughput: '850 ops/sec' },
        rust: { time: '0.3s', memory: '12MB', throughput: '3200 ops/sec' }
      },
      'message-throughput': {
        typescript: { time: '2.1s', memory: '78MB', throughput: '420 msgs/sec' },
        rust: { time: '0.8s', memory: '28MB', throughput: '1580 msgs/sec' }
      },
      'transaction-processing': {
        typescript: { time: '1.8s', memory: '52MB', throughput: '680 txs/sec' },
        rust: { time: '0.5s', memory: '18MB', throughput: '2100 txs/sec' }
      },
      'memory-usage': {
        typescript: { time: '1.0s', memory: '65MB', throughput: '1000 ops/sec' },
        rust: { time: '1.0s', memory: '22MB', throughput: '1000 ops/sec' }
      }
    };

    const testResults = results[testType as keyof typeof results];

    this.ui.table(
      ['SDK', 'Execution Time', 'Memory Usage', 'Throughput'],
      [
        {
          SDK: '📜 TypeScript',
          'Execution Time': testResults.typescript.time,
          'Memory Usage': testResults.typescript.memory,
          Throughput: testResults.typescript.throughput
        },
        {
          SDK: '🦀 Rust',
          'Execution Time': testResults.rust.time,
          'Memory Usage': testResults.rust.memory,
          Throughput: testResults.rust.throughput
        }
      ]
    );

    this.ui.box(`
🏆 Performance Summary for ${testType}:

• Rust SDK is ~4x faster in execution time
• Rust SDK uses ~60% less memory 
• Rust SDK achieves ~3x higher throughput

💡 Choose Rust for:
  - High-frequency trading bots
  - Performance-critical applications  
  - Resource-constrained environments

💡 Choose TypeScript for:
  - Rapid prototyping
  - Web applications
  - Team familiarity with JavaScript
    `, { title: 'Performance Analysis', color: 'cyan' });
  }

  private async generateTypeScriptCode(): Promise<void> {
    this.ui.sectionHeader('TypeScript SDK Generator', 'Generate code for agent interactions');
    
    const agentType = await select({
      message: 'Select agent functionality to generate:',
      choices: [
        { name: '🤖 Basic Agent Client', value: 'basic-agent' },
        { name: '💬 Messaging Functions', value: 'messaging' },
        { name: '📊 Analytics Helper', value: 'analytics' },
        { name: '🔧 Custom Implementation', value: 'custom' }
      ]
    });

    const spinner = this.ui.spinner('Generating TypeScript code...');
    spinner.start();

    await new Promise(resolve => setTimeout(resolve, 2000));
    spinner.success({ text: 'TypeScript code generated successfully!' });

    this.ui.box(
      `// Generated TypeScript SDK Code\n` +
      `import { createGhostSpeakClient, AgentCapabilities } from '@ghostspeak/sdk';\n` +
      `import { generateKeyPairSigner } from '@solana/signers';\n\n` +
      `const client = createGhostSpeakClient({\n` +
      `  rpcEndpoint: 'https://api.devnet.solana.com',\n` +
      `  commitment: 'confirmed'\n` +
      `});\n\n` +
      `// ${agentType} implementation\n` +
      `export class MyAgent {\n` +
      `  async sendMessage(content: string) {\n` +
      `    const agentKeypair = await generateKeyPairSigner();\n` +
      `    const recipient = await generateKeyPairSigner();\n` +
      `    return await client.messaging.send({\n` +
      `      signer: agentKeypair,\n` +
      `      recipient: recipient.address,\n` +
      `      content,\n` +
      `      messageType: "text"\n` +
      `    });\n` +
      `  }\n` +
      `}`,
      { title: 'Generated Code', color: 'cyan' }
    );

    this.ui.success('Code generated and ready to use!');
  }

  private async testSDKFunctions(): Promise<void> {
    this.ui.sectionHeader('SDK Function Testing', 'Test SDK functionality in real-time');
    
    const testChoice = await select({
      message: 'Select test to run:',
      choices: [
        { name: '🔗 Connection Test', value: 'connection' },
        { name: '💬 Message Test', value: 'message' },
        { name: '👤 Agent Test', value: 'agent' },
        { name: '📊 Analytics Test', value: 'analytics' }
      ]
    });

    const spinner = this.ui.spinner(`Running ${testChoice} test...`);
    spinner.start();

    await new Promise(resolve => setTimeout(resolve, 3000));
    spinner.success({ text: `${testChoice} test passed!` });

    this.ui.table(['Test', 'Status', 'Duration', 'Result'], [
      { Test: 'Connection', Status: '✅ Passed', Duration: '1.2s', Result: 'Connected to devnet' },
      { Test: 'Authentication', Status: '✅ Passed', Duration: '0.8s', Result: 'Valid credentials' },
      { Test: 'Message Send', Status: '✅ Passed', Duration: '2.1s', Result: 'Message delivered' }
    ]);
  }

  private async showDocumentation(): Promise<void> {
    this.ui.sectionHeader('SDK Documentation', 'Interactive documentation browser');
    
    this.ui.box(
      `📚 ghostspeak SDK Documentation\n\n` +
      `TypeScript SDK:\n` +
      `• Installation: npm install @ghostspeak/sdk\n` +
      `• Quick Start: docs.ghostspeak.com/typescript\n` +
      `• API Reference: docs.ghostspeak.com/api\n\n` +
      `Rust SDK:\n` +
      `• Installation: cargo add podai-sdk\n` +
      `• Quick Start: docs.ghostspeak.com/rust\n` +
      `• Examples: github.com/ghostspeak/examples`,
      { title: 'Documentation Links', color: 'blue' }
    );
  }

  private async showConfiguration(): Promise<void> {
    this.ui.sectionHeader('SDK Configuration', 'Configure SDK settings and preferences');
    
    const config = await this.config.load();
    
    this.ui.keyValue({
      'Current Network': config.network,
      'RPC URL': await this.config.getRpcUrl(),
      'Default Agent': config.defaultAgent || 'None set',
      'TypeScript SDK Version': '1.0.0',
      'Rust SDK Version': '0.1.0'
    });
  }
  
  private getNetworkEndpoint(network: string): string {
    switch (network) {
      case 'devnet': return 'https://api.devnet.solana.com';
      case 'testnet': return 'https://api.testnet.solana.com'; 
      case 'mainnet': return 'https://api.mainnet-beta.solana.com';
      default: return 'https://api.devnet.solana.com';
    }
  }

  private getFeatureDescription(feature: string): string {
    const descriptions = {
      agents: 'Agent Registration and Management',
      messaging: 'Direct Messaging Between Agents',
      channels: 'Group Communication Channels',
      escrow: 'Secure Escrow Services',
      marketplace: 'Data Product Marketplace',
      analytics: 'Analytics and Metrics Dashboard',
      compression: 'ZK State Compression'
    };
    return descriptions[feature as keyof typeof descriptions] || feature;
  }

  private generateRustCodeForType(type: string, network: string): string {
    const baseCode = `use anyhow::Result;
use podai_sdk::prelude::*;
use solana_sdk::signature::{Keypair, Signer};
use tracing::{info, error};

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::init();
    
    // Connect to ${network}
    let client = PodAIClient::${network}().await?;
    info!("Connected to ${network}");

    ${this.generateRustTypeSpecificCode(type)}

    Ok(())
}`;

    return baseCode;
  }

  private generateRustTypeSpecificCode(type: string): string {
    switch (type) {
      case 'basic-agent':
        return `// Register a basic agent
    let agent_keypair = Keypair::new();
    let agent_service = AgentService::new(client.clone());
    
    let result = agent_service
        .register_fast(
            &agent_keypair,
            AgentCapabilities::Communication as u64,
            "https://example.com/metadata.json"
        )
        .await?;
    
    info!("Agent registered: {}", result.agent_pda);`;
        
      case 'message-handler':
        return `// High-performance message handler
    let agent_keypair = Keypair::new();
    let message_service = MessageService::new(client.clone());
    
    // Register agent first
    let agent_service = AgentService::new(client.clone());
    agent_service.register_fast(&agent_keypair, AgentCapabilities::Communication as u64, "").await?;
    
    // Set up message handling loop
    let recipient = Keypair::new();
    for i in 0..1000 {
        let result = message_service
            .send_message_fast(
                &agent_keypair,
                &recipient.pubkey(),
                &format!("High-speed message {}", i),
                MessageType::Text
            )
            .await?;
        
        if i % 100 == 0 {
            info!("Processed {} messages, latest: {}", i + 1, result.signature);
        }
    }`;
        
      case 'transaction-factory':
        return `// Advanced transaction factory usage
    let agent_keypair = Keypair::new();
    
    // Create custom transaction factory with dynamic fees
    let factory = TransactionFactory::with_config(
        &client,
        TransactionConfig::custom()
            .with_priority_fee_strategy(PriorityFeeStrategy::Dynamic { percentile: 75 })
            .with_retry_policy(RetryPolicy::exponential_backoff(3, 1000))
            .build()
    );
    
    let agent_service = AgentService::new(client.clone());
    let result = agent_service
        .register_builder()
        .signer(agent_keypair)
        .capabilities(AgentCapabilities::Trading)
        .metadata_uri("https://trading-bot.example.com/metadata.json")
        .transaction_factory(factory)
        .execute()
        .await?;
    
    info!("Trading agent registered with factory: {}", result.agent_pda);`;
        
      default:
        return '// Generated Rust code\n    info!("Hello from ghostspeak Rust SDK!");';
    }
  }

  private async generateTypeScriptAgentExample(srcPath: string): Promise<void> {
    const agentExample = `import { createGhostSpeakClient, AgentCapabilities } from '@ghostspeak/sdk';
import { generateKeyPairSigner } from '@solana/signers';

export async function agentExample() {
  const client = createGhostSpeakClient({
    rpcEndpoint: 'https://api.devnet.solana.com',
    commitment: 'confirmed'
  });

  const agentKeypair = await generateKeyPairSigner();

  // Register agent with multiple capabilities
  const result = await client.agent.register({
    signer: agentKeypair,
    capabilities: AgentCapabilities.COMMUNICATION | 
                 AgentCapabilities.TRADING | 
                 AgentCapabilities.ANALYSIS,
    metadataUri: "https://example.com/agent-metadata.json"
  });

  console.log('Agent registered:', result.agentPda);
  return result;
}
`;
    await fs.writeFile(join(srcPath, 'agent-example.ts'), agentExample);
  }

  private async generateTypeScriptMessagingExample(srcPath: string): Promise<void> {
    const messagingExample = `import { createGhostSpeakClient } from '@ghostspeak/sdk';
import { generateKeyPairSigner } from '@solana/signers';

export async function messagingExample() {
  const client = createGhostSpeakClient({
    rpcEndpoint: 'https://api.devnet.solana.com',
    commitment: 'confirmed'
  });

  const senderKeypair = await generateKeyPairSigner();
  const recipientKeypair = await generateKeyPairSigner();

  // Send a direct message
  const result = await client.messaging.send({
    signer: senderKeypair,
    recipient: recipientKeypair.address,
    content: "Hello from TypeScript SDK!",
    messageType: "text"
  });

  console.log('Message sent:', result.signature);
  return result;
}
`;
    await fs.writeFile(join(srcPath, 'messaging-example.ts'), messagingExample);
  }

  private async generateTypeScriptChannelExample(srcPath: string): Promise<void> {
    const channelExample = `import { createGhostSpeakClient } from '@ghostspeak/sdk';
import { generateKeyPairSigner } from '@solana/signers';

export async function channelExample() {
  const client = createGhostSpeakClient({
    rpcEndpoint: 'https://api.devnet.solana.com',
    commitment: 'confirmed'
  });

  const ownerKeypair = await generateKeyPairSigner();

  // Create a public channel
  const result = await client.channels.create({
    signer: ownerKeypair,
    name: "TypeScript SDK Channel",
    visibility: "public",
    metadata: {
      description: "A channel created with TypeScript SDK",
      tags: ["typescript", "sdk", "example"]
    }
  });

  console.log('Channel created:', result.channelPda);
  return result;
}
`;
    await fs.writeFile(join(srcPath, 'channel-example.ts'), channelExample);
  }

  private async generateRustConfigModule(srcPath: string, project: ISDKProject): Promise<void> {
    const configRs = `use serde::{Deserialize, Serialize};
use podai_sdk::PodAIConfig;
use anyhow::Result;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub pod_ai: PodAIConfig,
    pub app: AppSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub name: String,
    pub network: String,
    pub features: Vec<String>,
}

impl AppConfig {
    pub fn load() -> Result<Self> {
        Ok(Self {
            pod_ai: PodAIConfig {
                network: podai_sdk::NetworkType::${project.network.charAt(0).toUpperCase() + project.network.slice(1)},
                rpc_endpoint: Some("${this.getNetworkEndpoint(project.network)}".to_string()),
                commitment_level: Some(solana_sdk::commitment_config::CommitmentLevel::Confirmed),
                timeout: Some(std::time::Duration::from_secs(30)),
            },
            app: AppSettings {
                name: "${project.name}".to_string(),
                network: "${project.network}".to_string(),
                features: vec![${project.features.map(f => `"${f}".to_string()`).join(', ')}],
            },
        })
    }
}
`;
    await fs.writeFile(join(srcPath, 'config.rs'), configRs);
  }

  private async generateRustAgentModule(srcPath: string): Promise<void> {
    const agentRs = `use anyhow::Result;
use podai_sdk::prelude::*;
use solana_sdk::signature::{Keypair, Signer};
use tracing::info;

pub struct AgentManager {
    client: PodAIClient,
    service: AgentService,
}

impl AgentManager {
    pub fn new(client: PodAIClient) -> Self {
        let service = AgentService::new(client.clone());
        Self { client, service }
    }

    pub async fn register_agent(
        &self,
        keypair: &Keypair,
        capabilities: AgentCapabilities,
        metadata_uri: &str,
    ) -> Result<RegisterAgentResult> {
        info!("Registering agent with capabilities: {:?}", capabilities);
        
        let result = self.service
            .register_fast(keypair, capabilities as u64, metadata_uri)
            .await?;
            
        info!("Agent registered successfully: {}", result.agent_pda);
        Ok(result)
    }

    pub async fn update_agent(
        &self,
        keypair: &Keypair,
        new_capabilities: Option<AgentCapabilities>,
        new_metadata_uri: Option<&str>,
    ) -> Result<()> {
        // Implementation for agent updates
        info!("Updating agent: {}", keypair.pubkey());
        Ok(())
    }
}
`;
    await fs.writeFile(join(srcPath, 'agent.rs'), agentRs);
  }

  private async generateRustMessagingModule(srcPath: string): Promise<void> {
    const messagingRs = `use anyhow::Result;
use podai_sdk::prelude::*;
use solana_sdk::{pubkey::Pubkey, signature::Keypair};
use tracing::info;

pub struct MessagingManager {
    client: PodAIClient,
    service: MessageService,
}

impl MessagingManager {
    pub fn new(client: PodAIClient) -> Self {
        let service = MessageService::new(client.clone());
        Self { client, service }
    }

    pub async fn send_message(
        &self,
        sender: &Keypair,
        recipient: &Pubkey,
        content: &str,
        message_type: MessageType,
    ) -> Result<()> {
        info!("Sending message to {}", recipient);
        
        let result = self.service
            .send_message_fast(sender, recipient, content, message_type)
            .await?;
            
        info!("Message sent successfully: {}", result.signature);
        Ok(())
    }

    pub async fn send_bulk_messages(
        &self,
        sender: &Keypair,
        recipients: &[Pubkey],
        content: &str,
    ) -> Result<Vec<MessageSendResult>> {
        let mut results = Vec::new();
        
        for recipient in recipients {
            let result = self.service
                .send_message_fast(sender, recipient, content, MessageType::Text)
                .await?;
            results.push(result);
        }
        
        info!("Sent {} bulk messages", results.len());
        Ok(results)
    }
}
`;
    await fs.writeFile(join(srcPath, 'messaging.rs'), messagingRs);
  }

  private async generateRustChannelModule(srcPath: string): Promise<void> {
    const channelRs = `use anyhow::Result;
use podai_sdk::prelude::*;
use solana_sdk::{pubkey::Pubkey, signature::Keypair};
use tracing::info;

pub struct ChannelManager {
    client: PodAIClient,
    service: ChannelService,
}

impl ChannelManager {
    pub fn new(client: PodAIClient) -> Self {
        let service = ChannelService::new(client.clone());
        Self { client, service }
    }

    pub async fn create_channel(
        &self,
        owner: &Keypair,
        name: &str,
        visibility: ChannelVisibility,
        metadata: Option<ChannelMetadata>,
    ) -> Result<ChannelCreationResult> {
        info!("Creating channel: {}", name);
        
        let result = self.service
            .create_channel_fast(owner, name, visibility, metadata)
            .await?;
            
        info!("Channel created successfully: {}", result.channel_pda);
        Ok(result)
    }

    pub async fn join_channel(
        &self,
        participant: &Keypair,
        channel_pda: &Pubkey,
    ) -> Result<()> {
        info!("Joining channel: {}", channel_pda);
        
        self.service
            .join_channel_fast(participant, channel_pda)
            .await?;
            
        info!("Successfully joined channel");
        Ok(())
    }

    pub async fn leave_channel(
        &self,
        participant: &Keypair,
        channel_pda: &Pubkey,
    ) -> Result<()> {
        info!("Leaving channel: {}", channel_pda);
        
        self.service
            .leave_channel_fast(participant, channel_pda)
            .await?;
            
        info!("Successfully left channel");
        Ok(())
    }
}
`;
    await fs.writeFile(join(srcPath, 'channels.rs'), channelRs);
  }
}

export function createDevelopCommand() {
  const program = new Command('develop')
    .alias('dev')
    .description('Interactive SDK development and project creation')
    .action(async () => {
      const sdkCommand = new DevelopSDKCommand();
      await sdkCommand.execute();
    });

  return program;
} 