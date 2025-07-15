#!/usr/bin/env tsx

/**
 * Remove obsolete Web3.js v1 type imports
 */

import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'

// Find all files with obsolete imports
const files = execSync('grep -r "ReadonlySignerAccount" src/generated --include="*.ts" -l', { 
  encoding: 'utf-8',
  cwd: process.cwd() 
}).trim().split('\n').filter(Boolean)

console.log(`Found ${files.length} files with obsolete imports`)

let fixedCount = 0

for (const file of files) {
  const content = readFileSync(file, 'utf8')
  let fixed = content
  
  // Remove the obsolete import
  fixed = fixed.replace(/import\s*\{\s*type\s+ReadonlySignerAccount\s*\}\s*from\s*'@solana\/accounts';\s*\n/g, '')
  
  // Also remove if it's part of a larger import
  fixed = fixed.replace(/,?\s*type\s+ReadonlySignerAccount/g, '')
  
  // Clean up any empty imports
  fixed = fixed.replace(/import\s*\{\s*\}\s*from\s*'@solana\/accounts';\s*\n/g, '')
  
  if (fixed !== content) {
    writeFileSync(file, fixed)
    console.log(`✅ Fixed: ${file}`)
    fixedCount++
  }
}

console.log(`\n🎉 Removed obsolete imports from ${fixedCount} files!`)