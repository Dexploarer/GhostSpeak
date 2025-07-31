/**
 * TextEncoder polyfill for Node.js compatibility
 * Node.js has TextEncoder in the util module, but not in global scope
 */

interface GlobalWithTextEncoder {
  TextEncoder?: typeof TextEncoder
  TextDecoder?: typeof TextDecoder
}

interface NodeUtil {
  TextEncoder: typeof TextEncoder
  TextDecoder: typeof TextDecoder
}

// Check if TextEncoder is already available globally
const globalScope = globalThis as GlobalWithTextEncoder
if (typeof globalScope.TextEncoder === 'undefined') {
  // In Node.js environment, try to use util module  
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (typeof process !== 'undefined' && process.versions?.node) {
    try {
      // Dynamic import for Node.js util module using typed interface
      const requireFn = eval('require') as (module: string) => NodeUtil
      const util = requireFn('util')
      globalScope.TextEncoder = util.TextEncoder
      globalScope.TextDecoder = util.TextDecoder
    } catch {
      // Ignore errors - TextEncoder might not be needed or available elsewhere
    }
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