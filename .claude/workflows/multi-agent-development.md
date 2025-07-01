# 🤖 Multi-Agent Development Workflow

## Transform Single-Agent Chaos into Coordinated Development Teams

This workflow simulates Claude Swarm's multi-agent approach within Cursor, creating specialized development contexts that work together on complex projects.

## Phase 1: Team Architecture Design

### Development Team Structure
```
Team Roles Framework:

1. ARCHITECT (System Coordinator)
   Purpose: High-level design and coordination
   Focus: Architecture decisions, integration planning
   Context: Full project scope, system design patterns
   Tools: Design docs, technical specifications, integration testing

2. FRONTEND SPECIALIST 
   Purpose: UI/UX and client-side development
   Focus: React, TypeScript, responsive design, user experience
   Context: Frontend directory, component library, design system
   Tools: Component development, styling, frontend testing

3. BACKEND SPECIALIST
   Purpose: Server-side logic and API development  
   Focus: APIs, databases, performance, security
   Context: Backend directory, data models, service architecture
   Tools: API development, database design, performance testing

4. DEVOPS COORDINATOR
   Purpose: Infrastructure and deployment management
   Focus: CI/CD, monitoring, scaling, security
   Context: Infrastructure configs, deployment scripts
   Tools: Container management, monitoring setup, automation

5. DATABASE EXPERT
   Purpose: Data architecture and optimization
   Focus: Schema design, query optimization, data integrity
   Context: Database directory, migration files, data models
   Tools: Schema management, query analysis, data testing
```

### Context Switching Strategy
```
Instead of Claude Swarm's multiple instances:

1. Create specialized Cursor sessions for each role
2. Use distinct directory contexts per specialist
3. Maintain role-specific prompts and constraints
4. Coordinate through structured handoffs
5. Document decisions for cross-agent communication
```

## Phase 2: Role-Based Context Configuration

### Architect Context Setup
```markdown
# ARCHITECT SESSION CONFIGURATION

## System Prompt Override
You are the lead system architect coordinating a development team.
Your role is high-level design, integration planning, and technical decision-making.

## Focus Areas:
- System architecture and design patterns
- Technology stack decisions and validation
- Integration points and API contracts
- Performance and scalability planning
- Security architecture and compliance

## Constraints:
- Don't write detailed implementation code
- Focus on structure, patterns, and coordination
- Delegate specific tasks to specialists
- Always consider system-wide implications
- Document architectural decisions (ADRs)

## Available Tools:
- Read (full project scope)
- WebSearch (research architectural patterns)
- Edit (architecture docs, configs)

## Working Directory: .
## Decision Log: .claude/memory/architecture-decisions.md
```

### Frontend Specialist Context
```markdown
# FRONTEND SPECIALIST SESSION CONFIGURATION

## System Prompt Override  
You are a frontend development specialist focused on React, TypeScript, and modern web UI.
You implement user interfaces based on architectural guidance.

## Focus Areas:
- React component development and optimization
- TypeScript implementation and type safety
- Responsive design and CSS architecture
- Frontend performance and bundle optimization
- User experience and accessibility

## Constraints:
- Stay within frontend directory unless coordinating
- Follow architectural patterns from architect
- Focus on UI/UX implementation details
- Don't modify backend APIs directly
- Coordinate API changes through architect

## Available Tools:
- Edit (frontend files)
- Write (new components)
- Bash (frontend build/test commands)
- Read (frontend directory focus)

## Working Directory: ./frontend
## Pattern Library: .claude/patterns/frontend-patterns.md
```

### Backend Specialist Context
```markdown
# BACKEND SPECIALIST SESSION CONFIGURATION

## System Prompt Override
You are a backend development specialist focused on APIs, databases, and server-side logic.
You implement robust, scalable backend services.

## Focus Areas:
- RESTful API design and implementation
- Database integration and optimization
- Authentication and authorization
- Error handling and logging
- Performance optimization and caching

## Constraints:
- Stay within backend directory unless coordinating
- Follow API contracts defined by architect
- Don't modify frontend code directly
- Ensure security best practices
- Document API changes for frontend team

## Available Tools:
- Edit (backend files)
- Write (new services)
- Bash (backend commands, tests)
- Read (backend directory focus)

## Working Directory: ./backend
## API Documentation: .claude/memory/api-specifications.md
```

## Phase 3: Coordination Protocols

### Inter-Agent Communication
```
Instead of MCP connections, use structured handoffs:

1. TASK DELEGATION
   File: .claude/memory/active-tasks.md
   Format:
   ```
   ## Task: [TASK_ID]
   **From:** [ROLE] -> **To:** [ROLE]
   **Context:** [BACKGROUND]
   **Requirements:** [SPECIFIC_NEEDS]
   **Constraints:** [LIMITATIONS]
   **Expected Output:** [DELIVERABLES]
   **Status:** [PENDING/IN_PROGRESS/COMPLETED]
   ```

2. DECISION COORDINATION
   File: .claude/memory/decisions-pending.md
   Format:
   ```
   ## Decision: [DECISION_ID]
   **Type:** [TECHNICAL/ARCHITECTURAL/IMPLEMENTATION]
   **Description:** [WHAT_NEEDS_DECIDING]
   **Options:** [ALTERNATIVES]
   **Impact:** [AFFECTED_AREAS]
   **Deadline:** [WHEN_NEEDED]
   **Owner:** [DECISION_MAKER]
   ```

3. INTEGRATION POINTS
   File: .claude/memory/integration-contracts.md
   Format:
   ```
   ## Contract: [CONTRACT_ID]
   **Between:** [ROLE1] <-> [ROLE2]
   **Interface:** [API/FILE/PROTOCOL]
   **Specification:** [DETAILED_SPEC]
   **Status:** [DRAFT/AGREED/IMPLEMENTED]
   ```
```

### Context Switching Workflow
```
1. START SESSION AS ROLE
   - Load role-specific context
   - Review pending tasks for this role
   - Check integration contracts
   - Read recent decisions affecting role

2. EXECUTE ROLE TASKS
   - Focus only on role responsibilities
   - Document progress and decisions
   - Identify coordination needs
   - Create handoff tasks for other roles

3. COORDINATE BEFORE SWITCHING
   - Update task status
   - Document decisions made
   - Create tasks for other roles
   - Note integration requirements

4. SWITCH CONTEXT
   - Save current session state
   - Switch to new role context
   - Load new role's pending work
   - Review handoffs received
```

## Phase 4: Implementation Patterns

### Task Breakdown Example
```
Original Requirement: "Build user authentication system"

Architect Breakdown:
1. Design auth architecture (JWT vs sessions)
2. Define API contracts for auth endpoints  
3. Plan frontend auth state management
4. Design database schema for users
5. Plan security requirements

Task Distribution:
- Backend: Implement auth API endpoints
- Frontend: Build login/register components
- Database: Create user schema and migrations
- DevOps: Setup security headers and rate limiting

Coordination Points:
- API contract approval before implementation
- Security review before deployment
- Integration testing between frontend/backend
```

### Role Transition Example
```
# Architect -> Backend Developer Handoff

## Completed by Architect:
- ✅ API contract designed (see .claude/memory/api-contracts.md)
- ✅ Database schema planned (see .claude/memory/db-schema.md)
- ✅ Security requirements defined (see .claude/memory/security-requirements.md)

## Tasks for Backend Developer:
1. Implement user registration endpoint
   - Validation rules: [SPECIFIED]
   - Response format: [DEFINED]
   - Error handling: [REQUIRED]

2. Implement login endpoint
   - JWT token generation
   - Password verification
   - Rate limiting

3. Create database migrations
   - User table with defined schema
   - Indexes for performance
   - Constraints for data integrity

## Coordination Required:
- Confirm password hashing approach with security requirements
- Validate API responses match frontend expectations
- Test integration with database expert's schema
```

## Phase 5: Validation and Quality Control

### Cross-Role Validation
```
After each role completes tasks:

1. TECHNICAL REVIEW
   - Does it meet architectural requirements?
   - Are integration contracts honored?
   - Is code quality consistent across roles?

2. INTEGRATION TESTING
   - Do frontend/backend communicate correctly?
   - Are database operations optimized?
   - Do all security requirements pass?

3. COORDINATION REVIEW
   - Were all handoffs properly documented?
   - Are there unresolved dependencies?
   - Do all roles understand the current state?
```

### Quality Gates
```
Before considering a feature complete:

Architecture Review:
- [ ] System design is coherent
- [ ] All integration points defined
- [ ] Performance requirements addressed
- [ ] Security requirements met

Implementation Review:
- [ ] All role tasks completed
- [ ] Code follows established patterns
- [ ] Tests pass for all components
- [ ] Documentation is current

Coordination Review:  
- [ ] No pending cross-role dependencies
- [ ] All decisions are documented
- [ ] Future work is clearly planned
```

## Phase 6: Session Management

### Session State Tracking
```
File: .claude/memory/session-state.md

## Current Active Role: [ROLE_NAME]
**Session Start:** [TIMESTAMP]
**Context:** [DIRECTORY]
**Focus:** [CURRENT_TASK]

## Completed This Session:
- [TASK] - [OUTCOME]
- [DECISION] - [RATIONALE]

## Pending Handoffs:
- To [ROLE]: [TASK_DESCRIPTION]
- From [ROLE]: [EXPECTED_INPUT]

## Next Session Planning:
- Role: [NEXT_ROLE]
- Priority Tasks: [LIST]
- Context Switch Notes: [IMPORTANT_INFO]
```

### Progress Tracking
```
File: .claude/memory/team-progress.md

## Project Status: [CURRENT_PHASE]

### Role Progress:
- **Architect**: [STATUS] - [CURRENT_FOCUS]
- **Frontend**: [STATUS] - [CURRENT_FOCUS]  
- **Backend**: [STATUS] - [CURRENT_FOCUS]
- **DevOps**: [STATUS] - [CURRENT_FOCUS]
- **Database**: [STATUS] - [CURRENT_FOCUS]

### Integration Status:
- Frontend <-> Backend: [STATUS]
- Backend <-> Database: [STATUS]
- DevOps <-> All: [STATUS]

### Blockers:
- [BLOCKER] - Owner: [ROLE] - ETA: [DATE]
```

## Success Patterns

1. **Clear Role Boundaries**: Each role has defined responsibilities and constraints
2. **Structured Handoffs**: All coordination happens through documented processes
3. **Decision Documentation**: Every choice is recorded with rationale
4. **Integration Focus**: Always consider how roles work together
5. **Context Preservation**: Session switching maintains progress and state

## Remember

> "Complex projects need coordinated expertise. Simulate the Claude Swarm advantage through disciplined role-playing and structured coordination."

The goal is to capture the power of multiple specialized agents while working within Cursor's single-session limitations. Success comes from rigorous context switching and coordination discipline. 