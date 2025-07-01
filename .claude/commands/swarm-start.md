# 🚀 Swarm Start Command

## Quick Start Guide for Claude Swarm-Style Development

Launch coordinated multi-role development sessions using Claude Swarm patterns within Cursor.

## Quick Start Commands

### Initialize Swarm Session
```bash
# Start new coordinated development session
swarm-start --project [PROJECT_NAME]
swarm-start --feature [FEATURE_NAME] 
swarm-start --investigation [ISSUE_ID]

# Quick start with auto-generated session
swarm-start --auto

# Resume previous swarm session
swarm-start --resume [SESSION_ID]
```

### Basic Role Operations
```bash
# Switch to specific role
swarm-role architect
swarm-role frontend
swarm-role backend

# Create task for another role
swarm-task --to backend --priority high "Implement user authentication API"

# Check coordination status
swarm-status
swarm-status --role frontend
swarm-status --tasks
```

## Getting Started Workflows

### 1. Simple Feature Development
```markdown
## Scenario: Add user profile management feature

### Step 1: Initialize Session
```bash
swarm-start --feature user-profile-management
```

### Step 2: Start with Architecture
```
Role: ARCHITECT
Duration: 1-2 hours
Tasks:
- Design user profile data structure
- Define API contracts for profile CRUD operations  
- Plan UI components and user flows
- Create implementation guidance for specialists
```

### Step 3: Create Implementation Tasks
```bash
# From architect role, delegate to specialists
swarm-task --to backend --priority high \
  "Implement user profile API endpoints per specification in .claude/memory/api-contracts.md"

swarm-task --to frontend --priority high \
  "Build user profile UI components per design in .claude/memory/ui-specifications.md"

swarm-task --to database --priority medium \
  "Create user profile schema and migrations per .claude/memory/db-schema.md"
```

### Step 4: Coordinate Implementation
```bash
# Switch between roles as needed
swarm-role backend
# Implement API endpoints...

swarm-role frontend  
# Build UI components...

swarm-role database
# Create schema and migrations...
```

### Step 5: Integration and Testing
```bash
# Return to architect for integration
swarm-role architect
# Review implementations and coordinate integration testing
```
```

### 2. Performance Investigation
```markdown
## Scenario: Application response times increased 50%

### Step 1: Launch Investigation
```bash
swarm-start --investigation perf-response-time-001
```

### Step 2: Parallel Analysis Setup
```
Role: COORDINATOR  
Duration: 30 minutes
Tasks:
- Create investigation workspace
- Define analysis scope and timeline
- Set up parallel analysis tasks
```

### Step 3: Delegate Parallel Analysis
```bash
# Create simultaneous analysis tasks
swarm-task --to data-expert --priority critical \
  "Analyze performance metrics for last 48 hours, identify when degradation started"

swarm-task --to code-expert --priority critical \
  "Review recent deployments and code changes that might affect performance"

swarm-task --to infrastructure-expert --priority critical \
  "Check system resources, database performance, and scaling issues"
```

### Step 4: Execute Parallel Analysis  
```bash
# Work simultaneously in different roles
swarm-role data-expert
# Analyze metrics and user impact...

# In separate session or after completing data analysis:
swarm-role code-expert
# Review code changes and implementation...

# Continue with infrastructure analysis:
swarm-role infrastructure-expert  
# Check system performance and scaling...
```

### Step 5: Synthesize Findings
```bash
# Return to coordinator role
swarm-role coordinator
# Review all specialist findings
# Identify root cause and solution strategy
# Create implementation tasks for fixes
```
```

### 3. Security Review Process
```markdown
## Scenario: Comprehensive security review before major release

### Step 1: Security Review Initialization
```bash
swarm-start --security-review --scope full-application
```

### Step 2: Multi-Domain Security Analysis
```bash
# Create specialized security review tasks
swarm-task --to security-specialist --priority critical \
  "Perform comprehensive security audit of authentication system"

swarm-task --to backend-specialist --priority high \
  "Review API security implementations and validate input sanitization"

swarm-task --to frontend-specialist --priority high \
  "Audit client-side security measures and data handling"

swarm-task --to infrastructure-specialist --priority high \
  "Review deployment security and infrastructure hardening"
```

### Step 3: Coordinated Security Validation
```bash
# Each specialist focuses on their security domain
swarm-role security-specialist
# Perform security scans and vulnerability assessment...

swarm-role backend-specialist  
# Review API security and server-side protections...

swarm-role frontend-specialist
# Check client-side security and data protection...

swarm-role infrastructure-specialist
# Validate deployment and infrastructure security...
```
```

## Session Management

### Session State Tracking
```markdown
File: .claude/memory/swarm-session-state.md

## Active Swarm Session: [SESSION_ID]
**Type:** [FEATURE|INVESTIGATION|REVIEW|OPTIMIZATION]
**Started:** [TIMESTAMP]
**Current Phase:** [ARCHITECTURE|IMPLEMENTATION|INTEGRATION|COMPLETION]

### Active Roles:
- **Coordinator:** [STATUS] - [CURRENT_TASK]
- **Architect:** [STATUS] - [CURRENT_FOCUS]  
- **Frontend:** [STATUS] - [CURRENT_WORK]
- **Backend:** [STATUS] - [CURRENT_IMPLEMENTATION]

### Coordination Points:
- **Next Integration:** [WHEN] - [PARTICIPANTS]
- **Pending Reviews:** [LIST]
- **Blocking Issues:** [ISSUES_WITH_OWNERS]

### Progress Tracking:
- **Completed Tasks:** [COUNT]
- **Active Tasks:** [COUNT]
- **Coordination Events:** [COUNT]
```

### Task Coordination
```markdown
File: .claude/memory/swarm-active-tasks.md

## Active Swarm Tasks: [SESSION_ID]

### High Priority Tasks
**TASK_001:** Implement authentication API
- **Assigned:** Backend Specialist
- **Status:** IN_PROGRESS  
- **Dependencies:** API contracts from architect
- **ETA:** 2024-12-16 15:00

**TASK_002:** Build login UI components
- **Assigned:** Frontend Specialist
- **Status:** PENDING
- **Dependencies:** TASK_001 completion for integration testing
- **ETA:** 2024-12-16 17:00

### Coordination Requirements
- **Backend + Frontend:** API contract validation before UI integration
- **All + Architect:** Security review before feature completion
- **Integration Testing:** Scheduled for 2024-12-16 18:00
```

## Troubleshooting Common Issues

### Coordination Problems
```markdown
## Issue: Roles working in isolation without coordination

### Solution:
1. Increase coordination checkpoint frequency
2. Use shared workspace files more actively
3. Create explicit integration tasks
4. Set up regular status updates

### Commands:
```bash
# Force coordination check
swarm-status --coordination-required

# Create integration checkpoint  
swarm-checkpoint --roles [frontend,backend] --when now

# Set up regular status updates
swarm-schedule --status-update --interval 2h
```
```

### Context Loss Between Roles
```markdown
## Issue: Important decisions and context lost during role switches

### Solution:
1. Use structured session state saving
2. Document decisions immediately when made
3. Create handoff notes for role transitions
4. Maintain decision log accessible to all roles

### Commands:
```bash
# Save current state before role switch
swarm-save-state --role current --decisions --progress

# Load context for new role
swarm-load-context --role [TARGET_ROLE] --recent-decisions

# Document decision for all roles
swarm-decision --log "API authentication will use JWT tokens" --affects [frontend,backend]
```
```

### Over-Coordination Overhead
```markdown
## Issue: Coordination taking more time than development

### Solution:
1. Reduce number of active roles
2. Increase role session duration
3. Batch coordination activities
4. Use asynchronous handoffs instead of synchronous coordination

### Commands:
```bash
# Simplify to fewer roles
swarm-simplify --roles [architect,fullstack-developer]

# Extend role session time
swarm-configure --min-session-duration 2h

# Batch coordination
swarm-batch-coordination --schedule end-of-day
```
```

## Best Practices

### Session Planning
```
Before Starting Swarm Session:
✅ Define clear objectives and scope
✅ Identify which roles are actually needed
✅ Estimate coordination overhead vs benefits
✅ Plan integration and coordination points
✅ Set realistic timeline expectations

During Swarm Session:
✅ Document decisions and progress continuously
✅ Coordinate at natural handoff points
✅ Keep role boundaries clear and respected
✅ Focus on deliverables and integration requirements
✅ Regular status checks and coordination validation

After Swarm Session:
✅ Document lessons learned and process improvements
✅ Archive completed tasks and decisions
✅ Plan follow-up work and next session priorities
✅ Update patterns and templates based on experience
```

### Role Discipline
```
Maintain Role Focus:
✅ Stay within role expertise boundaries
✅ Delegate work outside expertise to appropriate roles
✅ Document coordination needs rather than working around them
✅ Use role constraints as quality gates
✅ Escalate architectural decisions to architect role

Coordinate Effectively:
✅ Use structured task delegation templates
✅ Document integration contracts and dependencies
✅ Communicate blockers and issues immediately
✅ Plan coordination activities during role design
✅ Balance coordination with individual productivity
```

## Success Metrics

### Track Session Effectiveness
```bash
# Generate session performance report
swarm-report --session [SESSION_ID] --metrics all

# Key metrics to monitor:
- Total development time vs estimated single-role time
- Coordination overhead as percentage of total time
- Number of integration issues caught vs missed
- Quality improvements from specialist review
- Developer satisfaction with role utilization
```

## Remember

> "Start simple with 2-3 roles, add complexity only when it provides clear benefits. Coordination is a tool, not a goal."

Use swarm patterns to capture the coordination advantages of Claude Swarm while maintaining the development efficiency of Cursor. 