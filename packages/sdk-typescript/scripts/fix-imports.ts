#!/usr/bin/env tsx

/**
 * Fix Codama generated imports to use correct Solana Kit package imports
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const GENERATED_DIR = join(process.cwd(), 'src', 'generated')

function findTsFiles(dir: string): string[] {
  const files: string[] = []
  
  function traverse(currentDir: string) {
    const items = readdirSync(currentDir)
    
    for (const item of items) {
      const fullPath = join(currentDir, item)
      const stat = statSync(fullPath)
      
      if (stat.isDirectory()) {
        traverse(fullPath)
      } else if (item.endsWith('.ts')) {
        files.push(fullPath)
      }
    }
  }
  
  traverse(dir)
  return files
}

function fixImportsInContent(content: string): string {
  // Step 0: Clean up any double commas first
  content = content.replace(/,\s*,/g, ',')
  
  // Step 1: Extract all imports and organize them properly
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"];?\s*\n/g
  let match
  const allImports: { [package: string]: Set<string> } = {}
  const nonCodecImports: string[] = []
  
  // Extract all imports
  while ((match = importRegex.exec(content)) !== null) {
    const imports = match[1]
    const packageName = match[2]
    
    // Skip non-codec related imports
    if (!packageName.startsWith('@solana/codecs') && 
        !packageName.startsWith('@solana/addresses') &&
        !packageName.startsWith('@solana/accounts') &&
        !packageName.startsWith('@solana/errors') &&
        !packageName.startsWith('@solana/instructions') &&
        !packageName.startsWith('@solana/options') &&
        packageName !== '@solana/kit') {
      nonCodecImports.push(match[0])
      continue
    }
    
    const importList = imports.split(',').map((imp: string) => imp.trim()).filter(Boolean)
    
    importList.forEach((imp: string) => {
      // Clean up import (remove type prefixes for classification)
      const cleanImp = imp.replace(/^type\s+/, '')
      
      // Determine the correct package for this import
      let correctPackage: string | null = packageName
      
      if (packageName === '@solana/kit') {
        // Classify imports from @solana/kit
        if (cleanImp.includes('getString') || cleanImp.includes('getUtf8')) {
          correctPackage = '@solana/codecs-strings'
          imp = imp.replace('getString', 'getUtf8')
        } else if (cleanImp.includes('getBytes')) {
          correctPackage = '@solana/codecs-data-structures'
        } else if (cleanImp.includes('getVec')) {
          correctPackage = '@solana/codecs-data-structures'
          imp = imp.replace('getVec', 'getArray')
        } else if (cleanImp.includes('getStruct') || cleanImp.includes('getArray') || 
                   cleanImp.includes('getBoolean') || cleanImp.includes('getEnum')) {
          correctPackage = '@solana/codecs-data-structures'
        } else if (cleanImp.includes('getOption') || cleanImp.includes('Option')) {
          correctPackage = '@solana/options'
        } else if (cleanImp.match(/^(type\s+)?(Address|address)$/) || 
                   cleanImp.includes('AddressEncoder') || cleanImp.includes('AddressDecoder') || 
                   cleanImp.includes('getProgramDerivedAddress')) {
          correctPackage = '@solana/addresses'
        } else if (cleanImp.includes('IAccountMeta') || cleanImp.includes('IAccountSignerMeta') ||
                   cleanImp.includes('IInstructionWithAccounts') || cleanImp.includes('ReadonlyAccount') ||
                   cleanImp.includes('WritableAccount') || cleanImp.includes('WritableSignerAccount') ||
                   cleanImp.includes('TransactionSigner')) {
          // These interface types don't exist in Web3.js v2 July 2025 - skip them
          correctPackage = null
        } else if (cleanImp.includes('Account') || cleanImp.includes('EncodedAccount') ||
                   cleanImp.includes('FetchAccount') || cleanImp.includes('MaybeAccount') ||
                   cleanImp.includes('assertAccount') || cleanImp.includes('decodeAccount') ||
                   cleanImp.includes('fetchEncodedAccount')) {
          correctPackage = '@solana/accounts'
        } else if (cleanImp.match(/^get(I|U|F)\d+(Decoder|Encoder)$/)) {
          correctPackage = '@solana/codecs-numbers'
        } else if (cleanImp.includes('IInstruction') || cleanImp.includes('IInstructionWithData')) {
          // Basic instruction types that may exist in Web3.js v2
          correctPackage = '@solana/instructions'
        } else if (cleanImp.includes('isProgramError')) {
          // isProgramError is not available in Web3.js v2 July 2025 - skip this import
          correctPackage = null
        } else if (cleanImp.includes('SolanaError') || cleanImp.includes('SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM')) {
          correctPackage = '@solana/errors'
        } else {
          correctPackage = '@solana/codecs-core'
        }
      } else if (packageName === '@solana/codecs-core') {
        // Check if this import should be in a different package
        if (cleanImp.includes('getUtf8') || cleanImp.includes('getString')) {
          correctPackage = '@solana/codecs-strings'
          imp = imp.replace('getString', 'getUtf8')
        } else if (cleanImp.includes('getBytes')) {
          correctPackage = '@solana/codecs-data-structures'
        } else if (cleanImp.includes('getBoolean') || cleanImp.includes('getStruct') || cleanImp.includes('getArray') || cleanImp.includes('getEnum')) {
          correctPackage = '@solana/codecs-data-structures'
        } else if (cleanImp.includes('getOption') || cleanImp.includes('Option')) {
          correctPackage = '@solana/options'
        } else if (cleanImp.match(/^get(I|U|F)\d+(Decoder|Encoder)$/)) {
          correctPackage = '@solana/codecs-numbers'
        } else if (cleanImp.match(/^(type\s+)?(Address|address)$/) || 
                   cleanImp.includes('AddressEncoder') || cleanImp.includes('AddressDecoder') || 
                   cleanImp.includes('getProgramDerivedAddress')) {
          correctPackage = '@solana/addresses'
        } else if (cleanImp.includes('isProgramError')) {
          // isProgramError is not available in Web3.js v2 July 2025 - skip this import
          correctPackage = null
        } else if (cleanImp.includes('SolanaError') || cleanImp.includes('SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM')) {
          correctPackage = '@solana/errors'
        } else if (cleanImp.includes('IInstruction') || cleanImp.includes('IInstructionWithData')) {
          // Basic instruction types that may exist in Web3.js v2
          correctPackage = '@solana/instructions'
        }
      }
      
      // Add to the correct package set (skip null packages)
      if (correctPackage !== null) {
        if (!allImports[correctPackage]) {
          allImports[correctPackage] = new Set()
        }
        allImports[correctPackage].add(imp)
      }
    })
  }
  
  // Remove all import statements from content
  content = content.replace(importRegex, '')
  
  // Build the organized imports
  const organizedImports: string[] = []
  
  // Add codec imports in specific order
  const packageOrder = [
    '@solana/codecs-core',
    '@solana/codecs-strings', 
    '@solana/codecs-numbers',
    '@solana/codecs-data-structures',
    '@solana/options',
    '@solana/addresses',
    '@solana/accounts',
    '@solana/instructions',
    '@solana/errors'
  ]
  
  packageOrder.forEach(pkg => {
    if (allImports[pkg] && allImports[pkg].size > 0) {
      const sortedImports = Array.from(allImports[pkg]).sort()
      organizedImports.push(`import {\n  ${sortedImports.join(',\n  ')}\n} from '${pkg}';`)
    }
  })
  
  // Add non-codec imports at the end
  organizedImports.push(...nonCodecImports.map(imp => imp.trim()))
  
  // Combine everything
  let finalContent = organizedImports.join('\n') + '\n' + content.replace(/^\s*\n/, '')
  
  // Step 2: Replace function calls in the final content
  finalContent = finalContent.replace(/getStringDecoder/g, 'getUtf8Decoder')
  finalContent = finalContent.replace(/getStringEncoder/g, 'getUtf8Encoder')  
  finalContent = finalContent.replace(/getVecDecoder/g, 'getArrayDecoder')
  finalContent = finalContent.replace(/getVecEncoder/g, 'getArrayEncoder')
  // Note: getBytesEncoder/getBytesDecoder are correct for Uint8Array - don't replace with UTF-8!
  
  // Step 3: Clean up any remaining double commas after all replacements
  finalContent = finalContent.replace(/,\s*,/g, ',')
  
  return finalContent
}

function fixImportsInFile(filePath: string): boolean {
  try {
    const originalContent = readFileSync(filePath, 'utf-8')
    const newContent = fixImportsInContent(originalContent)
    
    if (newContent !== originalContent) {
      writeFileSync(filePath, newContent)
      return true
    }
    
    return false
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error)
    return false
  }
}

// Find all TypeScript files in generated directory
const tsFiles = findTsFiles(GENERATED_DIR)

console.log(`🔧 Fixing imports in ${tsFiles.length} generated files...`)

let fixedCount = 0
for (const filePath of tsFiles) {
  if (fixImportsInFile(filePath)) {
    console.log(`✅ Fixed imports in: ${filePath.replace(process.cwd(), '')}`)
    fixedCount++
  }
}

console.log(`\n🎉 Fixed imports in ${fixedCount} files!`)