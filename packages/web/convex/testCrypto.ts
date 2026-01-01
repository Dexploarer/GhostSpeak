/**
 * Test crypto operations in Convex
 * Isolate where the crypto error happens
 */

import { action } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'

export const testLoadKeypairs = action({
  args: {},
  returns: v.object({
    success: v.boolean(),
    step: v.string(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx) => {
    try {
      console.log('[Test] Step 1: Loading config from database...')
      const config = await ctx.runQuery(internal.sasConfig.getSasConfiguration)

      if (!config) {
        return {
          success: false,
          step: 'load_config',
          error: 'Config not found',
        }
      }

      console.log('[Test] Step 2: Config loaded, has keypairs')
      console.log(`[Test] Payer keypair length: ${config.payerKeypair.length}`)

      console.log('[Test] Step 3: Importing gill...')
      const { createKeyPairSignerFromBytes } = await import('gill')

      console.log('[Test] Step 4: Creating Uint8Array...')
      const payerArray = new Uint8Array(config.payerKeypair)
      console.log(`[Test] Uint8Array created: ${payerArray.length} bytes`)

      console.log('[Test] Step 5: Creating keypair signer (CRYPTO OPERATION)...')
      const payer = await createKeyPairSignerFromBytes(payerArray)

      console.log('[Test] Step 6: SUCCESS! Keypair created')
      console.log(`[Test] Payer address: ${payer.address}`)

      return {
        success: true,
        step: 'complete',
      }
    } catch (error: any) {
      console.error('[Test] ERROR at step:', error.message)
      console.error('[Test] Error stack:', error.stack)

      return {
        success: false,
        step: 'create_keypair_signer',
        error: error.message,
      }
    }
  },
})
