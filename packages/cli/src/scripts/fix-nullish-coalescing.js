#!/usr/bin/env node

/**
 * Script to systematically replace || with ?? where appropriate
 * for TypeScript nullish coalescing operator preference
 */

import { readFileSync, writeFileSync } from 'fs'
import { glob } from 'glob'

const files = glob.sync('packages/cli/src/commands/*.ts')

const patterns = [
  // Common patterns where || should be ??
  { from: / \|\| 'unknown'/, to: " ?? 'unknown'" },
  { from: / \|\| 'Not set'/, to: " ?? 'Not set'" },
  { from: / \|\| 'None'/, to: " ?? 'None'" },
  { from: / \|\| 'N\/A'/, to: " ?? 'N/A'" },
  { from: / \|\| ''/, to: " ?? ''" },
  { from: / \|\| undefined/, to: " ?? undefined" },
  { from: / \|\| null/, to: " ?? null" },
  { from: / \|\| 0/, to: " ?? 0" },
  { from: / \|\| 1/, to: " ?? 1" },
  { from: / \|\| \[\]/, to: " ?? []" },
  { from: / \|\| \{\}/, to: " ?? {}" },
  // Service endpoints and URLs
  { from: / \|\| 'https:\/\//, to: " ?? 'https://" },
  // Default messages and descriptions
  { from: / \|\| 'Unknown error'/, to: " ?? 'Unknown error'" },
  { from: / \|\| 'Untitled'/, to: " ?? 'Untitled'" },
  { from: / \|\| 'No description'/, to: " ?? 'No description'" },
  // Network and config defaults
  { from: / \|\| 'devnet'/, to: " ?? 'devnet'" },
  { from: / \|\| config\./, to: " ?? config." },
  // Agent and marketplace defaults
  { from: / \|\| agent\./, to: " ?? agent." },
  { from: / \|\| service\./, to: " ?? service." },
  { from: / \|\| order\./, to: " ?? order." },
  { from: / \|\| dispute\./, to: " ?? dispute." },
]

console.log('🔧 Fixing nullish coalescing operators in CLI commands...')

let totalReplacements = 0

for (const file of files) {
  console.log(`Processing ${file}...`)
  let content = readFileSync(file, 'utf-8')
  let fileReplacements = 0
  
  for (const pattern of patterns) {
    const matches = content.match(pattern.from)
    if (matches) {
      content = content.replace(pattern.from, pattern.to)
      fileReplacements += matches.length
    }
  }
  
  if (fileReplacements > 0) {
    writeFileSync(file, content)
    console.log(`  ✅ ${fileReplacements} replacements in ${file}`)
    totalReplacements += fileReplacements
  }
}

console.log(`\n🎉 Total replacements: ${totalReplacements}`)
console.log('✨ Nullish coalescing operators fixed!')