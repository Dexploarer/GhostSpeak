# Enhanced Progress Indicator Migration Guide

## Overview

The enhanced progress indicator provides better user feedback during long-running operations by showing:
- Elapsed time
- Estimated time remaining
- Current operation status
- Retry attempts
- Timeout warnings

## Quick Start

### Basic Usage

**Before:**
```typescript
const progress = new ProgressIndicator('Creating channel...');
progress.start();
// ... do work ...
progress.succeed('Channel created!');
```

**After:**
```typescript
const progress = createEnhancedProgress(
  'Creating channel...',
  'CREATE_CHANNEL' // Optional: uses predefined time estimate
);
progress.start();
progress.updateStatus('Connecting to blockchain...'); // Optional: show sub-status
// ... do work ...
progress.succeed('Channel created!');
```

### Step-Based Progress

**Before:**
```typescript
const progress = new ProgressIndicator('Processing...');
progress.start();
progress.update('Step 1...');
// ... work ...
progress.update('Step 2...');
// ... work ...
progress.succeed();
```

**After:**
```typescript
const progress = createEnhancedProgress('Processing...', undefined, {
  steps: [
    { name: 'Initializing', weight: 1 },
    { name: 'Processing data', weight: 3 },
    { name: 'Finalizing', weight: 1 }
  ]
});
progress.start();
progress.startStep(0);
// ... work ...
progress.completeStep();
progress.startStep(1);
// ... work ...
progress.completeStep();
progress.startStep(2);
// ... work ...
progress.completeStep();
progress.succeed();
```

## Feature Comparison

| Feature | ProgressIndicator | EnhancedProgressIndicator |
|---------|------------------|---------------------------|
| Basic spinner | ✅ | ✅ |
| Success/fail states | ✅ | ✅ |
| Update message | ✅ | ✅ |
| Elapsed time | ❌ | ✅ |
| Time remaining | ❌ | ✅ |
| Status messages | ❌ | ✅ |
| Step tracking | ❌ | ✅ |
| Retry counting | ❌ | ✅ |
| Timeout warnings | ❌ | ✅ |
| Event emissions | ❌ | ✅ |

## Migration Examples

### 1. Simple Operation

```typescript
// Old
const progress = new ProgressIndicator('Loading data...');
progress.start();
await loadData();
progress.succeed('Data loaded');

// New - with automatic time tracking
const progress = createEnhancedProgress('Loading data...', 'FETCH_ACCOUNTS');
progress.start();
await loadData();
progress.succeed('Data loaded');
```

### 2. Multi-Step Operation

```typescript
// Old
const progress = new ProgressIndicator('Deploying contract...');
progress.start();
progress.update('Compiling...');
await compile();
progress.update('Uploading...');
await upload();
progress.update('Verifying...');
await verify();
progress.succeed('Deployed!');

// New - with weighted steps
const progress = createEnhancedProgress('Deploying contract...', undefined, {
  steps: [
    { name: 'Compiling contract', weight: 2 },
    { name: 'Uploading to blockchain', weight: 3 },
    { name: 'Verifying deployment', weight: 1 }
  ]
});
progress.start();
progress.startStep(0);
await compile();
progress.completeStep();
progress.startStep(1);
await upload();
progress.completeStep();
progress.startStep(2);
await verify();
progress.completeStep();
progress.succeed('Deployed!');
```

### 3. Network Operation with Retries

```typescript
// Old
const progress = new ProgressIndicator('Connecting...');
progress.start();
let connected = false;
for (let i = 0; i < 3; i++) {
  try {
    await connect();
    connected = true;
    break;
  } catch (error) {
    progress.update(`Retrying... (${i + 1}/3)`);
  }
}
if (connected) {
  progress.succeed('Connected');
} else {
  progress.fail('Connection failed');
}

// New - with built-in retry tracking
const progress = createEnhancedProgress('Connecting...', 'CONNECT_BLOCKCHAIN');
progress.start();
let connected = false;
for (let i = 0; i < 3; i++) {
  try {
    progress.updateStatus(`Attempting connection...`);
    await connect();
    connected = true;
    break;
  } catch (error) {
    progress.retry(); // Automatically shows retry count
  }
}
if (connected) {
  progress.succeed('Connected');
} else {
  progress.fail('Connection failed');
}
```

## Operation Type Constants

Use these predefined operation types for automatic time estimation:

```typescript
OPERATION_ESTIMATES = {
  // Network operations
  CONNECT_BLOCKCHAIN: 3000,      // 3 seconds
  CREATE_CHANNEL: 20000,         // 20 seconds
  SEND_TRANSACTION: 15000,       // 15 seconds
  CONFIRM_TRANSACTION: 30000,    // 30 seconds
  
  // Data operations
  FETCH_ACCOUNTS: 5000,          // 5 seconds
  LOAD_ANALYTICS: 8000,          // 8 seconds
  SEARCH_MARKETPLACE: 10000,     // 10 seconds
  
  // Agent operations
  REGISTER_AGENT: 25000,         // 25 seconds
  UPDATE_AGENT: 15000,           // 15 seconds
  
  // Escrow operations
  CREATE_ESCROW: 20000,          // 20 seconds
  DEPOSIT_ESCROW: 15000,         // 15 seconds
  RELEASE_ESCROW: 18000,         // 18 seconds
  
  // System operations
  RUN_DIAGNOSTICS: 12000,        // 12 seconds
  CHECK_HEALTH: 5000,            // 5 seconds
}
```

## Advanced Features

### 1. Timeout Warnings

```typescript
const progress = createEnhancedProgress('Processing...', undefined, {
  estimatedDuration: 10000,
  timeoutWarningThreshold: 0.8 // Warn at 80% of estimated time
});

progress.on('warning', (status) => {
  console.log('Operation taking longer than expected!');
});
```

### 2. Dynamic Status Updates

```typescript
const progress = createEnhancedProgress('Syncing blockchain...');
progress.start();

// Show detailed status without changing main message
progress.updateStatus('Block 1000/5000');
await sync(1000);
progress.updateStatus('Block 2000/5000');
await sync(1000);
// etc...
```

### 3. Using the Helper Function

```typescript
const result = await withEnhancedProgress(
  {
    message: 'Creating agent...',
    estimatedDuration: OPERATION_ESTIMATES.REGISTER_AGENT,
    steps: [
      { name: 'Validating metadata', weight: 1 },
      { name: 'Generating keypair', weight: 1 },
      { name: 'Registering on-chain', weight: 3 }
    ]
  },
  async (progress) => {
    progress.startStep(0);
    const metadata = await validateMetadata();
    
    progress.completeStep();
    progress.startStep(1);
    const keypair = await generateKeypair();
    
    progress.completeStep();
    progress.startStep(2);
    const result = await registerOnChain(keypair, metadata);
    
    progress.completeStep();
    return result;
  }
);
```

## Best Practices

1. **Use operation types** when available for better time estimates
2. **Update status messages** to show what's actually happening
3. **Use steps** for operations with distinct phases
4. **Track retries** for network operations
5. **Listen for warnings** in critical operations
6. **Pause during user input** to prevent visual confusion

## Backward Compatibility

The enhanced progress indicator is designed to be a drop-in replacement. You can:

1. Use `ProgressIndicatorAdapter` for gradual migration
2. Keep using `ProgressIndicator` where enhanced features aren't needed
3. Mix both types in the same codebase

## Running the Demo

To see all features in action:

```bash
bun run src/examples/enhanced-progress-demo.ts
```

This will demonstrate:
- Basic time tracking
- Step-based progress
- Network operations with retries
- Timeout warnings
- Real-world channel creation example