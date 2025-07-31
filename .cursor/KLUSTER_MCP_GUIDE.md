# 🔍 Kluster MCP Integration Guide

## Overview

This project is integrated with **Kluster MCP** (Model Context Protocol) for automated AI-generated code validation. All code changes are automatically validated for security, performance, quality, and intent alignment.

## 🚀 Quick Start

### Manual Validation

```bash
# Validate changed files since last commit
npm run qa:kluster

# Validate all files in the project
npm run qa:kluster:all

# Validate specific files
npm run qa:kluster:files -- --files="src/file1.ts,src/file2.ts"
```

### Automatic Validation

Kluster MCP validation runs automatically:
- **Pre-commit**: Validates staged files before commit
- **CI/CD**: Validates changed files on push/PR
- **Build process**: Integrated into quality assurance pipeline

## 📋 Priority System

Kluster MCP uses a priority system for issue classification:

| Priority | Severity | Description | Action Required |
|----------|----------|-------------|-----------------|
| **P0** | Critical (Intent) | Code doesn't match user requirements | **Immediate fix** |
| **P1** | High (Intent) | Partial alignment with requirements | **Immediate fix** |
| **P2** | Critical | Security/functionality issues | **Fix before merge** |
| **P3** | High | Performance/quality issues | **Fix before merge** |
| **P4** | Medium | Code quality improvements | **Fix when convenient** |
| **P5** | Low | Minor optimizations | **Optional** |

## 🔧 Configuration

### Project Configuration
Configuration is managed in `.cursor/kluster-config.json`:

```json
{
  "kluster": {
    "enabled": true,
    "validation": {
      "runOnCommit": true,
      "runOnBuild": true,
      "failOnIssues": true
    },
    "rules": {
      "enforceSecurityChecks": true,
      "enforcePerformanceOptimizations": true,
      "enforceCodeQuality": true
    }
  }
}
```

### Environment Variables
```bash
# CI mode (less verbose output)
KLUSTER_CI_MODE=true

# Skip validation (emergency use only)
SKIP_KLUSTER_VALIDATION=true

# Custom timeout
KLUSTER_TIMEOUT_SECONDS=300
```

## 🛠️ Development Workflow

### 1. Write Code
```bash
# Normal development
vim src/my-feature.ts
```

### 2. Validate Locally
```bash
# Quick validation of your changes
npm run qa:kluster

# Or validate specific files
npm run qa:kluster:files -- --files="src/my-feature.ts"
```

### 3. Fix Issues
Address any issues reported by Kluster MCP:
- **P0/P1**: Must fix immediately
- **P2/P3**: Fix before committing
- **P4/P5**: Fix when convenient

### 4. Commit
```bash
git add .
git commit -m "feat: add new feature"
# Pre-commit hook runs Kluster validation automatically
```

### 5. Push & PR
```bash
git push origin feature-branch
# CI runs full Kluster validation
```

## 📊 Understanding Reports

### Console Output
```
🔍 Running Kluster MCP validation...
📁 Validating 3 files

🔎 Validating: src/agents.ts
❌ Issues found in src/agents.ts:
   1. [HIGH] Inefficient data retrieval pattern
      Actions: Implement server-side filtering

📋 TODO List:
   P3.1: Implement server-side filtering - Add pagination and filtering
```

### Report Files
- **Location**: `.cursor/reports/kluster-validation-report.json`
- **Format**: Structured JSON with detailed issue information
- **Retention**: 30 days in CI, permanent locally

## 🚨 Common Issues & Solutions

### Issue: "Server-side filtering not available"
```typescript
// ❌ Bad: Client-side filtering of large datasets
const agents = await getAllAgents()
return agents.filter(agent => agent.isActive)

// ✅ Good: Server-side filtering
const agents = await getFilteredAgents({ isActive: true })
return agents
```

### Issue: "Potential data exposure through IPFS"
```typescript
// ❌ Bad: Storing unencrypted data
await ipfs.store(plainTextData)

// ✅ Good: Client-side encryption
const encryptedData = await encrypt(plainTextData)
await ipfs.store(encryptedData)
```

### Issue: "Inefficient parallel processing"
```typescript
// ❌ Bad: Sequential processing
const results = []
for (const item of items) {
  results.push(await processItem(item))
}

// ✅ Good: Parallel processing
const results = await Promise.all(
  items.map(item => processItem(item))
)
```

## 🔧 Troubleshooting

### Validation Fails in CI but Passes Locally
1. Check if you have the latest dependencies: `bun install`
2. Ensure your local git history is up to date: `git fetch origin`
3. Run validation with the same parameters as CI: `npm run qa:kluster`

### Pre-commit Hook Not Running
```bash
# Setup git hooks directory
git config core.hooksPath .githooks

# Make hook executable
chmod +x .githooks/pre-commit
```

### Timeout Issues
```bash
# Increase timeout for large files
KLUSTER_TIMEOUT_SECONDS=600 npm run qa:kluster
```

### Skip Validation (Emergency Only)
```bash
# Skip pre-commit validation
git commit --no-verify -m "emergency fix"

# Skip CI validation
SKIP_KLUSTER_VALIDATION=true git push
```

## 📚 Best Practices

### 1. Run Validation Early and Often
```bash
# Before starting work
npm run qa:kluster

# After making changes
npm run qa:kluster:files -- --files="changed-file.ts"

# Before committing
npm run qa:kluster
```

### 2. Address High-Priority Issues First
- Always fix P0/P1 (Intent) issues immediately
- Fix P2/P3 (Critical/High) before committing
- Plan P4/P5 fixes for future iterations

### 3. Use Descriptive Commit Messages
```bash
# Include Kluster validation status
git commit -m "feat: add agent filtering (kluster: P0-P3 resolved)"
```

### 4. Monitor Validation Reports
- Review CI artifacts for detailed reports
- Track issue trends over time
- Use reports for code review discussions

## 🎯 Integration Points

### Pre-commit Hook
- **Location**: `.githooks/pre-commit`
- **Trigger**: Every `git commit`
- **Scope**: Staged files only
- **Behavior**: Blocks commit if critical issues found

### CI/CD Pipeline
- **Location**: `.github/workflows/kluster-validation.yml`
- **Trigger**: Push to main/develop, PRs
- **Scope**: Changed files (+ full validation on main)
- **Behavior**: Fails build if critical issues found

### Build Process
- **Integration**: Part of `npm run qa:all`
- **Scope**: All files or git diff
- **Behavior**: Configurable failure mode

### Development Mode
- **Usage**: Manual validation during development
- **Scope**: Specific files or directories
- **Behavior**: Informational (doesn't block)

## 🔒 Security Considerations

### Sensitive Data Validation
Kluster MCP includes special validation for:
- Encryption key handling
- IPFS data exposure
- Authentication patterns
- Private key management

### Production Readiness
All code must pass Kluster validation before:
- Merging to main branch
- Production deployments
- Security-critical releases

## 📈 Metrics & Monitoring

### Validation Metrics
- **Pass Rate**: Percentage of files passing validation
- **Issue Distribution**: Breakdown by priority level
- **Resolution Time**: Time to fix issues
- **Trend Analysis**: Issue patterns over time

### Quality Indicators
- **Zero P0/P1 Issues**: Code aligns with requirements
- **Minimal P2/P3 Issues**: High code quality
- **Improving Trends**: Code quality improving over time

---

## 🆘 Support

### Getting Help
1. **Documentation**: Read this guide thoroughly
2. **Local Testing**: Use `npm run qa:kluster:files` to test specific files
3. **CI Logs**: Check GitHub Actions logs for detailed error information
4. **Reports**: Review generated reports in `.cursor/reports/`

### Emergency Procedures
If Kluster validation is blocking critical fixes:
1. Use `--no-verify` flag for git commit (sparingly)
2. Set `SKIP_KLUSTER_VALIDATION=true` for CI (emergency only)
3. Create follow-up issues to address validation failures
4. Never skip validation for security-related code

---

**Remember**: Kluster MCP is designed to maintain the highest code quality standards for this cutting-edge Solana blockchain application. Embrace the validation process as a quality assurance partner, not an obstacle.