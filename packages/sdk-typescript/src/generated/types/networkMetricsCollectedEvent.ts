/**
 * This code was AUTOGENERATED using the codama library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun codama to update it.
 *
 * @see https://github.com/codama-idl/codama
 */

import {
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
  type Address,
  type FixedSizeCodec,
  type FixedSizeDecoder,
  type FixedSizeEncoder,
} from '@solana/kit';

export type NetworkMetricsCollectedEvent = {
  dashboard: Address;
  activeAgents: number;
  transactionThroughput: bigint;
  averageLatency: bigint;
  errorRate: number;
  timestamp: bigint;
};

export type NetworkMetricsCollectedEventArgs = {
  dashboard: Address;
  activeAgents: number;
  transactionThroughput: number | bigint;
  averageLatency: number | bigint;
  errorRate: number;
  timestamp: number | bigint;
};

export function getNetworkMetricsCollectedEventEncoder(): FixedSizeEncoder<NetworkMetricsCollectedEventArgs> {
  return getStructEncoder([
    ['dashboard', getAddressEncoder()],
    ['activeAgents', getU32Encoder()],
    ['transactionThroughput', getU64Encoder()],
    ['averageLatency', getU64Encoder()],
    ['errorRate', getU32Encoder()],
    ['timestamp', getI64Encoder()],
  ]);
}

export function getNetworkMetricsCollectedEventDecoder(): FixedSizeDecoder<NetworkMetricsCollectedEvent> {
  return getStructDecoder([
    ['dashboard', getAddressDecoder()],
    ['activeAgents', getU32Decoder()],
    ['transactionThroughput', getU64Decoder()],
    ['averageLatency', getU64Decoder()],
    ['errorRate', getU32Decoder()],
    ['timestamp', getI64Decoder()],
  ]);
}

export function getNetworkMetricsCollectedEventCodec(): FixedSizeCodec<
  NetworkMetricsCollectedEventArgs,
  NetworkMetricsCollectedEvent
> {
  return combineCodec(
    getNetworkMetricsCollectedEventEncoder(),
    getNetworkMetricsCollectedEventDecoder()
  );
}
