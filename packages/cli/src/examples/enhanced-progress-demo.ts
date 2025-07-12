/**
 * Enhanced Progress Indicator Demo
 * 
 * This file demonstrates various ways to use the enhanced progress indicator
 * for better user feedback during long-running operations.
 */

import { 
  EnhancedProgressIndicator,
  createEnhancedProgress,
  withEnhancedProgress,
  OPERATION_ESTIMATES,
  addTimeoutWarning
} from '../utils/enhanced-progress.js';

/**
 * Basic usage with automatic time tracking
 */
async function basicExample() {
  console.log('=== Basic Progress Example ===\n');
  
  const progress = createEnhancedProgress(
    'Processing data...',
    undefined, // No specific operation type
    {
      estimatedDuration: 10000, // 10 seconds
      showElapsed: true,
      showRemaining: true
    }
  );
  
  progress.start();
  
  // Simulate work
  await new Promise(resolve => setTimeout(resolve, 3000));
  progress.updateStatus('Analyzing results...');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  progress.updateStatus('Finalizing output...');
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  progress.succeed('Data processing completed!');
}

/**
 * Step-based progress tracking
 */
async function steppedExample() {
  console.log('\n=== Stepped Progress Example ===\n');
  
  const progress = createEnhancedProgress(
    'Building application...',
    undefined,
    {
      steps: [
        { name: 'Installing dependencies', weight: 3 },
        { name: 'Compiling TypeScript', weight: 2 },
        { name: 'Building bundles', weight: 2 },
        { name: 'Optimizing assets', weight: 1 },
        { name: 'Generating documentation', weight: 1 }
      ]
    }
  );
  
  progress.start();
  
  // Execute each step
  for (let i = 0; i < 5; i++) {
    progress.startStep(i);
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
    progress.completeStep();
  }
  
  progress.succeed('Build completed successfully!');
}

/**
 * Network operation with retry handling
 */
async function networkExample() {
  console.log('\n=== Network Operation Example ===\n');
  
  const progress = createEnhancedProgress(
    'Connecting to blockchain...',
    'CONNECT_BLOCKCHAIN'
  );
  
  progress.start();
  
  // Simulate connection attempts
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      progress.updateStatus(`Attempting connection (attempt ${attempt}/3)...`);
      
      // Simulate network delay
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (attempt < 2 && Math.random() > 0.5) {
            reject(new Error('Connection failed'));
          } else {
            resolve(undefined);
          }
        }, 2000);
      });
      
      // Success
      progress.succeed('Connected to blockchain successfully!');
      return;
    } catch (error) {
      progress.retry();
      if (attempt === 3) {
        progress.fail('Failed to connect after 3 attempts');
        return;
      }
    }
  }
}

/**
 * Long operation with timeout warning
 */
async function timeoutWarningExample() {
  console.log('\n=== Timeout Warning Example ===\n');
  
  const progress = createEnhancedProgress(
    'Processing large dataset...',
    undefined,
    {
      estimatedDuration: 5000, // 5 seconds
      timeoutWarningThreshold: 0.6 // Warn at 60% of estimated time
    }
  );
  
  // Listen for warning events
  progress.on('warning', (status) => {
    console.log('\n⚠️  Operation is taking longer than expected!');
  });
  
  progress.start();
  progress.updateStatus('Loading data from storage...');
  
  // Simulate work that takes longer than expected
  await new Promise(resolve => setTimeout(resolve, 4000));
  progress.updateStatus('Still processing... please wait...');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  progress.succeed('Dataset processing completed (took longer than expected)');
}

/**
 * Using withEnhancedProgress helper
 */
async function helperExample() {
  console.log('\n=== Helper Function Example ===\n');
  
  const result = await withEnhancedProgress(
    {
      message: 'Deploying smart contract...',
      estimatedDuration: OPERATION_ESTIMATES.SEND_TRANSACTION,
      steps: [
        { name: 'Compiling contract', weight: 2 },
        { name: 'Uploading to blockchain', weight: 3 },
        { name: 'Verifying deployment', weight: 1 }
      ]
    },
    async (progress) => {
      // Step 1
      progress.startStep(0);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 2
      progress.completeStep();
      progress.startStep(1);
      progress.updateStatus('Sending transaction to network...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Step 3
      progress.completeStep();
      progress.startStep(2);
      await new Promise(resolve => setTimeout(resolve, 1000));
      progress.completeStep();
      
      return { contractAddress: '0x1234...', deploymentCost: '0.05 SOL' };
    }
  );
  
  console.log('Deployment result:', result);
}

/**
 * Real-world example: Channel creation
 */
async function channelCreationExample() {
  console.log('\n=== Channel Creation Example ===\n');
  
  const progress = createEnhancedProgress(
    'Creating channel "general-discussion"...',
    'CREATE_CHANNEL',
    {
      steps: [
        { name: 'Validating channel name', weight: 1 },
        { name: 'Initializing SDK services', weight: 2 },
        { name: 'Checking network health', weight: 2 },
        { name: 'Building transaction', weight: 1 },
        { name: 'Sending to blockchain', weight: 4 },
        { name: 'Waiting for confirmation', weight: 3 }
      ]
    }
  );
  
  progress.start();
  
  try {
    // Validation
    progress.startStep(0);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // SDK Init
    progress.completeStep();
    progress.startStep(1);
    progress.updateStatus('Loading wallet configuration...');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Network check
    progress.completeStep();
    progress.startStep(2);
    progress.updateStatus('Pinging RPC endpoint...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    progress.updateStatus('Network latency: 45ms');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Build transaction
    progress.completeStep();
    progress.startStep(3);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Send transaction
    progress.completeStep();
    progress.startStep(4);
    progress.updateStatus('Transaction sent: 5abc...def9');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Wait for confirmation
    progress.completeStep();
    progress.startStep(5);
    progress.updateStatus('Waiting for 1 confirmation...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    progress.updateStatus('Confirmed! Block: 12345678');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    progress.completeStep();
    progress.succeed('Channel "general-discussion" created successfully!');
    
  } catch (error) {
    progress.fail('Failed to create channel');
    throw error;
  }
}

/**
 * Run all examples
 */
async function runDemo() {
  console.log('🎯 Enhanced Progress Indicator Demo\n');
  console.log('This demo shows various ways to provide better user feedback.\n');
  
  await basicExample();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await steppedExample();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await networkExample();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await timeoutWarningExample();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await helperExample();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await channelCreationExample();
  
  console.log('\n✅ Demo completed!\n');
}

// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo().catch(console.error);
}

export { runDemo };