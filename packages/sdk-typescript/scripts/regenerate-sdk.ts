#!/usr/bin/env bun
import { createFromRoot } from '@codama/nodes-from-anchor'
import { renderJavaScriptVisitor } from '@codama/renderers-js'
import { writeFile, readFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function regenerateSDK() {
  console.log('🔄 Regenerating TypeScript SDK from IDL...')
  
  try {
    // Read the IDL
    const idlPath = join(__dirname, '..', '..', '..', 'target', 'idl', 'ghostspeak_marketplace.json')
    const idlContent = await readFile(idlPath, 'utf-8')
    const idl = JSON.parse(idlContent)
    
    console.log('✅ IDL loaded successfully')
    console.log(`📋 Program ID: ${idl.address || idl.metadata?.address}`)
    
    // Create root node from IDL
    const root = createFromRoot(idl)
    
    // Configure the JavaScript renderer
    const jsVisitor = renderJavaScriptVisitor({
      formatCode: true,
      renderImports: true,
      dependencyMap: {
        '@solana/web3.js': '@solana/kit',
        '@solana-program': '@solana/kit'
      }
    })
    
    // Generate the code
    const files = jsVisitor.visit(root)
    
    // Write generated files
    const outDir = join(__dirname, '..', 'src', 'generated')
    
    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = join(outDir, filePath)
      await mkdir(dirname(fullPath), { recursive: true })
      await writeFile(fullPath, content as string)
      console.log(`📝 Generated: ${filePath}`)
    }
    
    console.log('✨ SDK regeneration complete!')
    
  } catch (error) {
    console.error('❌ Error regenerating SDK:', error)
    process.exit(1)
  }
}

regenerateSDK()