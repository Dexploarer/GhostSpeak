import {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
  ServerCapabilities,
  Hover,
  MarkupKind,
  Position,
  Range,
  WorkspaceEdit,
  TextEdit,
  SymbolInformation,
  SymbolKind,
  DocumentSymbolParams,
  CodeAction,
  CodeActionKind,
  CodeActionParams,
  Command
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import * as fs from 'fs';
import * as path from 'path';

// Server connection
const connection = createConnection(ProposedFeatures.all);

// Text document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Has workspace folder capability
let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

// Initialize Wija-specific configurations
interface WijaSettings {
  maxNumberOfProblems: number;
  enableValidation: boolean;
  agentValidation: boolean;
  channelValidation: boolean;
  marketplaceValidation: boolean;
}

const defaultSettings: WijaSettings = {
  maxNumberOfProblems: 1000,
  enableValidation: true,
  agentValidation: true,
  channelValidation: true,
  marketplaceValidation: true
};

let globalSettings: WijaSettings = defaultSettings;
const documentSettings: Map<string, Thenable<WijaSettings>> = new Map();

// Wija-specific patterns and schemas
const WIJA_KEYWORDS = [
  'agent', 'channel', 'marketplace', 'escrow', 'genome', 'capability',
  'register', 'deploy', 'replicate', 'message', 'trade', 'purchase',
  'devnet', 'testnet', 'mainnet', 'solana', 'anchor', 'program'
];

const WIJA_AGENT_CAPABILITIES = [
  'trading', 'analysis', 'communication', 'data-processing', 'ai-model',
  'defi', 'nft', 'governance', 'oracle', 'automation', 'monitoring'
];

const WIJA_NETWORK_CLUSTERS = ['devnet', 'testnet', 'mainnet-beta', 'localhost'];

// Initialize server
connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  // Check client capabilities
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );
  hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  );

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      
      // Completion provider
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: ['.', '"', "'", ':', '{', '[']
      },
      
      // Hover provider
      hoverProvider: true,
      
      // Document symbol provider
      documentSymbolProvider: true,
      
      // Code action provider
      codeActionProvider: {
        codeActionKinds: [
          CodeActionKind.QuickFix,
          CodeActionKind.Refactor,
          CodeActionKind.Source
        ]
      },
      
      // Definition provider
      definitionProvider: true,
      
      // Document formatting
      documentFormattingProvider: true,
      
      // Workspace features
      workspace: {
        workspaceFolders: {
          supported: hasWorkspaceFolderCapability,
          changeNotifications: hasWorkspaceFolderCapability ? true : undefined
        }
      }
    } as ServerCapabilities
  };

  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true
      }
    };
  }

  return result;
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders(_event => {
      connection.console.log('Workspace folder change event received.');
    });
  }
});

// Document settings management
connection.onDidChangeConfiguration(change => {
  if (hasConfigurationCapability) {
    documentSettings.clear();
  } else {
    globalSettings = <WijaSettings>(
      (change.settings.wijaLanguageServer || defaultSettings)
    );
  }

  documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<WijaSettings> {
  if (!hasConfigurationCapability) {
    return Promise.resolve(globalSettings);
  }
  let result = documentSettings.get(resource);
  if (!result) {
    result = connection.workspace.getConfiguration({
      scopeUri: resource,
      section: 'wijaLanguageServer'
    });
    documentSettings.set(resource, result);
  }
  return result;
}

documents.onDidClose(e => {
  documentSettings.delete(e.document.uri);
});

documents.onDidChangeContent(change => {
  validateTextDocument(change.document);
});

// Document validation
async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  const settings = await getDocumentSettings(textDocument.uri);
  const text = textDocument.getText();
  const diagnostics: Diagnostic[] = [];

  if (!settings.enableValidation) {
    return;
  }

  // Validate Wija configuration files
  if (textDocument.uri.endsWith('.wija') || textDocument.uri.endsWith('wija.config.json')) {
    await validateWijaConfig(textDocument, diagnostics, settings);
  }

  // Validate Anchor.toml files
  if (textDocument.uri.endsWith('Anchor.toml')) {
    await validateAnchorToml(textDocument, diagnostics, settings);
  }

  // Validate JSON files that might be Wija-related
  if (textDocument.uri.endsWith('.json')) {
    await validateWijaJSON(textDocument, diagnostics, settings);
  }

  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

async function validateWijaConfig(
  textDocument: TextDocument,
  diagnostics: Diagnostic[],
  settings: WijaSettings
): Promise<void> {
  const text = textDocument.getText();
  
  try {
    const config = JSON.parse(text);
    
    // Validate required fields
    if (!config.version) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: {
          start: textDocument.positionAt(0),
          end: textDocument.positionAt(text.length)
        },
        message: 'Missing required field: version',
        source: 'wija'
      });
    }

    // Validate agent configuration
    if (settings.agentValidation && config.agents) {
      for (const [index, agent] of config.agents.entries()) {
        if (!agent.name) {
          const agentPos = findPositionOfProperty(text, `agents[${index}]`);
          diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: agentPos,
            message: 'Agent must have a name',
            source: 'wija'
          });
        }

        if (agent.capabilities) {
          for (const capability of agent.capabilities) {
            if (!WIJA_AGENT_CAPABILITIES.includes(capability)) {
              const capPos = findPositionOfProperty(text, capability);
              diagnostics.push({
                severity: DiagnosticSeverity.Warning,
                range: capPos,
                message: `Unknown agent capability: ${capability}. Available: ${WIJA_AGENT_CAPABILITIES.join(', ')}`,
                source: 'wija'
              });
            }
          }
        }
      }
    }

    // Validate network configuration
    if (config.network && !WIJA_NETWORK_CLUSTERS.includes(config.network)) {
      const networkPos = findPositionOfProperty(text, 'network');
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: networkPos,
        message: `Invalid network: ${config.network}. Must be one of: ${WIJA_NETWORK_CLUSTERS.join(', ')}`,
        source: 'wija'
      });
    }

  } catch (error) {
    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      range: {
        start: textDocument.positionAt(0),
        end: textDocument.positionAt(text.length)
      },
      message: `Invalid JSON: ${error}`,
      source: 'wija'
    });
  }
}

async function validateAnchorToml(
  textDocument: TextDocument,
  diagnostics: Diagnostic[],
  settings: WijaSettings
): Promise<void> {
  const text = textDocument.getText();
  
  // Basic TOML validation for Anchor configuration
  if (!text.includes('[programs.devnet]') && !text.includes('[programs.testnet]') && !text.includes('[programs.mainnet]')) {
    diagnostics.push({
      severity: DiagnosticSeverity.Warning,
      range: {
        start: textDocument.positionAt(0),
        end: textDocument.positionAt(50)
      },
      message: 'Anchor.toml should define programs for at least one network',
      source: 'wija'
    });
  }

  // Check for Wija-specific Anchor configuration
  if (text.includes('wija') || text.includes('ghostspeak')) {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('wija') && !line.includes('# wija')) {
        // Suggest adding Wija-specific optimizations
        const pos = Position.create(i, 0);
        diagnostics.push({
          severity: DiagnosticSeverity.Information,
          range: Range.create(pos, Position.create(i, line.length)),
          message: 'Consider adding Wija-specific optimizations for agent programs',
          source: 'wija'
        });
      }
    }
  }
}

async function validateWijaJSON(
  textDocument: TextDocument,
  diagnostics: Diagnostic[],
  settings: WijaSettings
): Promise<void> {
  const text = textDocument.getText();
  
  try {
    const json = JSON.parse(text);
    
    // Check if this looks like a Wija IDL or configuration
    if (json.instructions || json.accounts || json.types) {
      // This looks like an Anchor IDL
      validateAnchorIDL(textDocument, json, diagnostics);
    }
    
    if (json.agents || json.marketplace || json.channels) {
      // This looks like a Wija configuration
      await validateWijaConfig(textDocument, diagnostics, settings);
    }
    
  } catch (error) {
    // Not a JSON file or invalid JSON - skip validation
  }
}

function validateAnchorIDL(textDocument: TextDocument, idl: any, diagnostics: Diagnostic[]): void {
  // Validate Anchor IDL for Wija-specific patterns
  if (idl.instructions) {
    for (const instruction of idl.instructions) {
      if (instruction.name.includes('agent') || instruction.name.includes('channel')) {
        // This looks like a Wija program instruction
        if (!instruction.accounts?.find((acc: any) => acc.name === 'payer')) {
          diagnostics.push({
            severity: DiagnosticSeverity.Warning,
            range: {
              start: Position.create(0, 0),
              end: Position.create(0, 50)
            },
            message: `Wija instruction ${instruction.name} should include a payer account`,
            source: 'wija'
          });
        }
      }
    }
  }
}

// Completion provider
connection.onCompletion(
  (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    const document = documents.get(_textDocumentPosition.textDocument.uri);
    if (!document) {
      return [];
    }

    const text = document.getText();
    const position = _textDocumentPosition.position;
    const lineText = document.getText({
      start: { line: position.line, character: 0 },
      end: position
    });

    const completions: CompletionItem[] = [];

    // Wija keyword completions
    if (lineText.includes('"') || lineText.includes("'")) {
      // Inside string - provide value completions
      if (lineText.includes('capability') || lineText.includes('capabilities')) {
        WIJA_AGENT_CAPABILITIES.forEach(capability => {
          completions.push({
            label: capability,
            kind: CompletionItemKind.Value,
            documentation: `Agent capability: ${capability}`
          });
        });
      }

      if (lineText.includes('network') || lineText.includes('cluster')) {
        WIJA_NETWORK_CLUSTERS.forEach(cluster => {
          completions.push({
            label: cluster,
            kind: CompletionItemKind.Value,
            documentation: `Solana cluster: ${cluster}`
          });
        });
      }
    } else {
      // Outside string - provide property completions
      WIJA_KEYWORDS.forEach(keyword => {
        completions.push({
          label: keyword,
          kind: CompletionItemKind.Keyword,
          documentation: `Wija ${keyword} configuration`
        });
      });

      // Add common Wija configuration structures
      if (document.uri.endsWith('.wija') || document.uri.endsWith('wija.config.json')) {
        completions.push({
          label: 'agent',
          kind: CompletionItemKind.Snippet,
          insertText: JSON.stringify({
            name: "agent-name",
            capabilities: ["trading"],
            metadata: {
              description: "Agent description"
            }
          }, null, 2),
          documentation: 'Create new agent configuration'
        });

        completions.push({
          label: 'channel',
          kind: CompletionItemKind.Snippet,
          insertText: JSON.stringify({
            name: "channel-name",
            visibility: "public",
            encryption: true
          }, null, 2),
          documentation: 'Create new channel configuration'
        });
      }
    }

    return completions;
  }
);

// Completion resolve
connection.onCompletionResolve(
  (item: CompletionItem): CompletionItem => {
    if (item.data === 1) {
      item.detail = 'Wija Configuration';
      item.documentation = 'Enhanced completion for Wija development';
    }
    return item;
  }
);

// Hover provider
connection.onHover(
  (_textDocumentPosition: TextDocumentPositionParams): Hover | null => {
    const document = documents.get(_textDocumentPosition.textDocument.uri);
    if (!document) {
      return null;
    }

    const position = _textDocumentPosition.position;
    const wordRange = getWordRangeAtPosition(document, position);
    
    if (!wordRange) {
      return null;
    }

    const word = document.getText(wordRange);
    
    // Provide hover information for Wija-specific terms
    const wijaHover = getWijaHoverInfo(word);
    if (wijaHover) {
      return {
        contents: {
          kind: MarkupKind.Markdown,
          value: wijaHover
        },
        range: wordRange
      };
    }

    return null;
  }
);

// Document symbols provider
connection.onDocumentSymbol(
  (params: DocumentSymbolParams): SymbolInformation[] => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      return [];
    }

    const symbols: SymbolInformation[] = [];
    const text = document.getText();

    try {
      const json = JSON.parse(text);
      
      // Extract symbols from Wija configuration
      if (json.agents) {
        json.agents.forEach((agent: any, index: number) => {
          if (agent.name) {
            symbols.push({
              name: `Agent: ${agent.name}`,
              kind: SymbolKind.Object,
              location: {
                uri: document.uri,
                range: findPositionOfProperty(text, `agents[${index}]`)
              }
            });
          }
        });
      }

      if (json.channels) {
        json.channels.forEach((channel: any, index: number) => {
          if (channel.name) {
            symbols.push({
              name: `Channel: ${channel.name}`,
              kind: SymbolKind.Interface,
              location: {
                uri: document.uri,
                range: findPositionOfProperty(text, `channels[${index}]`)
              }
            });
          }
        });
      }

    } catch (error) {
      // Not a JSON file or invalid JSON
    }

    return symbols;
  }
);

// Code actions provider
connection.onCodeAction(
  (params: CodeActionParams): CodeAction[] => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      return [];
    }

    const actions: CodeAction[] = [];
    const diagnostics = params.context.diagnostics;

    // Fix actions for diagnostics
    for (const diagnostic of diagnostics) {
      if (diagnostic.source === 'wija') {
        if (diagnostic.message.includes('Missing required field: version')) {
          actions.push({
            title: 'Add version field',
            kind: CodeActionKind.QuickFix,
            edit: {
              changes: {
                [document.uri]: [{
                  range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                  newText: '"version": "1.0.0",\n'
                }]
              }
            },
            diagnostics: [diagnostic]
          });
        }

        if (diagnostic.message.includes('Unknown agent capability')) {
          // Suggest valid capabilities
          WIJA_AGENT_CAPABILITIES.forEach(capability => {
            actions.push({
              title: `Change to "${capability}"`,
              kind: CodeActionKind.QuickFix,
              edit: {
                changes: {
                  [document.uri]: [{
                    range: diagnostic.range,
                    newText: `"${capability}"`
                  }]
                }
              },
              diagnostics: [diagnostic]
            });
          });
        }
      }
    }

    // Source actions
    actions.push({
      title: 'Generate Wija agent template',
      kind: CodeActionKind.Source,
      command: {
        title: 'Generate Wija agent template',
        command: 'wija.generateAgentTemplate'
      }
    });

    return actions;
  }
);

// Custom request handlers
connection.onRequest('wija/validateProject', async () => {
  // Validate all Wija-related files in the workspace
  const allDocuments = documents.all();
  let validationResults = [];

  for (const document of allDocuments) {
    if (document.uri.includes('.wija') || document.uri.includes('Anchor.toml')) {
      await validateTextDocument(document);
      validationResults.push({
        uri: document.uri,
        valid: true // Simplified - would actually check diagnostic results
      });
    }
  }

  return { results: validationResults };
});

connection.onRequest('wija/generateConfig', async () => {
  // Generate a sample Wija configuration
  const sampleConfig = {
    version: "1.0.0",
    network: "devnet",
    agents: [{
      name: "sample-agent",
      capabilities: ["trading", "analysis"],
      metadata: {
        description: "A sample trading agent",
        tags: ["automated", "defi"]
      }
    }],
    channels: [{
      name: "general",
      visibility: "public",
      encryption: false
    }]
  };

  return { config: sampleConfig };
});

// Utility functions
function findPositionOfProperty(text: string, property: string): Range {
  const index = text.indexOf(property);
  if (index === -1) {
    return Range.create(0, 0, 0, 0);
  }

  const lines = text.substring(0, index).split('\n');
  const line = lines.length - 1;
  const character = lines[line].length;

  return Range.create(
    Position.create(line, character),
    Position.create(line, character + property.length)
  );
}

function getWordRangeAtPosition(document: TextDocument, position: Position): Range | null {
  const text = document.getText();
  const offset = document.offsetAt(position);
  
  let start = offset;
  let end = offset;

  // Find word boundaries
  while (start > 0 && /\w/.test(text[start - 1])) {
    start--;
  }
  while (end < text.length && /\w/.test(text[end])) {
    end++;
  }

  if (start === end) {
    return null;
  }

  return Range.create(
    document.positionAt(start),
    document.positionAt(end)
  );
}

function getWijaHoverInfo(word: string): string | null {
  const wijaTerms: Record<string, string> = {
    'agent': '🤖 **Wija Agent**\n\nAn autonomous AI entity that can perform tasks, interact with other agents, and participate in the marketplace.\n\n**Capabilities**: trading, analysis, communication, data-processing, ai-model, defi, nft, governance, oracle, automation, monitoring',
    
    'channel': '📡 **Communication Channel**\n\nA secure communication pathway between agents, supporting encrypted messaging and data exchange.\n\n**Properties**: name, visibility (public/private), encryption',
    
    'marketplace': '🏪 **Agent Marketplace**\n\nA decentralized marketplace where agents can offer services, purchase from other agents, and trade capabilities.\n\n**Features**: service listings, job postings, reputation system',
    
    'escrow': '🔒 **Escrow Service**\n\nSecure transaction system that holds funds until work is completed and verified.\n\n**Security**: Multi-signature, time locks, dispute resolution',
    
    'genome': '🧬 **Agent Genome**\n\nThe replicable template containing an agent\'s capabilities, configuration, and behavioral patterns.\n\n**Components**: capabilities, metadata, behavioral rules',
    
    'capability': '⚡ **Agent Capability**\n\nA specific skill or function that an agent can perform.\n\n**Available**: trading, analysis, communication, data-processing, ai-model, defi, nft, governance, oracle, automation, monitoring',
    
    'devnet': '🔧 **Solana Devnet**\n\nDevelopment network for testing Solana programs and applications.\n\n**Use**: Development, testing, debugging',
    
    'testnet': '🧪 **Solana Testnet**\n\nPublic testing network that mirrors mainnet conditions.\n\n**Use**: Final testing before mainnet deployment',
    
    'mainnet': '🚀 **Solana Mainnet**\n\nProduction network for live applications and real transactions.\n\n**Use**: Production deployments',
    
    'anchor': '⚓ **Anchor Framework**\n\nRust framework for developing Solana programs with enhanced developer experience.\n\n**Features**: IDL generation, type safety, testing framework'
  };

  return wijaTerms[word.toLowerCase()] || null;
}

// Document management
documents.listen(connection);

// Start listening for connections
connection.listen();

// Log server startup
connection.console.log('🔮 Wija Language Server started successfully'); 