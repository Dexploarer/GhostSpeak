import type { GhostSpeakConfig } from '../../types/index.js'

/**
 * Base class for all instruction modules
 */
export abstract class BaseInstructions {
  protected config: GhostSpeakConfig

  constructor(config: GhostSpeakConfig) {
    this.config = config
  }

  /**
   * Get the RPC client
   */
  protected get rpc() {
    return this.config.rpc
  }

  /**
   * Get the program ID
   */
  protected get programId() {
    return this.config.programId!
  }

  /**
   * Get the commitment level
   */
  protected get commitment() {
    return this.config.commitment || 'confirmed'
  }
}