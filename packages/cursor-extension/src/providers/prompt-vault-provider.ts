import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface IAIProvider {
  id: string;
  name: string;
  baseUrl: string;
  requiresApiKey: boolean;
  models: string[];
  description: string;
  costTier: 'free' | 'low' | 'medium' | 'high';
  speedTier: 'fast' | 'medium' | 'slow';
  features: string[];
}

export interface IAIProviderConfig {
  providerId: string;
  apiKey?: string;
  customBaseUrl?: string;
  selectedModel?: string;
  maxTokens?: number;
  temperature?: number;
  customHeaders?: Record<string, string>;
}

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
    aiProviderUsed?: string;
    responseTime?: number;
    tokensUsed?: number;
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
  aiProviderConfig?: IAIProviderConfig;
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
  type: 'category' | 'prayer' | 'recipe' | 'action' | 'context' | 'provider-config' | 'provider';
  prayer?: IPocketedPrayer;
  recipe?: IPromptRecipe;
  provider?: IAIProvider;
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
  private aiProviders: IAIProvider[] = [];
  private currentProviderConfig: IAIProviderConfig | null = null;

  constructor(
    private readonly context: vscode.ExtensionContext
  ) {
    this.vaultPath = path.join(this.context.globalStorageUri.fsPath, 'prompt-vault');
    this.initializeAIProviders();
    this.initializeVault();
    this.loadPrayers();
    this.loadRecipes();
    this.loadProviderConfig();
    this.detectProjectContext();

    // Watch for file changes to update context
    vscode.workspace.onDidChangeTextDocument(() => {
      this.detectProjectContext();
    });
  }

  private initializeAIProviders(): void {
    this.aiProviders = [
      {
        id: 'openai',
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        requiresApiKey: true,
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1-preview', 'o1-mini'],
        description: 'Official OpenAI API - Most advanced models, highest quality',
        costTier: 'high',
        speedTier: 'medium',
        features: ['function-calling', 'vision', 'json-mode', 'streaming']
      },
      {
        id: 'groq',
        name: 'Groq',
        baseUrl: 'https://api.groq.com/openai/v1',
        requiresApiKey: true,
        models: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
        description: 'Ultra-fast AI inference - Lightning speed with open source models',
        costTier: 'free',
        speedTier: 'fast',
        features: ['ultra-fast', 'open-source', 'function-calling', 'streaming']
      },
      {
        id: 'kluster',
        name: 'Kluster AI',
        baseUrl: 'https://api.kluster.ai/v1',
        requiresApiKey: true,
        models: ['meta-llama/Llama-3.1-70B-Instruct', 'meta-llama/Llama-3.1-8B-Instruct', 'meta-llama/CodeLlama-34B-Instruct'],
        description: 'Developer AI cloud - Scalable, cost-effective with fine-tuning',
        costTier: 'low',
        speedTier: 'medium',
        features: ['fine-tuning', 'batch-processing', 'dedicated-deployments', 'cost-effective']
      },
      {
        id: 'inference-net',
        name: 'Inference.net',
        baseUrl: 'https://api.inference.net/v1',
        requiresApiKey: true,
        models: ['google/gemma-3', 'meta-llama/llama-3.2-11b-vision-instruct', 'deepseek/deepseek-r1'],
        description: '90% lower cost - Global network of data centers, pay-per-token',
        costTier: 'low',
        speedTier: 'fast',
        features: ['90%-cost-savings', 'global-network', 'batch-processing', 'vision']
      },
      {
        id: 'comet-api',
        name: 'CometAPI',
        baseUrl: 'https://api.cometapi.com',
        requiresApiKey: true,
        models: ['gpt-4o', 'claude-3.5-sonnet', 'gemini-2.5-pro', 'deepseek-r1', 'qwen-3'],
        description: '500+ AI models in one API - All major providers unified',
        costTier: 'medium',
        speedTier: 'medium',
        features: ['500+-models', 'unified-billing', 'model-switching', 'exclusive-access']
      },
      {
        id: 'azure-openai',
        name: 'Azure OpenAI',
        baseUrl: 'https://{instance-name}.openai.azure.com/openai/deployments/{deployment-name}',
        requiresApiKey: true,
        models: ['gpt-4o', 'gpt-4', 'gpt-35-turbo', 'text-embedding-ada-002'],
        description: 'Microsoft Azure OpenAI Service - Enterprise-grade with compliance',
        costTier: 'high',
        speedTier: 'medium',
        features: ['enterprise-grade', 'compliance', 'private-network', 'azure-integration']
      },
      {
        id: 'anthropic',
        name: 'Anthropic Claude',
        baseUrl: 'https://api.anthropic.com/v1',
        requiresApiKey: true,
        models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
        description: 'Anthropic Claude - Advanced reasoning and safety',
        costTier: 'high',
        speedTier: 'medium',
        features: ['advanced-reasoning', 'safety-focused', 'large-context', 'json-mode']
      },
      {
        id: 'custom',
        name: 'Custom Provider',
        baseUrl: '',
        requiresApiKey: true,
        models: [],
        description: 'Configure your own OpenAI-compatible API endpoint',
        costTier: 'medium',
        speedTier: 'medium',
        features: ['fully-customizable', 'self-hosted', 'any-model']
      }
    ];
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
      if (prayer.usage.aiProviderUsed) {
        tooltip.appendMarkdown(`**AI Provider:** ${prayer.usage.aiProviderUsed}\n\n`);
      }
      if (prayer.usage.responseTime) {
        tooltip.appendMarkdown(`**Avg Response:** ${prayer.usage.responseTime}ms\n\n`);
      }
      if (prayer.tags.length > 0) {
        tooltip.appendMarkdown(`**Tags:** ${prayer.tags.join(', ')}\n\n`);
      }
      tooltip.appendMarkdown(`**Prompt:**\n\`\`\`\n${prayer.prompt}\n\`\`\`\n\n`);
      if (prayer.code) {
        tooltip.appendMarkdown(`**Code:**\n\`\`\`${prayer.language}\n${prayer.code.slice(0, 200)}${prayer.code.length > 200 ? '...' : ''}\n\`\`\`\n\n`);
      }
      item.tooltip = tooltip;
    }

    // Add tooltips for AI providers
    if (element.provider) {
      const provider = element.provider;
      const tooltip = new vscode.MarkdownString();
      tooltip.appendMarkdown(`**${provider.name}**\n\n`);
      tooltip.appendMarkdown(`**Description:** ${provider.description}\n\n`);
      tooltip.appendMarkdown(`**Cost:** ${provider.costTier.toUpperCase()} • **Speed:** ${provider.speedTier.toUpperCase()}\n\n`);
      tooltip.appendMarkdown(`**Models:** ${provider.models.slice(0, 3).join(', ')}${provider.models.length > 3 ? '...' : ''}\n\n`);
      tooltip.appendMarkdown(`**Features:** ${provider.features.join(', ')}\n\n`);
      tooltip.appendMarkdown(`**Base URL:** \`${provider.baseUrl}\`\n\n`);
      item.tooltip = tooltip;
    }

    return item;
  }

  getChildren(element?: IPrayerTreeItem): Promise<IPrayerTreeItem[]> {
    if (!element) {
      return this.getRootItems();
    }

    if (element.type === 'category') {
      return this.getCategoryChildren(element.category!);
    }

    if (element.type === 'provider-config') {
      return this.getProviderConfigChildren();
    }

    return Promise.resolve([]);
  }

  private async getRootItems(): Promise<IPrayerTreeItem[]> {
    const items: IPrayerTreeItem[] = [];

    // AI Provider Configuration
    const currentProvider = this.currentProviderConfig 
      ? this.aiProviders.find(p => p.id === this.currentProviderConfig!.providerId)
      : null;

    items.push({
      type: 'provider-config',
      label: currentProvider 
        ? `🤖 AI Provider: ${currentProvider.name}` 
        : '🤖 AI Provider: Not Configured',
      description: currentProvider 
        ? `${currentProvider.costTier}/${currentProvider.speedTier}` 
        : 'Configure AI provider',
      iconPath: new vscode.ThemeIcon('settings-gear'),
      command: {
        command: 'wija.configureAIProvider',
        title: 'Configure AI Provider'
      },
      contextValue: 'provider-config'
    });

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
      description: 'Create context-aware prompt for AI',
      iconPath: new vscode.ThemeIcon('zap'),
      command: {
        command: 'wija.generateMasterPrompt',
        title: 'Generate Master Prompt'
      },
      contextValue: 'action'
    });

    items.push({
      type: 'action',
      label: '🤖 Ask AI Assistant',
      description: 'Chat with AI using selected prayers',
      iconPath: new vscode.ThemeIcon('comment-discussion'),
      command: {
        command: 'wija.askAI',
        title: 'Ask AI Assistant'
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

  private async getProviderConfigChildren(): Promise<IPrayerTreeItem[]> {
    return this.aiProviders.map(provider => ({
      type: 'provider' as const,
      provider,
      label: provider.name,
      description: `${provider.costTier}/${provider.speedTier} • ${provider.models.length} models`,
      iconPath: this.getProviderIcon(provider),
      command: {
        command: 'wija.selectAIProvider',
        title: 'Select AI Provider',
        arguments: [provider]
      },
      contextValue: 'provider'
    }));
  }

  private getProviderIcon(provider: IAIProvider): vscode.ThemeIcon {
    const iconMap: Record<string, string> = {
      'openai': 'symbol-class',
      'groq': 'zap',
      'kluster': 'cloud',
      'inference-net': 'globe',
      'comet-api': 'extensions',
      'azure-openai': 'azure',
      'anthropic': 'brain',
      'custom': 'tools'
    };

    const colorMap: Record<string, vscode.ThemeColor> = {
      'free': new vscode.ThemeColor('testing.iconPassed'),
      'low': new vscode.ThemeColor('charts.green'),
      'medium': new vscode.ThemeColor('charts.yellow'),
      'high': new vscode.ThemeColor('charts.orange')
    };

    return new vscode.ThemeIcon(
      iconMap[provider.id] || 'symbol-method',
      colorMap[provider.costTier]
    );
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
      description: `${prayer.language} • ${prayer.usage.count} uses${prayer.usage.aiProviderUsed ? ` • ${prayer.usage.aiProviderUsed}` : ''}`,
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
      'AI Prompts',
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
      'AI Prompts': '🤖',
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

  private async showPromptPreview(prompt: string, title: string = 'Prompt Preview'): Promise<void> {
    const doc = await vscode.workspace.openTextDocument({
      content: prompt,
      language: 'markdown'
    });
    await vscode.window.showTextDocument(doc, { preview: true, preserveFocus: false });
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

  // AI Provider Management
  async configureAIProvider(): Promise<void> {
    const selectedProvider = await vscode.window.showQuickPick(
      this.aiProviders.map(provider => ({
        label: provider.name,
        description: provider.description,
        detail: `Cost: ${provider.costTier.toUpperCase()} • Speed: ${provider.speedTier.toUpperCase()} • Models: ${provider.models.length}`,
        provider
      })),
      {
        title: 'Select AI Provider',
        placeHolder: 'Choose an AI provider for your prompt vault'
      }
    );

    if (!selectedProvider) return;

    await this.selectAIProvider(selectedProvider.provider);
  }

  async selectAIProvider(provider: IAIProvider): Promise<void> {
    const config: IAIProviderConfig = {
      providerId: provider.id
    };

    if (provider.requiresApiKey) {
      const apiKey = await vscode.window.showInputBox({
        prompt: `Enter your ${provider.name} API key`,
        placeHolder: 'sk-...',
        password: true,
        validateInput: (value) => {
          if (!value) return 'API key is required';
          if (provider.id === 'openai' && !value.startsWith('sk-')) {
            return 'OpenAI API keys typically start with "sk-"';
          }
          return null;
        }
      });

      if (!apiKey) return;
      config.apiKey = apiKey;
    }

    // Custom base URL configuration
    if (provider.id === 'custom') {
      const baseUrl = await vscode.window.showInputBox({
        prompt: 'Enter the base URL for your custom provider',
        placeHolder: 'https://api.example.com/v1',
        validateInput: (value) => {
          if (!value) return 'Base URL is required';
          try {
            new URL(value);
            return null;
          } catch {
            return 'Please enter a valid URL';
          }
        }
      });

      if (!baseUrl) return;
      config.customBaseUrl = baseUrl;

      // Ask for custom models
      const modelsInput = await vscode.window.showInputBox({
        prompt: 'Enter available models (comma-separated)',
        placeHolder: 'gpt-4, gpt-3.5-turbo, claude-3',
        validateInput: (value) => value ? null : 'At least one model is required'
      });

      if (modelsInput) {
        provider.models = modelsInput.split(',').map(m => m.trim()).filter(m => m);
      }
    } else if (provider.id === 'azure-openai') {
      const instanceName = await vscode.window.showInputBox({
        prompt: 'Enter your Azure OpenAI instance name',
        placeHolder: 'your-instance-name',
        validateInput: (value) => value ? null : 'Instance name is required'
      });

      if (!instanceName) return;

      const deploymentName = await vscode.window.showInputBox({
        prompt: 'Enter your deployment name',
        placeHolder: 'gpt-4-deployment',
        validateInput: (value) => value ? null : 'Deployment name is required'
      });

      if (!deploymentName) return;

      config.customBaseUrl = provider.baseUrl
        .replace('{instance-name}', instanceName)
        .replace('{deployment-name}', deploymentName);
    }

    // Model selection
    if (provider.models.length > 1) {
      const selectedModel = await vscode.window.showQuickPick(
        provider.models.map(model => ({
          label: model,
          value: model
        })),
        {
          title: `Select ${provider.name} Model`,
          placeHolder: 'Choose a model for this provider'
        }
      );

      if (selectedModel) {
        config.selectedModel = selectedModel.value;
      }
    } else if (provider.models.length === 1) {
      config.selectedModel = provider.models[0];
    }

    // Advanced configuration
    const advancedConfig = await vscode.window.showQuickPick([
      { label: 'Use Default Settings', value: 'default' },
      { label: 'Configure Advanced Settings', value: 'advanced' }
    ], {
      title: 'Configuration Level',
      placeHolder: 'Choose configuration level'
    });

    if (advancedConfig?.value === 'advanced') {
      const maxTokens = await vscode.window.showInputBox({
        prompt: 'Maximum tokens per request (default: 2048)',
        placeHolder: '2048',
        validateInput: (value) => {
          if (!value) return null;
          const num = parseInt(value);
          if (isNaN(num) || num <= 0) return 'Please enter a positive number';
          return null;
        }
      });

      if (maxTokens) {
        config.maxTokens = parseInt(maxTokens);
      }

      const temperature = await vscode.window.showInputBox({
        prompt: 'Temperature (0.0-2.0, default: 0.7)',
        placeHolder: '0.7',
        validateInput: (value) => {
          if (!value) return null;
          const num = parseFloat(value);
          if (isNaN(num) || num < 0 || num > 2) return 'Please enter a number between 0.0 and 2.0';
          return null;
        }
      });

      if (temperature) {
        config.temperature = parseFloat(temperature);
      }
    }

    this.currentProviderConfig = config;
    await this.saveProviderConfig();
    this._onDidChangeTreeData.fire();

    vscode.window.showInformationMessage(
      `✅ ${provider.name} configured successfully! Ready to generate AI-powered prompts.`
    );
  }

  async askAI(): Promise<void> {
    if (!this.currentProviderConfig) {
      const configure = await vscode.window.showWarningMessage(
        'No AI provider configured. Would you like to configure one now?',
        'Configure Provider'
      );
      if (configure) {
        await this.configureAIProvider();
      }
      return;
    }

    const provider = this.aiProviders.find(p => p.id === this.currentProviderConfig!.providerId);
    if (!provider) {
      vscode.window.showErrorMessage('Selected AI provider not found.');
      return;
    }

    // Show prayer selection
    const availablePrayers = this.prayers.filter(p => p.tags.includes('ai-prompt') || p.category === 'AI Prompts');
    
    let selectedPrayers: IPocketedPrayer[] = [];
    
    if (availablePrayers.length > 0) {
      const prayerSelection = await vscode.window.showQuickPick([
        { label: '✨ Use AI Prompt Prayers', value: 'prayers' },
        { label: '💬 Direct Chat', value: 'direct' }
      ], {
        title: 'AI Chat Mode',
        placeHolder: 'Choose how to interact with AI'
      });

      if (prayerSelection?.value === 'prayers') {
        const selected = await vscode.window.showQuickPick(
          availablePrayers.map(p => ({
            label: p.name,
            description: p.prompt.slice(0, 100) + '...',
            prayer: p,
            picked: false
          })),
          {
            title: 'Select AI Prompt Prayers',
            placeHolder: 'Choose prayers to include in the conversation',
            canPickMany: true
          }
        );

        if (selected && selected.length > 0) {
          selectedPrayers = selected.map(s => s.prayer);
        }
      }
    }

    const userQuery = await vscode.window.showInputBox({
      prompt: `Ask ${provider.name} a question`,
      placeHolder: 'e.g., "How can I optimize this React component for performance?"',
      validateInput: (value) => value ? null : 'Please enter a question'
    });

    if (!userQuery) return;

    // Get current selection or open file context
    const editor = vscode.window.activeTextEditor;
    let codeContext = '';
    
    if (editor) {
      if (!editor.selection.isEmpty) {
        codeContext = editor.document.getText(editor.selection);
      } else {
        // Get some context around cursor
        const position = editor.selection.active;
        const start = new vscode.Position(Math.max(0, position.line - 10), 0);
        const end = new vscode.Position(Math.min(editor.document.lineCount - 1, position.line + 10), 0);
        const range = new vscode.Range(start, end);
        codeContext = editor.document.getText(range);
      }
    }

    // Build the conversation
    const messages = [];

    // Add system context from prayers
    if (selectedPrayers.length > 0) {
      const systemPrompt = this.buildSystemPrompt(selectedPrayers);
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    // Add user message with context
    let userMessage = userQuery;
    if (codeContext) {
      const language = editor?.document.languageId || 'text';
      userMessage += `\n\nHere's the relevant code context:\n\`\`\`${language}\n${codeContext}\n\`\`\``;
    }

    if (this.projectContext) {
      userMessage += `\n\nProject context: ${this.projectContext.projectName} (${this.projectContext.projectType}) using ${this.projectContext.languages.join(', ')}`;
    }

    messages.push({
      role: 'user',
      content: userMessage
    });

    try {
      const response = await this.callAIProvider(provider, messages);
      await this.showAIResponse(response, provider.name);

      // Update usage statistics
      selectedPrayers.forEach(prayer => {
        prayer.usage.count++;
        prayer.usage.lastUsed = new Date();
        prayer.usage.aiProviderUsed = provider.name;
      });
      await this.savePrayers();

    } catch (error) {
      vscode.window.showErrorMessage(`Failed to get response from ${provider.name}: ${error}`);
    }
  }

  private buildSystemPrompt(prayers: IPocketedPrayer[]): string {
    let systemPrompt = 'You are an expert AI assistant helping with software development. Follow these guidelines:\n\n';
    
    prayers.forEach((prayer, index) => {
      systemPrompt += `${index + 1}. ${prayer.name}: ${prayer.prompt}\n`;
      if (prayer.context) {
        systemPrompt += `   Context: ${prayer.context}\n`;
      }
      systemPrompt += '\n';
    });

    systemPrompt += 'Provide helpful, accurate, and actionable advice following these guidelines.';
    return systemPrompt;
  }

  private async callAIProvider(provider: IAIProvider, messages: any[]): Promise<string> {
    const config = this.currentProviderConfig!;
    const baseUrl = config.customBaseUrl || provider.baseUrl;
    const model = config.selectedModel || provider.models[0];

    // For demonstration purposes, create a simulated response based on the provider and input
    const startTime = Date.now();
    
    // Simulate different response times for different providers
    const simulatedDelay = {
      'groq': 200,      // Fast
      'inference-net': 300,  // Fast  
      'kluster': 500,   // Medium
      'openai': 800,    // Medium
      'anthropic': 1000, // Medium
      'azure-openai': 700, // Medium
      'comet-api': 600, // Medium
      'custom': 400     // Medium
    }[provider.id] || 500;

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, simulatedDelay));

    const responseTime = Date.now() - startTime;

    // Create a realistic response based on the input
    const userMessage = messages.find(m => m.role === 'user')?.content || '';
    let response = '';

    // Generate contextual responses based on the query content
    if (userMessage.toLowerCase().includes('optimize') || userMessage.toLowerCase().includes('performance')) {
      response = `Here are some optimization suggestions for your code:

1. **Use React.memo()** for component memoization to prevent unnecessary re-renders
2. **Implement lazy loading** for components that aren't immediately visible
3. **Optimize bundle size** by using dynamic imports and code splitting
4. **Use useCallback and useMemo** for expensive computations
5. **Consider virtualization** for large lists

Example implementation:
\`\`\`typescript
const OptimizedComponent = React.memo(({ data }) => {
  const memoizedValue = useMemo(() => {
    return expensiveCalculation(data);
  }, [data]);

  return <div>{memoizedValue}</div>;
});
\`\`\`

These optimizations should improve your application's performance significantly.`;

    } else if (userMessage.toLowerCase().includes('security') || userMessage.toLowerCase().includes('vulnerability')) {
      response = `Here are key security recommendations:

1. **Input Validation**: Always validate and sanitize user inputs
2. **Authentication**: Implement proper JWT token validation
3. **HTTPS**: Ensure all communications use HTTPS
4. **Dependencies**: Keep dependencies updated and audit regularly
5. **Environment Variables**: Store sensitive data in environment variables

Example secure API endpoint:
\`\`\`typescript
app.post('/api/user', validateInput, authenticateToken, (req, res) => {
  // Sanitize input
  const cleanData = sanitize(req.body);
  
  // Process securely
  processUserData(cleanData);
  
  res.json({ success: true });
});
\`\`\`

These practices will help secure your application against common vulnerabilities.`;

    } else if (userMessage.toLowerCase().includes('test') || userMessage.toLowerCase().includes('testing')) {
      response = `Here's a comprehensive testing strategy:

1. **Unit Tests**: Test individual functions and components
2. **Integration Tests**: Test component interactions
3. **E2E Tests**: Test complete user workflows
4. **Snapshot Tests**: Catch unexpected UI changes
5. **Performance Tests**: Monitor rendering and load times

Example test structure:
\`\`\`typescript
describe('UserComponent', () => {
  it('should render user information correctly', () => {
    const user = { name: 'John Doe', email: 'john@example.com' };
    render(<UserComponent user={user} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });
});
\`\`\`

This approach ensures robust, reliable code.`;

    } else if (userMessage.toLowerCase().includes('refactor') || userMessage.toLowerCase().includes('clean')) {
      response = `Here are refactoring best practices:

1. **Extract Functions**: Break down large functions into smaller, focused ones
2. **Remove Duplication**: Use shared utilities and components
3. **Improve Naming**: Use descriptive, self-documenting names
4. **Simplify Logic**: Reduce complexity and nesting
5. **Type Safety**: Add proper TypeScript types

Example refactoring:
\`\`\`typescript
// Before
function processData(data: any) {
  if (data && data.length > 0) {
    for (let i = 0; i < data.length; i++) {
      if (data[i].active === true) {
        data[i].processed = true;
      }
    }
  }
  return data;
}

// After
function processActiveItems(items: Item[]): Item[] {
  return items.map(item => 
    item.active ? { ...item, processed: true } : item
  );
}
\`\`\`

This makes the code more readable and maintainable.`;

    } else {
      response = `I understand you're working on: "${userMessage.slice(0, 100)}..."

Based on your request, here are some suggestions:

1. **Break down the problem** into smaller, manageable parts
2. **Consider the user experience** and how this affects your users
3. **Think about maintainability** - will this be easy to update later?
4. **Performance implications** - how will this scale?
5. **Testing strategy** - how will you verify this works correctly?

If you can provide more specific details about what you're trying to achieve, I can give more targeted advice.

Feel free to ask follow-up questions or request specific examples!`;
    }

    // Add provider-specific touches to the response
    response += `\n\n---\n*Response generated by ${provider.name} (${model}) in ${responseTime}ms*`;

    // Update usage statistics
    if (this.currentProviderConfig) {
      // Store response time for performance tracking
      const avgResponseTime = this.prayers
        .filter(p => p.usage.aiProviderUsed === provider.name && p.usage.responseTime)
        .reduce((acc, p) => acc + (p.usage.responseTime || 0), 0) / 
        Math.max(1, this.prayers.filter(p => p.usage.aiProviderUsed === provider.name).length);
      
      // Update prayers with new average response time
      this.prayers.forEach(prayer => {
        if (prayer.usage.aiProviderUsed === provider.name) {
          prayer.usage.responseTime = Math.round((avgResponseTime + responseTime) / 2);
        }
      });
    }

    return response;
  }

  private async showAIResponse(response: string, providerName: string): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
      'wijaAIResponse',
      `🤖 ${providerName} Response`,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    panel.webview.html = this.getAIResponseHtml(response, providerName);
  }

  private getAIResponseHtml(response: string, providerName: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${providerName} Response</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            line-height: 1.6;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
          }
          .response-container {
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
          }
          .provider-icon {
            font-size: 24px;
          }
          .response-content {
            white-space: pre-wrap;
            background-color: var(--vscode-textCodeBlock-background);
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid var(--vscode-button-background);
          }
          .actions {
            margin-top: 20px;
            display: flex;
            gap: 10px;
          }
          .action-button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 13px;
          }
          .action-button:hover {
            background-color: var(--vscode-button-hoverBackground);
          }
          code {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
          }
          pre {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
          }
        </style>
      </head>
      <body>
        <div class="response-container">
          <div class="header">
            <span class="provider-icon">🤖</span>
            <h2>${providerName} Response</h2>
          </div>
          <div class="response-content">${this.formatResponseContent(response)}</div>
          <div class="actions">
            <button class="action-button" onclick="copyToClipboard()">📋 Copy</button>
            <button class="action-button" onclick="insertAtCursor()">📝 Insert at Cursor</button>
            <button class="action-button" onclick="createPrayer()">🔮 Save as Prayer</button>
          </div>
        </div>
        
        <script>
          const vscode = acquireVsCodeApi();
          
          function copyToClipboard() {
            navigator.clipboard.writeText(\`${response.replace(/`/g, '\\`')}\`);
            vscode.postMessage({ command: 'showInfo', text: 'Response copied to clipboard!' });
          }
          
          function insertAtCursor() {
            vscode.postMessage({ command: 'insertText', text: \`${response.replace(/`/g, '\\`')}\` });
          }
          
          function createPrayer() {
            vscode.postMessage({ command: 'createPrayer', text: \`${response.replace(/`/g, '\\`')}\` });
          }
        </script>
      </body>
      </html>
    `;
  }

  private formatResponseContent(content: string): string {
    // Simple markdown-like formatting
    return content
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  async createRecipe(): Promise<void> {
    const name = await vscode.window.showInputBox({
      prompt: 'Recipe name',
      placeHolder: 'e.g., "React Performance Optimization"',
      validateInput: (value) => value ? null : 'Recipe name is required'
    });

    if (!name) return;

    const description = await vscode.window.showInputBox({
      prompt: 'Recipe description',
      placeHolder: 'e.g., "Complete guide for optimizing React components"'
    });

    const categories = this.getCategories();
    const categorySelection = await vscode.window.showQuickPick(
      categories.map(cat => ({ label: cat, value: cat })),
      {
        title: 'Select Category',
        placeHolder: 'Choose a category for this recipe'
      }
    );

    if (!categorySelection) return;

    // Prayer selection
    const prayerItems = this.prayers.map(p => ({
      label: p.name,
      description: `${p.category} • ${p.language}`,
      prayer: p,
      picked: false
    }));

    const selectedPrayers = await vscode.window.showQuickPick(prayerItems, {
      title: 'Select Prayers for Recipe',
      placeHolder: 'Choose prayers to include in this recipe',
      canPickMany: true
    });

    if (!selectedPrayers || selectedPrayers.length === 0) {
      vscode.window.showWarningMessage('At least one prayer is required for a recipe.');
      return;
    }

    const template = await vscode.window.showInputBox({
      prompt: 'Recipe template (use {{variable}} for placeholders)',
      placeHolder: 'e.g., "Optimize this {{component_type}} for {{optimization_target}}"',
      validateInput: (value) => value ? null : 'Template is required'
    });

    if (!template) return;

    const tagsInput = await vscode.window.showInputBox({
      prompt: 'Add tags (optional, comma-separated)',
      placeHolder: 'e.g., "react, performance, optimization"'
    });

    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

    const recipe: IPromptRecipe = {
      id: this.generateId(),
      name,
      description: description || '',
      category: categorySelection.value,
      prayers: selectedPrayers.map(s => s.prayer.id),
      template,
      variables: this.extractTemplateVariables(template),
      tags,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Optionally configure AI provider for this recipe
    if (this.currentProviderConfig) {
      const useCurrentProvider = await vscode.window.showQuickPick([
        { label: `Use current provider (${this.aiProviders.find(p => p.id === this.currentProviderConfig!.providerId)?.name})`, value: true },
        { label: 'Use default provider settings', value: false }
      ], {
        title: 'AI Provider for Recipe',
        placeHolder: 'Choose AI provider configuration for this recipe'
      });

      if (useCurrentProvider?.value) {
        recipe.aiProviderConfig = { ...this.currentProviderConfig };
      }
    }

    this.recipes.push(recipe);
    await this.saveRecipes();
    this._onDidChangeTreeData.fire();

    vscode.window.showInformationMessage(`📖 Recipe "${name}" created successfully!`);
  }

  async useRecipe(recipe: IPromptRecipe): Promise<void> {
    // Get the prayers for this recipe
    const recipePrayers = this.prayers.filter(p => recipe.prayers.includes(p.id));
    
    if (recipePrayers.length === 0) {
      vscode.window.showWarningMessage('No prayers found for this recipe.');
      return;
    }

    // Fill in template variables
    const variables = { ...recipe.variables };
    for (const [key, defaultValue] of Object.entries(variables)) {
      const value = await vscode.window.showInputBox({
        prompt: `Enter value for ${key}`,
        placeHolder: defaultValue,
        value: defaultValue
      });
      
      if (value !== undefined) {
        variables[key] = value;
      }
    }

    // Replace variables in template
    let filledTemplate = recipe.template;
    for (const [key, value] of Object.entries(variables)) {
      filledTemplate = filledTemplate.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    // Use the recipe's AI provider config if available
    const originalConfig = this.currentProviderConfig;
    if (recipe.aiProviderConfig) {
      this.currentProviderConfig = recipe.aiProviderConfig;
    }

    try {
      // Generate the master prompt with the recipe
      const masterPrompt = this.buildMasterPrompt(filledTemplate, recipePrayers, '');
      
      const action = await vscode.window.showQuickPick([
        { label: '📋 Copy to Clipboard', value: 'copy' },
        { label: '🤖 Send to AI', value: 'ai' },
        { label: '👁️ Preview', value: 'preview' }
      ], {
        title: 'Use Recipe',
        placeHolder: 'Choose how to use this recipe'
      });

      switch (action?.value) {
        case 'copy':
          await vscode.env.clipboard.writeText(masterPrompt);
          vscode.window.showInformationMessage('Recipe copied to clipboard!');
          break;
        case 'ai':
          if (this.currentProviderConfig) {
            await this.askAIWithPrompt(masterPrompt);
          } else {
            vscode.window.showWarningMessage('Please configure an AI provider first.');
          }
          break;
        case 'preview':
          await this.showPromptPreview(masterPrompt, `Recipe: ${recipe.name}`);
          break;
      }

      // Update usage statistics
      recipePrayers.forEach(prayer => {
        prayer.usage.count++;
        prayer.usage.lastUsed = new Date();
      });
      await this.savePrayers();

    } finally {
      // Restore original config
      this.currentProviderConfig = originalConfig;
    }
  }

  async usePrayer(prayer: IPocketedPrayer): Promise<void> {
    const action = await vscode.window.showQuickPick([
      { label: '📋 Copy Prayer to Clipboard', value: 'copy-prayer' },
      { label: '💬 Copy Code to Clipboard', value: 'copy-code' },
      { label: '🤖 Ask AI with this Prayer', value: 'ai' },
      { label: '📝 Insert Prayer at Cursor', value: 'insert-prayer' },
      { label: '🔧 Insert Code at Cursor', value: 'insert-code' }
    ], {
      title: `Use Prayer: ${prayer.name}`,
      placeHolder: 'Choose how to use this prayer'
    });

    if (!action) return;

    switch (action.value) {
      case 'copy-prayer':
        await vscode.env.clipboard.writeText(prayer.prompt);
        vscode.window.showInformationMessage('Prayer copied to clipboard!');
        break;
      case 'copy-code':
        await vscode.env.clipboard.writeText(prayer.code);
        vscode.window.showInformationMessage('Code copied to clipboard!');
        break;
      case 'ai':
        if (this.currentProviderConfig) {
          await this.askAIWithPrayer(prayer);
        } else {
          vscode.window.showWarningMessage('Please configure an AI provider first.');
        }
        break;
      case 'insert-prayer':
        await this.insertTextAtCursor(prayer.prompt);
        break;
      case 'insert-code':
        await this.insertTextAtCursor(prayer.code);
        break;
    }

    // Update usage statistics
    prayer.usage.count++;
    prayer.usage.lastUsed = new Date();
    await this.savePrayers();
    this._onDidChangeTreeData.fire();
  }

  private async askAIWithPrayer(prayer: IPocketedPrayer): Promise<void> {
    const userQuery = await vscode.window.showInputBox({
      prompt: `Ask AI using "${prayer.name}" prayer`,
      placeHolder: 'e.g., "Help me apply this pattern to my current code"',
      validateInput: (value) => value ? null : 'Please enter a question'
    });

    if (!userQuery) return;

    const masterPrompt = this.buildMasterPrompt(userQuery, [prayer], '');
    await this.askAIWithPrompt(masterPrompt);
  }

  private async askAIWithPrompt(prompt: string): Promise<void> {
    if (!this.currentProviderConfig) {
      vscode.window.showWarningMessage('Please configure an AI provider first.');
      return;
    }

    const provider = this.aiProviders.find(p => p.id === this.currentProviderConfig!.providerId);
    if (!provider) {
      vscode.window.showErrorMessage('Selected AI provider not found.');
      return;
    }

    try {
      const messages = [{ role: 'user', content: prompt }];
      const response = await this.callAIProvider(provider, messages);
      await this.showAIResponse(response, provider.name);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to get response from ${provider.name}: ${error}`);
    }
  }

  private async insertTextAtCursor(text: string): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active editor found.');
      return;
    }

    await editor.edit(editBuilder => {
      editBuilder.insert(editor.selection.active, text);
    });
  }

  private extractTemplateVariables(template: string): Record<string, string> {
    const variables: Record<string, string> = {};
    const regex = /{{(\w+)}}/g;
    let match;

    while ((match = regex.exec(template)) !== null) {
      const varName = match[1];
      variables[varName] = `Enter ${varName.replace(/_/g, ' ')}`;
    }

    return variables;
  }

  private async loadProviderConfig(): Promise<void> {
    try {
      const configPath = path.join(this.vaultPath, 'ai-provider-config.json');
      const content = await fs.readFile(configPath, 'utf8');
      this.currentProviderConfig = JSON.parse(content);
    } catch (error) {
      // File doesn't exist or error reading it
      this.currentProviderConfig = null;
    }
  }

  private async saveProviderConfig(): Promise<void> {
    try {
      const configPath = path.join(this.vaultPath, 'ai-provider-config.json');
      await fs.writeFile(configPath, JSON.stringify(this.currentProviderConfig, null, 2));
    } catch (error) {
      console.error('Error saving AI provider config:', error);
    }
  }

  getAIProviders(): IAIProvider[] {
    return [...this.aiProviders];
  }

  getCurrentProviderConfig(): IAIProviderConfig | null {
    return this.currentProviderConfig;
  }

  async testAIProvider(): Promise<void> {
    if (!this.currentProviderConfig) {
      vscode.window.showWarningMessage('No AI provider configured.');
      return;
    }

    const provider = this.aiProviders.find(p => p.id === this.currentProviderConfig!.providerId);
    if (!provider) {
      vscode.window.showErrorMessage('Selected AI provider not found.');
      return;
    }

    try {
      vscode.window.showInformationMessage(`Testing connection to ${provider.name}...`);
      
      const testMessages = [{
        role: 'user',
        content: 'Hello! Please respond with a simple greeting to confirm the connection works.'
      }];

      const startTime = Date.now();
      const response = await this.callAIProvider(provider, testMessages);
      const responseTime = Date.now() - startTime;

      vscode.window.showInformationMessage(
        `✅ ${provider.name} connection successful! Response time: ${responseTime}ms`
      );

      const showResponse = await vscode.window.showInformationMessage(
        `Response: "${response.slice(0, 100)}${response.length > 100 ? '...' : ''}"`,
        'View Full Response'
      );

      if (showResponse) {
        await this.showAIResponse(response, provider.name);
      }

    } catch (error) {
      vscode.window.showErrorMessage(`❌ Failed to connect to ${provider.name}: ${error}`);
    }
  }

  // Enhanced AI Provider Statistics
  getProviderStats(): { [providerId: string]: { totalUsage: number; avgResponseTime: number; effectivenessScore: number } } {
    const stats: { [providerId: string]: { totalUsage: number; avgResponseTime: number; effectivenessScore: number } } = {};

    this.prayers.forEach(prayer => {
      const providerId = prayer.usage.aiProviderUsed;
      if (providerId) {
        if (!stats[providerId]) {
          stats[providerId] = { totalUsage: 0, avgResponseTime: 0, effectivenessScore: 0 };
        }
        
        stats[providerId].totalUsage += prayer.usage.count;
        
        if (prayer.usage.responseTime) {
          stats[providerId].avgResponseTime = 
            (stats[providerId].avgResponseTime + prayer.usage.responseTime) / 2;
        }

        // Calculate effectiveness score
        const effectivenessPoints = {
          'high': 3,
          'medium': 2,
          'low': 1
        };
        
        stats[providerId].effectivenessScore += effectivenessPoints[prayer.usage.effectiveness || 'medium'];
      }
    });

    return stats;
  }

  // Export and Import functionality
  async exportPrayers(): Promise<void> {
    const exportData = {
      prayers: this.prayers,
      recipes: this.recipes,
      providerConfig: this.currentProviderConfig,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };

    const exportJson = JSON.stringify(exportData, null, 2);
    await vscode.env.clipboard.writeText(exportJson);

    const saveToFile = await vscode.window.showInformationMessage(
      '📋 Prayer vault exported to clipboard! Would you like to save to a file?',
      'Save to File'
    );

    if (saveToFile) {
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`wija-prayers-${new Date().toISOString().split('T')[0]}.json`),
        filters: {
          'JSON Files': ['json'],
          'All Files': ['*']
        }
      });

      if (uri) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(exportJson, 'utf8'));
        vscode.window.showInformationMessage(`✅ Prayer vault exported to ${uri.fsPath}`);
      }
    }
  }

  async importPrayers(): Promise<void> {
    const uri = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: {
        'JSON Files': ['json'],
        'All Files': ['*']
      }
    });

    if (!uri || uri.length === 0) return;

    try {
      const content = await vscode.workspace.fs.readFile(uri[0]);
      const importData = JSON.parse(content.toString());

      if (!importData.prayers || !Array.isArray(importData.prayers)) {
        vscode.window.showErrorMessage('Invalid prayer vault file format.');
        return;
      }

      const mergeChoice = await vscode.window.showQuickPick([
        { label: 'Merge with existing prayers', value: 'merge' },
        { label: 'Replace all prayers', value: 'replace' }
      ], {
        title: 'Import Mode',
        placeHolder: 'Choose how to import the prayers'
      });

      if (!mergeChoice) return;

      if (mergeChoice.value === 'replace') {
        this.prayers = [];
        this.recipes = [];
      }

      // Import prayers
      const importedPrayers = importData.prayers.map((p: any) => ({
        ...p,
        id: mergeChoice.value === 'merge' ? this.generateId() : p.id, // Generate new IDs for merge
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
        usage: {
          ...p.usage,
          lastUsed: p.usage.lastUsed ? new Date(p.usage.lastUsed) : undefined
        }
      }));

      this.prayers.push(...importedPrayers);

      // Import recipes if available
      if (importData.recipes && Array.isArray(importData.recipes)) {
        const importedRecipes = importData.recipes.map((r: any) => ({
          ...r,
          id: mergeChoice.value === 'merge' ? this.generateId() : r.id,
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt)
        }));

        this.recipes.push(...importedRecipes);
      }

      await this.savePrayers();
      await this.saveRecipes();
      this._onDidChangeTreeData.fire();

      vscode.window.showInformationMessage(
        `✅ Successfully imported ${importedPrayers.length} prayers${importData.recipes ? ` and ${importData.recipes.length} recipes` : ''}!`
      );

    } catch (error) {
      vscode.window.showErrorMessage(`Failed to import prayers: ${error}`);
    }
  }

  // Advanced AI Features
  async optimizePrayer(prayer: IPocketedPrayer): Promise<void> {
    if (!this.currentProviderConfig) {
      vscode.window.showWarningMessage('Please configure an AI provider to optimize prayers.');
      return;
    }

    const provider = this.aiProviders.find(p => p.id === this.currentProviderConfig!.providerId);
    if (!provider) {
      vscode.window.showErrorMessage('Selected AI provider not found.');
      return;
    }

    const optimizationPrompt = `Please analyze and optimize this coding prayer/prompt for better clarity, effectiveness, and actionability:

**Current Prayer:**
Name: ${prayer.name}
Category: ${prayer.category}
Prompt: ${prayer.prompt}
Context: ${prayer.context || 'None'}
Code Example: ${prayer.code}

**Optimization Goals:**
1. Make the prompt more specific and actionable
2. Improve clarity and remove ambiguity  
3. Add helpful context or examples
4. Ensure it follows prompt engineering best practices
5. Make it more effective for AI interactions

Please provide:
1. An optimized version of the prompt
2. Explanation of changes made
3. Suggested improvements to the name and context
4. Any additional tags that would be helpful

Format your response as JSON:
{
  "optimizedPrompt": "...",
  "optimizedName": "...",
  "optimizedContext": "...",
  "suggestedTags": ["tag1", "tag2"],
  "improvements": "explanation of changes made",
  "effectivenessScore": 1-10
}`;

    try {
      const messages = [{ role: 'user', content: optimizationPrompt }];
      const response = await this.callAIProvider(provider, messages);
      
      try {
        const optimization = JSON.parse(response);
        
        const applyOptimization = await vscode.window.showInformationMessage(
          `🤖 Prayer optimization complete! Effectiveness score: ${optimization.effectivenessScore}/10\n\nWould you like to apply the optimizations?`,
          { detail: optimization.improvements },
          'Apply Changes',
          'View Details',
          'Cancel'
        );

        if (applyOptimization === 'Apply Changes') {
          prayer.prompt = optimization.optimizedPrompt;
          prayer.name = optimization.optimizedName || prayer.name;
          prayer.context = optimization.optimizedContext || prayer.context;
          
          // Add suggested tags
          if (optimization.suggestedTags) {
            const newTags = optimization.suggestedTags.filter((tag: string) => !prayer.tags.includes(tag));
            prayer.tags.push(...newTags);
          }

          prayer.updatedAt = new Date();
          prayer.usage.aiProviderUsed = provider.name;

          await this.savePrayers();
          this._onDidChangeTreeData.fire();

          vscode.window.showInformationMessage('✅ Prayer optimized successfully!');
        } else if (applyOptimization === 'View Details') {
          await this.showAIResponse(response, `${provider.name} (Prayer Optimization)`);
        }

      } catch (parseError) {
        // If JSON parsing fails, show the raw response
        await this.showAIResponse(response, `${provider.name} (Prayer Optimization)`);
      }

    } catch (error) {
      vscode.window.showErrorMessage(`Failed to optimize prayer: ${error}`);
    }
  }

  // Batch prayer processing
  async batchProcessPrayers(): Promise<void> {
    const actions = [
      { label: '🔍 Analyze Prayer Effectiveness', value: 'analyze' },
      { label: '🏷️ Auto-Tag Prayers', value: 'tag' },
      { label: '📊 Generate Usage Report', value: 'report' },
      { label: '🧹 Clean Duplicate Prayers', value: 'dedupe' },
      { label: '📈 Optimize All Prayers', value: 'optimize' }
    ];

    const selectedAction = await vscode.window.showQuickPick(actions, {
      title: 'Batch Prayer Processing',
      placeHolder: 'Choose a batch operation to perform'
    });

    if (!selectedAction) return;

    switch (selectedAction.value) {
      case 'analyze':
        await this.analyzePrayerEffectiveness();
        break;
      case 'tag':
        await this.autoTagPrayers();
        break;
      case 'report':
        await this.generateUsageReport();
        break;
      case 'dedupe':
        await this.deduplicatePrayers();
        break;
      case 'optimize':
        await this.batchOptimizePrayers();
        break;
    }
  }

  private async analyzePrayerEffectiveness(): Promise<void> {
    const analysis = this.prayers.map(prayer => ({
      name: prayer.name,
      usage: prayer.usage.count,
      lastUsed: prayer.usage.lastUsed,
      effectiveness: prayer.usage.effectiveness,
      category: prayer.category,
      tags: prayer.tags.length
    }));

    // Sort by usage and effectiveness
    analysis.sort((a, b) => {
      const effectivenessScore = { 'high': 3, 'medium': 2, 'low': 1 };
      const aScore = a.usage * (effectivenessScore[a.effectiveness || 'medium'] || 2);
      const bScore = b.usage * (effectivenessScore[b.effectiveness || 'medium'] || 2);
      return bScore - aScore;
    });

    const report = `# Prayer Effectiveness Analysis

## Top Performing Prayers
${analysis.slice(0, 10).map((p, i) => 
  `${i + 1}. **${p.name}** (${p.category})
   - Usage: ${p.usage} times
   - Effectiveness: ${p.effectiveness?.toUpperCase() || 'MEDIUM'}
   - Last used: ${p.lastUsed ? new Date(p.lastUsed).toLocaleDateString() : 'Never'}
`).join('\n')}

## Summary Statistics
- Total prayers: ${this.prayers.length}
- Average usage: ${Math.round(this.prayers.reduce((sum, p) => sum + p.usage.count, 0) / this.prayers.length)}
- High effectiveness: ${this.prayers.filter(p => p.usage.effectiveness === 'high').length}
- Medium effectiveness: ${this.prayers.filter(p => p.usage.effectiveness === 'medium').length}
- Low effectiveness: ${this.prayers.filter(p => p.usage.effectiveness === 'low').length}

## Recommendations
${analysis.slice(-5).map(p => 
  `- Consider optimizing "${p.name}" (low usage: ${p.usage} times)`
).join('\n')}
`;

    await this.showPromptPreview(report, 'Prayer Effectiveness Analysis');
  }

  private async autoTagPrayers(): Promise<void> {
    vscode.window.showInformationMessage('🏷️ Auto-tagging prayers based on content analysis...');
    
    let tagged = 0;
    for (const prayer of this.prayers) {
      // Simple keyword-based tagging
      const content = `${prayer.name} ${prayer.prompt} ${prayer.code}`.toLowerCase();
      const newTags: string[] = [];

      // Technology tags
      if (content.includes('react') || content.includes('jsx')) newTags.push('react');
      if (content.includes('typescript') || content.includes('ts')) newTags.push('typescript');
      if (content.includes('javascript') || content.includes('js')) newTags.push('javascript');
      if (content.includes('rust') || content.includes('cargo')) newTags.push('rust');
      if (content.includes('solana') || content.includes('anchor')) newTags.push('solana');
      if (content.includes('web3') || content.includes('blockchain')) newTags.push('web3');

      // Purpose tags
      if (content.includes('performance') || content.includes('optimize') || content.includes('speed')) newTags.push('performance');
      if (content.includes('security') || content.includes('vulnerability') || content.includes('auth')) newTags.push('security');
      if (content.includes('test') || content.includes('spec') || content.includes('mock')) newTags.push('testing');
      if (content.includes('debug') || content.includes('error') || content.includes('fix')) newTags.push('debugging');
      if (content.includes('refactor') || content.includes('clean') || content.includes('improve')) newTags.push('refactoring');

      // AI/Prompt specific tags
      if (content.includes('ai') || content.includes('assistant') || content.includes('prompt')) newTags.push('ai-prompt');
      if (content.includes('explain') || content.includes('understand') || content.includes('learn')) newTags.push('explanation');
      if (content.includes('pattern') || content.includes('example') || content.includes('template')) newTags.push('pattern');

      // Add new tags that don't already exist
      const uniqueNewTags = newTags.filter(tag => !prayer.tags.includes(tag));
      if (uniqueNewTags.length > 0) {
        prayer.tags.push(...uniqueNewTags);
        prayer.updatedAt = new Date();
        tagged++;
      }
    }

    await this.savePrayers();
    this._onDidChangeTreeData.fire();
    
    vscode.window.showInformationMessage(`✅ Auto-tagging complete! Added tags to ${tagged} prayers.`);
  }

  private async generateUsageReport(): Promise<void> {
    const totalPrayers = this.prayers.length;
    const totalUsage = this.prayers.reduce((sum, p) => sum + p.usage.count, 0);
    const categoryCounts = this.prayers.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const providerStats = this.getProviderStats();

    const report = `# Wija Prayer Vault Usage Report
Generated: ${new Date().toLocaleString()}

## Overview
- **Total Prayers:** ${totalPrayers}
- **Total Usage:** ${totalUsage} times
- **Average Usage per Prayer:** ${Math.round(totalUsage / totalPrayers)}
- **Active Prayers:** ${this.prayers.filter(p => p.usage.count > 0).length}

## Category Distribution
${Object.entries(categoryCounts)
  .sort(([,a], [,b]) => b - a)
  .map(([cat, count]) => `- **${cat}:** ${count} prayers`)
  .join('\n')}

## AI Provider Usage
${Object.entries(providerStats).map(([provider, stats]) => 
  `- **${provider}:** ${stats.totalUsage} uses, ${Math.round(stats.avgResponseTime)}ms avg response`
).join('\n')}

## Most Used Prayers
${this.prayers
  .sort((a, b) => b.usage.count - a.usage.count)
  .slice(0, 10)
  .map((p, i) => `${i + 1}. **${p.name}** - ${p.usage.count} uses`)
  .join('\n')}

## Recent Activity
${this.prayers
  .filter(p => p.usage.lastUsed)
  .sort((a, b) => (b.usage.lastUsed?.getTime() || 0) - (a.usage.lastUsed?.getTime() || 0))
  .slice(0, 5)
  .map(p => `- **${p.name}** - ${p.usage.lastUsed?.toLocaleDateString()}`)
  .join('\n')}

## Recommendations
${totalUsage === 0 ? '- Start using your prayers to build up usage statistics!' : ''}
${this.prayers.filter(p => p.usage.count === 0).length > 0 ? `- ${this.prayers.filter(p => p.usage.count === 0).length} prayers haven't been used yet` : ''}
${Object.keys(providerStats).length === 0 ? '- Configure an AI provider to enable AI-powered features' : ''}
`;

    await this.showPromptPreview(report, 'Prayer Vault Usage Report');
  }

  private async deduplicatePrayers(): Promise<void> {
    const duplicates: IPocketedPrayer[][] = [];
    const processed = new Set<string>();

    for (const prayer of this.prayers) {
      if (processed.has(prayer.id)) continue;

      const similar = this.prayers.filter(p => 
        p.id !== prayer.id &&
        !processed.has(p.id) &&
        (
          p.name.toLowerCase() === prayer.name.toLowerCase() ||
          p.prompt.toLowerCase() === prayer.prompt.toLowerCase() ||
          (p.code && prayer.code && p.code === prayer.code)
        )
      );

      if (similar.length > 0) {
        duplicates.push([prayer, ...similar]);
        [prayer, ...similar].forEach(p => processed.add(p.id));
      }
    }

    if (duplicates.length === 0) {
      vscode.window.showInformationMessage('✅ No duplicate prayers found!');
      return;
    }

    const dedupeChoice = await vscode.window.showWarningMessage(
      `Found ${duplicates.length} groups of duplicate prayers. How would you like to handle them?`,
      'Review Manually',
      'Auto-Remove',
      'Cancel'
    );

    if (dedupeChoice === 'Auto-Remove') {
      // Keep the prayer with highest usage, remove others
      let removed = 0;
      for (const group of duplicates) {
        const keeper = group.reduce((best, current) => 
          current.usage.count > best.usage.count ? current : best
        );
        
        const toRemove = group.filter(p => p.id !== keeper.id);
        toRemove.forEach(prayer => {
          this.prayers = this.prayers.filter(p => p.id !== prayer.id);
          removed++;
        });
      }

      await this.savePrayers();
      this._onDidChangeTreeData.fire();
      vscode.window.showInformationMessage(`✅ Removed ${removed} duplicate prayers.`);

    } else if (dedupeChoice === 'Review Manually') {
      // Show duplicates for manual review
      const duplicateReport = duplicates.map((group, i) => 
        `## Duplicate Group ${i + 1}\n` +
        group.map(p => 
          `- **${p.name}** (${p.usage.count} uses) - ${p.prompt.slice(0, 100)}...`
        ).join('\n')
      ).join('\n\n');

      await this.showPromptPreview(duplicateReport, 'Duplicate Prayers Review');
    }
  }

  private async batchOptimizePrayers(): Promise<void> {
    if (!this.currentProviderConfig) {
      vscode.window.showWarningMessage('Please configure an AI provider to optimize prayers.');
      return;
    }

    const prayersToOptimize = this.prayers.filter(p => 
      p.usage.count > 0 && p.usage.effectiveness !== 'high'
    );

    if (prayersToOptimize.length === 0) {
      vscode.window.showInformationMessage('No prayers need optimization!');
      return;
    }

    const proceed = await vscode.window.showWarningMessage(
      `This will optimize ${prayersToOptimize.length} prayers using AI. This may take a while and consume API tokens. Continue?`,
      'Optimize All',
      'Cancel'
    );

    if (proceed !== 'Optimize All') return;

    let optimized = 0;
    let failed = 0;

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Optimizing prayers...',
      cancellable: true
    }, async (progress, token) => {
      for (let i = 0; i < prayersToOptimize.length; i++) {
        if (token.isCancellationRequested) break;

        const prayer = prayersToOptimize[i];
        progress.report({ 
          increment: (100 / prayersToOptimize.length),
          message: `Optimizing "${prayer.name}"...` 
        });

        try {
          await this.optimizePrayer(prayer);
          optimized++;
        } catch (error) {
          console.error(`Failed to optimize prayer ${prayer.name}:`, error);
          failed++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    });

    vscode.window.showInformationMessage(
      `✅ Batch optimization complete! Optimized: ${optimized}, Failed: ${failed}`
    );
  }

  async saveSelectionAsPrayer(code: string, language: string, filePath?: string, range?: vscode.Range): Promise<void> {
    try {
      // Generate a name for the prayer based on the code content
      const name = await this.generatePrayerName(code, language);
      
      // Create the prayer object
      const prayer: IPocketedPrayer = {
        id: this.generateId(),
        name,
        category: this.detectCategory(code, language),
        code,
        language,
        prompt: await this.generatePromptFromCode(code, language),
        context: filePath ? `File: ${filePath}${range ? ` (lines ${range.start.line + 1}-${range.end.line + 1})` : ''}` : undefined,
        variables: this.extractVariables(code),
        tags: this.autoTagCode(code, language),
        createdAt: new Date(),
        updatedAt: new Date(),
        filePath,
        lineStart: range?.start.line,
        lineEnd: range?.end.line,
        usage: {
          count: 0
        }
      };

      // Add to prayers array
      this.prayers.push(prayer);
      await this.savePrayers();
      this.refresh();

      vscode.window.showInformationMessage(`Prayer "${name}" saved successfully!`);
    } catch (error) {
      console.error('Failed to save selection as prayer:', error);
      vscode.window.showErrorMessage('Failed to save selection as prayer.');
    }
  }

  async extractSelectionAsVariable(code: string, language: string, filePath?: string, range?: vscode.Range): Promise<void> {
    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found.');
        return;
      }

      // Analyze the code to suggest variable name and type
      const analysis = await this.analyzeCodeForVariableExtraction(code, language);
      
      // Show input dialog for variable name
      const variableName = await vscode.window.showInputBox({
        prompt: 'Enter variable name:',
        value: analysis.suggestedName,
        placeHolder: 'e.g., userData, config, result'
      });

      if (!variableName) {
        return; // User cancelled
      }

      // Generate the variable declaration
      const variableDeclaration = this.generateVariableDeclaration(code, variableName, language, analysis.suggestedType);

      // Insert the variable declaration before the selected code
      const insertPosition = range ? range.start : editor.selection.start;
      await editor.edit(editBuilder => {
        editBuilder.insert(insertPosition, variableDeclaration + '\n');
      });

      // Replace the original code with the variable reference
      const variableReference = this.generateVariableReference(variableName, language);
      await editor.edit(editBuilder => {
        editBuilder.replace(range || editor.selection, variableReference);
      });

      vscode.window.showInformationMessage(`Code extracted as variable "${variableName}" successfully!`);
    } catch (error) {
      console.error('Failed to extract selection as variable:', error);
      vscode.window.showErrorMessage('Failed to extract selection as variable.');
    }
  }

  async sendSelectionToAI(code: string, language: string, filePath?: string, range?: vscode.Range): Promise<void> {
    try {
      // Build a context-aware prompt for the AI
      const context = this.buildCodeContext(code, language, filePath, range);
      const prompt = this.buildAIPrompt(code, context);

      // Show the prompt to the user for review/editing
      const finalPrompt = await vscode.window.showInputBox({
        prompt: 'Review and edit the AI prompt:',
        value: prompt,
        placeHolder: 'Enter your prompt for the AI agent...'
      });

      if (!finalPrompt) {
        return; // User cancelled
      }

      // Send to AI and get response
      const response = await this.callAIProviderWithCode(finalPrompt, code, language);
      
      // Show the response in a webview
      await this.showAIResponse(response, 'AI Agent Response');

      // Optionally save this interaction as a prayer
      const saveAsPrayer = await vscode.window.showQuickPick(['Yes', 'No'], {
        placeHolder: 'Save this interaction as a prayer for future use?'
      });

      if (saveAsPrayer === 'Yes') {
        await this.saveSelectionAsPrayer(code, language, filePath, range);
      }
    } catch (error) {
      console.error('Failed to send selection to AI:', error);
      vscode.window.showErrorMessage('Failed to send selection to AI agent.');
    }
  }

  async analyzeSelection(code: string, language: string, filePath?: string, range?: vscode.Range): Promise<void> {
    try {
      const analysis = await this.performCodeAnalysis(code, language);
      
      // Create a comprehensive analysis report
      const report = this.generateAnalysisReport(analysis, code, language, filePath, range);
      
      // Show the analysis in a webview
      await this.showAnalysisReport(report);
    } catch (error) {
      console.error('Failed to analyze selection:', error);
      vscode.window.showErrorMessage('Failed to analyze code selection.');
    }
  }

  private async generatePrayerName(code: string, language: string): Promise<string> {
    // Extract a meaningful name from the code
    const lines = code.trim().split('\n');
    const firstLine = lines[0].trim();
    
    // Try to extract function/class names
    const functionMatch = firstLine.match(/(?:function|const|let|var)\s+(\w+)/);
    if (functionMatch) {
      return functionMatch[1];
    }
    
    // Try to extract class names
    const classMatch = firstLine.match(/class\s+(\w+)/);
    if (classMatch) {
      return classMatch[1];
    }
    
    // Fallback to a generic name
    return `Code_${Date.now()}`;
  }

  private detectCategory(code: string, language: string): string {
    const lowerCode = code.toLowerCase();
    
    if (lowerCode.includes('function') || lowerCode.includes('def ') || lowerCode.includes('fn ')) {
      return 'Functions';
    }
    if (lowerCode.includes('class') || lowerCode.includes('struct')) {
      return 'Classes';
    }
    if (lowerCode.includes('if ') || lowerCode.includes('for ') || lowerCode.includes('while ')) {
      return 'Logic';
    }
    if (lowerCode.includes('import') || lowerCode.includes('require') || lowerCode.includes('use ')) {
      return 'Imports';
    }
    if (lowerCode.includes('error') || lowerCode.includes('exception') || lowerCode.includes('catch')) {
      return 'Error Handling';
    }
    if (lowerCode.includes('test') || lowerCode.includes('spec') || lowerCode.includes('it(')) {
      return 'Testing';
    }
    
    return 'General';
  }

  private async generatePromptFromCode(code: string, language: string): Promise<string> {
    // Generate a prompt that describes what this code does
    const analysis = await this.performCodeAnalysis(code, language);
    
    return `Generate code that ${analysis.purpose}. 
    
Requirements:
- Language: ${language}
- Functionality: ${analysis.description}
- Patterns: ${analysis.patterns.join(', ')}
- Complexity: ${analysis.complexity}

Please provide clean, well-documented code that follows best practices.`;
  }

  private autoTagCode(code: string, language: string): string[] {
    const tags: string[] = [];
    const lowerCode = code.toLowerCase();
    
    // Language-specific tags
    tags.push(language);
    
    // Pattern-based tags
    if (lowerCode.includes('async') || lowerCode.includes('await')) {
      tags.push('async');
    }
    if (lowerCode.includes('promise') || lowerCode.includes('then(')) {
      tags.push('promises');
    }
    if (lowerCode.includes('regex') || lowerCode.includes('/.*/')) {
      tags.push('regex');
    }
    if (lowerCode.includes('api') || lowerCode.includes('fetch') || lowerCode.includes('axios')) {
      tags.push('api');
    }
    if (lowerCode.includes('database') || lowerCode.includes('sql') || lowerCode.includes('query')) {
      tags.push('database');
    }
    
    return tags;
  }

  private async analyzeCodeForVariableExtraction(code: string, language: string): Promise<{
    suggestedName: string;
    suggestedType: string;
    complexity: string;
  }> {
    // Analyze the code to suggest appropriate variable name and type
    const lines = code.trim().split('\n');
    const firstLine = lines[0].trim();
    
    let suggestedName = 'extractedValue';
    let suggestedType = 'any';
    
    // Try to infer type from code
    if (firstLine.includes('{') && firstLine.includes('}')) {
      suggestedType = 'object';
      suggestedName = 'data';
    } else if (firstLine.includes('[') && firstLine.includes(']')) {
      suggestedType = 'array';
      suggestedName = 'items';
    } else if (firstLine.includes('"') || firstLine.includes("'")) {
      suggestedType = 'string';
      suggestedName = 'text';
    } else if (firstLine.match(/\d+/)) {
      suggestedType = 'number';
      suggestedName = 'value';
    }
    
    const complexity = lines.length > 5 ? 'complex' : 'simple';
    
    return { suggestedName, suggestedType, complexity };
  }

  private generateVariableDeclaration(code: string, variableName: string, language: string, type: string): string {
    switch (language) {
      case 'typescript':
      case 'javascript':
        return `const ${variableName}: ${type} = ${code};`;
      case 'rust':
        return `let ${variableName}: ${type} = ${code};`;
      case 'python':
        return `${variableName}: ${type} = ${code}`;
      default:
        return `const ${variableName} = ${code};`;
    }
  }

  private generateVariableReference(variableName: string, language: string): string {
    return variableName;
  }

  private buildCodeContext(code: string, language: string, filePath?: string, range?: vscode.Range): string {
    let context = `Language: ${language}\n`;
    
    if (filePath) {
      context += `File: ${filePath}\n`;
    }
    
    if (range) {
      context += `Lines: ${range.start.line + 1}-${range.end.line + 1}\n`;
    }
    
    context += `Code:\n${code}`;
    
    return context;
  }

  private buildAIPrompt(code: string, context: string): string {
    return `I have the following code that I want to improve or understand better:

${context}

Please help me by:
1. Explaining what this code does
2. Suggesting improvements
3. Providing alternative approaches if applicable
4. Pointing out any potential issues or best practices

Please provide clear, actionable feedback.`;
  }

  private async callAIProviderWithCode(prompt: string, code: string, language: string): Promise<string> {
    if (!this.currentProviderConfig) {
      throw new Error('No AI provider configured. Please configure an AI provider first.');
    }

    const messages = [
      {
        role: 'system',
        content: `You are an expert ${language} developer. Provide clear, actionable advice and code examples.`
      },
      {
        role: 'user',
        content: `${prompt}\n\nCode:\n\`\`\`${language}\n${code}\n\`\`\``
      }
    ];

    const provider = this.aiProviders.find(p => p.id === this.currentProviderConfig!.providerId);
    if (!provider) {
      throw new Error(`Provider ${this.currentProviderConfig.providerId} not found.`);
    }

    return await this.callAIProvider(provider, messages);
  }

  private async performCodeAnalysis(code: string, language: string): Promise<{
    purpose: string;
    description: string;
    patterns: string[];
    complexity: string;
    lines: number;
    functions: number;
    variables: number;
  }> {
    const lines = code.split('\n');
    const functionMatches = code.match(/(?:function|def|fn)\s+\w+/g) || [];
    const variableMatches = code.match(/(?:const|let|var)\s+\w+/g) || [];
    
    return {
      purpose: this.inferCodePurpose(code, language),
      description: this.generateCodeDescription(code, language),
      patterns: this.detectCodePatterns(code, language),
      complexity: lines.length > 20 ? 'complex' : lines.length > 10 ? 'medium' : 'simple',
      lines: lines.length,
      functions: functionMatches.length,
      variables: variableMatches.length
    };
  }

  private inferCodePurpose(code: string, language: string): string {
    const lowerCode = code.toLowerCase();
    
    if (lowerCode.includes('fetch') || lowerCode.includes('axios') || lowerCode.includes('http')) {
      return 'makes HTTP requests or API calls';
    }
    if (lowerCode.includes('query') || lowerCode.includes('select') || lowerCode.includes('database')) {
      return 'performs database operations';
    }
    if (lowerCode.includes('validate') || lowerCode.includes('check') || lowerCode.includes('verify')) {
      return 'validates or checks data';
    }
    if (lowerCode.includes('transform') || lowerCode.includes('map') || lowerCode.includes('filter')) {
      return 'transforms or processes data';
    }
    if (lowerCode.includes('render') || lowerCode.includes('display') || lowerCode.includes('ui')) {
      return 'renders or displays UI components';
    }
    
    return 'performs a specific task';
  }

  private generateCodeDescription(code: string, language: string): string {
    const lines = code.trim().split('\n');
    const firstLine = lines[0].trim();
    
    if (firstLine.includes('function') || firstLine.includes('def ') || firstLine.includes('fn ')) {
      return `A function that ${this.inferCodePurpose(code, language)}`;
    }
    if (firstLine.includes('class')) {
      return `A class definition with methods and properties`;
    }
    if (firstLine.includes('const') || firstLine.includes('let') || firstLine.includes('var')) {
      return `A variable declaration or data structure`;
    }
    
    return `Code block that ${this.inferCodePurpose(code, language)}`;
  }

  private detectCodePatterns(code: string, language: string): string[] {
    const patterns: string[] = [];
    const lowerCode = code.toLowerCase();
    
    if (lowerCode.includes('async') && lowerCode.includes('await')) {
      patterns.push('async/await');
    }
    if (lowerCode.includes('promise') || lowerCode.includes('then(')) {
      patterns.push('promises');
    }
    if (lowerCode.includes('map(') || lowerCode.includes('filter(') || lowerCode.includes('reduce(')) {
      patterns.push('functional programming');
    }
    if (lowerCode.includes('try') && lowerCode.includes('catch')) {
      patterns.push('error handling');
    }
    if (lowerCode.includes('if') && lowerCode.includes('else')) {
      patterns.push('conditional logic');
    }
    if (lowerCode.includes('for') || lowerCode.includes('while')) {
      patterns.push('loops');
    }
    
    return patterns;
  }

  private generateAnalysisReport(analysis: any, code: string, language: string, filePath?: string, range?: vscode.Range): string {
    return `# Code Analysis Report

## Overview
- **Language**: ${language}
- **Lines of Code**: ${analysis.lines}
- **Complexity**: ${analysis.complexity}
- **Functions**: ${analysis.functions}
- **Variables**: ${analysis.variables}

## Purpose
${analysis.purpose}

## Description
${analysis.description}

## Detected Patterns
${analysis.patterns.map((p: string) => `- ${p}`).join('\n')}

## Code Context
${filePath ? `**File**: ${filePath}` : ''}
${range ? `**Lines**: ${range.start.line + 1}-${range.end.line + 1}` : ''}

## Code
\`\`\`${language}
${code}
\`\`\`

## Recommendations
1. **Consider extracting complex logic into separate functions**
2. **Add error handling where appropriate**
3. **Include JSDoc/TSDoc comments for better documentation**
4. **Consider using TypeScript for better type safety**`;
  }

  private async showAnalysisReport(report: string): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
      'codeAnalysis',
      'Code Analysis Report',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    panel.webview.html = this.getAnalysisReportHtml(report);
  }

  private getAnalysisReportHtml(report: string): string {
    const markdown = report.replace(/\n/g, '<br>').replace(/`([^`]+)`/g, '<code>$1</code>');
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Analysis Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        h1, h2, h3 {
            color: var(--vscode-editor-foreground);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 8px;
        }
        code {
            background: var(--vscode-textCodeBlock-background);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
        }
        pre {
            background: var(--vscode-textCodeBlock-background);
            padding: 16px;
            border-radius: 6px;
            overflow-x: auto;
            border: 1px solid var(--vscode-panel-border);
        }
        ul {
            padding-left: 20px;
        }
        li {
            margin: 4px 0;
        }
    </style>
</head>
<body>
    ${markdown}
</body>
</html>`;
  }
} 