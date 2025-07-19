#!/usr/bin/env tsx
/**
 * Fix TypeScript type export issues in generated files - Version 2
 * 
 * This version takes a different approach: instead of modifying generated files,
 * it creates a type-mappings file that properly exports the types with their expected names.
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const GENERATED_DIR = path.join(__dirname, '..', 'src', 'generated')
const GENERATED_TYPES_DIR = path.join(GENERATED_DIR, 'types')

interface ExportTypeInfo {
  exportTypeName: string
  baseTypeName: string
  fileName: string
}

function findAllExportTypes(): ExportTypeInfo[] {
  const exportTypes: ExportTypeInfo[] = []
  
  // Read all files in the generated types directory
  const files = fs.readdirSync(GENERATED_TYPES_DIR)
  
  for (const file of files) {
    if (file.endsWith('Export.ts') && file !== 'index.ts') {
      const filePath = path.join(GENERATED_TYPES_DIR, file)
      const content = fs.readFileSync(filePath, 'utf-8')
      
      // Extract the export type name
      const exportTypeMatch = content.match(/export type (\w+Export) = /)
      if (exportTypeMatch) {
        const exportTypeName = exportTypeMatch[1]
        const baseTypeName = exportTypeName.slice(0, -6) // Remove 'Export' suffix
        
        exportTypes.push({
          exportTypeName,
          baseTypeName,
          fileName: file.replace('.ts', '')
        })
      }
    }
  }
  
  return exportTypes
}

function generateTypeMappings(exportTypes: ExportTypeInfo[]): string {
  let content = `/**
 * Type Mappings for Generated Export Types
 * 
 * This file provides proper type exports for the generated Export wrapper types.
 * It extracts the inner types and re-exports them with their expected names.
 * 
 * AUTO-GENERATED - DO NOT EDIT
 */

`

  // Import all Export types
  for (const info of exportTypes) {
    content += `import type { ${info.exportTypeName}, ${info.exportTypeName}Args } from './types/${info.fileName}.js';\n`
  }
  
  content += '\n'
  
  // Create type aliases that extract the inner type
  for (const info of exportTypes) {
    content += `// Extract ${info.baseTypeName} from ${info.exportTypeName} wrapper\n`
    content += `export type ${info.baseTypeName} = ${info.exportTypeName} extends { data: infer T } ? T : never;\n`
    content += `export type ${info.baseTypeName}Args = ${info.exportTypeName}Args extends { data: infer T } ? T : never;\n\n`
  }
  
  // Re-export decoder/encoder functions if they exist
  content += '// Re-export encoder/decoder functions\n'
  for (const info of exportTypes) {
    content += `export {\n`
    content += `  get${info.exportTypeName}Encoder as get${info.baseTypeName}Encoder,\n`
    content += `  get${info.exportTypeName}Decoder as get${info.baseTypeName}Decoder,\n`
    content += `  get${info.exportTypeName}Codec as get${info.baseTypeName}Codec\n`
    content += `} from './types/${info.fileName}.js';\n\n`
  }
  
  return content
}

function updateMainIndexFile(): void {
  const indexPath = path.join(GENERATED_DIR, 'index.ts')
  let content = fs.readFileSync(indexPath, 'utf-8')
  
  // Check if type-mappings is already exported
  if (!content.includes("export * from './type-mappings'")) {
    // Add export after the types export
    const typesExportIndex = content.indexOf("export * from './types'")
    if (typesExportIndex !== -1) {
      const lineEnd = content.indexOf('\n', typesExportIndex)
      content = content.slice(0, lineEnd + 1) + "export * from './type-mappings';\n" + content.slice(lineEnd + 1)
      fs.writeFileSync(indexPath, content)
    }
  }
}

async function main() {
  console.log('🔧 Fixing TypeScript type exports with type mappings approach...')
  
  // Find all Export types
  const exportTypes = findAllExportTypes()
  
  if (exportTypes.length === 0) {
    console.log('✅ No Export types found!')
    return
  }
  
  console.log(`📝 Found ${exportTypes.length} Export types to map:`)
  exportTypes.forEach(info => console.log(`   - ${info.baseTypeName} <- ${info.exportTypeName}`))
  
  // Generate the type mappings file
  console.log('\n📄 Generating type-mappings.ts...')
  const mappingsContent = generateTypeMappings(exportTypes)
  const mappingsPath = path.join(GENERATED_DIR, 'type-mappings.ts')
  fs.writeFileSync(mappingsPath, mappingsContent)
  
  // Update the main index file
  console.log('📋 Updating generated/index.ts...')
  updateMainIndexFile()
  
  console.log('\n✅ Type mappings created successfully!')
}

// Run the script
main().catch(error => {
  console.error('❌ Error creating type mappings:', error)
  process.exit(1)
})