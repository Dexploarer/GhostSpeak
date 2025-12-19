/**
 * Submit x402 Rating Instruction Builder
 *
 * Submits a reputation rating for an x402 service call,
 * updating the agent's on-chain reputation using an
 * exponential moving average algorithm.
 *
 * @module x402/instructions/submitX402Rating
 */

import {
  combineCodec,
  fixEncoderSize,
  fixDecoderSize,
  getBytesEncoder,
  getBytesDecoder,
  getStructEncoder,
  getStructDecoder,
  getU8Encoder,
  getU8Decoder,
  addEncoderSizePrefix,
  addDecoderSizePrefix,
  getUtf8Encoder,
  getUtf8Decoder,
  getU32Encoder,
  getU32Decoder,
  getOptionEncoder,
  getOptionDecoder,
  transformEncoder,
  type Address,
  type Encoder,
  type Decoder,
  type Codec,
  type TransactionSigner,
  type ReadonlyUint8Array,
  type Option,
  type OptionOrNullable
} from '@solana/kit'

import { GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS } from '../../generated/programs/index.js'

// =====================================================
// DISCRIMINATOR
// =====================================================

/**
 * Instruction discriminator for submit_x402_rating
 */
export const SUBMIT_X402_RATING_DISCRIMINATOR = new Uint8Array([
  // anchor:submit_x402_rating = hash("global:submit_x402_rating")[0..8]
  0xb9, 0x3d, 0x5f, 0xc2, 0x4e, 0x7d, 0xad, 0x63
])

export function getSubmitX402RatingDiscriminatorBytes(): ReadonlyUint8Array {
  return fixEncoderSize(getBytesEncoder(), 8).encode(SUBMIT_X402_RATING_DISCRIMINATOR)
}

// =====================================================
// TYPES
// =====================================================

/**
 * Rating data for x402 transaction
 */
export interface X402RatingData {
  /** Rating from 1-5 stars */
  rating: number
  /** Transaction signature that was rated */
  transactionSignature: string
  /** Optional feedback text */
  feedback: Option<string>
}

export interface SubmitX402RatingInstructionData {
  discriminator: ReadonlyUint8Array
  agentId: string
  ratingData: X402RatingData
}

export interface SubmitX402RatingInstructionDataArgs {
  agentId: string
  ratingData: {
    rating: number
    transactionSignature: string
    feedback: OptionOrNullable<string>
  }
}

// =====================================================
// ENCODERS/DECODERS
// =====================================================

function getX402RatingDataEncoder(): Encoder<SubmitX402RatingInstructionDataArgs['ratingData']> {
  return getStructEncoder([
    ['rating', getU8Encoder()],
    ['transactionSignature', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
    ['feedback', getOptionEncoder(addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder()))]
  ])
}

function getX402RatingDataDecoder(): Decoder<X402RatingData> {
  return getStructDecoder([
    ['rating', getU8Decoder()],
    ['transactionSignature', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
    ['feedback', getOptionDecoder(addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder()))]
  ])
}

export function getSubmitX402RatingInstructionDataEncoder(): Encoder<SubmitX402RatingInstructionDataArgs> {
  return transformEncoder(
    getStructEncoder([
      ['discriminator', fixEncoderSize(getBytesEncoder(), 8)],
      ['agentId', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
      ['ratingData', getX402RatingDataEncoder()]
    ]),
    (value) => ({ ...value, discriminator: SUBMIT_X402_RATING_DISCRIMINATOR })
  )
}

export function getSubmitX402RatingInstructionDataDecoder(): Decoder<SubmitX402RatingInstructionData> {
  return getStructDecoder([
    ['discriminator', fixDecoderSize(getBytesDecoder(), 8)],
    ['agentId', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
    ['ratingData', getX402RatingDataDecoder()]
  ])
}

export function getSubmitX402RatingInstructionDataCodec(): Codec<
  SubmitX402RatingInstructionDataArgs,
  SubmitX402RatingInstructionData
> {
  return combineCodec(
    getSubmitX402RatingInstructionDataEncoder(),
    getSubmitX402RatingInstructionDataDecoder()
  )
}

// =====================================================
// INSTRUCTION INPUT
// =====================================================

export interface SubmitX402RatingInput {
  /** The agent account being rated */
  agent: Address
  /** The rater (must have made a payment to this agent) */
  rater: TransactionSigner
  /** Agent ID string for identification */
  agentId: string
  /** Rating data */
  ratingData: {
    /** Rating from 1-5 stars */
    rating: number
    /** Transaction signature of the x402 payment */
    transactionSignature: string
    /** Optional feedback text (max 256 chars) */
    feedback?: string | null
  }
}

// =====================================================
// INSTRUCTION BUILDER
// =====================================================

/**
 * Build a submit_x402_rating instruction
 *
 * Rating affects the agent's reputation using an exponential
 * moving average (EMA) algorithm:
 *
 * new_reputation = (old_reputation * 9000 + rating_basis_points * 1000) / 10000
 *
 * Where rating_basis_points = rating * 2000 (1 star = 2000, 5 stars = 10000)
 *
 * @example
 * ```typescript
 * const instruction = getSubmitX402RatingInstruction({
 *   agent: agentAddress,
 *   rater: walletSigner,
 *   agentId: 'my-agent',
 *   ratingData: {
 *     rating: 5,
 *     transactionSignature: 'abc123...',
 *     feedback: 'Excellent service!'
 *   }
 * })
 * ```
 */
export function getSubmitX402RatingInstruction(
  input: SubmitX402RatingInput,
  config?: { programAddress?: Address }
): {
  programAddress: Address
  accounts: Array<{ address: Address; role: 'writable' | 'readonly' | 'signer' }>
  data: ReadonlyUint8Array
} {
  const programAddress = config?.programAddress ?? GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS

  // Validate rating
  if (input.ratingData.rating < 1 || input.ratingData.rating > 5) {
    throw new Error('Rating must be between 1 and 5')
  }

  const data = getSubmitX402RatingInstructionDataEncoder().encode({
    agentId: input.agentId,
    ratingData: {
      rating: input.ratingData.rating,
      transactionSignature: input.ratingData.transactionSignature,
      feedback: input.ratingData.feedback ?? null
    }
  })

  return {
    programAddress,
    accounts: [
      { address: input.agent, role: 'writable' },
      { address: input.rater.address, role: 'signer' }
    ],
    data
  }
}

// =====================================================
// REPUTATION CALCULATION UTILITIES
// =====================================================

/**
 * Calculate expected new reputation after a rating
 *
 * Uses the same EMA algorithm as the on-chain program:
 * new_rep = (old_rep * 9000 + rating_bp * 1000) / 10000
 *
 * @param currentReputation - Current reputation (0-10000 basis points)
 * @param rating - New rating (1-5 stars)
 * @returns Expected new reputation (0-10000 basis points)
 */
export function calculateNewReputation(currentReputation: number, rating: number): number {
  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5')
  }

  // Convert rating to basis points (1 star = 2000, 5 stars = 10000)
  const ratingBasisPoints = rating * 2000

  // EMA calculation matching on-chain
  const EMA_WEIGHT = 9000
  const NEW_WEIGHT = 1000
  const BASIS_POINTS_MAX = 10000

  const newReputation = Math.floor(
    (currentReputation * EMA_WEIGHT + ratingBasisPoints * NEW_WEIGHT) / BASIS_POINTS_MAX
  )

  // Cap at max
  return Math.min(newReputation, BASIS_POINTS_MAX)
}

/**
 * Convert basis points reputation to percentage
 */
export function reputationToPercentage(basisPoints: number): number {
  return basisPoints / 100
}

/**
 * Convert basis points reputation to star rating (1-5)
 */
export function reputationToStars(basisPoints: number): number {
  return Math.round((basisPoints / 2000) * 10) / 10
}
