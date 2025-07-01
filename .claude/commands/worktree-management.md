# 🌳 Git Worktree Management Command

## Isolated Development Environments Like Claude Swarm

This command provides structured Git worktree management for development roles, replicating Claude Swarm's ability to run instances in isolated Git worktrees for safe parallel development.

## Worktree Strategy Framework

### Worktree Use Cases
```
Development Scenarios:

FEATURE DEVELOPMENT
├── Create isolated environment for new features
├── Prevent conflicts with main development
├── Enable experimental changes without risk
└── Support multiple parallel feature streams

BUG INVESTIGATION  
├── Isolate bug reproduction environment
├── Test fixes without affecting main codebase
├── Compare behavior across different versions
└── Maintain clean investigation workspace

PERFORMANCE OPTIMIZATION
├── Benchmark changes in isolation
├── A/B test different optimization approaches
├── Measure impact without main branch interference
└── Rollback quickly if optimizations fail

SECURITY FIXES
├── Isolate security-sensitive changes
├── Test fixes in clean environment
├── Prevent accidental exposure in main branch
└── Enable quick deployment of critical fixes
```

### Worktree Naming Convention
```bash
# Worktree naming patterns based on Claude Swarm approach:

# Auto-generated session-based worktrees
worktree-[SESSION_ID]          # Session-specific development
worktree-20241215_143022       # Timestamp-based naming

# Feature-specific worktrees  
feature-[FEATURE_NAME]         # Named feature development
feature-auth-system            # User authentication feature
feature-payment-integration    # Payment system integration

# Role-specific worktrees
[ROLE]-[SESSION_ID]           # Role-based isolation
architect-investigation       # Architecture analysis
frontend-optimization        # Frontend performance work
backend-security-fix          # Backend security implementation

# Investigation-specific worktrees
investigation-[ISSUE_ID]      # Bug investigation
investigation-perf-001        # Performance investigation
investigation-security-scan   # Security vulnerability analysis
```

## Worktree Management Commands

### Create Worktree
```bash
# Create auto-named worktree (session-based)
worktree-create --auto
worktree-create --session

# Create named worktree
worktree-create --name feature-auth
worktree-create --name investigation-perf-001

# Create role-specific worktree
worktree-create --role frontend --name optimization
worktree-create --role backend --auto

# Create from specific branch
worktree-create --name hotfix-001 --branch main
worktree-create --name feature-test --branch develop
```

### Worktree Session Management
```bash
# List active worktrees
worktree-list
worktree-list --active
worktree-list --role frontend

# Switch to worktree
worktree-switch feature-auth
worktree-switch worktree-20241215_143022

# Get worktree status
worktree-status
worktree-status --name feature-auth
worktree-status --all

# Synchronize worktree with main
worktree-sync --name feature-auth
worktree-sync --all --strategy rebase
```

### Cleanup and Maintenance
```bash
# Remove worktree
worktree-remove --name feature-auth
worktree-remove --older-than 7d
worktree-remove --inactive

# Prune stale worktrees
worktree-prune --dry-run
worktree-prune --force

# Archive completed worktrees
worktree-archive --name feature-auth --tag v1.2.0
```

## Role-Based Worktree Configuration

### Architect Role: System-Wide Analysis
```markdown
**Worktree Strategy:** Investigation and architecture analysis

### Typical Worktree Usage:
```bash
# Create architecture investigation worktree
worktree-create --role architect --name system-analysis

# Working directory: Full project scope
# Purpose: Cross-system analysis without affecting main development
# Branch: Usually main or develop for current state analysis

# Example workflow:
cd ../worktree-architect-system-analysis
# Analyze current architecture patterns
# Document findings in .claude/memory/architecture-analysis.md
# Create improvement recommendations
# Propose changes without risk to main branch
```

### Configuration Template:
```yaml
# .claude/configs/worktree-architect.yml
role: architect
default_branch: main
working_directory: .
auto_sync: true
cleanup_after: 7d

patterns:
  investigation: "architect-investigation-{timestamp}"
  analysis: "architect-analysis-{feature}"
  design: "architect-design-{component}"
```
```

### Frontend Role: Component Development
```markdown
**Worktree Strategy:** Isolated component development and testing

### Typical Worktree Usage:
```bash
# Create frontend feature worktree
worktree-create --role frontend --name auth-components

# Working directory: ./frontend
# Purpose: UI component development without breaking main frontend
# Branch: feature branch or clean main for new components

# Example workflow:
cd ../worktree-frontend-auth-components  
# Develop new authentication components
# Test component integration
# Validate design system compliance
# Prepare for integration with main frontend
```

### Configuration Template:
```yaml
# .claude/configs/worktree-frontend.yml
role: frontend
default_branch: develop
working_directory: ./frontend
auto_sync: false  # Manual sync to prevent conflicts
cleanup_after: 14d

patterns:
  component: "frontend-component-{name}"
  feature: "frontend-feature-{name}"
  optimization: "frontend-perf-{timestamp}"

pre_create_hooks:
  - "npm install"
  - "npm run build"

post_switch_hooks:
  - "npm run dev"
```
```

### Backend Role: Service Development
```markdown
**Worktree Strategy:** API and service development isolation

### Typical Worktree Usage:
```bash
# Create backend service worktree  
worktree-create --role backend --name payment-api

# Working directory: ./backend
# Purpose: API development without disrupting running services
# Branch: feature branch for new services, main for fixes

# Example workflow:
cd ../worktree-backend-payment-api
# Develop payment processing API
# Test API endpoints in isolation
# Validate database integration
# Ensure security compliance before main integration
```

### Configuration Template:
```yaml
# .claude/configs/worktree-backend.yml
role: backend
default_branch: main
working_directory: ./backend
auto_sync: true
cleanup_after: 10d

patterns:
  api: "backend-api-{service}"
  service: "backend-service-{name}"
  fix: "backend-fix-{issue_id}"

pre_create_hooks:
  - "npm install"
  - "npm run db:migrate"

environment_setup:
  - copy: ".env.example"
    to: ".env.local"
  - database: "test_db_{worktree_name}"
```
```

## Worktree Coordination Workflows

### Cross-Role Worktree Collaboration
```markdown
### Pattern: Feature Development Across Roles

#### Phase 1: Architecture Planning (Architect)
```bash
# Architect creates investigation worktree
worktree-create --role architect --name feature-auth-planning

# Analyze requirements and design system
# Document API contracts and integration points
# Create implementation guidance
# Commit architectural decisions to worktree
```

#### Phase 2: Parallel Implementation (Specialists)
```bash
# Frontend creates component worktree
worktree-create --role frontend --name auth-ui --branch feature/auth-system

# Backend creates API worktree  
worktree-create --role backend --name auth-api --branch feature/auth-system

# Both work in isolation from architectural guidance
# Regular sync with feature branch for coordination
```

#### Phase 3: Integration Testing (Coordinator)
```bash
# Create integration worktree
worktree-create --name auth-integration --branch feature/auth-system

# Merge frontend and backend changes
# Test full system integration
# Validate against architectural requirements
# Prepare for main branch integration
```
```

### Performance Investigation with Worktrees
```markdown
### Pattern: Multi-Role Performance Analysis

#### Investigation Setup:
```bash
# Create investigation worktree from current problematic state
worktree-create --name perf-investigation-001 --branch main

# Each specialist gets their own investigation space
worktree-create --role data-expert --name perf-data-analysis
worktree-create --role code-expert --name perf-code-review  
worktree-create --role infrastructure --name perf-infra-check
```

#### Parallel Analysis:
```bash
# Data expert analyzes in isolation
cd ../worktree-data-expert-perf-data-analysis
# Run performance profiling tools
# Collect metrics without affecting main development
# Document findings in worktree-specific analysis files

# Code expert reviews implementation
cd ../worktree-code-expert-perf-code-review
# Profile code performance
# Test optimization approaches
# Validate fixes in isolation

# Infrastructure expert checks system
cd ../worktree-infrastructure-perf-infra-check  
# Analyze resource utilization
# Test configuration changes
# Validate infrastructure optimizations
```

#### Solution Integration:
```bash
# Create solution integration worktree
worktree-create --name perf-solution-integration

# Merge all specialist findings and fixes
# Test complete solution in isolated environment
# Validate performance improvements
# Prepare coordinated deployment
```
```

## Worktree State Management

### Session Integration
```markdown
File: .claude/memory/worktree-sessions.md

## Active Worktree Sessions: [DATE]

### Current Session
**Worktree:** worktree-frontend-auth-components
**Role:** FRONTEND
**Created:** 2024-12-15 14:30:22
**Branch:** feature/auth-system
**Status:** Active development
**Progress:** Component structure complete, styling in progress

### Recent Worktrees
- **architect-system-analysis** (Completed 2h ago)
  - Outcome: Architecture documentation updated
  - Integration: Recommendations shared with team
  
- **backend-auth-api** (Active, parallel with frontend)
  - Status: API endpoints implemented
  - Next: Integration testing with frontend components
  
### Coordination Requirements
- **Frontend <-> Backend**: API contract validation needed
- **All -> Architect**: Design review before main branch merge
- **Integration Test**: Scheduled for tomorrow 10 AM

### Cleanup Schedule
- Remove worktree-perf-investigation-001 (completed 3 days ago)
- Archive worktree-hotfix-security-001 (deployed successfully)
```

### Cross-Worktree Communication
```markdown
File: .claude/memory/worktree-coordination.md

## Worktree Coordination Log

### Coordination Event: API Contract Alignment
**Date:** 2024-12-15 15:45
**Worktrees Involved:** 
- backend-auth-api (Backend role)
- frontend-auth-components (Frontend role)

**Issue:** API response format mismatch with frontend expectations
**Resolution Process:**
1. Backend documented actual API response in shared file
2. Frontend documented expected format requirements  
3. Architect reviewed and provided solution in main branch
4. Both worktrees updated from main branch guidance

**Outcome:** API contract aligned, development can continue

### Integration Point: Security Review
**Date:** 2024-12-15 16:30
**Worktrees Involved:**
- backend-auth-api (Backend role)
- security-audit-001 (Security role)

**Process:**
1. Backend prepared auth implementation for review
2. Security role created audit worktree from backend branch
3. Security analysis completed in isolation
4. Findings documented and shared with backend
5. Backend implemented fixes in their worktree

**Outcome:** Security compliance validated, ready for integration
```

## Worktree Automation

### Automated Worktree Management
```bash
#!/bin/bash
# .claude/scripts/worktree-automation.sh

# Daily worktree maintenance
worktree-prune --older-than 7d --inactive
worktree-sync --all --strategy rebase
worktree-status --all > .claude/memory/worktree-daily-status.md

# Weekly worktree cleanup
worktree-archive --completed --older-than 14d
worktree-remove --merged --older-than 30d

# Generate worktree usage report
worktree-report --period 7d > .claude/memory/worktree-weekly-report.md
```

### Integration with Role Switching
```bash
# Enhanced role switching with worktree management
role-switch frontend --worktree auto
role-switch backend --worktree feature-payment-api
role-switch architect --worktree investigation-001

# Automatic worktree creation during role switch
if [ "$CREATE_WORKTREE" = "auto" ]; then
    WORKTREE_NAME="worktree-$ROLE-$(date +%Y%m%d_%H%M%S)"
    worktree-create --name $WORKTREE_NAME --role $ROLE
    cd ../$WORKTREE_NAME
fi
```

## Success Patterns

1. **Clean Isolation**: Each worktree serves a specific, focused purpose
2. **Clear Naming**: Worktree names indicate role, purpose, and scope
3. **Regular Sync**: Keep worktrees synchronized with main development
4. **Coordinate Integration**: Plan worktree merging and integration carefully
5. **Cleanup Discipline**: Remove completed worktrees promptly to avoid clutter

## Remember

> "Worktrees enable fearless experimentation and parallel development. Use them to isolate risk while maintaining coordination."

This command system replicates Claude Swarm's worktree advantages while providing the safety and coordination benefits of isolated development environments within Cursor workflows. 