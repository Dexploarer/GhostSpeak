import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface ISpiritEcho {
  id: string;
  type: 'todo' | 'fixme' | 'bug' | 'hack' | 'placeholder' | 'mock' | 'stub' | 'temp' | 'wip' | 'optimize' | 'refactor' | 'debug' | 'note' | 'xxx' | 'undone' | 'later' | 'pending' | 'workaround';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  message: string;
  filePath: string;
  lineNumber: number;
  columnNumber: number;
  codeSnippet: string;
  language: string;
  context: string;
  emoji: string;
  aiPrompt: string;
  createdAt: Date;
  status: 'active' | 'resolved' | 'ignored';
  tags: string[];
}

export interface ISpiritEchoTreeItem {
  type: 'category' | 'echo' | 'file' | 'summary' | 'action';
  echo?: ISpiritEcho;
  category?: string;
  filePath?: string;
  label: string;
  description?: string;
  iconPath?: vscode.ThemeIcon;
  command?: vscode.Command;
  contextValue?: string;
  collapsibleState?: vscode.TreeItemCollapsibleState;
}

export class WijaSpiritEchoProvider implements vscode.TreeDataProvider<ISpiritEchoTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ISpiritEchoTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private echoes: ISpiritEcho[] = [];
  private scanResults: Map<string, ISpiritEcho[]> = new Map();
  private isScanning = false;
  private lastScanTime: Date | null = null;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly promptVaultProvider: any
  ) {
    this.initializeFileWatcher();
  }

  private initializeFileWatcher(): void {
    // Watch for file changes to trigger re-scanning
    const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.{ts,js,tsx,jsx,rs,py,java,cpp,c,cs,go,php,rb,swift,kt,scala}');
    
    fileWatcher.onDidChange(async (uri) => {
      if (this.isScanning) return;
      await this.scanFile(uri.fsPath);
      this.refresh();
    });

    fileWatcher.onDidCreate(async (uri) => {
      if (this.isScanning) return;
      await this.scanFile(uri.fsPath);
      this.refresh();
    });

    fileWatcher.onDidDelete((uri) => {
      this.removeFileEchoes(uri.fsPath);
      this.refresh();
    });
  }

  getTreeItem(element: ISpiritEchoTreeItem): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(element.label, element.collapsibleState);
    
    if (element.iconPath) {
      treeItem.iconPath = element.iconPath;
    }
    
    if (element.description) {
      treeItem.description = element.description;
    }
    
    if (element.command) {
      treeItem.command = element.command;
    }
    
    if (element.contextValue) {
      treeItem.contextValue = element.contextValue;
    }

    return treeItem;
  }

  getChildren(element?: ISpiritEchoTreeItem): Promise<ISpiritEchoTreeItem[]> {
    if (!element) {
      return this.getRootItems();
    }

    switch (element.type) {
      case 'category':
        return this.getCategoryChildren(element.category!);
      case 'file':
        return this.getFileChildren(element.filePath!);
      default:
        return Promise.resolve([]);
    }
  }

  private async getRootItems(): Promise<ISpiritEchoTreeItem[]> {
    const items: ISpiritEchoTreeItem[] = [];

    // Add scan action
    items.push({
      type: 'action',
      label: '🔮 Echo the Spirits',
      description: 'Scan codebase for echoes',
      iconPath: new vscode.ThemeIcon('search'),
      command: {
        command: 'wija.echoSpirits',
        title: 'Echo the Spirits'
      },
      contextValue: 'scan-action'
    });

    // Add summary if we have echoes
    if (this.echoes.length > 0) {
      const criticalCount = this.echoes.filter(e => e.severity === 'critical').length;
      const highCount = this.echoes.filter(e => e.severity === 'high').length;
      const mediumCount = this.echoes.filter(e => e.severity === 'medium').length;
      const lowCount = this.echoes.filter(e => e.severity === 'low').length;

      items.push({
        type: 'summary',
        label: `📊 Echo Summary`,
        description: `${this.echoes.length} echoes found`,
        iconPath: new vscode.ThemeIcon('graph'),
        collapsibleState: vscode.TreeItemCollapsibleState.None
      });

      if (criticalCount > 0) {
        items.push({
          type: 'category',
          category: 'critical',
          label: `💀 Critical Echoes (${criticalCount})`,
          iconPath: new vscode.ThemeIcon('error'),
          collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
        });
      }

      if (highCount > 0) {
        items.push({
          type: 'category',
          category: 'high',
          label: `🔥 High Priority Echoes (${highCount})`,
          iconPath: new vscode.ThemeIcon('warning'),
          collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
        });
      }

      if (mediumCount > 0) {
        items.push({
          type: 'category',
          category: 'medium',
          label: `⚡ Medium Priority Echoes (${mediumCount})`,
          iconPath: new vscode.ThemeIcon('lightbulb'),
          collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
        });
      }

      if (lowCount > 0) {
        items.push({
          type: 'category',
          category: 'low',
          label: `💭 Low Priority Echoes (${lowCount})`,
          iconPath: new vscode.ThemeIcon('info'),
          collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
        });
      }

      // Add files with echoes
      const filesWithEchoes = new Set(this.echoes.map(e => e.filePath));
      if (filesWithEchoes.size > 0) {
        items.push({
          type: 'action',
          label: '📁 Files with Echoes',
          description: `${filesWithEchoes.size} files`,
          iconPath: new vscode.ThemeIcon('folder'),
          collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
        });
      }
    } else if (this.lastScanTime) {
      items.push({
        type: 'summary',
        label: '✨ No Echoes Found',
        description: `Last scan: ${this.lastScanTime.toLocaleTimeString()}`,
        iconPath: new vscode.ThemeIcon('check'),
        collapsibleState: vscode.TreeItemCollapsibleState.None
      });
    }

    return items;
  }

  private async getCategoryChildren(category: string): Promise<ISpiritEchoTreeItem[]> {
    const categoryEchoes = this.echoes.filter(e => e.severity === category);
    
    return categoryEchoes.map(echo => ({
      type: 'echo',
      echo,
      label: `${echo.emoji} ${echo.message}`,
      description: `${path.basename(echo.filePath)}:${echo.lineNumber}`,
      iconPath: this.getEchoIcon(echo),
      command: {
        command: 'vscode.open',
        title: 'Open File',
        arguments: [
          vscode.Uri.file(echo.filePath),
          {
            selection: new vscode.Range(
              echo.lineNumber - 1,
              echo.columnNumber - 1,
              echo.lineNumber - 1,
              echo.columnNumber + echo.message.length
            )
          }
        ]
      },
      contextValue: 'echo-item'
    }));
  }

  private async getFileChildren(filePath: string): Promise<ISpiritEchoTreeItem[]> {
    const fileEchoes = this.echoes.filter(e => e.filePath === filePath);
    
    return fileEchoes.map(echo => ({
      type: 'echo',
      echo,
      label: `${echo.emoji} ${echo.message}`,
      description: `Line ${echo.lineNumber}`,
      iconPath: this.getEchoIcon(echo),
      command: {
        command: 'vscode.open',
        title: 'Open File',
        arguments: [
          vscode.Uri.file(echo.filePath),
          {
            selection: new vscode.Range(
              echo.lineNumber - 1,
              echo.columnNumber - 1,
              echo.lineNumber - 1,
              echo.columnNumber + echo.message.length
            )
          }
        ]
      },
      contextValue: 'echo-item'
    }));
  }

  private getEchoIcon(echo: ISpiritEcho): vscode.ThemeIcon {
    switch (echo.severity) {
      case 'critical':
        return new vscode.ThemeIcon('error');
      case 'high':
        return new vscode.ThemeIcon('warning');
      case 'medium':
        return new vscode.ThemeIcon('lightbulb');
      case 'low':
        return new vscode.ThemeIcon('info');
      default:
        return new vscode.ThemeIcon('symbol-misc');
    }
  }

  async echoSpirits(): Promise<void> {
    try {
      this.isScanning = true;
      
      const progressOptions = {
        location: vscode.ProgressLocation.Notification,
        title: '🔮 Echoing the Spirits...',
        cancellable: false
      };

      await vscode.window.withProgress(progressOptions, async (progress) => {
        progress.report({ message: 'Scanning codebase for echoes...' });
        
        // Clear previous echoes
        this.echoes = [];
        this.scanResults.clear();

        // Get all workspace files
        const files = await this.getCodeFiles();
        
        let processed = 0;
        for (const file of files) {
          progress.report({ 
            message: `Scanning ${path.basename(file)}...`,
            increment: (100 / files.length)
          });

          await this.scanFile(file);
          processed++;
        }

        this.lastScanTime = new Date();
        
        const echoCount = this.echoes.length;
        if (echoCount > 0) {
          vscode.window.showInformationMessage(
            `🔮 Spirit Echo complete! Found ${echoCount} echoes in your codebase.`
          );
        } else {
          vscode.window.showInformationMessage(
            '✨ No echoes found! Your codebase is clean of spirits.'
          );
        }
      });

      this.refresh();
    } catch (error) {
      console.error('Spirit Echo failed:', error);
      vscode.window.showErrorMessage('Failed to echo spirits from the codebase.');
    } finally {
      this.isScanning = false;
    }
  }

  private async getCodeFiles(): Promise<string[]> {
    const files: string[] = [];
    
    if (vscode.workspace.workspaceFolders) {
      for (const folder of vscode.workspace.workspaceFolders) {
        const pattern = new vscode.RelativePattern(folder, '**/*.{ts,js,tsx,jsx,rs,py,java,cpp,c,cs,go,php,rb,swift,kt,scala}');
        const foundFiles = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
        files.push(...foundFiles.map(f => f.fsPath));
      }
    }
    
    return files;
  }

  private async scanFile(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const language = this.getLanguageFromPath(filePath);
      const lines = content.split('\n');
      
      const fileEchoes: ISpiritEcho[] = [];
      
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const lineNumber = lineIndex + 1;
        
        // Scan for different types of echoes
        const echoes = this.scanLineForEchoes(line, lineNumber, filePath, language);
        fileEchoes.push(...echoes);
      }
      
      if (fileEchoes.length > 0) {
        this.scanResults.set(filePath, fileEchoes);
        this.echoes.push(...fileEchoes);
      }
    } catch (error) {
      console.error(`Failed to scan file ${filePath}:`, error);
    }
  }

  private scanLineForEchoes(line: string, lineNumber: number, filePath: string, language: string): ISpiritEcho[] {
    const echoes: ISpiritEcho[] = [];
    
    // Define echo patterns with emojis and severity levels
    const echoPatterns = [
      // Critical - Immediate attention needed
      { pattern: /\b(TODO|FIXME|BUG|HACK|XXX)\b/i, type: 'todo', emoji: '💀', severity: 'critical' as const },
      { pattern: /\b(CRASH|ERROR|FAIL|BROKEN)\b/i, type: 'bug', emoji: '💥', severity: 'critical' as const },
      
      // High - Important but not critical
      { pattern: /\b(OPTIMIZE|REFACTOR|DEBUG|LATER|PENDING)\b/i, type: 'optimize', emoji: '🔥', severity: 'high' as const },
      { pattern: /\b(UNDONE|WORKAROUND|TEMPORARY|TEMP)\b/i, type: 'temp', emoji: '⚠️', severity: 'high' as const },
      
      // Medium - Should be addressed
      { pattern: /\b(NOTE|WIP|WORK_IN_PROGRESS)\b/i, type: 'note', emoji: '⚡', severity: 'medium' as const },
      { pattern: /\b(REVIEW|CHECK|VERIFY)\b/i, type: 'note', emoji: '👁️', severity: 'medium' as const },
      
      // Low - Informational
      { pattern: /\b(INFO|HINT|TIP)\b/i, type: 'note', emoji: '💭', severity: 'low' as const },
      
      // Mock/Stub patterns
      { pattern: /\b(MOCK|STUB|DUMMY|FAKE|TEST_ONLY)\b/i, type: 'mock', emoji: '🎭', severity: 'medium' as const },
      { pattern: /\b(PLACEHOLDER|NOT_IMPLEMENTED|NOT_YET_IMPLEMENTED|IMPLEMENT_ME)\b/i, type: 'placeholder', emoji: '🏗️', severity: 'high' as const },
      { pattern: /\b(WIP|MOCKUP|PROTOTYPE)\b/i, type: 'wip', emoji: '🔨', severity: 'medium' as const },
      
      // Common placeholder data
      { pattern: /\b(lorem ipsum|foo|bar|baz|qux)\b/i, type: 'placeholder', emoji: '📝', severity: 'low' as const },
      { pattern: /\b(test_user|user123|123456|000000|111111)\b/i, type: 'placeholder', emoji: '👤', severity: 'low' as const },
      { pattern: /\b(example\.com|test\.com|your_api_key_here|changeme)\b/i, type: 'placeholder', emoji: '🔑', severity: 'medium' as const },
      { pattern: /<PLACEHOLDER>|<REPLACE_ME>|"insert_name_here"|"dummy_value"|"sample_data"/i, type: 'placeholder', emoji: '🏷️', severity: 'medium' as const },
      
      // AI/Generated code markers
      { pattern: /<<INSERT CODE HERE>>|# Generated by Copilot|# AI-GENERATED CODE|# Autogenerated: DO NOT EDIT/i, type: 'placeholder', emoji: '🤖', severity: 'medium' as const },
      
      // Structured comments
      { pattern: /(?:\/\/|#|\/*)\s*(TODO|FIXME|HACK|NOTE|XXX|OPTIMIZE|REFACTOR)(\s*\([^\)]*\))?:?/i, type: 'todo', emoji: '📋', severity: 'high' as const },
      { pattern: /@todo|@deprecated|@ts-ignore|@ts-nocheck/i, type: 'todo', emoji: '🏷️', severity: 'medium' as const }
    ];
    
    for (const pattern of echoPatterns) {
      const matches = line.matchAll(pattern.pattern);
      for (const match of matches) {
        const echo: ISpiritEcho = {
          id: this.generateId(),
          type: pattern.type as any,
          severity: pattern.severity,
          message: match[0].trim(),
          filePath,
          lineNumber,
          columnNumber: (match.index || 0) + 1,
          codeSnippet: line.trim(),
          language,
          context: this.extractContext(line, lineNumber),
          emoji: pattern.emoji,
          aiPrompt: this.generateAIPrompt(pattern.type, match[0], language, line),
          createdAt: new Date(),
          status: 'active',
          tags: this.generateTags(pattern.type, language, match[0])
        };
        
        echoes.push(echo);
      }
    }
    
    return echoes;
  }

  private extractContext(line: string, lineNumber: number): string {
    return `Line ${lineNumber}: ${line.trim()}`;
  }

  private generateAIPrompt(type: string, match: string, language: string, line: string): string {
    const basePrompt = `I found this ${type.toUpperCase()} marker in my ${language} code:

${line}

The marker "${match}" indicates that this code needs attention. Please help me by:

1. Understanding what this TODO/FIXME/placeholder is asking for
2. Providing a complete implementation or solution
3. Explaining the reasoning behind the solution
4. Suggesting any additional improvements or considerations

Please provide clean, production-ready code that follows ${language} best practices.`;

    switch (type) {
      case 'todo':
        return basePrompt.replace('TODO/FIXME/placeholder', 'TODO item');
      case 'fixme':
        return basePrompt.replace('TODO/FIXME/placeholder', 'FIXME item');
      case 'bug':
        return `I found a potential bug marker in my ${language} code:

${line}

Please help me:
1. Identify what the bug might be
2. Provide a fix for the issue
3. Add proper error handling if needed
4. Include tests to prevent regression

Please provide a robust solution that handles edge cases.`;
      case 'optimize':
        return `I found an optimization marker in my ${language} code:

${line}

Please help me:
1. Analyze the current code for performance issues
2. Suggest specific optimizations
3. Provide optimized implementation
4. Explain the performance improvements

Please provide both the optimized code and performance metrics.`;
      case 'refactor':
        return `I found a refactoring marker in my ${language} code:

${line}

Please help me:
1. Identify what needs refactoring
2. Suggest a cleaner, more maintainable structure
3. Apply SOLID principles and design patterns
4. Maintain functionality while improving code quality

Please provide refactored code with explanations.`;
      case 'mock':
        return `I found a mock/stub marker in my ${language} code:

${line}

Please help me:
1. Create a proper mock implementation
2. Follow testing best practices
3. Make the mock realistic and useful
4. Include proper setup and teardown

Please provide a production-quality mock.`;
      case 'placeholder':
        return `I found a placeholder in my ${language} code:

${line}

Please help me:
1. Replace the placeholder with real implementation
2. Use appropriate data types and values
3. Follow security best practices
4. Make it production-ready

Please provide a complete, secure implementation.`;
      default:
        return basePrompt;
    }
  }

  private generateTags(type: string, language: string, match: string): string[] {
    const tags = [language, type];
    
    if (match.toLowerCase().includes('todo')) tags.push('todo');
    if (match.toLowerCase().includes('fixme')) tags.push('fixme');
    if (match.toLowerCase().includes('bug')) tags.push('bug');
    if (match.toLowerCase().includes('hack')) tags.push('hack');
    if (match.toLowerCase().includes('optimize')) tags.push('optimization');
    if (match.toLowerCase().includes('refactor')) tags.push('refactoring');
    if (match.toLowerCase().includes('mock')) tags.push('testing');
    if (match.toLowerCase().includes('placeholder')) tags.push('placeholder');
    if (match.toLowerCase().includes('temp')) tags.push('temporary');
    if (match.toLowerCase().includes('wip')) tags.push('work-in-progress');
    
    return tags;
  }

  private getLanguageFromPath(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: { [key: string]: string } = {
      '.ts': 'typescript',
      '.js': 'javascript',
      '.tsx': 'typescript',
      '.jsx': 'javascript',
      '.rs': 'rust',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.go': 'go',
      '.php': 'php',
      '.rb': 'ruby',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala'
    };
    
    return languageMap[ext] || 'unknown';
  }

  private generateId(): string {
    return `echo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private removeFileEchoes(filePath: string): void {
    this.echoes = this.echoes.filter(e => e.filePath !== filePath);
    this.scanResults.delete(filePath);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getEchoes(): ISpiritEcho[] {
    return this.echoes;
  }

  getEchoesBySeverity(severity: string): ISpiritEcho[] {
    return this.echoes.filter(e => e.severity === severity);
  }

  getEchoesByFile(filePath: string): ISpiritEcho[] {
    return this.echoes.filter(e => e.filePath === filePath);
  }

  async resolveEcho(echoId: string): Promise<void> {
    const echo = this.echoes.find(e => e.id === echoId);
    if (echo) {
      echo.status = 'resolved';
      this.refresh();
    }
  }

  async ignoreEcho(echoId: string): Promise<void> {
    const echo = this.echoes.find(e => e.id === echoId);
    if (echo) {
      echo.status = 'ignored';
      this.refresh();
    }
  }

  async sendEchoToAI(echo: ISpiritEcho): Promise<void> {
    try {
      // Use the existing prompt vault provider to send to AI
      await this.promptVaultProvider.sendSelectionToAI(
        echo.codeSnippet,
        echo.language,
        echo.filePath,
        new vscode.Range(
          echo.lineNumber - 1,
          echo.columnNumber - 1,
          echo.lineNumber - 1,
          echo.columnNumber + echo.message.length
        )
      );
    } catch (error) {
      console.error('Failed to send echo to AI:', error);
      vscode.window.showErrorMessage('Failed to send echo to AI.');
    }
  }

  async saveEchoAsPrayer(echo: ISpiritEcho): Promise<void> {
    try {
      await this.promptVaultProvider.saveSelectionAsPrayer(
        echo.codeSnippet,
        echo.language,
        echo.filePath,
        new vscode.Range(
          echo.lineNumber - 1,
          echo.columnNumber - 1,
          echo.lineNumber - 1,
          echo.columnNumber + echo.message.length
        )
      );
    } catch (error) {
      console.error('Failed to save echo as prayer:', error);
      vscode.window.showErrorMessage('Failed to save echo as prayer.');
    }
  }

  async extractEchoAsVariable(echo: ISpiritEcho): Promise<void> {
    try {
      await this.promptVaultProvider.extractSelectionAsVariable(
        echo.codeSnippet,
        echo.language,
        echo.filePath,
        new vscode.Range(
          echo.lineNumber - 1,
          echo.columnNumber - 1,
          echo.lineNumber - 1,
          echo.columnNumber + echo.message.length
        )
      );
    } catch (error) {
      console.error('Failed to extract echo as variable:', error);
      vscode.window.showErrorMessage('Failed to extract echo as variable.');
    }
  }

  async analyzeEcho(echo: ISpiritEcho): Promise<void> {
    try {
      await this.promptVaultProvider.analyzeSelection(
        echo.codeSnippet,
        echo.language,
        echo.filePath,
        new vscode.Range(
          echo.lineNumber - 1,
          echo.columnNumber - 1,
          echo.lineNumber - 1,
          echo.columnNumber + echo.message.length
        )
      );
    } catch (error) {
      console.error('Failed to analyze echo:', error);
      vscode.window.showErrorMessage('Failed to analyze echo.');
    }
  }
} 