/**
 * Fixed instruction exports with enhanced codec support
 */

// Export original generated instructions (for compatibility)
export * from './addParticipant';
export * from './broadcastMessage';
export * from './createChannel';
export * from './createJobPosting';
export * from './createServiceListing';
export * from './createWorkOrder';
export * from './processPayment';
export * from './purchaseService';
export * from './sendMessage';
export * from './submitWorkDelivery';
export * from './verifyAgent';

// Export fixed instruction builders
export {
  FixedInstructionBuilder,
  InstructionFactory,
  createVerifyAgentInstruction,
  createCreateChannelInstruction,
  createSendMessageInstruction,
  createCreateServiceListingInstruction,
  createPurchaseServiceInstruction,
} from '../../utils/instruction-wrappers';

// Export fixed individual instruction
export * from './verifyAgent-fixed';

// Export codec compatibility utilities
export {
  codecs,
  isValidBase58Address,
  createAddress,
  toBigInt,
  type EnhancedCodec,
  type EnhancedEncoder,
} from '../../utils/codec-compat';

// Re-export instruction input types
export type {
  VerifyAgentInput,
  CreateChannelInput,
  SendMessageInput,
  CreateServiceListingInput,
  PurchaseServiceInput,
} from '../../utils/instruction-wrappers';