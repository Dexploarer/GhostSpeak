#!/usr/bin/env node

/**
 * Test script for Register Agent command
 */

import { RegisterAgentCommand } from './src/commands/register-agent.js';

async function testRegisterAgent() {
  console.log('🧪 Testing Register Agent Command...');
  
  try {
    // Create the command instance
    const command = new RegisterAgentCommand();
    
    // Check if command can be instantiated
    console.log('✅ Register Agent command instantiated successfully');
    
    // Try to execute the command (this will show the UI)
    // We'll catch any errors here
    console.log('⚠️  Command would show interactive UI - testing infrastructure only');
    
    return true;
  } catch (error) {
    console.error('❌ Register Agent command failed:', error.message);
    return false;
  }
}

testRegisterAgent()
  .then(success => {
    if (success) {
      console.log('✅ Register Agent command test passed');
      process.exit(0);
    } else {
      console.log('❌ Register Agent command test failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Test script error:', error);
    process.exit(1);
  });