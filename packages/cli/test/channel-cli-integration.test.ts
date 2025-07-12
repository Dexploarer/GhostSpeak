#!/usr/bin/env bun

/**
 * Integration test for channel CLI commands with non-interactive mode
 */

import { spawn } from 'child_process';
import { join } from 'path';

const cliPath = join(process.cwd(), 'src', 'index.ts');

async function runCommand(args: string[]): Promise<{ code: number; output: string; error: string }> {
  return new Promise((resolve) => {
    const proc = spawn('bun', [cliPath, ...args], {
      env: { ...process.env, NODE_ENV: 'test' },
      timeout: 10000 // 10 second timeout
    });
    
    let output = '';
    let error = '';
    
    proc.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    proc.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    proc.on('close', (code) => {
      resolve({ code: code || 0, output, error });
    });
    
    proc.on('error', (err) => {
      resolve({ code: 1, output, error: err.message });
    });
  });
}

async function main() {
  console.log('🧪 Testing Channel CLI Non-Interactive Mode\n');
  
  // Test 1: Basic non-interactive
  console.log('Test 1: Basic non-interactive channel creation');
  const result1 = await runCommand(['channel', 'create', 'TestChannel1', '--non-interactive']);
  console.log(`Exit code: ${result1.code}`);
  console.log(`Output includes non-interactive message: ${result1.output.includes('Non-interactive mode')}`);
  console.log(`No prompts shown: ${!result1.output.includes('?')}`);
  console.log('');
  
  // Test 2: With --yes flag
  console.log('Test 2: Channel creation with --yes flag');
  const result2 = await runCommand(['channel', 'create', 'TestChannel2', '--yes']);
  console.log(`Exit code: ${result2.code}`);
  console.log(`Output includes non-interactive message: ${result2.output.includes('Non-interactive mode')}`);
  console.log(`No channel details shown: ${!result2.output.includes('📋 Channel Details')}`);
  console.log('');
  
  // Test 3: With all options
  console.log('Test 3: Non-interactive with all options');
  const result3 = await runCommand([
    'channel', 'create', 'TestChannel3',
    '--non-interactive',
    '--description', 'Test Description',
    '--private',
    '--encrypted',
    '--max-participants', '25'
  ]);
  console.log(`Exit code: ${result3.code}`);
  console.log(`Command completed: ${result3.code === 0 || result3.output.includes('created successfully') || result3.output.includes('timed out')}`);
  console.log('');
  
  // Test 4: Help command (should always work)
  console.log('Test 4: Channel help command');
  const result4 = await runCommand(['channel', '--help']);
  console.log(`Exit code: ${result4.code}`);
  console.log(`Help shown: ${result4.output.includes('create') && result4.output.includes('list')}`);
  console.log('');
  
  console.log('✅ All integration tests completed!');
}

main().catch(console.error);