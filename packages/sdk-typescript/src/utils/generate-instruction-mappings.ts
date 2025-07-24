#!/usr/bin/env node

/**
 * Script to generate comprehensive instruction mappings from the IDL
 */

import { parseIdlInstructions, exportInstructionMappings, getCommonInstructions } from './instruction-account-mapper';
import * as fs from 'fs';
import * as path from 'path';

function main() {
  try {
    console.log('🔍 Parsing GhostSpeak IDL...');
    
    // Parse all instructions
    const allMappings = parseIdlInstructions();
    const instructionNames = Object.keys(allMappings);
    
    console.log(`📋 Found ${instructionNames.length} instructions:`);
    instructionNames.forEach(name => {
      const mapping = allMappings[name];
      console.log(`  • ${name}: ${mapping.expectedAccounts} accounts`);
    });
    
    console.log('\n🎯 Common Instructions Analysis:');
    const commonMappings = getCommonInstructions();
    Object.entries(commonMappings).forEach(([name, mapping]) => {
      console.log(`\n📝 ${name}:`);
      console.log(`   Expected accounts: ${mapping.expectedAccounts}`);
      mapping.accounts.forEach((account, idx) => {
        const props = [];
        if (account.writable) props.push('writable');
        if (account.signer) props.push('signer');
        if (account.optional) props.push('optional');
        const propStr = props.length > 0 ? ` (${props.join(', ')})` : '';
        console.log(`   ${idx + 1}. ${account.name}${propStr}`);
      });
      if (mapping.docs && mapping.docs.length > 0) {
        console.log(`   Description: ${mapping.docs.join(' ')}`);
      }
    });
    
    // Export to JSON files
    console.log('\n💾 Exporting mappings...');
    exportInstructionMappings();
    
    // Export commonly used instructions separately
    const commonMappingsPath = path.join(__dirname, '../../../../../common-instruction-mappings.json');
    fs.writeFileSync(commonMappingsPath, JSON.stringify(commonMappings, null, 2));
    console.log(`Common instruction mappings exported to: ${commonMappingsPath}`);
    
    console.log('\n✅ Instruction mappings generated successfully!');
    
  } catch (error) {
    console.error('❌ Error generating instruction mappings:', error);
    process.exit(1);
  }
}

// Check if this script is being run directly
// eslint-disable-next-line no-undef
if (require.main === module) {
  main();
}

export { main };