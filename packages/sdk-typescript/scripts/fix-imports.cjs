#!/usr/bin/env node

/**
 * Fix Codama generated imports to use correct Solana Kit package imports
 */

const { readFileSync, writeFileSync, readdirSync, statSync } = require('fs')
const { join } = require('path')

const GENERATED_DIR = join(process.cwd(), 'src', 'generated')

function findTsFiles(dir) {
  const files = []
  
  function traverse(currentDir) {
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

function fixImportsInContent(content) {
  // Step 1: Replace @solana/kit imports with correct package imports
  content = content.replace(
    /import\s*\{([^}]+)\}\s*from\s*['"]@solana\/kit['"];?/g,
    (match, imports) => {
      const importList = imports.split(',').map(imp => imp.trim()).filter(Boolean)
      
      const coreImports = []
      const stringImports = []
      const dataStructureImports = []
      
      importList.forEach(imp => {
        // Clean up import (remove type prefixes)
        const cleanImp = imp.replace(/^type\s+/, '')
        
        if (cleanImp.includes('getString')) {
          stringImports.push(imp.replace('getString', 'getUtf8'))
        } else if (cleanImp.includes('getVec')) {
          dataStructureImports.push(imp.replace('getVec', 'getArray'))
        } else if (cleanImp.includes('getStruct')) {
          dataStructureImports.push(imp)
        } else if (cleanImp.includes('getArray')) {
          dataStructureImports.push(imp)
        } else if (cleanImp.match(/^(type\s+)?(Codec|Decoder|Encoder|combineCodec)$/)) {
          coreImports.push(imp)
        } else {
          // Default to core for other common types
          coreImports.push(imp)
        }
      })
      
      let result = ''
      if (coreImports.length > 0) {
        result += `import {\n  ${coreImports.join(',\n  ')}\n} from '@solana/codecs-core';\n`
      }
      if (stringImports.length > 0) {
        result += `import {\n  ${stringImports.join(',\n  ')}\n} from '@solana/codecs-strings';\n`
      }
      if (dataStructureImports.length > 0) {
        result += `import {\n  ${dataStructureImports.join(',\n  ')}\n} from '@solana/codecs-data-structures';\n`
      }
      
      return result.trim()
    }
  )
  
  // Step 2: Replace function calls
  content = content.replace(/getStringDecoder/g, 'getUtf8Decoder')
  content = content.replace(/getStringEncoder/g, 'getUtf8Encoder')  
  content = content.replace(/getVecDecoder/g, 'getArrayDecoder')
  content = content.replace(/getVecEncoder/g, 'getArrayEncoder')
  
  return content
}

function fixImportsInFile(filePath) {
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