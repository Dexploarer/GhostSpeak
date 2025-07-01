import * as vscode from 'vscode';

export class WijaWalletProvider implements vscode.TreeDataProvider<string> {
  constructor(private context: vscode.ExtensionContext, private config: any) {}
  getTreeItem(element: string): vscode.TreeItem { return new vscode.TreeItem(element); }
  getChildren(): Thenable<string[]> { return Promise.resolve(['Wallet Status']); }
  async refresh(): Promise<void> {}
} 