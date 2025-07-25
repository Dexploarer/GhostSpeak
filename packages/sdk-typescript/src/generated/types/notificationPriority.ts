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

/** Notification priorities */
export enum NotificationPriority {
  Low,
  Medium,
  High,
  Critical,
  Emergency,
}

export type NotificationPriorityArgs = NotificationPriority;

export function getNotificationPriorityEncoder(): FixedSizeEncoder<NotificationPriorityArgs> {
  return getEnumEncoder(NotificationPriority);
}

export function getNotificationPriorityDecoder(): FixedSizeDecoder<NotificationPriority> {
  return getEnumDecoder(NotificationPriority);
}

export function getNotificationPriorityCodec(): FixedSizeCodec<
  NotificationPriorityArgs,
  NotificationPriority
> {
  return combineCodec(
    getNotificationPriorityEncoder(),
    getNotificationPriorityDecoder()
  );
}
