/**
 * Instruction Error Handler
 * 
 * Provides detailed error messages for instruction account validation
 * using the generated instruction mappings from the IDL.
 */

import { 
  instructionAccountMappings,
  type InstructionMapping
} from '../generated/instruction-mappings.js'

interface ExpectedAccount {
  name: string
  pda: boolean
};

interface AccountInfo {
  name: string;
  pda: boolean;
}


/**
 * Enhanced error class for instruction validation errors
 */
export class InstructionValidationError extends Error {
  public readonly instruction: string;
  public readonly expectedAccounts: number;
  public readonly providedAccounts: number;
  public readonly accountDetails?: AccountInfo[];

  constructor(
    instruction: string,
    expectedAccounts: number,
    providedAccounts: number,
    message: string,
    accountDetails?: AccountInfo[]
  ) {
    super(message);
    this.name = 'InstructionValidationError';
    this.instruction = instruction;
    this.expectedAccounts = expectedAccounts;
    this.providedAccounts = providedAccounts;
    this.accountDetails = accountDetails;
  }
}

/**
 * Check if an instruction exists in our mappings
 */
export function isKnownInstruction(instructionName: string): boolean {
  return instructionName in instructionAccountMappings;
}

/**
 * Validate instruction accounts and throw detailed error if invalid
 */
export function validateInstructionAccounts(
  instructionName: string,
  providedAccounts: unknown[],
  accountNames?: string[]
): void {
  const mapping = getInstructionMapping(instructionName);
  
  if (!mapping) {
    throw new InstructionValidationError(
      instructionName,
      0,
      providedAccounts.length,
      `Unknown instruction: ${instructionName}. This instruction may not exist in the current IDL or may be misspelled.`,
    );
  }
  
  if (providedAccounts.length !== mapping.expectedAccounts.length) {
    const errorMessage = generateAccountValidationError(
      instructionName, 
      providedAccounts.length, 
      accountNames
    );
    
    throw new InstructionValidationError(
      instructionName,
      mapping.expectedAccounts.length,
      providedAccounts.length,
      errorMessage,
      mapping.expectedAccounts
    );
  }
}

/**
 * Create a helpful error message for account mismatch
 */
export function createAccountMismatchError(
  instructionName: string,
  providedCount: number,
  providedAccountNames?: string[]
): string {
  const mapping = getInstructionMapping(instructionName);
  
  if (!mapping) {
    return `Unknown instruction: ${instructionName}`;
  }
  
  if (providedCount === mapping.expectedAccounts.length) {
    return `Accounts are correctly provided for ${instructionName}`;
  }
  
  let error = `❌ Account validation failed for "${instructionName}"\n\n`;
  
  error += `📊 Expected: ${mapping.expectedAccounts.length} accounts\n`;
  error += `📊 Provided: ${providedCount} accounts\n\n`;
  
  error += `📋 Required accounts:\n`;
  mapping.expectedAccounts.forEach((account: ExpectedAccount, index: number) => {
    const attributes = [];
    if (account.pda) attributes.push('PDA');
    
    const attrStr = attributes.length > 0 ? ` (${attributes.join(', ')})` : '';
    error += `  ${index + 1}. ${account.name}${attrStr}\n`;
  });
  
  if (providedAccountNames && providedAccountNames.length > 0) {
    error += `\n📋 Provided accounts:\n`;
    providedAccountNames.forEach((name, index) => {
      error += `  ${index + 1}. ${name}\n`;
    });
  }
  
  if (mapping.docs) {
    error += `\n📖 Description: ${mapping.docs}\n`;
  }
  
  error += `\n💡 Tip: Make sure all required accounts are provided in the correct order.`;
  
  return error;
}

/**
 * Get human-readable account requirements for an instruction
 */
export function getAccountRequirements(instructionName: string): string {
  const mapping = getInstructionMapping(instructionName);
  
  if (!mapping) {
    return `Unknown instruction: ${instructionName}`;
  }
  
  let requirements = `${instructionName} requires ${mapping.expectedAccounts.length} accounts:\n\n`;
  
  mapping.expectedAccounts.forEach((account: ExpectedAccount, index: number) => {
    const attributes = [];
    if (account.pda) attributes.push('PDA-derived');
    
    const attrStr = attributes.length > 0 ? ` [${attributes.join(', ')}]` : '';
    requirements += `  ${index + 1}. ${account.name}${attrStr}\n`;
  });
  
  if (mapping.docs) {
    requirements += `\nDescription: ${mapping.docs}\n`;
  }
  
  return requirements;
}

/**
 * Get helpful suggestions for fixing account errors
 */
export function getAccountErrorSuggestions(
  instructionName: string,
  providedCount: number
): string[] {
  const mapping = getInstructionMapping(instructionName);
  
  if (!mapping) {
    return [
      `Check if "${instructionName}" is spelled correctly`,
      'Verify that the instruction exists in the current program version',
      'Review the IDL file for available instructions'
    ];
  }
  
  const expectedCount = mapping.expectedAccounts.length;
  const suggestions: string[] = [];
  
  if (providedCount < expectedCount) {
    suggestions.push(`Add ${expectedCount - providedCount} more account(s)`);
    suggestions.push('Check if any required accounts are missing');
  } else if (providedCount > expectedCount) {
    suggestions.push(`Remove ${providedCount - expectedCount} extra account(s)`);
    suggestions.push('Check for duplicate accounts');
  }
  
  suggestions.push(`Review the account order - accounts must be in the exact order specified`);
  suggestions.push(`Check PDAs are correctly derived`);
  
  return suggestions;
}

/**
 * Handle instruction errors with enhanced error messages
 */
export function handleInstructionError(
  error: Error,
  instructionName: string,
  accountCount?: number
): Error {
  if (error.message.includes('insufficient funds') || error.message.includes('account not found')) {
    return new InstructionValidationError(
      instructionName,
      0,
      accountCount ?? 0,
      `${error.message}\n\n${getAccountRequirements(instructionName)}`,
    );
  }
  
  return error;
}

/**
 * Get instruction mapping (exported for external use)
 */
export function getInstructionMapping(instructionName: string): InstructionMapping | null {
  return instructionAccountMappings[instructionName as keyof typeof instructionAccountMappings] ?? null;
}

/**
 * Generate account validation error message (exported for external use)
 */
export function generateAccountValidationError(
  instructionName: string, 
  providedCount: number, 
  accountNames?: string[]
): string {
  const mapping = getInstructionMapping(instructionName);
  if (!mapping) {
    return `Unknown instruction: ${instructionName}`;
  }
  
  let error = `Account mismatch for ${instructionName}: expected ${mapping.expectedAccounts.length} accounts, got ${providedCount}`;
  if (accountNames) {
    error += `. Provided: ${accountNames.join(', ')}`;
  }
  return error;
}

/**
 * Enhanced error message helper
 */
export function enhanceErrorMessage(error: Error, context: string): string {
  return `${error.message}\n\nContext: ${context}`;
}

/**
 * Debug instruction call helper
 */
export function debugInstructionCall(instructionName: string, accounts: unknown[]): string {
  return `Instruction: ${instructionName}\nAccounts: ${accounts.length}\nMapping: ${JSON.stringify(getInstructionMapping(instructionName), null, 2)}`;
}

/**
 * Get required signers for an instruction
 */
export function getRequiredSigners(instructionName: string): string[] {
  const mapping = getInstructionMapping(instructionName);
  if (!mapping) return [];
  
  return mapping.expectedAccounts
    .filter(account => account.name.includes('authority') || account.name.includes('signer'))
    .map(account => account.name);
}

/**
 * Get writable accounts for an instruction
 */
export function getWritableAccounts(instructionName: string): string[] {
  const mapping = getInstructionMapping(instructionName);
  if (!mapping) return [];
  
  // Return accounts that are likely writable (PDAs and data accounts)
  return mapping.expectedAccounts
    .filter(account => account.pda || account.name.includes('data') || account.name.includes('account'))
    .map(account => account.name);
}

/**
 * Get PDA accounts for an instruction
 */
export function getPDAAccounts(instructionName: string): string[] {
  const mapping = getInstructionMapping(instructionName);
  if (!mapping) return [];
  
  return mapping.expectedAccounts
    .filter(account => account.pda)
    .map(account => account.name);
}

/**
 * Instruction mappings constant for external access
 */
export const INSTRUCTION_MAPPINGS = instructionAccountMappings;