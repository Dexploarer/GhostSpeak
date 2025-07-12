/**
 * Enhanced Progress Indicator - Advanced progress tracking with time estimation
 */

import chalk from 'chalk';
import { EventEmitter } from 'events';
import { logger } from './logger.js';
import { TIMEOUTS } from './timeout.js';

export interface EnhancedProgressOptions {
  message: string;
  estimatedDuration?: number; // in milliseconds
  showElapsed?: boolean;
  showRemaining?: boolean;
  showStatus?: boolean;
  showRetries?: boolean;
  timeoutWarningThreshold?: number; // percentage of estimated duration before warning
  steps?: Array<{
    name: string;
    weight?: number; // relative weight for time estimation
  }>;
}

export interface ProgressStatus {
  elapsed: number;
  estimated: number;
  remaining: number;
  percentage: number;
  currentStep?: string;
  retryCount: number;
  isWarning: boolean;
}

/**
 * Enhanced progress indicator with time tracking and status updates
 */
export class EnhancedProgressIndicator extends EventEmitter {
  private message: string;
  private spinner: string[] = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private current: number = 0;
  private interval: NodeJS.Timeout | null = null;
  private startTime: number = 0;
  private estimatedDuration: number;
  private showElapsed: boolean;
  private showRemaining: boolean;
  private showStatus: boolean;
  private showRetries: boolean;
  private timeoutWarningThreshold: number;
  private steps: Array<{ name: string; weight: number }>;
  private currentStepIndex: number = -1;
  private completedStepWeights: number = 0;
  private totalStepWeights: number = 0;
  private retryCount: number = 0;
  private statusMessage: string = '';
  private isWarning: boolean = false;
  private lastRenderLength: number = 0;

  constructor(options: EnhancedProgressOptions | string) {
    super();
    
    const opts = typeof options === 'string' 
      ? { message: options } 
      : options;

    this.message = opts.message;
    this.estimatedDuration = opts.estimatedDuration || 15000; // Default 15 seconds
    this.showElapsed = opts.showElapsed !== false;
    this.showRemaining = opts.showRemaining !== false;
    this.showStatus = opts.showStatus !== false;
    this.showRetries = opts.showRetries !== false;
    this.timeoutWarningThreshold = opts.timeoutWarningThreshold || 0.8; // Warn at 80%
    
    // Process steps with weights
    this.steps = (opts.steps || []).map(step => ({
      name: step.name,
      weight: step.weight || 1
    }));
    
    this.totalStepWeights = this.steps.reduce((sum, step) => sum + step.weight, 0) || 1;
  }

  /**
   * Get current progress status
   */
  getStatus(): ProgressStatus {
    const elapsed = Date.now() - this.startTime;
    const percentage = this.calculatePercentage();
    const estimated = this.calculateEstimatedTotal();
    const remaining = Math.max(0, estimated - elapsed);
    
    return {
      elapsed,
      estimated,
      remaining,
      percentage,
      currentStep: this.currentStepIndex >= 0 ? this.steps[this.currentStepIndex]?.name : undefined,
      retryCount: this.retryCount,
      isWarning: this.isWarning
    };
  }

  /**
   * Calculate completion percentage based on steps or time
   */
  private calculatePercentage(): number {
    if (this.steps.length > 0 && this.totalStepWeights > 0) {
      return (this.completedStepWeights / this.totalStepWeights) * 100;
    }
    
    const elapsed = Date.now() - this.startTime;
    return Math.min(100, (elapsed / this.estimatedDuration) * 100);
  }

  /**
   * Calculate estimated total duration based on current progress
   */
  private calculateEstimatedTotal(): number {
    const percentage = this.calculatePercentage();
    if (percentage === 0) return this.estimatedDuration;
    
    const elapsed = Date.now() - this.startTime;
    return (elapsed / percentage) * 100;
  }

  /**
   * Format time duration
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  /**
   * Build the progress line
   */
  private buildProgressLine(): string {
    const parts: string[] = [];
    
    // Spinner
    const spinnerChar = this.isWarning 
      ? chalk.yellow(this.spinner[this.current])
      : chalk.blue(this.spinner[this.current]);
    parts.push(spinnerChar);
    
    // Main message
    parts.push(chalk.gray(this.message));
    
    // Time information
    const timeInfo: string[] = [];
    
    if (this.showElapsed || this.showRemaining) {
      const status = this.getStatus();
      
      if (this.showElapsed) {
        timeInfo.push(`${this.formatDuration(status.elapsed)} elapsed`);
      }
      
      if (this.showRemaining && status.remaining > 0) {
        const remainingText = this.isWarning
          ? chalk.yellow(`~${this.formatDuration(status.remaining)} remaining`)
          : `~${this.formatDuration(status.remaining)} remaining`;
        timeInfo.push(remainingText);
      }
    }
    
    if (timeInfo.length > 0) {
      parts.push(chalk.gray(`[${timeInfo.join(', ')}]`));
    }
    
    // Retry count
    if (this.showRetries && this.retryCount > 0) {
      parts.push(chalk.yellow(`(retry ${this.retryCount})`));
    }
    
    return parts.join(' ');
  }

  /**
   * Build the status line
   */
  private buildStatusLine(): string {
    if (!this.showStatus || !this.statusMessage) return '';
    
    const indent = '  └─ ';
    return '\n' + chalk.gray(indent + this.statusMessage);
  }

  /**
   * Render the progress
   */
  private render(): void {
    const mainLine = this.buildProgressLine();
    const statusLine = this.buildStatusLine();
    const fullOutput = mainLine + statusLine;
    
    // Clear previous output
    if (this.lastRenderLength > 0) {
      process.stdout.write('\r\x1b[K'); // Clear current line
      if (this.statusMessage && this.showStatus) {
        process.stdout.write('\x1b[1A\x1b[K'); // Move up and clear status line
      }
    }
    
    // Write new output
    process.stdout.write(fullOutput);
    this.lastRenderLength = fullOutput.length;
  }

  /**
   * Check for timeout warning
   */
  private checkTimeoutWarning(): void {
    const status = this.getStatus();
    const elapsedPercentage = status.elapsed / this.estimatedDuration;
    
    if (elapsedPercentage >= this.timeoutWarningThreshold && !this.isWarning) {
      this.isWarning = true;
      this.emit('warning', status);
      logger.general.warn(`Operation taking longer than expected: ${this.message}`);
    }
  }

  /**
   * Start the progress indicator
   */
  start(): void {
    this.startTime = Date.now();
    this.render();
    
    this.interval = setInterval(() => {
      this.current = (this.current + 1) % this.spinner.length;
      this.checkTimeoutWarning();
      this.render();
    }, 100);
  }

  /**
   * Update the main message
   */
  update(message: string): void {
    this.message = message;
    this.render();
  }

  /**
   * Update the status message
   */
  updateStatus(status: string): void {
    this.statusMessage = status;
    this.render();
  }

  /**
   * Start a new step
   */
  startStep(index: number): void {
    if (index < 0 || index >= this.steps.length) return;
    
    // Complete previous step
    if (this.currentStepIndex >= 0 && this.currentStepIndex < index) {
      this.completedStepWeights += this.steps[this.currentStepIndex].weight;
    }
    
    this.currentStepIndex = index;
    this.updateStatus(this.steps[index].name);
  }

  /**
   * Complete current step
   */
  completeStep(): void {
    if (this.currentStepIndex >= 0 && this.currentStepIndex < this.steps.length) {
      this.completedStepWeights += this.steps[this.currentStepIndex].weight;
      this.currentStepIndex++;
    }
  }

  /**
   * Increment retry count
   */
  retry(): void {
    this.retryCount++;
    this.render();
  }

  /**
   * Update estimated duration based on current progress
   */
  updateEstimate(newEstimate: number): void {
    this.estimatedDuration = newEstimate;
    this.render();
  }

  /**
   * Mark operation as successful
   */
  succeed(message?: string): void {
    this.stop();
    const finalMessage = message || this.message;
    const duration = this.formatDuration(Date.now() - this.startTime);
    console.log(`${chalk.green('✓')} ${finalMessage} ${chalk.gray(`(${duration})`)}`);
    this.emit('success', this.getStatus());
  }

  /**
   * Mark operation as failed
   */
  fail(message?: string): void {
    this.stop();
    const finalMessage = message || this.message;
    const duration = this.formatDuration(Date.now() - this.startTime);
    console.log(`${chalk.red('✗')} ${finalMessage} ${chalk.gray(`(${duration})`)}`);
    this.emit('failure', this.getStatus());
  }

  /**
   * Stop the progress indicator
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    // Clear all lines
    if (this.lastRenderLength > 0) {
      process.stdout.write('\r\x1b[K');
      if (this.statusMessage && this.showStatus) {
        process.stdout.write('\x1b[1A\x1b[K');
      }
    }
  }

  /**
   * Pause the spinner (useful during user input)
   */
  pause(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /**
   * Resume the spinner after pause
   */
  resume(): void {
    if (!this.interval) {
      this.interval = setInterval(() => {
        this.current = (this.current + 1) % this.spinner.length;
        this.checkTimeoutWarning();
        this.render();
      }, 100);
    }
  }
}

/**
 * Operation time estimates based on historical data
 */
export const OPERATION_ESTIMATES = {
  // Network operations
  CONNECT_BLOCKCHAIN: 3000,
  CREATE_CHANNEL: 20000,
  SEND_TRANSACTION: 15000,
  CONFIRM_TRANSACTION: 30000,
  
  // Data operations
  FETCH_ACCOUNTS: 5000,
  LOAD_ANALYTICS: 8000,
  SEARCH_MARKETPLACE: 10000,
  
  // Agent operations
  REGISTER_AGENT: 25000,
  UPDATE_AGENT: 15000,
  
  // Escrow operations
  CREATE_ESCROW: 20000,
  DEPOSIT_ESCROW: 15000,
  RELEASE_ESCROW: 18000,
  
  // System operations
  RUN_DIAGNOSTICS: 12000,
  CHECK_HEALTH: 5000,
} as const;

/**
 * Create an enhanced progress indicator with automatic time estimation
 */
export function createEnhancedProgress(
  message: string,
  operationType?: keyof typeof OPERATION_ESTIMATES,
  options?: Partial<EnhancedProgressOptions>
): EnhancedProgressIndicator {
  const estimatedDuration = operationType 
    ? OPERATION_ESTIMATES[operationType] 
    : options?.estimatedDuration || 15000;
    
  return new EnhancedProgressIndicator({
    message,
    estimatedDuration,
    showElapsed: true,
    showRemaining: true,
    showStatus: true,
    showRetries: true,
    ...options
  });
}

/**
 * Execute an operation with enhanced progress tracking
 */
export async function withEnhancedProgress<T>(
  config: EnhancedProgressOptions | string,
  operation: (progress: EnhancedProgressIndicator) => Promise<T>
): Promise<T> {
  const progress = config instanceof EnhancedProgressIndicator 
    ? config 
    : new EnhancedProgressIndicator(config);
  
  try {
    progress.start();
    const result = await operation(progress);
    progress.succeed();
    return result;
  } catch (error) {
    progress.fail();
    throw error;
  }
}

/**
 * Helper to add timeout warnings to existing operations
 */
export function addTimeoutWarning(
  progress: EnhancedProgressIndicator,
  timeoutMs: number,
  warningMessage?: string
): NodeJS.Timeout {
  const warningThreshold = timeoutMs * 0.8; // Warn at 80% of timeout
  
  return setTimeout(() => {
    progress.updateStatus(
      warningMessage || 
      `Operation approaching timeout (${Math.floor(timeoutMs / 1000)}s limit)`
    );
    progress.emit('timeout-warning', timeoutMs);
  }, warningThreshold);
}