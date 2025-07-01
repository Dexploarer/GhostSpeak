import * as vscode from 'vscode';

export class WijaStatusBar {
  constructor(private context: vscode.ExtensionContext, private projectDetector: any, private networkProvider: any, private walletProvider: any) {}
  initialize(): void {}
  updateProjectStatus(context: any): void {}
} 