# 🌟 Swarm Coordination Patterns

## Essential Multi-Agent Development Patterns from Claude Swarm

Quick reference patterns for implementing Claude Swarm-style coordination in Cursor development.

## Core Coordination Patterns

### 1. Parallel Specialist Investigation
```yaml
# When: Complex issues need multiple expert perspectives
# Pattern: Assign same issue to different domain experts simultaneously

investigation_pattern:
  trigger: "Performance degradation affecting multiple systems"
  
  parallel_tasks:
    data_expert:
      focus: "Metrics analysis and user impact quantification"
      deliverable: "Performance timeline with specific impact metrics"
      
    code_expert:
      focus: "Recent code changes and implementation review"  
      deliverable: "Root cause analysis with code-level evidence"
      
    infrastructure_expert:
      focus: "System resources and configuration analysis"
      deliverable: "Infrastructure bottleneck identification"
      
  coordination:
    duration: "2-4 hours parallel + 1 hour synthesis"
    coordinator: "ARCHITECT role"
    shared_workspace: ".claude/memory/investigation-{ID}.md"
```

### 2. Sequential Task Delegation  
```yaml
# When: Work requires building on previous specialist output
# Pattern: Hand off completed work to next appropriate specialist

delegation_chain:
  step_1:
    role: "ARCHITECT"
    task: "Design API contracts and system integration"
    output: "API specification and integration requirements"
    
  step_2:
    role: "BACKEND"
    input: "API specification from architect"
    task: "Implement API endpoints with security and performance"
    output: "Working API with tests and documentation"
    
  step_3:
    role: "FRONTEND"  
    input: "Working API from backend"
    task: "Build UI components with API integration"
    output: "Complete user interface with backend integration"
    
  coordination_points:
    - "API contract review between architect and backend"
    - "Integration testing between backend and frontend"
    - "Final system validation with all roles"
```

### 3. Expertise Isolation
```yaml
# When: Different parts of system need specialized knowledge
# Pattern: Constrain roles to their expertise domains

role_boundaries:
  frontend_specialist:
    expertise: ["React", "TypeScript", "CSS", "UX"]
    directory: "./frontend"
    constraints: 
      - "Cannot modify backend API endpoints"
      - "Must follow API contracts from architect"
      - "Focus only on UI/UX implementation"
    tools: ["Edit", "Write", "Bash(npm:*)"]
    
  backend_specialist:
    expertise: ["Node.js", "APIs", "Database", "Security"]
    directory: "./backend"
    constraints:
      - "Cannot modify frontend components"
      - "Must implement API contracts exactly as specified"
      - "Responsible for all security measures"
    tools: ["Edit", "Write", "Bash", "Database"]
    
  coordination_protocol:
    - "All cross-domain changes must go through architect"
    - "Integration contracts must be documented and agreed"
    - "Changes affecting other domains require coordination task"
```

### 4. Progressive Quality Gates
```yaml
# When: Quality issues are expensive to fix later
# Pattern: Validate quality at each handoff point

quality_gates:
  architecture_phase:
    exit_criteria:
      - "Design review completed and documented"
      - "Security requirements clearly defined"
      - "Performance benchmarks established"
    validator: "ARCHITECT"
    
  implementation_phase:
    exit_criteria:
      - "Code follows established patterns"
      - "Unit tests pass with required coverage"
      - "Security requirements implemented"
    validator: "SPECIALIST_SELF + ARCHITECT_REVIEW"
    
  integration_phase:
    exit_criteria:
      - "Integration tests pass"
      - "Performance benchmarks met"
      - "Cross-domain functionality validated"
    validator: "ALL_ROLES_COORDINATED"
```

## Quick Implementation Templates

### Task Delegation Template
```markdown
**Task:** [TASK_ID]
**From:** [SOURCE_ROLE] -> **To:** [TARGET_ROLE]
**Type:** [RESEARCH|IMPLEMENTATION|REVIEW|COORDINATION]

**Context:** [Why this task exists]
**Objective:** [What needs to be achieved]
**Input:** [What the target role receives]
**Expected Output:** [What should be delivered]
**Success Criteria:** [How to know it's done]

**Working Directory:** [Path]
**Tools Required:** [List]
**Deadline:** [When needed]
**Status:** [PENDING|IN_PROGRESS|COMPLETED]
```

### Role Switch Checklist
```markdown
## Pre-Switch (Save State)
- [ ] Update current task status in .claude/memory/active-tasks.md
- [ ] Document progress and decisions made
- [ ] Note any blockers or coordination needs
- [ ] Create handoff tasks for other roles if needed

## Post-Switch (Load Context)  
- [ ] Review pending tasks for new role
- [ ] Check integration requirements and dependencies
- [ ] Load role-specific context and constraints
- [ ] Validate working directory and tool setup
```

### Investigation Coordination Template
```markdown
# Investigation: [ISSUE_DESCRIPTION]
**Priority:** [HIGH|MEDIUM|LOW]
**Impact:** [User/business impact description]

## Parallel Analysis Tasks
- **Data Expert:** Analyze metrics for [timeframe] 
- **Code Expert:** Review changes in [affected areas]
- **Infrastructure Expert:** Check [system components]

## Coordination Plan
- **Duration:** [X hours parallel + Y hours synthesis]
- **Shared Workspace:** .claude/memory/investigation-[ID].md
- **Synthesis Role:** [COORDINATOR]
- **Success Criteria:** [Root cause identified with evidence]
```

## Usage Guidelines

### When to Use Multi-Role Patterns
```
✅ Use When:
- Project complexity requires multiple specialized skills
- Parallel work can significantly accelerate development
- Quality benefits from expert review in each domain
- Integration complexity requires careful coordination

❌ Avoid When:
- Simple projects manageable by single context
- Coordination overhead exceeds productivity benefits
- Time pressure requires rapid single-threaded development
- Team is learning and needs broad context exposure
```

### Pattern Selection by Project Size
```
Small (< 1 week):
- Single role with architect consultation
- Minimal coordination overhead

Medium (1-4 weeks):  
- 2-3 specialized roles
- Structured handoffs
- Regular coordination checkpoints

Large (> 1 month):
- Full multi-role coordination
- All patterns and formal processes
- Optimize for long-term quality
```

## Common Anti-Patterns

### Avoid These Mistakes
```
❌ Role Boundary Violations
- Frontend modifying backend APIs directly
- Backend changing UI components
- Skipping architectural review for system changes

❌ Poor Coordination
- Specialists working in complete isolation
- No shared understanding of integration points
- Decisions made without consulting affected roles

❌ Context Loss
- Switching roles without saving state
- Losing important decisions and progress
- No documentation of coordination requirements

❌ Over-Engineering
- Using multi-role patterns for simple tasks
- Creating coordination overhead that exceeds benefits
- Forcing role separation where it doesn't add value
```

## Success Metrics

### Track These Indicators
```
Efficiency Metrics:
- Feature completion time vs single-role baseline
- Coordination overhead as % of total development
- Integration issues caught before deployment

Quality Metrics:
- Defect rate in multi-role vs single-role development
- Security issues found in specialized review
- Performance regressions prevented by expert analysis

Team Metrics:
- Developer satisfaction with expertise utilization
- Knowledge transfer between roles
- Context switching impact on productivity
```

## Remember

> "Coordination is an investment. Make sure the returns justify the costs. Start simple, add complexity only when it provides clear benefits."

Use these patterns to capture Claude Swarm's coordination advantages while maintaining Cursor's development efficiency. 