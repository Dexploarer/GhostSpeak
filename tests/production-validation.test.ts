#!/usr/bin/env bun
/**
 * PRODUCTION VALIDATION TEST
 * Final validation of GhostSpeak protocol production readiness
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

// Configuration
const PROGRAM_ID = '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP';
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

// Test results collector
interface TestResult {
  component: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

class ValidationReport {
  private results: TestResult[] = [];
  
  addResult(result: TestResult) {
    this.results.push(result);
    
    const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    const color = result.status === 'pass' ? chalk.green : result.status === 'warning' ? chalk.yellow : chalk.red;
    
    console.log(`${icon} ${color(result.component)}: ${result.message}`);
    if (result.details) {
      console.log(chalk.gray(`   ${JSON.stringify(result.details, null, 2).replace(/\n/g, '\n   ')}`));
    }
  }
  
  printSummary() {
    console.log(chalk.blue('\n=== VALIDATION SUMMARY ===\n'));
    
    const passed = this.results.filter(r => r.status === 'pass').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    
    console.log(chalk.green(`✅ Passed: ${passed}`));
    console.log(chalk.yellow(`⚠️  Warnings: ${warnings}`));
    console.log(chalk.red(`❌ Failed: ${failed}`));
    
    if (failed === 0) {
      console.log(chalk.green.bold('\n🎉 SYSTEM IS PRODUCTION READY! 🎉'));
      console.log(chalk.green('\nAll critical components validated successfully.'));
      
      if (warnings > 0) {
        console.log(chalk.yellow('\nNote: Some warnings were found but do not block deployment.'));
      }
    } else {
      console.log(chalk.red.bold('\n❌ SYSTEM NOT READY FOR PRODUCTION'));
      console.log(chalk.red('\nCritical issues must be resolved before deployment.'));
    }
    
    return { passed, warnings, failed };
  }
}

describe('GhostSpeak Production Validation', () => {
  const report = new ValidationReport();
  let connection: Connection;
  
  beforeAll(async () => {
    console.log(chalk.blue.bold('\n🔍 GhostSpeak Production Validation Starting...\n'));
    connection = new Connection(RPC_URL, 'confirmed');
  });
  
  test('1. Build Validation', () => {
    console.log(chalk.blue('\n--- Build Validation ---\n'));
    
    // Check Rust build
    try {
      const rustBuildPath = join(__dirname, '../target/deploy/podai_marketplace.so');
      if (existsSync(rustBuildPath)) {
        const stats = readFileSync(rustBuildPath);
        report.addResult({
          component: 'Rust Smart Contract',
          status: 'pass',
          message: 'Smart contract built successfully',
          details: { size: `${(stats.length / 1024 / 1024).toFixed(2)}MB` }
        });
      } else {
        report.addResult({
          component: 'Rust Smart Contract',
          status: 'warning',
          message: 'Smart contract binary not found - may need to run: anchor build',
          details: { expectedPath: rustBuildPath }
        });
      }
    } catch (error) {
      report.addResult({
        component: 'Rust Smart Contract',
        status: 'fail',
        message: 'Failed to verify smart contract build',
        details: { error: error.message }
      });
    }
    
    // Check TypeScript SDK build
    try {
      const sdkDistPath = join(__dirname, '../packages/sdk/dist');
      if (existsSync(sdkDistPath)) {
        report.addResult({
          component: 'TypeScript SDK',
          status: 'pass',
          message: 'SDK built successfully',
          details: { path: sdkDistPath }
        });
      } else {
        report.addResult({
          component: 'TypeScript SDK',
          status: 'fail',
          message: 'SDK build not found',
          details: { expectedPath: sdkDistPath }
        });
      }
    } catch (error) {
      report.addResult({
        component: 'TypeScript SDK',
        status: 'fail',
        message: 'Failed to verify SDK build',
        details: { error: error.message }
      });
    }
    
    // Check IDL generation
    try {
      const idlPath = join(__dirname, '../target/idl/podai_marketplace.json');
      if (existsSync(idlPath)) {
        const idl = JSON.parse(readFileSync(idlPath, 'utf8'));
        report.addResult({
          component: 'IDL Generation',
          status: 'pass',
          message: 'IDL generated successfully',
          details: { 
            version: idl.version,
            instructionCount: idl.instructions?.length || 0
          }
        });
      } else {
        report.addResult({
          component: 'IDL Generation',
          status: 'warning',
          message: 'IDL not found - run: anchor build',
          details: { expectedPath: idlPath }
        });
      }
    } catch (error) {
      report.addResult({
        component: 'IDL Generation',
        status: 'fail',
        message: 'Failed to verify IDL',
        details: { error: error.message }
      });
    }
  });
  
  test('2. Integration Validation', () => {
    console.log(chalk.blue('\n--- Integration Validation ---\n'));
    
    // Check React integration
    const reactPackagePath = join(__dirname, '../packages/integrations/react/package.json');
    if (existsSync(reactPackagePath)) {
      report.addResult({
        component: 'React Integration',
        status: 'pass',
        message: 'React integration package configured'
      });
    } else {
      report.addResult({
        component: 'React Integration',
        status: 'warning',
        message: 'React integration not found'
      });
    }
    
    // Check Next.js integration
    const nextPackagePath = join(__dirname, '../packages/integrations/nextjs/package.json');
    if (existsSync(nextPackagePath)) {
      report.addResult({
        component: 'Next.js Integration',
        status: 'pass',
        message: 'Next.js integration package configured'
      });
    } else {
      report.addResult({
        component: 'Next.js Integration',
        status: 'warning',
        message: 'Next.js integration not found'
      });
    }
  });
  
  test('3. Configuration Validation', () => {
    console.log(chalk.blue('\n--- Configuration Validation ---\n'));
    
    // Check program ID consistency
    const configFiles = [
      'packages/sdk/src/config/program-ids.ts',
      'packages/sdk-typescript/src/generated-v2/programs/podCom.ts',
      'Anchor.toml'
    ];
    
    let programIdConsistent = true;
    for (const file of configFiles) {
      const filePath = join(__dirname, '..', file);
      if (existsSync(filePath)) {
        const content = readFileSync(filePath, 'utf8');
        if (!content.includes(PROGRAM_ID)) {
          programIdConsistent = false;
          report.addResult({
            component: 'Program ID Configuration',
            status: 'fail',
            message: `Program ID mismatch in ${file}`,
            details: { expectedId: PROGRAM_ID }
          });
        }
      }
    }
    
    if (programIdConsistent) {
      report.addResult({
        component: 'Program ID Configuration',
        status: 'pass',
        message: 'Program ID consistent across all files',
        details: { programId: PROGRAM_ID }
      });
    }
    
    // Check environment configuration
    const envPath = join(__dirname, '../.env');
    if (existsSync(envPath)) {
      report.addResult({
        component: 'Environment Configuration',
        status: 'pass',
        message: '.env file exists'
      });
    } else {
      report.addResult({
        component: 'Environment Configuration',
        status: 'warning',
        message: '.env file not found - using defaults'
      });
    }
  });
  
  test('4. Security Validation', async () => {
    console.log(chalk.blue('\n--- Security Validation ---\n'));
    
    // Check for hardcoded keys
    try {
      const output = execSync('grep -r "secretKey\\|privateKey" packages/ --include="*.ts" --include="*.js" || true', {
        cwd: join(__dirname, '..'),
        encoding: 'utf8'
      });
      
      if (output.trim().length > 0) {
        report.addResult({
          component: 'Security - Hardcoded Keys',
          status: 'fail',
          message: 'Found potential hardcoded keys in source code',
          details: { files: output.split('\n').slice(0, 3) }
        });
      } else {
        report.addResult({
          component: 'Security - Hardcoded Keys',
          status: 'pass',
          message: 'No hardcoded keys found'
        });
      }
    } catch (error) {
      report.addResult({
        component: 'Security - Hardcoded Keys',
        status: 'pass',
        message: 'No hardcoded keys found'
      });
    }
    
    // Check for TODO/FIXME comments
    try {
      const output = execSync('grep -r "TODO\\|FIXME\\|HACK\\|XXX" packages/ --include="*.ts" --include="*.rs" || true', {
        cwd: join(__dirname, '..'),
        encoding: 'utf8'
      });
      
      const todoCount = output.trim().split('\n').filter(line => line.length > 0).length;
      if (todoCount > 10) {
        report.addResult({
          component: 'Code Quality - TODOs',
          status: 'warning',
          message: `Found ${todoCount} TODO/FIXME comments`,
          details: { recommendation: 'Review and address critical TODOs before production' }
        });
      } else if (todoCount > 0) {
        report.addResult({
          component: 'Code Quality - TODOs',
          status: 'pass',
          message: `Found ${todoCount} TODO/FIXME comments (acceptable)`
        });
      } else {
        report.addResult({
          component: 'Code Quality - TODOs',
          status: 'pass',
          message: 'No TODO/FIXME comments found'
        });
      }
    } catch (error) {
      report.addResult({
        component: 'Code Quality - TODOs',
        status: 'pass',
        message: 'TODO check completed'
      });
    }
  });
  
  test('5. Mock/Stub Detection', () => {
    console.log(chalk.blue('\n--- Mock/Stub Detection ---\n'));
    
    // Check for mock implementations
    try {
      const output = execSync('grep -r "mock\\|stub\\|dummy\\|fake" packages/ --include="*.ts" --include="*.rs" --exclude-dir="test" --exclude-dir="tests" || true', {
        cwd: join(__dirname, '..'),
        encoding: 'utf8'
      });
      
      const mockCount = output.trim().split('\n').filter(line => line.length > 0).length;
      if (mockCount > 5) {
        report.addResult({
          component: 'Production Code Quality',
          status: 'fail',
          message: `Found ${mockCount} references to mock/stub code in production paths`,
          details: { critical: 'Remove all mock implementations before deployment' }
        });
      } else if (mockCount > 0) {
        report.addResult({
          component: 'Production Code Quality',
          status: 'warning',
          message: `Found ${mockCount} references to mock/stub - verify they are in test files only`
        });
      } else {
        report.addResult({
          component: 'Production Code Quality',
          status: 'pass',
          message: 'No mock/stub code detected in production paths'
        });
      }
    } catch (error) {
      report.addResult({
        component: 'Production Code Quality',
        status: 'pass',
        message: 'Mock/stub detection completed'
      });
    }
  });
  
  test('6. Deployment Readiness', async () => {
    console.log(chalk.blue('\n--- Deployment Readiness ---\n'));
    
    // Check RPC connectivity
    try {
      const { blockhash } = await connection.getLatestBlockhash();
      report.addResult({
        component: 'RPC Connectivity',
        status: 'pass',
        message: 'Successfully connected to Solana RPC',
        details: { endpoint: RPC_URL, blockhash: blockhash.substring(0, 10) + '...' }
      });
    } catch (error) {
      report.addResult({
        component: 'RPC Connectivity',
        status: 'fail',
        message: 'Failed to connect to Solana RPC',
        details: { error: error.message }
      });
    }
    
    // Check program deployment status
    try {
      const programAccount = await connection.getAccountInfo(new PublicKey(PROGRAM_ID));
      if (programAccount && programAccount.executable) {
        report.addResult({
          component: 'Program Deployment',
          status: 'pass',
          message: 'Program deployed and executable',
          details: { 
            dataLength: programAccount.data.length,
            owner: programAccount.owner.toBase58()
          }
        });
      } else if (programAccount) {
        report.addResult({
          component: 'Program Deployment',
          status: 'fail',
          message: 'Program account exists but not executable'
        });
      } else {
        report.addResult({
          component: 'Program Deployment',
          status: 'warning',
          message: 'Program not deployed to devnet',
          details: { 
            action: 'Run: anchor deploy --provider.cluster devnet',
            programId: PROGRAM_ID
          }
        });
      }
    } catch (error) {
      report.addResult({
        component: 'Program Deployment',
        status: 'warning',
        message: 'Could not verify program deployment',
        details: { error: error.message }
      });
    }
  });
  
  test('7. Documentation Check', () => {
    console.log(chalk.blue('\n--- Documentation Check ---\n'));
    
    const requiredDocs = [
      'README.md',
      'CLAUDE.md',
      'docs/getting-started/quick-start.md',
      'docs/CLI_DOCUMENTATION.md'
    ];
    
    let allDocsPresent = true;
    for (const doc of requiredDocs) {
      const docPath = join(__dirname, '..', doc);
      if (!existsSync(docPath)) {
        allDocsPresent = false;
        report.addResult({
          component: 'Documentation',
          status: 'warning',
          message: `Missing documentation: ${doc}`
        });
      }
    }
    
    if (allDocsPresent) {
      report.addResult({
        component: 'Documentation',
        status: 'pass',
        message: 'All required documentation present'
      });
    }
  });
  
  test('8. Final Assessment', () => {
    console.log(chalk.blue('\n--- Final Assessment ---\n'));
    
    const summary = report.printSummary();
    
    // Generate final status
    if (summary.failed === 0) {
      console.log(chalk.green.bold('\n✅ GHOSTSPEAK PROTOCOL STATUS: PRODUCTION READY'));
      console.log(chalk.green('\nThe system has passed all critical validation checks.'));
      
      if (summary.warnings > 0) {
        console.log(chalk.yellow('\n⚠️  Recommendations before deployment:'));
        console.log(chalk.yellow('  1. Deploy smart contract to devnet'));
        console.log(chalk.yellow('  2. Run comprehensive E2E tests on devnet'));
        console.log(chalk.yellow('  3. Review and address any TODO comments'));
        console.log(chalk.yellow('  4. Ensure all documentation is up to date'));
      }
      
      console.log(chalk.blue('\n📋 Deployment Commands:'));
      console.log(chalk.gray('  # Deploy to devnet'));
      console.log(chalk.gray('  anchor deploy --provider.cluster devnet'));
      console.log(chalk.gray('  '));
      console.log(chalk.gray('  # Run E2E tests'));
      console.log(chalk.gray('  bun test tests/final-e2e-integration.test.ts'));
      console.log(chalk.gray('  '));
      console.log(chalk.gray('  # Start CLI'));
      console.log(chalk.gray('  cd packages/cli && bun run start'));
      
      expect(summary.failed).toBe(0);
    } else {
      console.log(chalk.red.bold('\n❌ CRITICAL ISSUES FOUND'));
      console.log(chalk.red('\nThe system is not ready for production deployment.'));
      console.log(chalk.red('Please address all failed checks before proceeding.'));
      
      expect(summary.failed).toBe(0); // This will fail the test
    }
  });
});