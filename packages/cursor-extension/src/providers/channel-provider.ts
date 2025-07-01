import * as vscode from 'vscode';

export class WijaChannelProvider implements vscode.TreeDataProvider<string> {
  private context: vscode.ExtensionContext;
  private projectDetector: any;

  constructor(context: vscode.ExtensionContext, projectDetector: any) {
    this.context = context;
    this.projectDetector = projectDetector;
  }

  getTreeItem(element: string): vscode.TreeItem {
    return new vscode.TreeItem(element, vscode.TreeItemCollapsibleState.None);
  }

  getChildren(): Thenable<string[]> {
    const context = this.projectDetector.getProjectContext();
    return Promise.resolve(context?.channelRegistry || ['No channels found']);
  }

  async refresh(): Promise<void> {
    // Refresh logic
  }
} 