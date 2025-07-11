/**
 * Progress Utilities - Standardized progress indicators for CLI operations
 */

import { ProgressIndicator } from './prompts.js';

export interface ProgressConfig {
  message: string;
  steps?: string[];
  showTime?: boolean;
}

/**
 * Execute an async operation with a progress indicator
 */
export async function withProgress<T>(
  config: ProgressConfig | string,
  operation: (progress: ProgressIndicator) => Promise<T>
): Promise<T> {
  const progressConfig = typeof config === 'string' ? { message: config } : config;
  const progress = new ProgressIndicator(progressConfig.message);
  const startTime = Date.now();

  try {
    progress.start();
    const result = await operation(progress);
    
    const duration = progressConfig.showTime ? ` (${((Date.now() - startTime) / 1000).toFixed(1)}s)` : '';
    progress.succeed(`${progressConfig.message.replace(/\.\.\.$/, '')} completed${duration}`);
    
    return result;
  } catch (error) {
    progress.fail(`${progressConfig.message.replace(/\.\.\.$/, '')} failed`);
    throw error;
  }
}

/**
 * Execute multiple steps with progress indication
 */
export async function withSteps<T>(
  title: string,
  steps: Array<{
    message: string;
    action: (progress: ProgressIndicator) => Promise<any>;
  }>
): Promise<T[]> {
  const results: T[] = [];
  const progress = new ProgressIndicator(title);
  
  try {
    progress.start();
    
    for (const step of steps) {
      progress.update(step.message);
      const result = await step.action(progress);
      results.push(result);
    }
    
    progress.succeed(`${title.replace(/\.\.\.$/, '')} completed`);
    return results;
  } catch (error) {
    progress.fail(`${title.replace(/\.\.\.$/, '')} failed`);
    throw error;
  }
}

/**
 * Standard progress messages for common operations
 */
export const ProgressMessages = {
  // Configuration
  LOADING_CONFIG: 'Loading configuration...',
  SAVING_CONFIG: 'Saving configuration...',
  
  // Network operations
  CONNECTING_BLOCKCHAIN: 'Connecting to blockchain...',
  CHECKING_NETWORK: 'Checking network connectivity...',
  FETCHING_DATA: 'Fetching data from blockchain...',
  SENDING_TRANSACTION: 'Sending transaction...',
  CONFIRMING_TRANSACTION: 'Confirming transaction...',
  
  // Service operations
  INITIALIZING_SERVICE: 'Initializing service...',
  LOADING_SERVICE: 'Loading service data...',
  
  // Analytics
  LOADING_ANALYTICS: 'Loading analytics data...',
  CALCULATING_METRICS: 'Calculating metrics...',
  
  // Marketplace
  LOADING_MARKETPLACE: 'Loading marketplace services...',
  SEARCHING_MARKETPLACE: 'Searching marketplace...',
  FETCHING_LISTINGS: 'Fetching listings...',
  
  // Agent operations
  REGISTERING_AGENT: 'Registering agent...',
  LOADING_AGENTS: 'Loading agents...',
  
  // Channel operations
  CREATING_CHANNEL: 'Creating channel...',
  LOADING_CHANNELS: 'Loading channels...',
  
  // Message operations
  SENDING_MESSAGE: 'Sending message...',
  LOADING_MESSAGES: 'Loading messages...',
  
  // Escrow operations
  DEPOSITING_ESCROW: 'Depositing to escrow...',
  RELEASING_ESCROW: 'Releasing from escrow...',
  CHECKING_ESCROW: 'Checking escrow status...',
  
  // System operations
  RUNNING_DIAGNOSTICS: 'Running system diagnostics...',
  CHECKING_HEALTH: 'Checking system health...',
  CHECKING_WALLET: 'Checking wallet configuration...',
};

/**
 * Add a small delay for visual feedback when operations are too fast
 */
export async function ensureMinimumDuration(
  operation: () => Promise<any>,
  minimumMs: number = 300
): Promise<any> {
  const start = Date.now();
  const result = await operation();
  const elapsed = Date.now() - start;
  
  if (elapsed < minimumMs) {
    await new Promise(resolve => setTimeout(resolve, minimumMs - elapsed));
  }
  
  return result;
}