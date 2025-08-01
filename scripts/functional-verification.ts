#!/usr/bin/env bun

/**
 * GhostSpeak Functional Verification System
 * 
 * Tests that AI-generated code actually WORKS:
 * 1. Compilation testing
 * 2. On-chain deployment testing  
 * 3. Instruction execution testing
 * 4. Integration testing with existing codebase
 */

import { promises as fs } from 'fs';
import { execSync, spawn } from 'child_process';
import { join } from 'path';

interface FunctionalTestResult {
  file: string;
  testType: 'compilation' | 'deployment' | 'execution' | 'integration';
  success: boolean;
  issues: string[];
  performance?: {
    buildTime: number;
    computeUnits?: number;
    accountSpace?: number;
  };
  timestamp: string;
}

interface OnChainTestConfig {
  networkUrl: string;
  keypairPath: string;
  programId: string;
  testInstructions: string[];
}

class FunctionalVerifier {
  private testResults: FunctionalTestResult[] = [];
  private projectRoot: string;

  constructor() {
    this.projectRoot = process.cwd();
  }

  /**
   * PHASE 1: Compilation Testing
   * Ensures AI-generated code actually compiles
   */
  async testCompilation(): Promise<FunctionalTestResult[]> {
    console.log('🔨 Testing Compilation...');
    
    const results: FunctionalTestResult[] = [];
    
    // Test Rust program compilation
    const rustResult = await this.testRustCompilation();
    results.push(rustResult);
    
    // Test TypeScript SDK compilation
    const tsResult = await this.testTypeScriptCompilation();
    results.push(tsResult);
    
    return results;
  }

  private async testRustCompilation(): Promise<FunctionalTestResult> {
    const startTime = Date.now();
    const issues: string[] = [];
    
    try {
      console.log('  📦 Building Rust program...');
      
      // Run anchor build with error capture
      const buildOutput = execSync('anchor build 2>&1', { 
        cwd: this.projectRoot,
        encoding: 'utf-8',
        timeout: 120000 // 2 minute timeout
      });
      
      // Check for compilation warnings/errors
      if (buildOutput.includes('error:') || buildOutput.includes('failed to compile')) {
        issues.push('Compilation errors found in build output');
      }
      
      if (buildOutput.includes('warning:')) {
        issues.push('Compilation warnings detected');
      }
      
      // Check if program binary was actually created
      const programPath = join(this.projectRoot, 'target/deploy/ghostspeak_marketplace.so');
      try {
        await fs.access(programPath);
      } catch {
        issues.push('Program binary not generated - compilation may have failed silently');
      }
      
      console.log('  ✅ Rust compilation completed');
      
    } catch (error: any) {
      issues.push(`Rust compilation failed: ${error.message}`);
      console.log('  ❌ Rust compilation failed');
    }
    
    return {
      file: 'programs/src/',
      testType: 'compilation',
      success: issues.length === 0,
      issues,
      performance: {
        buildTime: Date.now() - startTime
      },
      timestamp: new Date().toISOString()
    };
  }

  private async testTypeScriptCompilation(): Promise<FunctionalTestResult> {
    const startTime = Date.now();
    const issues: string[] = [];
    
    try {
      console.log('  📦 Building TypeScript SDK...');
      
      // Test SDK compilation
      const buildOutput = execSync('bun run build 2>&1', { 
        cwd: join(this.projectRoot, 'packages/sdk-typescript'),
        encoding: 'utf-8',
        timeout: 60000 // 1 minute timeout
      });
      
      // Check for TypeScript errors
      if (buildOutput.includes('error TS') || buildOutput.includes('Build failed')) {
        issues.push('TypeScript compilation errors found');
      }
      
      // Check for type issues
      if (buildOutput.includes('Type \'any\'') && !buildOutput.includes('// @ts-ignore')) {
        issues.push('Improper any type usage detected');
      }
      
      // Verify dist output was created
      const distPath = join(this.projectRoot, 'packages/sdk-typescript/dist');
      try {
        await fs.access(distPath);
      } catch {
        issues.push('TypeScript dist output not generated');
      }
      
      console.log('  ✅ TypeScript compilation completed');
      
    } catch (error: any) {
      issues.push(`TypeScript compilation failed: ${error.message}`);
      console.log('  ❌ TypeScript compilation failed');
    }
    
    return {
      file: 'packages/sdk-typescript/src/',
      testType: 'compilation',
      success: issues.length === 0,
      issues,
      performance: {
        buildTime: Date.now() - startTime
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * PHASE 2: On-Chain Deployment Testing
   * Tests that compiled programs can actually deploy to Solana
   */
  async testOnChainDeployment(): Promise<FunctionalTestResult> {
    console.log('🚀 Testing On-Chain Deployment...');
    
    const startTime = Date.now();
    const issues: string[] = [];
    
    try {
      // Test deployment to devnet
      console.log('  📡 Deploying to devnet...');
      
      const deployOutput = execSync('anchor deploy --provider.cluster devnet 2>&1', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        timeout: 180000 // 3 minute timeout
      });
      
      // Check deployment success
      if (deployOutput.includes('Deploy success')) {
        console.log('  ✅ Deployment successful');
      } else if (deployOutput.includes('Error:') || deployOutput.includes('failed')) {
        issues.push('Deployment failed - program may have runtime issues');
      }
      
      // Extract program ID if successful
      const programIdMatch = deployOutput.match(/Program Id: ([A-Za-z0-9]{32,})/);
      if (programIdMatch) {
        console.log(`  📍 Program ID: ${programIdMatch[1]}`);
      } else {
        issues.push('Program ID not found in deployment output');
      }
      
    } catch (error: any) {
      issues.push(`Deployment failed: ${error.message}`);
      console.log('  ❌ Deployment failed');
    }
    
    return {
      file: 'programs/src/',
      testType: 'deployment',
      success: issues.length === 0,
      issues,
      performance: {
        buildTime: Date.now() - startTime
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * PHASE 3: Instruction Execution Testing
   * Tests that deployed instructions actually work with real transactions
   */
  async testInstructionExecution(): Promise<FunctionalTestResult[]> {
    console.log('⚡ Testing Instruction Execution...');
    
    const results: FunctionalTestResult[] = [];
    
    // Test critical instructions
    const criticalInstructions = [
      'register_agent',
      'update_agent', 
      'verify_agent'
    ];
    
    for (const instruction of criticalInstructions) {
      const result = await this.testSingleInstruction(instruction);
      results.push(result);
    }
    
    return results;
  }

  private async testSingleInstruction(instructionName: string): Promise<FunctionalTestResult> {
    console.log(`  🧪 Testing ${instructionName}...`);
    
    const startTime = Date.now();
    const issues: string[] = [];
    
    try {
      // Run anchor test for specific instruction
      const testOutput = execSync(`anchor test -- --grep "${instructionName}" 2>&1`, {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        timeout: 60000 // 1 minute per instruction
      });
      
      // Analyze test results
      if (testOutput.includes('passing') && !testOutput.includes('failing')) {
        console.log(`    ✅ ${instructionName} test passed`);
      } else {
        issues.push(`${instructionName} test failed or had errors`);
        console.log(`    ❌ ${instructionName} test failed`);
      }
      
      // Check for compute unit usage
      const computeMatch = testOutput.match(/consumed (\d+) of \d+ compute units/);
      const computeUnits = computeMatch ? parseInt(computeMatch[1]) : undefined;
      
      if (computeUnits && computeUnits > 200000) {
        issues.push(`High compute unit usage: ${computeUnits} CU`);
      }
      
    } catch (error: any) {
      issues.push(`Instruction test failed: ${error.message}`);
      console.log(`    ❌ ${instructionName} test execution failed`);
    }
    
    return {
      file: `programs/src/instructions/${instructionName}`,
      testType: 'execution',
      success: issues.length === 0,
      issues,
      performance: {
        buildTime: Date.now() - startTime
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * PHASE 4: Integration Testing
   * Tests that new code integrates properly with existing codebase
   */
  async testIntegration(): Promise<FunctionalTestResult> {
    console.log('🔗 Testing Integration...');
    
    const startTime = Date.now();
    const issues: string[] = [];
    
    try {
      // Run full test suite
      console.log('  🧪 Running full test suite...');
      
      const testOutput = execSync('anchor test 2>&1', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        timeout: 300000 // 5 minute timeout
      });
      
      // Check overall test results
      const passingMatch = testOutput.match(/(\d+) passing/);
      const failingMatch = testOutput.match(/(\d+) failing/);
      
      const passingCount = passingMatch ? parseInt(passingMatch[1]) : 0;
      const failingCount = failingMatch ? parseInt(failingMatch[1]) : 0;
      
      if (failingCount > 0) {
        issues.push(`${failingCount} tests failing - integration issues detected`);
      }
      
      if (passingCount === 0) {
        issues.push('No tests passing - major integration problems');
      }
      
      console.log(`  📊 Tests: ${passingCount} passing, ${failingCount} failing`);
      
      // Check for linting issues
      try {
        const lintOutput = execSync('bun run lint 2>&1', {
          cwd: this.projectRoot,
          encoding: 'utf-8',
          timeout: 30000
        });
        
        if (lintOutput.includes('error') || lintOutput.includes('✖')) {
          issues.push('ESLint errors detected - code quality issues');
        }
      } catch {
        issues.push('Linting failed - potential code quality issues');
      }
      
      // Check TypeScript type checking
      try {
        const typeCheckOutput = execSync('bun run type-check 2>&1', {
          cwd: join(this.projectRoot, 'packages/sdk-typescript'),
          encoding: 'utf-8',
          timeout: 30000
        });
        
        if (typeCheckOutput.includes('error TS')) {
          issues.push('TypeScript type errors detected');
        }
      } catch {
        issues.push('Type checking failed');
      }
      
    } catch (error: any) {
      issues.push(`Integration testing failed: ${error.message}`);
      console.log('  ❌ Integration testing failed');
    }
    
    return {
      file: 'entire_codebase',
      testType: 'integration',
      success: issues.length === 0,
      issues,
      performance: {
        buildTime: Date.now() - startTime
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate comprehensive functional verification report
   */
  async generateReport(): Promise<void> {
    console.log('📊 Generating Functional Verification Report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.testResults.length,
        passed: this.testResults.filter(r => r.success).length,
        failed: this.testResults.filter(r => !r.success).length,
        criticalIssues: this.testResults.filter(r => !r.success && r.testType === 'compilation').length
      },
      results: this.testResults,
      recommendations: this.generateRecommendations()
    };
    
    // Save to file
    await fs.writeFile(
      join(this.projectRoot, 'functional-verification-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    // Update TODO.md with functional results
    await this.updateTodoWithResults(report);
    
    console.log('✅ Functional verification report generated');
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const compilationIssues = this.testResults.filter(r => 
      r.testType === 'compilation' && !r.success
    );
    
    if (compilationIssues.length > 0) {
      recommendations.push('🚨 CRITICAL: Fix compilation issues before proceeding');
      recommendations.push('Define missing constants and imports');
    }
    
    const deploymentIssues = this.testResults.filter(r => 
      r.testType === 'deployment' && !r.success
    );
    
    if (deploymentIssues.length > 0) {
      recommendations.push('⚠️ Fix deployment issues - program cannot be used on-chain');
    }
    
    const executionIssues = this.testResults.filter(r => 
      r.testType === 'execution' && !r.success
    );
    
    if (executionIssues.length > 0) {
      recommendations.push('Fix instruction execution issues');
      recommendations.push('Review transaction parameters and account setup');
    }
    
    return recommendations;
  }

  private async updateTodoWithResults(report: any): Promise<void> {
    const todoPath = join(this.projectRoot, 'TODO.md');
    
    try {
      let todoContent = await fs.readFile(todoPath, 'utf-8');
      
      // Add functional verification section
      const functionalSection = `
## 🔧 Functional Verification Results (Latest)

**Last Run**: ${report.timestamp}
**Status**: ${report.summary.failed === 0 ? '✅ ALL TESTS PASSING' : '❌ ISSUES DETECTED'}

### Summary:
- **Total Tests**: ${report.summary.totalTests}
- **Passed**: ${report.summary.passed}
- **Failed**: ${report.summary.failed}
- **Critical Issues**: ${report.summary.criticalIssues}

### Critical Issues:
${report.results.filter((r: any) => !r.success).map((r: any) => 
  `- **${r.testType.toUpperCase()}**: ${r.file} - ${r.issues.join(', ')}`
).join('\n')}

### Recommendations:
${report.recommendations.map((r: string) => `- ${r}`).join('\n')}

---`;
      
      // Insert after verification metrics section
      todoContent = todoContent.replace(
        /---\n\n## Next Actions/,
        `${functionalSection}\n## Next Actions`
      );
      
      await fs.writeFile(todoPath, todoContent);
    } catch (error) {
      console.error('Failed to update TODO.md:', error);
    }
  }

  /**
   * Run complete functional verification suite
   */
  async runFullVerification(): Promise<void> {
    console.log('🚀 Starting GhostSpeak Functional Verification...\n');
    
    // Phase 1: Compilation
    const compilationResults = await this.testCompilation();
    this.testResults.push(...compilationResults);
    
    // Only proceed if compilation passes
    const compilationPassed = compilationResults.every(r => r.success);
    
    if (compilationPassed) {
      // Phase 2: Deployment  
      const deploymentResult = await this.testOnChainDeployment();
      this.testResults.push(deploymentResult);
      
      // Phase 3: Execution (only if deployment succeeds)
      if (deploymentResult.success) {
        const executionResults = await this.testInstructionExecution();
        this.testResults.push(...executionResults);
      }
      
      // Phase 4: Integration
      const integrationResult = await this.testIntegration();
      this.testResults.push(integrationResult);
    } else {
      console.log('❌ Compilation failed - skipping on-chain testing');
    }
    
    // Generate comprehensive report
    await this.generateReport();
    
    console.log('\n✅ Functional verification complete!');
    console.log(`📊 Results: ${this.testResults.filter(r => r.success).length}/${this.testResults.length} tests passed`);
  }
}

// Run functional verification if called directly
if (import.meta.main) {
  const verifier = new FunctionalVerifier();
  verifier.runFullVerification().catch(console.error);
}

export { FunctionalVerifier };