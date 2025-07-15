#!/usr/bin/env tsx

/**
 * Final comprehensive fix for all type issues
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const GENERATED_DIR = join(process.cwd(), 'src', 'generated')

function findTypeScriptFiles(dir: string): string[] {
  const files: string[] = []
  const items = readdirSync(dir)
  
  for (const item of items) {
    const fullPath = join(dir, item)
    const stat = statSync(fullPath)
    
    if (stat.isDirectory()) {
      files.push(...findTypeScriptFiles(fullPath))
    } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
      files.push(fullPath)
    }
  }
  
  return files
}

function fixInstructionFile(content: string): string {
  let fixed = content
  
  // Fix AccountRole import - it's from @solana/instructions, not @solana/accounts
  fixed = fixed.replace(
    /import { AccountRole } from '@solana\/accounts';/g,
    "import { AccountRole } from '@solana/instructions';"
  )
  
  // Fix TProgramAddress not defined in parse functions
  fixed = fixed.replace(
    /\): ParsedAcceptJobApplicationInstruction<TProgramAddress, any\[\]> {/g,
    '): ParsedAcceptJobApplicationInstruction<TProgram, TAccountMetas> {'
  )
  
  fixed = fixed.replace(
    /\): ParsedActivateAgentInstruction<TProgramAddress, any\[\]> {/g,
    '): ParsedActivateAgentInstruction<TProgram, TAccountMetas> {'
  )
  
  // Generic fix for all parsed instruction types
  fixed = fixed.replace(
    /\): Parsed(\w+)Instruction<TProgramAddress, any\[\]> {/g,
    '): Parsed$1Instruction<TProgram, TAccountMetas> {'
  )
  
  return fixed
}

function fixSharedFile(content: string): string {
  let fixed = content
  
  // Add AccountRole import if needed
  if (fixed.includes('AccountRole') && !fixed.includes("import { AccountRole }")) {
    // Add after the last import
    const lastImport = fixed.lastIndexOf("import")
    const nextLine = fixed.indexOf('\n', lastImport)
    fixed = fixed.slice(0, nextLine + 1) + 
      "import { AccountRole } from '@solana/instructions';\n" + 
      fixed.slice(nextLine + 1)
  }
  
  return fixed
}

function processAllFiles() {
  console.log('🔧 Final comprehensive type fix...')
  
  const files = findTypeScriptFiles(GENERATED_DIR)
  console.log(`Found ${files.length} generated files`)
  
  let fixedCount = 0
  
  for (const file of files) {
    const content = readFileSync(file, 'utf8')
    let fixed = content
    
    if (file.includes('/instructions/')) {
      fixed = fixInstructionFile(fixed)
    } else if (file.includes('/shared/')) {
      fixed = fixSharedFile(fixed)
    }
    
    if (fixed !== content) {
      writeFileSync(file, fixed)
      console.log(`✅ Fixed: ${file.replace(process.cwd(), '')}`)
      fixedCount++
    }
  }
  
  console.log(`\n🎉 Fixed ${fixedCount} files!`)
}

processAllFiles()