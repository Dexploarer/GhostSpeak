# 🎯 GhostSpeak Testnet Testing Guide

This comprehensive guide covers all aspects of testing the GhostSpeak protocol on Solana testnet, including deployment, monitoring, performance benchmarking, and error recovery testing.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Testing Scripts](#testing-scripts)
4. [Deployment Process](#deployment-process)
5. [Comprehensive Testing](#comprehensive-testing)
6. [Performance Benchmarking](#performance-benchmarking)
7. [Error Recovery Testing](#error-recovery-testing)
8. [Continuous Monitoring](#continuous-monitoring)
9. [CI/CD Integration](#cicd-integration)
10. [Troubleshooting](#troubleshooting)

## 🔍 Overview

The GhostSpeak testnet testing framework provides:

- **Automated Deployment**: Safe deployment to testnet with verification and rollback
- **Comprehensive Testing**: End-to-end workflow testing covering all protocol features
- **Performance Benchmarking**: Latency, throughput, and scalability measurement
- **Error Recovery**: Fault tolerance and recovery scenario testing
- **Continuous Monitoring**: 24/7 health monitoring with alerting
- **CI/CD Integration**: Automated testing pipeline for continuous validation

## 🛠️ Prerequisites

### System Requirements
- Node.js 20.x or higher
- Solana CLI 1.18.x or higher
- Anchor CLI 0.31.1 or higher
- At least 15 SOL in testnet wallet for deployment and testing

### Environment Setup
```bash
# Install dependencies
npm install

# Configure Solana for testnet
solana config set --url https://api.testnet.solana.com

# Verify your wallet has sufficient SOL
solana balance

# If needed, airdrop SOL for testing
solana airdrop 10
```

### Required Environment Variables
```bash
export TESTNET_RPC_URL="https://api.testnet.solana.com"
export SOLANA_KEYPAIR_PATH="~/.config/solana/id.json"
export SLACK_WEBHOOK_URL="your-slack-webhook-url" # Optional for notifications
```

## 🚀 Testing Scripts

All testing scripts are located in the `scripts/` directory and are designed to be run independently or as part of a complete testing pipeline.

### Available Scripts

| Script | Purpose | Duration | Resource Usage |
|--------|---------|----------|----------------|
| `testnet-deploy.ts` | Deploy to testnet with verification | 2-5 minutes | 5-10 SOL |
| `testnet-test-runner.ts` | Comprehensive functionality testing | 10-15 minutes | 2-5 SOL |
| `performance-benchmarks.ts` | Performance and load testing | 15-30 minutes | 3-8 SOL |
| `error-recovery-tester.ts` | Error scenarios and recovery | 10-20 minutes | 2-5 SOL |
| `continuous-testnet-monitor.ts` | 24/7 monitoring system | Ongoing | 1-2 SOL/day |
| `automated-ci-testnet.ts` | Complete CI/CD pipeline | 20-40 minutes | 10-20 SOL |

## 📦 Deployment Process

### 1. Single Deployment
```bash
# Deploy to testnet with verification
npm run deploy:testnet
# or
tsx scripts/testnet-deploy.ts
```

### 2. Deployment Features
- **Pre-deployment checks**: Validates environment and prerequisites
- **Safe deployment**: Uses specified program ID with verification
- **Post-deployment verification**: Confirms deployment success
- **IDL management**: Automatically uploads/updates program IDL
- **Automatic rollback**: Reverts on deployment failure
- **Detailed reporting**: Generates deployment reports

### 3. Deployment Verification
The deployment script automatically verifies:
- Program account is executable
- IDL is accessible on-chain
- Basic functionality is working
- Transaction confirmation

## 🧪 Comprehensive Testing

### 1. Run Full Test Suite
```bash
# Complete testing suite
tsx scripts/testnet-test-runner.ts
```

### 2. Testing Categories

#### Core Functionality Tests
- ✅ Agent registration and management
- ✅ Marketplace listing and discovery
- ✅ Escrow creation and management
- ✅ Payment processing
- ✅ Channel creation for A2A communication

#### End-to-End Workflow Tests
- ✅ Complete agent-to-agent transactions
- ✅ Multi-party escrow scenarios
- ✅ Service discovery and purchase flows
- ✅ Work order creation and fulfillment

#### Integration Tests
- ✅ CLI command validation
- ✅ SDK functionality verification
- ✅ On-chain state consistency
- ✅ Cross-component integration

### 3. Test Results
Tests generate detailed reports including:
- Individual test outcomes
- Performance metrics
- Error analysis
- State verification
- Recommendations for improvements

## ⚡ Performance Benchmarking

### 1. Run Performance Tests
```bash
# Complete performance benchmark suite
tsx scripts/performance-benchmarks.ts
```

### 2. Benchmark Categories

#### Throughput Testing
- Measures operations per second for each instruction type
- Tests concurrent operation handling
- Evaluates system scalability

#### Latency Analysis
- Average, P95, and P99 latency measurements
- Network and processing latency breakdown
- Response time consistency analysis

#### Load Testing
- High-frequency operation testing
- Sustained load performance
- Resource usage under stress

#### Scalability Testing
- Performance at different concurrency levels
- Memory usage patterns
- System degradation points

### 3. Performance Metrics
- **Throughput**: Operations per second
- **Latency**: Response time percentiles
- **Error Rate**: Failure percentage
- **Resource Usage**: Memory and CPU consumption
- **Gas Costs**: SOL consumption per operation

### 4. Performance Baselines
Current performance targets:
- **Agent Registration**: 2-5 ops/sec, <3s latency
- **Marketplace Queries**: 10-20 ops/sec, <1s latency
- **Escrow Operations**: 3-8 ops/sec, <2s latency
- **Error Rate**: <5% under normal conditions

## 🔥 Error Recovery Testing

### 1. Run Error Recovery Tests
```bash
# Complete error recovery test suite
tsx scripts/error-recovery-tester.ts
```

### 2. Error Scenarios

#### Network Failure Testing
- ✅ Connection loss during operations
- ✅ RPC endpoint failures
- ✅ Network timeout handling
- ✅ Graceful recovery procedures

#### Transaction Failure Testing
- ✅ Insufficient funds scenarios
- ✅ Transaction timeout handling
- ✅ Failed transaction recovery
- ✅ State consistency verification

#### Security Testing
- ✅ Invalid input rejection
- ✅ Malformed data handling
- ✅ SQL injection prevention
- ✅ Authorization verification

#### State Corruption Testing
- ✅ Corruption detection
- ✅ Recovery procedures
- ✅ Data integrity verification
- ✅ Backup restoration

#### Resource Exhaustion Testing
- ✅ Memory limit handling
- ✅ Concurrent operation limits
- ✅ Graceful degradation
- ✅ Resource cleanup

### 3. Recovery Procedures
Each error scenario includes:
- Detection mechanisms
- Automatic recovery steps
- Manual intervention procedures
- Verification of recovery success

## 📊 Continuous Monitoring

### 1. Start Monitoring
```bash
# Start 24/7 testnet monitoring
tsx scripts/continuous-testnet-monitor.ts
```

### 2. Monitoring Features
- **Health Checks**: Regular functionality verification
- **Performance Tracking**: Latency and throughput monitoring
- **Alert System**: Threshold-based notifications
- **Historical Data**: Long-term trend analysis
- **Dashboard**: Real-time status visualization

### 3. Alert Thresholds
Default alert thresholds:
- **Latency**: >10 seconds (warning), >20 seconds (critical)
- **Error Rate**: >20% (warning), >50% (critical)
- **Uptime**: <95% (warning), <90% (critical)

### 4. Monitoring Dashboard
```bash
# Generate monitoring dashboard
tsx scripts/continuous-testnet-monitor.ts dashboard
```

The dashboard provides:
- Current system status
- Recent performance metrics
- Alert history
- Trend analysis
- Uptime statistics

## 🔄 CI/CD Integration

### 1. Run CI Pipeline
```bash
# Complete CI/CD pipeline
tsx scripts/automated-ci-testnet.ts
```

### 2. Pipeline Stages
1. **Environment Setup**: Verify prerequisites and configuration
2. **Code Quality**: Linting, formatting, and type checking
3. **Security Scanning**: Dependency and code security analysis
4. **Build & Compile**: Program and package compilation
5. **Unit Tests**: Individual component testing
6. **Integration Tests**: Cross-component functionality
7. **Testnet Deployment**: Safe deployment with verification
8. **End-to-End Tests**: Complete workflow validation
9. **Performance Tests**: Benchmark and regression detection
10. **Load Tests**: Scalability and stress testing
11. **Smoke Tests**: Basic functionality verification
12. **Health Checks**: Final system verification

### 3. CI Features
- **Automated Rollback**: Reverts deployment on failure
- **Performance Regression**: Detects performance degradation
- **Security Scanning**: Identifies vulnerabilities
- **Notification System**: Slack/Discord integration
- **Detailed Reporting**: Comprehensive pipeline results

### 4. GitHub Actions Integration
Create `.github/workflows/testnet-ci.yml`:
```yaml
name: Testnet CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  testnet-testing:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install Solana
        run: |
          sh -c "$(curl -sSfL https://release.solana.com/v1.18.0/install)"
          echo "$HOME/.local/share/solana/install/active_release/bin" >> $GITHUB_PATH
      - name: Install Anchor
        run: |
          npm install -g @coral-xyz/anchor-cli@0.31.1
      - name: Install dependencies
        run: npm install
      - name: Run CI Pipeline
        env:
          TESTNET_RPC_URL: ${{ secrets.TESTNET_RPC_URL }}
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
        run: tsx scripts/automated-ci-testnet.ts
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Deployment Failures
**Issue**: Program deployment fails
**Solutions**:
- Verify sufficient SOL balance (>10 SOL recommended)
- Check network connectivity to testnet
- Ensure program ID is correct
- Verify keypair permissions

#### 2. Test Failures
**Issue**: Tests fail unexpectedly
**Solutions**:
- Check testnet network status
- Verify RPC endpoint availability
- Ensure sufficient SOL for test operations
- Review error logs for specific issues

#### 3. Performance Issues
**Issue**: Poor performance metrics
**Solutions**:
- Check network latency to testnet
- Verify local system resources
- Monitor concurrent operation limits
- Review RPC endpoint performance

#### 4. Monitoring Issues
**Issue**: Monitoring system not working
**Solutions**:
- Verify network connectivity
- Check filesystem permissions for log files
- Ensure sufficient disk space
- Review monitoring configuration

### Debugging Commands

```bash
# Check Solana configuration
solana config get

# Verify program account
solana account AJVoWJ4JC1xJR9ufGBGuMgFpHMLouB29sFRTJRvEK1ZR

# Test CLI connectivity
npx ghostspeak --version

# Check recent transaction logs
solana logs AJVoWJ4JC1xJR9ufGBGuMgFpHMLouB29sFRTJRvEK1ZR

# Verify IDL availability
anchor idl fetch AJVoWJ4JC1xJR9ufGBGuMgFpHMLouB29sFRTJRvEK1ZR
```

### Log Files
All testing scripts generate detailed logs:
- Deployment logs: `deployment-reports/`
- Test results: `test-results/`
- Performance data: `benchmark-results/`
- Error recovery: `error-test-results/`
- Monitoring data: `monitoring-data/`
- CI results: `ci-results/`

## 📈 Best Practices

### 1. Regular Testing
- Run full test suite weekly
- Monitor performance trends
- Review error recovery procedures monthly
- Update baselines as system improves

### 2. Resource Management
- Maintain adequate SOL balance for testing
- Clean up test data regularly
- Monitor resource usage patterns
- Optimize for cost efficiency

### 3. Documentation
- Keep test results for historical analysis
- Document any manual interventions
- Maintain up-to-date procedures
- Share insights with development team

### 4. Security
- Rotate test keypairs regularly
- Monitor for security vulnerabilities
- Review access patterns
- Maintain separation from mainnet

## 🎯 Success Metrics

### Target Performance
- **Uptime**: >99.5%
- **Average Latency**: <2 seconds
- **Error Rate**: <2%
- **Throughput**: >10 ops/sec for queries
- **Recovery Time**: <5 minutes for failures

### Quality Gates
- All tests passing: >95%
- Performance regression: <10%
- Security issues: 0 critical
- Documentation coverage: 100%

## 🚀 Next Steps

1. **Enhanced Monitoring**: Add more sophisticated metrics and alerting
2. **Load Testing**: Increase scale and complexity of load tests
3. **Security Auditing**: Implement automated security scanning
4. **Multi-Region Testing**: Test from different geographic locations
5. **Chaos Engineering**: Introduce controlled failures for resilience testing

---

For support or questions about testnet testing, please refer to the development team or create an issue in the repository.