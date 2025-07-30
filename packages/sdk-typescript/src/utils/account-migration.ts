/**
 * Account Migration Utility
 * 
 * Handles migration of old Agent accounts that were created with
 * different discriminator formats to the current format.
 */

import type { EncodedAccount, MaybeEncodedAccount } from '@solana/kit';
import { 
  validateAccountDiscriminator, 
  inspectAccountData 
} from './discriminator-validator.js';

export interface MigrationPlan {
  address: string;
  currentState: 'valid' | 'needs_migration' | 'invalid' | 'not_exists';
  migrationType: 'none' | 'recreate' | 'data_conversion' | 'unsupported';
  issues: string[];
  recommendations: string[];
  canAutoMigrate: boolean;
}

export interface MigrationResult {
  success: boolean;
  address: string;
  action: 'skipped' | 'migrated' | 'failed';
  error?: string;
  newAccountData?: Uint8Array;
}

export interface LegacyAgentData {
  // Define potential old Agent format fields here
  // This would need to be updated based on actual legacy formats
  discriminator: Uint8Array;
  owner?: string;
  name?: string;
  // ... other legacy fields
}

/**
 * Analyzes an account and creates a migration plan
 */
export async function createMigrationPlan(
  encodedAccount: EncodedAccount | MaybeEncodedAccount,
  address: string
): Promise<MigrationPlan> {
  const plan: MigrationPlan = {
    address,
    currentState: 'not_exists',
    migrationType: 'none',
    issues: [],
    recommendations: [],
    canAutoMigrate: false
  };

  if (!('exists' in encodedAccount) || !encodedAccount.exists) {
    plan.recommendations.push('Account does not exist - no migration needed');
    return plan;
  }

  // Import the discriminator
  const { AGENT_DISCRIMINATOR } = await import('../generated/accounts/agent.js');
  const validation = validateAccountDiscriminator(encodedAccount.data, AGENT_DISCRIMINATOR);
  const inspection = inspectAccountData(encodedAccount, address);

  // Determine current state
  if (validation.isValid) {
    plan.currentState = 'valid';
    plan.recommendations.push('Account is already in the correct format');
    return plan;
  }

  if (validation.needsMigration) {
    plan.currentState = 'needs_migration';
    plan.issues.push(`Discriminator length mismatch: expected 8 bytes, got ${validation.actualLength} bytes`);
  } else {
    plan.currentState = 'invalid';
    plan.issues.push('Account has invalid or corrupted discriminator');
  }

  // Determine migration type based on data analysis
  if (inspection.discriminatorLength === 2) {
    // This is likely an old format with 2-byte discriminator
    plan.migrationType = 'recreate';
    plan.issues.push('Account uses legacy 2-byte discriminator format');
    plan.recommendations.push('Recreate account using current register_agent instruction');
    plan.recommendations.push('Export existing data first if valuable');
  } else if (inspection.discriminatorLength === 0) {
    // Account has no discriminator
    plan.migrationType = 'unsupported';
    plan.issues.push('Account has no discriminator - may not be an Agent account');
    plan.recommendations.push('Verify this is actually an Agent account');
  } else if (inspection.discriminatorLength < 8) {
    // Partial discriminator
    plan.migrationType = 'unsupported';
    plan.issues.push(`Partial discriminator detected (${inspection.discriminatorLength} bytes)`);
    plan.recommendations.push('Account data may be corrupted - consider recreation');
  } else {
    // Full 8-byte discriminator but wrong values
    plan.migrationType = 'data_conversion';
    plan.issues.push('Discriminator has correct length but wrong values');
    plan.recommendations.push('May be from a different program version');
    plan.recommendations.push('Check if this account belongs to the correct program');
  }

  // Determine if auto-migration is possible
  plan.canAutoMigrate = plan.migrationType === 'recreate' && inspection.dataLength > 8;

  return plan;
}

/**
 * Attempts to extract meaningful data from a legacy account
 */
export function extractLegacyData(
  encodedAccount: EncodedAccount | MaybeEncodedAccount
): LegacyAgentData | null {
  if (!('exists' in encodedAccount) || !encodedAccount.exists || !('data' in encodedAccount) || encodedAccount.data.length < 2) {
    return null;
  }

  const data = ('data' in encodedAccount) ? encodedAccount.data : new Uint8Array(0);
  
  try {
    // For accounts with 2-byte discriminator, try to extract what we can
    if (data.length >= 2) {
      return {
        discriminator: data.slice(0, 2),
        // Add more extraction logic here based on known legacy formats
        // This would need to be customized based on actual legacy account structures
      };
    }
  } catch (error) {
    console.warn('Failed to extract legacy data:', error);
  }

  return null;
}

/**
 * Creates a detailed migration report for multiple accounts
 */
export async function createMigrationReport(
  accounts: { address: string; encodedAccount: EncodedAccount | MaybeEncodedAccount }[]
): Promise<{
  summary: {
    total: number;
    valid: number;
    needsMigration: number;
    invalid: number;
    canAutoMigrate: number;
  };
  plans: MigrationPlan[];
  recommendations: string[];
}> {
  const plans = await Promise.all(accounts.map(({ address, encodedAccount }) => 
    createMigrationPlan(encodedAccount, address)
  ));

  const summary = {
    total: plans.length,
    valid: plans.filter(p => p.currentState === 'valid').length,
    needsMigration: plans.filter(p => p.currentState === 'needs_migration').length,
    invalid: plans.filter(p => p.currentState === 'invalid').length,
    canAutoMigrate: plans.filter(p => p.canAutoMigrate).length
  };

  const recommendations: string[] = [];

  if (summary.needsMigration > 0) {
    recommendations.push(`${summary.needsMigration} accounts need migration`);
  }

  if (summary.canAutoMigrate > 0) {
    recommendations.push(`${summary.canAutoMigrate} accounts can be auto-migrated`);
  }

  if (summary.invalid > 0) {
    recommendations.push(`${summary.invalid} accounts have invalid data and should be investigated`);
  }

  if (summary.needsMigration === 0 && summary.invalid === 0) {
    recommendations.push('All accounts are in the correct format');
  } else {
    recommendations.push('Consider running migration utilities to fix account format issues');
    recommendations.push('Backup important account data before migration');
  }

  return {
    summary,
    plans,
    recommendations
  };
}

/**
 * Simulates migration without actually performing it
 */
export async function simulateMigration(
  encodedAccount: EncodedAccount | MaybeEncodedAccount,
  address: string
): Promise<{
  plan: MigrationPlan;
  simulation: {
    wouldSucceed: boolean;
    estimatedSteps: string[];
    warnings: string[];
    requiredActions: string[];
  };
}> {
  const plan = await createMigrationPlan(encodedAccount, address);
  
  const simulation = {
    wouldSucceed: false,
    estimatedSteps: [] as string[],
    warnings: [] as string[],
    requiredActions: [] as string[]
  };

  if (plan.currentState === 'valid') {
    simulation.wouldSucceed = true;
    simulation.estimatedSteps.push('No migration needed - account is already valid');
    return { plan, simulation };
  }

  switch (plan.migrationType) {
    case 'recreate':
      simulation.estimatedSteps.push('1. Extract existing account data');
      simulation.estimatedSteps.push('2. Create new account with correct format');
      simulation.estimatedSteps.push('3. Transfer any salvageable data');
      simulation.estimatedSteps.push('4. Close old account');
      simulation.requiredActions.push('User must re-register the agent');
      simulation.warnings.push('Some data may be lost during recreation');
      simulation.wouldSucceed = plan.canAutoMigrate;
      break;

    case 'data_conversion':
      simulation.estimatedSteps.push('1. Analyze existing data format');
      simulation.estimatedSteps.push('2. Convert to new format');
      simulation.estimatedSteps.push('3. Update discriminator');
      simulation.warnings.push('Data conversion is experimental');
      simulation.requiredActions.push('Manual verification required');
      simulation.wouldSucceed = false;
      break;

    case 'unsupported':
      simulation.estimatedSteps.push('1. Manual investigation required');
      simulation.estimatedSteps.push('2. Determine if account is recoverable');
      simulation.warnings.push('Account may not be recoverable');
      simulation.requiredActions.push('Manual inspection and possible recreation');
      simulation.wouldSucceed = false;
      break;

    default:
      simulation.estimatedSteps.push('No migration strategy available');
      simulation.wouldSucceed = false;
  }

  return { plan, simulation };
}

/**
 * Provides user-friendly migration instructions
 */
export function getMigrationInstructions(plan: MigrationPlan): string[] {
  const instructions: string[] = [];

  switch (plan.migrationType) {
    case 'none':
      instructions.push('✅ No migration needed - your account is up to date');
      break;

    case 'recreate':
      instructions.push('🔄 Account Recreation Required:');
      instructions.push('1. Use the CLI command: `ghost agent register` to create a new account');
      instructions.push('2. Configure your agent with the same settings as before');
      instructions.push('3. The old account will be automatically replaced');
      instructions.push('⚠️  Note: You may need to re-verify your agent after recreation');
      break;

    case 'data_conversion':
      instructions.push('🔧 Data Conversion Required:');
      instructions.push('1. Contact support for assistance with account conversion');
      instructions.push('2. Manual intervention may be required');
      instructions.push('3. Backup your account data before proceeding');
      break;

    case 'unsupported':
      instructions.push('❌ Migration Not Supported:');
      instructions.push('1. This account cannot be automatically migrated');
      instructions.push('2. Consider creating a new account');
      instructions.push('3. Contact support if this account contains important data');
      break;
  }

  return instructions;
}