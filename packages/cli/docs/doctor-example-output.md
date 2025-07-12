# GhostSpeak Doctor Command Examples

## Example 1: Healthy System

```bash
$ ghostspeak doctor

🩺 GhostSpeak Doctor
Running comprehensive system diagnostics...

✓ Diagnostics complete

📋 Diagnostic Results
════════════════════════════════════════════════════════════

Summary:
  Total checks: 18
  ✅ Passed: 16
  ⚠️  Warnings: 2
  ❌ Failed: 0

Prerequisites:
  ✅ Node.js Version: Node.js v20.11.0 installed
  ⚠️ Bun Runtime: Bun not installed
     Bun is optional but provides better performance

     🔧 How to fix:
     Install Bun for faster performance:
     • Run: curl -fsSL https://bun.sh/install | bash
     • Visit: https://bun.sh

  ✅ Git Installation: git version 2.42.0
  ✅ Solana CLI: solana-cli 1.18.1

Network:
  ✅ Internet Connectivity: Internet connection is working
  ✅ DNS Resolution: DNS resolution is working properly
  ✅ RPC Endpoint Connectivity: Connected to RPC endpoint: https://api.devnet.solana.com
  ✅ RPC Latency: Good RPC latency: 245ms

Wallet:
  ✅ Wallet Configuration: Wallet configured
  ⚠️ Wallet Balance: Low balance: 0.5 SOL
     May not be enough for multiple transactions

     🔧 How to fix:
     Get more SOL:
     • Devnet: solana airdrop 2
     • Testnet: solana airdrop 2 --url testnet
     • Mainnet: Purchase SOL from an exchange

  ✅ Wallet Permissions: Wallet file permissions are secure

Blockchain:
  ✅ Blockchain Connection: Connected to Solana blockchain
  ✅ Program Deployment: GhostSpeak program is deployed
  ✅ Recent Blockhash: Can fetch recent blockhash

Configuration:
  ✅ CLI Configuration: CLI configuration found
  ✅ Environment Variables: No environment variables set
  ✅ Network Configuration: Connected to devnet

Sdk:
  ✅ SDK Installation: GhostSpeak SDK found in monorepo
  ✅ SDK Initialization: SDK initialization test skipped

🏥 Overall Health Assessment
────────────────────────────────────────────────────────────

⚠️  GOOD: Your system is mostly healthy with minor warnings.
   GhostSpeak CLI should work fine.

📝 Next Steps:
   1. Run "ghostspeak quickstart" to get started
   2. Try "ghostspeak agent register MyFirstAgent"
   3. Explore "ghostspeak help" for all commands

For detailed information, run: ghostspeak doctor --verbose
```

## Example 2: System with Critical Issues

```bash
$ ghostspeak doctor

🩺 GhostSpeak Doctor
Running comprehensive system diagnostics...

✓ Diagnostics complete

📋 Diagnostic Results
════════════════════════════════════════════════════════════

Summary:
  Total checks: 18
  ✅ Passed: 8
  ⚠️  Warnings: 3
  ❌ Failed: 7
  🚨 Critical failures: 5

Prerequisites:
  ✅ Node.js Version: Node.js v20.11.0 installed
  ⚠️ Bun Runtime: Bun not installed
     Bun is optional but provides better performance

     🔧 How to fix:
     Install Bun for faster performance:
     • Run: curl -fsSL https://bun.sh/install | bash
     • Visit: https://bun.sh

  ✅ Git Installation: git version 2.42.0
  ❌ Solana CLI: Solana CLI not found
     Solana CLI is required for wallet management

     🔧 How to fix:
     Install Solana CLI:
     • Run: sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
     • Add to PATH: export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
     • Verify: solana --version

Network:
  ✅ Internet Connectivity: Internet connection is working
  ✅ DNS Resolution: DNS resolution is working properly
  ❌ RPC Endpoint Connectivity: Cannot connect to RPC endpoint: https://api.devnet.solana.com
     Connection failed

     🔧 How to fix:
     Try a different RPC endpoint:
     • Devnet: https://api.devnet.solana.com
     • Testnet: https://api.testnet.solana.com
     • Run: ghostspeak config set rpcUrl <new-url>
     • Consider free tier from Helius, QuickNode, or Alchemy

  ⚠️ RPC Latency: Unable to measure RPC latency
     Unknown error

Wallet:
  ❌ Wallet Configuration: No wallet found
     Expected at: /Users/user/.config/solana/id.json

     🔧 How to fix:
     Create a new wallet:
     • Run: solana-keygen new
     • Or run: ghostspeak quickstart
     • Or import existing: solana-keygen recover

  ⚠️ Wallet Balance: Unable to check balance
     Unknown error

     🔧 How to fix:
     Ensure wallet and network are configured correctly

  ❌ Wallet Permissions: No wallet file found

Blockchain:
  ❌ Blockchain Connection: Cannot connect to Solana blockchain
     Unknown error

     🔧 How to fix:
     Check blockchain connection:
     • Verify RPC endpoint: solana config get
     • Try different cluster: solana config set -u devnet
     • Check network connectivity

  ⚠️ Program Deployment: GhostSpeak program not found on current network
     This is normal if you haven't deployed yet
     Program ID: 4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP

     🔧 How to fix:
     Deploy the program:
     • Ensure you're on the correct network
     • From packages/core: anchor deploy
     • Or use the deployed devnet version

  ❌ Recent Blockhash: Cannot fetch recent blockhash
     Unknown error

     🔧 How to fix:
     This indicates RPC issues:
     • Check RPC endpoint configuration
     • Verify network connectivity
     • Try a different RPC provider

Configuration:
  ✅ CLI Configuration: CLI configuration found
  ✅ Environment Variables: No environment variables set
  ✅ Network Configuration: Connected to devnet

Sdk:
  ✅ SDK Installation: GhostSpeak SDK found in monorepo
  ✅ SDK Initialization: SDK initialization test skipped

🏥 Overall Health Assessment
────────────────────────────────────────────────────────────

❌ CRITICAL: Your system has critical issues that must be resolved.
   GhostSpeak CLI will not function properly until these are fixed.

📝 Next Steps:
   1. Fix the issues listed above (start with critical failures)
   2. Run "ghostspeak doctor" again to verify fixes
   3. Once all issues are resolved, run "ghostspeak quickstart"

For detailed information, run: ghostspeak doctor --verbose
```

## Example 3: Verbose Output

```bash
$ ghostspeak doctor --verbose

🩺 GhostSpeak Doctor
Running comprehensive system diagnostics...

✓ Diagnostics complete

📋 Diagnostic Results
════════════════════════════════════════════════════════════

Summary:
  Total checks: 18
  ✅ Passed: 16
  ⚠️  Warnings: 2
  ❌ Failed: 0

Prerequisites:
  ✅ Node.js Version: Node.js v20.11.0 installed
     Minimum required: v18.0.0
  ⚠️ Bun Runtime: Bun not installed
     Bun is optional but provides better performance

     🔧 How to fix:
     Install Bun for faster performance:
     • Run: curl -fsSL https://bun.sh/install | bash
     • Visit: https://bun.sh

  ✅ Git Installation: git version 2.42.0
     Git is properly installed
  ✅ Solana CLI: solana-cli 1.18.1
     Minimum required: v1.17.0

Network:
  ✅ Internet Connectivity: Internet connection is working
  ✅ DNS Resolution: DNS resolution is working properly
  ✅ RPC Endpoint Connectivity: Connected to RPC endpoint: https://api.devnet.solana.com
     Latency: 245ms
  ✅ RPC Latency: Good RPC latency: 245ms
     Network performance is acceptable

Wallet:
  ✅ Wallet Configuration: Wallet configured
     Address: 7kYaJSPxQ2Lfot3XZkPSRtzWgMXdmPwCFpVhA9NJPXL4
  ⚠️ Wallet Balance: Low balance: 0.5 SOL
     May not be enough for multiple transactions

     🔧 How to fix:
     Get more SOL:
     • Devnet: solana airdrop 2
     • Testnet: solana airdrop 2 --url testnet
     • Mainnet: Purchase SOL from an exchange

  ✅ Wallet Permissions: Wallet file permissions are secure
     File is only readable by owner

Blockchain:
  ✅ Blockchain Connection: Connected to Solana blockchain
     Current block height: 123456789
     Current slot: 234567890
  ✅ Program Deployment: GhostSpeak program is deployed
     Program ID: 4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP
  ✅ Recent Blockhash: Can fetch recent blockhash
     Blockhash: 5YNmS1R9nNSCDzb5a7...
     Last valid block height: 123456790

Configuration:
  ✅ CLI Configuration: CLI configuration found
     Network: devnet
     Config path: /Users/user/.config/ghostspeak/config.json
  ✅ Environment Variables: No environment variables set
     Using CLI configuration instead
  ✅ Network Configuration: Connected to devnet
     RPC URL: https://api.devnet.solana.com

Sdk:
  ✅ SDK Installation: GhostSpeak SDK found in monorepo
  ✅ SDK Initialization: SDK initialization test skipped
     Manual SDK testing recommended

🏥 Overall Health Assessment
────────────────────────────────────────────────────────────

⚠️  GOOD: Your system is mostly healthy with minor warnings.
   GhostSpeak CLI should work fine.

📝 Next Steps:
   1. Run "ghostspeak quickstart" to get started
   2. Try "ghostspeak agent register MyFirstAgent"
   3. Explore "ghostspeak help" for all commands

For detailed information, run: ghostspeak doctor --verbose
```

## Example 4: JSON Output

```bash
$ ghostspeak doctor --json
{
  "totalChecks": 18,
  "passed": 16,
  "warnings": 2,
  "failures": 0,
  "criticalFailures": 0,
  "checks": [
    {
      "name": "Node.js Version",
      "category": "prerequisites",
      "result": {
        "status": "pass",
        "message": "Node.js v20.11.0 installed",
        "details": ["Minimum required: v18.0.0"]
      },
      "critical": true
    },
    {
      "name": "Bun Runtime",
      "category": "prerequisites",
      "result": {
        "status": "warning",
        "message": "Bun not installed",
        "details": ["Bun is optional but provides better performance"],
        "fix": [
          "Install Bun for faster performance:",
          "• Run: curl -fsSL https://bun.sh/install | bash",
          "• Visit: https://bun.sh"
        ]
      },
      "critical": false
    },
    // ... more checks
  ]
}
```

## Features Demonstrated

1. **Color-coded output**: 
   - ✅ Green for passed checks
   - ⚠️ Yellow for warnings
   - ❌ Red for failures

2. **Comprehensive checks across categories**:
   - Prerequisites (Node.js, Bun, Git, Solana CLI)
   - Network (Internet, DNS, RPC connectivity and latency)
   - Wallet (Configuration, balance, permissions)
   - Blockchain (Connection, program deployment, blockhash)
   - Configuration (CLI config, env vars, network)
   - SDK (Installation, initialization)

3. **Actionable remediation steps** for each failure

4. **Critical vs non-critical failures** distinction

5. **Multiple output formats**:
   - Standard (color-coded terminal output)
   - Verbose (additional details for all checks)
   - JSON (machine-readable format)

6. **Progress indicator** during checks

7. **Exit codes**:
   - 0: All checks passed
   - 1: Critical failures found
   - 2: Non-critical failures found