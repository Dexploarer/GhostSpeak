/**
 * GhostSpeak Protocol Code Generators
 * 
 * Provides automated code generation for agents, services, smart contracts,
 * and client-side integration code to accelerate development.
 */

export interface CodeGeneratorConfig {
  /** Output directory for generated files */
  outputDir: string;
  /** Programming language target */
  language: 'typescript' | 'javascript' | 'rust';
  /** Include type definitions */
  includeTypes: boolean;
  /** Include test files */
  includeTests: boolean;
  /** Include documentation */
  includeDocs: boolean;
  /** Code style preferences */
  codeStyle: CodeStyle;
}

export interface CodeStyle {
  /** Indentation type */
  indentation: 'spaces' | 'tabs';
  /** Number of spaces for indentation */
  indentSize: number;
  /** Line ending style */
  lineEnding: 'lf' | 'crlf';
  /** Include semicolons in TypeScript/JavaScript */
  semicolons: boolean;
  /** Quote style */
  quotes: 'single' | 'double';
  /** Trailing commas */
  trailingCommas: boolean;
}

export interface AgentTemplate {
  /** Agent name */
  name: string;
  /** Agent type */
  type: 'basic' | 'service-provider' | 'chat-bot' | 'data-processor' | 'custom';
  /** Capabilities */
  capabilities: AgentCapability[];
  /** Custom functions */
  customFunctions?: FunctionDefinition[];
  /** State schema */
  stateSchema?: StateField[];
}

export interface AgentCapability {
  name: string;
  type: 'messaging' | 'service-offering' | 'payment-processing' | 'data-analysis' | 'custom';
  config?: any;
}

export interface FunctionDefinition {
  name: string;
  parameters: Parameter[];
  returnType: string;
  description?: string;
  implementation?: string;
}

export interface Parameter {
  name: string;
  type: string;
  optional?: boolean;
  description?: string;
}

export interface StateField {
  name: string;
  type: string;
  optional?: boolean;
  description?: string;
}

export interface ServiceTemplate {
  /** Service name */
  name: string;
  /** Service category */
  category: string;
  /** Service description */
  description: string;
  /** Input schema */
  inputSchema: StateField[];
  /** Output schema */
  outputSchema: StateField[];
  /** Pricing model */
  pricingModel: 'fixed' | 'dynamic' | 'subscription';
  /** Service methods */
  methods: FunctionDefinition[];
}

class CodeGenerator {
  private config: CodeGeneratorConfig;

  constructor(config: CodeGeneratorConfig) {
    this.config = config;
  }

  /**
   * Generate complete agent implementation
   */
  async generateAgent(template: AgentTemplate): Promise<GeneratedCode> {
    const files: GeneratedFile[] = [];

    switch (this.config.language) {
      case 'typescript':
        files.push(...await this.generateTypeScriptAgent(template));
        break;
      case 'javascript':
        files.push(...await this.generateJavaScriptAgent(template));
        break;
      case 'rust':
        files.push(...await this.generateRustAgent(template));
        break;
    }

    if (this.config.includeTests) {
      files.push(...await this.generateAgentTests(template));
    }

    if (this.config.includeDocs) {
      files.push(...await this.generateAgentDocs(template));
    }

    return {
      files,
      instructions: this.generateSetupInstructions(template)
    };
  }

  /**
   * Generate service implementation
   */
  async generateService(template: ServiceTemplate): Promise<GeneratedCode> {
    const files: GeneratedFile[] = [];

    switch (this.config.language) {
      case 'typescript':
        files.push(...await this.generateTypeScriptService(template));
        break;
      case 'javascript':
        files.push(...await this.generateJavaScriptService(template));
        break;
      case 'rust':
        files.push(...await this.generateRustService(template));
        break;
    }

    if (this.config.includeTests) {
      files.push(...await this.generateServiceTests(template));
    }

    if (this.config.includeDocs) {
      files.push(...await this.generateServiceDocs(template));
    }

    return {
      files,
      instructions: this.generateServiceInstructions(template)
    };
  }

  /**
   * Generate smart contract from agent template
   */
  async generateSmartContract(template: AgentTemplate): Promise<GeneratedCode> {
    const files: GeneratedFile[] = [];

    // Generate Rust smart contract
    files.push(await this.generateAnchorProgram(template));
    files.push(await this.generateCargoToml(template));

    if (this.config.includeTests) {
      files.push(await this.generateContractTests(template));
    }

    return {
      files,
      instructions: this.generateContractInstructions(template)
    };
  }

  /**
   * Generate client integration code
   */
  async generateClient(agentTemplate: AgentTemplate): Promise<GeneratedCode> {
    const files: GeneratedFile[] = [];

    // Generate client wrapper
    files.push(await this.generateClientWrapper(agentTemplate));
    
    // Generate type definitions
    if (this.config.includeTypes) {
      files.push(await this.generateTypeDefinitions(agentTemplate));
    }

    // Generate example usage
    files.push(await this.generateUsageExamples(agentTemplate));

    return {
      files,
      instructions: this.generateClientInstructions(agentTemplate)
    };
  }

  private async generateTypeScriptAgent(template: AgentTemplate): Promise<GeneratedFile[]> {
    const agentClass = this.generateAgentClass(template);
    const stateInterface = this.generateStateInterface(template);
    const capabilityImplementations = this.generateCapabilityImplementations(template);

    const content = `/**
 * Generated GhostSpeak Agent: ${template.name}
 * Type: ${template.type}
 * Generated on: ${new Date().toISOString()}
 */

import {
  GhostSpeakClient,
  AgentService,
  MessageService,
  EscrowService,
  MarketplaceService,
  Message,
  Agent
} from '@ghostspeak/sdk';

${stateInterface}

export class ${this.toPascalCase(template.name)}Agent {
  private client: GhostSpeakClient;
  private agentService: AgentService;
  private messageService: MessageService;
  private agentId: string;
  private state: ${this.toPascalCase(template.name)}State;

  constructor(client: GhostSpeakClient, agentId: string) {
    this.client = client;
    this.agentService = new AgentService(client);
    this.messageService = new MessageService(client);
    this.agentId = agentId;
    this.state = this.initializeState();
  }

  /**
   * Initialize agent state
   */
  private initializeState(): ${this.toPascalCase(template.name)}State {
    return {
${template.stateSchema?.map(field => 
  `      ${field.name}: ${this.getDefaultValue(field.type)},`
).join('\n') || '      // No state fields defined'}
    };
  }

  /**
   * Start the agent
   */
  async start(): Promise<void> {
    console.log(\`Starting \${this.constructor.name}...\`);
    
    // Set up message listener
    this.messageService.onMessage(this.agentId, this.handleMessage.bind(this));
    
    // Initialize capabilities
${template.capabilities.map(cap => 
  `    await this.initialize${this.toPascalCase(cap.name)}();`
).join('\n')}
    
    console.log(\`\${this.constructor.name} started successfully\`);
  }

  /**
   * Handle incoming messages
   */
  private async handleMessage(message: Message): Promise<void> {
    try {
      console.log('Received message:', message);
      
      switch (message.type) {
${this.generateMessageHandlers(template)}
        default:
          await this.handleUnknownMessage(message);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

${capabilityImplementations}

${template.customFunctions?.map(func => this.generateFunction(func)).join('\n\n') || ''}

  /**
   * Handle unknown message types
   */
  private async handleUnknownMessage(message: Message): Promise<void> {
    console.warn('Unknown message type:', message.type);
    // Optionally send error response
  }

  /**
   * Update agent state
   */
  private updateState(updates: Partial<${this.toPascalCase(template.name)}State>): void {
    this.state = { ...this.state, ...updates };
  }

  /**
   * Get current state
   */
  public getState(): ${this.toPascalCase(template.name)}State {
    return { ...this.state };
  }
}`;

    return [{
      path: `${template.name}-agent.ts`,
      content,
      type: 'typescript'
    }];
  }

  private async generateJavaScriptAgent(template: AgentTemplate): Promise<GeneratedFile[]> {
    // Similar to TypeScript but without type annotations
    const content = `/**
 * Generated GhostSpeak Agent: ${template.name}
 * Type: ${template.type}
 * Generated on: ${new Date().toISOString()}
 */

const {
  GhostSpeakClient,
  AgentService,
  MessageService,
  EscrowService,
  MarketplaceService
} = require('@ghostspeak/sdk');

class ${this.toPascalCase(template.name)}Agent {
  constructor(client, agentId) {
    this.client = client;
    this.agentService = new AgentService(client);
    this.messageService = new MessageService(client);
    this.agentId = agentId;
    this.state = this.initializeState();
  }

  initializeState() {
    return {
${template.stateSchema?.map(field => 
  `      ${field.name}: ${this.getDefaultValue(field.type)},`
).join('\n') || '      // No state fields defined'}
    };
  }

  async start() {
    console.log(\`Starting \${this.constructor.name}...\`);
    
    this.messageService.onMessage(this.agentId, this.handleMessage.bind(this));
    
${template.capabilities.map(cap => 
  `    await this.initialize${this.toPascalCase(cap.name)}();`
).join('\n')}
    
    console.log(\`\${this.constructor.name} started successfully\`);
  }

  async handleMessage(message) {
    try {
      console.log('Received message:', message);
      
      switch (message.type) {
${this.generateMessageHandlers(template)}
        default:
          await this.handleUnknownMessage(message);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  // Additional methods would be generated here
}

module.exports = { ${this.toPascalCase(template.name)}Agent };`;

    return [{
      path: `${template.name}-agent.js`,
      content,
      type: 'javascript'
    }];
  }

  private async generateRustAgent(template: AgentTemplate): Promise<GeneratedFile[]> {
    const content = `//! Generated GhostSpeak Agent: ${template.name}
//! Type: ${template.type}
//! Generated on: ${new Date().toISOString()}

use ghostspeak_sdk::{
    GhostSpeakClient,
    AgentService,
    MessageService,
    Message,
    Result,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ${this.toPascalCase(template.name)}State {
${template.stateSchema?.map(field => 
  `    pub ${field.name}: ${this.rustType(field.type)},`
).join('\n') || '    // No state fields defined'}
}

impl Default for ${this.toPascalCase(template.name)}State {
    fn default() -> Self {
        Self {
${template.stateSchema?.map(field => 
  `            ${field.name}: ${this.rustDefaultValue(field.type)},`
).join('\n') || '            // No state fields defined'}
        }
    }
}

pub struct ${this.toPascalCase(template.name)}Agent {
    client: GhostSpeakClient,
    agent_service: AgentService,
    message_service: MessageService,
    agent_id: String,
    state: ${this.toPascalCase(template.name)}State,
}

impl ${this.toPascalCase(template.name)}Agent {
    pub fn new(client: GhostSpeakClient, agent_id: String) -> Self {
        let agent_service = AgentService::new(&client);
        let message_service = MessageService::new(&client);
        
        Self {
            client,
            agent_service,
            message_service,
            agent_id,
            state: ${this.toPascalCase(template.name)}State::default(),
        }
    }

    pub async fn start(&mut self) -> Result<()> {
        println!("Starting {}...", std::any::type_name::<Self>());
        
        // Set up message listener
        self.message_service.on_message(&self.agent_id, |message| {
            self.handle_message(message)
        }).await?;
        
        // Initialize capabilities
${template.capabilities.map(cap => 
  `        self.initialize_${this.toSnakeCase(cap.name)}().await?;`
).join('\n')}
        
        println!("{} started successfully", std::any::type_name::<Self>());
        Ok(())
    }

    async fn handle_message(&mut self, message: Message) -> Result<()> {
        println!("Received message: {:?}", message);
        
        match message.message_type.as_str() {
${this.generateRustMessageHandlers(template)}
            _ => self.handle_unknown_message(message).await,
        }
    }

    async fn handle_unknown_message(&self, message: Message) -> Result<()> {
        println!("Unknown message type: {}", message.message_type);
        Ok(())
    }

    pub fn get_state(&self) -> &${this.toPascalCase(template.name)}State {
        &self.state
    }

    fn update_state(&mut self, updates: ${this.toPascalCase(template.name)}State) {
        self.state = updates;
    }
}`;

    return [{
      path: `${this.toSnakeCase(template.name)}_agent.rs`,
      content,
      type: 'rust'
    }];
  }

  private generateStateInterface(template: AgentTemplate): string {
    if (!template.stateSchema || template.stateSchema.length === 0) {
      return `interface ${this.toPascalCase(template.name)}State {
  // No state fields defined
}`;
    }

    return `interface ${this.toPascalCase(template.name)}State {
${template.stateSchema.map(field => 
  `  ${field.name}${field.optional ? '?' : ''}: ${field.type}; ${field.description ? `// ${field.description}` : ''}`
).join('\n')}
}`;
  }

  private generateCapabilityImplementations(template: AgentTemplate): string {
    return template.capabilities.map(capability => {
      switch (capability.type) {
        case 'messaging':
          return this.generateMessagingCapability(capability);
        case 'service-offering':
          return this.generateServiceOfferingCapability(capability);
        case 'payment-processing':
          return this.generatePaymentProcessingCapability(capability);
        case 'data-analysis':
          return this.generateDataAnalysisCapability(capability);
        default:
          return this.generateCustomCapability(capability);
      }
    }).join('\n\n');
  }

  private generateMessagingCapability(capability: AgentCapability): string {
    return `  /**
   * Initialize ${capability.name} capability
   */
  private async initialize${this.toPascalCase(capability.name)}(): Promise<void> {
    console.log('Initializing messaging capability...');
    // Set up message handling logic
  }

  /**
   * Send a message
   */
  async sendMessage(recipient: string, content: string, type: string = 'text'): Promise<void> {
    await this.messageService.sendMessage({
      recipient,
      content,
      messageType: type,
      sender: this.agentId
    });
  }`;
  }

  private generateServiceOfferingCapability(capability: AgentCapability): string {
    return `  /**
   * Initialize ${capability.name} capability
   */
  private async initialize${this.toPascalCase(capability.name)}(): Promise<void> {
    console.log('Initializing service offering capability...');
    const marketplaceService = new MarketplaceService(this.client);
    // Register services in marketplace
  }

  /**
   * Offer a service
   */
  async offerService(service: ServiceOffering): Promise<void> {
    const marketplaceService = new MarketplaceService(this.client);
    await marketplaceService.createService({
      ...service,
      providerId: this.agentId
    });
  }`;
  }

  private generatePaymentProcessingCapability(capability: AgentCapability): string {
    return `  /**
   * Initialize ${capability.name} capability
   */
  private async initialize${this.toPascalCase(capability.name)}(): Promise<void> {
    console.log('Initializing payment processing capability...');
    const escrowService = new EscrowService(this.client);
    // Set up payment handling
  }

  /**
   * Process a payment
   */
  async processPayment(amount: number, recipient: string): Promise<string> {
    const escrowService = new EscrowService(this.client);
    const escrow = await escrowService.createEscrow({
      seller: recipient,
      amount,
      serviceDescription: 'Service payment'
    });
    return escrow.id;
  }`;
  }

  private generateDataAnalysisCapability(capability: AgentCapability): string {
    return `  /**
   * Initialize ${capability.name} capability
   */
  private async initialize${this.toPascalCase(capability.name)}(): Promise<void> {
    console.log('Initializing data analysis capability...');
    // Set up data processing pipelines
  }

  /**
   * Analyze data
   */
  async analyzeData(data: any): Promise<any> {
    // Implement data analysis logic
    console.log('Analyzing data:', data);
    return {
      summary: 'Analysis complete',
      insights: [],
      confidence: 0.95
    };
  }`;
  }

  private generateCustomCapability(capability: AgentCapability): string {
    return `  /**
   * Initialize ${capability.name} capability
   */
  private async initialize${this.toPascalCase(capability.name)}(): Promise<void> {
    console.log('Initializing ${capability.name} capability...');
    // Implement custom capability initialization
  }`;
  }

  private generateMessageHandlers(template: AgentTemplate): string {
    const handlers = [
      '        case "text":',
      '          await this.handleTextMessage(message);',
      '          break;',
      '        case "service_request":',
      '          await this.handleServiceRequest(message);',
      '          break;',
      '        case "payment":',
      '          await this.handlePayment(message);',
      '          break;'
    ];

    return handlers.join('\n');
  }

  private generateRustMessageHandlers(template: AgentTemplate): string {
    const handlers = [
      '            "text" => self.handle_text_message(message).await,',
      '            "service_request" => self.handle_service_request(message).await,',
      '            "payment" => self.handle_payment(message).await,'
    ];

    return handlers.join('\n');
  }

  private generateFunction(func: FunctionDefinition): string {
    const params = func.parameters.map(p => 
      `${p.name}${p.optional ? '?' : ''}: ${p.type}`
    ).join(', ');

    return `  /**
   * ${func.description || func.name}
   */
  ${func.implementation ? 'private ' : ''}async ${func.name}(${params}): Promise<${func.returnType}> {
${func.implementation || '    // Implement function logic here\n    throw new Error("Not implemented");'}
  }`;
  }

  private async generateAnchorProgram(template: AgentTemplate): Promise<GeneratedFile> {
    const content = `//! Generated Anchor Program for ${template.name}
//! Generated on: ${new Date().toISOString()}

use anchor_lang::prelude::*;

declare_id!("${this.generateProgramId()}");

#[program]
pub mod ${this.toSnakeCase(template.name)}_agent {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, agent_id: String) -> Result<()> {
        let agent = &mut ctx.accounts.agent;
        agent.agent_id = agent_id;
        agent.owner = ctx.accounts.authority.key();
        agent.created_at = Clock::get()?.unix_timestamp;
        agent.is_active = true;
        Ok(())
    }

    pub fn process_message(ctx: Context<ProcessMessage>, content: String, message_type: String) -> Result<()> {
        let agent = &mut ctx.accounts.agent;
        require!(agent.is_active, ErrorCode::AgentNotActive);
        
        // Process message based on type
        match message_type.as_str() {
            "text" => {
                // Handle text message
                msg!("Processing text message: {}", content);
            },
            "service_request" => {
                // Handle service request
                msg!("Processing service request: {}", content);
            },
            _ => {
                return Err(ErrorCode::UnsupportedMessageType.into());
            }
        }
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = 8 + 64 + 32 + 8 + 1)]
    pub agent: Account<'info, AgentAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ProcessMessage<'info> {
    #[account(mut)]
    pub agent: Account<'info, AgentAccount>,
    pub authority: Signer<'info>,
}

#[account]
pub struct AgentAccount {
    pub agent_id: String,
    pub owner: Pubkey,
    pub created_at: i64,
    pub is_active: bool,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Agent is not active")]
    AgentNotActive,
    #[msg("Unsupported message type")]
    UnsupportedMessageType,
}`;

    return {
      path: 'programs/agent/src/lib.rs',
      content,
      type: 'rust'
    };
  }

  private async generateCargoToml(template: AgentTemplate): Promise<GeneratedFile> {
    const content = `[package]
name = "${this.toKebabCase(template.name)}-agent"
version = "0.1.0"
description = "Generated GhostSpeak Agent: ${template.name}"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]
name = "${this.toSnakeCase(template.name)}_agent"

[features]
no-entrypoint = []
no-idl = []
no-log-ix-name = []
cpi = ["no-entrypoint"]
default = []

[dependencies]
anchor-lang = "0.28.0"
anchor-spl = "0.28.0"
solana-program = "~1.16.0"`;

    return {
      path: 'programs/agent/Cargo.toml',
      content,
      type: 'toml'
    };
  }

  // Helper methods
  private toPascalCase(str: string): string {
    return str.replace(/(?:^|[-_])(\w)/g, (_, char) => char.toUpperCase());
  }

  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
  }

  private toKebabCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`).replace(/^-/, '');
  }

  private getDefaultValue(type: string): string {
    switch (type) {
      case 'string': return "''";
      case 'number': return '0';
      case 'boolean': return 'false';
      case 'array': return '[]';
      case 'object': return '{}';
      default: return 'null';
    }
  }

  private rustType(type: string): string {
    switch (type) {
      case 'string': return 'String';
      case 'number': return 'i64';
      case 'boolean': return 'bool';
      case 'array': return 'Vec<String>'; // Simplified
      default: return 'String';
    }
  }

  private rustDefaultValue(type: string): string {
    switch (type) {
      case 'string': return 'String::new()';
      case 'number': return '0';
      case 'boolean': return 'false';
      case 'array': return 'Vec::new()';
      default: return 'String::new()';
    }
  }

  private generateProgramId(): string {
    // Generate a random program ID for demonstration
    // In real implementation, this would be deterministic
    return '11111111111111111111111111111112';
  }

  // Placeholder methods for other generators
  private async generateAgentTests(template: AgentTemplate): Promise<GeneratedFile[]> {
    return [];
  }

  private async generateAgentDocs(template: AgentTemplate): Promise<GeneratedFile[]> {
    return [];
  }

  private generateSetupInstructions(template: AgentTemplate): string[] {
    return [
      'Run `npm install` to install dependencies',
      'Configure your Solana wallet',
      'Deploy the smart contract using `anchor deploy`',
      'Start the agent using the generated start script'
    ];
  }

  private async generateTypeScriptService(template: ServiceTemplate): Promise<GeneratedFile[]> {
    return [];
  }

  private async generateJavaScriptService(template: ServiceTemplate): Promise<GeneratedFile[]> {
    return [];
  }

  private async generateRustService(template: ServiceTemplate): Promise<GeneratedFile[]> {
    return [];
  }

  private async generateServiceTests(template: ServiceTemplate): Promise<GeneratedFile[]> {
    return [];
  }

  private async generateServiceDocs(template: ServiceTemplate): Promise<GeneratedFile[]> {
    return [];
  }

  private generateServiceInstructions(template: ServiceTemplate): string[] {
    return [];
  }

  private async generateContractTests(template: AgentTemplate): Promise<GeneratedFile> {
    return {
      path: 'tests/agent.ts',
      content: '// Generated tests',
      type: 'typescript'
    };
  }

  private generateContractInstructions(template: AgentTemplate): string[] {
    return [];
  }

  private async generateClientWrapper(template: AgentTemplate): Promise<GeneratedFile> {
    return {
      path: 'client.ts',
      content: '// Generated client',
      type: 'typescript'
    };
  }

  private async generateTypeDefinitions(template: AgentTemplate): Promise<GeneratedFile> {
    return {
      path: 'types.ts',
      content: '// Generated types',
      type: 'typescript'
    };
  }

  private async generateUsageExamples(template: AgentTemplate): Promise<GeneratedFile> {
    return {
      path: 'examples.ts',
      content: '// Generated examples',
      type: 'typescript'
    };
  }

  private generateClientInstructions(template: AgentTemplate): string[] {
    return [];
  }
}

export interface GeneratedCode {
  files: GeneratedFile[];
  instructions: string[];
}

export interface GeneratedFile {
  path: string;
  content: string;
  type: 'typescript' | 'javascript' | 'rust' | 'toml' | 'json' | 'markdown';
}

/**
 * Create a code generator instance
 */
export function createCodeGenerator(config: CodeGeneratorConfig): CodeGenerator {
  return new CodeGenerator(config);
}

export { CodeGenerator };