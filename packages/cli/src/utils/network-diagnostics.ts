/**
 * Network diagnostics and proactive timeout detection
 */

import { logger } from './logger.js';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import { retryWithBackoff, type RetryConfig } from './timeout.js';
import chalk from 'chalk';

/**
 * Check if we're offline by trying to reach common endpoints
 */
export async function isOffline(): Promise<boolean> {
  try {
    // Try to fetch a small resource with a short timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    await fetch('https://api.devnet.solana.com/health', {
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return false; // We're online
  } catch (error) {
    logger.general.debug('Offline check failed:', error);
    return true; // We're offline
  }
}

/**
 * Check RPC endpoint health and latency with retry logic
 */
export async function checkRpcHealth(
  rpc: Rpc<SolanaRpcApi>,
  options?: {
    skipRetry?: boolean;
    timeout?: number;
  }
): Promise<{
  healthy: boolean;
  latency: number;
  warning?: string;
  offline?: boolean;
}> {
  const startTime = Date.now();
  
  // First check if we're offline
  if (await isOffline()) {
    return {
      healthy: false,
      latency: 0,
      offline: true,
      warning: 'No internet connection detected. Please check your network.'
    };
  }
  
  const healthCheck = async () => {
    const checkStart = Date.now();
    await rpc.getLatestBlockhash().send();
    return Date.now() - checkStart;
  };
  
  try {
    let latency: number;
    
    if (options?.skipRetry) {
      latency = await healthCheck();
    } else {
      // Retry with exponential backoff for health checks
      latency = await retryWithBackoff(
        healthCheck,
        'RPC health check',
        {
          maxRetries: 2,
          delayMs: 500,
          backoffMultiplier: 2,
          shouldRetry: (error) => {
            // Only retry on network errors
            if (error instanceof Error) {
              const message = error.message.toLowerCase();
              return message.includes('network') || 
                     message.includes('timeout') ||
                     message.includes('econnrefused');
            }
            return false;
          }
        }
      );
    }
    
    logger.general.debug(`RPC health check completed in ${latency}ms`);
    
    // Warn if latency is high
    if (latency > 5000) {
      return {
        healthy: true,
        latency,
        warning: 'RPC endpoint is responding slowly. Operations may timeout.'
      };
    } else if (latency > 2000) {
      return {
        healthy: true,
        latency,
        warning: 'RPC endpoint latency is elevated. Performance may be degraded.'
      };
    }
    
    return { healthy: true, latency };
  } catch (error) {
    logger.general.error('RPC health check failed:', error);
    
    // Check if we went offline during the check
    const offline = await isOffline();
    
    return {
      healthy: false,
      latency: Date.now() - startTime,
      offline,
      warning: offline 
        ? 'Lost internet connection during operation. Please check your network.'
        : 'RPC endpoint is not responding. Try a different endpoint or check status.solana.com'
    };
  }
}

/**
 * Pre-operation network check with offline mode support
 */
export async function preOperationCheck(
  rpc: Rpc<SolanaRpcApi>,
  operationName: string,
  options?: {
    allowOffline?: boolean;  // Some operations can work offline
    skipCheck?: boolean;     // Skip the check entirely
  }
): Promise<{
  proceed: boolean;
  offline: boolean;
  warning?: string;
}> {
  if (options?.skipCheck) {
    return { proceed: true, offline: false };
  }
  
  const health = await checkRpcHealth(rpc, { skipRetry: false });
  
  if (health.offline && !options?.allowOffline) {
    logger.general.error(chalk.red('⚠️  No Internet Connection'));
    logger.general.error('This operation requires an internet connection.');
    logger.general.error('\nTroubleshooting:');
    logger.general.error('• Check your Wi-Fi or ethernet connection');
    logger.general.error('• Try: ping google.com');
    logger.general.error('• Disable VPN if you\'re using one');
    logger.general.error('• Some operations can work offline with --offline flag\n');
    return { proceed: false, offline: true };
  }
  
  if (!health.healthy && !health.offline) {
    logger.general.warn(chalk.yellow(`⚠️  Network issue detected before ${operationName}`));
    logger.general.warn(health.warning || 'RPC endpoint is not healthy');
    logger.general.info('\n💡 You can:');
    logger.general.info('• Wait a moment and retry');
    logger.general.info('• Switch RPC endpoint: ghostspeak config set rpcUrl <url>');
    logger.general.info('• Check network status: https://status.solana.com\n');
  } else if (health.warning) {
    logger.general.warn(chalk.yellow(`⚠️  ${health.warning}`));
    logger.general.warn(`This might affect ${operationName}`);
  }
  
  return { 
    proceed: !health.offline || options?.allowOffline || false,
    offline: health.offline || false,
    warning: health.warning
  };
}

/**
 * Get user-friendly network error message with actionable fixes
 */
export function getNetworkErrorMessage(error: unknown): string {
  const errorString = error instanceof Error ? error.message : String(error);
  
  // Connection errors
  if (errorString.includes('ECONNREFUSED')) {
    return `Connection refused. The RPC endpoint might be down.

🔧 Try these solutions:
• Use a different RPC endpoint: ghostspeak config set rpcUrl https://api.devnet.solana.com
• Check if you're behind a firewall or VPN
• Try again in a few moments`;
  }
  
  if (errorString.includes('ETIMEDOUT') || errorString.includes('timeout')) {
    return `Network timeout. The operation took too long to complete.

🔧 Try these solutions:
• Check your internet connection
• Use a faster RPC endpoint (consider Helius, QuickNode, or Alchemy)
• If on Wi-Fi, try moving closer to your router
• Run: ghostspeak doctor --verbose`;
  }
  
  if (errorString.includes('ENETUNREACH')) {
    return `Network unreachable. Cannot connect to the Solana network.

🔧 Try these solutions:
• Check your internet connection
• Disable VPN if you're using one
• Check firewall settings
• Try: ping api.devnet.solana.com`;
  }
  
  if (errorString.includes('ENOTFOUND') || errorString.includes('getaddrinfo')) {
    return `DNS resolution failed. Cannot find the RPC endpoint.

🔧 Try these solutions:
• Check the RPC URL for typos
• Try using IP address instead of hostname
• Change DNS servers to 8.8.8.8 or 1.1.1.1
• Current RPC: ghostspeak config get rpcUrl`;
  }
  
  // Rate limiting
  if (errorString.includes('rate limit') || errorString.includes('429') || errorString.includes('Too Many Requests')) {
    return `Rate limit exceeded. You've made too many requests.

🔧 Try these solutions:
• Wait 60 seconds before trying again
• Use a dedicated RPC endpoint with higher limits
• Consider batch operations to reduce request count
• Free RPC endpoints: Helius, QuickNode, or Alchemy offer free tiers`;
  }
  
  // Server errors
  if (errorString.includes('502') || errorString.includes('Bad Gateway')) {
    return `Bad Gateway. The RPC server is having issues.

🔧 Try these solutions:
• Wait a few minutes and try again
• Switch to a different RPC endpoint
• Check https://status.solana.com for network status`;
  }
  
  if (errorString.includes('503') || errorString.includes('Service Unavailable')) {
    return `Service temporarily unavailable. The RPC endpoint is overloaded.

🔧 Try these solutions:
• Try again in 5-10 minutes
• Use a different RPC endpoint
• Check if Solana network is under high load`;
  }
  
  // SSL/TLS errors
  if (errorString.includes('CERT') || errorString.includes('SSL') || errorString.includes('TLS')) {
    return `SSL/TLS certificate error. Secure connection failed.

🔧 Try these solutions:
• Check system date and time are correct
• Update your operating system
• Try a different network (not public Wi-Fi)`;
  }
  
  // Wallet errors
  if (errorString.includes('wallet') || errorString.includes('keypair') || errorString.includes('signer')) {
    return `Wallet configuration error.

🔧 Try these solutions:
• Run: ghostspeak quickstart
• Check wallet file exists: ls ~/.config/solana/id.json
• Generate new wallet: solana-keygen new
• Run: ghostspeak doctor`;
  }
  
  // Insufficient funds
  if (errorString.includes('insufficient') || errorString.includes('balance')) {
    return `Insufficient SOL balance for transaction.

🔧 Try these solutions:
• Check balance: solana balance
• Get devnet SOL: solana airdrop 2
• For mainnet, transfer SOL to your wallet`;
  }
  
  // Program errors
  if (errorString.includes('AccountNotFound') || errorString.includes('account.*not found')) {
    return `Account not found on the blockchain.

🔧 Try these solutions:
• Ensure you're on the correct network (devnet/mainnet)
• Check if the program is deployed
• Verify the account address is correct`;
  }
  
  // Generic network error with helpful suggestions
  return `Network error: ${errorString.substring(0, 100)}...

🔧 General troubleshooting:
• Run: ghostspeak doctor
• Check internet: ping google.com
• Try different RPC: ghostspeak config set rpcUrl <url>
• View all settings: ghostspeak config list
• Some operations support offline mode with --offline flag

For more help, visit: https://ghostspeak.ai/docs/troubleshooting`;
}

/**
 * Create a network-aware retry configuration
 */
export function getNetworkRetryConfig(baseConfig?: Partial<RetryConfig>): RetryConfig {
  return {
    maxRetries: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
    shouldRetry: (error: unknown) => {
      // Check if we're offline first
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        
        // Don't retry if explicitly told not to
        if (message.includes('do not retry')) {
          return false;
        }
        
        // Network errors are retryable
        if (message.includes('network') ||
            message.includes('connection') ||
            message.includes('timeout') ||
            message.includes('econnrefused') ||
            message.includes('enotfound') ||
            message.includes('etimedout') ||
            message.includes('enetunreach')) {
          return true;
        }
        
        // Rate limits need a longer wait
        if (message.includes('429') || message.includes('rate limit')) {
          logger.general.warn('Rate limit hit - waiting before retry...');
          return true;
        }
        
        // Server errors might be temporary
        if (message.includes('502') || message.includes('503')) {
          return true;
        }
      }
      
      return false;
    },
    ...baseConfig
  };
}