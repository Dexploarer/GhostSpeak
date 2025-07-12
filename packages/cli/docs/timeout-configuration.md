# Timeout Configuration Guide

This guide explains how to configure timeouts in the GhostSpeak CLI for better reliability and user experience.

## Overview

The GhostSpeak CLI implements intelligent timeout handling to:
- Prevent operations from hanging indefinitely
- Provide early warnings before timeouts occur
- Automatically retry on transient network failures
- Support offline mode for certain operations

## Default Timeouts

| Operation | Default Timeout | Environment Variable |
|-----------|----------------|---------------------|
| Channel Creation | 30 seconds | `GHOSTSPEAK_CHANNEL_CREATE_TIMEOUT` |
| Transaction Send | 20 seconds | `GHOSTSPEAK_TRANSACTION_TIMEOUT` |
| Account Fetch | 10 seconds | `GHOSTSPEAK_ACCOUNT_FETCH_TIMEOUT` |
| RPC Call | 15 seconds | `GHOSTSPEAK_RPC_CALL_TIMEOUT` |
| SDK Init | 5 seconds | `GHOSTSPEAK_SDK_INIT_TIMEOUT` |
| Agent Registration | 30 seconds | `GHOSTSPEAK_AGENT_REGISTER_TIMEOUT` |
| Interactive Prompts | 2 minutes | `GHOSTSPEAK_PROMPT_TIMEOUT` |

## Configuring Timeouts

### Environment Variables

Set custom timeouts using environment variables (values in milliseconds):

```bash
# Increase channel creation timeout to 60 seconds
export GHOSTSPEAK_CHANNEL_CREATE_TIMEOUT=60000

# Increase transaction timeout for slow networks
export GHOSTSPEAK_TRANSACTION_TIMEOUT=45000

# Run command with custom timeout
ghostspeak channel create mychannel
```

### One-time Configuration

For a single command:

```bash
GHOSTSPEAK_RPC_CALL_TIMEOUT=30000 ghostspeak agent list
```

## Timeout Warnings

Operations show warnings before timing out (default at 70% of timeout):

```
⏱️  Channel creation is taking longer than expected (21s elapsed)
This operation will timeout in 9 seconds
💡 If this operation times out, it will automatically retry
```

## Automatic Retry

Network operations automatically retry with exponential backoff:

- **Default retries**: 3 attempts
- **Backoff multiplier**: 1.5x (1s → 1.5s → 2.25s)
- **Smart detection**: Only retries network errors, not business logic errors

### Retry-able Errors
- Network timeouts
- Connection refused (ECONNREFUSED)
- DNS resolution failures (ENOTFOUND)
- Network unreachable (ENETUNREACH)
- Rate limiting (429 errors)
- Gateway errors (502, 503)

### Non-retry-able Errors
- "Channel already exists"
- "Insufficient balance"
- "Invalid parameters"

## Offline Mode

Some operations support offline mode when no internet connection is detected:

```bash
# Agent registration works offline
ghostspeak agent register MyAgent --type general

# Output:
🌐 Offline Mode: Agent will be registered locally
✅ Agent registered successfully!
🌐 Offline Mode - Agent created locally
   Agent will be synced when you go online
```

### Operations Supporting Offline Mode
- Agent registration (local storage)
- Agent listing (shows cached data)
- Config management
- Help and documentation

### Operations Requiring Network
- Channel creation/joining
- Message sending
- Marketplace interactions
- On-chain transactions

## Network Diagnostics

The CLI proactively checks network health before operations:

```bash
# Check network status
ghostspeak doctor

# Verbose network diagnostics
ghostspeak doctor --verbose
```

### Pre-operation Checks
1. **Internet connectivity** - Can we reach external services?
2. **RPC health** - Is the Solana RPC responding?
3. **Latency check** - Is the network fast enough?

## Best Practices

### For Users

1. **Increase timeouts on slow networks**:
   ```bash
   export GHOSTSPEAK_CHANNEL_CREATE_TIMEOUT=60000
   ```

2. **Use non-interactive mode for scripts**:
   ```bash
   ghostspeak agent register Bot1 --type general --yes
   ```

3. **Check network before bulk operations**:
   ```bash
   ghostspeak doctor && ghostspeak channel create mychannel
   ```

### For Developers

1. **Always handle TimeoutError**:
   ```typescript
   try {
     await createChannel(name, options);
   } catch (error) {
     if (error instanceof TimeoutError) {
       // Handle timeout specifically
     }
   }
   ```

2. **Use appropriate timeout values**:
   - Quick operations: 5-10 seconds
   - Blockchain transactions: 20-30 seconds
   - User prompts: 2+ minutes

3. **Provide offline fallbacks**:
   ```typescript
   const networkCheck = await preOperationCheck(rpc, 'operation', {
     allowOffline: true
   });
   ```

## Troubleshooting

### "Operation timed out" errors

1. **Check internet connection**:
   ```bash
   ping google.com
   ```

2. **Test RPC endpoint**:
   ```bash
   curl https://api.devnet.solana.com/health
   ```

3. **Increase timeout**:
   ```bash
   export GHOSTSPEAK_TRANSACTION_TIMEOUT=60000
   ```

4. **Use different RPC**:
   ```bash
   ghostspeak config set rpcUrl https://api.devnet.solana.com
   ```

### "Too many retries" errors

This indicates persistent network issues:

1. Check Solana network status: https://status.solana.com
2. Try a different RPC provider
3. Wait and retry during off-peak hours

### Interactive prompts hanging

Set a prompt timeout:
```bash
export GHOSTSPEAK_PROMPT_TIMEOUT=30000  # 30 seconds
```

Or use non-interactive mode:
```bash
ghostspeak agent register MyBot --type general --description "My bot" --yes
```

## Example Scenarios

### Slow Network Configuration

```bash
# Configure for satellite internet or slow connections
export GHOSTSPEAK_CHANNEL_CREATE_TIMEOUT=120000    # 2 minutes
export GHOSTSPEAK_TRANSACTION_TIMEOUT=60000        # 1 minute
export GHOSTSPEAK_RPC_CALL_TIMEOUT=30000          # 30 seconds
```

### CI/CD Configuration

```bash
# Fast timeouts for CI environments
export GHOSTSPEAK_SDK_INIT_TIMEOUT=3000           # 3 seconds
export GHOSTSPEAK_PROMPT_TIMEOUT=5000             # 5 seconds (fail fast)
export CI=true                                     # Enable non-interactive mode
```

### Development Configuration

```bash
# Relaxed timeouts for development
export GHOSTSPEAK_CHANNEL_CREATE_TIMEOUT=60000
export GHOSTSPEAK_TRANSACTION_TIMEOUT=45000
export DEBUG=ghostspeak:*                          # Enable debug logging
```