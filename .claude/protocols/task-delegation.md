# 🎯 Task Delegation Protocol

## Simulate MCP Inter-Instance Communication in Cursor

This protocol provides structured task delegation between development roles, replicating Claude Swarm's `mcp__instance__task` functionality within Cursor's single-session environment.

## Core Delegation Framework

### Task Structure
```markdown
## Task: [TASK_ID]
**Type:** [COORDINATION|IMPLEMENTATION|RESEARCH|REVIEW]
**Priority:** [HIGH|MEDIUM|LOW]
**Created:** [TIMESTAMP]
**From:** [SOURCE_ROLE] -> **To:** [TARGET_ROLE]

### Context
**Background:** [WHY_THIS_TASK_EXISTS]
**Dependencies:** [WHAT_MUST_BE_DONE_FIRST]
**Related Tasks:** [LINKED_TASK_IDS]

### Requirements
**Objective:** [WHAT_NEEDS_TO_BE_ACHIEVED]
**Constraints:** [LIMITATIONS_AND_BOUNDARIES]
**Success Criteria:** [HOW_TO_KNOW_ITS_DONE]

### Specifications
**Input:** [WHAT_THE_ROLE_RECEIVES]
**Expected Output:** [WHAT_SHOULD_BE_DELIVERED]
**Format:** [HOW_OUTPUT_SHOULD_BE_STRUCTURED]
**Integration Points:** [WHERE_OUTPUT_CONNECTS]

### Coordination
**New Session Required:** [YES|NO]
**System Prompt Override:** [CUSTOM_CONTEXT_IF_NEEDED]
**Working Directory:** [SPECIFIC_PATH]
**Tools Required:** [LIST_OF_NEEDED_CAPABILITIES]

### Status Tracking
**Status:** [PENDING|IN_PROGRESS|BLOCKED|COMPLETED|CANCELLED]
**Progress:** [CURRENT_STATE_DESCRIPTION]
**Blockers:** [WHAT_IS_PREVENTING_PROGRESS]
**ETA:** [ESTIMATED_COMPLETION]
```

## Delegation Types and Patterns

### 1. Research Delegation
```markdown
**Pattern:** Architecture -> Any Specialist
**Use Case:** Need expert knowledge before making decisions

### Example Task:
**Task:** RESEARCH_001
**From:** Architect -> **To:** Backend Specialist
**Type:** RESEARCH

**Objective:** Research best practices for JWT token management in Node.js applications
**Context:** Designing authentication system for multi-tenant SaaS
**Requirements:** 
- Security best practices for token storage
- Refresh token rotation strategies  
- Performance implications of different approaches
- Integration with rate limiting

**Expected Output:**
- Technical recommendation with pros/cons
- Code examples for implementation
- Security considerations document
- Performance benchmarks if available

**New Session Required:** YES
**System Prompt Override:** "Focus solely on JWT security research. Don't implement, just analyze options."
```

### 2. Implementation Delegation  
```markdown
**Pattern:** Architect -> Specialist
**Use Case:** Convert design into working code

### Example Task:
**Task:** IMPL_002
**From:** Architect -> **To:** Frontend Specialist  
**Type:** IMPLEMENTATION

**Objective:** Implement user registration form with validation
**Context:** Authentication system, API contract defined
**Dependencies:** API endpoints must be implemented first

**Specifications:**
**Input:** 
- API contract (.claude/memory/api-contracts.md)
- Design mockups (.claude/memory/ui-designs.md)
- Validation rules (.claude/memory/validation-rules.md)

**Expected Output:**
- React component with TypeScript
- Form validation logic
- Error handling and user feedback
- Integration tests
- Documentation

**Integration Points:** 
- Backend auth API
- Frontend routing system
- Global error handling

**Working Directory:** ./frontend/src/components/auth
**Tools Required:** [Edit, Write, Bash]
```

### 3. Cross-Specialist Collaboration
```markdown
**Pattern:** Specialist -> Specialist
**Use Case:** Direct coordination between experts

### Example Task:
**Task:** COLLAB_003
**From:** Frontend Specialist -> **To:** Backend Specialist
**Type:** COORDINATION

**Objective:** Align API response format with frontend state management
**Context:** Current API responses don't match frontend data structures

**Requirements:**
- Review current API response format
- Understand frontend state management needs  
- Propose modifications that work for both sides
- Maintain backward compatibility if possible

**Coordination Required:**
- Joint session or documented back-and-forth
- Shared workspace: .claude/memory/api-alignment.md
- Final approval from architect required
```

### 4. Review and Validation
```markdown
**Pattern:** Any -> Architect
**Use Case:** Get approval or architectural review

### Example Task:
**Task:** REVIEW_004
**From:** Database Expert -> **To:** Architect
**Type:** REVIEW

**Objective:** Review proposed database schema changes
**Context:** Performance optimization requires schema modifications

**Specifications:**
**Input:**
- Proposed schema changes (.claude/memory/schema-changes.md)
- Performance analysis (.claude/memory/perf-analysis.md)  
- Migration plan (.claude/memory/migration-plan.md)

**Expected Output:**
- Architecture approval or concerns
- Integration impact assessment
- Deployment coordination requirements
- Security review if needed

**Success Criteria:** 
- Schema changes approved or feedback provided
- Migration strategy validated
- Timeline and coordination plan established
```

## Delegation Workflow

### Phase 1: Task Creation
```
1. IDENTIFY DELEGATION NEED
   - Current role has task outside expertise
   - Need input from specific specialist
   - Require coordination between roles
   - Architecture decision needed

2. CREATE TASK SPECIFICATION
   - Use task template above
   - Be specific about inputs/outputs
   - Define success criteria clearly
   - Identify dependencies and blockers

3. LOG TASK
   File: .claude/memory/active-tasks.md
   Add task with PENDING status
   Cross-reference in source role's session notes
```

### Phase 2: Context Preparation
```
1. PREPARE HANDOFF MATERIALS
   - Gather all required inputs
   - Document current state/progress
   - Identify specific questions/concerns
   - Create reference materials if needed

2. SET UP TARGET CONTEXT
   - Define working directory
   - Prepare system prompt override if needed
   - Ensure tool requirements are met
   - Set up integration points

3. DOCUMENT COORDINATION PLAN
   - How will progress be tracked?
   - When are check-ins needed?
   - What triggers escalation?
   - How to handle blockers?
```

### Phase 3: Role Switching and Execution
```
1. SWITCH TO TARGET ROLE
   - Load target role context
   - Apply system prompt override if specified
   - Set working directory
   - Review task requirements

2. EXECUTE TASK
   - Focus only on delegated work
   - Follow constraints and requirements
   - Document progress and decisions
   - Identify any new coordination needs

3. TRACK PROGRESS
   - Update task status regularly
   - Note blockers immediately
   - Document intermediate results
   - Communicate significant findings
```

### Phase 4: Task Completion and Handback
```
1. FINALIZE DELIVERABLES
   - Ensure all requirements met
   - Format output as specified
   - Include documentation/rationale
   - Test integration points if applicable

2. UPDATE TASK STATUS
   - Mark as COMPLETED
   - Link to output location
   - Note any follow-up tasks needed
   - Document lessons learned

3. COORDINATE HANDBACK
   - Notify source role of completion
   - Provide summary of key findings
   - Highlight any unexpected issues
   - Recommend next steps
```

## Task Management Commands

### Creating Tasks
```bash
# Use this structure in .claude/memory/active-tasks.md

## Quick Task Template
**Task:** [AUTO_GENERATED_ID]
**From:** [CURRENT_ROLE] -> **To:** [TARGET_ROLE]
**Objective:** [ONE_LINE_SUMMARY]
**Priority:** [HIGH|MEDIUM|LOW]
**Status:** PENDING

### Requirements
- [REQUIREMENT_1]
- [REQUIREMENT_2]

### Expected Output
- [DELIVERABLE_1]
- [DELIVERABLE_2]

**Created:** [TIMESTAMP]
```

### Status Tracking
```bash
# Status Update Template
**Task:** [TASK_ID]
**Status:** [NEW_STATUS]
**Progress:** [CURRENT_STATE]
**Updated:** [TIMESTAMP]
**Notes:** [PROGRESS_NOTES]
```

### Task Queries
```bash
# Find tasks by role
grep -A 10 "To: Backend Specialist" .claude/memory/active-tasks.md

# Find high priority tasks  
grep -A 5 "Priority: HIGH" .claude/memory/active-tasks.md

# Find blocked tasks
grep -A 5 "Status: BLOCKED" .claude/memory/active-tasks.md
```

## Integration with Multi-Agent Workflow

### Task Coordination Points
```
1. ARCHITECTURAL DECISIONS
   - Always delegate complex decisions to Architect
   - Provide full context and options analysis
   - Include impact assessment

2. CROSS-DOMAIN WORK
   - Frontend changes affecting backend -> coordinate
   - Database schema changes -> review with all affected roles
   - Security changes -> involve all roles in review

3. INTEGRATION TESTING
   - Create tasks for testing coordination
   - Define success criteria clearly
   - Plan rollback procedures

4. KNOWLEDGE TRANSFER
   - Document learnings for team knowledge base
   - Create tasks for sharing specialized insights
   - Build up team expertise over time
```

### Performance Optimization
```
# Task delegation patterns for performance work

1. ANALYSIS PHASE
   Architect -> Specialists: "Analyze performance in your domain"
   Parallel tasks to Frontend, Backend, Database experts

2. SYNTHESIS PHASE  
   Specialists -> Architect: "Consolidate findings and plan"
   Sequential tasks for root cause analysis

3. IMPLEMENTATION PHASE
   Architect -> Specialists: "Implement agreed optimizations"  
   Coordinated parallel implementation

4. VALIDATION PHASE
   All -> Architect: "Validate improvements and measure"
   Coordinated testing and measurement
```

## Success Patterns

1. **Specific Tasks**: Vague tasks lead to poor results - be precise
2. **Clear Handoffs**: Both context and expected output must be crystal clear
3. **Progress Tracking**: Update status frequently to catch issues early
4. **Context Preservation**: Don't lose important decisions in role switches
5. **Coordination Focus**: Always consider how work affects other roles

## Remember

> "Effective delegation multiplies capability. Poor delegation multiplies confusion. Be specific, be clear, be coordinated."

This protocol transforms Claude Swarm's MCP communication into structured, documented coordination within Cursor's single-session constraint. 