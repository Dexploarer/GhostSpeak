# GhostSpeak DevOps & Monitoring Automation

This document describes the comprehensive DevOps automation system built for GhostSpeak, designed for solo developer workflow optimization.

## Overview

The DevOps automation system provides:
- **Automated Testing & Quality Assurance**
- **Health Monitoring & Alerting**
- **Performance Benchmarking**
- **Security Auditing**
- **CI/CD Pipeline Automation**
- **Environment Management**
- **Deployment Automation**
- **Load Testing & Simulation**

## Core Scripts

### 1. Health Check System (`health-check.ts`)

Comprehensive health monitoring for all system components.

```bash
# Run one-time health check
npm run verify:health

# Continuous monitoring
npm run verify:health -- --continuous --interval 30

# JSON output for automation
npm run verify:health -- --format json
```

**Features:**
- Solana cluster connectivity
- Program deployment verification
- Node.js runtime health
- Build system status
- Package dependency security

### 2. Monitoring Dashboard (`monitoring-dashboard.ts`)

Real-time system monitoring with visual dashboard.

```bash
# Start monitoring dashboard
npm run monitor:dashboard

# One-time status check
npm run monitor:dashboard -- --once

# Custom update interval
npm run monitor:dashboard -- --interval 5
```

**Features:**
- System resource monitoring
- Transaction metrics
- Service health status
- Performance charts
- Historical data logging

### 3. Performance Monitor (`performance-monitor.ts`)

Real-time performance monitoring with alerting.

```bash
# Start performance monitoring
npm run monitor:performance

# Monitor for specific duration
npm run monitor:performance -- --duration 60 --interval 30

# Show current status
npm run monitor:performance -- --status

# View active alerts
npm run monitor:performance -- --alerts
```

**Monitors:**
- CPU usage and load average
- Memory usage (system and Node.js)
- Disk usage
- Process uptime
- Performance alerts with thresholds

### 4. Alert System (`alert-system.ts`)

Intelligent alerting with multiple channels.

```bash
# Start alert monitoring
npm run monitor:alerts -- --monitor

# Run one-time alert checks
npm run monitor:alerts -- --check

# Show alert status
npm run monitor:alerts -- --status

# Resolve specific alert
npm run monitor:alerts -- --resolve alert-id-123
```

**Alert Types:**
- Health degradation
- Performance thresholds
- Security issues
- Deployment failures
- Error pattern detection

### 5. Quality Gate System (`quality-gate.ts`)

Automated quality assurance with configurable gates.

```bash
# Run full quality gate
npm run qa:all

# CI mode (fail on issues)
npm run qa:all -- --ci

# Required checks only
npm run qa:all -- --required-only
```

**Quality Checks:**
- TypeScript/Rust linting
- Type checking
- Code formatting
- Test coverage
- Security vulnerabilities
- Performance metrics
- Documentation coverage

### 6. Security Audit (`security-audit.ts`)

Comprehensive security analysis and reporting.

```bash
# Run security audit
npm run qa:security

# CI mode with exit codes
npm run qa:security -- --ci

# Save detailed report
npm run qa:security -- --output ./security-reports/audit.json
```

**Security Analysis:**
- npm/Cargo dependency scanning
- Static code analysis
- Configuration security
- Smart contract vulnerabilities
- Hardcoded secrets detection

### 7. Benchmark Suite (`benchmark-suite.ts`)

Performance benchmarking for all system components.

```bash
# Run full benchmark suite
npm run benchmark:run

# Run specific benchmark suite
npm run benchmark:run -- --suite "Build Performance"

# Enable garbage collection monitoring
npm run benchmark:run -- --gc
```

**Benchmark Categories:**
- Build performance (Rust, TypeScript, IDL)
- Test execution times
- Runtime operations
- Memory usage patterns
- Network operations

### 8. Load Simulator (`load-simulator.ts`)

Realistic load testing and stress testing.

```bash
# Run load simulation
npm run simulate:load

# Custom configuration
npm run simulate:load -- --duration 10 --concurrency 20 --tps 15

# Save results
npm run simulate:load -- --output ./load-test-results
```

**Load Testing:**
- Agent registration simulation
- Task creation/completion
- Payment transactions
- Dispute scenarios
- Network stress testing

### 9. Data Generator (`data-generator.ts`)

Synthetic data generation for testing and development.

```bash
# Generate test data
npm run simulate:data

# Custom data volumes
npm run simulate:data -- --agents 500 --tasks 1000 --transactions 2000

# Include test scenarios
npm run simulate:data -- --scenarios
```

**Generated Data:**
- Realistic agent profiles
- Task marketplace data
- Transaction histories
- Market analytics
- Test scenarios

### 10. CI/CD Pipeline (`ci-pipeline.ts`)

Automated continuous integration pipeline.

```bash
# Run full CI pipeline
npm run ci:pipeline

# Skip specific stages
npm run ci:pipeline -- --skip-security --skip-deployment

# Parallel test execution
npm run ci:pipeline -- --parallel
```

**Pipeline Stages:**
1. Environment setup
2. Dependency installation
3. Code quality checks
4. Security auditing
5. Build process
6. Test execution
7. Health verification
8. Deployment (optional)

### 11. Automated Deployment (`automated-deployment.ts`)

Automated deployment with safety checks.

```bash
# Deploy to devnet
npm run deploy:auto -- --environment devnet

# Production deployment with backup
npm run deploy:auto -- --environment mainnet --backup-first

# Skip quality checks (not recommended)
npm run deploy:auto -- --skip-tests --skip-health-check
```

**Deployment Features:**
- Pre-deployment validation
- Automated backups
- Quality gate integration
- Health verification
- Rollback preparation

### 12. Development Environment (`dev-environment.ts`)

Development environment management and automation.

```bash
# Interactive setup
npm run dev:start -- --interactive

# Start development services
npm run dev:start

# Setup environment only
npm run dev:start -- --setup

# Show environment status
npm run dev:start -- --status
```

**Environment Management:**
- Solana cluster configuration
- Service orchestration
- Environment variables
- Development tools
- Hot reload setup

### 13. Deployment Manager (`deployment-manager.ts`)

Production-grade deployment management.

```bash
# Interactive deployment
npm run deploy:manager -- --interactive

# Deploy to specific environment
npm run deploy:manager -- --deploy production

# View deployment history
npm run deploy:manager -- --history

# Rollback deployment
npm run deploy:manager -- --rollback deploy-id-123
```

**Deployment Management:**
- Multi-environment support
- Approval workflows
- Deployment history
- Rollback capabilities
- Notification integration

## Quick Start Guide

### 1. Initial Setup

```bash
# Install dependencies
npm ci

# Setup development environment
npm run dev:start -- --interactive

# Run initial health check
npm run verify:health
```

### 2. Daily Development Workflow

```bash
# Start monitoring dashboard
npm run monitor:dashboard &

# Start performance monitoring
npm run monitor:performance -- --duration 480 &  # 8 hours

# Run quality checks before committing
npm run qa:all

# Generate test data when needed
npm run simulate:data
```

### 3. Pre-Deployment Checklist

```bash
# Run full quality gate
npm run qa:all -- --ci

# Run security audit
npm run qa:security -- --ci

# Run performance benchmarks
npm run benchmark:run

# Verify health
npm run verify:health
```

### 4. Deployment Process

```bash
# For staging/testing
npm run deploy:auto -- --environment testnet

# For production (interactive)
npm run deploy:manager -- --interactive
```

## Configuration

### Environment Variables

Create a `.env` file with:

```env
NODE_ENV=development
LOG_LEVEL=debug
SOLANA_CLUSTER=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
ENABLE_MONITORING=true
ENABLE_ALERTS=true
```

### Quality Gate Configuration

Customize thresholds in `config/quality-gate.json`:

```json
{
  "thresholds": {
    "linting": { "maxErrors": 0, "maxWarnings": 50 },
    "testing": { "minCoverage": 80, "minPassRate": 95 },
    "security": { "maxCritical": 0, "maxHigh": 2 }
  }
}
```

### Alert Configuration

Configure alerts in `config/alerts.json`:

```json
{
  "rules": [
    {
      "id": "cpu-critical",
      "type": "performance",
      "condition": { "metric": "cpu", "operator": "gt", "threshold": 90 },
      "severity": "critical",
      "channels": ["console", "webhook"]
    }
  ]
}
```

## Integration with IDEs

### VS Code Configuration

Add to `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Health Check",
      "type": "npm",
      "script": "verify:health",
      "group": "test"
    },
    {
      "label": "Quality Gate",
      "type": "npm", 
      "script": "qa:all",
      "group": "build"
    }
  ]
}
```

### Git Hooks

Set up pre-commit hooks in `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
npm run precommit
```

Set up pre-push hooks in `.husky/pre-push`:

```bash
#!/usr/bin/env sh
npm run prepush
```

## Monitoring & Observability

### Logs Structure

All logs are structured and saved to:
- `logs/combined.log` - All application logs
- `logs/error.log` - Error logs only
- `logs/app.log` - Application-specific logs
- `logs/alerts/` - Alert-specific logs

### Metrics Export

Metrics are exported in multiple formats:
- JSON for programmatic access
- CSV for analysis tools
- Real-time dashboard display
- Historical trend analysis

### Health Endpoints

The system provides health check endpoints:
- System health: Overall system status
- Service health: Individual service status
- Performance metrics: Real-time performance data
- Alert status: Active alerts and history

## Troubleshooting

### Common Issues

1. **Permission Errors**
   ```bash
   # Fix file permissions
   chmod +x scripts/*.ts
   ```

2. **Port Conflicts**
   ```bash
   # Check port usage
   lsof -i :3000
   ```

3. **Memory Issues**
   ```bash
   # Monitor memory usage
   npm run monitor:performance -- --status
   ```

4. **Build Failures**
   ```bash
   # Clean and rebuild
   npm run clean && npm run build:all
   ```

### Debug Mode

Enable debug mode for detailed logging:

```bash
export DEBUG=true
export LOG_LEVEL=debug
npm run monitor:dashboard
```

## Performance Optimization

### Resource Limits

Configure resource limits:
- CPU threshold: 70% warning, 90% critical
- Memory threshold: 80% warning, 95% critical  
- Disk threshold: 85% warning, 95% critical
- Network timeout: 30 seconds

### Optimization Tips

1. **Monitoring Intervals**
   - Development: 30-60 seconds
   - Production: 5-10 seconds
   - Critical systems: 1-5 seconds

2. **Log Rotation**
   - Max file size: 10MB
   - Keep 5 rotated files
   - Compress old logs

3. **Alert Cooldown**
   - Critical: 0-5 minutes
   - High: 15 minutes
   - Medium: 30 minutes
   - Low: 60 minutes

## Security Considerations

### Secrets Management

- Never commit secrets to git
- Use environment variables
- Implement secret rotation
- Audit secret access

### Network Security

- Use HTTPS for all external calls
- Validate SSL certificates
- Implement rate limiting
- Monitor for suspicious activity

### Access Control

- Implement role-based access
- Log all administrative actions
- Require approval for production changes
- Audit user permissions regularly

## Maintenance

### Daily Tasks

- Review overnight alerts
- Check system health
- Monitor resource usage
- Review error logs

### Weekly Tasks

- Run security audit
- Update dependencies
- Review performance trends
- Clean up old logs

### Monthly Tasks

- Benchmark performance
- Review and update thresholds
- Audit access permissions
- Update documentation

## Support & Documentation

For additional help:
- Review individual script documentation
- Check log files for detailed errors
- Run health checks for system status
- Contact the development team

---

This DevOps automation system provides comprehensive monitoring, testing, and deployment capabilities optimized for solo developer workflows while maintaining production-grade reliability and security standards.