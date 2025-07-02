import chalk from 'chalk';
import boxen from 'boxen';
import { createSpinner } from 'nanospinner';
import gradient from 'gradient-string';
import figlet from 'figlet';
import { ConfigManager } from '../utils/config-manager';

export interface ProgressStep {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  error?: string;
}

export interface TableRow {
  [key: string]: string | number;
}

export class UIManager {
  private theme = {
    primary: chalk.cyan,
    secondary: chalk.blue,
    success: chalk.green,
    warning: chalk.yellow,
    error: chalk.red,
    muted: chalk.gray,
    accent: chalk.magenta,
    info: chalk.white
  };

  private configManager: ConfigManager;

  constructor() {
    this.configManager = new ConfigManager();
  }

  /**
   * Display a section header
   */
  sectionHeader(title: string, subtitle?: string): void {
    // Always print to stdout, never clear/overwrite
    console.log();
    console.log(this.theme.primary(chalk.bold(`📌 ${title}`)));
    if (subtitle) {
      console.log(this.theme.muted(`   ${subtitle}`));
    }
    const repeatLength = Math.max((title?.length ?? 0) + 4, 40);
    console.log(this.theme.muted('   ' + '─'.repeat(repeatLength)));
    console.log();
  }

  /**
   * Display a success message
   */
  success(message: string, details?: string): void {
    console.log(this.theme.success(`✅ ${message}`));
    if (details) {
      console.log(this.theme.muted(`   ${details}`));
    }
  }

  /**
   * Display an error message
   */
  error(message: string, details?: string): void {
    console.log(this.theme.error(`❌ ${message}`));
    if (details) {
      console.log(this.theme.muted(`   ${details}`));
    }
  }

  /**
   * Display a warning message
   */
  warning(message: string, details?: string): void {
    console.log(this.theme.warning(`⚠️  ${message}`));
    if (details) {
      console.log(this.theme.muted(`   ${details}`));
    }
  }

  /**
   * Display an info message
   */
  info(message: string, details?: string): void {
    console.log(this.theme.info(`ℹ️  ${message}`));
    if (details) {
      console.log(this.theme.muted(`   ${details}`));
    }
  }

  /**
   * Display a loading spinner with message
   */
  spinner(message: string) {
    return createSpinner(message);
  }

  /**
   * Start a progress indicator
   */
  startProgress(message: string) {
    const spinner = this.spinner(message);
    spinner.start();
    return spinner;
  }

  /**
   * Display a progress bar for multiple steps
   */
  displayProgress(steps: ProgressStep[]): void {
    console.log();
    console.log(this.theme.primary('📋 Progress:'));
    
    steps.forEach((step, index) => {
      const prefix = `${index + 1}.`;
      let icon: string;
      let color: (text: string) => string;
      let statusText: string;

      switch (step.status) {
        case 'pending':
          icon = '⏳';
          color = this.theme.muted;
          statusText = 'Pending';
          break;
        case 'running':
          icon = '⚡';
          color = this.theme.info;
          statusText = 'Running';
          break;
        case 'success':
          icon = '✅';
          color = this.theme.success;
          statusText = 'Complete';
          break;
        case 'error':
          icon = '❌';
          color = this.theme.error;
          statusText = 'Failed';
          break;
      }

      console.log(`   ${prefix} ${icon} ${color(step.name)} ${this.theme.muted(`(${statusText})`)}`)
      
      if (step.message) {
        console.log(`      ${this.theme.muted(step.message)}`);
      }
      
      if (step.error) {
        console.log(`      ${this.theme.error(step.error)}`);
      }
    });
    
    console.log();
  }

  /**
   * Helper to ensure column width is always a valid number
   */
  private safeWidth(val: number | undefined): number {
    return typeof val === 'number' && isFinite(val) ? val : 1;
  }

  /**
   * Display a table of data
   */
  table(headers: string[], rows: TableRow[]): void {
    if (rows.length === 0) {
      console.log(this.theme.muted('   No data to display'));
      return;
    }

    // Calculate column widths
    const widths: number[] = headers.map(header => header.length);
    rows.forEach(row => {
      headers.forEach((header, i) => {
        const value = String(row[header] || '');
        widths[i] = Math.max(widths[i], value.length);
      });
    });

    // Display header
    const headerRow = headers.map((header, i) => 
      this.theme.primary(chalk.bold(header.padEnd(this.safeWidth(widths[i]))))
    ).join('  ');
    console.log(`   ${headerRow}`);
    
    // Display separator
    const separator = headers.map((_, i) => '─'.repeat(this.safeWidth(widths[i]))).join('  ');
    console.log(`   ${this.theme.muted(separator)}`);
    
    // Display rows
    rows.forEach(row => {
      const dataRow = headers.map((header, i) => {
        const value = String(row[header] || '');
        return value.padEnd(this.safeWidth(widths[i]));
      }).join('  ');
      console.log(`   ${dataRow}`);
    });
    
    console.log();
  }

  /**
   * Display a formatted box with content
   */
  box(content: string, options?: {
    title?: string;
    color?: 'cyan' | 'green' | 'yellow' | 'red' | 'blue';
    padding?: number;
  }): void {
    const { title, color = 'cyan', padding = 1 } = options || {};
    
    const boxOptions = {
      padding,
      borderStyle: 'round' as const,
      borderColor: color,
      title: title ? ` ${title} ` : undefined
    };

    console.log(boxen(content, boxOptions));
    console.log();
  }

  /**
   * Display key-value pairs
   */
  keyValue(data: Record<string, any>, indent: number = 0): void {
    const spaces = ' '.repeat(indent || 0);
    
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        console.log(`${spaces}${this.theme.primary(key)}:`);
        this.keyValue(value, indent + 2);
      } else if (Array.isArray(value)) {
        console.log(`${spaces}${this.theme.primary(key)}: ${this.theme.info(value.join(', '))}`);
      } else {
        console.log(`${spaces}${this.theme.primary(key)}: ${this.theme.info(String(value))}`);
      }
    });
    
    if (indent === 0) console.log();
  }

  /**
   * Display a large ASCII art title
   */
  bigTitle(text: string, subtitle?: string): void {
    // Always print to stdout, never clear/overwrite
    const title = figlet.textSync(text, {
      font: 'Big',
      horizontalLayout: 'default',
      verticalLayout: 'default'
    });
    console.log(gradient.cristal(title));
    if (subtitle) {
      console.log();
      console.log(this.theme.muted(`   ${subtitle}`));
    }
    console.log();
  }

  /**
   * Display a divider
   */
  divider(char: string = '─', length: number = 60): void {
    console.log(this.theme.muted(char.repeat(Number.isFinite(length) ? length : 1)));
  }

  /**
   * Clear the terminal (no-op in test environments)
   */
  clear(): void {
    if (this.isTestMode()) {
      // In test mode, don't clear to preserve output for test capture
      return;
    }
    if (process.env.NODE_ENV === 'test' || process.env.BUN_TESTING) {
      // No-op for test output capture
      return;
    }
    console.clear();
  }

  /**
   * Add spacing
   */
  spacing(lines: number = 1): void {
    console.log('\n'.repeat(Number.isFinite(lines) && lines > 1 ? lines - 1 : 0));
  }

  /**
   * Display a confirmation prompt result
   */
  confirmation(message: string, confirmed: boolean): void {
    const icon = confirmed ? '✅' : '❌';
    const color = confirmed ? this.theme.success : this.theme.error;
    console.log(`${icon} ${color(message)}`);
  }

  /**
   * Display network status
   */
  networkStatus(network: string, connected: boolean, latency?: number): void {
    const status = connected ? 'Connected' : 'Disconnected';
    const color = connected ? this.theme.success : this.theme.error;
    const icon = connected ? '🟢' : '🔴';
    
    let message = `${icon} ${network.toUpperCase()}: ${color(status)}`;
    
    if (connected && latency !== undefined) {
      const latencyColor = latency < 100 ? this.theme.success : 
                          latency < 500 ? this.theme.warning : this.theme.error;
      message += ` ${this.theme.muted('(')}${latencyColor(`${latency}ms`)}${this.theme.muted(')')}`;
    }
    
    console.log(`   ${message}`);
  }

  /**
   * Display transaction status
   */
  transaction(signature: string, status: 'pending' | 'confirmed' | 'failed', error?: string): void {
    let icon: string;
    let color: (text: string) => string;
    let statusText: string;

    switch (status) {
      case 'pending':
        icon = '⏳';
        color = this.theme.warning;
        statusText = 'Pending';
        break;
      case 'confirmed':
        icon = '✅';
        color = this.theme.success;
        statusText = 'Confirmed';
        break;
      case 'failed':
        icon = '❌';
        color = this.theme.error;
        statusText = 'Failed';
        break;
    }

    console.log(`   ${icon} Transaction: ${color(statusText)}`);
    console.log(`      Signature: ${this.theme.muted(signature)}`);
    
    if (error) {
      console.log(`      Error: ${this.theme.error(error)}`);
    }
    
    console.log();
  }

  /**
   * Get theme colors for external use
   */
  getTheme() {
    return this.theme;
  }

  private isTestMode(): boolean {
    return this.configManager.isTestMode();
  }
} 