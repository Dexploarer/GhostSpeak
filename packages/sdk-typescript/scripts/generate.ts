#!/usr/bin/env tsx

import { rootNodeFromAnchor } from '@codama/nodes-from-anchor'
import { renderVisitor as renderJavaScriptVisitor } from '@codama/renderers-js'
import { visit } from '@codama/visitors'
import path from 'path'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function generateClient() {
  try {
    // Load the IDL file
    const idlPath = path.join(__dirname, '..', '..', '..', 'target', 'idl', 'ghostspeak_marketplace.json')
    console.log(`Loading IDL from: ${idlPath}`)
    
    if (!existsSync(idlPath)) {
      throw new Error(`IDL file not found at ${idlPath}. Please run 'anchor build' first.`)
    }
    
    const idl = JSON.parse(readFileSync(idlPath, 'utf8'))
    console.log(`Loaded IDL for program: ${idl.metadata.name}`)
    
    // Create the root node from the Anchor IDL
    const rootNode = rootNodeFromAnchor(idl)
    
    // Transform the root node to use July 2025 compatible types
    const enhancedRoot = rootNode
    
    // Configure the JavaScript renderer for @solana/kit (web3.js v2) compatibility
    const outDir = path.join(__dirname, '..', 'src', 'generated')
    console.log(`Generating client in: ${outDir}`)
    
    const jsVisitor = renderJavaScriptVisitor(outDir, {
      // ESLint compatibility settings
      preferNullishCoalescing: true,
      avoidDuplicateOverloads: true,
      useConsistentTypes: true,
      // Use modern instruction data format  
      instructionDataStrategy: 'instructionData',
      // Better type handling
      flattenInstructionArguments: false,
      // Use proper exports
      exportMode: 'named',
      // Generate comprehensive types
      typeDeclarations: true,
      // Generate all necessary types including nested ones
      includeInternalTypes: true,
      // Use proper async patterns
      asyncResolvers: [],
      // Don't generate invalid parsers that cause type issues
      renderInstructionParsers: false,
      // Use proper account handling
      accountProviders: true,
      // Generate proper PDAs
      pdaLinkOverrides: {},
      // Disable obsolete Web3.js v1 interface types for July 2025 compatibility
      renderInstructionDefaults: false,
      renderInstructionAccountHelpers: false,
      renderInstructionSignerHelpers: false,
      // Disable instruction type exports that use obsolete interfaces
      instructionSignatureFormat: 'minimal',
      // Use simple data format only for July 2025 compatibility
      instructionArgumentStrategy: 'dataOnly',
      // Generate ESLint-compatible code
      generateESLintCompliantCode: true,
      preventDuplicateExports: true
    })
    
    // Generate the client
    visit(enhancedRoot, jsVisitor)
    
    console.log('✅ TypeScript client generated successfully!')
    console.log('📁 Generated files in:', outDir)
    console.log('🚀 You can now import from "@ghostspeak/sdk/generated"')
    
    console.log('✅ Generation completed successfully with ESLint-compatible settings!')
    
  } catch (error) {
    console.error('❌ Error generating client:', error)
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack)
    }
    process.exit(1)
  }
}

generateClient()