/**
 * This code was AUTOGENERATED using the codama library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun codama to update it.
 *
 * @see https://github.com/codama-idl/codama
 */

import {
  combineCodec,
  getEnumDecoder,
  getEnumEncoder,
  type FixedSizeCodec,
  type FixedSizeDecoder,
  type FixedSizeEncoder,
} from '@solana/kit';

/** Types of notification targets */
export enum NotificationTargetType {
  User,
  Administrator,
  SecurityTeam,
  ComplianceTeam,
  Manager,
  AuditTeam,
  ExternalSystem,
}

export type NotificationTargetTypeArgs = NotificationTargetType;

export function getNotificationTargetTypeEncoder(): FixedSizeEncoder<NotificationTargetTypeArgs> {
  return getEnumEncoder(NotificationTargetType);
}

export function getNotificationTargetTypeDecoder(): FixedSizeDecoder<NotificationTargetType> {
  return getEnumDecoder(NotificationTargetType);
}

export function getNotificationTargetTypeCodec(): FixedSizeCodec<
  NotificationTargetTypeArgs,
  NotificationTargetType
> {
  return combineCodec(
    getNotificationTargetTypeEncoder(),
    getNotificationTargetTypeDecoder()
  );
}
