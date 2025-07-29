#!/usr/bin/env tsx

/**
 * Bundle Analysis Script
 * 
 * Analyzes the GhostSpeak SDK bundle size and tree-shaking effectiveness.
 */

import fs from 'fs'
import path from 'path'
import { gzipSync } from 'zlib'

interface BundleStats {
  name: string
  size: number
  gzipSize: number
  path: string
}

interface AnalysisResult {
  total: BundleStats
  bundles: BundleStats[]
  treeShakeableImports: string[]
  recommendations: string[]
}

async function analyzeBundles(): Promise<AnalysisResult> {
  const distDir = path.join(process.cwd(), 'dist')
  
  if (!fs.existsSync(distDir)) {
    console.error('❌ No dist directory found. Run `bun run build` first.')
    process.exit(1)
  }

  const bundles: BundleStats[] = []
  let totalSize = 0
  let totalGzipSize = 0

  // Analyze main bundles
  const mainFiles = ['index.js', 'client.js', 'types.js', 'errors.js', 'crypto.js', 'utils.js']
  
  for (const file of mainFiles) {
    const filePath = path.join(distDir, file)
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath)
      const size = content.length
      const gzipSize = gzipSync(content).length
      
      bundles.push({
        name: file,
        size,
        gzipSize,
        path: filePath
      })
      
      totalSize += size
      totalGzipSize += gzipSize
    }
  }

  // Analyze minimal bundle
  const minimalPath = path.join(distDir, 'minimal', 'core-minimal.js')
  if (fs.existsSync(minimalPath)) {
    const content = fs.readFileSync(minimalPath)
    const size = content.length
    const gzipSize = gzipSync(content).length
    
    bundles.push({
      name: 'minimal/core-minimal.js',
      size,
      gzipSize, 
      path: minimalPath
    })
  }

  // Tree-shakeable import examples
  const treeShakeableImports = [
    "import GhostSpeak from '@ghostspeak/sdk'",
    "import { GhostSpeakClient } from '@ghostspeak/sdk'", 
    "import { sol } from '@ghostspeak/sdk'",
    "import GhostSpeak from '@ghostspeak/sdk/minimal'",
    "import { encrypt, decrypt } from '@ghostspeak/sdk/crypto'",
    "import { deriveAgentPda } from '@ghostspeak/sdk/utils'",
    "import type { Agent, Escrow } from '@ghostspeak/sdk/types'"
  ]

  // Generate recommendations
  const recommendations = [
    "Use '@ghostspeak/sdk/minimal' for basic usage (smallest bundle)",
    "Import specific functions: import { encrypt } from '@ghostspeak/sdk/crypto'",
    "Import types separately: import type { Agent } from '@ghostspeak/sdk/types'",
    "Avoid wildcard imports: import * from '@ghostspeak/sdk' (increases bundle size)",
    "Use dynamic imports for rarely used features: const { zkProofs } = await import('@ghostspeak/sdk/crypto')",
    "Consider code splitting at the application level for large apps"
  ]

  return {
    total: {
      name: 'Total SDK',
      size: totalSize,
      gzipSize: totalGzipSize,
      path: distDir
    },
    bundles,
    treeShakeableImports,
    recommendations
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function printAnalysis(result: AnalysisResult): void {
  console.log('📦 GhostSpeak SDK Bundle Analysis')
  console.log('════════════════════════════════════')
  
  console.log('\n📊 Bundle Sizes:')
  console.log('┌─────────────────────────┬──────────────┬──────────────┐')
  console.log('│ Bundle                  │ Raw Size     │ Gzipped      │')
  console.log('├─────────────────────────┼──────────────┼──────────────┤')
  
  result.bundles.forEach(bundle => {
    const name = bundle.name.padEnd(23)
    const size = formatBytes(bundle.size).padStart(12)
    const gzipSize = formatBytes(bundle.gzipSize).padStart(12)
    console.log(`│ ${name} │ ${size} │ ${gzipSize} │`)
  })
  
  console.log('└─────────────────────────┴──────────────┴──────────────┘')
  
  const totalSize = formatBytes(result.total.size).padStart(12)
  const totalGzipSize = formatBytes(result.total.gzipSize).padStart(12)
  console.log(`  Total:                     ${totalSize}   ${totalGzipSize}`)

  console.log('\n🌳 Tree-shakeable Import Examples:')
  result.treeShakeableImports.forEach((example, i) => {
    console.log(`   ${i + 1}. ${example}`)
  })

  console.log('\n💡 Bundle Optimization Recommendations:')
  result.recommendations.forEach((rec, i) => {
    console.log(`   ${i + 1}. ${rec}`)
  })

  // Bundle size warnings
  console.log('\n⚠️  Bundle Size Analysis:')
  const mainBundle = result.bundles.find(b => b.name === 'index.js')
  const minimalBundle = result.bundles.find(b => b.name === 'minimal/core-minimal.js')
  
  if (mainBundle) {
    const mainGzipKB = mainBundle.gzipSize / 1024
    console.log(`   📦 Main bundle: ${formatBytes(mainBundle.gzipSize)} gzipped`)
    
    if (mainGzipKB > 100) {
      console.log('   🚨 WARNING: Main bundle is quite large (>100KB)')
      console.log('      Consider using the minimal bundle or selective imports')
    } else if (mainGzipKB > 50) {
      console.log('   ⚠️  Main bundle is moderately sized (>50KB)')
      console.log('      Tree-shaking is recommended for production')
    } else {
      console.log('   ✅ Main bundle size is reasonable')
    }
  }
  
  if (minimalBundle) {
    const minimalGzipKB = minimalBundle.gzipSize / 1024
    console.log(`   📱 Minimal bundle: ${formatBytes(minimalBundle.gzipSize)} gzipped`)
    
    if (minimalGzipKB < 10) {
      console.log('   ✅ Minimal bundle is very lightweight (<10KB)')
    } else if (minimalGzipKB < 25) {
      console.log('   ✅ Minimal bundle is lightweight (<25KB)')
    } else {
      console.log('   ⚠️  Minimal bundle could be smaller')
    }
  }

  console.log('\n✨ Analysis complete!')
}

async function main(): void {
  try {
    console.log('🔍 Analyzing GhostSpeak SDK bundles...\n')
    
    const result = await analyzeBundles()
    printAnalysis(result)
    
    // Save analysis to file
    const analysisPath = path.join(process.cwd(), 'bundle-analysis.json')
    fs.writeFileSync(analysisPath, JSON.stringify(result, null, 2))
    console.log(`\n📄 Detailed analysis saved to: ${analysisPath}`)
    
  } catch (error) {
    console.error('❌ Bundle analysis failed:', error)
    process.exit(1)
  }
}

main()