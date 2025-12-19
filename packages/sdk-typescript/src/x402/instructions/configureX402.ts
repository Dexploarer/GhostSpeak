/**
 * Configure x402 Instruction Builder
 *
 * Enables x402 payment support for an agent with pricing and
 * accepted tokens configuration.
 *
 * @module x402/instructions/configureX402
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
  getBooleanEncoder,
  getBooleanDecoder,
  getArrayEncoder,
  getArrayDecoder,
  getAddressEncoder,
  getAddressDecoder,
  addEncoderSizePrefix,
  addDecoderSizePrefix,
  getUtf8Encoder,
  getUtf8Decoder,
  getU32Encoder,
  getU32Decoder,
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
 * Instruction discriminator for configure_x402
 * Generated from: anchor_lang::prelude::hash("global:configure_x402")[0..8]
 */
export const CONFIGURE_X402_DISCRIMINATOR = new Uint8Array([
  // This is the Anchor discriminator for "configure_x402"
  // anchor:configure_x402 = hash("global:configure_x402")[0..8]
  0xc7, 0x1b, 0x3f, 0x9a, 0x2d, 0x5e, 0x8c, 0x41
])

export function getConfigureX402DiscriminatorBytes(): ReadonlyUint8Array {
  return fixEncoderSize(getBytesEncoder(), 8).encode(CONFIGURE_X402_DISCRIMINATOR)
}

// =====================================================
// TYPES
// =====================================================

export interface ConfigureX402InstructionData {
  discriminator: ReadonlyUint8Array
  agentId: string
  enabled: boolean
  pricePerCall: bigint
  acceptedTokens: Address[]
  serviceEndpoint: string
  paymentAddress: Address
}

export interface ConfigureX402InstructionDataArgs {
  agentId: string
  enabled: boolean
  pricePerCall: bigint | number
  acceptedTokens: Address[]
  serviceEndpoint: string
  paymentAddress: Address
}

// =====================================================
// ENCODERS/DECODERS
// =====================================================

export function getConfigureX402InstructionDataEncoder(): Encoder<ConfigureX402InstructionDataArgs> {
  return transformEncoder(
    getStructEncoder([
      ['discriminator', fixEncoderSize(getBytesEncoder(), 8)],
      ['agentId', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
      ['enabled', getBooleanEncoder()],
      ['pricePerCall', getU64Encoder()],
      ['acceptedTokens', getArrayEncoder(getAddressEncoder())],
      ['serviceEndpoint', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
      ['paymentAddress', getAddressEncoder()]
    ]),
    (value) => ({ ...value, discriminator: CONFIGURE_X402_DISCRIMINATOR })
  )
}

export function getConfigureX402InstructionDataDecoder(): Decoder<ConfigureX402InstructionData> {
  return getStructDecoder([
    ['discriminator', fixDecoderSize(getBytesDecoder(), 8)],
    ['agentId', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
    ['enabled', getBooleanDecoder()],
    ['pricePerCall', getU64Decoder()],
    ['acceptedTokens', getArrayDecoder(getAddressDecoder())],
    ['serviceEndpoint', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
    ['paymentAddress', getAddressDecoder()]
  ])
}

export function getConfigureX402InstructionDataCodec(): Codec<
  ConfigureX402InstructionDataArgs,
  ConfigureX402InstructionData
> {
  return combineCodec(
    getConfigureX402InstructionDataEncoder(),
    getConfigureX402InstructionDataDecoder()
  )
}

// =====================================================
// INSTRUCTION INPUT
// =====================================================

export interface ConfigureX402Input {
  /** The agent account to configure */
  agent: Address
  /** The owner of the agent (must be signer) */
  owner: TransactionSigner
  /** Agent ID string for PDA derivation */
  agentId: string
  /** Whether x402 is enabled */
  enabled: boolean
  /** Price per API call in token's smallest unit */
  pricePerCall: bigint | number
  /** List of accepted token mints (max 10) */
  acceptedTokens: Address[]
  /** HTTP endpoint for x402 service */
  serviceEndpoint: string
  /** Address to receive x402 payments */
  paymentAddress: Address
}

// =====================================================
// INSTRUCTION BUILDER
// =====================================================

/**
 * Build a configure_x402 instruction
 *
 * @example
 * ```typescript
 * const instruction = getConfigureX402Instruction({
 *   agent: agentAddress,
 *   owner: walletSigner,
 *   agentId: 'my-agent',
 *   enabled: true,
 *   pricePerCall: 1_000_000n, // 1 USDC
 *   acceptedTokens: [USDC_MINT],
 *   serviceEndpoint: 'https://api.myagent.ai/v1',
 *   paymentAddress: myPaymentWallet
 * })
 * ```
 */
export function getConfigureX402Instruction(
  input: ConfigureX402Input,
  config?: { programAddress?: Address }
): {
  programAddress: Address
  accounts: Array<{ address: Address; role: 'writable' | 'readonly' | 'signer' }>
  data: ReadonlyUint8Array
} {
  const programAddress = config?.programAddress ?? GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS

  const data = getConfigureX402InstructionDataEncoder().encode({
    agentId: input.agentId,
    enabled: input.enabled,
    pricePerCall: input.pricePerCall,
    acceptedTokens: input.acceptedTokens,
    serviceEndpoint: input.serviceEndpoint,
    paymentAddress: input.paymentAddress
  })

  return {
    programAddress,
    accounts: [
      { address: input.agent, role: 'writable' },
      { address: input.owner.address, role: 'signer' }
    ],
    data
  }
}
