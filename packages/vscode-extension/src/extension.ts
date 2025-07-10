/**
 * GhostSpeak Protocol VS Code Extension
 * 
 * Provides comprehensive development support for GhostSpeak autonomous agent projects
 * including Anchor smart contract development, TypeScript SDK integration, and debugging.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { GhostSpeakProjectManager } from './projectManager';
import { GhostSpeakCodeLensProvider } from './codeLensProvider';
import { GhostSpeakCompletionProvider } from './completionProvider';
import { GhostSpeakTaskProvider } from './taskProvider';
import { GhostSpeakDebugAdapterDescriptorFactory } from './debugAdapter';
import { GhostSpeakTreeDataProvider } from './treeDataProvider';
import { TerminalManager } from './terminalManager';
import { LogOutputChannel } from './logOutputChannel';

let outputChannel: vscode.OutputChannel;
let logChannel: LogOutputChannel;
let terminalManager: TerminalManager;
let projectManager: GhostSpeakProjectManager;

export function activate(context: vscode.ExtensionContext) {
    console.log('GhostSpeak Protocol extension is now active');

    // Initialize core services
    outputChannel = vscode.window.createOutputChannel('GhostSpeak');
    logChannel = new LogOutputChannel(outputChannel);
    terminalManager = new TerminalManager();
    projectManager = new GhostSpeakProjectManager(logChannel);

    // Register providers
    registerProviders(context);
    
    // Register commands
    registerCommands(context);
    
    // Set up project detection
    setupProjectDetection(context);
    
    // Show welcome message if first time
    showWelcomeMessage(context);

    logChannel.info('GhostSpeak extension activated successfully');
}

export function deactivate() {
    logChannel?.info('GhostSpeak extension deactivated');
    outputChannel?.dispose();
    terminalManager?.dispose();
}

function registerProviders(context: vscode.ExtensionContext) {
    // CodeLens provider for smart contracts
    const codeLensProvider = new GhostSpeakCodeLensProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            { scheme: 'file', language: 'rust' },
            codeLensProvider
        )
    );

    // Completion provider for TypeScript/JavaScript
    const completionProvider = new GhostSpeakCompletionProvider();
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            [
                { scheme: 'file', language: 'typescript' },
                { scheme: 'file', language: 'javascript' }
            ],
            completionProvider,
            '.',
            '@'
        )
    );

    // Task provider
    const taskProvider = new GhostSpeakTaskProvider(logChannel, terminalManager);
    context.subscriptions.push(
        vscode.tasks.registerTaskProvider('ghostspeak', taskProvider)
    );

    // Debug adapter
    const debugAdapterFactory = new GhostSpeakDebugAdapterDescriptorFactory();
    context.subscriptions.push(
        vscode.debug.registerDebugAdapterDescriptorFactory('ghostspeak', debugAdapterFactory)
    );

    // Tree data provider for project explorer
    const treeDataProvider = new GhostSpeakTreeDataProvider(projectManager);
    context.subscriptions.push(
        vscode.window.createTreeView('ghostspeakExplorer', {
            treeDataProvider,
            canSelectMany: false
        })
    );
}

function registerCommands(context: vscode.ExtensionContext) {
    const commands = [
        // Project commands
        vscode.commands.registerCommand('ghostspeak.initProject', () => initProject()),
        vscode.commands.registerCommand('ghostspeak.createAgent', (uri) => createAgent(uri)),
        vscode.commands.registerCommand('ghostspeak.createService', (uri) => createService(uri)),
        
        // Build and deployment commands
        vscode.commands.registerCommand('ghostspeak.buildProject', () => buildProject()),
        vscode.commands.registerCommand('ghostspeak.deployContract', () => deployContract()),
        vscode.commands.registerCommand('ghostspeak.testContract', () => testContract()),
        
        // Development commands
        vscode.commands.registerCommand('ghostspeak.startLocalValidator', () => startLocalValidator()),
        vscode.commands.registerCommand('ghostspeak.stopLocalValidator', () => stopLocalValidator()),
        vscode.commands.registerCommand('ghostspeak.generateTypes', () => generateTypes()),
        
        // Utility commands
        vscode.commands.registerCommand('ghostspeak.viewLogs', () => viewLogs()),
        vscode.commands.registerCommand('ghostspeak.openDocs', () => openDocs()),
        vscode.commands.registerCommand('ghostspeak.showStatus', () => showStatus())
    ];

    commands.forEach(command => context.subscriptions.push(command));
}

function setupProjectDetection(context: vscode.ExtensionContext) {
    // Watch for project files
    const watcher = vscode.workspace.createFileSystemWatcher('**/Anchor.toml');
    
    watcher.onDidCreate(() => {
        vscode.commands.executeCommand('setContext', 'ghostspeak.projectDetected', true);
        projectManager.refreshProject();
    });
    
    watcher.onDidDelete(() => {
        vscode.commands.executeCommand('setContext', 'ghostspeak.projectDetected', false);
    });

    context.subscriptions.push(watcher);

    // Initial detection
    detectProject();
}

async function detectProject() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;

    for (const folder of workspaceFolders) {
        const anchorTomlPath = path.join(folder.uri.fsPath, 'Anchor.toml');
        if (fs.existsSync(anchorTomlPath)) {
            vscode.commands.executeCommand('setContext', 'ghostspeak.projectDetected', true);
            await projectManager.loadProject(folder.uri.fsPath);
            break;
        }
    }
}

function showWelcomeMessage(context: vscode.ExtensionContext) {
    const hasShownWelcome = context.globalState.get('ghostspeak.hasShownWelcome', false);
    
    if (!hasShownWelcome) {
        vscode.window.showInformationMessage(
            'Welcome to GhostSpeak Protocol development! 🎉',
            'Create Project',
            'View Documentation',
            'Don\\'t show again'
        ).then(selection => {
            switch (selection) {
                case 'Create Project':
                    vscode.commands.executeCommand('ghostspeak.initProject');
                    break;
                case 'View Documentation':
                    vscode.commands.executeCommand('ghostspeak.openDocs');
                    break;
                case 'Don\\'t show again':
                    context.globalState.update('ghostspeak.hasShownWelcome', true);
                    break;
            }
        });
    }
}

// Command implementations

async function initProject() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('Please open a workspace folder first');
        return;
    }

    const projectName = await vscode.window.showInputBox({
        prompt: 'Enter project name',
        placeHolder: 'my-ghostspeak-project',
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return 'Project name is required';
            }
            if (!/^[a-z0-9-_]+$/.test(value)) {
                return 'Project name can only contain lowercase letters, numbers, hyphens, and underscores';
            }
            return null;
        }
    });

    if (!projectName) return;

    const projectType = await vscode.window.showQuickPick([
        { label: 'Basic Agent', description: 'Simple agent with messaging capabilities' },
        { label: 'Marketplace Service', description: 'Agent that offers services in the marketplace' },
        { label: 'Chat Bot', description: 'Conversational agent with AI integration' },
        { label: 'Escrow Service', description: 'Payment processing and escrow agent' },
        { label: 'Custom', description: 'Start with minimal template' }
    ], {
        placeHolder: 'Select project template'
    });

    if (!projectType) return;

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Creating GhostSpeak project...',
        cancellable: false
    }, async (progress) => {
        try {
            progress.report({ increment: 20, message: 'Initializing project structure...' });
            
            const projectPath = path.join(workspaceFolders[0].uri.fsPath, projectName);
            await projectManager.createProject(projectPath, projectType.label, projectName);
            
            progress.report({ increment: 80, message: 'Project created successfully!' });
            
            // Open the new project
            const uri = vscode.Uri.file(projectPath);
            await vscode.commands.executeCommand('vscode.openFolder', uri);
            
        } catch (error) {
            logChannel.error('Failed to create project', error);
            vscode.window.showErrorMessage(`Failed to create project: ${error}`);
        }
    });
}

async function createAgent(uri?: vscode.Uri) {
    const agentName = await vscode.window.showInputBox({
        prompt: 'Enter agent name',
        placeHolder: 'MyAgent',
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return 'Agent name is required';
            }
            if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(value)) {
                return 'Agent name must start with a letter and contain only letters, numbers, and underscores';
            }
            return null;
        }
    });

    if (!agentName) return;

    const agentType = await vscode.window.showQuickPick([
        'Basic',
        'Service Provider',
        'Chat Bot',
        'Data Processor',
        'Custom'
    ], {
        placeHolder: 'Select agent type'
    });

    if (!agentType) return;

    try {
        const targetDir = uri ? uri.fsPath : vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!targetDir) {
            vscode.window.showErrorMessage('No workspace folder available');
            return;
        }

        await projectManager.createAgent(targetDir, agentName, agentType);
        vscode.window.showInformationMessage(`Agent "${agentName}" created successfully!`);
        
    } catch (error) {
        logChannel.error('Failed to create agent', error);
        vscode.window.showErrorMessage(`Failed to create agent: ${error}`);
    }
}

async function createService(uri?: vscode.Uri) {
    const serviceName = await vscode.window.showInputBox({
        prompt: 'Enter service name',
        placeHolder: 'MyService'
    });

    if (!serviceName) return;

    try {
        const targetDir = uri ? uri.fsPath : vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!targetDir) {
            vscode.window.showErrorMessage('No workspace folder available');
            return;
        }

        await projectManager.createService(targetDir, serviceName);
        vscode.window.showInformationMessage(`Service "${serviceName}" created successfully!`);
        
    } catch (error) {
        logChannel.error('Failed to create service', error);
        vscode.window.showErrorMessage(`Failed to create service: ${error}`);
    }
}

async function buildProject() {
    if (!projectManager.hasProject()) {
        vscode.window.showWarningMessage('No GhostSpeak project detected');
        return;
    }

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Building project...',
        cancellable: true
    }, async (progress, token) => {
        try {
            await terminalManager.executeCommand('anchor build', {
                name: 'GhostSpeak Build',
                cwd: projectManager.getProjectPath(),
                show: true
            });
            
            vscode.window.showInformationMessage('Project built successfully!');
            
        } catch (error) {
            logChannel.error('Build failed', error);
            vscode.window.showErrorMessage(`Build failed: ${error}`);
        }
    });
}

async function deployContract() {
    if (!projectManager.hasProject()) {
        vscode.window.showWarningMessage('No GhostSpeak project detected');
        return;
    }

    const network = await vscode.window.showQuickPick(['devnet', 'testnet', 'mainnet-beta'], {
        placeHolder: 'Select target network'
    });

    if (!network) return;

    const confirmed = await vscode.window.showWarningMessage(
        `Deploy to ${network}? This will use SOL for deployment.`,
        'Deploy',
        'Cancel'
    );

    if (confirmed !== 'Deploy') return;

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Deploying to ${network}...`,
        cancellable: false
    }, async (progress) => {
        try {
            await terminalManager.executeCommand(`anchor deploy --provider.cluster ${network}`, {
                name: 'GhostSpeak Deploy',
                cwd: projectManager.getProjectPath(),
                show: true
            });
            
            vscode.window.showInformationMessage(`Deployed successfully to ${network}!`);
            
        } catch (error) {
            logChannel.error('Deployment failed', error);
            vscode.window.showErrorMessage(`Deployment failed: ${error}`);
        }
    });
}

async function testContract() {
    if (!projectManager.hasProject()) {
        vscode.window.showWarningMessage('No GhostSpeak project detected');
        return;
    }

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Running tests...',
        cancellable: true
    }, async (progress, token) => {
        try {
            await terminalManager.executeCommand('anchor test', {
                name: 'GhostSpeak Test',
                cwd: projectManager.getProjectPath(),
                show: true
            });
            
            vscode.window.showInformationMessage('Tests completed!');
            
        } catch (error) {
            logChannel.error('Tests failed', error);
            vscode.window.showErrorMessage(`Tests failed: ${error}`);
        }
    });
}

async function startLocalValidator() {
    try {
        await terminalManager.executeCommand('solana-test-validator', {
            name: 'Solana Validator',
            show: true,
            persistent: true
        });
        
        vscode.window.showInformationMessage('Local validator started');
        
    } catch (error) {
        logChannel.error('Failed to start validator', error);
        vscode.window.showErrorMessage(`Failed to start validator: ${error}`);
    }
}

async function stopLocalValidator() {
    try {
        terminalManager.killTerminal('Solana Validator');
        vscode.window.showInformationMessage('Local validator stopped');
        
    } catch (error) {
        logChannel.error('Failed to stop validator', error);
        vscode.window.showErrorMessage(`Failed to stop validator: ${error}`);
    }
}

async function generateTypes() {
    if (!projectManager.hasProject()) {
        vscode.window.showWarningMessage('No GhostSpeak project detected');
        return;
    }

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Generating TypeScript types...',
        cancellable: false
    }, async (progress) => {
        try {
            await terminalManager.executeCommand('anchor build', {
                name: 'GhostSpeak Build',
                cwd: projectManager.getProjectPath()
            });
            
            // Generate types from IDL
            await projectManager.generateTypes();
            
            vscode.window.showInformationMessage('TypeScript types generated successfully!');
            
        } catch (error) {
            logChannel.error('Type generation failed', error);
            vscode.window.showErrorMessage(`Type generation failed: ${error}`);
        }
    });
}

function viewLogs() {
    outputChannel.show();
}

function openDocs() {
    vscode.env.openExternal(vscode.Uri.parse('https://docs.ghostspeak.dev'));
}

async function showStatus() {
    const status = await projectManager.getProjectStatus();
    
    const statusMessage = [
        `Project: ${status.projectName || 'None'}`,
        `Network: ${status.network}`,
        `Wallet: ${status.walletConnected ? 'Connected' : 'Not connected'}`,
        `Build Status: ${status.buildStatus}`,
        `Deployed: ${status.isDeployed ? 'Yes' : 'No'}`
    ].join('\\n');

    vscode.window.showInformationMessage(statusMessage, 'View Details').then(selection => {
        if (selection === 'View Details') {
            outputChannel.clear();
            outputChannel.appendLine('=== GhostSpeak Project Status ===');
            outputChannel.appendLine(statusMessage);
            outputChannel.show();
        }
    });
}