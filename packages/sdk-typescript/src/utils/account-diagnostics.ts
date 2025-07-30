/**
 * Account Diagnostics Utility
 * 
 * Comprehensive diagnostic tools for inspecting and debugging
 * account discriminator issues and data format problems.
 */

import type { 
  Address, 
  EncodedAccount, 
  MaybeEncodedAccount,
  fetchEncodedAccount
} from '@solana/kit';
import { 
  validateAccountDiscriminator, 
  inspectAccountData, 
  type AccountInspectionResult 
} from './discriminator-validator.js';
import { 
  createMigrationPlan, 
  simulateMigration,
  getMigrationInstructions 
} from './account-migration.js';
import { AGENT_DISCRIMINATOR } from '../generated/accounts/agent.js';

export interface DiagnosticReport {
  address: string;
  timestamp: string;
  accountExists: boolean;
  discriminatorValidation: ReturnType<typeof validateAccountDiscriminator>;
  inspection: AccountInspectionResult;
  migrationPlan: Awaited<ReturnType<typeof createMigrationPlan>>;
  migrationSimulation: Awaited<ReturnType<typeof simulateMigration>>;
  recommendations: string[];
  debugInfo: {
    expectedDiscriminator: number[];
    actualDiscriminator: number[] | null;
    dataPreview: number[];
    programId?: string;
  };
}

export interface BatchDiagnosticReport {
  summary: {
    total: number;
    valid: number;
    invalid: number;
    needsMigration: number;
    notExists: number;
  };
  reports: DiagnosticReport[];
  globalRecommendations: string[];
  timestamp: string;
}

/**
 * Runs comprehensive diagnostics on a single account
 */
export async function runAccountDiagnostics(
  encodedAccount: EncodedAccount | MaybeEncodedAccount,
  address: string
): Promise<DiagnosticReport> {
  const timestamp = new Date().toISOString();
  const accountExists = ('exists' in encodedAccount) && encodedAccount.exists;
  
  let discriminatorValidation, inspection, migrationPlan, migrationSimulation;
  
  if (accountExists) {
    // Import the discriminator
    const { AGENT_DISCRIMINATOR } = await import('../generated/accounts/agent.js');
    discriminatorValidation = validateAccountDiscriminator(encodedAccount.data, AGENT_DISCRIMINATOR);
    inspection = inspectAccountData(encodedAccount, address);
    migrationPlan = await createMigrationPlan(encodedAccount, address);
    migrationSimulation = await simulateMigration(encodedAccount, address);
  } else {
    // Default values for non-existent accounts
    discriminatorValidation = {
      isValid: false,
      actualLength: 0,
      expectedLength: 8,
      canDecode: false,
      needsMigration: false,
      errorMessage: 'Account does not exist'
    };
    inspection = {
      address,
      dataLength: 0,
      discriminator: null,
      discriminatorLength: 0,
      isAgentAccount: false,
      needsMigration: false,
      rawData: new Uint8Array(0)
    };
    migrationPlan = {
      address,
      currentState: 'not_exists' as const,
      migrationType: 'none' as const,
      issues: ['Account does not exist'],
      recommendations: ['Create account using register_agent instruction'],
      canAutoMigrate: false
    };
    migrationSimulation = {
      plan: migrationPlan,
      simulation: {
        wouldSucceed: false,
        estimatedSteps: ['Account must be created first'],
        warnings: [],
        requiredActions: ['Use register_agent instruction']
      }
    };
  }

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (!accountExists) {
    recommendations.push('Account does not exist - create using register_agent');
  } else if (discriminatorValidation.isValid) {
    recommendations.push('Account is valid - no action needed');
  } else {
    recommendations.push(...getMigrationInstructions(migrationPlan));
  }

  // Create debug info
  const debugInfo = {
    expectedDiscriminator: Array.from(AGENT_DISCRIMINATOR),
    actualDiscriminator: inspection.discriminator ? Array.from(inspection.discriminator) : null,
    dataPreview: Array.from(inspection.rawData.slice(0, 32)),
    programId: (accountExists && ('owner' in encodedAccount) ? encodedAccount.owner : undefined) as string | undefined
  };

  return {
    address,
    timestamp,
    accountExists,
    discriminatorValidation,
    inspection,
    migrationPlan,
    migrationSimulation,
    recommendations,
    debugInfo
  };
}

/**
 * Runs diagnostics on multiple accounts
 */
export async function runBatchDiagnostics(
  accounts: { address: string; encodedAccount: EncodedAccount | MaybeEncodedAccount }[]
): Promise<BatchDiagnosticReport> {
  const timestamp = new Date().toISOString();
  const reports = await Promise.all(accounts.map(({ address, encodedAccount }) => 
    runAccountDiagnostics(encodedAccount, address)
  ));

  const summary = {
    total: reports.length,
    valid: reports.filter(r => r.accountExists && r.discriminatorValidation.isValid).length,
    invalid: reports.filter(r => r.accountExists && !r.discriminatorValidation.isValid).length,
    needsMigration: reports.filter(r => r.migrationPlan.currentState === 'needs_migration').length,
    notExists: reports.filter(r => !r.accountExists).length
  };

  const globalRecommendations: string[] = [];
  
  if (summary.notExists > 0) {
    globalRecommendations.push(`${summary.notExists} accounts need to be created`);
  }
  if (summary.needsMigration > 0) {
    globalRecommendations.push(`${summary.needsMigration} accounts need migration`);
  }
  if (summary.invalid > 0) {
    globalRecommendations.push(`${summary.invalid} accounts have data issues`);
  }
  if (summary.valid === summary.total) {
    globalRecommendations.push('All accounts are healthy');
  }

  return {
    summary,
    reports,
    globalRecommendations,
    timestamp
  };
}

/**
 * Fetches and diagnoses an account directly from the blockchain
 */
export async function diagnoseAccountFromChain(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  address: Address,
  options?: { logToConsole?: boolean }
): Promise<DiagnosticReport> {
  try {
    const encodedAccount = await fetchEncodedAccount(rpc, address);
    const report = await runAccountDiagnostics(encodedAccount, address);
    
    if (options?.logToConsole) {
      console.group(`🔍 Account Diagnostics: ${address}`);
      console.log('Exists:', report.accountExists);
      console.log('Valid:', report.discriminatorValidation.isValid);
      console.log('Needs Migration:', report.migrationPlan.currentState === 'needs_migration');
      console.log('Recommendations:');
      report.recommendations.forEach(rec => console.log(`  - ${rec}`));
      
      if (!report.discriminatorValidation.isValid) {
        console.log('Issues:');
        if (Array.isArray(report.migrationPlan.issues)) {
          report.migrationPlan.issues.forEach((issue: string) => console.log(`  - ${issue}`));
        }
      }
      
      console.groupEnd();
    }
    
    return report;
  } catch (err) {
    console.error(`Failed to diagnose account ${address}:`, err);
    
    // Return a diagnostic report for the error case
    return {
      address,
      timestamp: new Date().toISOString(),
      accountExists: false,
      discriminatorValidation: {
        isValid: false,
        actualLength: 0,
        expectedLength: 8,
        canDecode: false,
        needsMigration: false,
        errorMessage: `Failed to fetch account: ${err instanceof Error ? err.message : String(err)}`
      },
      inspection: {
        address,
        dataLength: 0,
        discriminator: null,
        discriminatorLength: 0,
        isAgentAccount: false,
        needsMigration: false,
        rawData: new Uint8Array(0)
      },
      migrationPlan: {
        address,
        currentState: 'invalid',
        migrationType: 'unsupported',
        issues: [`Failed to fetch account: ${err instanceof Error ? err.message : String(err)}`],
        recommendations: ['Check network connection and account address'],
        canAutoMigrate: false
      },
      migrationSimulation: {
        plan: {
          address,
          currentState: 'invalid',
          migrationType: 'unsupported',
          issues: [`Failed to fetch account: ${err instanceof Error ? err.message : String(err)}`],
          recommendations: ['Check network connection and account address'],
          canAutoMigrate: false
        },
        simulation: {
          wouldSucceed: false,
          estimatedSteps: ['Fix network connectivity issues'],
          warnings: ['Account could not be fetched'],
          requiredActions: ['Verify account address and network connection']
        }
      },
      recommendations: ['Check network connection and account address'],
      debugInfo: {
        expectedDiscriminator: Array.from(AGENT_DISCRIMINATOR),
        actualDiscriminator: null,
        dataPreview: [],
        programId: undefined
      }
    };
  }
}

/**
 * Fetches and diagnoses multiple accounts from the blockchain
 */
export async function diagnoseBatchFromChain(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  addresses: Address[],
  options?: { 
    logToConsole?: boolean;
    maxConcurrent?: number;
  }
): Promise<BatchDiagnosticReport> {
  const maxConcurrent = options?.maxConcurrent ?? 10;
  const reports: DiagnosticReport[] = [];
  
  // Process accounts in batches to avoid overwhelming the RPC
  for (let i = 0; i < addresses.length; i += maxConcurrent) {
    const batch = addresses.slice(i, i + maxConcurrent);
    const batchPromises = batch.map(address => 
      diagnoseAccountFromChain(rpc, address, { logToConsole: false })
    );
    
    const batchReports = await Promise.allSettled(batchPromises);
    
    for (const result of batchReports) {
      if (result.status === 'fulfilled') {
        reports.push(result.value);
      } else {
        console.error('Failed to diagnose account:', result.reason);
        // Add a fallback report for failed fetches
        reports.push({
          address: 'unknown',
          timestamp: new Date().toISOString(),
          accountExists: false,
          discriminatorValidation: {
            isValid: false,
            actualLength: 0,
            expectedLength: 8,
            canDecode: false,
            needsMigration: false,
            errorMessage: 'Failed to fetch account'
          },
          inspection: {
            address: 'unknown',
            dataLength: 0,
            discriminator: null,
            discriminatorLength: 0,
            isAgentAccount: false,
            needsMigration: false,
            rawData: new Uint8Array(0)
          },
          migrationPlan: {
            address: 'unknown',
            currentState: 'invalid',
            migrationType: 'unsupported',
            issues: ['Failed to fetch account'],
            recommendations: ['Check network connection'],
            canAutoMigrate: false
          },
          migrationSimulation: {
            plan: {
              address: 'unknown',
              currentState: 'invalid' as const,
              migrationType: 'unsupported' as const,
              issues: ['Failed to fetch account'],
              recommendations: ['Check network connection'],
              canAutoMigrate: false
            },
            simulation: {
              wouldSucceed: false,
              estimatedSteps: ['Fix fetch issues'],
              warnings: ['Account could not be fetched'],
              requiredActions: ['Check network']
            }
          },
          recommendations: ['Check network connection'],
          debugInfo: {
            expectedDiscriminator: Array.from(AGENT_DISCRIMINATOR),
            actualDiscriminator: null,
            dataPreview: [],
            programId: undefined
          }
        });
      }
    }
  }

  const batchReport = await runBatchDiagnostics(
    reports.map(report => ({
      address: report.address,
      encodedAccount: {
        exists: report.accountExists,
        data: report.inspection.rawData,
        address: report.address,
        owner: report.debugInfo.programId ?? '',
        executable: false,
        lamports: 0n,
        programAddress: report.debugInfo.programId ?? '',
        space: report.inspection.rawData.length
      } as unknown as EncodedAccount
    }))
  );

  if (options?.logToConsole) {
    console.group('🔍 Batch Diagnostics Summary');
    console.log('Total accounts:', batchReport.summary.total);
    console.log('Valid accounts:', batchReport.summary.valid);
    console.log('Invalid accounts:', batchReport.summary.invalid);
    console.log('Need migration:', batchReport.summary.needsMigration);
    console.log('Do not exist:', batchReport.summary.notExists);
    console.log('Global recommendations:');
    batchReport.globalRecommendations.forEach(rec => console.log(`  - ${rec}`));
    console.groupEnd();
  }

  return batchReport;
}

/**
 * Exports a diagnostic report as JSON
 */
export function exportDiagnosticReport(
  report: DiagnosticReport | BatchDiagnosticReport,
  filename?: string
): string {
  const json = JSON.stringify(report, null, 2);
  
  if (filename) {
    // In a browser environment, you might want to trigger a download
    // In Node.js, you might want to write to file
    console.log(`Diagnostic report would be saved as: ${filename}`);
    console.log('Report data:', json);
  }
  
  return json;
}