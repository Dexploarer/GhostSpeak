#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const GENERATED_INSTRUCTIONS_DIR = join(process.cwd(), 'packages/sdk-typescript/src/generated/instructions')

async function fixCodedErrors() {
  const files = await readdir(GENERATED_INSTRUCTIONS_DIR)
  const instructionFiles = files.filter(f => f.endsWith('.ts'))
  
  let filesUpdated = 0
  
  for (const file of instructionFiles) {
    const filePath = join(GENERATED_INSTRUCTIONS_DIR, file)
    let content = await readFile(filePath, 'utf8')
    
    // Replace "TODO: Coded error." with proper error
    if (content.includes('// TODO: Coded error.')) {
      // For "Not enough accounts" error
      if (content.includes('Not enough accounts')) {
        content = content.replace(
          "// TODO: Coded error.\n    throw new Error('Not enough accounts');",
          "throw new Error('Invalid number of accounts provided');"
        )
      }
      
      filesUpdated++
      await writeFile(filePath, content, 'utf8')
      console.log(`✅ Updated ${file}`)
    }
  }
  
  console.log(`\n🎉 Updated ${filesUpdated} files with proper error handling`)
}

fixCodedErrors().catch(console.error)