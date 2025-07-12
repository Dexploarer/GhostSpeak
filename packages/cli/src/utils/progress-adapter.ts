/**
 * Progress Adapter - Bridges between legacy ProgressIndicator and EnhancedProgressIndicator
 */

import { 
  EnhancedProgressIndicator, 
  EnhancedProgressOptions,
  createEnhancedProgress,
  OPERATION_ESTIMATES 
} from './enhanced-progress.js';
import { ProgressIndicator } from './prompts.js';

/**
 * Extend the legacy ProgressIndicator to use enhanced features
 */
export class ProgressIndicatorAdapter extends ProgressIndicator {
  private enhanced: EnhancedProgressIndicator | null = null;
  private useEnhanced: boolean = true;

  constructor(message: string, options?: Partial<EnhancedProgressOptions>) {
    super(message);
    
    // Create enhanced indicator if enabled
    if (this.useEnhanced) {
      this.enhanced = new EnhancedProgressIndicator({
        message,
        showElapsed: true,
        showRemaining: true,
        showStatus: true,
        ...options
      });
    }
  }

  start(): void {
    if (this.enhanced) {
      this.enhanced.start();
    } else {
      super.start();
    }
  }

  update(message: string): void {
    if (this.enhanced) {
      this.enhanced.update(message);
    } else {
      super.update(message);
    }
  }

  updateStatus(status: string): void {
    if (this.enhanced) {
      this.enhanced.updateStatus(status);
    }
  }

  succeed(message?: string): void {
    if (this.enhanced) {
      this.enhanced.succeed(message);
    } else {
      super.succeed(message);
    }
  }

  fail(message?: string): void {
    if (this.enhanced) {
      this.enhanced.fail(message);
    } else {
      super.fail(message);
    }
  }

  stop(): void {
    if (this.enhanced) {
      this.enhanced.stop();
    } else {
      super.stop();
    }
  }

  retry(): void {
    if (this.enhanced) {
      this.enhanced.retry();
    }
  }
}

/**
 * Factory function to create progress indicators based on context
 */
export function createProgress(
  message: string,
  operationType?: keyof typeof OPERATION_ESTIMATES
): ProgressIndicatorAdapter {
  const options: Partial<EnhancedProgressOptions> = {};
  
  if (operationType) {
    options.estimatedDuration = OPERATION_ESTIMATES[operationType];
  }
  
  return new ProgressIndicatorAdapter(message, options);
}

/**
 * Map common progress messages to operation types
 */
export const PROGRESS_MESSAGE_MAP: Record<string, keyof typeof OPERATION_ESTIMATES> = {
  'Creating channel': 'CREATE_CHANNEL',
  'Connecting to blockchain': 'CONNECT_BLOCKCHAIN',
  'Sending transaction': 'SEND_TRANSACTION',
  'Confirming transaction': 'CONFIRM_TRANSACTION',
  'Fetching channels': 'FETCH_ACCOUNTS',
  'Loading marketplace services': 'SEARCH_MARKETPLACE',
  'Registering agent': 'REGISTER_AGENT',
  'Running system diagnostics': 'RUN_DIAGNOSTICS',
  'Checking system health': 'CHECK_HEALTH',
  'Depositing to escrow': 'DEPOSIT_ESCROW',
  'Releasing from escrow': 'RELEASE_ESCROW',
};

/**
 * Intelligent progress creation that matches message patterns
 */
export function createSmartProgress(message: string): ProgressIndicatorAdapter {
  // Try to match the message to a known operation type
  const normalizedMessage = message.replace(/\.\.\.$/, '').replace(/…$/, '');
  
  for (const [pattern, operationType] of Object.entries(PROGRESS_MESSAGE_MAP)) {
    if (normalizedMessage.toLowerCase().includes(pattern.toLowerCase())) {
      return createProgress(message, operationType);
    }
  }
  
  // Default progress indicator
  return new ProgressIndicatorAdapter(message);
}