#!/usr/bin/env tsx

import { createFromRoot } from '@codama/nodes'
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
    
    // Use the basic root node for now to avoid visitor complexity
    const enhancedRoot = rootNode
    
    // Configure the JavaScript renderer for @solana/kit (web3.js v2) compatibility
    const outDir = path.join(__dirname, '..', 'src', 'generated')
    console.log(`Generating client in: ${outDir}`)
    
    const jsVisitor = renderJavaScriptVisitor(outDir, {
      // Use @solana/kit imports instead of @solana/web3.js
      importMap: {
        '@solana/web3.js': '@solana/kit',
        // Map other imports to new packages
        addresses: '@solana/addresses',
        instructions: '@solana/instructions',
        programs: '@solana/programs',
        rpc: '@solana/rpc',
        signers: '@solana/signers',
        transactions: '@solana/transactions',
        accounts: '@solana/accounts'
      },
      // Use the new instruction data format
      instructionDataStrategy: 'byteArray',
      // Don't flatten structs to avoid conflicts
      flattenInstructionArguments: false,
      // Generate PDAs for all accounts that need them
      pdaLinkOverrides: {},
      // Use tree-shakeable exports
      exportMode: 'named',
      // Generate comprehensive type exports
      typeDeclarations: true,
      // Use proper async/await patterns - must be array
      asyncResolvers: [],
      // Force generation of all types including nested ones
      includeInternalTypes: true,
      // Generate all type exports
      renderDefinedTypesVisitor: true
    })
    
    // Generate the client
    visit(enhancedRoot, jsVisitor)
    
    console.log('✅ TypeScript client generated successfully!')
    console.log('📁 Generated files in:', outDir)
    console.log('🚀 You can now import from "@ghostspeak/sdk/generated"')
    
    // Run the patch script to add missing types
    console.log('\n🔧 Running patch for missing types...')
    const { execSync } = await import('child_process')
    try {
      execSync('tsx scripts/patch-missing-types.ts', { 
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit' 
      })
    } catch (patchError) {
      console.error('⚠️  Warning: Failed to patch missing types:', patchError)
      // Don't fail the whole generation if patch fails
    }
    
  } catch (error) {
    console.error('❌ Error generating client:', error)
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack)
    }
    process.exit(1)
  }
}

generateClient()