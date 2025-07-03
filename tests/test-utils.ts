import { createHash } from 'crypto';

import { address, type Address } from '@solana/addresses';

// Import PDA helpers first
import {
  PDAHelpers,
  PDA_SEEDS,
  SYSTEM_PROGRAM_ID,
  createPDAHelpers,
} from './helpers/pda-helpers';

// Re-export commonly used utilities from PDA helpers to eliminate duplication
export {
  PDAHelpers,
  PDA_SEEDS,
  SYSTEM_PROGRAM_ID,
  createPDAHelpers,
};

// Legacy exports for backward compatibility - map to PDA helpers
export const findAgentPDA = (authority: any, programId: any) => [
  PDAHelpers.getAgentPDA(authority, programId),
  255,
];
export const findMessagePDA = (
  sender: any,
  recipient: any,
  nonce: any,
  programId: any
) => [PDAHelpers.getMessagePDA(sender, recipient, nonce, programId), 255];
export const findChannelPDA = (
  creator: any,
  channelId: any,
  programId: any
) => [PDAHelpers.getChannelPDA(creator, channelId, programId), 255];
export const findEscrowPDA = (depositor: any, programId: any) => [
  PDAHelpers.getAgentPDA(depositor, programId),
  255,
];
export const findInvitationPDA = findChannelPDA; // Alias
export const findParticipantPDA = findAgentPDA; // Alias

// Hash functions for payload compatibility
export const hashPayload = (data: any) => JSON.stringify(data);
export const getMessageTypeIdFromObject = (type: any) => type;

// Message types for compatibility
export const MESSAGE_TYPE = {
  Direct: 0,
  Channel: 1,
  System: 2,
  Command: 3,
} as const;

// Legacy export for backward compatibility
export const MessageType = MESSAGE_TYPE;

export { MessageType as MessageTypeObject } from '../packages/sdk-typescript/src/types';

// Legacy types for backward compatibility in tests
export interface IMessageStatus {
  pending?: Record<string, never>;
  delivered?: Record<string, never>;
  read?: Record<string, never>;
  failed?: Record<string, never>;
}

// Rust binary hash functions for testing
export const rustHashFunctions = {
  sha256: (data: string): string => {
    return createHash('sha256').update(data).digest('hex');
  },

  blake3: (data: string): string => {
    // Placeholder for blake3 - would need actual implementation
    return createHash('sha256').update(data).digest('hex');
  },
};

// Test utilities using v2.0 patterns
export const createTestAddress = (_seed: string): Address => {
  return address('11111111111111111111111111111112'); // SystemProgram
};

export const validateAddress = (addr: Address): boolean => {
  return typeof addr === 'string' && addr.length === 44;
};
