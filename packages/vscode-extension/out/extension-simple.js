"use strict";
/**
 * GhostSpeak Protocol VS Code Extension - Simplified Version
 *
 * Basic functionality for testing extension packaging and activation
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
let outputChannel;
function activate(context) {
    console.log('GhostSpeak Protocol extension is now active (simplified)');
    // Initialize core services
    outputChannel = vscode.window.createOutputChannel('GhostSpeak');
    // Register basic commands
    registerCommands(context);
    // Show welcome message
    showWelcomeMessage();
    outputChannel.appendLine('GhostSpeak extension activated successfully');
}
function deactivate() {
    outputChannel?.dispose();
}
function registerCommands(context) {
    const commands = [
        // Basic project commands
        vscode.commands.registerCommand('ghostspeak.initProject', () => {
            vscode.window.showInformationMessage('GhostSpeak: Initialize Project command executed');
        }),
        vscode.commands.registerCommand('ghostspeak.createAgent', () => {
            vscode.window.showInformationMessage('GhostSpeak: Create Agent command executed');
        }),
        vscode.commands.registerCommand('ghostspeak.createService', () => {
            vscode.window.showInformationMessage('GhostSpeak: Create Service command executed');
        }),
        vscode.commands.registerCommand('ghostspeak.buildProject', () => {
            vscode.window.showInformationMessage('GhostSpeak: Build Project command executed');
        }),
        vscode.commands.registerCommand('ghostspeak.deployContract', () => {
            vscode.window.showInformationMessage('GhostSpeak: Deploy Contract command executed');
        }),
        vscode.commands.registerCommand('ghostspeak.testContract', () => {
            vscode.window.showInformationMessage('GhostSpeak: Test Contract command executed');
        }),
        vscode.commands.registerCommand('ghostspeak.startLocalValidator', () => {
            vscode.window.showInformationMessage('GhostSpeak: Start Local Validator command executed');
        }),
        vscode.commands.registerCommand('ghostspeak.stopLocalValidator', () => {
            vscode.window.showInformationMessage('GhostSpeak: Stop Local Validator command executed');
        }),
        vscode.commands.registerCommand('ghostspeak.generateTypes', () => {
            vscode.window.showInformationMessage('GhostSpeak: Generate Types command executed');
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
    vscode.window.showInformationMessage('GhostSpeak Protocol extension loaded successfully! 🎉', 'Create Project', 'View Documentation').then(selection => {
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
//# sourceMappingURL=extension-simple.js.map