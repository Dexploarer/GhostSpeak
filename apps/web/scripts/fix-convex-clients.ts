/**
 * Script to fix Convex client initialization in all API routes
 *
 * Replaces module-level ConvexHttpClient instantiation with lazy getConvexClient() calls
 * to prevent build-time errors when NEXT_PUBLIC_CONVEX_URL is not available.
 */

import { readFileSync, writeFileSync } from 'fs'
import { glob } from 'glob'

const files = [
  'app/api/v1/health/route.ts',
  'app/api/v1/discovery/route.ts',
  'app/api/v1/discovery/stats/route.ts',
  'app/api/v1/api-keys/route.ts',
  'app/api/v1/agent/validate/route.ts',
  'app/api/v1/agent/register/route.ts',
  'app/api/v1/agent/claim/route.ts',
  'app/api/v1/x402/query/route.ts',
  'app/api/v1/stats/route.ts',
  'app/api/v1/billing/deposit/route.ts',
  'app/api/v1/billing/balance/route.ts',
  'app/api/v1/billing/usage/route.ts',
  'app/api/agent/chat/route.ts',
  'app/api/telegram/webhook/route.ts',
  'app/api/x402/[...path]/route.ts',
]

let fixedCount = 0
let skippedCount = 0

for (const file of files) {
  const path = `/Users/home/projects/GhostSpeak/apps/web/${file}`

  try {
    let content = readFileSync(path, 'utf-8')
    let modified = false

    // Check if already using getConvexClient
    if (content.includes('getConvexClient')) {
      console.log(`⏭️  Skipping ${file} (already fixed)`)
      skippedCount++
      continue
    }

    // Replace import
    if (content.includes("import { ConvexHttpClient } from 'convex/browser'")) {
      content = content.replace(
        /import { ConvexHttpClient } from 'convex\/browser'/g,
        ""
      )
      modified = true
    }

    // Remove module-level instantiation
    if (content.includes('const convex = new ConvexHttpClient')) {
      content = content.replace(
        /const convex = new ConvexHttpClient\(process\.env\.NEXT_PUBLIC_CONVEX_URL!\)/g,
        ""
      )
      modified = true
    }

    // Add import for getConvexClient if not present
    if (!content.includes("from '@/lib/convex-client'")) {
      // Find the last import statement
      const importMatches = Array.from(content.matchAll(/^import .+ from .+$/gm))
      if (importMatches.length > 0) {
        const lastImport = importMatches[importMatches.length - 1]
        const insertIndex = lastImport.index! + lastImport[0].length
        content =
          content.slice(0, insertIndex) +
          "\nimport { getConvexClient } from '@/lib/convex-client'" +
          content.slice(insertIndex)
        modified = true
      }
    }

    // Replace all convex. usages with getConvexClient().
    // But be smart - only in function bodies, not in variable names
    content = content.replace(
      /(\s+)(convex\.(query|mutation|action))/g,
      '$1getConvexClient().$2'
    )

    // Add const convex = getConvexClient() at start of each handler function if needed
    const handlerPattern = /(export async function (GET|POST|PUT|DELETE|PATCH|OPTIONS)\([^)]*\)\s*{)/g
    const matches = Array.from(content.matchAll(handlerPattern))

    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i]
      const insertIndex = match.index! + match[0].length

      // Check if there's already a getConvexClient() call in this function
      const functionStart = insertIndex
      const nextFunctionMatch = matches[i + 1]
      const functionEnd = nextFunctionMatch ? nextFunctionMatch.index! : content.length
      const functionBody = content.slice(functionStart, functionEnd)

      if (functionBody.includes('getConvexClient()') && !functionBody.trim().startsWith('const convex = getConvexClient()')) {
        content =
          content.slice(0, insertIndex) +
          '\n  const convex = getConvexClient()' +
          content.slice(insertIndex)
        modified = true
      }
    }

    // Clean up multiple empty lines
    content = content.replace(/\n\n\n+/g, '\n\n')

    if (modified) {
      writeFileSync(path, content, 'utf-8')
      console.log(`✅ Fixed ${file}`)
      fixedCount++
    } else {
      console.log(`⚠️  No changes needed for ${file}`)
      skippedCount++
    }
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error)
  }
}

console.log(`\n📊 Summary:`)
console.log(`   ✅ Fixed: ${fixedCount}`)
console.log(`   ⏭️  Skipped: ${skippedCount}`)
console.log(`   📁 Total: ${files.length}`)
