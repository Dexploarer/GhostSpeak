import * as vscode from 'vscode';

/**
 * Prayer Pocket Provider - Manages highlighted code snippets and prompt variables
 * Allows users to highlight text and either:
 * 1. Convert to prompt variables
 * 2. Store in prayer pocket for later use
 * 3. Build dynamic prompts from collected snippets
 */

export interface IPrayerPocketItem {
  id: string;
  content: string;
  language?: string;
  filePath?: string;
  lineNumber?: number;
  timestamp: Date;
  label?: string;
  category: 'variable' | 'snippet' | 'context' | 'example';
  isVariable?: boolean;
  variableName?: string;
}

export interface IPromptTemplate {
  id: string;
  name: string;
  template: string;
  variables: { [key: string]: string };
  pocketItems: string[]; // IDs of prayer pocket items
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

export class PrayerPocketProvider implements vscode.TreeDataProvider<PrayerPocketItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<PrayerPocketItem | undefined | null | void> = new vscode.EventEmitter<PrayerPocketItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<PrayerPocketItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private pocketItems: IPrayerPocketItem[] = [];
  private promptTemplates: IPromptTemplate[] = [];
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.loadPocketData();
    this.registerCommands();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: PrayerPocketItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: PrayerPocketItem): Thenable<PrayerPocketItem[]> {
    if (!element) {
      // Root level - show categories
      const categories = [
        new PrayerPocketItem('Variables', '', vscode.TreeItemCollapsibleState.Expanded, 'category'),
        new PrayerPocketItem('Code Snippets', '', vscode.TreeItemCollapsibleState.Expanded, 'category'),
        new PrayerPocketItem('Context Items', '', vscode.TreeItemCollapsibleState.Expanded, 'category'),
        new PrayerPocketItem('Prompt Templates', '', vscode.TreeItemCollapsibleState.Expanded, 'category')
      ];
      return Promise.resolve(categories);
    } else {
      // Show items for each category
      let items: PrayerPocketItem[] = [];
      
      if (element.label === 'Variables') {
        items = this.pocketItems
          .filter(item => item.category === 'variable')
          .map(item => new PrayerPocketItem(
            item.variableName || item.label || 'Variable',
            item.content.substring(0, 50) + '...',
            vscode.TreeItemCollapsibleState.None,
            'variable',
            item.id
          ));
      } else if (element.label === 'Code Snippets') {
        items = this.pocketItems
          .filter(item => item.category === 'snippet')
          .map(item => new PrayerPocketItem(
            item.label || `Snippet from ${item.filePath?.split('/').pop()}`,
            item.content.substring(0, 50) + '...',
            vscode.TreeItemCollapsibleState.None,
            'snippet',
            item.id
          ));
      } else if (element.label === 'Context Items') {
        items = this.pocketItems
          .filter(item => item.category === 'context')
          .map(item => new PrayerPocketItem(
            item.label || 'Context',
            item.content.substring(0, 50) + '...',
            vscode.TreeItemCollapsibleState.None,
            'context',
            item.id
          ));
      } else if (element.label === 'Prompt Templates') {
        items = this.promptTemplates.map(template => new PrayerPocketItem(
          template.name,
          `${Object.keys(template.variables).length} vars, ${template.pocketItems.length} items`,
          vscode.TreeItemCollapsibleState.None,
          'template',
          template.id
        ));
      }
      
      return Promise.resolve(items);
    }
  }

  private registerCommands() {
    // Command to capture selected text as variable
    vscode.commands.registerCommand('wija.prayerPocket.captureAsVariable', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
      }

      const selection = editor.selection;
      const selectedText = editor.document.getText(selection);
      
      if (!selectedText) {
        vscode.window.showWarningMessage('No text selected');
        return;
      }

      const variableName = await vscode.window.showInputBox({
        prompt: 'Enter variable name',
        placeHolder: 'variableName',
        value: this.generateVariableName(selectedText)
      });

      if (variableName) {
        await this.addToPrayerPocket(selectedText, {
          category: 'variable',
          variableName,
          label: `{{${variableName}}}`,
          filePath: editor.document.fileName,
          lineNumber: selection.start.line + 1,
          language: editor.document.languageId
        });

        vscode.window.showInformationMessage(`Variable "${variableName}" added to prayer pocket`);
      }
    });

    // Command to capture selected text as snippet
    vscode.commands.registerCommand('wija.prayerPocket.captureAsSnippet', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
      }

      const selection = editor.selection;
      const selectedText = editor.document.getText(selection);
      
      if (!selectedText) {
        vscode.window.showWarningMessage('No text selected');
        return;
      }

      const label = await vscode.window.showInputBox({
        prompt: 'Enter snippet label',
        placeHolder: 'Snippet description',
        value: `${editor.document.fileName.split('/').pop()} snippet`
      });

      if (label) {
        await this.addToPrayerPocket(selectedText, {
          category: 'snippet',
          label,
          filePath: editor.document.fileName,
          lineNumber: selection.start.line + 1,
          language: editor.document.languageId
        });

        vscode.window.showInformationMessage(`Snippet "${label}" added to prayer pocket`);
      }
    });

    // Command to capture selected text as context
    vscode.commands.registerCommand('wija.prayerPocket.captureAsContext', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
      }

      const selection = editor.selection;
      const selectedText = editor.document.getText(selection);
      
      if (!selectedText) {
        vscode.window.showWarningMessage('No text selected');
        return;
      }

      const label = await vscode.window.showInputBox({
        prompt: 'Enter context label',
        placeHolder: 'Context description',
        value: 'Code context'
      });

      if (label) {
        await this.addToPrayerPocket(selectedText, {
          category: 'context',
          label,
          filePath: editor.document.fileName,
          lineNumber: selection.start.line + 1,
          language: editor.document.languageId
        });

        vscode.window.showInformationMessage(`Context "${label}" added to prayer pocket`);
      }
    });

    // Command to build prompt from pocket items
    vscode.commands.registerCommand('wija.prayerPocket.buildPrompt', async () => {
      if (this.pocketItems.length === 0) {
        vscode.window.showWarningMessage('Prayer pocket is empty. Highlight some code first!');
        return;
      }

      await this.buildPromptFromPocket();
    });

    // Command to create template from pocket
    vscode.commands.registerCommand('wija.prayerPocket.createTemplate', async () => {
      if (this.pocketItems.length === 0) {
        vscode.window.showWarningMessage('Prayer pocket is empty. Add some items first!');
        return;
      }

      await this.createTemplateFromPocket();
    });

    // Command to clear prayer pocket
    vscode.commands.registerCommand('wija.prayerPocket.clear', async () => {
      const result = await vscode.window.showWarningMessage(
        'Clear all items from prayer pocket?',
        'Yes', 'No'
      );

      if (result === 'Yes') {
        this.pocketItems = [];
        await this.savePocketData();
        this.refresh();
        vscode.window.showInformationMessage('Prayer pocket cleared');
      }
    });

    // Command to insert template variable
    vscode.commands.registerCommand('wija.prayerPocket.insertVariable', async (item: PrayerPocketItem) => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
      }

      const pocketItem = this.pocketItems.find(p => p.id === item.id);
      if (pocketItem && pocketItem.variableName) {
        const variableText = `{{${pocketItem.variableName}}}`;
        await editor.edit(editBuilder => {
          editBuilder.insert(editor.selection.active, variableText);
        });
      }
    });

    // Command to copy pocket item content
    vscode.commands.registerCommand('wija.prayerPocket.copyContent', async (item: PrayerPocketItem) => {
      const pocketItem = this.pocketItems.find(p => p.id === item.id);
      if (pocketItem) {
        await vscode.env.clipboard.writeText(pocketItem.content);
        vscode.window.showInformationMessage('Content copied to clipboard');
      }
    });

    // Command to delete pocket item
    vscode.commands.registerCommand('wija.prayerPocket.deleteItem', async (item: PrayerPocketItem) => {
      const index = this.pocketItems.findIndex(p => p.id === item.id);
      if (index !== -1) {
        this.pocketItems.splice(index, 1);
        await this.savePocketData();
        this.refresh();
        vscode.window.showInformationMessage('Item removed from prayer pocket');
      }
    });
  }

  private async addToPrayerPocket(content: string, options: Partial<IPrayerPocketItem>): Promise<void> {
    const item: IPrayerPocketItem = {
      id: this.generateId(),
      content,
      timestamp: new Date(),
      category: options.category || 'snippet',
      ...options
    };

    this.pocketItems.push(item);
    await this.savePocketData();
    this.refresh();
  }

  private generateVariableName(text: string): string {
    // Generate a reasonable variable name from selected text
    const words = text.trim()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 0)
      .slice(0, 3);

    if (words.length === 0) return 'variable';
    if (words.length === 1) return words[0].toLowerCase();
    
    return words[0].toLowerCase() + words.slice(1).map(w => 
      w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    ).join('');
  }

  private async buildPromptFromPocket(): Promise<void> {
    // Show quick pick to select which items to include
    const items = this.pocketItems.map(item => ({
      label: item.label || `${item.category}: ${item.content.substring(0, 50)}...`,
      description: `${item.category} from ${item.filePath?.split('/').pop() || 'editor'}`,
      picked: true,
      item
    }));

    const selectedItems = await vscode.window.showQuickPick(items, {
      canPickMany: true,
      placeHolder: 'Select items to include in prompt'
    });

    if (!selectedItems || selectedItems.length === 0) {
      return;
    }

    // Build the prompt
    let prompt = '# Generated Prompt from Prayer Pocket\n\n';
    
    // Add variables section
    const variables = selectedItems.filter(s => s.item.category === 'variable');
    if (variables.length > 0) {
      prompt += '## Variables:\n';
      variables.forEach(v => {
        prompt += `- {{${v.item.variableName}}}: ${v.item.content}\n`;
      });
      prompt += '\n';
    }

    // Add context section
    const context = selectedItems.filter(s => s.item.category === 'context');
    if (context.length > 0) {
      prompt += '## Context:\n';
      context.forEach(c => {
        prompt += `### ${c.item.label}\n\`\`\`${c.item.language || 'text'}\n${c.item.content}\n\`\`\`\n\n`;
      });
    }

    // Add snippets section
    const snippets = selectedItems.filter(s => s.item.category === 'snippet');
    if (snippets.length > 0) {
      prompt += '## Code Examples:\n';
      snippets.forEach(s => {
        prompt += `### ${s.item.label}\n\`\`\`${s.item.language || 'text'}\n${s.item.content}\n\`\`\`\n\n`;
      });
    }

    // Add instruction template
    prompt += '## Instructions:\n';
    prompt += 'Based on the above context and examples, please help me with:\n\n';
    prompt += '[YOUR SPECIFIC REQUEST HERE]\n\n';
    
    if (variables.length > 0) {
      prompt += 'Use the following variable values:\n';
      variables.forEach(v => {
        prompt += `- ${v.item.variableName}: [SPECIFY VALUE]\n`;
      });
    }

    // Open new document with the generated prompt
    const doc = await vscode.workspace.openTextDocument({
      content: prompt,
      language: 'markdown'
    });
    await vscode.window.showTextDocument(doc);

    vscode.window.showInformationMessage(`Generated prompt with ${selectedItems.length} items from prayer pocket`);
  }

  private async createTemplateFromPocket(): Promise<void> {
    const templateName = await vscode.window.showInputBox({
      prompt: 'Enter template name',
      placeHolder: 'My Custom Template'
    });

    if (!templateName) return;

    // Create template with current pocket items
    const variables: { [key: string]: string } = {};
    this.pocketItems
      .filter(item => item.category === 'variable' && item.variableName)
      .forEach(item => {
        variables[item.variableName!] = item.content;
      });

    const template: IPromptTemplate = {
      id: this.generateId(),
      name: templateName,
      template: this.generateTemplateString(),
      variables,
      pocketItems: this.pocketItems.map(item => item.id),
      category: 'Custom',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.promptTemplates.push(template);
    await this.savePocketData();
    this.refresh();

    vscode.window.showInformationMessage(`Template "${templateName}" created with ${this.pocketItems.length} pocket items`);
  }

  private generateTemplateString(): string {
    const variables = this.pocketItems
      .filter(item => item.category === 'variable')
      .map(item => `{{${item.variableName}}}`)
      .join(', ');

    const contexts = this.pocketItems
      .filter(item => item.category === 'context')
      .map(item => item.label)
      .join(', ');

    const snippets = this.pocketItems
      .filter(item => item.category === 'snippet')
      .map(item => item.label)
      .join(', ');

    return `Template with variables: ${variables}\nContext: ${contexts}\nSnippets: ${snippets}`;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private async loadPocketData(): Promise<void> {
    const pocketData = this.context.globalState.get<{
      items: IPrayerPocketItem[];
      templates: IPromptTemplate[];
    }>('prayerPocketData');

    if (pocketData) {
      this.pocketItems = pocketData.items || [];
      this.promptTemplates = pocketData.templates || [];
    }
  }

  private async savePocketData(): Promise<void> {
    await this.context.globalState.update('prayerPocketData', {
      items: this.pocketItems,
      templates: this.promptTemplates
    });
  }

  // Get statistics for the pocket
  public getPocketStats() {
    return {
      totalItems: this.pocketItems.length,
      variables: this.pocketItems.filter(i => i.category === 'variable').length,
      snippets: this.pocketItems.filter(i => i.category === 'snippet').length,
      contexts: this.pocketItems.filter(i => i.category === 'context').length,
      templates: this.promptTemplates.length
    };
  }
}

export class PrayerPocketItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly description: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly type: 'category' | 'variable' | 'snippet' | 'context' | 'template',
    public readonly id?: string
  ) {
    super(label, collapsibleState);
    this.description = description;
    this.tooltip = this.getTooltip();
    this.contextValue = type;
    this.iconPath = this.getIcon();
  }

  private getIcon(): vscode.ThemeIcon {
    switch (this.type) {
      case 'category': return new vscode.ThemeIcon('folder');
      case 'variable': return new vscode.ThemeIcon('symbol-variable');
      case 'snippet': return new vscode.ThemeIcon('code');
      case 'context': return new vscode.ThemeIcon('symbol-misc');
      case 'template': return new vscode.ThemeIcon('file-code');
      default: return new vscode.ThemeIcon('circle-outline');
    }
  }

  private getTooltip(): string {
    switch (this.type) {
      case 'variable': return `Variable: ${this.label}\nClick to insert into editor`;
      case 'snippet': return `Code snippet: ${this.description}`;
      case 'context': return `Context item: ${this.description}`;
      case 'template': return `Prompt template: ${this.label}`;
      default: return this.label;
    }
  }
} 