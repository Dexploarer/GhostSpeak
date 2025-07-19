#!/usr/bin/env tsx
/**
 * Fix circular dependencies in generated Export types
 * 
 * This script removes circular imports and properly defines the base types
 * that Export types depend on.
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const GENERATED_TYPES_DIR = path.join(__dirname, '..', 'src', 'generated', 'types')

interface TypeToFix {
  exportFileName: string
  baseTypeName: string
  isEnum?: boolean
}

// List of Export types that have circular dependencies
const typesToFix: TypeToFix[] = [
  { exportFileName: 'actionExport.ts', baseTypeName: 'Action' },
  { exportFileName: 'auditContextExport.ts', baseTypeName: 'AuditContext' },
  { exportFileName: 'biometricQualityExport.ts', baseTypeName: 'BiometricQuality', isEnum: true },
  { exportFileName: 'complianceStatusExport.ts', baseTypeName: 'ComplianceStatus', isEnum: true },
  { exportFileName: 'dynamicPricingConfigExport.ts', baseTypeName: 'DynamicPricingConfig' },
  { exportFileName: 'multisigConfigExport.ts', baseTypeName: 'MultisigConfig' },
  { exportFileName: 'reportEntryExport.ts', baseTypeName: 'ReportEntry' },
  { exportFileName: 'resourceConstraintsExport.ts', baseTypeName: 'ResourceConstraints' },
  { exportFileName: 'ruleConditionExport.ts', baseTypeName: 'RuleCondition' }
]

function fixExportFile(typeInfo: TypeToFix): void {
  const filePath = path.join(GENERATED_TYPES_DIR, typeInfo.exportFileName)
  
  if (!fs.existsSync(filePath)) {
    console.warn(`Warning: ${typeInfo.exportFileName} not found`)
    return
  }
  
  let content = fs.readFileSync(filePath, 'utf-8')
  
  // Remove the circular import from '.'
  const importRegex = /import\s*\{[^}]*?\}\s*from\s*['"]\.['"];?\s*\n/g
  content = content.replace(importRegex, '')
  
  // Define the base type inline based on whether it's an enum or interface
  let typeDefinition = ''
  
  if (typeInfo.isEnum) {
    // For enum types
    if (typeInfo.baseTypeName === 'ComplianceStatus') {
      typeDefinition = `
// Define ComplianceStatus enum
export enum ${typeInfo.baseTypeName} {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
  UnderReview = 3
}

export type ${typeInfo.baseTypeName}Args = ${typeInfo.baseTypeName};
`
    } else if (typeInfo.baseTypeName === 'BiometricQuality') {
      typeDefinition = `
// Define BiometricQuality enum
export enum ${typeInfo.baseTypeName} {
  Low = 0,
  Medium = 1,
  High = 2
}

export type ${typeInfo.baseTypeName}Args = ${typeInfo.baseTypeName};
`
    }
  } else {
    // For interface types, define based on the specific type
    if (typeInfo.baseTypeName === 'MultisigConfig') {
      typeDefinition = `
// Define MultisigConfig interface
export interface ${typeInfo.baseTypeName} {
  requireSequentialSigning: boolean;
  allowOwnerOffCurve: boolean;
}

export type ${typeInfo.baseTypeName}Args = ${typeInfo.baseTypeName};
`
    } else {
      // Generic interface definition
      typeDefinition = `
// Define ${typeInfo.baseTypeName} interface
export interface ${typeInfo.baseTypeName} {
  // Properties defined by the IDL
  [key: string]: unknown;
}

export type ${typeInfo.baseTypeName}Args = ${typeInfo.baseTypeName};
`
    }
  }
  
  // Also need to define the encoder/decoder functions
  let encoderDecoderDefs = ''
  
  if (typeInfo.isEnum) {
    encoderDecoderDefs = `
// Define encoder/decoder for ${typeInfo.baseTypeName}
import { getEnumEncoder, getEnumDecoder } from '@solana/kit';

export function get${typeInfo.baseTypeName}Encoder(): Encoder<${typeInfo.baseTypeName}Args> {
  return getEnumEncoder(${typeInfo.baseTypeName});
}

export function get${typeInfo.baseTypeName}Decoder(): Decoder<${typeInfo.baseTypeName}> {
  return getEnumDecoder(${typeInfo.baseTypeName});
}
`
  } else {
    // For struct types
    if (typeInfo.baseTypeName === 'MultisigConfig') {
      encoderDecoderDefs = `
// Define encoder/decoder for ${typeInfo.baseTypeName}
import { getBooleanEncoder, getBooleanDecoder } from '@solana/kit';

export function get${typeInfo.baseTypeName}Encoder(): Encoder<${typeInfo.baseTypeName}Args> {
  return getStructEncoder([
    ['requireSequentialSigning', getBooleanEncoder()],
    ['allowOwnerOffCurve', getBooleanEncoder()]
  ]);
}

export function get${typeInfo.baseTypeName}Decoder(): Decoder<${typeInfo.baseTypeName}> {
  return getStructDecoder([
    ['requireSequentialSigning', getBooleanDecoder()],
    ['allowOwnerOffCurve', getBooleanDecoder()]
  ]);
}
`
    } else {
      encoderDecoderDefs = `
// Define encoder/decoder for ${typeInfo.baseTypeName}
export function get${typeInfo.baseTypeName}Encoder(): Encoder<${typeInfo.baseTypeName}Args> {
  return getStructEncoder([]);
}

export function get${typeInfo.baseTypeName}Decoder(): Decoder<${typeInfo.baseTypeName}> {
  return getStructDecoder([]);
}
`
    }
  }
  
  // Insert the type definition after the imports
  const lastImportMatch = content.match(/from ['"]@solana\/kit['"];/)
  if (lastImportMatch) {
    const lastImportIndex = content.indexOf(lastImportMatch[0]) + lastImportMatch[0].length
    const insertPoint = content.indexOf('\n', lastImportIndex) + 1
    
    // Insert type definition
    content = content.slice(0, insertPoint) + '\n' + typeDefinition + content.slice(insertPoint)
    
    // Insert encoder/decoder definitions before the Export type
    const exportTypeIndex = content.indexOf(`export type ${typeInfo.baseTypeName}Export = `)
    if (exportTypeIndex !== -1) {
      content = content.slice(0, exportTypeIndex) + encoderDecoderDefs + '\n' + content.slice(exportTypeIndex)
    }
  }
  
  fs.writeFileSync(filePath, content)
  console.log(`✓ Fixed ${typeInfo.exportFileName}`)
}

async function main() {
  console.log('🔧 Fixing circular dependencies in Export types...')
  
  for (const typeInfo of typesToFix) {
    fixExportFile(typeInfo)
  }
  
  console.log('\n✅ Circular dependencies fixed!')
}

// Run the script
main().catch(error => {
  console.error('❌ Error fixing circular dependencies:', error)
  process.exit(1)
})