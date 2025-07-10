/**
 * GhostSpeak Development Templates and Scaffolding System
 * 
 * Provides project templates, code scaffolding, and productivity tools
 * to accelerate GhostSpeak development across different use cases.
 */

export interface ProjectTemplate {
  /** Template ID */
  id: string;
  /** Template name */
  name: string;
  /** Template description */
  description: string;
  /** Template category */
  category: TemplateCategory;
  /** Difficulty level */
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  /** Template files */
  files: TemplateFile[];
  /** Dependencies */
  dependencies: TemplateDependency[];
  /** Setup instructions */
  setupInstructions: string[];
  /** Documentation links */
  documentation?: string[];
  /** Tags for filtering */
  tags: string[];
  /** Template author */
  author?: string;
  /** Template version */
  version: string;
  /** Minimum SDK version required */
  minSdkVersion?: string;
}

export type TemplateCategory = 
  | 'agent'
  | 'service'
  | 'marketplace'
  | 'defi'
  | 'gaming'
  | 'nft'
  | 'dao'
  | 'integration'
  | 'example'
  | 'starter';

export interface TemplateFile {
  /** File path relative to project root */
  path: string;
  /** File content (can include placeholders) */
  content: string;
  /** File type */
  type: 'typescript' | 'javascript' | 'rust' | 'json' | 'toml' | 'markdown' | 'yaml' | 'html' | 'css';
  /** Whether file is executable */
  executable?: boolean;
  /** File encoding */
  encoding?: 'utf8' | 'binary';
}

export interface TemplateDependency {
  /** Package name */
  name: string;
  /** Version or version range */
  version: string;
  /** Dependency type */
  type: 'dependency' | 'devDependency' | 'peerDependency';
  /** Package manager */
  manager: 'npm' | 'yarn' | 'pnpm' | 'bun' | 'cargo';
  /** Optional dependency */
  optional?: boolean;
}

export interface TemplateOptions {
  /** Project name */
  projectName: string;
  /** Project description */
  projectDescription?: string;
  /** Author name */
  authorName?: string;
  /** Author email */
  authorEmail?: string;
  /** License type */
  license?: string;
  /** Solana network */
  network?: 'devnet' | 'testnet' | 'mainnet-beta';
  /** Programming language */
  language?: 'typescript' | 'javascript' | 'rust';
  /** Include tests */
  includeTests?: boolean;
  /** Include documentation */
  includeDocs?: boolean;
  /** Custom variables */
  variables?: Record<string, string>;
}

export interface ScaffoldedProject {
  /** Project name */
  name: string;
  /** Project path */
  path: string;
  /** Generated files */
  files: GeneratedFile[];
  /** Next steps */
  nextSteps: string[];
  /** Development commands */
  commands: ProjectCommand[];
}

export interface GeneratedFile {
  /** File path */
  path: string;
  /** File content */
  content: string;
  /** File was created */
  created: boolean;
  /** File was modified */
  modified: boolean;
}

export interface ProjectCommand {
  /** Command name */
  name: string;
  /** Command description */
  description: string;
  /** Command to run */
  command: string;
  /** Working directory */
  cwd?: string;
}

class TemplateManager {
  private templates: Map<string, ProjectTemplate> = new Map();

  constructor() {
    this.loadBuiltInTemplates();
  }

  /**
   * Get all available templates
   */
  getTemplates(filters?: {
    category?: TemplateCategory;
    difficulty?: string;
    tags?: string[];
  }): ProjectTemplate[] {
    let templates = Array.from(this.templates.values());

    if (filters) {
      if (filters.category) {
        templates = templates.filter(t => t.category === filters.category);
      }
      if (filters.difficulty) {
        templates = templates.filter(t => t.difficulty === filters.difficulty);
      }
      if (filters.tags && filters.tags.length > 0) {
        templates = templates.filter(t => 
          filters.tags!.some(tag => t.tags.includes(tag))
        );
      }
    }

    return templates;
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): ProjectTemplate | null {
    return this.templates.get(id) || null;
  }

  /**
   * Register a custom template
   */
  registerTemplate(template: ProjectTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Scaffold a new project from template
   */
  async scaffoldProject(
    templateId: string,
    outputPath: string,
    options: TemplateOptions
  ): Promise<ScaffoldedProject> {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const generatedFiles: GeneratedFile[] = [];
    const commands: ProjectCommand[] = [];

    // Process template files
    for (const file of template.files) {
      const processedContent = this.processTemplate(file.content, options);
      const filePath = this.processTemplate(file.path, options);
      const fullPath = `${outputPath}/${filePath}`;

      generatedFiles.push({
        path: fullPath,
        content: processedContent,
        created: true,
        modified: false
      });
    }

    // Generate package.json for JavaScript/TypeScript projects
    if (template.dependencies.some(dep => dep.manager === 'npm' || dep.manager === 'yarn' || dep.manager === 'pnpm' || dep.manager === 'bun')) {
      const packageJson = this.generatePackageJson(template, options);
      generatedFiles.push({
        path: `${outputPath}/package.json`,
        content: JSON.stringify(packageJson, null, 2),
        created: true,
        modified: false
      });
    }

    // Generate Cargo.toml for Rust projects
    if (template.dependencies.some(dep => dep.manager === 'cargo')) {
      const cargoToml = this.generateCargoToml(template, options);
      generatedFiles.push({
        path: `${outputPath}/Cargo.toml`,
        content: cargoToml,
        created: true,
        modified: false
      });
    }

    // Generate development commands
    commands.push(
      {
        name: 'install',
        description: 'Install dependencies',
        command: this.getInstallCommand(template)
      },
      {
        name: 'build',
        description: 'Build the project',
        command: this.getBuildCommand(template)
      },
      {
        name: 'test',
        description: 'Run tests',
        command: this.getTestCommand(template)
      },
      {
        name: 'dev',
        description: 'Start development server',
        command: this.getDevCommand(template)
      }
    );

    // Generate setup instructions
    const nextSteps = [
      `Navigate to the project: cd ${options.projectName}`,
      ...template.setupInstructions.map(instruction => 
        this.processTemplate(instruction, options)
      ),
      'Run the install command to get started',
      'Check the README for additional setup steps'
    ];

    return {
      name: options.projectName,
      path: outputPath,
      files: generatedFiles,
      nextSteps,
      commands
    };
  }

  /**
   * Create a custom template from existing project
   */
  async createTemplateFromProject(
    projectPath: string,
    templateInfo: Pick<ProjectTemplate, 'id' | 'name' | 'description' | 'category' | 'difficulty' | 'tags'>
  ): Promise<ProjectTemplate> {
    // This would scan the project directory and create a template
    // Implementation would involve file system operations
    
    const template: ProjectTemplate = {
      ...templateInfo,
      files: [], // Would be populated from project scan
      dependencies: [], // Would be detected from package.json/Cargo.toml
      setupInstructions: [],
      version: '1.0.0',
      author: 'Custom'
    };

    this.registerTemplate(template);
    return template;
  }

  private loadBuiltInTemplates(): void {
    // Basic Agent Template
    this.templates.set('basic-agent', {
      id: 'basic-agent',
      name: 'Basic Agent',
      description: 'A simple GhostSpeak agent with messaging capabilities',
      category: 'agent',
      difficulty: 'beginner',
      version: '1.0.0',
      tags: ['agent', 'messaging', 'beginner'],
      files: [
        {
          path: 'src/agent.ts',
          type: 'typescript',
          content: `import { GhostSpeakClient, AgentService, MessageService } from '@ghostspeak/sdk';

export class {{projectName}}Agent {
  private client: GhostSpeakClient;
  private agentService: AgentService;
  private messageService: MessageService;

  constructor(client: GhostSpeakClient) {
    this.client = client;
    this.agentService = new AgentService(client);
    this.messageService = new MessageService(client);
  }

  async start(): Promise<void> {
    console.log('Starting {{projectName}} agent...');
    
    // Register agent
    const agent = await this.agentService.createAgent({
      name: '{{projectName}}',
      description: '{{projectDescription}}',
      type: 'basic'
    });

    // Listen for messages
    this.messageService.onMessage(agent.id, this.handleMessage.bind(this));
    
    console.log('Agent started successfully!');
  }

  private async handleMessage(message: any): Promise<void> {
    console.log('Received message:', message);
    
    // Echo back the message
    await this.messageService.sendMessage({
      recipient: message.sender,
      content: \`Echo: \${message.content}\`,
      type: 'text'
    });
  }
}`
        },
        {
          path: 'src/index.ts',
          type: 'typescript',
          content: `import { GhostSpeakClient } from '@ghostspeak/sdk';
import { {{projectName}}Agent } from './agent';

async function main() {
  const client = new GhostSpeakClient({
    network: '{{network}}',
    // Add your wallet configuration here
  });

  const agent = new {{projectName}}Agent(client);
  await agent.start();
}

main().catch(console.error);`
        },
        {
          path: 'README.md',
          type: 'markdown',
          content: `# {{projectName}}

{{projectDescription}}

## Setup

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Configure your Solana wallet

3. Start the agent:
   \`\`\`bash
   npm start
   \`\`\`

## Features

- Basic message handling
- Echo responses
- Agent registration

## Development

- \`npm run dev\` - Start in development mode
- \`npm run build\` - Build the project
- \`npm test\` - Run tests

## License

{{license}}`
        }
      ],
      dependencies: [
        { name: '@ghostspeak/sdk', version: '^1.0.0', type: 'dependency', manager: 'npm' },
        { name: 'typescript', version: '^5.0.0', type: 'devDependency', manager: 'npm' },
        { name: '@types/node', version: '^20.0.0', type: 'devDependency', manager: 'npm' },
        { name: 'ts-node', version: '^10.0.0', type: 'devDependency', manager: 'npm' }
      ],
      setupInstructions: [
        'Configure your Solana wallet in the client initialization',
        'Update the agent name and description',
        'Run npm install to install dependencies',
        'Run npm start to launch your agent'
      ]
    });

    // Marketplace Service Template
    this.templates.set('marketplace-service', {
      id: 'marketplace-service',
      name: 'Marketplace Service',
      description: 'An agent that offers services in the GhostSpeak marketplace',
      category: 'service',
      difficulty: 'intermediate',
      version: '1.0.0',
      tags: ['marketplace', 'service', 'escrow'],
      files: [
        {
          path: 'src/service-agent.ts',
          type: 'typescript',
          content: `import { 
  GhostSpeakClient, 
  AgentService, 
  MarketplaceService, 
  EscrowService,
  MessageService 
} from '@ghostspeak/sdk';

export class {{projectName}}ServiceAgent {
  private client: GhostSpeakClient;
  private agentService: AgentService;
  private marketplaceService: MarketplaceService;
  private escrowService: EscrowService;
  private messageService: MessageService;
  private agentId?: string;

  constructor(client: GhostSpeakClient) {
    this.client = client;
    this.agentService = new AgentService(client);
    this.marketplaceService = new MarketplaceService(client);
    this.escrowService = new EscrowService(client);
    this.messageService = new MessageService(client);
  }

  async start(): Promise<void> {
    console.log('Starting {{projectName}} service agent...');
    
    // Register agent
    const agent = await this.agentService.createAgent({
      name: '{{projectName}}',
      description: '{{projectDescription}}',
      type: 'service-provider',
      capabilities: ['service-offering', 'payment-processing']
    });

    this.agentId = agent.id;

    // Register service in marketplace
    await this.marketplaceService.createService({
      name: '{{projectName}} Service',
      description: 'Professional {{projectName}} service',
      category: 'general',
      price: 1000000, // 0.001 SOL in lamports
      providerId: agent.id
    });

    // Listen for service requests
    this.messageService.onMessage(agent.id, this.handleServiceRequest.bind(this));
    
    console.log('Service agent started successfully!');
  }

  private async handleServiceRequest(message: any): Promise<void> {
    if (message.type === 'service_request') {
      console.log('Received service request:', message);
      
      // Create escrow for payment
      const escrow = await this.escrowService.createEscrow({
        seller: this.agentId!,
        amount: message.data.amount,
        serviceDescription: message.data.description
      });

      // Send response with escrow details
      await this.messageService.sendMessage({
        recipient: message.sender,
        content: 'Service request received. Please fund escrow to proceed.',
        type: 'service_response',
        data: { escrowId: escrow.id }
      });
    }
  }

  private async processService(serviceData: any): Promise<any> {
    // Implement your service logic here
    console.log('Processing service:', serviceData);
    
    // Simulate service processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      result: 'Service completed successfully',
      timestamp: Date.now(),
      data: serviceData
    };
  }
}`
        }
      ],
      dependencies: [
        { name: '@ghostspeak/sdk', version: '^1.0.0', type: 'dependency', manager: 'npm' },
        { name: 'typescript', version: '^5.0.0', type: 'devDependency', manager: 'npm' },
        { name: '@types/node', version: '^20.0.0', type: 'devDependency', manager: 'npm' }
      ],
      setupInstructions: [
        'Configure your service pricing and description',
        'Implement your service logic in the processService method',
        'Test with the GhostSpeak marketplace'
      ]
    });

    // Smart Contract Template
    this.templates.set('smart-contract', {
      id: 'smart-contract',
      name: 'Smart Contract',
      description: 'Anchor smart contract for custom GhostSpeak functionality',
      category: 'agent',
      difficulty: 'advanced',
      version: '1.0.0',
      tags: ['smart-contract', 'anchor', 'solana'],
      files: [
        {
          path: 'programs/{{projectName}}/src/lib.rs',
          type: 'rust',
          content: `use anchor_lang::prelude::*;

declare_id!("{{programId}}");

#[program]
pub mod {{projectName}} {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let agent = &mut ctx.accounts.agent;
        agent.authority = ctx.accounts.authority.key();
        agent.created_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn process_message(ctx: Context<ProcessMessage>, content: String) -> Result<()> {
        msg!("Processing message: {}", content);
        // Add your message processing logic here
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = 8 + 32 + 8)]
    pub agent: Account<'info, Agent>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ProcessMessage<'info> {
    #[account(mut)]
    pub agent: Account<'info, Agent>,
    pub authority: Signer<'info>,
}

#[account]
pub struct Agent {
    pub authority: Pubkey,
    pub created_at: i64,
}`
        },
        {
          path: 'Anchor.toml',
          type: 'toml',
          content: `[features]
seeds = false
skip-lint = false

[programs.localnet]
{{projectName}} = "{{programId}}"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "{{network}}"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"`
        }
      ],
      dependencies: [
        { name: 'anchor-lang', version: '0.28.0', type: 'dependency', manager: 'cargo' }
      ],
      setupInstructions: [
        'Install Anchor CLI: npm install -g @coral-xyz/anchor-cli',
        'Build the program: anchor build',
        'Deploy to devnet: anchor deploy',
        'Run tests: anchor test'
      ]
    });
  }

  private processTemplate(content: string, options: TemplateOptions): string {
    let processed = content;

    // Replace common placeholders
    processed = processed.replace(/\{\{projectName\}\}/g, options.projectName);
    processed = processed.replace(/\{\{projectDescription\}\}/g, options.projectDescription || '');
    processed = processed.replace(/\{\{authorName\}\}/g, options.authorName || '');
    processed = processed.replace(/\{\{authorEmail\}\}/g, options.authorEmail || '');
    processed = processed.replace(/\{\{license\}\}/g, options.license || 'MIT');
    processed = processed.replace(/\{\{network\}\}/g, options.network || 'devnet');

    // Replace custom variables
    if (options.variables) {
      Object.entries(options.variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        processed = processed.replace(regex, value);
      });
    }

    return processed;
  }

  private generatePackageJson(template: ProjectTemplate, options: TemplateOptions): any {
    const deps = template.dependencies.filter(d => d.type === 'dependency' && d.manager === 'npm');
    const devDeps = template.dependencies.filter(d => d.type === 'devDependency' && d.manager === 'npm');

    return {
      name: options.projectName,
      version: '1.0.0',
      description: options.projectDescription || '',
      main: 'dist/index.js',
      scripts: {
        start: 'node dist/index.js',
        dev: 'ts-node src/index.ts',
        build: 'tsc',
        test: 'jest'
      },
      dependencies: Object.fromEntries(deps.map(d => [d.name, d.version])),
      devDependencies: Object.fromEntries(devDeps.map(d => [d.name, d.version])),
      author: options.authorName || '',
      license: options.license || 'MIT'
    };
  }

  private generateCargoToml(template: ProjectTemplate, options: TemplateOptions): string {
    return `[package]
name = "${options.projectName}"
version = "0.1.0"
description = "${options.projectDescription || ''}"
edition = "2021"

[dependencies]
${template.dependencies
  .filter(d => d.manager === 'cargo')
  .map(d => `${d.name} = "${d.version}"`)
  .join('\n')}`;
  }

  private getInstallCommand(template: ProjectTemplate): string {
    if (template.dependencies.some(d => d.manager === 'bun')) return 'bun install';
    if (template.dependencies.some(d => d.manager === 'pnpm')) return 'pnpm install';
    if (template.dependencies.some(d => d.manager === 'yarn')) return 'yarn install';
    if (template.dependencies.some(d => d.manager === 'cargo')) return 'cargo build';
    return 'npm install';
  }

  private getBuildCommand(template: ProjectTemplate): string {
    if (template.category === 'agent' && template.files.some(f => f.path.includes('.rs'))) {
      return 'anchor build';
    }
    if (template.dependencies.some(d => d.manager === 'cargo')) return 'cargo build --release';
    return 'npm run build';
  }

  private getTestCommand(template: ProjectTemplate): string {
    if (template.files.some(f => f.path.includes('.rs'))) return 'anchor test';
    if (template.dependencies.some(d => d.manager === 'cargo')) return 'cargo test';
    return 'npm test';
  }

  private getDevCommand(template: ProjectTemplate): string {
    return 'npm run dev';
  }
}

/**
 * Create a template manager instance
 */
export function createTemplateManager(): TemplateManager {
  return new TemplateManager();
}

export { TemplateManager };