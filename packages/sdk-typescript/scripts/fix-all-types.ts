#!/usr/bin/env tsx

/**
 * Comprehensive fix for all Codama generated types to work with July 2025 Web3.js v2
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const GENERATED_DIR = join(process.cwd(), 'src', 'generated')
const CLIENT_DIR = join(process.cwd(), 'src', 'client')

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
  
  // Fix the return type declarations in instruction builders
  fixed = fixed.replace(
    /: Promise<\s*(\w+)Instruction<[^>]+>\s*>/gs,
    ': Promise<$1Instruction<TProgramAddress, any[]>>'
  )
  
  // Fix the cast at the end of instruction builders
  fixed = fixed.replace(
    /} as (\w+)Instruction<[^>]+>;/g,
    '} as $1Instruction<TProgramAddress, any[]>;'
  )
  
  // Fix the sync instruction return types
  fixed = fixed.replace(
    /\): (\w+)Instruction<[^>]+> {/g,
    '): $1Instruction<TProgramAddress, any[]> {'
  )
  
  // Fix ParsedInstruction types that still use IAccountMeta
  fixed = fixed.replace(/IAccountMeta/g, '{ address: Address; role: AccountRole }')
  
  // Import AccountRole if not already imported
  if (!fixed.includes("import { AccountRole }") && fixed.includes("AccountRole")) {
    // Add AccountRole import after the last import from '@solana/
    const lastSolanaImport = fixed.lastIndexOf("from '@solana/")
    const nextLineAfterImport = fixed.indexOf('\n', lastSolanaImport)
    fixed = fixed.slice(0, nextLineAfterImport + 1) + 
      "import { AccountRole } from '@solana/accounts';\n" + 
      fixed.slice(nextLineAfterImport + 1)
  }
  
  // Fix Address<TProgram> assignments
  fixed = fixed.replace(
    /programAddress: instruction\.programAddress,/g,
    'programAddress: instruction.programAddress as Address<TProgram>,'
  )
  
  return fixed
}

function fixSharedFile(content: string): string {
  // The shared file has already been fixed by the previous script
  // Just ensure it has all the necessary imports
  return content
}

function fixProgramFile(content: string): string {
  let fixed = content
  
  // Fix any IAccountMeta references
  fixed = fixed.replace(/IAccountMeta/g, '{ address: Address; role: AccountRole }')
  
  // Import AccountRole if needed
  if (!fixed.includes("import { AccountRole }") && fixed.includes("AccountRole")) {
    const lastImport = fixed.lastIndexOf("import")
    const nextLine = fixed.indexOf('\n', lastImport)
    fixed = fixed.slice(0, nextLine + 1) + 
      "import { AccountRole } from '@solana/accounts';\n" + 
      fixed.slice(nextLine + 1)
  }
  
  return fixed
}

function fixClientFile(content: string): string {
  let fixed = content
  
  // Fix instruction casts
  fixed = fixed.replace(
    /return await this\.send\(instruction, signer\)/g,
    'return await this.send(instruction as unknown as IInstruction, signer)'
  )
  
  fixed = fixed.replace(
    /return this\.sendTransaction\(\[instruction\]/g,
    'return this.sendTransaction([instruction as unknown as IInstruction]'
  )
  
  return fixed
}

function processAllFiles() {
  console.log('🔧 Comprehensively fixing all types for July 2025 compatibility...')
  
  // Fix generated files
  const generatedFiles = findTypeScriptFiles(GENERATED_DIR)
  console.log(`Found ${generatedFiles.length} generated files`)
  
  let fixedCount = 0
  
  for (const file of generatedFiles) {
    const content = readFileSync(file, 'utf8')
    let fixed = content
    
    if (file.includes('/instructions/')) {
      fixed = fixInstructionFile(fixed)
    } else if (file.includes('/shared/')) {
      fixed = fixSharedFile(fixed)
    } else if (file.includes('/programs/')) {
      fixed = fixProgramFile(fixed)
    }
    
    if (fixed !== content) {
      writeFileSync(file, fixed)
      console.log(`✅ Fixed: ${file.replace(process.cwd(), '')}`)
      fixedCount++
    }
  }
  
  // Fix client files
  const clientFiles = findTypeScriptFiles(CLIENT_DIR)
  console.log(`Found ${clientFiles.length} client files`)
  
  for (const file of clientFiles) {
    const content = readFileSync(file, 'utf8')
    const fixed = fixClientFile(content)
    
    if (fixed !== content) {
      writeFileSync(file, fixed)
      console.log(`✅ Fixed client: ${file.replace(process.cwd(), '')}`)
      fixedCount++
    }
  }
  
  console.log(`\n🎉 Comprehensively fixed ${fixedCount} files!`)
  console.log('\n📝 Next steps:')
  console.log('1. Run npm run build to verify all types compile')
  console.log('2. Test the SDK functionality')
  console.log('3. Update the TodoWrite with completion status')
}

processAllFiles()