#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'fs'
import { glob } from 'glob'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('🔧 Post-processing lint fixes...')

// Fix remaining lint issues in core files
const fixes = [
  // Fix unused variables in account-creation.ts
  {
    file: 'src/utils/account-creation.ts',
    replacements: [
      { from: '_agentType: number,', to: '/* _agentType: number,*/' },
      { from: '_metadataUri: string', to: '/* _metadataUri: string*/' }
    ]
  },
  
  // Fix unused variables in compliance-helpers.ts
  {
    file: 'src/utils/compliance-helpers.ts',
    replacements: [
      { from: '_reportType: ReportType,', to: '/* _reportType: ReportType,*/' },
      { from: '_data: ComplianceData', to: '/* _data: ComplianceData*/' },
      { from: 'private static generateReportSignature(_reportType: ReportType, _data: unknown): Uint8Array {', to: 'private static generateReportSignature(/* _reportType: ReportType, _data: unknown*/): Uint8Array {' }
    ]
  },
  
  // Fix unsafe assignments in GovernanceInstructions.ts
  {
    file: 'src/client/instructions/GovernanceInstructions.ts',
    replacements: [
      { from: 'const multisig = result.value.data as unknown as Multisig', to: 'const multisig = result.value.data as Multisig' },
      { from: 'const proposal = result.value.data as unknown as GovernanceProposal', to: 'const proposal = result.value.data as GovernanceProposal' },
      { from: 'const rbac = result.value.data as unknown as RbacConfig', to: 'const rbac = result.value.data as RbacConfig' },
      { from: 'config: params.config', to: 'config: params.config as Record<string, unknown>' }
    ]
  }
]

for (const fix of fixes) {
  const filePath = path.join(__dirname, '..', fix.file)
  try {
    let content = readFileSync(filePath, 'utf8')
    
    for (const replacement of fix.replacements) {
      content = content.replace(replacement.from, replacement.to)
    }
    
    writeFileSync(filePath, content, 'utf8')
    console.log(`✅ Fixed ${fix.file}`)
  } catch (error) {
    console.warn(`⚠️  Warning: Could not fix ${fix.file}:`, error)
  }
}

console.log('✅ Post-processing completed!')