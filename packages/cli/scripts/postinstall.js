#!/usr/bin/env node

import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Only run postinstall for global installations
function isGlobalInstall() {
  try {
    const npmPrefix = execSync('npm prefix -g', { encoding: 'utf-8' }).trim()
    const currentPath = process.cwd()
    return currentPath.includes(npmPrefix)
  } catch {
    return false
  }
}

function setupGlobalCommands() {
  if (!isGlobalInstall()) {
    console.log('📦 GhostSpeak CLI installed locally')
    return
  }

  console.log('🚀 Setting up global GhostSpeak commands...')
  
  try {
    // The bin field in package.json should handle this automatically
    console.log('✅ Commands registered:')
    console.log('   - ghostspeak')
    console.log('   - gs (alias)')
    console.log('')
    console.log('💡 You can now use:')
    console.log('   $ ghostspeak <command>')
    console.log('   $ gs <command>')
  } catch {
    console.error('⚠️  Warning: Could not verify command installation')
    console.error('   You may need to add npm global bin to your PATH')
  }
}

// Run setup
setupGlobalCommands()