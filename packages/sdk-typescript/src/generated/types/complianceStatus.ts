/**
 * Manually created to fix Codama generation issue
 * Simplified stub version - not used in core staking/agent flow
 */

import {
  combineCodec,
  getAddressDecoder,
  getAddressEncoder,
  getArrayDecoder,
  getArrayEncoder,
  getI64Decoder,
  getI64Encoder,
  getStructDecoder,
  getStructEncoder,
  getU8Decoder,
  getU8Encoder,
  type Address,
  type Codec,
  type Decoder,
  type Encoder,
} from '@solana/kit'

export type ComplianceStatus = {
  complianceScore: number
  lastReview: bigint
  nextReview: bigint
  complianceOfficers: Array<Address>
}

export type ComplianceStatusArgs = {
  complianceScore: number
  lastReview: number | bigint
  nextReview: number | bigint
  complianceOfficers: Array<Address>
}

export function getComplianceStatusEncoder(): Encoder<ComplianceStatusArgs> {
  return getStructEncoder([
    ['complianceScore', getU8Encoder()],
    ['lastReview', getI64Encoder()],
    ['nextReview', getI64Encoder()],
    ['complianceOfficers', getArrayEncoder(getAddressEncoder())],
  ])
}

export function getComplianceStatusDecoder(): Decoder<ComplianceStatus> {
  return getStructDecoder([
    ['complianceScore', getU8Decoder()],
    ['lastReview', getI64Decoder()],
    ['nextReview', getI64Decoder()],
    ['complianceOfficers', getArrayDecoder(getAddressDecoder())],
  ])
}

export function getComplianceStatusCodec(): Codec<ComplianceStatusArgs, ComplianceStatus> {
  return combineCodec(getComplianceStatusEncoder(), getComplianceStatusDecoder())
}
