import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface WijaProjectContext {
    type: 'wija-workspace' | 'anchor-program' | 'typescript-sdk' | 'rust-sdk' | 'mixed-workspace' | 'marketplace';
    rootPath: string;
    hasAnchor: boolean;
    hasTypeScript: boolean;
    hasRust: boolean;
    hasWijaCLI: boolean;
    wijaVersion?: string;
    anchorIDL?: any;
    networkConfig?: any;
    agentRegistry?: string[];
    channelRegistry?: string[];
    capabilities: string[];
}

export class WijaProjectDetector {
    private context: vscode.ExtensionContext;
    private projectContext: WijaProjectContext | null = null;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    async detectProject(): Promise<WijaProjectContext | null> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            this.projectContext = null;
            return null;
        }

        for (const folder of workspaceFolders) {
            const context = await this.analyzeWorkspaceFolder(folder);
            if (context) {
                this.projectContext = context;
                return context;
            }
        }

        this.projectContext = null;
        return null;
    }

    private async analyzeWorkspaceFolder(folder: vscode.WorkspaceFolder): Promise<WijaProjectContext | null> {
        const folderPath = folder.uri.fsPath;
        
        try {
            // Check for Wija monorepo structure
            const isWijaWorkspace = await this.isWijaMonorepo(folderPath);
            if (isWijaWorkspace) {
                return await this.createWijaWorkspaceContext(folderPath);
            }

            // Check for project indicators
            const hasWijaConfig = await this.fileExists(path.join(folderPath, '.wija'));
            const hasAnchorToml = await this.fileExists(path.join(folderPath, 'Anchor.toml'));
            const hasCargoToml = await this.fileExists(path.join(folderPath, 'Cargo.toml'));
            const hasPackageJson = await this.fileExists(path.join(folderPath, 'package.json'));

            if (hasWijaConfig) {
                return await this.createWijaProjectContext(folderPath);
            }

            if (hasAnchorToml) {
                return await this.createAnchorProjectContext(folderPath);
            }

            if (hasPackageJson) {
                const context = await this.createTypeScriptProjectContext(folderPath);
                if (context) return context;
            }

            if (hasCargoToml) {
                const context = await this.createRustProjectContext(folderPath);
                if (context) return context;
            }

            return null;
        } catch (error) {
            console.error('Error analyzing workspace folder:', error);
            return null;
        }
    }

    private async isWijaMonorepo(folderPath: string): Promise<boolean> {
        try {
            const packagesDir = path.join(folderPath, 'packages');
            if (!await this.dirExists(packagesDir)) {
                return false;
            }

            const corePackages = ['core', 'cli', 'sdk-typescript', 'sdk-rust'];
            let foundPackages = 0;

            for (const pkg of corePackages) {
                if (await this.dirExists(path.join(packagesDir, pkg))) {
                    foundPackages++;
                }
            }

            return foundPackages >= 2;
        } catch {
            return false;
        }
    }

    private async createWijaWorkspaceContext(folderPath: string): Promise<WijaProjectContext> {
        const capabilities = ['full-development', 'smart-contracts', 'sdk-development'];
        
        const hasAnchor = await this.dirExists(path.join(folderPath, 'packages', 'core'));
        const hasTypeScript = await this.dirExists(path.join(folderPath, 'packages', 'sdk-typescript'));
        const hasRust = await this.dirExists(path.join(folderPath, 'packages', 'sdk-rust'));
        const hasWijaCLI = await this.dirExists(path.join(folderPath, 'packages', 'cli'));

        return {
            type: 'wija-workspace',
            rootPath: folderPath,
            hasAnchor,
            hasTypeScript,
            hasRust,
            hasWijaCLI,
            agentRegistry: await this.detectAgents(folderPath),
            channelRegistry: await this.detectChannels(folderPath),
            capabilities
        };
    }

    private async createWijaProjectContext(folderPath: string): Promise<WijaProjectContext> {
        const capabilities = ['agent-development', 'channel-management'];
        
        const hasAnchor = await this.fileExists(path.join(folderPath, 'Anchor.toml'));
        const hasTypeScript = await this.fileExists(path.join(folderPath, 'package.json'));
        const hasRust = await this.fileExists(path.join(folderPath, 'Cargo.toml'));

        let type: WijaProjectContext['type'] = 'marketplace';
        if (hasAnchor && hasTypeScript && hasRust) {
            type = 'mixed-workspace';
        } else if (hasAnchor) {
            type = 'anchor-program';
        } else if (hasTypeScript) {
            type = 'typescript-sdk';
        } else if (hasRust) {
            type = 'rust-sdk';
        }

        return {
            type,
            rootPath: folderPath,
            hasAnchor,
            hasTypeScript,
            hasRust,
            hasWijaCLI: await this.checkWijaCLI(),
            agentRegistry: await this.detectAgents(folderPath),
            channelRegistry: await this.detectChannels(folderPath),
            capabilities
        };
    }

    private async createAnchorProjectContext(folderPath: string): Promise<WijaProjectContext | null> {
        const anchorTomlPath = path.join(folderPath, 'Anchor.toml');
        try {
            const anchorContent = await fs.promises.readFile(anchorTomlPath, 'utf8');
            
            const isWijaRelated = anchorContent.includes('agent') || 
                                 anchorContent.includes('wija') || 
                                 anchorContent.includes('ghostspeak');

            if (!isWijaRelated) {
                return null;
            }

            return {
                type: 'anchor-program',
                rootPath: folderPath,
                hasAnchor: true,
                hasTypeScript: await this.fileExists(path.join(folderPath, 'package.json')),
                hasRust: await this.fileExists(path.join(folderPath, 'Cargo.toml')),
                hasWijaCLI: await this.checkWijaCLI(),
                agentRegistry: await this.detectAgents(folderPath),
                channelRegistry: await this.detectChannels(folderPath),
                capabilities: ['smart-contract-development']
            };
        } catch {
            return null;
        }
    }

    private async createTypeScriptProjectContext(folderPath: string): Promise<WijaProjectContext | null> {
        try {
            const packageJsonPath = path.join(folderPath, 'package.json');
            const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, 'utf8'));
            
            const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
            const hasWijaDeps = Object.keys(dependencies).some(dep => 
                dep.includes('@wija/') || 
                dep.includes('@ghostspeak/') ||
                dep.includes('@solana/') ||
                dep.includes('@coral-xyz/anchor')
            );

            if (!hasWijaDeps) {
                return null;
            }

            return {
                type: 'typescript-sdk',
                rootPath: folderPath,
                hasAnchor: await this.fileExists(path.join(folderPath, 'Anchor.toml')),
                hasTypeScript: true,
                hasRust: false,
                hasWijaCLI: await this.checkWijaCLI(),
                agentRegistry: await this.detectAgents(folderPath),
                channelRegistry: await this.detectChannels(folderPath),
                capabilities: ['sdk-development', 'client-applications']
            };
        } catch {
            return null;
        }
    }

    private async createRustProjectContext(folderPath: string): Promise<WijaProjectContext | null> {
        try {
            const cargoTomlPath = path.join(folderPath, 'Cargo.toml');
            const cargoContent = await fs.promises.readFile(cargoTomlPath, 'utf8');
            
            const hasWijaDeps = cargoContent.includes('wija') || 
                               cargoContent.includes('ghostspeak') ||
                               cargoContent.includes('anchor-lang') ||
                               cargoContent.includes('solana-program');

            if (!hasWijaDeps) {
                return null;
            }

            return {
                type: 'rust-sdk',
                rootPath: folderPath,
                hasAnchor: await this.fileExists(path.join(folderPath, 'Anchor.toml')),
                hasTypeScript: false,
                hasRust: true,
                hasWijaCLI: await this.checkWijaCLI(),
                agentRegistry: await this.detectAgents(folderPath),
                channelRegistry: await this.detectChannels(folderPath),
                capabilities: ['rust-development', 'performance-critical']
            };
        } catch {
            return null;
        }
    }

    private async detectAgents(folderPath: string): Promise<string[]> {
        try {
            const { stdout } = await execAsync('wija context agents', { cwd: folderPath });
            return JSON.parse(stdout);
        } catch {
            return this.manualAgentDetection(folderPath);
        }
    }

    private async detectChannels(folderPath: string): Promise<string[]> {
        try {
            const { stdout } = await execAsync('wija context channels', { cwd: folderPath });
            return JSON.parse(stdout);
        } catch {
            return this.manualChannelDetection(folderPath);
        }
    }

    private async manualAgentDetection(folderPath: string): Promise<string[]> {
        const agents: string[] = [];
        const agentDirs = [
            path.join(folderPath, 'agents'),
            path.join(folderPath, 'src', 'agents')
        ];

        for (const dir of agentDirs) {
            if (await this.dirExists(dir)) {
                try {
                    const files = await fs.promises.readdir(dir);
                    agents.push(...files.filter(f => f.endsWith('.json') || f.endsWith('.toml')));
                } catch {
                    // Continue on error
                }
            }
        }

        return agents;
    }

    private async manualChannelDetection(folderPath: string): Promise<string[]> {
        const channels: string[] = [];
        const channelDirs = [
            path.join(folderPath, 'channels'),
            path.join(folderPath, 'src', 'channels')
        ];

        for (const dir of channelDirs) {
            if (await this.dirExists(dir)) {
                try {
                    const files = await fs.promises.readdir(dir);
                    channels.push(...files.filter(f => f.endsWith('.json') || f.endsWith('.toml')));
                } catch {
                    // Continue on error
                }
            }
        }

        return channels;
    }

    private async checkWijaCLI(): Promise<boolean> {
        try {
            await execAsync('wija --version');
            return true;
        } catch {
            return false;
        }
    }

    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.promises.access(filePath, fs.constants.F_OK);
            return true;
        } catch {
            return false;
        }
    }

    private async dirExists(dirPath: string): Promise<boolean> {
        try {
            const stat = await fs.promises.stat(dirPath);
            return stat.isDirectory();
        } catch {
            return false;
        }
    }

    getProjectContext(): WijaProjectContext | null {
        return this.projectContext;
    }

    dispose() {
        // Cleanup if needed
    }
} 