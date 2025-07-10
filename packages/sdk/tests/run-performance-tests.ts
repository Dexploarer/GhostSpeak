#!/usr/bin/env bun

/**
 * Performance Test Runner for GhostSpeak Protocol
 * 
 * Execute comprehensive performance tests and generate detailed reports
 * with visualizations and actionable insights.
 */

import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

interface PerformanceReport {
  timestamp: string;
  environment: {
    platform: string;
    cpus: number;
    memory: number;
    nodeVersion: string;
  };
  tests: Record<string, any>;
  summary: any;
  analysis?: {
    bottlenecks: Array<any>;
    optimizations: string[];
  };
}

class PerformanceTestRunner {
  private reportDir: string;
  private startTime: number;

  constructor() {
    this.reportDir = path.join(process.cwd(), 'performance-reports');
    this.startTime = Date.now();
  }

  async initialize() {
    // Create report directory
    await fs.mkdir(this.reportDir, { recursive: true });

    console.log('🚀 GhostSpeak Performance Test Runner');
    console.log('====================================');
    console.log(`📁 Reports directory: ${this.reportDir}`);
    console.log(`🖥️  System: ${os.platform()} | ${os.cpus().length} CPUs | ${(os.totalmem() / (1024 ** 3)).toFixed(2)}GB RAM`);
    console.log(`🔧 Node.js: ${process.version}`);
    console.log('');
  }

  async runTests(): Promise<PerformanceReport | null> {
    console.log('🧪 Running comprehensive performance tests...\n');

    const testFile = path.join(__dirname, 'comprehensive-performance-test.ts');
    
    return new Promise((resolve) => {
      const testProcess = spawn('bun', ['test', testFile, '--timeout', '300000'], {
        stdio: 'inherit',
        env: { ...process.env, FORCE_COLOR: '1' }
      });

      testProcess.on('close', async (code) => {
        if (code === 0) {
          console.log('\n✅ Performance tests completed successfully!');
          
          // Load the generated report
          const reportPath = path.join(process.cwd(), 'performance-report.json');
          try {
            const reportData = await fs.readFile(reportPath, 'utf-8');
            const report = JSON.parse(reportData) as PerformanceReport;
            resolve(report);
          } catch (error) {
            console.error('❌ Failed to load performance report:', error);
            resolve(null);
          }
        } else {
          console.error(`\n❌ Performance tests failed with code ${code}`);
          resolve(null);
        }
      });
    });
  }

  async generateHTMLReport(report: PerformanceReport) {
    console.log('\n📊 Generating HTML performance report...');

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GhostSpeak Performance Report - ${new Date(report.timestamp).toLocaleString()}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 2.5em;
        }
        .header .subtitle {
            opacity: 0.9;
            font-size: 1.2em;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .metric-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .metric-card h3 {
            margin-top: 0;
            color: #667eea;
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #333;
        }
        .metric-label {
            color: #666;
            font-size: 0.9em;
        }
        .chart-container {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .test-results {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .test-passed {
            color: #22c55e;
        }
        .test-failed {
            color: #ef4444;
        }
        .bottleneck {
            padding: 10px;
            margin: 10px 0;
            border-radius: 5px;
            border-left: 4px solid;
        }
        .bottleneck.high {
            background-color: #fee2e2;
            border-color: #ef4444;
        }
        .bottleneck.medium {
            background-color: #fef3c7;
            border-color: #f59e0b;
        }
        .bottleneck.low {
            background-color: #d1fae5;
            border-color: #10b981;
        }
        .optimization-list {
            background: #f0f9ff;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
        }
        .optimization-list li {
            margin: 10px 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        th, td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        .status-icon {
            font-size: 1.2em;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 GhostSpeak Performance Report</h1>
        <div class="subtitle">Generated on ${new Date(report.timestamp).toLocaleString()}</div>
    </div>

    <div class="metrics-grid">
        <div class="metric-card">
            <h3>🕐 Total Duration</h3>
            <div class="metric-value">${(report.summary.duration / 1000).toFixed(2)}s</div>
            <div class="metric-label">Test execution time</div>
        </div>
        <div class="metric-card">
            <h3>💾 Memory Usage</h3>
            <div class="metric-value">${(report.summary.memory.peak / (1024 * 1024)).toFixed(2)}MB</div>
            <div class="metric-label">Peak memory consumption</div>
        </div>
        <div class="metric-card">
            <h3>🖥️ CPU Usage</h3>
            <div class="metric-value">${((report.summary.cpu.total / report.summary.duration) * 100).toFixed(1)}%</div>
            <div class="metric-label">Average CPU utilization</div>
        </div>
        <div class="metric-card">
            <h3>📊 Test Coverage</h3>
            <div class="metric-value">${Object.keys(report.tests).length}</div>
            <div class="metric-label">Performance tests executed</div>
        </div>
    </div>

    ${this.generateTestResultsHTML(report)}
    ${this.generateBottlenecksHTML(report)}
    ${this.generateChartsHTML(report)}
    ${this.generateOptimizationsHTML(report)}

    <script>
        ${this.generateChartScripts(report)}
    </script>
</body>
</html>
    `;

    const htmlPath = path.join(this.reportDir, `performance-report-${Date.now()}.html`);
    await fs.writeFile(htmlPath, html);
    console.log(`📄 HTML report saved to: ${htmlPath}`);

    return htmlPath;
  }

  private generateTestResultsHTML(report: PerformanceReport): string {
    const tests = Object.entries(report.tests);
    
    return `
    <div class="test-results">
        <h2>📋 Test Results Summary</h2>
        <table>
            <thead>
                <tr>
                    <th>Test Name</th>
                    <th>Status</th>
                    <th>Key Metric</th>
                    <th>Details</th>
                </tr>
            </thead>
            <tbody>
                ${tests.map(([name, data]) => `
                    <tr>
                        <td><strong>${this.formatTestName(name)}</strong></td>
                        <td class="${data.passed ? 'test-passed' : 'test-failed'}">
                            <span class="status-icon">${data.passed ? '✅' : '❌'}</span>
                            ${data.passed ? 'Passed' : 'Failed'}
                        </td>
                        <td>${this.getKeyMetric(name, data)}</td>
                        <td>${this.getTestDetails(name, data)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    `;
  }

  private generateBottlenecksHTML(report: PerformanceReport): string {
    if (!report.analysis?.bottlenecks || report.analysis.bottlenecks.length === 0) {
      return '';
    }

    return `
    <div class="test-results">
        <h2>🔍 Performance Bottlenecks</h2>
        ${report.analysis.bottlenecks.map(b => `
            <div class="bottleneck ${b.severity}">
                <strong>${b.type.toUpperCase()}</strong>: ${b.description}
                <br>
                <small>Value: ${b.value}${b.target ? ` (Target: ${b.target})` : ''}</small>
            </div>
        `).join('')}
    </div>
    `;
  }

  private generateChartsHTML(report: PerformanceReport): string {
    return `
    <div class="chart-container">
        <h2>📈 Performance Metrics</h2>
        <canvas id="throughputChart" width="400" height="200"></canvas>
    </div>
    <div class="chart-container">
        <h2>💾 Resource Usage</h2>
        <canvas id="resourceChart" width="400" height="200"></canvas>
    </div>
    `;
  }

  private generateOptimizationsHTML(report: PerformanceReport): string {
    if (!report.analysis?.optimizations || report.analysis.optimizations.length === 0) {
      return '';
    }

    return `
    <div class="test-results">
        <h2>💡 Optimization Recommendations</h2>
        <div class="optimization-list">
            <ol>
                ${report.analysis.optimizations.map(opt => `<li>${opt}</li>`).join('')}
            </ol>
        </div>
    </div>
    `;
  }

  private generateChartScripts(report: PerformanceReport): string {
    return `
    // Throughput Chart
    const throughputCtx = document.getElementById('throughputChart').getContext('2d');
    new Chart(throughputCtx, {
        type: 'bar',
        data: {
            labels: ['Agent Registration', 'Message Throughput', 'Escrow Processing', 'Market Queries'],
            datasets: [{
                label: 'Operations per Minute',
                data: [
                    ${report.tests.concurrent_agents?.ratePerMinute || 0},
                    ${report.tests.message_throughput?.projectedRate || 0},
                    ${report.tests.concurrent_escrow?.throughputPerSecond * 60 || 0},
                    ${report.tests.marketplace_queries?.queriesPerSecond * 60 || 0}
                ],
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(118, 75, 162, 0.8)',
                    'rgba(237, 100, 166, 0.8)',
                    'rgba(255, 159, 64, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Resource Usage Chart
    const resourceCtx = document.getElementById('resourceChart').getContext('2d');
    new Chart(resourceCtx, {
        type: 'line',
        data: {
            labels: ['Start', '25%', '50%', '75%', 'End'],
            datasets: [{
                label: 'Memory Usage (MB)',
                data: [
                    ${report.summary.memory.initial.heapUsed / (1024 * 1024)},
                    ${(report.summary.memory.initial.heapUsed + report.summary.memory.growth * 0.25) / (1024 * 1024)},
                    ${(report.summary.memory.initial.heapUsed + report.summary.memory.growth * 0.5) / (1024 * 1024)},
                    ${(report.summary.memory.initial.heapUsed + report.summary.memory.growth * 0.75) / (1024 * 1024)},
                    ${report.summary.memory.final.heapUsed / (1024 * 1024)}
                ],
                borderColor: 'rgb(102, 126, 234)',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    `;
  }

  private formatTestName(name: string): string {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private getKeyMetric(name: string, data: any): string {
    if (data.duration) return `${data.duration.toFixed(2)}ms`;
    if (data.ratePerMinute) return `${data.ratePerMinute.toFixed(0)}/min`;
    if (data.throughputPerSecond) return `${data.throughputPerSecond.toFixed(2)}/s`;
    if (data.avgQueryTime) return `${data.avgQueryTime.toFixed(2)}ms`;
    if (data.average) return `${data.average.toFixed(2)}ms`;
    return 'N/A';
  }

  private getTestDetails(name: string, data: any): string {
    if (data.successful !== undefined && data.failed !== undefined) {
      return `${data.successful} successful, ${data.failed} failed`;
    }
    if (data.projectedTo10K) {
      return `Projected: ${data.projectedTo10K.toFixed(0)} agents`;
    }
    if (data.efficiency) {
      return `${data.efficiency.toFixed(1)}% efficient`;
    }
    return '';
  }

  async generateMarkdownReport(report: PerformanceReport) {
    console.log('\n📝 Generating Markdown performance report...');

    const markdown = `# GhostSpeak Performance Report

Generated: ${new Date(report.timestamp).toLocaleString()}

## Executive Summary

- **Total Test Duration**: ${(report.summary.duration / 1000).toFixed(2)} seconds
- **Peak Memory Usage**: ${(report.summary.memory.peak / (1024 * 1024)).toFixed(2)} MB
- **Average CPU Usage**: ${((report.summary.cpu.total / report.summary.duration) * 100).toFixed(1)}%
- **Tests Executed**: ${Object.keys(report.tests).length}

## Performance Highlights

### 🚀 Throughput Metrics

| Operation | Rate | Target | Status |
|-----------|------|--------|--------|
| Agent Registration | ${report.tests.concurrent_agents?.ratePerMinute?.toFixed(0) || 'N/A'}/min | 100/min | ${(report.tests.concurrent_agents?.ratePerMinute || 0) >= 100 ? '✅' : '❌'} |
| Message Throughput | ${report.tests.message_throughput?.projectedRate?.toFixed(0) || 'N/A'}/min | 1000/min | ${(report.tests.message_throughput?.projectedRate || 0) >= 1000 ? '✅' : '❌'} |
| Concurrent Escrows | ${report.tests.concurrent_escrow?.successful || 'N/A'} | 50 | ${(report.tests.concurrent_escrow?.successful || 0) >= 45 ? '✅' : '❌'} |

### ⚡ Response Times

| Operation | Average | P95 | P99 | Target |
|-----------|---------|-----|-----|--------|
| Single Agent Creation | ${report.tests.baseline_agent?.duration?.toFixed(0) || 'N/A'}ms | - | - | <2000ms |
| Single Message Send | ${report.tests.baseline_message?.duration?.toFixed(0) || 'N/A'}ms | - | - | <500ms |
| Single Escrow Creation | ${report.tests.baseline_escrow?.duration?.toFixed(0) || 'N/A'}ms | - | - | <3000ms |

### 📊 Scalability Projections

- **10K Agents**: ${report.tests.scale_10k_agents ? `Created ${report.tests.scale_10k_agents.actualCreated} agents, projected ${report.tests.scale_10k_agents.projectedTo10K} for 10K target` : 'N/A'}
- **100K Messages**: ${report.tests.scale_100k_messages ? `${report.tests.scale_100k_messages.ratePerSecond.toFixed(2)} msg/s, would complete in ${report.tests.scale_100k_messages.wouldComplete100KIn.toFixed(1)} minutes` : 'N/A'}
- **1M Transactions**: ${report.tests.scale_1m_projection ? `Estimated ${report.tests.scale_1m_projection.projectedDaysTo1M.toFixed(1)} days at ${report.tests.scale_1m_projection.sustainableTPSEstimate.toFixed(1)} TPS` : 'N/A'}

## Bottlenecks Identified

${report.analysis?.bottlenecks?.map(b => `- **${b.type.toUpperCase()}** [${b.severity}]: ${b.description} (${b.value})`).join('\n') || 'No significant bottlenecks identified.'}

## Optimization Recommendations

${report.analysis?.optimizations?.map((opt, i) => `${i + 1}. ${opt}`).join('\n') || 'System performing within acceptable parameters.'}

## Environment Details

- **Platform**: ${report.environment.platform}
- **CPUs**: ${report.environment.cpus}
- **Memory**: ${report.environment.memory.toFixed(2)} GB
- **Node Version**: ${report.environment.nodeVersion}

## Next Steps

1. Review identified bottlenecks and prioritize optimizations
2. Implement recommended performance improvements
3. Re-run performance tests to validate improvements
4. Set up continuous performance monitoring in production

---

*Report generated by GhostSpeak Performance Test Suite*
`;

    const mdPath = path.join(this.reportDir, `performance-report-${Date.now()}.md`);
    await fs.writeFile(mdPath, markdown);
    console.log(`📄 Markdown report saved to: ${mdPath}`);

    return mdPath;
  }

  async run() {
    try {
      await this.initialize();

      // Run the performance tests
      const report = await this.runTests();
      
      if (report) {
        // Generate reports in multiple formats
        const htmlPath = await this.generateHTMLReport(report);
        const mdPath = await this.generateMarkdownReport(report);

        // Summary
        const duration = (Date.now() - this.startTime) / 1000;
        console.log('\n✨ Performance testing complete!');
        console.log(`⏱️  Total time: ${duration.toFixed(2)} seconds`);
        console.log('\n📊 Reports generated:');
        console.log(`   - HTML: ${htmlPath}`);
        console.log(`   - Markdown: ${mdPath}`);
        console.log(`   - JSON: ${path.join(process.cwd(), 'performance-report.json')}`);

        // Open HTML report in browser (optional)
        if (process.platform === 'darwin') {
          spawn('open', [htmlPath]);
        } else if (process.platform === 'win32') {
          spawn('start', [htmlPath], { shell: true });
        }
      }
    } catch (error) {
      console.error('❌ Performance test runner failed:', error);
      process.exit(1);
    }
  }
}

// Execute the performance test runner
const runner = new PerformanceTestRunner();
runner.run().catch(console.error);