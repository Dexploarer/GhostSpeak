import * as vscode from 'vscode';

export class WijaDebugAdapter implements vscode.DebugAdapterDescriptorFactory {
  constructor(private context: vscode.ExtensionContext, private config: any) {}
  createDebugAdapterDescriptor(): vscode.DebugAdapterDescriptor {
    return new vscode.DebugAdapterInlineImplementation({} as any);
  }
} 