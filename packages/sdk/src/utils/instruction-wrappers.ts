/**
 * Instruction Wrappers with Enhanced Codec Support
 * Provides working versions of all generated instructions
 */

import { type Address, address } from '@solana/addresses';
import { type TransactionSigner } from '@solana/signers';
import type { IAccountMeta, IAccountSignerMeta, IInstruction } from './instruction-compat';
import { AccountRole } from './instruction-compat';
import { POD_COM_PROGRAM_ADDRESS } from '../generated-v2/programs';
import {
  codecs,
  createAddress,
  toBigInt,
  type EnhancedEncoder,
} from './codec-compat';

/**
 * Common instruction input types
 */
export interface BaseInstructionInput {
  payer: TransactionSigner;
  systemProgram?: Address;
}

/**
 * Verify Agent instruction input
 */
export interface VerifyAgentInput extends BaseInstructionInput {
  agentVerification: Address;
  agent: TransactionSigner;
  agentPubkey: Address | string;
  serviceEndpoint: string;
  supportedCapabilities: Array<string>;
  verifiedAt: bigint | number;
}

/**
 * Create Channel instruction input
 */
export interface CreateChannelInput extends BaseInstructionInput {
  channel: Address;
  channelName: string;
  visibility: number;
  maxParticipants: number;
  owner: TransactionSigner;
}

/**
 * Send Message instruction input
 */
export interface SendMessageInput extends BaseInstructionInput {
  channel: Address;
  message: Address;
  sender: TransactionSigner;
  content: string;
  messageType: number;
}

/**
 * Create Service Listing instruction input
 */
export interface CreateServiceListingInput extends BaseInstructionInput {
  serviceListing: Address;
  agent: TransactionSigner;
  serviceName: string;
  description: string;
  price: bigint | number;
  serviceType: number;
}

/**
 * Purchase Service instruction input
 */
export interface PurchaseServiceInput extends BaseInstructionInput {
  serviceListing: Address;
  purchaseOrder: Address;
  buyer: TransactionSigner;
  seller: Address;
  amount: bigint | number;
}

/**
 * Enhanced instruction builder for verify agent
 */
export function createVerifyAgentInstruction(
  input: VerifyAgentInput
): IInstruction {
  const discriminator = new Uint8Array([42, 158, 201, 44, 92, 88, 134, 201]);
  
  const dataEncoder = codecs.struct([
    ['discriminator', codecs.bytes({ size: 8 })],
    ['agentPubkey', codecs.address()],
    ['serviceEndpoint', codecs.utf8()],
    ['supportedCapabilities', codecs.array(codecs.utf8())],
    ['verifiedAt', codecs.u64()],
  ]);

  const accounts: (IAccountMeta | IAccountSignerMeta)[] = [
    {
      address: input.agentVerification,
      role: AccountRole.WRITABLE,
    },
    {
      address: input.agent.address,
      role: AccountRole.READONLY_SIGNER,
      signer: input.agent,
    } as IAccountSignerMeta,
    {
      address: input.payer.address,
      role: AccountRole.WRITABLE_SIGNER,
      signer: input.payer,
    } as IAccountSignerMeta,
    {
      address: input.systemProgram ?? address('11111111111111111111111111111111'),
      role: AccountRole.READONLY,
    },
  ];

  const data = dataEncoder.encode({
    discriminator,
    agentPubkey: typeof input.agentPubkey === 'string' 
      ? createAddress(input.agentPubkey) 
      : input.agentPubkey,
    serviceEndpoint: input.serviceEndpoint,
    supportedCapabilities: input.supportedCapabilities,
    verifiedAt: toBigInt(input.verifiedAt),
  });

  return {
    programAddress: address(POD_COM_PROGRAM_ADDRESS),
    accounts,
    data,
  };
}

/**
 * Enhanced instruction builder for create channel
 */
export function createCreateChannelInstruction(
  input: CreateChannelInput
): IInstruction {
  const discriminator = new Uint8Array([252, 166, 86, 52, 140, 150, 133, 44]);
  
  const dataEncoder = codecs.struct([
    ['discriminator', codecs.bytes({ size: 8 })],
    ['channelName', codecs.utf8()],
    ['visibility', codecs.u32()],
    ['maxParticipants', codecs.u32()],
  ]);

  const accounts: (IAccountMeta | IAccountSignerMeta)[] = [
    {
      address: input.channel,
      role: AccountRole.WRITABLE,
    },
    {
      address: input.owner.address,
      role: AccountRole.WRITABLE_SIGNER,
      signer: input.owner,
    } as IAccountSignerMeta,
    {
      address: input.payer.address,
      role: AccountRole.WRITABLE_SIGNER,
      signer: input.payer,
    } as IAccountSignerMeta,
    {
      address: input.systemProgram ?? address('11111111111111111111111111111111'),
      role: AccountRole.READONLY,
    },
  ];

  const data = dataEncoder.encode({
    discriminator,
    channelName: input.channelName,
    visibility: input.visibility,
    maxParticipants: input.maxParticipants,
  });

  return {
    programAddress: address(POD_COM_PROGRAM_ADDRESS),
    accounts,
    data,
  };
}

/**
 * Enhanced instruction builder for send message
 */
export function createSendMessageInstruction(
  input: SendMessageInput
): IInstruction {
  const discriminator = new Uint8Array([60, 205, 111, 233, 207, 219, 244, 13]);
  
  const dataEncoder = codecs.struct([
    ['discriminator', codecs.bytes({ size: 8 })],
    ['content', codecs.utf8()],
    ['messageType', codecs.u32()],
  ]);

  const accounts: (IAccountMeta | IAccountSignerMeta)[] = [
    {
      address: input.channel,
      role: AccountRole.WRITABLE,
    },
    {
      address: input.message,
      role: AccountRole.WRITABLE,
    },
    {
      address: input.sender.address,
      role: AccountRole.READONLY_SIGNER,
      signer: input.sender,
    } as IAccountSignerMeta,
    {
      address: input.payer.address,
      role: AccountRole.WRITABLE_SIGNER,
      signer: input.payer,
    } as IAccountSignerMeta,
    {
      address: input.systemProgram ?? address('11111111111111111111111111111111'),
      role: AccountRole.READONLY,
    },
  ];

  const data = dataEncoder.encode({
    discriminator,
    content: input.content,
    messageType: input.messageType,
  });

  return {
    programAddress: address(POD_COM_PROGRAM_ADDRESS),
    accounts,
    data,
  };
}

/**
 * Enhanced instruction builder for create service listing
 */
export function createCreateServiceListingInstruction(
  input: CreateServiceListingInput
): IInstruction {
  const discriminator = new Uint8Array([53, 177, 150, 46, 23, 249, 238, 207]);
  
  const dataEncoder = codecs.struct([
    ['discriminator', codecs.bytes({ size: 8 })],
    ['serviceName', codecs.utf8()],
    ['description', codecs.utf8()],
    ['price', codecs.u64()],
    ['serviceType', codecs.u32()],
  ]);

  const accounts: (IAccountMeta | IAccountSignerMeta)[] = [
    {
      address: input.serviceListing,
      role: AccountRole.WRITABLE,
    },
    {
      address: input.agent.address,
      role: AccountRole.READONLY_SIGNER,
      signer: input.agent,
    } as IAccountSignerMeta,
    {
      address: input.payer.address,
      role: AccountRole.WRITABLE_SIGNER,
      signer: input.payer,
    } as IAccountSignerMeta,
    {
      address: input.systemProgram ?? address('11111111111111111111111111111111'),
      role: AccountRole.READONLY,
    },
  ];

  const data = dataEncoder.encode({
    discriminator,
    serviceName: input.serviceName,
    description: input.description,
    price: toBigInt(input.price),
    serviceType: input.serviceType,
  });

  return {
    programAddress: address(POD_COM_PROGRAM_ADDRESS),
    accounts,
    data,
  };
}

/**
 * Enhanced instruction builder for purchase service
 */
export function createPurchaseServiceInstruction(
  input: PurchaseServiceInput
): IInstruction {
  const discriminator = new Uint8Array([208, 10, 73, 119, 116, 36, 187, 117]);
  
  const dataEncoder = codecs.struct([
    ['discriminator', codecs.bytes({ size: 8 })],
    ['amount', codecs.u64()],
  ]);

  const accounts: (IAccountMeta | IAccountSignerMeta)[] = [
    {
      address: input.serviceListing,
      role: AccountRole.READONLY,
    },
    {
      address: input.purchaseOrder,
      role: AccountRole.WRITABLE,
    },
    {
      address: input.buyer.address,
      role: AccountRole.WRITABLE_SIGNER,
      signer: input.buyer,
    } as IAccountSignerMeta,
    {
      address: input.seller,
      role: AccountRole.WRITABLE,
    },
    {
      address: input.payer.address,
      role: AccountRole.WRITABLE_SIGNER,
      signer: input.payer,
    } as IAccountSignerMeta,
    {
      address: input.systemProgram ?? address('11111111111111111111111111111111'),
      role: AccountRole.READONLY,
    },
  ];

  const data = dataEncoder.encode({
    discriminator,
    amount: toBigInt(input.amount),
  });

  return {
    programAddress: address(POD_COM_PROGRAM_ADDRESS),
    accounts,
    data,
  };
}

/**
 * Instruction factory that provides all fixed instructions
 */
export const InstructionFactory = {
  verifyAgent: createVerifyAgentInstruction,
  createChannel: createCreateChannelInstruction,
  sendMessage: createSendMessageInstruction,
  createServiceListing: createCreateServiceListingInstruction,
  purchaseService: createPurchaseServiceInstruction,
} as const;

/**
 * Type-safe instruction builder
 */
export class FixedInstructionBuilder {
  /**
   * Create verify agent instruction
   */
  static verifyAgent(input: VerifyAgentInput): IInstruction {
    return createVerifyAgentInstruction(input);
  }

  /**
   * Create channel instruction
   */
  static createChannel(input: CreateChannelInput): IInstruction {
    return createCreateChannelInstruction(input);
  }

  /**
   * Send message instruction
   */
  static sendMessage(input: SendMessageInput): IInstruction {
    return createSendMessageInstruction(input);
  }

  /**
   * Create service listing instruction
   */
  static createServiceListing(input: CreateServiceListingInput): IInstruction {
    return createCreateServiceListingInstruction(input);
  }

  /**
   * Purchase service instruction
   */
  static purchaseService(input: PurchaseServiceInput): IInstruction {
    return createPurchaseServiceInstruction(input);
  }
}

/**
 * Export all instruction types and builders
 */
export type {
  VerifyAgentInput,
  CreateChannelInput,
  SendMessageInput,
  CreateServiceListingInput,
  PurchaseServiceInput,
};

export { InstructionFactory as Instructions };
export default FixedInstructionBuilder;