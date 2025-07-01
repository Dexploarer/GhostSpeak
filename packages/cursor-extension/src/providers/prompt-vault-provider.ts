import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface IPocketedPrayer {
  id: string;
  name: string;
  category: string;
  code: string;
  language: string;
  prompt: string;
  context?: string;
  variables?: Record<string, string>;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  usage: {
    count: number;
    lastUsed?: Date;
    effectiveness?: 'high' | 'medium' | 'low';
  };
}

export interface IPromptRecipe {
  id: string;
  name: string;
  description: string;
  category: string;
  prayers: string[]; // Prayer IDs
  template: string;
  variables: Record<string, string>;
  examples?: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IProjectContext {
  projectName: string;
  projectType: 'wija-workspace' | 'anchor-program' | 'typescript-sdk' | 'rust-sdk' | 'mixed';
  languages: string[];
  frameworks: string[];
  dependencies: string[];
  variables: Record<string, string>;
  customPatterns: Record<string, string>;
}

export interface IPrayerTreeItem {
  type: 'category' | 'prayer' | 'recipe' | 'action' | 'context';
  prayer?: IPocketedPrayer;
  recipe?: IPromptRecipe;
  category?: string;
  label: string;
  description?: string;
  iconPath?: vscode.ThemeIcon;
  command?: vscode.Command;
  contextValue?: string;
}

export class WijaPromptVaultProvider implements vscode.TreeDataProvider<IPrayerTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<IPrayerTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private prayers: IPocketedPrayer[] = [];
  private recipes: IPromptRecipe[] = [];
  private projectContext: IProjectContext | null = null;
  private vaultPath: string;

  constructor(
    private readonly context: vscode.ExtensionContext
  ) {
    this.vaultPath = path.join(this.context.globalStorageUri.fsPath, 'prompt-vault');
    this.initializeVault();
    this.loadPrayers();
    this.loadRecipes();
    this.detectProjectContext();

    // Watch for file changes to update context
    vscode.workspace.onDidChangeTextDocument(() => {
      this.detectProjectContext();
    });
  }

  getTreeItem(element: IPrayerTreeItem): vscode.TreeItem {
    const item = new vscode.TreeItem(
      element.label,
      element.type === 'category' ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None
    );

    item.description = element.description;
    item.iconPath = element.iconPath;
    item.command = element.command;
    item.contextValue = element.contextValue || element.type;

    // Add tooltips for prayers
    if (element.prayer) {
      const prayer = element.prayer;
      const tooltip = new vscode.MarkdownString();
      tooltip.appendMarkdown(`**${prayer.name}**\n\n`);
      tooltip.appendMarkdown(`**Category:** ${prayer.category}\n\n`);
      tooltip.appendMarkdown(`**Language:** ${prayer.language}\n\n`);
      tooltip.appendMarkdown(`**Usage:** ${prayer.usage.count} times\n\n`);
      if (prayer.tags.length > 0) {
        tooltip.appendMarkdown(`**Tags:** ${prayer.tags.join(', ')}\n\n`);
      }
      tooltip.appendMarkdown(`**Prompt:**\n\`\`\`\n${prayer.prompt}\n\`\`\`\n\n`);
      if (prayer.code) {
        tooltip.appendMarkdown(`**Code:**\n\`\`\`${prayer.language}\n${prayer.code.slice(0, 200)}${prayer.code.length > 200 ? '...' : ''}\n\`\`\`\n\n`);
      }
      item.tooltip = tooltip;
    }

    return item;
  }

  getChildren(element?: IPrayerTreeItem): Thenable<IPrayerTreeItem[]> {
    if (!element) {
      return this.getRootItems();
    }

    if (element.type === 'category') {
      return this.getCategoryChildren(element.category!);
    }

    return Promise.resolve([]);
  }

  private async getRootItems(): Promise<IPrayerTreeItem[]> {
    const items: IPrayerTreeItem[] = [];

    // Quick Actions
    items.push({
      type: 'action',
      label: '🔮 Pocket Current Selection',
      description: 'Save highlighted code as a prayer',
      iconPath: new vscode.ThemeIcon('add'),
      command: {
        command: 'wija.pocketPrayer',
        title: 'Pocket Prayer'
      },
      contextValue: 'action'
    });

    items.push({
      type: 'action',
      label: '⚡ Generate Master Prompt',
      description: 'Create context-aware prompt for clipboard',
      iconPath: new vscode.ThemeIcon('zap'),
      command: {
        command: 'wija.generateMasterPrompt',
        title: 'Generate Master Prompt'
      },
      contextValue: 'action'
    });

    items.push({
      type: 'action',
      label: '📚 Create Recipe',
      description: 'Create new prompt recipe',
      iconPath: new vscode.ThemeIcon('book'),
      command: {
        command: 'wija.createRecipe',
        title: 'Create Recipe'
      },
      contextValue: 'action'
    });

    // Project Context
    if (this.projectContext) {
      items.push({
        type: 'context',
        label: `📁 ${this.projectContext.projectName}`,
        description: `${this.projectContext.projectType} • ${this.projectContext.languages.join(', ')}`,
        iconPath: new vscode.ThemeIcon('folder'),
        contextValue: 'context'
      });
    }

    // Categories
    const categories = this.getCategories();
    for (const category of categories) {
      const count = this.prayers.filter(p => p.category === category).length;
      items.push({
        type: 'category',
        category,
        label: `${this.getCategoryIcon(category)} ${category}`,
        description: `${count} prayer${count === 1 ? '' : 's'}`,
        iconPath: new vscode.ThemeIcon('folder'),
        contextValue: 'category'
      });
    }

    // Recipes
    if (this.recipes.length > 0) {
      items.push({
        type: 'category',
        category: 'recipes',
        label: `📖 Recipes (${this.recipes.length})`,
        description: 'Prompt recipes and templates',
        iconPath: new vscode.ThemeIcon('book'),
        contextValue: 'recipes'
      });
    }

    return items;
  }

  private async getCategoryChildren(category: string): Promise<IPrayerTreeItem[]> {
    if (category === 'recipes') {
      return this.recipes.map(recipe => ({
        type: 'recipe' as const,
        recipe,
        label: recipe.name,
        description: recipe.description,
        iconPath: new vscode.ThemeIcon('bookmark'),
        command: {
          command: 'wija.useRecipe',
          title: 'Use Recipe',
          arguments: [recipe]
        },
        contextValue: 'recipe'
      }));
    }

    const prayers = this.prayers.filter(p => p.category === category);
    return prayers.map(prayer => ({
      type: 'prayer' as const,
      prayer,
      label: prayer.name,
      description: `${prayer.language} • ${prayer.usage.count} uses`,
      iconPath: this.getPrayerIcon(prayer),
      command: {
        command: 'wija.usePrayer',
        title: 'Use Prayer',
        arguments: [prayer]
      },
      contextValue: 'prayer'
    }));
  }

  private getCategories(): string[] {
    const categories = new Set<string>();
    this.prayers.forEach(p => categories.add(p.category));
    
    // Default categories
    const defaultCategories = [
      'Error Fixes',
      'Code Patterns', 
      'Refactoring',
      'Performance',
      'Security',
      'Testing',
      'Documentation',
      'Architecture',
      'Custom'
    ];

    defaultCategories.forEach(cat => categories.add(cat));
    return Array.from(categories).sort();
  }

  private getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'Error Fixes': '🚨',
      'Code Patterns': '🎯',
      'Refactoring': '🔄',
      'Performance': '⚡',
      'Security': '🔒',
      'Testing': '🧪',
      'Documentation': '📝',
      'Architecture': '🏗️',
      'Custom': '⭐'
    };
    return icons[category] || '📁';
  }

  private getPrayerIcon(prayer: IPocketedPrayer): vscode.ThemeIcon {
    const effectivenessColors = {
      'high': new vscode.ThemeColor('testing.iconPassed'),
      'medium': new vscode.ThemeColor('editorWarning.foreground'),
      'low': new vscode.ThemeColor('editorError.foreground')
    };

    const color = effectivenessColors[prayer.usage.effectiveness || 'medium'];
    
    if (prayer.language === 'typescript' || prayer.language === 'javascript') {
      return new vscode.ThemeIcon('symbol-namespace', color);
    } else if (prayer.language === 'rust') {
      return new vscode.ThemeIcon('symbol-struct', color);
    } else if (prayer.language === 'json') {
      return new vscode.ThemeIcon('symbol-object', color);
    } else {
      return new vscode.ThemeIcon('symbol-method', color);
    }
  }

  // Prayer Management
  async pocketPrayer(code: string, language: string, filePath?: string, range?: vscode.Range): Promise<void> {
    const name = await vscode.window.showInputBox({
      prompt: 'Give your prayer a name',
      placeHolder: 'e.g., "Fix async/await pattern"',
      validateInput: (value) => value ? null : 'Prayer name is required'
    });

    if (!name) return;

    const categories = this.getCategories();
    const categoryItems = categories.map(cat => ({ label: cat, value: cat }));
    categoryItems.push({ label: '+ Create New Category', value: '__new__' });

    let category = await vscode.window.showQuickPick(categoryItems, {
      title: 'Select Category',
      placeHolder: 'Choose a category for this prayer'
    });

    if (!category) return;

    if (category.value === '__new__') {
      const newCategory = await vscode.window.showInputBox({
        prompt: 'Enter new category name',
        placeHolder: 'e.g., "My Custom Category"'
      });
      if (!newCategory) return;
      category = { label: newCategory, value: newCategory };
    }

    const prompt = await vscode.window.showInputBox({
      prompt: 'Enter the AI prompt for this prayer',
      placeHolder: 'e.g., "Don\'t use this pattern, use async/await instead"',
      validateInput: (value) => value ? null : 'Prompt is required'
    });

    if (!prompt) return;

    const context = await vscode.window.showInputBox({
      prompt: 'Add context (optional)',
      placeHolder: 'e.g., "When working with asynchronous operations"'
    });

    const tagsInput = await vscode.window.showInputBox({
      prompt: 'Add tags (optional, comma-separated)',
      placeHolder: 'e.g., "async, error-handling, performance"'
    });

    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

    const prayer: IPocketedPrayer = {
      id: this.generateId(),
      name,
      category: category.value,
      code,
      language,
      prompt,
      context,
      variables: this.extractVariables(code),
      tags,
      createdAt: new Date(),
      updatedAt: new Date(),
      filePath,
      lineStart: range?.start.line,
      lineEnd: range?.end.line,
      usage: {
        count: 0,
        effectiveness: 'medium'
      }
    };

    this.prayers.push(prayer);
    await this.savePrayers();
    this._onDidChangeTreeData.fire();

    vscode.window.showInformationMessage(`🔮 Prayer "${name}" pocketed successfully!`);
  }

  async generateMasterPrompt(selectedPrayers?: IPocketedPrayer[]): Promise<void> {
    if (!selectedPrayers || selectedPrayers.length === 0) {
      // Show prayer selection
      const prayerItems = this.prayers.map(p => ({
        label: p.name,
        description: `${p.category} • ${p.language}`,
        prayer: p,
        picked: false
      }));

      const selected = await vscode.window.showQuickPick(prayerItems, {
        title: 'Select Prayers for Master Prompt',
        placeHolder: 'Choose prayers to include in the master prompt',
        canPickMany: true
      });

      if (!selected || selected.length === 0) return;
      selectedPrayers = selected.map(s => s.prayer);
    }

    const activeEditor = vscode.window.activeTextEditor;
    const currentCode = activeEditor?.selection && !activeEditor.selection.isEmpty 
      ? activeEditor.document.getText(activeEditor.selection)
      : '';

    const prompt = await vscode.window.showInputBox({
      prompt: 'Enter your base prompt',
      placeHolder: 'e.g., "Refactor this code to use modern patterns"',
      value: currentCode ? 'Refactor this code:' : ''
    });

    if (!prompt) return;

    const masterPrompt = this.buildMasterPrompt(prompt, selectedPrayers, currentCode);
    
    await vscode.env.clipboard.writeText(masterPrompt);
    
    // Update usage statistics
    selectedPrayers.forEach(prayer => {
      prayer.usage.count++;
      prayer.usage.lastUsed = new Date();
    });
    await this.savePrayers();

    vscode.window.showInformationMessage(
      `🔮 Master prompt copied to clipboard! (${masterPrompt.length} chars)`,
      'View Prompt'
    ).then(choice => {
      if (choice === 'View Prompt') {
        this.showPromptPreview(masterPrompt);
      }
    });
  }

  private buildMasterPrompt(basePrompt: string, prayers: IPocketedPrayer[], currentCode: string): string {
    let masterPrompt = '';

    // Project context
    if (this.projectContext) {
      masterPrompt += `# Project Context\n`;
      masterPrompt += `Project: ${this.projectContext.projectName} (${this.projectContext.projectType})\n`;
      masterPrompt += `Languages: ${this.projectContext.languages.join(', ')}\n`;
      masterPrompt += `Frameworks: ${this.projectContext.frameworks.join(', ')}\n`;
      
      if (Object.keys(this.projectContext.variables).length > 0) {
        masterPrompt += `Variables:\n`;
        Object.entries(this.projectContext.variables).forEach(([key, value]) => {
          masterPrompt += `- ${key}: ${value}\n`;
        });
      }
      masterPrompt += '\n';
    }

    // Prayers (rules/guidelines)
    if (prayers.length > 0) {
      masterPrompt += `# Rules & Guidelines\n`;
      prayers.forEach((prayer, index) => {
        masterPrompt += `${index + 1}. **${prayer.name}** (${prayer.category}):\n`;
        masterPrompt += `   ${prayer.prompt}\n`;
        if (prayer.context) {
          masterPrompt += `   Context: ${prayer.context}\n`;
        }
        if (prayer.code) {
          masterPrompt += `   Example:\n\`\`\`${prayer.language}\n${prayer.code}\n\`\`\`\n`;
        }
        masterPrompt += '\n';
      });
    }

    // Base prompt
    masterPrompt += `# Task\n${basePrompt}\n\n`;

    // Current code
    if (currentCode) {
      const language = vscode.window.activeTextEditor?.document.languageId || 'text';
      masterPrompt += `# Code to Modify\n\`\`\`${language}\n${currentCode}\n\`\`\`\n\n`;
    }

    // Additional context
    masterPrompt += `# Additional Context\n`;
    masterPrompt += `- Follow modern ${this.projectContext?.languages.join('/')} best practices\n`;
    masterPrompt += `- Maintain compatibility with the existing codebase\n`;
    masterPrompt += `- Provide clear explanations for any changes\n`;
    
    if (prayers.some(p => p.tags.includes('performance'))) {
      masterPrompt += `- Optimize for performance\n`;
    }
    if (prayers.some(p => p.tags.includes('security'))) {
      masterPrompt += `- Ensure security best practices\n`;
    }

    return masterPrompt;
  }

  private async showPromptPreview(prompt: string): Promise<void> {
    const doc = await vscode.workspace.openTextDocument({
      content: prompt,
      language: 'markdown'
    });
    await vscode.window.showTextDocument(doc);
  }

  private extractVariables(code: string): Record<string, string> {
    const variables: Record<string, string> = {};
    
    // Extract common patterns
    const patterns = [
      /const\s+(\w+)\s*=/g,
      /let\s+(\w+)\s*=/g,
      /var\s+(\w+)\s*=/g,
      /function\s+(\w+)/g,
      /class\s+(\w+)/g,
      /interface\s+(\w+)/g,
      /type\s+(\w+)/g,
      /enum\s+(\w+)/g
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        variables[match[1]] = 'identifier';
      }
    });

    return variables;
  }

  private async detectProjectContext(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return;

    try {
      const context: IProjectContext = {
        projectName: workspaceFolder.name,
        projectType: 'mixed',
        languages: [],
        frameworks: [],
        dependencies: [],
        variables: {},
        customPatterns: {}
      };

      // Detect project type and languages
      const files = await vscode.workspace.findFiles('**/*.{json,toml,ts,js,rs,md}', '**/node_modules/**', 20);
      
      const extensions = new Set<string>();
      files.forEach(file => {
        const ext = path.extname(file.path);
        extensions.add(ext);
      });

      // Map extensions to languages
      if (extensions.has('.ts')) context.languages.push('TypeScript');
      if (extensions.has('.js')) context.languages.push('JavaScript');
      if (extensions.has('.rs')) context.languages.push('Rust');
      if (extensions.has('.toml')) context.languages.push('TOML');
      if (extensions.has('.json')) context.languages.push('JSON');

      // Detect frameworks
      try {
        const packageJsonUri = vscode.Uri.joinPath(workspaceFolder.uri, 'package.json');
        const packageContent = await vscode.workspace.fs.readFile(packageJsonUri);
        const packageJson = JSON.parse(packageContent.toString());
        
        if (packageJson.dependencies || packageJson.devDependencies) {
          const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
          Object.keys(deps).forEach(dep => {
            context.dependencies.push(dep);
            
            // Detect frameworks
            if (dep.includes('anchor')) context.frameworks.push('Anchor');
            if (dep.includes('solana')) context.frameworks.push('Solana');
            if (dep.includes('react')) context.frameworks.push('React');
            if (dep.includes('next')) context.frameworks.push('Next.js');
            if (dep.includes('vscode')) context.frameworks.push('VS Code Extension');
          });
        }
      } catch (error) {
        // No package.json or error reading it
      }

      // Detect Anchor project
      try {
        const anchorTomlUri = vscode.Uri.joinPath(workspaceFolder.uri, 'Anchor.toml');
        await vscode.workspace.fs.stat(anchorTomlUri);
        context.projectType = 'anchor-program';
        if (!context.frameworks.includes('Anchor')) {
          context.frameworks.push('Anchor');
        }
      } catch {
        // No Anchor.toml
      }

      // Detect Wija project
      try {
        const wijaConfigUri = vscode.Uri.joinPath(workspaceFolder.uri, '.wija');
        await vscode.workspace.fs.stat(wijaConfigUri);
        context.projectType = 'wija-workspace';
        context.frameworks.push('Wija');
      } catch {
        // No .wija file
      }

      this.projectContext = context;
    } catch (error) {
      console.error('Error detecting project context:', error);
    }
  }

  private async initializeVault(): Promise<void> {
    try {
      await fs.mkdir(this.vaultPath, { recursive: true });
    } catch (error) {
      console.error('Error initializing vault:', error);
    }
  }

  private async loadPrayers(): Promise<void> {
    try {
      const prayersPath = path.join(this.vaultPath, 'prayers.json');
      const content = await fs.readFile(prayersPath, 'utf8');
      this.prayers = JSON.parse(content).map((p: any) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
        usage: {
          ...p.usage,
          lastUsed: p.usage.lastUsed ? new Date(p.usage.lastUsed) : undefined
        }
      }));
    } catch (error) {
      // File doesn't exist or error reading it
      this.prayers = [];
    }
  }

  private async savePrayers(): Promise<void> {
    try {
      const prayersPath = path.join(this.vaultPath, 'prayers.json');
      await fs.writeFile(prayersPath, JSON.stringify(this.prayers, null, 2));
    } catch (error) {
      console.error('Error saving prayers:', error);
    }
  }

  private async loadRecipes(): Promise<void> {
    try {
      const recipesPath = path.join(this.vaultPath, 'recipes.json');
      const content = await fs.readFile(recipesPath, 'utf8');
      this.recipes = JSON.parse(content).map((r: any) => ({
        ...r,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt)
      }));
    } catch (error) {
      // File doesn't exist or error reading it
      this.recipes = [];
    }
  }

  private async saveRecipes(): Promise<void> {
    try {
      const recipesPath = path.join(this.vaultPath, 'recipes.json');
      await fs.writeFile(recipesPath, JSON.stringify(this.recipes, null, 2));
    } catch (error) {
      console.error('Error saving recipes:', error);
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Public Methods
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  async deletePrayer(prayerId: string): Promise<void> {
    this.prayers = this.prayers.filter(p => p.id !== prayerId);
    await this.savePrayers();
    this._onDidChangeTreeData.fire();
  }

  async editPrayer(prayerId: string): Promise<void> {
    const prayer = this.prayers.find(p => p.id === prayerId);
    if (!prayer) return;

    const name = await vscode.window.showInputBox({
      prompt: 'Prayer name',
      value: prayer.name
    });
    if (!name) return;

    const prompt = await vscode.window.showInputBox({
      prompt: 'Prayer prompt',
      value: prayer.prompt
    });
    if (!prompt) return;

    prayer.name = name;
    prayer.prompt = prompt;
    prayer.updatedAt = new Date();

    await this.savePrayers();
    this._onDidChangeTreeData.fire();
  }

  getPrayers(): IPocketedPrayer[] {
    return [...this.prayers];
  }

  getRecipes(): IPromptRecipe[] {
    return [...this.recipes];
  }

  getProjectContext(): IProjectContext | null {
    return this.projectContext;
  }
} 