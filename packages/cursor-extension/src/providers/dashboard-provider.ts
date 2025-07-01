import * as vscode from 'vscode';

export class WijaDashboardProvider implements vscode.WebviewViewProvider {
  private context: vscode.ExtensionContext;
  private config: any;

  constructor(context: vscode.ExtensionContext, config: any) {
    this.context = context;
    this.config = config;
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri]
    };

    webviewView.webview.html = this.getHtmlContent();
  }

  async show(): Promise<void> {
    await vscode.commands.executeCommand('workbench.view.extension.wija-studio');
  }

  private getHtmlContent(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Wija Dashboard</title>
        <style>
          body { font-family: var(--vscode-font-family); }
          .header { background: var(--vscode-button-background); color: var(--vscode-button-foreground); padding: 1rem; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>🔮 Wija Dashboard</h2>
        </div>
        <div style="padding: 1rem;">
          <p>Welcome to Wija Studio!</p>
          <button onclick="initProject()">Initialize Project</button>
        </div>
        <script>
          function initProject() {
            const vscode = acquireVsCodeApi();
            vscode.postMessage({ command: 'initialize' });
          }
        </script>
      </body>
      </html>
    `;
  }
} 