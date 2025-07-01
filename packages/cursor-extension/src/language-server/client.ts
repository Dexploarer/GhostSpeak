import * as vscode from 'vscode';

export class WijaLanguageServer {
  constructor(private context: vscode.ExtensionContext, private config: any) {}
  async start(): Promise<void> {}
 