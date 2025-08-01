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
  getBooleanDecoder,
  getBooleanEncoder,
  getI64Decoder,
  getI64Encoder,
  getStructDecoder,
  getStructEncoder,
  getU32Decoder,
  getU32Encoder,
  getUtf8Decoder,
  getUtf8Encoder,
  type Address,
  type Codec,
  type Decoder,
  type Encoder,
} from '@solana/kit';

/** Enhanced event structure following 2025 patterns */
export type AgentServiceUpdatedEvent = {
  /** Agent account public key */
  agent: Address;
  /** Owner who performed the update */
  owner: Address;
  /** Update timestamp */
  timestamp: bigint;
  /** Service endpoint that was updated */
  serviceEndpoint: string;
  /** New active status */
  isActive: boolean;
};

export type AgentServiceUpdatedEventArgs = {
  /** Agent account public key */
  agent: Address;
  /** Owner who performed the update */
  owner: Address;
  /** Update timestamp */
  timestamp: number | bigint;
  /** Service endpoint that was updated */
  serviceEndpoint: string;
  /** New active status */
  isActive: boolean;
};

export function getAgentServiceUpdatedEventEncoder(): Encoder<AgentServiceUpdatedEventArgs> {
  return getStructEncoder([
    ['agent', getAddressEncoder()],
    ['owner', getAddressEncoder()],
    ['timestamp', getI64Encoder()],
    [
      'serviceEndpoint',
      addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder()),
    ],
    ['isActive', getBooleanEncoder()],
  ]);
}

export function getAgentServiceUpdatedEventDecoder(): Decoder<AgentServiceUpdatedEvent> {
  return getStructDecoder([
    ['agent', getAddressDecoder()],
    ['owner', getAddressDecoder()],
    ['timestamp', getI64Decoder()],
    [
      'serviceEndpoint',
      addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder()),
    ],
    ['isActive', getBooleanDecoder()],
  ]);
}

export function getAgentServiceUpdatedEventCodec(): Codec<
  AgentServiceUpdatedEventArgs,
  AgentServiceUpdatedEvent
> {
  return combineCodec(
    getAgentServiceUpdatedEventEncoder(),
    getAgentServiceUpdatedEventDecoder()
  );
}
