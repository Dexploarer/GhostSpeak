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
  getArrayDecoder,
  getArrayEncoder,
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
import {
  getNotificationRequirementDecoder,
  getNotificationRequirementEncoder,
  type NotificationRequirement,
  type NotificationRequirementArgs,
} from '.';

export type IncidentResponsePolicies = {
  responseTeam: Array<Address>;
  escalationProcedures: Array<string>;
  notificationRequirements: Array<NotificationRequirement>;
};

export type IncidentResponsePoliciesArgs = {
  responseTeam: Array<Address>;
  escalationProcedures: Array<string>;
  notificationRequirements: Array<NotificationRequirementArgs>;
};

export function getIncidentResponsePoliciesEncoder(): Encoder<IncidentResponsePoliciesArgs> {
  return getStructEncoder([
    ['responseTeam', getArrayEncoder(getAddressEncoder())],
    [
      'escalationProcedures',
      getArrayEncoder(addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())),
    ],
    [
      'notificationRequirements',
      getArrayEncoder(getNotificationRequirementEncoder()),
    ],
  ]);
}

export function getIncidentResponsePoliciesDecoder(): Decoder<IncidentResponsePolicies> {
  return getStructDecoder([
    ['responseTeam', getArrayDecoder(getAddressDecoder())],
    [
      'escalationProcedures',
      getArrayDecoder(addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())),
    ],
    [
      'notificationRequirements',
      getArrayDecoder(getNotificationRequirementDecoder()),
    ],
  ]);
}

export function getIncidentResponsePoliciesCodec(): Codec<
  IncidentResponsePoliciesArgs,
  IncidentResponsePolicies
> {
  return combineCodec(
    getIncidentResponsePoliciesEncoder(),
    getIncidentResponsePoliciesDecoder()
  );
}
