#!/usr/bin/env bun

import { readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'

async function fixVitestMocks() {
  console.log('Fixing test files to use Vitest instead of Jest...')
  
  const testDirs = ['tests/unit', 'tests/integration', 'tests/e2e']
  
  for (const dir of testDirs) {
    try {
      const files = await readdir(join(process.cwd(), dir))
      const testFiles = files.filter(f => f.endsWith('.test.ts'))
      
      for (const file of testFiles) {
        const filePath = join(process.cwd(), dir, file)
        let content = await readFile(filePath, 'utf-8')
        
        // Skip if already using vitest
        if (content.includes("from 'vitest'")) {
          continue
        }
        
        // Replace Jest imports with Vitest
        content = content.replace(
          /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@jest\/globals['"]/g,
          (match, imports) => {
            // Parse the imports and replace jest with vi
            const vitestImports = imports
              .split(',')
              .map((imp: string) => imp.trim())
              .map((imp: string) => imp === 'jest' ? 'vi' : imp)
              .join(', ')
            return `import { ${vitestImports} } from 'vitest'`
          }
        )
        
        // Replace jest.mock with vi.mock
        content = content.replace(/jest\.mock\(/g, 'vi.mock(')
        
        // Replace jest.fn() with vi.fn()
        content = content.replace(/jest\.fn\(\)/g, 'vi.fn()')
        
        // Replace jest.spyOn with vi.spyOn
        content = content.replace(/jest\.spyOn\(/g, 'vi.spyOn(')
        
        // Replace jest.Mock with vi.Mock
        content = content.replace(/jest\.Mock/g, 'vi.Mock')
        
        // Replace jest.clearAllMocks with vi.clearAllMocks
        content = content.replace(/jest\.clearAllMocks\(\)/g, 'vi.clearAllMocks()')
        
        // Replace jest.resetAllMocks with vi.resetAllMocks
        content = content.replace(/jest\.resetAllMocks\(\)/g, 'vi.resetAllMocks()')
        
        // Replace jest.restoreAllMocks with vi.restoreAllMocks
        content = content.replace(/jest\.restoreAllMocks\(\)/g, 'vi.restoreAllMocks()')
        
        // Replace jest.useFakeTimers with vi.useFakeTimers
        content = content.replace(/jest\.useFakeTimers\(\)/g, 'vi.useFakeTimers()')
        
        // Replace jest.useRealTimers with vi.useRealTimers
        content = content.replace(/jest\.useRealTimers\(\)/g, 'vi.useRealTimers()')
        
        // Replace jest.advanceTimersByTime with vi.advanceTimersByTime
        content = content.replace(/jest\.advanceTimersByTime\(/g, 'vi.advanceTimersByTime(')
        
        // Replace jest.Mocked with Mocked from vitest
        content = content.replace(/: jest\.Mocked<([^>]+)>/g, ': Mocked<$1>')
        
        // Add Mocked import if needed
        if (content.includes(': Mocked<') && !content.includes('type Mocked')) {
          content = content.replace(
            /import\s*{\s*([^}]+)\s*}\s*from\s*['"]vitest['"]/,
            (match, imports) => {
              const importList = imports.split(',').map((i: string) => i.trim())
              if (!importList.includes('type Mocked')) {
                importList.push('type Mocked')
              }
              return `import { ${importList.join(', ')} } from 'vitest'`
            }
          )
        }
        
        await writeFile(filePath, content)
        console.log(`✅ Fixed ${file}`)
      }
    } catch (error) {
      console.error(`Error processing ${dir}:`, error)
    }
  }
}

fixVitestMocks().catch(console.error)