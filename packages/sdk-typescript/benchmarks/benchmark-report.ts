import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

interface BenchmarkData {
  crypto?: any[]
  transactions?: any[]
  loadTest?: any
  timestamp: string
  version: string
}

interface PerformanceBaseline {
  minKeyGenOps: number
  minEncryptOps: number
  minProofOps: number
  minTPS: number
  maxP99Latency: number
  maxErrorRate: number
}

class BenchmarkReporter {
  private baseline: PerformanceBaseline = {
    minKeyGenOps: 1000,    // ops/sec
    minEncryptOps: 5000,   // ops/sec
    minProofOps: 50,       // ops/sec
    minTPS: 50,            // transactions/sec
    maxP99Latency: 2000,   // milliseconds
    maxErrorRate: 5        // percentage
  }
  
  generateReport(data: BenchmarkData): string {
    const report: string[] = []
    
    // Header
    report.push('# GhostSpeak Protocol Performance Benchmark Report')
    report.push(`Generated: ${data.timestamp}`)
    report.push(`Version: ${data.version}`)
    report.push('')
    
    // Executive Summary
    report.push('## Executive Summary')
    report.push('')
    const summary = this.generateExecutiveSummary(data)
    report.push(summary)
    report.push('')
    
    // Cryptographic Performance
    if (data.crypto) {
      report.push('## Cryptographic Operations Performance')
      report.push('')
      report.push(this.generateCryptoSection(data.crypto))
      report.push('')
    }
    
    // Transaction Performance
    if (data.transactions) {
      report.push('## Transaction Performance')
      report.push('')
      report.push(this.generateTransactionSection(data.transactions))
      report.push('')
    }
    
    // Load Test Results
    if (data.loadTest) {
      report.push('## Load Test Results')
      report.push('')
      report.push(this.generateLoadTestSection(data.loadTest))
      report.push('')
    }
    
    // Performance Analysis
    report.push('## Performance Analysis')
    report.push('')
    report.push(this.generateAnalysis(data))
    report.push('')
    
    // Recommendations
    report.push('## Recommendations')
    report.push('')
    report.push(this.generateRecommendations(data))
    report.push('')
    
    // Baseline Comparison
    report.push('## Baseline Comparison')
    report.push('')
    report.push(this.generateBaselineComparison(data))
    
    return report.join('\n')
  }
  
  private generateExecutiveSummary(data: BenchmarkData): string {
    const summary: string[] = []
    
    let passedTests = 0
    let totalTests = 0
    const issues: string[] = []
    
    // Check crypto performance
    if (data.crypto) {
      totalTests++
      const keyGenOps = this.getAverageOpsPerSec(data.crypto, 'Generation')
      if (keyGenOps >= this.baseline.minKeyGenOps) {
        passedTests++
      } else {
        issues.push(`Key generation below baseline (${keyGenOps.toFixed(0)} vs ${this.baseline.minKeyGenOps} ops/sec)`)
      }
      
      totalTests++
      const encryptOps = this.getAverageOpsPerSec(data.crypto, 'Encrypt')
      if (encryptOps >= this.baseline.minEncryptOps) {
        passedTests++
      } else {
        issues.push(`Encryption below baseline (${encryptOps.toFixed(0)} vs ${this.baseline.minEncryptOps} ops/sec)`)
      }
    }
    
    // Check transaction performance
    if (data.transactions) {
      totalTests++
      const avgTPS = this.getAverageTPS(data.transactions)
      if (avgTPS >= this.baseline.minTPS) {
        passedTests++
      } else {
        issues.push(`TPS below baseline (${avgTPS.toFixed(1)} vs ${this.baseline.minTPS} TPS)`)
      }
    }
    
    // Check load test
    if (data.loadTest) {
      totalTests++
      if (data.loadTest.errorRate <= this.baseline.maxErrorRate) {
        passedTests++
      } else {
        issues.push(`Error rate above threshold (${data.loadTest.errorRate.toFixed(1)}% vs ${this.baseline.maxErrorRate}%)`)
      }
      
      totalTests++
      if (data.loadTest.p99Latency <= this.baseline.maxP99Latency) {
        passedTests++
      } else {
        issues.push(`P99 latency above threshold (${data.loadTest.p99Latency}ms vs ${this.baseline.maxP99Latency}ms)`)
      }
    }
    
    const overallScore = (passedTests / totalTests) * 100
    
    summary.push(`### Overall Performance Score: ${overallScore.toFixed(0)}% (${passedTests}/${totalTests} tests passed)`)
    summary.push('')
    
    if (overallScore >= 90) {
      summary.push('✅ **Performance meets production requirements**')
    } else if (overallScore >= 70) {
      summary.push('⚠️ **Performance is acceptable but has room for improvement**')
    } else {
      summary.push('❌ **Performance does not meet production requirements**')
    }
    
    if (issues.length > 0) {
      summary.push('')
      summary.push('### Key Issues:')
      issues.forEach(issue => summary.push(`- ${issue}`))
    }
    
    return summary.join('\n')
  }
  
  private generateCryptoSection(crypto: any[]): string {
    const section: string[] = []
    
    section.push('### Key Generation')
    section.push('| Operation | Avg (ms) | Ops/sec | Min (ms) | Max (ms) |')
    section.push('|-----------|----------|---------|----------|----------|')
    
    crypto.filter(r => r.operation.includes('Generation'))
      .forEach(r => {
        section.push(`| ${r.operation} | ${r.averageTime.toFixed(3)} | ${r.opsPerSecond.toFixed(0)} | ${r.minTime.toFixed(3)} | ${r.maxTime.toFixed(3)} |`)
      })
    
    section.push('')
    section.push('### Encryption/Decryption')
    section.push('| Operation | Avg (ms) | Ops/sec | Min (ms) | Max (ms) |')
    section.push('|-----------|----------|---------|----------|----------|')
    
    crypto.filter(r => r.operation.includes('Encrypt') || r.operation.includes('Decrypt'))
      .forEach(r => {
        section.push(`| ${r.operation} | ${r.averageTime.toFixed(3)} | ${r.opsPerSecond.toFixed(0)} | ${r.minTime.toFixed(3)} | ${r.maxTime.toFixed(3)} |`)
      })
    
    section.push('')
    section.push('### Zero-Knowledge Proofs')
    section.push('| Operation | Avg (ms) | Ops/sec | Min (ms) | Max (ms) |')
    section.push('|-----------|----------|---------|----------|----------|')
    
    crypto.filter(r => r.operation.includes('Proof') || r.operation.includes('proof'))
      .forEach(r => {
        section.push(`| ${r.operation} | ${r.averageTime.toFixed(3)} | ${r.opsPerSecond.toFixed(0)} | ${r.minTime.toFixed(3)} | ${r.maxTime.toFixed(3)} |`)
      })
    
    return section.join('\n')
  }
  
  private generateTransactionSection(transactions: any[]): string {
    const section: string[] = []
    
    section.push('| Operation | Success % | TPS | Avg (ms) | P95 (ms) | P99 (ms) |')
    section.push('|-----------|-----------|-----|----------|----------|----------|')
    
    transactions.forEach(r => {
      const successRate = ((r.successCount / r.iterations) * 100).toFixed(1)
      section.push(`| ${r.operation} | ${successRate}% | ${r.tps.toFixed(1)} | ${r.averageTime.toFixed(2)} | ${r.p95Time.toFixed(2)} | ${r.p99Time.toFixed(2)} |`)
    })
    
    return section.join('\n')
  }
  
  private generateLoadTestSection(loadTest: any): string {
    const section: string[] = []
    
    section.push('### Test Configuration')
    section.push(`- Duration: ${loadTest.totalDuration.toFixed(1)}s`)
    section.push(`- Concurrent Users: ${loadTest.concurrentUsers || 'N/A'}`)
    section.push(`- Total Transactions: ${loadTest.totalTransactions}`)
    section.push('')
    
    section.push('### Results')
    section.push(`- **Average TPS**: ${loadTest.tps.toFixed(1)}`)
    section.push(`- **Peak TPS**: ${loadTest.peakTps.toFixed(1)}`)
    section.push(`- **Success Rate**: ${((loadTest.successfulTransactions / loadTest.totalTransactions) * 100).toFixed(1)}%`)
    section.push(`- **Error Rate**: ${loadTest.errorRate.toFixed(1)}%`)
    section.push('')
    
    section.push('### Latency Distribution')
    section.push(`- Average: ${loadTest.averageLatency.toFixed(0)}ms`)
    section.push(`- P95: ${loadTest.p95Latency.toFixed(0)}ms`)
    section.push(`- P99: ${loadTest.p99Latency.toFixed(0)}ms`)
    section.push(`- Min: ${loadTest.minLatency}ms`)
    section.push(`- Max: ${loadTest.maxLatency}ms`)
    
    if (loadTest.memoryUsage) {
      section.push('')
      section.push('### Resource Usage')
      const startMB = loadTest.memoryUsage.start.heapUsed / 1024 / 1024
      const peakMB = loadTest.memoryUsage.peak.heapUsed / 1024 / 1024
      const endMB = loadTest.memoryUsage.end.heapUsed / 1024 / 1024
      section.push(`- Memory Start: ${startMB.toFixed(1)}MB`)
      section.push(`- Memory Peak: ${peakMB.toFixed(1)}MB`)
      section.push(`- Memory End: ${endMB.toFixed(1)}MB`)
      section.push(`- Memory Growth: ${(endMB - startMB).toFixed(1)}MB`)
    }
    
    return section.join('\n')
  }
  
  private generateAnalysis(data: BenchmarkData): string {
    const analysis: string[] = []
    
    analysis.push('### Strengths')
    const strengths: string[] = []
    
    if (data.crypto) {
      const encryptOps = this.getAverageOpsPerSec(data.crypto, 'Encrypt')
      if (encryptOps > 10000) {
        strengths.push('Excellent encryption performance')
      }
    }
    
    if (data.transactions) {
      const avgTPS = this.getAverageTPS(data.transactions)
      if (avgTPS > 100) {
        strengths.push('High transaction throughput')
      }
    }
    
    if (data.loadTest && data.loadTest.errorRate < 1) {
      strengths.push('Very low error rate under load')
    }
    
    strengths.forEach(s => analysis.push(`- ${s}`))
    
    analysis.push('')
    analysis.push('### Areas for Improvement')
    const improvements: string[] = []
    
    if (data.crypto) {
      const proofOps = this.getAverageOpsPerSec(data.crypto, 'Proof')
      if (proofOps < 100) {
        improvements.push('Zero-knowledge proof generation is computationally intensive')
      }
    }
    
    if (data.transactions) {
      const batchOps = data.transactions.filter(t => t.operation.includes('Batch'))
      if (batchOps.some(op => op.tps < 10)) {
        improvements.push('Batch operations need optimization')
      }
    }
    
    if (data.loadTest && data.loadTest.p99Latency > 5000) {
      improvements.push('High tail latency under load')
    }
    
    improvements.forEach(i => analysis.push(`- ${i}`))
    
    return analysis.join('\n')
  }
  
  private generateRecommendations(data: BenchmarkData): string {
    const recommendations: string[] = []
    
    recommendations.push('### Immediate Actions')
    
    if (data.crypto) {
      const proofOps = this.getAverageOpsPerSec(data.crypto, 'Proof')
      if (proofOps < this.baseline.minProofOps) {
        recommendations.push('1. **Optimize ZK Proof Generation**')
        recommendations.push('   - Consider caching frequently used proofs')
        recommendations.push('   - Implement proof batching where possible')
        recommendations.push('   - Use lighter proof systems for non-critical operations')
      }
    }
    
    if (data.transactions) {
      const avgTPS = this.getAverageTPS(data.transactions)
      if (avgTPS < this.baseline.minTPS) {
        recommendations.push('2. **Improve Transaction Throughput**')
        recommendations.push('   - Implement connection pooling')
        recommendations.push('   - Use transaction batching')
        recommendations.push('   - Add client-side caching')
      }
    }
    
    recommendations.push('')
    recommendations.push('### Long-term Optimizations')
    recommendations.push('- Implement horizontal scaling for high-load scenarios')
    recommendations.push('- Add performance monitoring and alerting')
    recommendations.push('- Create performance regression tests')
    recommendations.push('- Consider using specialized hardware for crypto operations')
    
    return recommendations.join('\n')
  }
  
  private generateBaselineComparison(data: BenchmarkData): string {
    const comparison: string[] = []
    
    comparison.push('| Metric | Current | Baseline | Status |')
    comparison.push('|--------|---------|----------|--------|')
    
    if (data.crypto) {
      const keyGenOps = this.getAverageOpsPerSec(data.crypto, 'Generation')
      comparison.push(`| Key Generation | ${keyGenOps.toFixed(0)} ops/s | ${this.baseline.minKeyGenOps} ops/s | ${keyGenOps >= this.baseline.minKeyGenOps ? '✅' : '❌'} |`)
      
      const encryptOps = this.getAverageOpsPerSec(data.crypto, 'Encrypt')
      comparison.push(`| Encryption | ${encryptOps.toFixed(0)} ops/s | ${this.baseline.minEncryptOps} ops/s | ${encryptOps >= this.baseline.minEncryptOps ? '✅' : '❌'} |`)
      
      const proofOps = this.getAverageOpsPerSec(data.crypto, 'Proof')
      comparison.push(`| Proof Generation | ${proofOps.toFixed(0)} ops/s | ${this.baseline.minProofOps} ops/s | ${proofOps >= this.baseline.minProofOps ? '✅' : '❌'} |`)
    }
    
    if (data.transactions) {
      const avgTPS = this.getAverageTPS(data.transactions)
      comparison.push(`| Average TPS | ${avgTPS.toFixed(1)} | ${this.baseline.minTPS} | ${avgTPS >= this.baseline.minTPS ? '✅' : '❌'} |`)
    }
    
    if (data.loadTest) {
      comparison.push(`| P99 Latency | ${data.loadTest.p99Latency}ms | ${this.baseline.maxP99Latency}ms | ${data.loadTest.p99Latency <= this.baseline.maxP99Latency ? '✅' : '❌'} |`)
      comparison.push(`| Error Rate | ${data.loadTest.errorRate.toFixed(1)}% | ${this.baseline.maxErrorRate}% | ${data.loadTest.errorRate <= this.baseline.maxErrorRate ? '✅' : '❌'} |`)
    }
    
    return comparison.join('\n')
  }
  
  private getAverageOpsPerSec(crypto: any[], filter: string): number {
    const ops = crypto.filter(r => r.operation.includes(filter))
    if (ops.length === 0) return 0
    return ops.reduce((sum, r) => sum + r.opsPerSecond, 0) / ops.length
  }
  
  private getAverageTPS(transactions: any[]): number {
    if (transactions.length === 0) return 0
    return transactions.reduce((sum, r) => sum + r.tps, 0) / transactions.length
  }
  
  saveReport(report: string, filename: string = 'benchmark-report.md'): void {
    writeFileSync(filename, report)
    console.log(`\n📄 Report saved to: ${filename}`)
  }
  
  saveJSON(data: BenchmarkData, filename: string = 'benchmark-data.json'): void {
    writeFileSync(filename, JSON.stringify(data, null, 2))
    console.log(`📊 Raw data saved to: ${filename}`)
  }
}

// Example usage
export async function generateBenchmarkReport() {
  const reporter = new BenchmarkReporter()
  
  // In a real scenario, this data would come from actual benchmark runs
  const mockData: BenchmarkData = {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    crypto: [
      { operation: 'Ed25519 Keypair Generation', averageTime: 0.5, opsPerSecond: 2000, minTime: 0.3, maxTime: 1.2 },
      { operation: 'ElGamal Encrypt (1000)', averageTime: 0.15, opsPerSecond: 6666, minTime: 0.1, maxTime: 0.3 },
      { operation: 'Range Proof Generation (1000)', averageTime: 12, opsPerSecond: 83, minTime: 10, maxTime: 15 }
    ],
    transactions: [
      { operation: 'Agent Registration', successCount: 95, iterations: 100, tps: 75.5, averageTime: 13.2, p95Time: 25, p99Time: 35 },
      { operation: 'Escrow Creation', successCount: 190, iterations: 200, tps: 82.3, averageTime: 12.1, p95Time: 22, p99Time: 30 }
    ],
    loadTest: {
      totalTransactions: 1000,
      successfulTransactions: 950,
      failedTransactions: 50,
      totalDuration: 60,
      averageLatency: 150,
      p95Latency: 500,
      p99Latency: 1500,
      minLatency: 50,
      maxLatency: 3000,
      tps: 15.8,
      peakTps: 25.2,
      errorRate: 5.0,
      memoryUsage: {
        start: { heapUsed: 50 * 1024 * 1024 } as any,
        peak: { heapUsed: 120 * 1024 * 1024 } as any,
        end: { heapUsed: 80 * 1024 * 1024 } as any
      }
    }
  }
  
  const report = reporter.generateReport(mockData)
  reporter.saveReport(report)
  reporter.saveJSON(mockData)
  
  return report
}

// Export for use in tests
export { BenchmarkReporter, type BenchmarkData, type PerformanceBaseline }