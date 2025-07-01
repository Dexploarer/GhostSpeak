import * as vscode from 'vscode';
import * as path from 'path';
import { WijaConfig } from '../config/wija-config';

export interface WijaTaskDefinition extends vscode.TaskDefinition {
  type: 'wija';
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
}

export class WijaTaskProvider implements vscode.TaskProvider {
  private static WijaType = 'wija';
  private tasks: vscode.Task[] | undefined;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly config: WijaConfig
  ) {}

  public async provideTasks(): Promise<vscode.Task[]> {
    return this.getTasks();
  }

  public resolveTask(task: vscode.Task): vscode.Task | undefined {
    const definition = task.definition as WijaTaskDefinition;
    
    if (definition.type === WijaTaskProvider.WijaType) {
      // Create execution for the task
      const execution = this.createTaskExecution(definition);
      
      return new vscode.Task(
        definition,
        task.scope ?? vscode.TaskScope.Workspace,
        task.name,
        WijaTaskProvider.WijaType,
        execution,
        task.problemMatchers
      );
    }
    
    return undefined;
  }

  private async getTasks(): Promise<vscode.Task[]> {
    if (this.tasks !== undefined) {
      return this.tasks;
    }

    this.tasks = [];
    
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return this.tasks;
    }

    // Check if this is a Wija project
    const hasWijaConfig = await this.hasWijaProject(workspaceFolder);
    if (!hasWijaConfig) {
      return this.tasks;
    }

    // Add Wija-specific tasks
    this.addBuildTasks(workspaceFolder);
    this.addTestTasks(workspaceFolder);
    this.addDeploymentTasks(workspaceFolder);
    this.addDevelopmentTasks(workspaceFolder);
    this.addMaintenanceTasks(workspaceFolder);

    return this.tasks;
  }

  private async hasWijaProject(workspaceFolder: vscode.WorkspaceFolder): Promise<boolean> {
    try {
      // Check for Wija project indicators
      const wijaConfig = vscode.Uri.joinPath(workspaceFolder.uri, '.wija');
      const anchorToml = vscode.Uri.joinPath(workspaceFolder.uri, 'Anchor.toml');
      const packageJson = vscode.Uri.joinPath(workspaceFolder.uri, 'package.json');

      const [wijaExists, anchorExists, packageExists] = await Promise.all([
        vscode.workspace.fs.stat(wijaConfig).then(() => true, () => false),
        vscode.workspace.fs.stat(anchorToml).then(() => true, () => false),
        vscode.workspace.fs.stat(packageJson).then(() => true, () => false)
      ]);

      return wijaExists || anchorExists || packageExists;
    } catch {
      return false;
    }
  }

  private addBuildTasks(workspaceFolder: vscode.WorkspaceFolder): void {
    // Build All
    this.tasks!.push(this.createTask(
      workspaceFolder,
      'Build All',
      ['build'],
      'Build all Wija components',
      '$(tools) Build'
    ));

    // Build Anchor Programs
    this.tasks!.push(this.createTask(
      workspaceFolder,
      'Build Anchor Programs',
      ['build', 'anchor'],
      'Build Anchor smart contracts',
      '$(symbol-class) Build Anchor'
    ));

    // Build TypeScript SDK
    this.tasks!.push(this.createTask(
      workspaceFolder,
      'Build TypeScript SDK',
      ['build', 'typescript'],
      'Build TypeScript SDK',
      '$(symbol-namespace) Build TS SDK'
    ));

    // Build Rust SDK
    this.tasks!.push(this.createTask(
      workspaceFolder,
      'Build Rust SDK',
      ['build', 'rust'],
      'Build Rust SDK',
      '$(symbol-struct) Build Rust SDK'
    ));
  }

  private addTestTasks(workspaceFolder: vscode.WorkspaceFolder): void {
    // Test All
    this.tasks!.push(this.createTask(
      workspaceFolder,
      'Test All',
      ['test'],
      'Run all tests',
      '$(beaker) Test All',
      'test'
    ));

    // Unit Tests
    this.tasks!.push(this.createTask(
      workspaceFolder,
      'Unit Tests',
      ['test', 'unit'],
      'Run unit tests',
      '$(symbol-method) Unit Tests',
      'test'
    ));

    // Integration Tests
    this.tasks!.push(this.createTask(
      workspaceFolder,
      'Integration Tests',
      ['test', 'integration'],
      'Run integration tests',
      '$(link) Integration Tests',
      'test'
    ));

    // Anchor Tests
    this.tasks!.push(this.createTask(
      workspaceFolder,
      'Anchor Tests',
      ['test', 'anchor'],
      'Run Anchor program tests',
      '$(symbol-class) Anchor Tests',
      'test'
    ));
  }

  private addDeploymentTasks(workspaceFolder: vscode.WorkspaceFolder): void {
    const network = this.config.getDefaultCluster();

    // Deploy Agents
    this.tasks!.push(this.createTask(
      workspaceFolder,
      'Deploy Agents',
      ['agent', 'deploy', '--network', network],
      `Deploy agents to ${network}`,
      '$(rocket) Deploy Agents'
    ));

    // Deploy to Devnet
    this.tasks!.push(this.createTask(
      workspaceFolder,
      'Deploy to Devnet',
      ['deploy', '--network', 'devnet'],
      'Deploy to Solana Devnet',
      '$(cloud-upload) Deploy Devnet'
    ));

    // Deploy to Mainnet
    this.tasks!.push(this.createTask(
      workspaceFolder,
      'Deploy to Mainnet',
      ['deploy', '--network', 'mainnet-beta'],
      'Deploy to Solana Mainnet',
      '$(globe) Deploy Mainnet'
    ));
  }

  private addDevelopmentTasks(workspaceFolder: vscode.WorkspaceFolder): void {
    // Start Local Network
    this.tasks!.push(this.createTask(
      workspaceFolder,
      'Start Local Network',
      ['network', 'start'],
      'Start local Solana test validator',
      '$(play) Start Network'
    ));

    // Watch Mode
    this.tasks!.push(this.createTask(
      workspaceFolder,
      'Watch Build',
      ['build', '--watch'],
      'Build in watch mode',
      '$(eye) Watch Build'
    ));

    // Generate SDK Code
    this.tasks!.push(this.createTask(
      workspaceFolder,
      'Generate SDK',
      ['codegen'],
      'Generate SDK code from IDL',
      '$(code) Generate SDK'
    ));

    // Lint Code
    this.tasks!.push(this.createTask(
      workspaceFolder,
      'Lint',
      ['lint'],
      'Run code linting',
      '$(checklist) Lint'
    ));

    // Format Code
    this.tasks!.push(this.createTask(
      workspaceFolder,
      'Format',
      ['format'],
      'Format code',
      '$(symbol-color) Format'
    ));
  }

  private addMaintenanceTasks(workspaceFolder: vscode.WorkspaceFolder): void {
    // Clean Build
    this.tasks!.push(this.createTask(
      workspaceFolder,
      'Clean',
      ['clean'],
      'Clean build artifacts',
      '$(trash) Clean'
    ));

    // Update Dependencies
    this.tasks!.push(this.createTask(
      workspaceFolder,
      'Update Dependencies',
      ['update'],
      'Update project dependencies',
      '$(sync) Update Deps'
    ));

    // Security Audit
    this.tasks!.push(this.createTask(
      workspaceFolder,
      'Security Audit',
      ['audit'],
      'Run security audit',
      '$(shield) Security Audit'
    ));

    // Backup Project
    this.tasks!.push(this.createTask(
      workspaceFolder,
      'Backup',
      ['backup'],
      'Create project backup',
      '$(archive) Backup'
    ));
  }

  private createTask(
    workspaceFolder: vscode.WorkspaceFolder,
    name: string,
    args: string[],
    detail: string,
    icon: string,
    group?: string
  ): vscode.Task {
    const definition: WijaTaskDefinition = {
      type: WijaTaskProvider.WijaType,
      command: 'wija',
      args: args
    };

    const execution = this.createTaskExecution(definition);

    const task = new vscode.Task(
      definition,
      workspaceFolder,
      name,
      WijaTaskProvider.WijaType,
      execution,
      ['$wija-errors'] // Problem matcher for Wija errors
    );

    task.detail = detail;
    task.source = 'Wija';

    // Set task group
    if (group === 'test') {
      task.group = vscode.TaskGroup.Test;
    } else if (name.toLowerCase().includes('build')) {
      task.group = vscode.TaskGroup.Build;
    } else if (name.toLowerCase().includes('clean')) {
      task.group = vscode.TaskGroup.Clean;
    }

    // Add presentation options for better UX
    task.presentationOptions = {
      echo: true,
      reveal: vscode.TaskRevealKind.Always,
      focus: false,
      panel: vscode.TaskPanelKind.Shared,
      showReuseMessage: true,
      clear: false
    };

    return task;
  }

  private createTaskExecution(definition: WijaTaskDefinition): vscode.ProcessExecution {
    const customCliPath = this.config.getCustomCliPath();
    const wijaCommand = customCliPath || 'wija';

    const options: vscode.ProcessExecutionOptions = {
      cwd: definition.cwd || '${workspaceFolder}',
      env: {
        ...process.env,
        ...definition.env
      }
    };

    return new vscode.ProcessExecution(
      wijaCommand,
      definition.args || [],
      options
    );
  }

  // Public method to refresh tasks
  public refresh(): void {
    this.tasks = undefined;
  }

  // Public method to add custom task
  public addCustomTask(
    name: string,
    command: string,
    args: string[] = [],
    workspaceFolder?: vscode.WorkspaceFolder
  ): void {
    if (!this.tasks) {
      this.tasks = [];
    }

    const folder = workspaceFolder || vscode.workspace.workspaceFolders?.[0];
    if (!folder) return;

    const definition: WijaTaskDefinition = {
      type: WijaTaskProvider.WijaType,
      command: command,
      args: args
    };

    const execution = this.createTaskExecution(definition);

    const task = new vscode.Task(
      definition,
      folder,
      name,
      WijaTaskProvider.WijaType,
      execution
    );

    task.source = 'Wija Custom';
    this.tasks.push(task);
  }
}
