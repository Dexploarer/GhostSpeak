/**
 * Configuration Schema
 * System configuration and settings
 */

import { defineTable } from 'convex/server'
import { v } from 'convex/values'

const timestampValidator = v.number()

export const sasConfiguration = defineTable({
  configKey: v.string(),
  cluster: v.union(v.literal('devnet'), v.literal('mainnet-beta')),
  payerKeypair: v.array(v.number()),
  authorityKeypair: v.array(v.number()),
  authorizedSignerKeypair: v.array(v.number()),
  isActive: v.boolean(),
  createdAt: timestampValidator,
  updatedAt: timestampValidator,
}).index('by_config_key', ['configKey'])

export const caisperWallet = defineTable({
  publicKey: v.string(),
  encryptedPrivateKey: v.string(),
  secretKey: v.array(v.number()),
  isActive: v.boolean(),
  createdAt: timestampValidator,
  updatedAt: timestampValidator,
})
