#!/usr/bin/env tsx

import { createSolanaRpc } from '@solana/rpc';
import { program } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { execSync } from 'child_process';

interface HealthStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime?: number;
  details?: string;
  timestamp: string;
}

class HealthChecker {
  private results: HealthStatus[] = [];

  constructor() {}

  private log(message: string, level: 'info' | 'warn' | 'error' | 'success' = 'info'): void {
    const colors = {
      info: chalk.blue,
      warn: chalk.yellow,
      error: chalk.red,
      success: chalk.green
    };
    console.log(colors[level](`[${new Date().toISOString()}] ${message}`));
  }

  private async checkSolanaCluster(rpcUrl: string, name: string): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      const connection = createConnection({ url: rpcUrl });
      const version = await connection.getVersion().send();
      const responseTime = Date.now() - startTime;

      return {
        service: `Solana ${name}`,
        status: 'healthy',
        responseTime,
        details: `Version: ${version['solana-core']}`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        service: `Solana ${name}`,
        status: 'down',
        responseTime: Date.now() - startTime,
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  private async checkProgramDeployment(programId: string): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      const output = execSync(`solana account ${programId}`, { encoding: 'utf-8', timeout: 10000 });
      const responseTime = Date.now() - startTime;
      
      if (output.includes('Account not found')) {
        return {
          service: 'GhostSpeak Program',
          status: 'down',
          responseTime,
          details: 'Program account not found',
          timestamp: new Date().toISOString()
        };
      }

      return {
        service: 'GhostSpeak Program',
        status: 'healthy',
        responseTime,
        details: 'Program deployed and accessible',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        service: 'GhostSpeak Program',
        status: 'down',
        responseTime: Date.now() - startTime,
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  private async checkNodeHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      const nodeVersion = process.version;
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();
      
      const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const uptimeHours = Math.round(uptime / 3600 * 100) / 100;
      
      const status = memoryMB > 1000 ? 'degraded' : 'healthy';
      
      return {
        service: 'Node.js Runtime',
        status,
        responseTime: Date.now() - startTime,
        details: `Version: ${nodeVersion}, Memory: ${memoryMB}MB, Uptime: ${uptimeHours}h`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        service: 'Node.js Runtime',
        status: 'down',
        responseTime: Date.now() - startTime,
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  private async checkBuildSystem(): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      // Check Anchor
      const anchorVersion = execSync('anchor --version', { encoding: 'utf-8', timeout: 5000 }).trim();
      
      // Check Cargo
      const cargoVersion = execSync('cargo --version', { encoding: 'utf-8', timeout: 5000 }).trim();
      
      // Check if we can build
      execSync('cd programs && cargo check', { encoding: 'utf-8', timeout: 30000 });
      
      return {
        service: 'Build System',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        details: `${anchorVersion}, ${cargoVersion}`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        service: 'Build System',
        status: 'degraded',
        responseTime: Date.now() - startTime,
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  private async checkPackageDependencies(): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      const auditOutput = execSync('npm audit --audit-level high', { 
        encoding: 'utf-8', 
        timeout: 30000 
      });
      
      const vulnerabilities = auditOutput.includes('found 0 vulnerabilities');
      
      return {
        service: 'Package Dependencies',
        status: vulnerabilities ? 'healthy' : 'degraded',
        responseTime: Date.now() - startTime,
        details: vulnerabilities ? 'No high-severity vulnerabilities' : 'Vulnerabilities found',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      const status = errorMsg.includes('found 0 vulnerabilities') ? 'healthy' : 'degraded';
      
      return {
        service: 'Package Dependencies',
        status,
        responseTime: Date.now() - startTime,
        details: errorMsg,
        timestamp: new Date().toISOString()
      };
    }
  }

  async runHealthChecks(): Promise<HealthStatus[]> {
    this.log('🏥 Starting GhostSpeak Health Check...', 'info');

    const checks: Promise<HealthStatus>[] = [
      this.checkNodeHealth(),
      this.checkBuildSystem(),
      this.checkPackageDependencies(),
      this.checkSolanaCluster('https://api.devnet.solana.com', 'Devnet'),
      this.checkSolanaCluster('https://api.testnet.solana.com', 'Testnet'),
      this.checkProgramDeployment('GssMyhkQPePLzByJsJadbQePZc6GtzGi22aQqW5opvUX')
    ];

    this.results = await Promise.all(checks);
    return this.results;
  }

  displayResults(format: 'table' | 'json' = 'table'): void {
    if (format === 'json') {
      console.log(JSON.stringify(this.results, null, 2));
      return;
    }

    const data = [
      ['Service', 'Status', 'Response Time', 'Details']
    ];

    for (const result of this.results) {
      const statusColor = result.status === 'healthy' 
        ? chalk.green('✓ HEALTHY')
        : result.status === 'degraded' 
        ? chalk.yellow('⚠ DEGRADED')
        : chalk.red('✗ DOWN');

      const responseTime = result.responseTime 
        ? `${result.responseTime}ms`
        : 'N/A';

      data.push([
        result.service,
        statusColor,
        responseTime,
        result.details || 'No details'
      ]);
    }

    console.log('\n' + table(data));

    // Summary
    const healthy = this.results.filter(r => r.status === 'healthy').length;
    const degraded = this.results.filter(r => r.status === 'degraded').length;
    const down = this.results.filter(r => r.status === 'down').length;

    console.log('\n📊 Health Summary:');
    console.log(chalk.green(`  ✓ Healthy: ${healthy}`));
    console.log(chalk.yellow(`  ⚠ Degraded: ${degraded}`));
    console.log(chalk.red(`  ✗ Down: ${down}`));

    const overallStatus = down > 0 ? 'CRITICAL' : degraded > 0 ? 'WARNING' : 'HEALTHY';
    const statusColor = overallStatus === 'HEALTHY' ? chalk.green : 
                       overallStatus === 'WARNING' ? chalk.yellow : chalk.red;

    console.log(`\n🎯 Overall Status: ${statusColor(overallStatus)}\n`);
  }

  getExitCode(): number {
    const down = this.results.filter(r => r.status === 'down').length;
    const degraded = this.results.filter(r => r.status === 'degraded').length;
    
    if (down > 0) return 2; // Critical
    if (degraded > 0) return 1; // Warning
    return 0; // Healthy
  }
}

async function main(): Promise<void> {
  program
    .name('health-check')
    .description('GhostSpeak comprehensive health check system')
    .option('-f, --format <format>', 'Output format (table|json)', 'table')
    .option('-c, --continuous', 'Run continuous monitoring')
    .option('-i, --interval <seconds>', 'Monitoring interval in seconds', '30')
    .parse();

  const options = program.opts();
  const healthChecker = new HealthChecker();

  if (options.continuous) {
    const interval = parseInt(options.interval) * 1000;
    console.log(chalk.blue(`🔄 Starting continuous monitoring (${options.interval}s intervals)...`));
    
    while (true) {
      console.clear();
      await healthChecker.runHealthChecks();
      healthChecker.displayResults(options.format);
      
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  } else {
    await healthChecker.runHealthChecks();
    healthChecker.displayResults(options.format);
    process.exit(healthChecker.getExitCode());
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red('Health check failed:'), error);
    process.exit(3);
  });
}

export { HealthChecker, HealthStatus };