#!/usr/bin/env node
/**
 * SDK Comprehensive Validation Runner
 * Executes all validation tests and generates a detailed report
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { runPerformanceBenchmarks } from './comprehensive-sdk-validation.test';

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  errors: string[];
}

interface ValidationReport {
  timestamp: string;
  sdkVersion: string;
  testResults: TestResult[];
  performanceBenchmarks: any;
  bundleSize: {
    total: number;
    files: { name: string; size: number }[];
  };
  typeChecking: {
    passed: boolean;
    errors: string[];
  };
  overallScore: number;
  recommendations: string[];
}

class SDKValidator {
  private report: ValidationReport = {
    timestamp: new Date().toISOString(),
    sdkVersion: '2.0.4',
    testResults: [],
    performanceBenchmarks: {},
    bundleSize: { total: 0, files: [] },
    typeChecking: { passed: false, errors: [] },
    overallScore: 0,
    recommendations: []
  };

  async runAllValidations() {
    console.log('🚀 Starting Comprehensive SDK Validation...\n');
    
    // 1. Run Jest tests
    await this.runJestTests();
    
    // 2. Run performance benchmarks
    await this.runPerformanceBenchmarks();
    
    // 3. Analyze bundle size
    await this.analyzeBundleSize();
    
    // 4. Check TypeScript types
    await this.checkTypeScript();
    
    // 5. Test real-world scenarios
    await this.testRealWorldScenarios();
    
    // 6. Calculate overall score
    this.calculateOverallScore();
    
    // 7. Generate recommendations
    this.generateRecommendations();
    
    // 8. Save report
    await this.saveReport();
    
    // 9. Display summary
    this.displaySummary();
  }

  private async runJestTests(): Promise<void> {
    console.log('📋 Running Jest test suites...\n');
    
    return new Promise((resolve) => {
      const jest = spawn('npx', [
        'jest',
        'comprehensive-sdk-validation.test.ts',
        '--verbose',
        '--json',
        '--outputFile=test-results.json'
      ], { cwd: path.join(__dirname, '..') });

      let output = '';
      jest.stdout.on('data', (data) => {
        output += data.toString();
        process.stdout.write(data);
      });

      jest.stderr.on('data', (data) => {
        process.stderr.write(data);
      });

      jest.on('close', (code) => {
        if (fs.existsSync(path.join(__dirname, '..', 'test-results.json'))) {
          const results = JSON.parse(
            fs.readFileSync(path.join(__dirname, '..', 'test-results.json'), 'utf8')
          );
          
          this.report.testResults = this.parseJestResults(results);
        }
        resolve();
      });
    });
  }

  private parseJestResults(results: any): TestResult[] {
    const testResults: TestResult[] = [];
    
    if (results.testResults) {
      results.testResults.forEach((suite: any) => {
        const suiteResult: TestResult = {
          suite: path.basename(suite.name),
          passed: 0,
          failed: 0,
          skipped: 0,
          duration: suite.endTime - suite.startTime,
          errors: []
        };

        suite.assertionResults.forEach((test: any) => {
          if (test.status === 'passed') suiteResult.passed++;
          else if (test.status === 'failed') {
            suiteResult.failed++;
            suiteResult.errors.push(test.title);
          }
          else if (test.status === 'skipped') suiteResult.skipped++;
        });

        testResults.push(suiteResult);
      });
    }
    
    return testResults;
  }

  private async runPerformanceBenchmarks(): Promise<void> {
    console.log('\n⚡ Running performance benchmarks...\n');
    
    try {
      this.report.performanceBenchmarks = await runPerformanceBenchmarks();
    } catch (error) {
      console.error('Performance benchmark error:', error);
      this.report.performanceBenchmarks = { error: error.message };
    }
  }

  private async analyzeBundleSize(): Promise<void> {
    console.log('\n📦 Analyzing bundle size...\n');
    
    const distPath = path.join(__dirname, '..', 'dist');
    
    if (fs.existsSync(distPath)) {
      const files = fs.readdirSync(distPath);
      let totalSize = 0;
      
      this.report.bundleSize.files = files
        .filter(f => f.endsWith('.js') && !f.includes('.map'))
        .map(file => {
          const stats = fs.statSync(path.join(distPath, file));
          totalSize += stats.size;
          return { name: file, size: stats.size };
        });
      
      this.report.bundleSize.total = totalSize;
      
      console.log(`Total bundle size: ${(totalSize / 1024).toFixed(2)} KB`);
    } else {
      console.warn('Dist directory not found. Run build first.');
    }
  }

  private async checkTypeScript(): Promise<void> {
    console.log('\n🔍 Checking TypeScript compilation...\n');
    
    return new Promise((resolve) => {
      const tsc = spawn('npx', ['tsc', '--noEmit'], { 
        cwd: path.join(__dirname, '..') 
      });
      
      let errors = '';
      tsc.stderr.on('data', (data) => {
        errors += data.toString();
      });
      
      tsc.on('close', (code) => {
        this.report.typeChecking.passed = code === 0;
        if (errors) {
          this.report.typeChecking.errors = errors.split('\n').filter(e => e.trim());
        }
        resolve();
      });
    });
  }

  private async testRealWorldScenarios(): Promise<void> {
    console.log('\n🌍 Testing real-world scenarios...\n');
    
    // Test minimal bundle import
    try {
      const start = Date.now();
      const { createMinimalClient } = await import('../src/index');
      const importTime = Date.now() - start;
      
      console.log(`✅ Minimal client import: ${importTime}ms`);
      
      // Test dynamic service loading
      const servicesStart = Date.now();
      const { loadAdvancedServices } = await import('../src/index');
      const services = await loadAdvancedServices();
      const servicesTime = Date.now() - servicesStart;
      
      console.log(`✅ Advanced services load: ${servicesTime}ms`);
      console.log(`✅ Services loaded: ${Object.keys(services).join(', ')}`);
      
    } catch (error) {
      console.error('❌ Real-world scenario test failed:', error);
    }
  }

  private calculateOverallScore(): void {
    let score = 100;
    
    // Deduct points for test failures
    this.report.testResults.forEach(result => {
      if (result.failed > 0) {
        score -= (result.failed * 2);
      }
    });
    
    // Deduct points for large bundle size
    const bundleSizeKB = this.report.bundleSize.total / 1024;
    if (bundleSizeKB > 50) {
      score -= Math.min(20, (bundleSizeKB - 50) * 2);
    }
    
    // Deduct points for TypeScript errors
    if (!this.report.typeChecking.passed) {
      score -= 10;
    }
    
    // Deduct points for slow performance
    const benchmarks = this.report.performanceBenchmarks;
    if (benchmarks.dynamicImportTime > 100) {
      score -= 5;
    }
    if (benchmarks.serviceCreationTime > 50) {
      score -= 5;
    }
    
    this.report.overallScore = Math.max(0, score);
  }

  private generateRecommendations(): void {
    const recommendations: string[] = [];
    
    // Bundle size recommendations
    const bundleSizeKB = this.report.bundleSize.total / 1024;
    if (bundleSizeKB > 50) {
      recommendations.push(
        `Bundle size (${bundleSizeKB.toFixed(2)}KB) exceeds 50KB target. Consider:`,
        '  - Review dependencies for unnecessary imports',
        '  - Ensure tree-shaking is working correctly',
        '  - Consider code splitting for optional features'
      );
    }
    
    // Performance recommendations
    const benchmarks = this.report.performanceBenchmarks;
    if (benchmarks.dynamicImportTime > 100) {
      recommendations.push(
        'Dynamic import time is high. Consider:',
        '  - Preloading critical services',
        '  - Optimizing module structure'
      );
    }
    
    // Test failure recommendations
    const totalFailures = this.report.testResults.reduce(
      (sum, result) => sum + result.failed, 0
    );
    if (totalFailures > 0) {
      recommendations.push(
        `${totalFailures} test(s) failed. Fix these before deployment.`
      );
    }
    
    // TypeScript recommendations
    if (!this.report.typeChecking.passed) {
      recommendations.push(
        'TypeScript compilation errors detected. Fix type issues for better DX.'
      );
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ SDK meets all quality standards!');
    }
    
    this.report.recommendations = recommendations;
  }

  private async saveReport(): Promise<void> {
    const reportPath = path.join(__dirname, '..', 'SDK_VALIDATION_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.report, null, 2));
    console.log(`\n📄 Report saved to: ${reportPath}`);
  }

  private displaySummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 SDK VALIDATION SUMMARY');
    console.log('='.repeat(60));
    
    // Test results
    const totalTests = this.report.testResults.reduce(
      (sum, r) => sum + r.passed + r.failed + r.skipped, 0
    );
    const passedTests = this.report.testResults.reduce(
      (sum, r) => sum + r.passed, 0
    );
    
    console.log(`\n✅ Tests: ${passedTests}/${totalTests} passed`);
    
    // Bundle size
    const bundleSizeKB = this.report.bundleSize.total / 1024;
    const bundleEmoji = bundleSizeKB <= 50 ? '✅' : '⚠️';
    console.log(`${bundleEmoji} Bundle Size: ${bundleSizeKB.toFixed(2)}KB (target: <50KB)`);
    
    // TypeScript
    const tsEmoji = this.report.typeChecking.passed ? '✅' : '❌';
    console.log(`${tsEmoji} TypeScript: ${this.report.typeChecking.passed ? 'Clean' : 'Errors found'}`);
    
    // Performance
    const perfEmoji = this.report.performanceBenchmarks.dynamicImportTime < 100 ? '✅' : '⚠️';
    console.log(`${perfEmoji} Performance: Dynamic imports ${this.report.performanceBenchmarks.dynamicImportTime?.toFixed(2)}ms`);
    
    // Overall score
    console.log(`\n🎯 Overall Score: ${this.report.overallScore}/100`);
    
    // Recommendations
    console.log('\n📋 Recommendations:');
    this.report.recommendations.forEach(rec => {
      console.log(`   ${rec}`);
    });
    
    console.log('\n' + '='.repeat(60));
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new SDKValidator();
  validator.runAllValidations().catch(console.error);
}