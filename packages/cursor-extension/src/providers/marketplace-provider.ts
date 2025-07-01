import * as vscode from 'vscode';

export class WijaMarketplaceProvider implements vscode.TreeDataProvider<any>, vscode.WebviewViewProvider {
  private context: vscode.ExtensionContext;
  private config: any;

  constructor(context: vscode.ExtensionContext, config: any) {
    this.context = context;
    this.config = config;
  }

  getTreeItem(element: any): vscode.TreeItem {
    return new vscode.TreeItem(element.label);
  }

  getChildren(): Thenable<any[]> {
    return Promise.resolve([
      { label: 'Agent Marketplace' },
      { label: 'Available Agents' },
      { label: 'Featured Agents' }
    ]);
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    webviewView.webview.html = '<h2>🛒 Wija Marketplace</h2>';
  }

  async show(): Promise<void> {
    await vscode.commands.executeCommand('workbench.view.extension.wija-studio');
  }
} 