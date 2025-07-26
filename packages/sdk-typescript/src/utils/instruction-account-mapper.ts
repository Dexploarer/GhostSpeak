/**
 * Instruction Account Mapper
 * 
 * Parses the GhostSpeak IDL and creates a comprehensive mapping of all instructions
 * and their expected account structures. This helps generate proper error messages
 * instead of generic "Not enough accounts" errors.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface AccountInfo {
  name: string;
  writable?: boolean;
  signer?: boolean;
  optional?: boolean;
  docs?: string[];
  address?: string;
  pda?: {
    seeds: unknown[];
  };
}

export interface InstructionMapping {
  name: string;
  expectedAccounts: number;
  accounts: AccountInfo[];
  docs?: string[];
  discriminator: number[];
  args?: unknown[];
}

// IDL types
interface IdlAccount {
  name: string;
  writable?: boolean;
  signer?: boolean;
  optional?: boolean;
  docs?: string[];
  address?: string;
  pda?: {
    seeds: unknown[];
  };
}

interface IdlInstruction {
  name: string;
  accounts?: IdlAccount[];
  docs?: string[];
  discriminator?: number[];
  args?: unknown[];
}

interface Idl {
  instructions?: IdlInstruction[];
}

export interface InstructionAccountMap {
  [instructionName: string]: InstructionMapping;
}

/**
 * Parse the IDL file and create instruction-to-account mappings
 */
export function parseIdlInstructions(idlPath?: string): InstructionAccountMap {
  const defaultIdlPath = path.join(__dirname, '../../../../../target/idl/ghostspeak_marketplace.json');
  const resolvedPath = idlPath ?? defaultIdlPath;
  
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`IDL file not found at: ${resolvedPath}`);
  }
  
  const idlContent = fs.readFileSync(resolvedPath, 'utf8');
  const idl = JSON.parse(idlContent) as Idl;
  
  const instructionMap: InstructionAccountMap = {};
  
  const instructions = idl.instructions ?? [];
  
  for (const instruction of instructions) {
    const name = instruction.name;
    
    // Skip export instructions
    if (name.startsWith('_export_')) {
      continue;
    }
    
    const accounts = instruction.accounts ?? [];
    const accountInfos: AccountInfo[] = accounts.map((account: IdlAccount) => ({
      name: account.name,
      writable: account.writable ?? false,
      signer: account.signer ?? false,
      optional: account.optional ?? false,
      docs: account.docs ?? [],
      address: account.address,
      pda: account.pda
    }));
    
    instructionMap[name] = {
      name,
      expectedAccounts: accounts.length,
      accounts: accountInfos,
      docs: instruction.docs ?? [],
      discriminator: instruction.discriminator ?? [],
      args: instruction.args ?? []
    };
  }
  
  return instructionMap;
}

/**
 * Get instruction mapping for a specific instruction
 */
export function getInstructionMapping(instructionName: string): InstructionMapping | null {
  const mappings = parseIdlInstructions();
  return mappings[instructionName] || null;
}

/**
 * Generate a detailed error message for account validation
 */
export function generateAccountValidationError(
  instructionName: string, 
  providedAccounts: number,
  accountNames?: string[]
): string {
  const mapping = getInstructionMapping(instructionName);
  
  if (!mapping) {
    return `Unknown instruction: ${instructionName}`;
  }
  
  if (providedAccounts === mapping.expectedAccounts) {
    return `Correct number of accounts provided for ${instructionName}`;
  }
  
  const expectedNames = mapping.accounts.map(acc => 
    `${acc.name}${acc.writable ? ' (writable)' : ''}${acc.signer ? ' (signer)' : ''}`
  ).join(', ');
  
  let error = `Invalid account count for instruction "${instructionName}":\n`;
  error += `  Expected: ${mapping.expectedAccounts} accounts\n`;
  error += `  Provided: ${providedAccounts} accounts\n`;
  error += `  Required accounts: [${expectedNames}]`;
  
  if (accountNames && accountNames.length > 0) {
    error += `\n  Provided accounts: [${accountNames.join(', ')}]`;
  }
  
  if (mapping.docs && mapping.docs.length > 0) {
    error += `\n  Description: ${mapping.docs.join(' ')}`;
  }
  
  return error;
}

/**
 * Validate account structure for an instruction
 */
export function validateInstructionAccounts(
  instructionName: string,
  providedAccounts: unknown[]
): { isValid: boolean; error?: string } {
  const mapping = getInstructionMapping(instructionName);
  
  if (!mapping) {
    return {
      isValid: false,
      error: `Unknown instruction: ${instructionName}`
    };
  }
  
  if (providedAccounts.length !== mapping.expectedAccounts) {
    return {
      isValid: false,
      error: generateAccountValidationError(instructionName, providedAccounts.length)
    };
  }
  
  // Additional validation can be added here for account types, signatures, etc.
  
  return { isValid: true };
}

/**
 * Get all available instruction names
 */
export function getAllInstructionNames(): string[] {
  const mappings = parseIdlInstructions();
  return Object.keys(mappings).sort();
}

/**
 * Get commonly used instructions with their mappings
 */
export function getCommonInstructions(): InstructionAccountMap {
  const allMappings = parseIdlInstructions();
  const commonInstructionNames = [
    'create_service_listing',
    'create_escrow',
    'activate_agent',
    'apply_to_job',
    'register_agent',
    'create_job_posting',
    'submit_work_delivery',
    'process_payment',
    'complete_escrow',
    'create_channel',
    'send_message',
    'place_auction_bid',
    'finalize_auction',
    'file_dispute',
    'resolve_dispute'
  ];
  
  const commonMappings: InstructionAccountMap = {};
  for (const name of commonInstructionNames) {
    if (allMappings[name]) {
      commonMappings[name] = allMappings[name];
    }
  }
  
  return commonMappings;
}

/**
 * Export instruction mappings to JSON for debugging
 */
export function exportInstructionMappings(outputPath?: string): void {
  const mappings = parseIdlInstructions();
  const output = outputPath ?? path.join(__dirname, '../../../../../instruction-mappings.json');
  
  fs.writeFileSync(output, JSON.stringify(mappings, null, 2));
  console.log(`Instruction mappings exported to: ${output}`);
}

// Default export
export default {
  parseIdlInstructions,
  getInstructionMapping,
  generateAccountValidationError,
  validateInstructionAccounts,
  getAllInstructionNames,
  getCommonInstructions,
  exportInstructionMappings
};