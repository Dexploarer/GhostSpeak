/**
 * pino-pretty noop module
 * 
 * This is a stub for pino-pretty which is an optional dependency of pino
 * used by WalletConnect's logger. We don't need pretty printing in production,
 * and the module causes issues with webpack bundling.
 * 
 * This noop module satisfies the import without including the actual package.
 */

// Export a function that returns a passthrough transform
module.exports = function pinoPretty() {
  // Return a passthrough that does nothing
  const { Transform } = require('stream')
  return new Transform({
    transform(chunk, encoding, callback) {
      callback(null, chunk)
    }
  })
}

// Also export as default for ESM compatibility
module.exports.default = module.exports
