// Re-export commonly used utilities from SDK to eliminate duplication
export {
  findAgentPDA,
  findMessagePDA,
  findChannelPDA,
  findEscrowPDA,
  findInvitationPDA,
  findParticipantPDA,
  hashPayload,
  MessageType,
  getMessageTypeIdFromObject as getMessageTypeId,
} from "../packages/sdk-typescript/src/utils.js";
export { MessageType as MessageTypeObject } from "../packages/sdk-typescript/src/types.js";

import { } from "@solana/web3.js";
import { } from "bun:test";
import { createHash } from "crypto";
import { } from "fs";
import { } from "path";
import { address, Address } from "@solana/web3.js";

// Legacy types for backward compatibility in tests
export type MessageStatus = {
  pending?: Record<string, never>;
  delivered?: Record<string, never>;
  read?: Record<string, never>;
  failed?: Record<string, never>;
};

// Rust binary hash functions for testing
export const rustHashFunctions = {
  sha256: (data: string): string => {
    return createHash("sha256").update(data).digest("hex");
  },
  
  blake3: (data: string): string => {
    // Placeholder for blake3 - would need actual implementation
    return createHash("sha256").update(data).digest("hex");
  }
};

// Test utilities using v2.0 patterns
export const createTestAddress = (_seed: string): Address => {
  return address("11111111111111111111111111111112"); // SystemProgram
};

export const validateAddress = (addr: Address): boolean => {
  return typeof addr === "string" && addr.length === 44;
};
