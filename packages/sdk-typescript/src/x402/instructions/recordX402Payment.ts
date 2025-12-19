/**
 * Record x402 Payment Instruction Builder
 *
 * Records an x402 payment transaction on-chain, updating the
 * agent's x402_total_payments and x402_total_calls counters.
 *
 * @module x402/instructions/recordX402Payment
 */

import {
  combineCodec,
  fixEncoderSize,
  fixDecoderSize,
  getBytesEncoder,
  getBytesDecoder,
  getStructEncoder,
  getStructDecoder,
  getU64Encoder,
  getU64Decoder,
  addEncoderSizePrefix,
  addDecoderSizePrefix,
  getUtf8Encoder,
  getUtf8Decoder,
  getU32Encoder,
  getU32Decoder,
  getAddressEncoder,
  getAddressDecoder,
  transformEncoder,
  type Address,
  type Encoder,
  type Decoder,
  type Codec,
  type TransactionSigner,
  type ReadonlyUint8Array
} from '@solana/kit'

import { GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS } from '../../generated/programs/index.js'

// =====================================================
// DISCRIMINATOR
// =====================================================

/**
 * Instruction discriminator for record_x402_payment
 */
export const RECORD_X402_PAYMENT_DISCRIMINATOR = new Uint8Array([
  // anchor:record_x402_payment = hash("global:record_x402_payment")[0..8]
  0xa8, 0x2c, 0x4f, 0xb1, 0x3e, 0x6d, 0x9c, 0x52
])

export function getRecordX402PaymentDiscriminatorBytes(): ReadonlyUint8Array {
  return fixEncoderSize(getBytesEncoder(), 8).encode(RECORD_X402_PAYMENT_DISCRIMINATOR)
}

// =====================================================
// TYPES
// =====================================================

/**
 * x402 Payment data to record on-chain
 */
export interface X402PaymentData {
  /** Solana transaction signature of the payment */
  transactionSignature: string
  /** Amount paid in token's smallest unit */
  amount: bigint
  /** Token mint used for payment */
  tokenMint: Address
  /** Response time of the service in milliseconds */
  responseTimeMs: bigint
}

export interface RecordX402PaymentInstructionData {
  discriminator: ReadonlyUint8Array
  agentId: string
  paymentData: X402PaymentData
}

export interface RecordX402PaymentInstructionDataArgs {
  agentId: string
  paymentData: {
    transactionSignature: string
    amount: bigint | number
    tokenMint: Address
    responseTimeMs: bigint | number
  }
}

// =====================================================
// ENCODERS/DECODERS
// =====================================================

function getX402PaymentDataEncoder(): Encoder<RecordX402PaymentInstructionDataArgs['paymentData']> {
  return getStructEncoder([
    ['transactionSignature', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
    ['amount', getU64Encoder()],
    ['tokenMint', getAddressEncoder()],
    ['responseTimeMs', getU64Encoder()]
  ])
}

function getX402PaymentDataDecoder(): Decoder<X402PaymentData> {
  return getStructDecoder([
    ['transactionSignature', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
    ['amount', getU64Decoder()],
    ['tokenMint', getAddressDecoder()],
    ['responseTimeMs', getU64Decoder()]
  ])
}

export function getRecordX402PaymentInstructionDataEncoder(): Encoder<RecordX402PaymentInstructionDataArgs> {
  return transformEncoder(
    getStructEncoder([
      ['discriminator', fixEncoderSize(getBytesEncoder(), 8)],
      ['agentId', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
      ['paymentData', getX402PaymentDataEncoder()]
    ]),
    (value) => ({ ...value, discriminator: RECORD_X402_PAYMENT_DISCRIMINATOR })
  )
}

export function getRecordX402PaymentInstructionDataDecoder(): Decoder<RecordX402PaymentInstructionData> {
  return getStructDecoder([
    ['discriminator', fixDecoderSize(getBytesDecoder(), 8)],
    ['agentId', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
    ['paymentData', getX402PaymentDataDecoder()]
  ])
}

export function getRecordX402PaymentInstructionDataCodec(): Codec<
  RecordX402PaymentInstructionDataArgs,
  RecordX402PaymentInstructionData
> {
  return combineCodec(
    getRecordX402PaymentInstructionDataEncoder(),
    getRecordX402PaymentInstructionDataDecoder()
  )
}

// =====================================================
// INSTRUCTION INPUT
// =====================================================

export interface RecordX402PaymentInput {
  /** The agent account that received the payment */
  agent: Address
  /** The recorder (could be the payer or a relay service) */
  recorder: TransactionSigner
  /** Agent ID string for identification */
  agentId: string
  /** Payment details to record */
  paymentData: {
    transactionSignature: string
    amount: bigint | number
    tokenMint: Address
    responseTimeMs: bigint | number
  }
}

// =====================================================
// INSTRUCTION BUILDER
// =====================================================

/**
 * Build a record_x402_payment instruction
 *
 * @example
 * ```typescript
 * const instruction = getRecordX402PaymentInstruction({
 *   agent: agentAddress,
 *   recorder: walletSigner,
 *   agentId: 'my-agent',
 *   paymentData: {
 *     transactionSignature: 'abc123...',
 *     amount: 1_000_000n,
 *     tokenMint: USDC_MINT,
 *     responseTimeMs: 150n
 *   }
 * })
 * ```
 */
export function getRecordX402PaymentInstruction(
  input: RecordX402PaymentInput,
  config?: { programAddress?: Address }
): {
  programAddress: Address
  accounts: Array<{ address: Address; role: 'writable' | 'readonly' | 'signer' }>
  data: ReadonlyUint8Array
} {
  const programAddress = config?.programAddress ?? GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS

  const data = getRecordX402PaymentInstructionDataEncoder().encode({
    agentId: input.agentId,
    paymentData: input.paymentData
  })

  return {
    programAddress,
    accounts: [
      { address: input.agent, role: 'writable' },
      { address: input.recorder.address, role: 'signer' }
    ],
    data
  }
}
