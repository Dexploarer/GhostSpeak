import * as vscode from 'vscode';

export class WijaTaskProvider implements vscode.TaskProvider {
  constructor(
    private context: vscode.ExtensionContext,
    private readonly config: any
  ) {}
  provideTasks(): vscode.ProviderResult<vscode.Task[]> {
    return [];
  }
  resolveTask(task: vscode.Task): vscode.ProviderResult<vscode.Task> {
    return task;
  }
}
