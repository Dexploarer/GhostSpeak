#!/usr/bin/env tsx

/**
 * Fix all Codama generated types to be compatible with July 2025 Web3.js v2
 * This includes instruction types, shared utilities, and client code
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

function fixSharedTypes(content: string): string {
  let fixed = content
  
  // Add missing type definitions for July 2025 compatibility
  if (fixed.includes('IAccountMeta') && !fixed.includes('export type IAccountMeta')) {
    const typeDefinitions = `
// July 2025 Web3.js v2 compatible types
export type IAccountMeta = {
  address: Address;
  role: AccountRole;
};

export type IAccountSignerMeta = IAccountMeta & {
  signer: true;
};

export type TransactionSigner<TAddress extends string = string> = {
  address: Address<TAddress>;
  signTransaction: (transaction: any) => Promise<any>;
  signAllTransactions?: (transactions: any[]) => Promise<any[]>;
};

// Helper function for TransactionSigner check
function kitIsTransactionSigner<TAddress extends string = string>(
  value: any
): value is TransactionSigner<TAddress> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'address' in value &&
    'signTransaction' in value &&
    typeof value.signTransaction === 'function'
  );
}
`
    // Insert after the imports
    const importEndIndex = fixed.lastIndexOf('import')
    const nextLineIndex = fixed.indexOf('\n', importEndIndex)
    fixed = fixed.slice(0, nextLineIndex + 1) + typeDefinitions + fixed.slice(nextLineIndex + 1)
  }
  
  return fixed
}

function fixInstructionTypes(content: string): string {
  let fixed = content
  
  // Fix the instruction type definition to match IInstruction interface
  // Replace complex generic instruction types with simpler structure
  fixed = fixed.replace(
    /export type (\w+)Instruction<[^>]+> = \{ programAddress: [^}]+ \} &\s*\{ data: [^}]+ \} &\s*\{ accounts:\s*\[[^\]]+\]\s*\};/gs,
    (match, instructionName) => {
      return `export type ${instructionName}Instruction<
  TProgram extends string = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
  TAccountMetas extends readonly any[] = readonly any[],
> = {
  programAddress: Address<TProgram>;
  data: Uint8Array;
  accounts: TAccountMetas;
};`
    }
  )
  
  // Fix instruction builder return types
  fixed = fixed.replace(
    /as (\w+)Instruction<[^>]+>;/g,
    (match, instructionName) => {
      return `as ${instructionName}Instruction<TProgramAddress, any[]>;`
    }
  )
  
  return fixed
}

function fixClientCode(content: string): string {
  let fixed = content
  
  // Fix IInstruction import to use @solana/instructions
  fixed = fixed.replace(
    /import type \{ IInstruction, TransactionSigner \} from '@solana\/kit'/g,
    `import type { TransactionSigner } from '@solana/kit'
import type { IInstruction } from '@solana/instructions'`
  )
  
  // Add type assertion for instruction compatibility
  fixed = fixed.replace(
    /const instruction = get(\w+)Instruction\(/g,
    'const instruction = get$1Instruction('
  )
  
  // Add as IInstruction cast where needed
  fixed = fixed.replace(
    /return await this\.send\(instruction, signer\)/g,
    'return await this.send(instruction as IInstruction, signer)'
  )
  
  return fixed
}

function processAllFiles() {
  console.log('🔧 Fixing all generated types for July 2025 compatibility...')
  
  const files = findTypeScriptFiles(GENERATED_DIR)
  console.log(`Found ${files.length} TypeScript files to process`)
  
  let fixedCount = 0
  
  for (const file of files) {
    const content = readFileSync(file, 'utf8')
    let fixed = content
    
    // Apply different fixes based on file location
    if (file.includes('/shared/')) {
      fixed = fixSharedTypes(fixed)
    } else if (file.includes('/instructions/')) {
      fixed = fixInstructionTypes(fixed)
    }
    
    if (fixed !== content) {
      writeFileSync(file, fixed)
      console.log(`✅ Fixed: ${file.replace(process.cwd(), '')}`)
      fixedCount++
    }
  }
  
  // Also fix client code
  const clientDir = join(process.cwd(), 'src', 'client', 'instructions')
  const clientFiles = findTypeScriptFiles(clientDir)
  
  for (const file of clientFiles) {
    const content = readFileSync(file, 'utf8')
    const fixed = fixClientCode(content)
    
    if (fixed !== content) {
      writeFileSync(file, fixed)
      console.log(`✅ Fixed client: ${file.replace(process.cwd(), '')}`)
      fixedCount++
    }
  }
  
  console.log(`\n🎉 Fixed ${fixedCount} files for July 2025 compatibility!`)
}

processAllFiles()