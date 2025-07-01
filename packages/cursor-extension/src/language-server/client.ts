import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
  RevealOutputChannelOn
} from 'vscode-languageclient/node';
import * as path from 'path';

export class WijaLanguageServer {
  private client: LanguageClient | undefined;
  private outputChannel: vscode.OutputChannel;

  constructor(
    private context: vscode.ExtensionContext, 
    private config: any
  ) {
    this.outputChannel = vscode.window.createOutputChannel('Wija Language Server');
  }

  async start(): Promise<void> {
    try {
      // Language server module path
      const serverModule = this.context.asAbsolutePath(
        path.join('out', 'language-server', 'server.js')
      );

      // Debug options for the server
      const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

      // Server options for both run and debug modes
      const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: {
          module: serverModule,
          transport: TransportKind.ipc,
          options: debugOptions
        }
      };

      // Options to control the language client
      const clientOptions: LanguageClientOptions = {
        // Register the server for Wija configuration files
        documentSelector: [
          { scheme: 'file', language: 'wija-config' },
          { scheme: 'file', language: 'json', pattern: '**/wija.config.json' },
          { scheme: 'file', language: 'json', pattern: '**/.wija' },
          { scheme: 'file', language: 'toml', pattern: '**/Anchor.toml' }
        ],
        
        synchronize: {
          // Notify the server about file changes to .wija files
          fileEvents: [
            vscode.workspace.createFileSystemWatcher('**/.wija'),
            vscode.workspace.createFileSystemWatcher('**/wija.config.json'),
            vscode.workspace.createFileSystemWatcher('**/Anchor.toml'),
            vscode.workspace.createFileSystemWatcher('**/Cargo.toml'),
            vscode.workspace.createFileSystemWatcher('**/package.json')
          ]
        },

        outputChannel: this.outputChannel,
        revealOutputChannelOn: RevealOutputChannelOn.Warn,

        // Initialize the server with workspace configuration
        initializationOptions: {
          wijaConfig: this.config.getAll(),
          workspaceFolders: vscode.workspace.workspaceFolders?.map(folder => folder.uri.fsPath)
        },

        // Middleware for enhanced functionality
        middleware: {
          // Custom completion provider for Wija-specific contexts
          provideCompletionItem: async (document, position, context, token, next) => {
            const completions = await next(document, position, context, token);
            return this.enhanceCompletions(completions, document, position);
          },

          // Custom hover provider for Wija documentation
          provideHover: async (document, position, token, next) => {
            const hover = await next(document, position, token);
            return this.enhanceHover(hover, document, position);
          }
        }
      };

      // Create the language client
      this.client = new LanguageClient(
        'wijaLanguageServer',
        'Wija Language Server',
        serverOptions,
        clientOptions
      );

      // Register client capabilities
      this.registerClientFeatures();

      // Start the client (and the server)
      await this.client.start();
      
      this.outputChannel.appendLine('✨ Wija Language Server started successfully');

      // Register additional commands after server starts
      this.registerServerCommands();

    } catch (error) {
      this.outputChannel.appendLine(`❌ Failed to start Wija Language Server: ${error}`);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      await this.client.stop();
      this.outputChannel.appendLine('🔮 Wija Language Server stopped');
    } catch (error) {
      this.outputChannel.appendLine(`❌ Error stopping Wija Language Server: ${error}`);
    }
  }

  private registerClientFeatures(): void {
    if (!this.client) return;

    // Custom request handlers for Wija-specific features
    this.client.onRequest('wija/getProjectInfo', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) return null;

      return {
        folders: workspaceFolders.map(folder => ({
          name: folder.name,
          uri: folder.uri.toString()
        })),
        config: this.config.getAll()
      };
    });

    this.client.onRequest('wija/showMessage', async (params: { type: string; message: string }) => {
      switch (params.type) {
        case 'info':
          vscode.window.showInformationMessage(params.message);
          break;
        case 'warning':
          vscode.window.showWarningMessage(params.message);
          break;
        case 'error':
          vscode.window.showErrorMessage(params.message);
          break;
      }
    });
  }

  private registerServerCommands(): void {
    if (!this.client) return;

    // Register commands that interact with the language server
    this.context.subscriptions.push(
      vscode.commands.registerCommand('wija.lsp.restart', async () => {
        await this.stop();
        await this.start();
        vscode.window.showInformationMessage('🔮 Wija Language Server restarted');
      })
    );

    this.context.subscriptions.push(
      vscode.commands.registerCommand('wija.lsp.validateProject', async () => {
        if (!this.client) return;
        
        const result = await this.client.sendRequest('wija/validateProject');
        if (result) {
          vscode.window.showInformationMessage('✅ Project validation completed');
        }
      })
    );

    this.context.subscriptions.push(
      vscode.commands.registerCommand('wija.lsp.generateConfig', async () => {
        if (!this.client) return;
        
        const result = await this.client.sendRequest('wija/generateConfig');
        if (result) {
          vscode.window.showInformationMessage('📝 Configuration generated successfully');
        }
      })
    );
  }

  private enhanceCompletions(
    completions: vscode.CompletionList | vscode.CompletionItem[] | null | undefined,
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionList | vscode.CompletionItem[] | null | undefined {
    if (!completions) return completions;

    // Add Wija-specific completion enhancements
    const items = Array.isArray(completions) ? completions : completions.items;
    
    // Add custom Wija completions based on context
    const lineText = document.lineAt(position).text;
    const customItems: vscode.CompletionItem[] = [];

    if (lineText.includes('agent')) {
      customItems.push({
        label: 'agent.register',
        kind: vscode.CompletionItemKind.Method,
        documentation: 'Register a new AI agent with capabilities',
        insertText: 'agent.register({\n  name: "${1:agent-name}",\n  capabilities: ["${2:capability}"]\n})',
        insertTextFormat: vscode.CompletionItemTextFormat.Snippet
      });
    }

    if (lineText.includes('channel')) {
      customItems.push({
        label: 'channel.create',
        kind: vscode.CompletionItemKind.Method,
        documentation: 'Create a new communication channel',
        insertText: 'channel.create({\n  name: "${1:channel-name}",\n  visibility: "${2|public,private|}"\n})',
        insertTextFormat: vscode.CompletionItemTextFormat.Snippet
      });
    }

    if (customItems.length > 0) {
      if (Array.isArray(completions)) {
        return [...completions, ...customItems];
      } else {
        return {
          ...completions,
          items: [...completions.items, ...customItems]
        };
      }
    }

    return completions;
  }

  private enhanceHover(
    hover: vscode.Hover | null | undefined,
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.Hover | null | undefined {
    if (hover) return hover;

    // Provide custom hover information for Wija-specific terms
    const range = document.getWordRangeAtPosition(position);
    if (!range) return null;

    const word = document.getText(range);
    
    const wijaTerms: Record<string, string> = {
      'agent': '🤖 **Wija Agent**\n\nAn autonomous AI entity that can perform tasks, interact with other agents, and participate in the marketplace.',
      'channel': '📡 **Communication Channel**\n\nA secure communication pathway between agents, supporting encrypted messaging and data exchange.',
      'marketplace': '🏪 **Agent Marketplace**\n\nA decentralized marketplace where agents can offer services, purchase from other agents, and trade capabilities.',
      'escrow': '🔒 **Escrow Service**\n\nSecure transaction system that holds funds until work is completed and verified.',
      'genome': '🧬 **Agent Genome**\n\nThe replicable template containing an agent\'s capabilities, configuration, and behavioral patterns.',
      'capability': '⚡ **Agent Capability**\n\nA specific skill or function that an agent can perform, such as data analysis, trading, or communication.'
    };

    if (wijaTerms[word.toLowerCase()]) {
      return new vscode.Hover(
        new vscode.MarkdownString(wijaTerms[word.toLowerCase()]),
        range
      );
    }

    return null;
  }

  // Public method to check if server is running
  isRunning(): boolean {
    return this.client !== undefined && this.client.state === 2; // Running state
  }

  // Public method to send custom requests to the server
  async sendRequest<T>(method: string, params?: any): Promise<T | null> {
    if (!this.client || !this.isRunning()) {
      return null;
    }

    try {
      return await this.client.sendRequest(method, params);
    } catch (error) {
      this.outputChannel.appendLine(`❌ Request ${method} failed: ${error}`);
      return null;
    }
  }
} 