/**
 * This code was AUTOGENERATED using the codama library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun codama to update it.
 *
 * @see https://github.com/codama-idl/codama
 */

import {
  combineCodec,
  getArrayDecoder,
  getArrayEncoder,
  getStructDecoder,
  getStructEncoder,
  type Codec,
  type Decoder,
  type Encoder,
} from '@solana/kit';
import {
  getConstraintConditionDecoder,
  getConstraintConditionEncoder,
  getEnforcementLevelDecoder,
  getEnforcementLevelEncoder,
  getPermissionConstraintTypeDecoder,
  getPermissionConstraintTypeEncoder,
  type ConstraintCondition,
  type ConstraintConditionArgs,
  type EnforcementLevel,
  type EnforcementLevelArgs,
  type PermissionConstraintType,
  type PermissionConstraintTypeArgs,
} from '.';

/** Permission constraint */
export type PermissionConstraint = {
  /** Constraint type */
  constraintType: PermissionConstraintType;
  /** Constraint conditions */
  conditions: Array<ConstraintCondition>;
  /** Constraint enforcement */
  enforcement: EnforcementLevel;
};

export type PermissionConstraintArgs = {
  /** Constraint type */
  constraintType: PermissionConstraintTypeArgs;
  /** Constraint conditions */
  conditions: Array<ConstraintConditionArgs>;
  /** Constraint enforcement */
  enforcement: EnforcementLevelArgs;
};

export function getPermissionConstraintEncoder(): Encoder<PermissionConstraintArgs> {
  return getStructEncoder([
    ['constraintType', getPermissionConstraintTypeEncoder()],
    ['conditions', getArrayEncoder(getConstraintConditionEncoder())],
    ['enforcement', getEnforcementLevelEncoder()],
  ]);
}

export function getPermissionConstraintDecoder(): Decoder<PermissionConstraint> {
  return getStructDecoder([
    ['constraintType', getPermissionConstraintTypeDecoder()],
    ['conditions', getArrayDecoder(getConstraintConditionDecoder())],
    ['enforcement', getEnforcementLevelDecoder()],
  ]);
}

export function getPermissionConstraintCodec(): Codec<
  PermissionConstraintArgs,
  PermissionConstraint
> {
  return combineCodec(
    getPermissionConstraintEncoder(),
    getPermissionConstraintDecoder()
  );
}
