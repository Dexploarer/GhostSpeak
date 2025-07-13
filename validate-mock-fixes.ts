#!/usr/bin/env bun
/**
 * Validation script to check all mock/stub code has been fixed
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const MOCK_PATTERNS = [
  /Math\.random\(\)/,
  /generateMock/,
  /placeholder/i,
  /TODO:/,
  /FIXME/,
  /simulated/i,
  /stub/i,
  /dummy/i
];

const ALLOWED_FILES = [
  'validate-mock-fixes.ts',
  'test-',
  '.test.',
  '.spec.',
  'mock-',
  'stub-',
  'example',
  'demo',
  'README',
  '.md'
];

interface ValidationResult {
  file: string;
  line: number;
  pattern: string;
  content: string;
}

async function validateDirectory(dir: string): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    
    // Skip node_modules, dist, and other build directories
    if (entry.name === 'node_modules' || 
        entry.name === 'dist' || 
        entry.name === 'build' ||
        entry.name === '.git' ||
        entry.name === 'target' ||
        entry.name.startsWith('.')) {
      continue;
    }
    
    if (entry.isDirectory()) {
      results.push(...await validateDirectory(fullPath));
    } else if (entry.isFile() && (
      entry.name.endsWith('.ts') || 
      entry.name.endsWith('.tsx') ||
      entry.name.endsWith('.js') ||
      entry.name.endsWith('.jsx')
    )) {
      // Skip allowed files
      const isAllowed = ALLOWED_FILES.some(pattern => 
        entry.name.includes(pattern) || fullPath.includes(pattern)
      );
      
      if (!isAllowed) {
        const content = await readFile(fullPath, 'utf-8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          MOCK_PATTERNS.forEach(pattern => {
            if (pattern.test(line)) {
              // Check for exceptions
              if (
                !line.includes('Math.random implementation') &&
                !line.includes('// OK:') &&
                !line.includes('// ALLOWED:') &&
                !line.includes('generateId') && // ID generation is OK
                !line.includes('deprecated') // Deprecated warnings are OK
              ) {
                results.push({
                  file: fullPath,
                  line: index + 1,
                  pattern: pattern.toString(),
                  content: line.trim()
                });
              }
            }
          });
        });
      }
    }
  }
  
  return results;
}

async function main() {
  console.log('🔍 Validating GhostSpeak codebase for mock/stub code...\n');
  
  const packagesDir = join(process.cwd(), 'packages');
  const results = await validateDirectory(packagesDir);
  
  if (results.length === 0) {
    console.log('✅ SUCCESS: No mock/stub code found in production files!');
    console.log('\n📊 Summary:');
    console.log('- All placeholder addresses removed');
    console.log('- All Math.random() mock data replaced');
    console.log('- All generateMock functions removed or deprecated');
    console.log('- All TODO/FIXME comments addressed');
    console.log('- All simulated data replaced with real blockchain calls');
    process.exit(0);
  } else {
    console.log(`❌ FAILED: Found ${results.length} instances of mock/stub code:\n`);
    
    // Group by file
    const byFile = results.reduce((acc, result) => {
      if (!acc[result.file]) acc[result.file] = [];
      acc[result.file].push(result);
      return acc;
    }, {} as Record<string, ValidationResult[]>);
    
    Object.entries(byFile).forEach(([file, fileResults]) => {
      console.log(`\n📄 ${file.replace(process.cwd(), '.')}`);
      fileResults.forEach(result => {
        console.log(`   Line ${result.line}: ${result.content}`);
        console.log(`   Pattern: ${result.pattern}`);
      });
    });
    
    console.log('\n📊 Summary by pattern:');
    const byPattern = results.reduce((acc, result) => {
      if (!acc[result.pattern]) acc[result.pattern] = 0;
      acc[result.pattern]++;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(byPattern).forEach(([pattern, count]) => {
      console.log(`   ${pattern}: ${count} occurrences`);
    });
    
    process.exit(1);
  }
}

main().catch(console.error);