/**
 * Instruction name to error code mappings
 * Generated from IDL
 */

export const INSTRUCTION_ERROR_MESSAGES: Record<string, Record<number, string>> = {
  registerAgent: {
    4100: 'The declared program id does not match the actual program id',
    6000: 'Invalid metadata URI format',
    6001: 'Agent already exists',
    6002: 'Invalid agent type',
    6003: 'Metadata URI too long',
  },
  createServiceListing: {
    6010: 'Invalid service price',
    6011: 'Service already exists',
    6012: 'Agent not found',
    6013: 'Agent not active',
  },
  createEscrow: {
    6020: 'Invalid escrow amount',
    6021: 'Service not found',
    6022: 'Insufficient funds',
    6023: 'Escrow already exists',
  },
  // Add more instruction mappings as needed
};

export const GENERIC_ERROR_MESSAGES: Record<number, string> = {
  4100: 'The declared program id does not match the actual program id',
  6000: 'Invalid instruction data',
  6001: 'Invalid account data',
  6002: 'Account not initialized',
  6003: 'Account already initialized',
  6004: 'Insufficient funds',
  6005: 'Invalid authority',
  6006: 'Invalid signer',
  6007: 'Account mismatch',
};

// Types for instruction mappings
export interface AccountInfo {
  name: string;
  type: string;
  required: boolean;
  signer?: boolean;
  writable?: boolean;
  optional?: boolean;
  address?: string;
  pda?: boolean;
  docs?: string[];
}

export interface InstructionMapping {
  name: string;
  expectedAccounts: number;
  accounts: AccountInfo[];
  docs?: string[];
}

// Instruction mappings based on generated code
export const INSTRUCTION_MAPPINGS: Record<string, InstructionMapping> = {
  registerAgent: {
    name: 'registerAgent',
    expectedAccounts: 5,
    accounts: [
      { name: 'agentAccount', type: 'PublicKey', required: true, writable: true },
      { name: 'userRegistry', type: 'PublicKey', required: true, writable: true },
      { name: 'signer', type: 'Signer', required: true, signer: true },
      { name: 'systemProgram', type: 'PublicKey', required: true },
      { name: 'clock', type: 'PublicKey', required: true },
    ],
    docs: ['Register a new AI agent']
  },
  createServiceListing: {
    name: 'createServiceListing',
    expectedAccounts: 5,
    accounts: [
      { name: 'serviceListing', type: 'PublicKey', required: true, writable: true },
      { name: 'agent', type: 'PublicKey', required: true },
      { name: 'creator', type: 'Signer', required: true, signer: true },
      { name: 'systemProgram', type: 'PublicKey', required: true },
      { name: 'clock', type: 'PublicKey', required: true },
    ],
    docs: ['Create a new service listing']
  },
  createEscrow: {
    name: 'createEscrow',
    expectedAccounts: 6,
    accounts: [
      { name: 'escrow', type: 'PublicKey', required: true, writable: true },
      { name: 'client', type: 'Signer', required: true, signer: true },
      { name: 'provider', type: 'PublicKey', required: true },
      { name: 'systemProgram', type: 'PublicKey', required: true },
      { name: 'tokenProgram', type: 'PublicKey', required: true },
      { name: 'clock', type: 'PublicKey', required: true },
    ],
    docs: ['Create a new escrow']
  },
};

// Helper functions
export function getInstructionMapping(instructionName: string): InstructionMapping | undefined {
  return INSTRUCTION_MAPPINGS[instructionName];
}

export function generateAccountValidationError(
  instructionName: string,
  providedCount: number,
  accountNames?: string[]
): string {
  const mapping = INSTRUCTION_MAPPINGS[instructionName];
  
  if (!mapping) {
    return `Unknown instruction: ${instructionName}`;
  }
  
  let error = `Account count mismatch for ${instructionName}: expected ${mapping.expectedAccounts}, got ${providedCount}`;
  
  if (accountNames && accountNames.length > 0) {
    error += `\n\nProvided accounts: ${accountNames.join(', ')}`;
  }
  
  error += `\n\nExpected accounts:\n`;
  mapping.accounts.forEach((account, index) => {
    error += `  ${index + 1}. ${account.name} (${account.type})`;
    if (account.signer) error += ' [signer]';
    if (account.writable) error += ' [writable]';
    error += '\n';
  });
  
  return error;
}