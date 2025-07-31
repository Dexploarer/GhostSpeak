#!/usr/bin/env bun

import { bytesToHex } from '@noble/hashes/utils'

console.log('Testing bytesToHex...')

const testBytes = new Uint8Array([1, 2, 3, 4, 5])
console.log('Test bytes:', testBytes)
console.log('Is Uint8Array?', testBytes instanceof Uint8Array)
console.log('Constructor name:', testBytes.constructor.name)

try {
  const hex = bytesToHex(testBytes)
  console.log('Hex:', hex)
} catch (error) {
  console.error('Error:', error)
}