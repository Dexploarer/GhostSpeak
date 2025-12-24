/**
 * TextEncoder polyfill for Node.js compatibility
 * Node.js has TextEncoder in the util module, but not in global scope
 */

interface GlobalWithTextEncoder {
  TextEncoder?: typeof TextEncoder
  TextDecoder?: typeof TextDecoder
}



// Check if TextEncoder is already available globally
const globalScope = globalThis as GlobalWithTextEncoder
// TextEncoder is globally available in Node.js >= 11 and modern browsers.
// This check ensures TS compliance without runtime eval risks.
if (typeof globalScope.TextEncoder === 'undefined') {
  // If we are in an environment without TextEncoder (e.g. very old browsers), 
  // you should include a dedicated polyfill instructions in README.
  // We avoid eval('require') here to prevent bundler warnings and security issues.
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