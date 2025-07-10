/**
 * Interactive Prompts - User Interaction Utilities
 *
 * Provides user confirmation, input prompts, and interactive selections.
 */

import chalk from 'chalk';
import { createInterface } from 'readline';

export interface ConfirmOptions {
  message: string;
  defaultValue?: boolean;
  abortMessage?: string;
}

export interface PromptOptions {
  message: string;
  defaultValue?: string;
  required?: boolean;
  validator?: (input: string) => boolean | string;
}

export interface SelectOptions {
  message: string;
  choices: Array<{ name: string; value: string; description?: string }>;
  defaultIndex?: number;
}

/**
 * Ask for user confirmation (y/N)
 */
export async function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const defaultText = options.defaultValue ? 'Y/n' : 'y/N';
    const prompt = `${options.message} (${defaultText}): `;

    rl.question(chalk.yellow(prompt), (answer) => {
      rl.close();

      const normalizedAnswer = answer.toLowerCase().trim();
      
      if (normalizedAnswer === '') {
        resolve(options.defaultValue || false);
      } else if (normalizedAnswer === 'y' || normalizedAnswer === 'yes') {
        resolve(true);
      } else if (normalizedAnswer === 'n' || normalizedAnswer === 'no') {
        resolve(false);
      } else {
        // Invalid input, ask again
        console.log(chalk.red('Please answer with y/yes or n/no'));
        confirm(options).then(resolve);
      }
    });
  });
}

/**
 * Prompt for text input
 */
export async function prompt(options: PromptOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const defaultText = options.defaultValue ? ` (${options.defaultValue})` : '';
    const promptText = `${options.message}${defaultText}: `;

    rl.question(chalk.yellow(promptText), (answer) => {
      rl.close();

      const input = answer.trim() || options.defaultValue || '';

      // Check if required
      if (options.required && !input) {
        console.log(chalk.red('This field is required'));
        prompt(options).then(resolve).catch(reject);
        return;
      }

      // Validate input
      if (options.validator && input) {
        const validation = options.validator(input);
        if (validation !== true) {
          const errorMessage = typeof validation === 'string' ? validation : 'Invalid input';
          console.log(chalk.red(errorMessage));
          prompt(options).then(resolve).catch(reject);
          return;
        }
      }

      resolve(input);
    });
  });
}

/**
 * Select from a list of options
 */
export async function select(options: SelectOptions): Promise<string> {
  return new Promise((resolve) => {
    console.log(chalk.yellow(options.message));
    
    options.choices.forEach((choice, index) => {
      const isDefault = index === (options.defaultIndex || 0);
      const marker = isDefault ? chalk.green('›') : ' ';
      const description = choice.description ? chalk.gray(` - ${choice.description}`) : '';
      console.log(`${marker} ${index + 1}. ${choice.name}${description}`);
    });

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(chalk.yellow(`\nSelect an option (1-${options.choices.length}): `), (answer) => {
      rl.close();

      const choice = parseInt(answer.trim());
      
      if (isNaN(choice) || choice < 1 || choice > options.choices.length) {
        if (answer.trim() === '' && options.defaultIndex !== undefined) {
          resolve(options.choices[options.defaultIndex].value);
        } else {
          console.log(chalk.red(`Please enter a number between 1 and ${options.choices.length}`));
          select(options).then(resolve);
        }
      } else {
        resolve(options.choices[choice - 1].value);
      }
    });
  });
}

/**
 * Display a progress indicator
 */
export class ProgressIndicator {
  private message: string;
  private spinner: string[] = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private current: number = 0;
  private interval: NodeJS.Timeout | null = null;

  constructor(message: string) {
    this.message = message;
  }

  start(): void {
    process.stdout.write(`${chalk.blue(this.spinner[0])} ${chalk.gray(this.message)}`);
    
    this.interval = setInterval(() => {
      this.current = (this.current + 1) % this.spinner.length;
      process.stdout.write(`\r${chalk.blue(this.spinner[this.current])} ${chalk.gray(this.message)}`);
    }, 100);
  }

  update(message: string): void {
    this.message = message;
  }

  succeed(message?: string): void {
    this.stop();
    const finalMessage = message || this.message;
    console.log(`${chalk.green('✓')} ${finalMessage}`);
  }

  fail(message?: string): void {
    this.stop();
    const finalMessage = message || this.message;
    console.log(`${chalk.red('✗')} ${finalMessage}`);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    process.stdout.write('\r\x1b[K'); // Clear line
  }
}

/**
 * Create a table display
 */
export function createTable(headers: string[], rows: string[][]): void {
  // Calculate column widths
  const widths = headers.map((header, index) => {
    const columnValues = [header, ...rows.map(row => row[index] || '')];
    return Math.max(...columnValues.map(val => val.length)) + 2;
  });

  // Print header
  const headerRow = headers.map((header, index) => header.padEnd(widths[index])).join('');
  console.log(chalk.cyan(headerRow));
  console.log(chalk.gray('─'.repeat(headerRow.length)));

  // Print rows
  rows.forEach(row => {
    const rowText = row.map((cell, index) => (cell || '').padEnd(widths[index])).join('');
    console.log(rowText);
  });
}

/**
 * Display a warning with confirmation
 */
export async function warning(message: string, confirmMessage?: string): Promise<boolean> {
  console.log(chalk.yellow('⚠️  Warning: ') + message);
  
  if (confirmMessage) {
    return await confirm({
      message: confirmMessage,
      defaultValue: false
    });
  }
  
  return true;
}

/**
 * Display an error message
 */
export function error(message: string, details?: string): void {
  console.log(chalk.red('❌ Error: ') + message);
  
  if (details) {
    console.log(chalk.gray('Details: ') + details);
  }
}

/**
 * Display a success message
 */
export function success(message: string, details?: string): void {
  console.log(chalk.green('✅ ') + message);
  
  if (details) {
    console.log(chalk.gray(details));
  }
}

/**
 * Display an info message
 */
export function info(message: string, details?: string): void {
  console.log(chalk.blue('ℹ️  ') + message);
  
  if (details) {
    console.log(chalk.gray(details));
  }
}

/**
 * Create a step-by-step process display
 */
export class StepProcess {
  private steps: Array<{ name: string; status: 'pending' | 'running' | 'completed' | 'failed' }> = [];
  private currentStep: number = -1;

  addStep(name: string): void {
    this.steps.push({ name, status: 'pending' });
  }

  startStep(index: number): void {
    if (this.currentStep >= 0) {
      this.steps[this.currentStep].status = 'completed';
    }
    
    this.currentStep = index;
    this.steps[index].status = 'running';
    this.display();
  }

  completeStep(index?: number): void {
    const stepIndex = index !== undefined ? index : this.currentStep;
    if (stepIndex >= 0) {
      this.steps[stepIndex].status = 'completed';
    }
    this.display();
  }

  failStep(index?: number): void {
    const stepIndex = index !== undefined ? index : this.currentStep;
    if (stepIndex >= 0) {
      this.steps[stepIndex].status = 'failed';
    }
    this.display();
  }

  private display(): void {
    console.clear();
    console.log(chalk.cyan('📋 Process Steps:\n'));
    
    this.steps.forEach((step, index) => {
      let icon: string;
      let color: (text: string) => string;
      
      switch (step.status) {
        case 'pending':
          icon = '○';
          color = chalk.gray;
          break;
        case 'running':
          icon = '◐';
          color = chalk.blue;
          break;
        case 'completed':
          icon = '●';
          color = chalk.green;
          break;
        case 'failed':
          icon = '✗';
          color = chalk.red;
          break;
      }
      
      console.log(`  ${color(icon)} ${step.name}`);
    });
    
    console.log('');
  }
}