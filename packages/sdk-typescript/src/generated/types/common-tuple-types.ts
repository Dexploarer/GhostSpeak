/**
 * Common tuple type utilities for manual TypeScript stubs
 *
 * These types bridge the gap between Rust tuple syntax and TypeScript's
 * struct-based decoder output from @solana/kit.
 *
 * @module common-tuple-types
 */

/**
 * Decoded string tuple from Borsh serialization
 * Decoders return objects with numeric keys instead of arrays
 */
export type DecodedStringTuple = { 0: string; 1: string };

/**
 * Decoded string-number tuple from Borsh serialization
 */
export type DecodedStringNumberTuple = { 0: string; 1: number };

/**
 * Decoded string-bigint tuple from Borsh serialization
 */
export type DecodedStringBigintTuple = { 0: string; 1: bigint };

/**
 * Input type for string tuples - accepts both array and object forms
 * Allows developers to pass either `[string, string]` or `{ 0: string; 1: string }`
 */
export type StringTupleInput = [string, string] | DecodedStringTuple;

/**
 * Input type for string-number tuples
 */
export type StringNumberTupleInput = [string, number] | DecodedStringNumberTuple;

/**
 * Input type for string-bigint tuples
 */
export type StringBigintTupleInput = [string, number | bigint] | DecodedStringBigintTuple;
