#!/usr/bin/env tsx

/**
 * Fix discriminated union imports in generated types
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const TYPES_DIR = join(process.cwd(), 'src', 'generated', 'types')

function findTypeScriptFiles(dir: string): string[] {
  const files: string[] = []
  const items = readdirSync(dir)
  
  for (const item of items) {
    const fullPath = join(dir, item)
    const stat = statSync(fullPath)
    
    if (!stat.isDirectory() && item.endsWith('.ts') && !item.endsWith('.d.ts')) {
      files.push(fullPath)
    }
  }
  
  return files
}

function fixDiscriminatedUnionImports(content: string): string {
  let fixed = content
  
  // Move discriminated union imports from @solana/codecs-core to @solana/codecs-data-structures
  const discriminatedUnionFunctions = [
    'getDiscriminatedUnionDecoder',
    'getDiscriminatedUnionEncoder',
    'getTupleDecoder',
    'getTupleEncoder',
    'getUnitDecoder',
    'getUnitEncoder',
  ]
  
  const discriminatedUnionTypes = [
    'GetDiscriminatedUnionVariant',
    'GetDiscriminatedUnionVariantContent',
  ]
  
  // Check if file has discriminated union imports from wrong package
  if (fixed.includes('getDiscriminatedUnionDecoder') && fixed.includes("from '@solana/codecs-core'")) {
    // Extract imports from @solana/codecs-core
    const coreImportMatch = fixed.match(/import\s*\{([^}]+)\}\s*from\s*'@solana\/codecs-core';/s)
    if (coreImportMatch) {
      const coreImports = coreImportMatch[1].split(',').map(imp => imp.trim())
      
      // Separate core imports from data structure imports
      const remainingCoreImports: string[] = []
      const dataStructureImports: string[] = []
      
      coreImports.forEach(imp => {
        const cleanImp = imp.replace(/^type\s+/, '')
        if (discriminatedUnionFunctions.includes(cleanImp) || 
            discriminatedUnionTypes.includes(cleanImp)) {
          dataStructureImports.push(imp)
        } else {
          remainingCoreImports.push(imp)
        }
      })
      
      // Rebuild imports
      let newImports = ''
      
      if (remainingCoreImports.length > 0) {
        newImports += `import {\n  ${remainingCoreImports.join(',\n  ')}\n} from '@solana/codecs-core';\n`
      }
      
      // Check if we already have @solana/codecs-data-structures import
      const dataStructImportMatch = fixed.match(/import\s*\{([^}]+)\}\s*from\s*'@solana\/codecs-data-structures';/s)
      if (dataStructImportMatch) {
        // Add to existing import
        const existingImports = dataStructImportMatch[1].split(',').map(imp => imp.trim())
        const allDataStructImports = [...new Set([...existingImports, ...dataStructureImports])]
        
        fixed = fixed.replace(
          dataStructImportMatch[0],
          `import {\n  ${allDataStructImports.join(',\n  ')}\n} from '@solana/codecs-data-structures';`
        )
        
        // Replace the core import
        fixed = fixed.replace(coreImportMatch[0], newImports.trim())
      } else {
        // Create new data structures import
        if (dataStructureImports.length > 0) {
          newImports += `import {\n  ${dataStructureImports.join(',\n  ')}\n} from '@solana/codecs-data-structures';\n`
        }
        
        // Replace the core import
        fixed = fixed.replace(coreImportMatch[0], newImports.trim())
      }
    }
  }
  
  return fixed
}

function processTypeFiles() {
  console.log('🔧 Fixing discriminated union imports...')
  
  const files = findTypeScriptFiles(TYPES_DIR)
  console.log(`Found ${files.length} type files`)
  
  let fixedCount = 0
  
  for (const file of files) {
    const content = readFileSync(file, 'utf8')
    const fixed = fixDiscriminatedUnionImports(content)
    
    if (fixed !== content) {
      writeFileSync(file, fixed)
      console.log(`✅ Fixed: ${file.replace(process.cwd(), '')}`)
      fixedCount++
    }
  }
  
  console.log(`\n🎉 Fixed ${fixedCount} type files!`)
}

processTypeFiles()