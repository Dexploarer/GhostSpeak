/**
 * This code was AUTOGENERATED using the codama library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun codama to update it.
 *
 * @see https://github.com/codama-idl/codama
 */

import {
  addDecoderSizePrefix,
  addEncoderSizePrefix,
  combineCodec,
  getAddressDecoder,
  getAddressEncoder,
  getI64Decoder,
  getI64Encoder,
  getStructDecoder,
  getStructEncoder,
  getU32Decoder,
  getU32Encoder,
  getU64Decoder,
  getU64Encoder,
  getUtf8Decoder,
  getUtf8Encoder,
  type Address,
  type Codec,
  type Decoder,
  type Encoder,
} from '@solana/kit';

export type AgentAnalyticsEvent = {
  agent: Address;
  operation: string;
  revenue: bigint;
  transactionCount: number;
  successRate: number;
  averageRating: number;
  responseTime: bigint;
  timestamp: bigint;
};

export type AgentAnalyticsEventArgs = {
  agent: Address;
  operation: string;
  revenue: number | bigint;
  transactionCount: number;
  successRate: number;
  averageRating: number;
  responseTime: number | bigint;
  timestamp: number | bigint;
};

export function getAgentAnalyticsEventEncoder(): Encoder<AgentAnalyticsEventArgs> {
  return getStructEncoder([
    ['agent', getAddressEncoder()],
    ['operation', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
    ['revenue', getU64Encoder()],
    ['transactionCount', getU32Encoder()],
    ['successRate', getU32Encoder()],
    ['averageRating', getU32Encoder()],
    ['responseTime', getU64Encoder()],
    ['timestamp', getI64Encoder()],
  ]);
}

export function getAgentAnalyticsEventDecoder(): Decoder<AgentAnalyticsEvent> {
  return getStructDecoder([
    ['agent', getAddressDecoder()],
    ['operation', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
    ['revenue', getU64Decoder()],
    ['transactionCount', getU32Decoder()],
    ['successRate', getU32Decoder()],
    ['averageRating', getU32Decoder()],
    ['responseTime', getU64Decoder()],
    ['timestamp', getI64Decoder()],
  ]);
}

export function getAgentAnalyticsEventCodec(): Codec<
  AgentAnalyticsEventArgs,
  AgentAnalyticsEvent
> {
  return combineCodec(
    getAgentAnalyticsEventEncoder(),
    getAgentAnalyticsEventDecoder()
  );
}
