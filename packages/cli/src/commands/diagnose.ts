#!/usr/bin/env node

/**
 * CLI command for diagnosing account discriminator issues
 * 
 * Provides comprehensive tools to identify and resolve the
 * "Codec [fixCodecSize] expected 8 bytes, got 2" error.
 */

import { Command } from 'commander';
import { 
  diagnoseAccountFromChain,
  diagnoseBatchFromChain,
  getMigrationInstructions,
  exportDiagnosticReport,
  type DiagnosticReport,
  type BatchDiagnosticReport
} from '@ghostspeak/sdk';
import { initializeClient } from '../utils/client.js';
import type { DiagnoseOptions } from '../types/cli-types.js'
import { assertValidAddress } from '../types/cli-types.js';
import chalk from 'chalk';

const program = new Command();

program
  .name('ghost diagnose')
  .description('Diagnose and fix account discriminator issues')
  .version('1.0.0');

// Main diagnose command
program
  .command('account')
  .description('Diagnose a specific account')
  .argument('<address>', 'Account address to diagnose')
  .option('-n, --network <network>', 'Network to use (devnet, testnet, mainnet)', 'devnet')
  .option('-v, --verbose', 'Show detailed diagnostics')
  .option('-e, --export <filename>', 'Export results to JSON file')
  .action(async (address: string, options: DiagnoseOptions) => {
    try {
      console.log(chalk.blue(`🔍 Diagnosing account: ${address}`));
      console.log(chalk.gray(`Network: ${options.network ?? 'devnet'}`));
      console.log();

      const { client } = await initializeClient(options.network ?? 'devnet');
      const rpc = client.config.rpc;
      
      const report = await diagnoseAccountFromChain(rpc, assertValidAddress(address), { 
        logToConsole: options.verbose ?? false
      });

      displayAccountDiagnostics(report, options.verbose ?? false);

      if (options.export) {
        await exportDiagnosticReport(report, options.export);
        console.log(chalk.green(`✅ Report exported to ${options.export}`));
      }

    } catch (_) {
      console.error(chalk.red(`❌ Error: ${error instanceof Error ? _error.message : 'Unknown error'}`));
      process.exit(1);
    }
  });

// Batch diagnose command
program
  .command('batch')
  .description('Diagnose all accounts for a program')
  .argument('[programId]', 'Program ID to diagnose (defaults to GhostSpeak)')
  .option('-n, --network <network>', 'Network to use', 'devnet')
  .option('-v, --verbose', 'Show detailed diagnostics')
  .option('-c, --concurrent <number>', 'Number of concurrent requests', '10')
  .option('-e, --export <filename>', 'Export results to JSON file')
  .action(async (programId: string | undefined, options: DiagnoseOptions & { concurrent?: string }) => {
    try {
      console.log(chalk.blue(`🔍 Running batch diagnostics for ${programId ?? 'default program'}`));
      console.log(chalk.gray(`Network: ${options.network ?? 'devnet'}`));
      console.log();

      const { client } = await initializeClient(options.network ?? 'devnet');
      const rpc = client.config.rpc;
      
      const concurrentCount = options.concurrent ? parseInt(options.concurrent) : 10;
      const programIds = programId ? [assertValidAddress(programId)] : []
      const report = await diagnoseBatchFromChain(rpc, programIds, { 
        maxConcurrent: concurrentCount,
        logToConsole: false 
      });

      displayBatchReport(report, options.verbose ?? false);

      if (options.export) {
        await exportDiagnosticReport(report, options.export);
        console.log(chalk.green(`✅ Report exported to: ${options.export}`));
      }

    } catch (_) {
      console.error(chalk.red(`❌ Error: ${error instanceof Error ? _error.message : 'Unknown error'}`));
      process.exit(1);
    }
  });

// Check if all accounts are healthy
program
  .command('check-health')
  .description('Quick health check for all program accounts')
  .option('-n, --network <network>', 'Network to use', 'devnet')
  .action(async (options: Pick<DiagnoseOptions, 'network'>) => {
    try {
      console.log(chalk.blue('🏥 Running health check...'));
      
      const { client } = await initializeClient(options.network ?? 'devnet');
      const rpc = client.config.rpc;
      
      // Get all program accounts - assuming rpc has proper typing from SDK
      const accounts = await rpc.getProgramAccounts(client.config.programId!, {
        commitment: 'confirmed'
      }).send();
      
      console.log(chalk.gray(`Found ${accounts.length} accounts`));
      
      let healthy = 0;
      let unhealthy = 0;
      
      for (const { pubkey } of accounts) {
        try {
          const report = await diagnoseAccountFromChain(rpc, assertValidAddress(pubkey.toString()), {
            logToConsole: false
          });
          
          const isHealthy = report.discriminatorValidation.isValid && report.migrationPlan.migrationType === 'none';
          if (isHealthy) {
            healthy++;
          } else {
            unhealthy++;
          }
        } catch (_) {
          unhealthy++;
        }
      }
      
      console.log();
      console.log(chalk.green(`✅ Healthy accounts: ${healthy}`));
      console.log(chalk.red(`❌ Unhealthy accounts: ${unhealthy}`));
      console.log(chalk.blue(`📊 Health rate: ${((healthy / accounts.length) * 100).toFixed(1)}%`));
      
    } catch (_) {
      console.error(chalk.red(`❌ Error: ${error instanceof Error ? _error.message : 'Unknown error'}`));
      process.exit(1);
    }
  });

// Generate migration instructions
program
  .command('migrate')
  .description('Generate migration instructions for unhealthy accounts')
  .argument('<address>', 'Account address to migrate')
  .option('-n, --network <network>', 'Network to use', 'devnet')
  .option('-d, --dry-run', 'Show migration plan without executing')
  .action(async (address: string, options: Pick<DiagnoseOptions, 'network' | 'dryRun'>) => {
    try {
      console.log(chalk.blue(`🔄 Generating migration plan for: ${address}`));
      
      const { client } = await initializeClient(options.network ?? 'devnet');
      const rpc = client.config.rpc;
      
      // First diagnose the account to get migration plan
      const report = await diagnoseAccountFromChain(rpc, assertValidAddress(address), {
        logToConsole: false
      });
      
      if (report.migrationPlan.migrationType === 'none') {
        console.log(chalk.green('✅ Account is healthy, no migration needed'));
        return;
      }
      
      // Get migration instructions from the plan
      const instructions = getMigrationInstructions(report.migrationPlan);
      
      console.log(chalk.yellow(`⚠️  Migration needed: ${report.migrationPlan.migrationType}`));
      console.log(chalk.gray('\nMigration Instructions:'));
      
      if (options.dryRun) {
        console.log(chalk.gray('\n--- DRY RUN MODE ---'));
        instructions.forEach((instruction, i) => {
          console.log(chalk.blue(`\nStep ${i + 1}: ${instruction}`));
        });
      } else {
        console.log(chalk.yellow('\n⚠️  Migration execution not implemented yet'));
        console.log(chalk.gray('Use --dry-run to see migration plan'));
      }
      
    } catch (_) {
      console.error(chalk.red(`❌ Error: ${error instanceof Error ? _error.message : 'Unknown error'}`));
      process.exit(1);
    }
  });

// Helper function to display account diagnostics
function displayAccountDiagnostics(report: DiagnosticReport, verbose: boolean) {
  console.log(chalk.bold('\n📊 Diagnostic Report:'));
  console.log(chalk.gray('─'.repeat(50)));
  
  const isHealthy = report.discriminatorValidation.isValid && report.migrationPlan.migrationType === 'none';
  console.log(`Status: ${isHealthy ? chalk.green('✅ Healthy') : chalk.red('❌ Unhealthy')}`);
  console.log(`Address: ${chalk.cyan(report.address)}`);
  console.log(`Account Exists: ${report.accountExists ? chalk.green('Yes') : chalk.red('No')}`);
  console.log(`Discriminator Valid: ${report.discriminatorValidation.isValid ? chalk.green('Yes') : chalk.red('No')}`);
  
  if (report.discriminatorValidation.errorMessage) {
    console.log(chalk.red('\n⚠️  Validation Error:'));
    console.log(`  • ${report.discriminatorValidation.errorMessage}`);
  }
  
  if (verbose && report.debugInfo) {
    console.log(chalk.gray('\n🔍 Debug Info:'));
    console.log(`  Expected: [${report.debugInfo.expectedDiscriminator.join(', ')}]`);
    console.log(`  Actual: [${report.debugInfo.actualDiscriminator?.join(', ') ?? 'null'}]`);
    console.log(`  Data Preview: [${report.debugInfo.dataPreview.slice(0, 16).join(', ')}]...`);
  }
  
  if (report.recommendations.length > 0) {
    console.log(chalk.yellow('\n💡 Recommendations:'));
    report.recommendations.forEach(rec => {
      console.log(`  • ${rec}`);
    });
  }
}

// Helper function to display batch report
function displayBatchReport(report: BatchDiagnosticReport, verbose: boolean) {
  console.log(chalk.bold('\n📊 Batch Diagnostic Report:'));
  console.log(chalk.gray('─'.repeat(50)));
  
  console.log(`Total Accounts: ${chalk.cyan(report.summary.total)}`);
  console.log(`Valid: ${chalk.green(report.summary.valid)}`);
  console.log(`Invalid: ${chalk.red(report.summary.invalid)}`);
  console.log(`Needs Migration: ${chalk.yellow(report.summary.needsMigration)}`);
  console.log(`Not Exists: ${chalk.gray(report.summary.notExists)}`);
  console.log(`Health Rate: ${chalk.blue(((report.summary.valid / report.summary.total) * 100).toFixed(1))}%`);
  
  if (report.globalRecommendations.length > 0) {
    console.log(chalk.bold('\n📋 Global Recommendations:'));
    report.globalRecommendations.forEach(rec => {
      console.log(`  • ${rec}`);
    });
  }
  
  if (verbose && report.reports.length > 0) {
    console.log(chalk.red('\n❌ Invalid Account Details:'));
    report.reports
      .filter(r => !r.discriminatorValidation.isValid || r.migrationPlan.migrationType !== 'none')
      .forEach(r => {
        console.log(`  ${r.address}: ${r.discriminatorValidation.errorMessage ?? 'Needs migration'}`);
      });
  }
}

export default program;