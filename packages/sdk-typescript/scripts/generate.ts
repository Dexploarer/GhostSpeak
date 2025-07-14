#!/usr/bin/env tsx

import { rootNodeFromAnchor } from '@codama/nodes-from-anchor'
import { renderVisitor } from '@codama/renderers-js'
import { visit } from '@codama/visitors'
import path from 'path'
import { readFileSync } from 'fs'

async function generateClient() {
  try {
    // Load the IDL file
    const idlPath = path.join('..', '..', 'target', 'idl', 'ghostspeak_marketplace.json')
    console.log(`Loading IDL from: ${idlPath}`)
    
    const idl = JSON.parse(readFileSync(idlPath, 'utf8'))
    console.log(`Loaded IDL for program: ${idl.metadata.name}`)
    
    // Create the root node from the Anchor IDL
    const rootNode = rootNodeFromAnchor(idl)
    
    // Configure the JavaScript renderer
    const outDir = path.join('src', 'generated')
    console.log(`Generating client in: ${outDir}`)
    
    const visitor = renderVisitor(outDir, {
      linkOverrides: {},
      dependencyMap: {},
      customInstructionDataType: 'args'
    })
    
    // Generate the client
    visit(rootNode, visitor)
    
    console.log('✅ TypeScript client generated successfully!')
    
  } catch (error) {
    console.error('❌ Error generating client:', error)
    process.exit(1)
  }
}

generateClient()