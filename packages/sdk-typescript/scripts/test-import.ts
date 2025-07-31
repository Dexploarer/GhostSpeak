#!/usr/bin/env bun

console.log('Testing SDK import...')

async function testImport() {
  try {
    console.log('Importing main index...')
    const sdk = await import('../dist/index.js')
    console.log('✅ SDK imported successfully')
    console.log('Available exports:', Object.keys(sdk).join(', '))
  } catch (error) {
    console.error('❌ Import failed:', error)
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack)
    }
  }
}

testImport()