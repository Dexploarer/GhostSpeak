#!/usr/bin/env tsx

/**
 * Fix Codama generated instruction types to use July 2025 Web3.js v2 compatible types
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const INSTRUCTIONS_DIR = join(process.cwd(), 'src', 'generated', 'instructions')

function findInstructionFiles(dir: string): string[] {
  const files: string[] = []
  const items = readdirSync(dir)
  
  for (const item of items) {
    const fullPath = join(dir, item)
    const stat = statSync(fullPath)
    
    if (!stat.isDirectory() && item.endsWith('.ts') && item !== 'index.ts') {
      files.push(fullPath)
    }
  }
  
  return files
}

function fixInstructionTypes(content: string): string {
  // Replace obsolete interface types with July 2025 compatible types
  let fixed = content
  
  // Replace IAccountMeta with a simple type
  fixed = fixed.replace(/IAccountMeta<string>/g, '{ address: string; role: number }')
  
  // Replace account types with simple address strings  
  fixed = fixed.replace(/WritableAccount<([^>]+)>/g, '$1')
  fixed = fixed.replace(/ReadonlyAccount<([^>]+)>/g, '$1')
  fixed = fixed.replace(/WritableSignerAccount<([^>]+)>/g, '$1')
  fixed = fixed.replace(/ReadonlySignerAccount<([^>]+)>/g, '$1')
  
  // Replace IAccountSignerMeta
  fixed = fixed.replace(/IAccountSignerMeta<[^>]+>/g, '{ address: string; role: number; signer: true }')
  
  // Replace instruction interface types
  fixed = fixed.replace(/IInstruction<([^>]+)>/g, '{ programAddress: $1 }')
  fixed = fixed.replace(/IInstructionWithData<([^>]+)>/g, '{ data: $1 }')
  fixed = fixed.replace(/IInstructionWithAccounts<([^>]+)>/g, '{ accounts: $1 }')
  
  // Remove TransactionSigner references
  fixed = fixed.replace(/TransactionSigner<[^>]+>/g, 'any')
  
  return fixed
}

function processInstructionFiles() {
  console.log('🔧 Fixing instruction types for July 2025 compatibility...')
  
  const files = findInstructionFiles(INSTRUCTIONS_DIR)
  console.log(`Found ${files.length} instruction files to process`)
  
  let fixedCount = 0
  
  for (const file of files) {
    const content = readFileSync(file, 'utf8')
    const fixed = fixInstructionTypes(content)
    
    if (fixed !== content) {
      writeFileSync(file, fixed)
      console.log(`✅ Fixed: ${file.replace(process.cwd(), '')}`)
      fixedCount++
    }
  }
  
  console.log(`\n🎉 Fixed ${fixedCount} instruction files for July 2025 compatibility!`)
}

processInstructionFiles()