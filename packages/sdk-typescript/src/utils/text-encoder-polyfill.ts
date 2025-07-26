/**
 * TextEncoder polyfill for Node.js compatibility
 * Node.js has TextEncoder in the util module, but not in global scope
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const globalThis: any

// Check if TextEncoder is already available globally
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
if (typeof globalThis.TextEncoder === 'undefined') {
  // In Node.js environment, import from util
  if (typeof process !== 'undefined' && process.versions?.node) {
    // Use require for synchronous loading in Node.js
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, no-undef
    const util = require('util')
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    globalThis.TextEncoder = util.TextEncoder
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    globalThis.TextDecoder = util.TextDecoder
  }
}

// Export for explicit usage
export const getTextEncoder = (): typeof TextEncoder => {
  if (typeof TextEncoder !== 'undefined') {
    return TextEncoder
  }
  
  // Fallback for environments without TextEncoder
  throw new Error('TextEncoder is not available in this environment')
}

export const getTextDecoder = (): typeof TextDecoder => {
  if (typeof TextDecoder !== 'undefined') {
    return TextDecoder
  }
  
  // Fallback for environments without TextDecoder  
  throw new Error('TextDecoder is not available in this environment')
}