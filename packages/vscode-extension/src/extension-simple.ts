/**
 * GhostSpeak Protocol VS Code Extension - Simplified Version
 * 
 * Basic functionality for testing extension packaging and activation
 */

import * as vscode from 'vscode';

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
    console.log('GhostSpeak Protocol extension is now active (simplified)');

    // Initialize core services
    outputChannel = vscode.window.createOutputChannel('GhostSpeak');
    
    // Register basic commands
    registerCommands(context);
    
    // Show welcome message
    showWelcomeMessage();

    outputChannel.appendLine('GhostSpeak extension activated successfully');
}

export function deactivate() {
    outputChannel?.dispose();
}

function registerCommands(context: vscode.ExtensionContext) {
    const commands = [
        // Basic project commands
        vscode.commands.registerCommand('ghostspeak.initProject', async () => {
            const projectName = await vscode.window.showInputBox({
                prompt: 'Enter project name',
                placeHolder: 'my-ghostspeak-project'
            });
            
            if (projectName) {
                const terminal = vscode.window.createTerminal('GhostSpeak Init');
                terminal.show();
                terminal.sendText(`npx create-ghostspeak-app ${projectName}`);
                vscode.window.showInformationMessage(`Creating GhostSpeak project: ${projectName}`);
            }
        }),
        vscode.commands.registerCommand('ghostspeak.createAgent', async () => {
            const agentName = await vscode.window.showInputBox({
                prompt: 'Enter agent name',
                placeHolder: 'MyAgent'
            });
            
            if (agentName) {
                const agentType = await vscode.window.showQuickPick(['Basic', 'Service Provider', 'Chat Bot', 'Data Processor'], {
                    placeHolder: 'Select agent type'
                });
                
                if (agentType) {
                    const terminal = vscode.window.createTerminal('GhostSpeak CLI');
                    terminal.show();
                    terminal.sendText(`npx ghostspeak agent register --name "${agentName}" --type "${agentType}"`);
                    vscode.window.showInformationMessage(`Creating agent: ${agentName}`);
                }
            }
        }),
        vscode.commands.registerCommand('ghostspeak.createService', async () => {
            const serviceName = await vscode.window.showInputBox({
                prompt: 'Enter service name',
                placeHolder: 'MyService'
            });
            
            if (serviceName) {
                const terminal = vscode.window.createTerminal('GhostSpeak CLI');
                terminal.show();
                terminal.sendText(`npx ghostspeak service create --name "${serviceName}"`);
                vscode.window.showInformationMessage(`Creating service: ${serviceName}`);
            }
        }),
        vscode.commands.registerCommand('ghostspeak.buildProject', () => {
            const terminal = vscode.window.createTerminal('GhostSpeak Build');
            terminal.show();
            terminal.sendText('anchor build');
            vscode.window.showInformationMessage('Building GhostSpeak project...');
        }),
        vscode.commands.registerCommand('ghostspeak.deployContract', async () => {
            const network = await vscode.window.showQuickPick(['devnet', 'testnet', 'mainnet-beta'], {
                placeHolder: 'Select deployment network'
            });
            
            if (network) {
                const terminal = vscode.window.createTerminal('GhostSpeak Deploy');
                terminal.show();
                terminal.sendText(`anchor deploy --provider.cluster ${network}`);
                vscode.window.showInformationMessage(`Deploying to ${network}...`);
            }
        }),
        vscode.commands.registerCommand('ghostspeak.testContract', () => {
            const terminal = vscode.window.createTerminal('GhostSpeak Test');
            terminal.show();
            terminal.sendText('anchor test');
            vscode.window.showInformationMessage('Running tests...');
        }),
        vscode.commands.registerCommand('ghostspeak.startLocalValidator', () => {
            const terminal = vscode.window.createTerminal('Solana Validator');
            terminal.show();
            terminal.sendText('solana-test-validator');
            vscode.window.showInformationMessage('Starting local Solana validator...');
        }),
        vscode.commands.registerCommand('ghostspeak.stopLocalValidator', () => {
            vscode.window.terminals.forEach(terminal => {
                if (terminal.name === 'Solana Validator') {
                    terminal.dispose();
                }
            });
            vscode.window.showInformationMessage('Stopping local Solana validator...');
        }),
        vscode.commands.registerCommand('ghostspeak.generateTypes', () => {
            const terminal = vscode.window.createTerminal('GhostSpeak Types');
            terminal.show();
            terminal.sendText('anchor build && npx @metaplex-foundation/kinobi from-anchor target/idl/podai_marketplace.json');
            vscode.window.showInformationMessage('Generating TypeScript types from IDL...');
        }),
        vscode.commands.registerCommand('ghostspeak.viewLogs', () => {
            outputChannel.show();
        }),
        vscode.commands.registerCommand('ghostspeak.openDocs', () => {
            vscode.env.openExternal(vscode.Uri.parse('https://docs.ghostspeak.dev'));
        })
    ];

    commands.forEach(command => context.subscriptions.push(command));
}

function showWelcomeMessage() {
    vscode.window.showInformationMessage(
        'GhostSpeak Protocol extension loaded successfully! 🎉',
        'Create Project',
        'View Documentation'
    ).then(selection => {
        switch (selection) {
            case 'Create Project':
                vscode.commands.executeCommand('ghostspeak.initProject');
                break;
            case 'View Documentation':
                vscode.commands.executeCommand('ghostspeak.openDocs');
                break;
        }
    });
}