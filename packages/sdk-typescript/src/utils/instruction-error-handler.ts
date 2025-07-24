/**
 * Instruction Error Handler
 * 
 * Provides detailed error messages for instruction account validation
 * using the generated instruction mappings from the IDL.
 */

import { 
  INSTRUCTION_MAPPINGS, 
  AccountInfo,
  getInstructionMapping,
  generateAccountValidationError 
} from '../generated/instruction-mappings';

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
  return instructionName in INSTRUCTION_MAPPINGS;
}

/**
 * Validate instruction accounts and throw detailed error if invalid
 */
export function validateInstructionAccounts(
  instructionName: string,
  providedAccounts: any[],
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
  
  if (providedAccounts.length !== mapping.expectedAccounts) {
    const errorMessage = generateAccountValidationError(
      instructionName, 
      providedAccounts.length, 
      accountNames
    );
    
    throw new InstructionValidationError(
      instructionName,
      mapping.expectedAccounts,
      providedAccounts.length,
      errorMessage,
      mapping.accounts
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
  
  if (providedCount === mapping.expectedAccounts) {
    return `Accounts are correctly provided for ${instructionName}`;
  }
  
  let error = `❌ Account validation failed for "${instructionName}"\n\n`;
  
  error += `📊 Expected: ${mapping.expectedAccounts} accounts\n`;
  error += `📊 Provided: ${providedCount} accounts\n\n`;
  
  error += `📋 Required accounts:\n`;
  mapping.accounts.forEach((account, index) => {
    const attributes = [];
    if (account.writable) attributes.push('writable');
    if (account.signer) attributes.push('signer');
    if (account.optional) attributes.push('optional');
    if (account.address) attributes.push('fixed address');
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
  
  if (mapping.docs && mapping.docs.length > 0) {
    error += `\n📖 Description: ${mapping.docs.join(' ')}\n`;
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
  
  let requirements = `${instructionName} requires ${mapping.expectedAccounts} accounts:\n\n`;
  
  mapping.accounts.forEach((account, index) => {
    const attributes = [];
    if (account.writable) attributes.push('writable');
    if (account.signer) attributes.push('signer');
    if (account.optional) attributes.push('optional');
    if (account.address) attributes.push(`fixed: ${account.address}`);
    if (account.pda) attributes.push('PDA-derived');
    
    const attrStr = attributes.length > 0 ? ` [${attributes.join(', ')}]` : '';
    requirements += `${index + 1}. ${account.name}${attrStr}\n`;
    
    if (account.docs && account.docs.length > 0) {
      requirements += `   → ${account.docs.join(' ')}\n`;
    }
  });
  
  if (mapping.docs && mapping.docs.length > 0) {
    requirements += `\nDescription: ${mapping.docs.join(' ')}`;
  }
  
  return requirements;
}

/**
 * Check if instruction requires specific account types
 */
export function getRequiredSigners(instructionName: string): string[] {
  const mapping = getInstructionMapping(instructionName);
  if (!mapping) return [];
  
  return mapping.accounts
    .filter(account => account.signer)
    .map(account => account.name);
}

export function getWritableAccounts(instructionName: string): string[] {
  const mapping = getInstructionMapping(instructionName);
  if (!mapping) return [];
  
  return mapping.accounts
    .filter(account => account.writable)
    .map(account => account.name);
}

export function getPDAAccounts(instructionName: string): string[] {
  const mapping = getInstructionMapping(instructionName);
  if (!mapping) return [];
  
  return mapping.accounts
    .filter(account => account.pda)
    .map(account => account.name);
}

/**
 * Replace generic error messages with detailed ones
 */
export function enhanceErrorMessage(error: Error, instructionName?: string): Error {
  const message = error.message;
  
  // Handle common Anchor/Solana error patterns
  if (message.includes('Not enough accounts') || 
      message.includes('insufficient accounts') ||
      message.includes('account length mismatch')) {
    
    if (instructionName && isKnownInstruction(instructionName)) {
      const mapping = getInstructionMapping(instructionName);
      if (mapping) {
        const enhancedMessage = `${message}\n\n${getAccountRequirements(instructionName)}`;
        return new InstructionValidationError(
          instructionName,
          mapping.expectedAccounts,
          0, // We don't know the provided count from the generic error
          enhancedMessage,
          mapping.accounts
        );
      }
    }
  }
  
  // Handle discriminator errors
  if (message.includes('Invalid instruction discriminator') || 
      message.includes('unknown instruction')) {
    
    const availableInstructions = Object.keys(INSTRUCTION_MAPPINGS).sort().slice(0, 10);
    const suggestion = `\n\nAvailable instructions include: ${availableInstructions.join(', ')}...`;
    return new Error(message + suggestion);
  }
  
  return error;
}

/**
 * Utility to help debug instruction calls
 */
export function debugInstructionCall(instructionName: string, accounts: any[]): void {
  const mapping = getInstructionMapping(instructionName);
  
  console.log(`🔍 Debugging instruction: ${instructionName}`);
  
  if (!mapping) {
    console.log(`❌ Unknown instruction: ${instructionName}`);
    return;
  }
  
  console.log(`📊 Expected accounts: ${mapping.expectedAccounts}`);
  console.log(`📊 Provided accounts: ${accounts.length}`);
  console.log(`✅ Match: ${mapping.expectedAccounts === accounts.length ? 'YES' : 'NO'}`);
  
  console.log('\n📋 Account mapping:');
  mapping.accounts.forEach((expectedAccount, index) => {
    const providedAccount = accounts[index];
    const status = providedAccount ? '✅' : '❌';
    
    console.log(`  ${status} ${index + 1}. ${expectedAccount.name} ${providedAccount ? `(${providedAccount.toString().slice(0, 8)}...)` : '(missing)'}`);
  });
  
  if (mapping.docs && mapping.docs.length > 0) {
    console.log(`\n📖 Description: ${mapping.docs.join(' ')}`);
  }
}

// Export all functions and mappings for easy access
export {
  INSTRUCTION_MAPPINGS,
  getInstructionMapping,
  generateAccountValidationError
};