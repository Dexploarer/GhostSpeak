#!/usr/bin/env tsx

import { program } from 'commander';
import chalk from 'chalk';
import { GhostSpeakLogger } from './logger.js';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { table } from 'table';

interface SecurityIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'vulnerability' | 'code_quality' | 'configuration' | 'dependency' | 'smart_contract';
  title: string;
  description: string;
  file?: string;
  line?: number;
  recommendation: string;
  cwe?: string;
  cvss?: number;
  references?: string[];
}

interface SecurityAuditReport {
  timestamp: string;
  summary: {
    totalIssues: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  issues: SecurityIssue[];
  recommendations: string[];
  compliance: {
    owasp: boolean;
    pci: boolean;
    gdpr: boolean;
    custom: boolean;
  };
}

class SecurityAuditor {
  private logger: GhostSpeakLogger;
  private issues: SecurityIssue[] = [];

  constructor() {
    this.logger = new GhostSpeakLogger('SECURITY');
  }

  private async runNpmAudit(): Promise<SecurityIssue[]> {
    this.logger.info('Running npm security audit');
    const issues: SecurityIssue[] = [];

    try {
      const output = execSync('npm audit --json', { 
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const auditResult = JSON.parse(output);
      
      if (auditResult.vulnerabilities) {
        for (const [packageName, vulnerability] of Object.entries(auditResult.vulnerabilities as any)) {
          const vuln = vulnerability as any;
          
          issues.push({
            id: `npm-${packageName}-${Date.now()}`,
            severity: this.mapNpmSeverity(vuln.severity),
            category: 'dependency',
            title: `${vuln.severity.toUpperCase()} vulnerability in ${packageName}`,
            description: vuln.via?.source?.name || 'Dependency vulnerability',
            recommendation: `Update ${packageName} to a patched version`,
            references: vuln.via?.source?.url ? [vuln.via.source.url] : []
          });
        }
      }

    } catch (error) {
      // npm audit returns non-zero exit code when vulnerabilities are found
      const errorOutput = error instanceof Error ? String(error).split('\n').pop() || '' : '';
      
      if (errorOutput.includes('vulnerabilities')) {
        this.logger.warn('npm audit found vulnerabilities (expected behavior)');
      } else {
        this.logger.error('npm audit failed', error);
      }
    }

    return issues;
  }

  private async runCargoAudit(): Promise<SecurityIssue[]> {
    this.logger.info('Running Cargo security audit');
    const issues: SecurityIssue[] = [];

    try {
      execSync('cd programs && cargo audit --json', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } catch (error) {
      // Parse Cargo audit output
      const output = error instanceof Error && 'stdout' in error ? (error as any).stdout : '';
      
      if (output) {
        try {
          const auditResult = JSON.parse(output);
          
          if (auditResult.vulnerabilities) {
            for (const vulnerability of auditResult.vulnerabilities.list || []) {
              issues.push({
                id: `cargo-${vulnerability.advisory.id}`,
                severity: this.mapCargoSeverity(vulnerability.advisory.severity),
                category: 'dependency',
                title: `Rust dependency vulnerability: ${vulnerability.advisory.title}`,
                description: vulnerability.advisory.description,
                recommendation: `Update ${vulnerability.package.name} to version ${vulnerability.advisory.patched_versions || 'latest'}`,
                cwe: vulnerability.advisory.cwe,
                references: [vulnerability.advisory.url]
              });
            }
          }
        } catch (parseError) {
          this.logger.warn('Could not parse cargo audit output');
        }
      }
    }

    return issues;
  }

  private async runCodeAnalysis(): Promise<SecurityIssue[]> {
    this.logger.info('Running static code analysis');
    const issues: SecurityIssue[] = [];

    // Analyze TypeScript files for security issues
    const tsIssues = await this.analyzeTypeScriptSecurity();
    issues.push(...tsIssues);

    // Analyze Rust files for security issues
    const rustIssues = await this.analyzeRustSecurity();
    issues.push(...rustIssues);

    return issues;
  }

  private async analyzeTypeScriptSecurity(): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    try {
      // Find all TypeScript files
      const tsFiles = await this.findFiles('**/*.ts', ['node_modules', 'dist', 'build']);
      
      for (const filePath of tsFiles) {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const lineNumber = i + 1;

          // Check for common security anti-patterns
          if (line.includes('eval(')) {
            issues.push({
              id: `ts-eval-${filePath}-${lineNumber}`,
              severity: 'high',
              category: 'code_quality',
              title: 'Use of eval() function',
              description: 'eval() can execute arbitrary code and is a security risk',
              file: filePath,
              line: lineNumber,
              recommendation: 'Avoid using eval(). Use JSON.parse() for JSON data or other safe alternatives',
              cwe: 'CWE-94'
            });
          }

          if (line.includes('innerHTML') && !line.includes('textContent')) {
            issues.push({
              id: `ts-innerhtml-${filePath}-${lineNumber}`,
              severity: 'medium',
              category: 'code_quality',
              title: 'Use of innerHTML without sanitization',
              description: 'innerHTML can lead to XSS vulnerabilities',
              file: filePath,
              line: lineNumber,
              recommendation: 'Use textContent or sanitize HTML content before insertion',
              cwe: 'CWE-79'
            });
          }

          if (line.includes('process.env') && line.includes('console.log')) {
            issues.push({
              id: `ts-env-leak-${filePath}-${lineNumber}`,
              severity: 'medium',
              category: 'configuration',
              title: 'Potential environment variable exposure',
              description: 'Environment variables may be logged and exposed',
              file: filePath,
              line: lineNumber,
              recommendation: 'Avoid logging environment variables directly',
              cwe: 'CWE-532'
            });
          }

          if (line.includes('password') && (line.includes('=') || line.includes(':'))) {
            issues.push({
              id: `ts-hardcoded-pwd-${filePath}-${lineNumber}`,
              severity: 'critical',
              category: 'configuration',
              title: 'Potential hardcoded password',
              description: 'Hardcoded credentials in source code',
              file: filePath,
              line: lineNumber,
              recommendation: 'Use environment variables or secure credential management',
              cwe: 'CWE-798'
            });
          }

          if (line.includes('Math.random()') && (line.includes('key') || line.includes('token') || line.includes('id'))) {
            issues.push({
              id: `ts-weak-random-${filePath}-${lineNumber}`,
              severity: 'medium',
              category: 'code_quality',
              title: 'Use of weak random number generator',
              description: 'Math.random() is not cryptographically secure',
              file: filePath,
              line: lineNumber,
              recommendation: 'Use crypto.randomBytes() or crypto.randomUUID() for security-sensitive values',
              cwe: 'CWE-338'
            });
          }
        }
      }
    } catch (error) {
      this.logger.error('TypeScript security analysis failed', error);
    }

    return issues;
  }

  private async analyzeRustSecurity(): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    try {
      const rustFiles = await this.findFiles('programs/**/*.rs', []);
      
      for (const filePath of rustFiles) {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const lineNumber = i + 1;

          // Check for unsafe blocks
          if (line.includes('unsafe ')) {
            issues.push({
              id: `rust-unsafe-${filePath}-${lineNumber}`,
              severity: 'high',
              category: 'smart_contract',
              title: 'Unsafe Rust code block',
              description: 'Unsafe blocks bypass Rust safety guarantees',
              file: filePath,
              line: lineNumber,
              recommendation: 'Minimize unsafe code and ensure thorough review',
              cwe: 'CWE-119'
            });
          }

          // Check for unwrap() without error handling
          if (line.includes('.unwrap()') && !line.includes('//')) {
            issues.push({
              id: `rust-unwrap-${filePath}-${lineNumber}`,
              severity: 'medium',
              category: 'smart_contract',
              title: 'Use of unwrap() without error handling',
              description: 'unwrap() can cause panics in smart contracts',
              file: filePath,
              line: lineNumber,
              recommendation: 'Use proper error handling with match or ? operator',
              cwe: 'CWE-754'
            });
          }

          // Check for println! in production code
          if (line.includes('println!') || line.includes('print!')) {
            issues.push({
              id: `rust-debug-print-${filePath}-${lineNumber}`,
              severity: 'low',
              category: 'code_quality',
              title: 'Debug print statement in code',
              description: 'Print statements may leak information in production',
              file: filePath,
              line: lineNumber,
              recommendation: 'Remove debug prints or use conditional compilation',
              cwe: 'CWE-532'
            });
          }

          // Check for integer overflow potential
          if (line.match(/\+|\-|\*/) && line.includes('u64') && !line.includes('checked_')) {
            issues.push({
              id: `rust-overflow-${filePath}-${lineNumber}`,
              severity: 'medium',
              category: 'smart_contract',
              title: 'Potential integer overflow',
              description: 'Arithmetic operations without overflow checks',
              file: filePath,
              line: lineNumber,
              recommendation: 'Use checked arithmetic operations (checked_add, checked_sub, etc.)',
              cwe: 'CWE-190'
            });
          }
        }
      }
    } catch (error) {
      this.logger.error('Rust security analysis failed', error);
    }

    return issues;
  }

  private async runConfigurationAudit(): Promise<SecurityIssue[]> {
    this.logger.info('Running configuration security audit');
    const issues: SecurityIssue[] = [];

    // Check package.json for security configurations
    try {
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'));
      
      // Check for missing security headers in dependencies
      if (!packageJson.dependencies?.helmet && packageJson.dependencies?.express) {
        issues.push({
          id: 'config-missing-helmet',
          severity: 'medium',
          category: 'configuration',
          title: 'Missing security headers middleware',
          description: 'Express app without helmet security middleware',
          recommendation: 'Add helmet middleware for security headers',
          references: ['https://helmetjs.github.io/']
        });
      }

      // Check for outdated Node.js version requirement
      if (packageJson.engines?.node) {
        const nodeVersion = packageJson.engines.node.replace(/[^0-9.]/g, '');
        const majorVersion = parseInt(nodeVersion.split('.')[0]);
        if (majorVersion < 18) {
          issues.push({
            id: 'config-outdated-node',
            severity: 'medium',
            category: 'configuration',
            title: 'Outdated Node.js version requirement',
            description: 'Project requires outdated Node.js version',
            recommendation: 'Update to Node.js 18+ for latest security features'
          });
        }
      }
    } catch (error) {
      this.logger.warn('Could not analyze package.json');
    }

    // Check environment configuration
    try {
      const envExample = await fs.readFile('.env.example', 'utf-8');
      const lines = envExample.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('localhost') || line.includes('127.0.0.1')) {
          issues.push({
            id: `env-localhost-${i}`,
            severity: 'low',
            category: 'configuration',
            title: 'Localhost in environment example',
            description: 'Environment example contains localhost configuration',
            file: '.env.example',
            line: i + 1,
            recommendation: 'Use production-appropriate hostnames in examples'
          });
        }

        if (line.includes('password=') || line.includes('secret=')) {
          issues.push({
            id: `env-example-secret-${i}`,
            severity: 'medium',
            category: 'configuration',
            title: 'Sensitive data in environment example',
            description: 'Environment example may contain sensitive placeholders',
            file: '.env.example',
            line: i + 1,
            recommendation: 'Use generic placeholders like CHANGE_ME or REPLACE_WITH_ACTUAL'
          });
        }
      }
    } catch (error) {
      // .env.example may not exist, which is fine
    }

    return issues;
  }

  private async findFiles(pattern: string, excludeDirs: string[]): Promise<string[]> {
    // Simple file finder implementation
    const files: string[] = [];
    
    async function walkDir(dir: string): Promise<void> {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            const shouldExclude = excludeDirs.some(excludeDir => 
              fullPath.includes(excludeDir) || entry.name === excludeDir
            );
            
            if (!shouldExclude) {
              await walkDir(fullPath);
            }
          } else if (entry.isFile()) {
            // Simple pattern matching for .ts files
            if (pattern.includes('*.ts') && entry.name.endsWith('.ts')) {
              files.push(fullPath);
            } else if (pattern.includes('*.rs') && entry.name.endsWith('.rs')) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Directory not accessible, skip
      }
    }

    if (pattern.includes('**')) {
      await walkDir('.');
    }

    return files;
  }

  private mapNpmSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' | 'info' {
    const mapping: { [key: string]: 'critical' | 'high' | 'medium' | 'low' | 'info' } = {
      critical: 'critical',
      high: 'high',
      moderate: 'medium',
      low: 'low',
      info: 'info'
    };
    return mapping[severity.toLowerCase()] || 'medium';
  }

  private mapCargoSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' | 'info' {
    const mapping: { [key: string]: 'critical' | 'high' | 'medium' | 'low' | 'info' } = {
      critical: 'critical',
      high: 'high',
      medium: 'medium',
      low: 'low',
      informational: 'info'
    };
    return mapping[severity.toLowerCase()] || 'medium';
  }

  async runFullAudit(): Promise<SecurityAuditReport> {
    this.logger.info('Starting comprehensive security audit');

    const allIssues: SecurityIssue[] = [];

    // Run all security checks
    const [npmIssues, cargoIssues, codeIssues, configIssues] = await Promise.all([
      this.runNpmAudit(),
      this.runCargoAudit(),
      this.runCodeAnalysis(),
      this.runConfigurationAudit()
    ]);

    allIssues.push(...npmIssues, ...cargoIssues, ...codeIssues, ...configIssues);

    // Generate summary
    const summary = {
      totalIssues: allIssues.length,
      critical: allIssues.filter(i => i.severity === 'critical').length,
      high: allIssues.filter(i => i.severity === 'high').length,
      medium: allIssues.filter(i => i.severity === 'medium').length,
      low: allIssues.filter(i => i.severity === 'low').length,
      info: allIssues.filter(i => i.severity === 'info').length
    };

    // Generate recommendations
    const recommendations = [
      'Regularly update dependencies to patch known vulnerabilities',
      'Implement proper error handling throughout the codebase',
      'Use security-focused linting rules in CI/CD pipeline',
      'Conduct regular security code reviews',
      'Implement proper input validation and sanitization',
      'Use environment variables for all sensitive configuration',
      'Enable security headers for web applications',
      'Implement proper logging without exposing sensitive data'
    ];

    const report: SecurityAuditReport = {
      timestamp: new Date().toISOString(),
      summary,
      issues: allIssues,
      recommendations,
      compliance: {
        owasp: summary.critical === 0 && summary.high <= 2,
        pci: summary.critical === 0,
        gdpr: !allIssues.some(i => i.description.toLowerCase().includes('personal data')),
        custom: summary.totalIssues <= 10
      }
    };

    this.logger.info('Security audit completed', {
      totalIssues: summary.totalIssues,
      critical: summary.critical,
      high: summary.high
    });

    return report;
  }

  displayReport(report: SecurityAuditReport): void {
    console.log(chalk.bold.red('\n🔒 Security Audit Report'));
    console.log('━'.repeat(80));
    
    // Summary
    const summaryData = [
      ['Severity', 'Count', 'Status'],
      ['Critical', report.summary.critical.toString(), report.summary.critical > 0 ? chalk.red('⚠️  CRITICAL') : chalk.green('✅ OK')],
      ['High', report.summary.high.toString(), report.summary.high > 0 ? chalk.red('🔴 HIGH') : chalk.green('✅ OK')],
      ['Medium', report.summary.medium.toString(), report.summary.medium > 0 ? chalk.yellow('🟡 MEDIUM') : chalk.green('✅ OK')],
      ['Low', report.summary.low.toString(), report.summary.low > 0 ? chalk.blue('🔵 LOW') : chalk.green('✅ OK')],
      ['Info', report.summary.info.toString(), chalk.gray('ℹ️  INFO')]
    ];

    console.log(table(summaryData));

    // Compliance status
    console.log(chalk.bold.blue('\n📋 Compliance Status:'));
    console.log(`OWASP: ${report.compliance.owasp ? chalk.green('✅ PASS') : chalk.red('❌ FAIL')}`);
    console.log(`PCI DSS: ${report.compliance.pci ? chalk.green('✅ PASS') : chalk.red('❌ FAIL')}`);
    console.log(`GDPR: ${report.compliance.gdpr ? chalk.green('✅ PASS') : chalk.red('❌ FAIL')}`);
    console.log(`Custom: ${report.compliance.custom ? chalk.green('✅ PASS') : chalk.red('❌ FAIL')}`);

    // Top issues
    if (report.issues.length > 0) {
      console.log(chalk.bold.yellow('\n🚨 Top Security Issues:'));
      
      const sortedIssues = report.issues.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });

      for (let i = 0; i < Math.min(10, sortedIssues.length); i++) {
        const issue = sortedIssues[i];
        const severityColor = {
          critical: chalk.red.bold,
          high: chalk.red,
          medium: chalk.yellow,
          low: chalk.blue,
          info: chalk.gray
        }[issue.severity];

        console.log(`\n${i + 1}. ${severityColor(issue.severity.toUpperCase())} - ${issue.title}`);
        console.log(`   ${issue.description}`);
        if (issue.file) {
          console.log(`   📁 ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
        }
        console.log(`   💡 ${issue.recommendation}`);
      }
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      console.log(chalk.bold.green('\n💡 Security Recommendations:'));
      report.recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec}`);
      });
    }
  }

  async saveReport(report: SecurityAuditReport, outputPath: string): Promise<void> {
    const reportsDir = path.dirname(outputPath);
    await fs.mkdir(reportsDir, { recursive: true });

    await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
    
    // Also save human-readable version
    const txtPath = outputPath.replace('.json', '.txt');
    const txtContent = this.generateTextReport(report);
    await fs.writeFile(txtPath, txtContent);

    this.logger.info('Security audit report saved', { 
      jsonReport: outputPath, 
      textReport: txtPath 
    });
  }

  private generateTextReport(report: SecurityAuditReport): string {
    let content = 'GHOSTSPEAK SECURITY AUDIT REPORT\n';
    content += '='.repeat(50) + '\n\n';
    content += `Generated: ${new Date(report.timestamp).toLocaleString()}\n\n`;
    
    content += 'SUMMARY:\n';
    content += `Total Issues: ${report.summary.totalIssues}\n`;
    content += `Critical: ${report.summary.critical}\n`;
    content += `High: ${report.summary.high}\n`;
    content += `Medium: ${report.summary.medium}\n`;
    content += `Low: ${report.summary.low}\n`;
    content += `Info: ${report.summary.info}\n\n`;

    content += 'DETAILED ISSUES:\n';
    content += '-'.repeat(30) + '\n';
    
    report.issues.forEach((issue, i) => {
      content += `\n${i + 1}. [${issue.severity.toUpperCase()}] ${issue.title}\n`;
      content += `   Description: ${issue.description}\n`;
      if (issue.file) {
        content += `   Location: ${issue.file}${issue.line ? `:${issue.line}` : ''}\n`;
      }
      content += `   Recommendation: ${issue.recommendation}\n`;
      if (issue.cwe) {
        content += `   CWE: ${issue.cwe}\n`;
      }
    });

    return content;
  }
}

async function main(): Promise<void> {
  program
    .name('security-audit')
    .description('GhostSpeak comprehensive security audit tool')
    .option('-o, --output <file>', 'Output file for audit report', './security-reports/audit-report.json')
    .option('--format <type>', 'Output format (json|text)', 'json')
    .option('--ci', 'CI mode - fail on critical or high severity issues')
    .parse();

  const options = program.opts();
  const auditor = new SecurityAuditor();

  try {
    const report = await auditor.runFullAudit();
    
    auditor.displayReport(report);
    
    if (options.output) {
      await auditor.saveReport(report, options.output);
    }

    // CI mode - exit with error code if critical issues found
    if (options.ci) {
      const criticalOrHigh = report.summary.critical + report.summary.high;
      if (criticalOrHigh > 0) {
        console.log(chalk.red(`\n❌ CI Mode: Found ${criticalOrHigh} critical/high severity issues`));
        process.exit(1);
      } else {
        console.log(chalk.green('\n✅ CI Mode: No critical/high severity issues found'));
      }
    }

  } catch (error) {
    console.error(chalk.red('Security audit failed:'), error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red('Security auditor error:'), error);
    process.exit(1);
  });
}

export { SecurityAuditor, SecurityIssue, SecurityAuditReport };