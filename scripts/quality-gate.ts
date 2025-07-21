#!/usr/bin/env tsx

import { program } from 'commander';
import chalk from 'chalk';
import { GhostSpeakLogger } from './logger.js';
import { SecurityAuditor } from './security-audit.js';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

interface QualityMetrics {
  linting: {
    passed: boolean;
    errors: number;
    warnings: number;
    details?: string;
  };
  typeChecking: {
    passed: boolean;
    errors: number;
    details?: string;
  };
  formatting: {
    passed: boolean;
    issues: number;
    details?: string;
  };
  testing: {
    passed: boolean;
    coverage?: number;
    tests: {
      total: number;
      passed: number;
      failed: number;
    };
    details?: string;
  };
  security: {
    passed: boolean;
    critical: number;
    high: number;
    medium: number;
    low: number;
    details?: string;
  };
  performance: {
    passed: boolean;
    buildTime?: number;
    bundleSize?: number;
    details?: string;
  };
  documentation: {
    passed: boolean;
    coverage?: number;
    details?: string;
  };
}

interface QualityGateConfig {
  thresholds: {
    linting: {
      maxErrors: number;
      maxWarnings: number;
    };
    typeChecking: {
      maxErrors: number;
    };
    formatting: {
      maxIssues: number;
    };
    testing: {
      minCoverage: number;
      minPassRate: number;
    };
    security: {
      maxCritical: number;
      maxHigh: number;
    };
    performance: {
      maxBuildTime: number; // seconds
      maxBundleSize: number; // MB
    };
    documentation: {
      minCoverage: number;
    };
  };
  required: string[]; // Required checks that must pass
  optional: string[]; // Optional checks that generate warnings
}

interface QualityGateResult {
  passed: boolean;
  timestamp: string;
  metrics: QualityMetrics;
  config: QualityGateConfig;
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    skippedChecks: number;
  };
  recommendations: string[];
}

class QualityGate {
  private logger: GhostSpeakLogger;
  private config: QualityGateConfig;
  private metrics: QualityMetrics;

  constructor(config?: QualityGateConfig) {
    this.logger = new GhostSpeakLogger('QUALITY_GATE');
    this.config = config || this.getDefaultConfig();
    this.metrics = this.initializeMetrics();
  }

  private getDefaultConfig(): QualityGateConfig {
    return {
      thresholds: {
        linting: {
          maxErrors: 0,
          maxWarnings: 50
        },
        typeChecking: {
          maxErrors: 0
        },
        formatting: {
          maxIssues: 0
        },
        testing: {
          minCoverage: 80,
          minPassRate: 95
        },
        security: {
          maxCritical: 0,
          maxHigh: 2
        },
        performance: {
          maxBuildTime: 300, // 5 minutes
          maxBundleSize: 10 // 10MB
        },
        documentation: {
          minCoverage: 70
        }
      },
      required: ['linting', 'typeChecking', 'security', 'testing'],
      optional: ['formatting', 'performance', 'documentation']
    };
  }

  private initializeMetrics(): QualityMetrics {
    return {
      linting: { passed: false, errors: 0, warnings: 0 },
      typeChecking: { passed: false, errors: 0 },
      formatting: { passed: false, issues: 0 },
      testing: { 
        passed: false, 
        tests: { total: 0, passed: 0, failed: 0 }
      },
      security: { 
        passed: false, 
        critical: 0, 
        high: 0, 
        medium: 0, 
        low: 0 
      },
      performance: { passed: false },
      documentation: { passed: false }
    };
  }

  private async execCommand(command: string, description: string, allowFailure = false): Promise<string> {
    this.logger.debug(`Running: ${command}`);
    
    try {
      const output = execSync(command, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 120000 // 2 minutes
      });
      
      this.logger.debug(`${description} succeeded`);
      return output;
    } catch (error) {
      const errorOutput = error instanceof Error && 'stdout' in error 
        ? (error as any).stdout || (error as any).stderr 
        : String(error);
      
      if (!allowFailure) {
        this.logger.error(`${description} failed`, error);
      } else {
        this.logger.warn(`${description} failed (expected)`, { output: errorOutput });
      }
      
      throw error;
    }
  }

  private async runLintingCheck(): Promise<void> {
    this.logger.info('Running linting checks');
    
    try {
      // TypeScript linting
      const tsLintOutput = await this.execCommand(
        'npm run lint:ts -- --format json',
        'TypeScript linting',
        true
      );

      // Parse ESLint JSON output
      try {
        const lintResults = JSON.parse(tsLintOutput);
        let totalErrors = 0;
        let totalWarnings = 0;

        if (Array.isArray(lintResults)) {
          for (const result of lintResults) {
            totalErrors += result.errorCount || 0;
            totalWarnings += result.warningCount || 0;
          }
        }

        this.metrics.linting = {
          passed: totalErrors <= this.config.thresholds.linting.maxErrors &&
                  totalWarnings <= this.config.thresholds.linting.maxWarnings,
          errors: totalErrors,
          warnings: totalWarnings,
          details: `TypeScript: ${totalErrors} errors, ${totalWarnings} warnings`
        };
      } catch (parseError) {
        // Fallback to simple output parsing
        const errorCount = (tsLintOutput.match(/error/gi) || []).length;
        const warningCount = (tsLintOutput.match(/warning/gi) || []).length;
        
        this.metrics.linting = {
          passed: errorCount <= this.config.thresholds.linting.maxErrors &&
                  warningCount <= this.config.thresholds.linting.maxWarnings,
          errors: errorCount,
          warnings: warningCount,
          details: `TypeScript: ${errorCount} errors, ${warningCount} warnings (parsed)`
        };
      }

      // Rust linting
      try {
        await this.execCommand('npm run lint:rust', 'Rust linting');
        this.metrics.linting.details += ' | Rust: passed';
      } catch (error) {
        this.metrics.linting.passed = false;
        this.metrics.linting.details += ' | Rust: failed';
      }

    } catch (error) {
      this.metrics.linting = {
        passed: false,
        errors: 999,
        warnings: 0,
        details: 'Linting check failed to execute'
      };
    }
  }

  private async runTypeCheckingCheck(): Promise<void> {
    this.logger.info('Running type checking');
    
    try {
      // Root type check
      await this.execCommand('npm run type-check:root', 'Root TypeScript type checking');
      
      // Packages type check
      await this.execCommand('npm run type-check:packages', 'Packages TypeScript type checking');
      
      this.metrics.typeChecking = {
        passed: true,
        errors: 0,
        details: 'All TypeScript type checks passed'
      };
    } catch (error) {
      const errorOutput = String(error);
      const errorCount = (errorOutput.match(/error TS/g) || []).length;
      
      this.metrics.typeChecking = {
        passed: errorCount <= this.config.thresholds.typeChecking.maxErrors,
        errors: errorCount,
        details: `TypeScript type checking found ${errorCount} errors`
      };
    }
  }

  private async runFormattingCheck(): Promise<void> {
    this.logger.info('Running format checking');
    
    try {
      // Rust formatting check
      await this.execCommand('npm run qa:format-check', 'Code formatting check');
      
      this.metrics.formatting = {
        passed: true,
        issues: 0,
        details: 'Code formatting is consistent'
      };
    } catch (error) {
      const errorOutput = String(error);
      const issueCount = (errorOutput.match(/Diff in/g) || []).length;
      
      this.metrics.formatting = {
        passed: issueCount <= this.config.thresholds.formatting.maxIssues,
        issues: issueCount,
        details: `Found ${issueCount} formatting issues`
      };
    }
  }

  private async runTestingCheck(): Promise<void> {
    this.logger.info('Running testing checks');
    
    try {
      // Unit tests with coverage
      const testOutput = await this.execCommand(
        'npm run test:coverage -- --reporter=json',
        'Unit tests with coverage',
        true
      );

      // Parse test results
      try {
        const testResult = JSON.parse(testOutput.split('\n').find(line => line.includes('"numTotalTests"')) || '{}');
        
        const total = testResult.numTotalTests || 0;
        const passed = testResult.numPassedTests || 0;
        const failed = testResult.numFailedTests || 0;
        
        const passRate = total > 0 ? (passed / total) * 100 : 0;
        
        // Parse coverage (simplified)
        const coverageMatch = testOutput.match(/Statements\s+:\s+([0-9.]+)%/);
        const coverage = coverageMatch ? parseFloat(coverageMatch[1]) : 0;

        this.metrics.testing = {
          passed: passRate >= this.config.thresholds.testing.minPassRate &&
                  coverage >= this.config.thresholds.testing.minCoverage,
          coverage,
          tests: { total, passed, failed },
          details: `Tests: ${passed}/${total} passed (${passRate.toFixed(1)}%), Coverage: ${coverage}%`
        };
      } catch (parseError) {
        // Fallback parsing
        this.metrics.testing = {
          passed: !testOutput.includes('FAIL') && !testOutput.includes('failed'),
          tests: { total: 1, passed: 1, failed: 0 },
          details: 'Tests executed (unable to parse detailed results)'
        };
      }
    } catch (error) {
      this.metrics.testing = {
        passed: false,
        tests: { total: 0, passed: 0, failed: 1 },
        details: 'Testing check failed to execute'
      };
    }
  }

  private async runSecurityCheck(): Promise<void> {
    this.logger.info('Running security audit');
    
    try {
      const auditor = new SecurityAuditor();
      const report = await auditor.runFullAudit();
      
      this.metrics.security = {
        passed: report.summary.critical <= this.config.thresholds.security.maxCritical &&
                report.summary.high <= this.config.thresholds.security.maxHigh,
        critical: report.summary.critical,
        high: report.summary.high,
        medium: report.summary.medium,
        low: report.summary.low,
        details: `Security: ${report.summary.critical} critical, ${report.summary.high} high, ${report.summary.medium} medium issues`
      };
    } catch (error) {
      this.metrics.security = {
        passed: false,
        critical: 999,
        high: 999,
        medium: 0,
        low: 0,
        details: 'Security audit failed to execute'
      };
    }
  }

  private async runPerformanceCheck(): Promise<void> {
    this.logger.info('Running performance checks');
    
    const buildStartTime = Date.now();
    
    try {
      // Build performance
      await this.execCommand('npm run build:all', 'Full project build');
      const buildTime = (Date.now() - buildStartTime) / 1000;
      
      // Check bundle sizes (simplified)
      let bundleSize = 0;
      try {
        const distDir = path.join(process.cwd(), 'packages', 'sdk-typescript', 'dist');
        const files = await fs.readdir(distDir, { recursive: true });
        
        for (const file of files as string[]) {
          if (typeof file === 'string' && file.endsWith('.js')) {
            const filePath = path.join(distDir, file);
            const stats = await fs.stat(filePath);
            bundleSize += stats.size;
          }
        }
        
        bundleSize = bundleSize / (1024 * 1024); // Convert to MB
      } catch (error) {
        this.logger.warn('Could not calculate bundle size');
      }

      this.metrics.performance = {
        passed: buildTime <= this.config.thresholds.performance.maxBuildTime &&
                bundleSize <= this.config.thresholds.performance.maxBundleSize,
        buildTime,
        bundleSize,
        details: `Build: ${buildTime.toFixed(1)}s, Bundle: ${bundleSize.toFixed(2)}MB`
      };
    } catch (error) {
      const buildTime = (Date.now() - buildStartTime) / 1000;
      
      this.metrics.performance = {
        passed: false,
        buildTime,
        details: 'Performance check failed'
      };
    }
  }

  private async runDocumentationCheck(): Promise<void> {
    this.logger.info('Running documentation checks');
    
    try {
      // Count documented vs undocumented functions/classes (simplified)
      const tsFiles = await this.findTypeScriptFiles();
      let totalItems = 0;
      let documentedItems = 0;

      for (const file of tsFiles) {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // Look for function/class/interface declarations
          if (line.match(/^(export\s+)?(function|class|interface)\s+/)) {
            totalItems++;
            
            // Check if previous lines contain JSDoc comment
            let hasDoc = false;
            for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
              if (lines[j].includes('/**') || lines[j].includes('*') || lines[j].includes('//')) {
                hasDoc = true;
                break;
              }
              if (lines[j].trim() && !lines[j].includes('*')) {
                break;
              }
            }
            
            if (hasDoc) {
              documentedItems++;
            }
          }
        }
      }

      const coverage = totalItems > 0 ? (documentedItems / totalItems) * 100 : 100;

      this.metrics.documentation = {
        passed: coverage >= this.config.thresholds.documentation.minCoverage,
        coverage,
        details: `Documentation: ${documentedItems}/${totalItems} items documented (${coverage.toFixed(1)}%)`
      };
    } catch (error) {
      this.metrics.documentation = {
        passed: false,
        coverage: 0,
        details: 'Documentation check failed'
      };
    }
  }

  private async findTypeScriptFiles(): Promise<string[]> {
    const files: string[] = [];
    const excludeDirs = ['node_modules', 'dist', 'build', 'coverage'];
    
    async function walkDir(dir: string): Promise<void> {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory() && !excludeDirs.includes(entry.name)) {
            await walkDir(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.ts')) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Directory not accessible
      }
    }

    await walkDir(process.cwd());
    return files;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (!this.metrics.linting.passed) {
      recommendations.push(`Fix ${this.metrics.linting.errors} linting errors and reduce ${this.metrics.linting.warnings} warnings`);
    }

    if (!this.metrics.typeChecking.passed) {
      recommendations.push(`Resolve ${this.metrics.typeChecking.errors} TypeScript type errors`);
    }

    if (!this.metrics.formatting.passed) {
      recommendations.push(`Run 'npm run lint:fix' to fix ${this.metrics.formatting.issues} formatting issues`);
    }

    if (!this.metrics.testing.passed) {
      if (this.metrics.testing.coverage && this.metrics.testing.coverage < this.config.thresholds.testing.minCoverage) {
        recommendations.push(`Increase test coverage to at least ${this.config.thresholds.testing.minCoverage}% (currently ${this.metrics.testing.coverage}%)`);
      }
      const passRate = (this.metrics.testing.tests.passed / this.metrics.testing.tests.total) * 100;
      if (passRate < this.config.thresholds.testing.minPassRate) {
        recommendations.push(`Fix failing tests to achieve ${this.config.thresholds.testing.minPassRate}% pass rate`);
      }
    }

    if (!this.metrics.security.passed) {
      if (this.metrics.security.critical > 0) {
        recommendations.push(`Immediately fix ${this.metrics.security.critical} critical security issues`);
      }
      if (this.metrics.security.high > this.config.thresholds.security.maxHigh) {
        recommendations.push(`Reduce high severity security issues to ${this.config.thresholds.security.maxHigh} or fewer`);
      }
    }

    if (!this.metrics.performance.passed) {
      if (this.metrics.performance.buildTime && this.metrics.performance.buildTime > this.config.thresholds.performance.maxBuildTime) {
        recommendations.push(`Optimize build process to complete under ${this.config.thresholds.performance.maxBuildTime} seconds`);
      }
      if (this.metrics.performance.bundleSize && this.metrics.performance.bundleSize > this.config.thresholds.performance.maxBundleSize) {
        recommendations.push(`Reduce bundle size to under ${this.config.thresholds.performance.maxBundleSize}MB`);
      }
    }

    if (!this.metrics.documentation.passed) {
      recommendations.push(`Improve documentation coverage to at least ${this.config.thresholds.documentation.minCoverage}%`);
    }

    return recommendations;
  }

  async run(): Promise<QualityGateResult> {
    this.logger.info('Starting quality gate checks');

    // Run all checks in parallel where possible
    const checks = [
      this.runLintingCheck(),
      this.runTypeCheckingCheck(),
      this.runFormattingCheck(),
      this.runTestingCheck(),
      this.runSecurityCheck(),
      this.runPerformanceCheck(),
      this.runDocumentationCheck()
    ];

    await Promise.allSettled(checks);

    // Evaluate results
    const allChecks = ['linting', 'typeChecking', 'formatting', 'testing', 'security', 'performance', 'documentation'];
    const requiredPassed = this.config.required.every(check => this.metrics[check as keyof QualityMetrics].passed);
    const optionalResults = this.config.optional.map(check => this.metrics[check as keyof QualityMetrics].passed);

    const passedChecks = allChecks.filter(check => this.metrics[check as keyof QualityMetrics].passed).length;
    const failedChecks = allChecks.filter(check => !this.metrics[check as keyof QualityMetrics].passed).length;

    const result: QualityGateResult = {
      passed: requiredPassed,
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      config: this.config,
      summary: {
        totalChecks: allChecks.length,
        passedChecks,
        failedChecks,
        skippedChecks: 0
      },
      recommendations: this.generateRecommendations()
    };

    this.logger.info('Quality gate evaluation completed', {
      passed: result.passed,
      totalChecks: result.summary.totalChecks,
      passedChecks: result.summary.passedChecks,
      failedChecks: result.summary.failedChecks
    });

    return result;
  }

  displayResult(result: QualityGateResult): void {
    console.log(chalk.bold.blue('\n🚪 Quality Gate Report'));
    console.log('━'.repeat(80));

    // Overall status
    const overallStatus = result.passed 
      ? chalk.green.bold('✅ PASSED') 
      : chalk.red.bold('❌ FAILED');
    
    console.log(`Overall Status: ${overallStatus}`);
    console.log(`Checks: ${result.summary.passedChecks}/${result.summary.totalChecks} passed\n`);

    // Individual check results
    const checkNames = ['linting', 'typeChecking', 'formatting', 'testing', 'security', 'performance', 'documentation'];
    
    for (const checkName of checkNames) {
      const metric = result.metrics[checkName as keyof QualityMetrics];
      const isRequired = result.config.required.includes(checkName);
      const status = metric.passed 
        ? chalk.green('✅ PASS')
        : chalk.red('❌ FAIL');
      
      const priority = isRequired ? chalk.yellow('[REQUIRED]') : chalk.gray('[OPTIONAL]');
      
      console.log(`${checkName.padEnd(15)} ${status} ${priority}`);
      if (metric.details) {
        console.log(`${' '.repeat(15)} ${chalk.gray(metric.details)}`);
      }
    }

    // Recommendations
    if (result.recommendations.length > 0) {
      console.log(chalk.bold.yellow('\n💡 Recommendations:'));
      result.recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec}`);
      });
    }

    console.log();
  }

  async saveResult(result: QualityGateResult, outputPath: string): Promise<void> {
    const reportsDir = path.dirname(outputPath);
    await fs.mkdir(reportsDir, { recursive: true });

    await fs.writeFile(outputPath, JSON.stringify(result, null, 2));
    this.logger.info('Quality gate report saved', { path: outputPath });
  }
}

async function main(): Promise<void> {
  program
    .name('quality-gate')
    .description('GhostSpeak quality gate system')
    .option('-c, --config <file>', 'Quality gate configuration file')
    .option('-o, --output <file>', 'Output file for results', './quality-reports/quality-gate.json')
    .option('--ci', 'CI mode - exit with error code on failure')
    .option('--required-only', 'Run only required checks')
    .parse();

  const options = program.opts();

  let config: QualityGateConfig | undefined;
  if (options.config) {
    try {
      const configData = await fs.readFile(options.config, 'utf-8');
      config = JSON.parse(configData);
      console.log(chalk.blue(`📁 Loaded configuration from ${options.config}`));
    } catch (error) {
      console.error(chalk.red(`❌ Failed to load config file: ${error}`));
      process.exit(1);
    }
  }

  const gate = new QualityGate(config);

  try {
    const result = await gate.run();
    
    gate.displayResult(result);
    
    if (options.output) {
      await gate.saveResult(result, options.output);
    }

    // CI mode
    if (options.ci) {
      if (result.passed) {
        console.log(chalk.green('\n✅ Quality gate passed - ready for deployment'));
        process.exit(0);
      } else {
        console.log(chalk.red('\n❌ Quality gate failed - deployment blocked'));
        process.exit(1);
      }
    }

  } catch (error) {
    console.error(chalk.red('Quality gate execution failed:'), error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red('Quality gate error:'), error);
    process.exit(1);
  });
}

export { QualityGate, QualityGateConfig, QualityGateResult, QualityMetrics };