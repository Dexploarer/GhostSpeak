import * as vscode from 'vscode';

export class WijaNetworkProvider implements vscode.TreeDataProvider<string> {
  constructor(private context: vscode.ExtensionContext, private config: any) {}
  getTreeItem(element: string): vscode.TreeItem { return new vscode.TreeItem(element); }
  getChildren(): Thenable<string[]> { return Promise.resolve(['Network Status']); }
  async refresh(): Promise<void> {}
} 