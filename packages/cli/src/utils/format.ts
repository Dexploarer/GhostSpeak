/**
 * Formatting utilities for CLI output
 */

/**
 * Convert lamports to SOL with proper decimal formatting
 */
export function lamportsToSol(lamports: bigint): string {
  const sol = Number(lamports) / 1e9;
  return sol.toFixed(4);
}

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol: number): bigint {
  return BigInt(Math.floor(sol * 1e9));
}

/**
 * Format large numbers with comma separators
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format cryptocurrency amounts with proper precision
 */
export function formatCrypto(amount: bigint | number, symbol: string = 'SOL', decimals: number = 4): string {
  const num = typeof amount === 'bigint' ? Number(amount) / 1e9 : amount;
  return `${num.toFixed(decimals)} ${symbol}`;
}

/**
 * Format percentage with proper decimal places
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format timestamp to human-readable date
 */
export function formatDate(timestamp: number | bigint): string {
  const date = new Date(typeof timestamp === 'bigint' ? Number(timestamp) : timestamp);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(seconds: number | bigint): string {
  const sec = typeof seconds === 'bigint' ? Number(seconds) : seconds;
  
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
  
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  return `${days}d ${hours}h`;
}

/**
 * Truncate address for display
 */
export function truncateAddress(address: string, startChars: number = 4, endChars: number = 4): string {
  if (address.length <= startChars + endChars + 3) return address;
  return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`;
}

/**
 * Format file size in human-readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}