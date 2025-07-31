#!/usr/bin/env bun

const testBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32])

console.log('Test bytes:', testBytes)
console.log('Length:', testBytes.length)

const hex = Array.from(testBytes, (b) => b.toString(16).padStart(2, '0')).join('')
console.log('Hex:', hex)
console.log('Hex length:', hex.length)

// Test with empty array
const emptyBytes = new Uint8Array([])
const emptyHex = Array.from(emptyBytes, (b) => b.toString(16).padStart(2, '0')).join('')
console.log('\nEmpty bytes:', emptyBytes)
console.log('Empty hex:', emptyHex)
console.log('Empty hex length:', emptyHex.length)