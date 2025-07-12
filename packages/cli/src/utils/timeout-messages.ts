/**
 * User-friendly timeout error messages with actionable solutions
 */

export const TIMEOUT_MESSAGES = {
  CHANNEL_CREATE: `
⏱️  Channel creation is taking longer than expected (30+ seconds).

This could be due to:
• Network congestion on Solana
• RPC endpoint responding slowly
• Insufficient transaction priority fee

🔧 Immediate solutions:
1. Wait 60 seconds and retry - network congestion often clears quickly
2. Run: ghostspeak doctor --verbose
3. Check your balance: solana balance
4. Use a faster RPC: ghostspeak config set rpcUrl https://api.devnet.solana.com

🚀 For better performance:
• Get a free RPC endpoint from Helius, QuickNode, or Alchemy
• Increase priority fee for faster confirmation
• Try during off-peak hours (avoid US business hours)
`,

  TRANSACTION_SEND: `
⏱️  Transaction confirmation timeout (20+ seconds).

Common causes:
• Network congestion (check: https://status.solana.com)
• Low priority fee
• RPC endpoint issues

🔧 What to do now:
1. Check transaction status:
   solana confirm <signature> --url devnet
2. View on explorer:
   https://explorer.solana.com/tx/<signature>?cluster=devnet
3. If not found after 2 minutes, retry the transaction

💡 Pro tips:
• Add --priority-fee flag for faster confirmation
• Use dedicated RPC endpoints during high traffic
• Monitor network TPS at https://solanabeach.io
`,

  ACCOUNT_FETCH: `
⏱️  Account fetch timeout (10+ seconds).

Possible issues:
• RPC endpoint is overloaded
• Network connectivity problems
• Account doesn't exist on this network

🔧 Quick fixes:
1. Check network status: ghostspeak doctor
2. Verify you're on the right network:
   ghostspeak config get network
3. Try direct RPC query:
   solana account <address> --url devnet

🌐 Network troubleshooting:
• Test connection: ping api.devnet.solana.com
• Switch RPC: ghostspeak config set rpcUrl <new-url>
• Check firewall/VPN settings
`,

  SDK_INIT: `
⏱️  SDK initialization timeout (5+ seconds).

This suggests:
• Slow module loading
• File system issues
• Node.js performance problems

🔧 Troubleshooting steps:
1. Clear module cache:
   rm -rf node_modules/.cache
2. Reinstall dependencies:
   bun install --force
3. Check disk space:
   df -h
4. Restart terminal session

⚡ Performance tips:
• Use Bun instead of Node.js for 2x faster startup
• Close other heavy applications
• Check for antivirus interference
`,

  RPC_CALL: `
⏱️  RPC request timeout (15+ seconds).

Common causes:
• Public RPC rate limits hit
• High network latency
• RPC endpoint maintenance

🔧 Immediate actions:
1. Wait 60 seconds (rate limits reset)
2. Check RPC health: ghostspeak doctor
3. Switch to backup RPC:
   ghostspeak config set rpcUrl https://api.devnet.solana.com

🆓 Free RPC alternatives:
• Helius: https://dev.helius.xyz
• QuickNode: https://quicknode.com
• Alchemy: https://alchemy.com
• Triton: https://triton.one

💡 Set custom timeout:
ghostspeak agent list --timeout 30000
`
} as const;

/**
 * Get a user-friendly message for a timeout error
 */
export function getTimeoutMessage(operation: string, timeoutMs: number): string {
  // Try to find a specific message
  for (const [key, message] of Object.entries(TIMEOUT_MESSAGES)) {
    if (operation.toLowerCase().includes(key.toLowerCase().replace('_', ' '))) {
      return message;
    }
  }

  // Default message
  return `
Operation timed out after ${timeoutMs / 1000} seconds.

This might be due to:
• Network issues
• Server unavailability
• High system load

Please check your connection and try again.
`;
}