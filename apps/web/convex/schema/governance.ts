/**
 * Governance Schema
 * Voting and governance system
 */

import { defineTable } from 'convex/server'
import { v } from 'convex/values'

const timestampValidator = v.number()
const walletAddressValidator = v.string()

export const governanceVotes = defineTable({
  voterAddress: walletAddressValidator,
  targetAgentAddress: walletAddressValidator,
  score: v.number(),
  comment: v.optional(v.string()),
  votingPower: v.number(),
  timestamp: timestampValidator,
})
  .index('by_voter', ['voterAddress'])
  .index('by_target', ['targetAgentAddress'])
  .index('by_target_timestamp', ['targetAgentAddress', 'timestamp'])
