/**
 * Debug action to check SAS environment variables
 */

import { action } from './_generated/server'
import { v } from 'convex/values'

export const checkSasEnvironment = action({
  args: {},
  returns: v.object({
    hasCluster: v.boolean(),
    hasPayer: v.boolean(),
    hasAuthority: v.boolean(),
    hasSigner: v.boolean(),
    cluster: v.string(),
    payerLength: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx) => {
    const errors: string[] = []

    // Try both process.env and ctx.env (if it exists)
    const cluster = process.env.SOLANA_CLUSTER
    const payer = process.env.SAS_PAYER_KEYPAIR
    const authority = process.env.SAS_AUTHORITY_KEYPAIR
    const signer = process.env.SAS_AUTHORIZED_SIGNER_KEYPAIR

    console.log('Checking SAS environment variables...')
    console.log('process.env object keys:', Object.keys(process.env).length)
    console.log(
      'All env vars starting with S:',
      Object.keys(process.env).filter((k) => k.startsWith('S'))
    )
    console.log('SOLANA_CLUSTER:', cluster ? 'SET' : 'NOT SET')
    console.log('SAS_PAYER_KEYPAIR:', payer ? `SET (${payer.length} chars)` : 'NOT SET')
    console.log('SAS_AUTHORITY_KEYPAIR:', authority ? `SET (${authority.length} chars)` : 'NOT SET')
    console.log(
      'SAS_AUTHORIZED_SIGNER_KEYPAIR:',
      signer ? `SET (${signer.length} chars)` : 'NOT SET'
    )

    if (payer) {
      try {
        const parsed = JSON.parse(payer)
        console.log('Payer keypair parsed successfully, length:', parsed.length)
      } catch (e) {
        const error = `Failed to parse payer keypair: ${e}`
        console.error(error)
        errors.push(error)
      }
    }

    return {
      hasCluster: !!cluster,
      hasPayer: !!payer,
      hasAuthority: !!authority,
      hasSigner: !!signer,
      cluster: cluster || 'NOT SET',
      payerLength: payer?.length || 0,
      errors,
    }
  },
})
