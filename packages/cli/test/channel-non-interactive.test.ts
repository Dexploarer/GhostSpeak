#!/usr/bin/env bun

/**
 * Test script for non-interactive channel creation
 */

import { spawn } from 'child_process';
import { join } from 'path';

const cliPath = join(process.cwd(), 'src', 'index.ts');

console.log('Testing non-interactive channel creation...\n');

// Test 1: Basic non-interactive channel creation
console.log('Test 1: Basic non-interactive channel creation');
const test1 = spawn('bun', [cliPath, 'channel', 'create', 'TestChannel', '--non-interactive'], {
  env: { ...process.env, NODE_ENV: 'test' }
});

let output1 = '';
test1.stdout.on('data', (data) => {
  output1 += data.toString();
  process.stdout.write(data);
});

test1.stderr.on('data', (data) => {
  process.stderr.write(data);
});

test1.on('close', (code) => {
  console.log(`\nTest 1 exited with code ${code}`);
  
  // Verify output contains expected elements
  if (output1.includes('Non-interactive mode: proceeding with channel creation')) {
    console.log('✅ Non-interactive mode message found');
  } else {
    console.log('❌ Non-interactive mode message not found');
  }
  
  if (output1.includes('Channel ID:') && output1.includes('Transaction:')) {
    console.log('✅ Minimal output format verified');
  } else {
    console.log('❌ Expected minimal output not found');
  }
  
  // Test 2: Non-interactive with options
  console.log('\n\nTest 2: Non-interactive channel creation with options');
  const test2 = spawn('bun', [
    cliPath, 
    'channel', 
    'create', 
    'PrivateChannel',
    '--non-interactive',
    '--private',
    '--encrypted',
    '--description', 'Test private channel',
    '--max-participants', '50'
  ], {
    env: { ...process.env, NODE_ENV: 'test' }
  });
  
  let output2 = '';
  test2.stdout.on('data', (data) => {
    output2 += data.toString();
    process.stdout.write(data);
  });
  
  test2.stderr.on('data', (data) => {
    process.stderr.write(data);
  });
  
  test2.on('close', (code2) => {
    console.log(`\nTest 2 exited with code ${code2}`);
    
    if (output2.includes('Channel "PrivateChannel" created successfully!')) {
      console.log('✅ Channel creation success message found');
    } else {
      console.log('❌ Success message not found');
    }
    
    // Test 3: Using --yes flag
    console.log('\n\nTest 3: Channel creation with --yes flag');
    const test3 = spawn('bun', [
      cliPath,
      'channel',
      'create',
      'YesChannel',
      '--yes'
    ], {
      env: { ...process.env, NODE_ENV: 'test' }
    });
    
    let output3 = '';
    test3.stdout.on('data', (data) => {
      output3 += data.toString();
      process.stdout.write(data);
    });
    
    test3.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
    
    test3.on('close', (code3) => {
      console.log(`\nTest 3 exited with code ${code3}`);
      
      if (!output3.includes('Channel Details:')) {
        console.log('✅ Channel details skipped with --yes flag');
      } else {
        console.log('❌ Channel details shown despite --yes flag');
      }
      
      console.log('\n✅ All tests completed!');
    });
  });
});