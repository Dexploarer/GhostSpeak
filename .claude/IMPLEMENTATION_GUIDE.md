# 🚀 Prompt-or-Die Implementation Guide for Claude Code

## Quick Start: Setting Up the Protocol

### Step 1: Initialize Claude Code Project
```bash
# In your project root
claude /init
```

This creates the foundational `CLAUDE.md` file that Claude uses as project memory.

### Step 2: Install Prompt-or-Die Configuration
```bash
# Copy .claude directory to your project
cp -r /path/to/prompt-or-die/.claude ./

# Set up MCP servers
claude mcp add brave-search -s project -- npx -y @modelcontextprotocol/server-brave-search
claude mcp add e2b -s project -- npx -y @e2b/mcp-server
claude mcp add filesystem -s project -- npx -y @modelcontextprotocol/server-filesystem .
```

### Step 3: Configure Environment Variables
```bash
# Required for MCP servers
export BRAVE_API_KEY="your-brave-search-api-key"
export E2B_API_KEY="your-e2b-sandbox-api-key"
```

## Using Prompt-or-Die Commands

### File Generation with Validation
```
User: Create a user authentication system

Claude Code Response:
Following /project:generate-with-validation protocol...

Phase 1: Initial Generation
[Generates auth system code]

Phase 2: Self-Evaluation
✅ Code compiles without errors
❌ Missing rate limiting implementation
❌ No password complexity validation
⚠️  Session tokens not properly secured

Phase 3: Improvements Identified
- Add rate limiting middleware
- Implement password complexity requirements
- Secure session token generation with proper entropy

Phase 4: Applying Improvements
[Updates code with identified fixes]

Phase 5: Second Evaluation
✅ All technical validations pass
✅ Security audit complete
✅ Performance benchmarks within acceptable range

Phase 6: Final Polish
[Final optimizations and documentation]
```

### Technical Leader Review Mode
```
User: /project:technical-review

Claude Code Response:
Entering technical leader review mode...

Pre-Review Evidence Gathering:
- Running test suite: ✅ All 47 tests pass
- Performance benchmarks: ✅ <200ms response time
- Security scan: ❌ Found 2 medium-severity issues

The Inquisition Questions:
1. Why did you choose JWT over session cookies?
2. What happens when Redis goes down?
3. How do you handle concurrent login attempts?

Red Flags Detected:
❌ No error handling for database timeouts
❌ Hardcoded secret key in configuration

Verdict: CONDITIONAL - Fix security issues and add proper error handling
```

### Research Mode Activation
```
User: The login keeps failing but I can't figure out why

Claude Code Response:
Multiple attempts failed. Entering research mode per protocol...

Research Phase Activation:
Trigger: Error persists after 2 fix attempts

Multi-Source Investigation:
1. Web Search: Researching "JWT authentication redis session 2025 best practices"
2. Codebase Analysis: Examining similar working implementations
3. Documentation Review: Checking Redis and JWT library docs
4. Experimental Testing: Creating minimal reproduction in E2B sandbox

Root Cause Identified:
Primary Cause: Redis connection timeout not handled gracefully
Evidence: E2B sandbox tests confirm 5-second timeout causes auth failure

Solution Strategy:
- Implement connection pooling with retry logic
- Add fallback authentication mechanism
- Set proper timeout configurations
```

## Advanced Features Integration

### Extended Thinking for Complex Problems
```
User: Think hard about designing a scalable microservices architecture

Claude Code Response:
[Extended thinking mode activated - 10,000 tokens]

*Analyzing trade-offs between consistency and availability...*
*Considering data partitioning strategies...*
*Evaluating service mesh vs API gateway approaches...*
*Thinking through deployment and monitoring complexity...*

Architecture Recommendation:
[Detailed analysis with pros/cons of different approaches]
```

### MCP Server Utilization
The protocol automatically leverages:
- **Brave Search** for real-time best practices research
- **E2B Sandbox** for safe code execution and testing
- **Filesystem** for efficient file operations
- **Fetch** for documentation and resource retrieval

### Memory System Updates
All validations and learnings automatically update:
- `.claude/memory/failures.md` - Every failure with root cause
- `.claude/memory/successes.md` - Proven patterns and approaches
- `.claude/memory/patterns.md` - Reusable code patterns
- `.claude/memory/decisions.md` - Architectural decisions and rationale

## Workflow Examples

### Test-Driven Development
```
1. User: Implement user profile management with TDD

2. Claude Code Response:
   Phase 1: Writing failing tests for user profile CRUD operations
   Phase 2: Implementing minimal code to pass tests
   Phase 3: Refactoring with validation loop
   Phase 4: Adding integration tests
   Phase 5: Performance and security validation
```

### Concept Transformation
```
1. User: /project:concept-transform
   "So I was thinking about crypto wallets but for grandmas..."

2. Claude Code Response:
   Ultrathinking concept transformation...
   
   🎯 PRODUCT CONCEPT
   Name: GrandCrypto
   Tagline: Cryptocurrency as simple as sending a text message
   
   Core Problem: Elderly users can't access cryptocurrency due to complex UX
   Solution: Voice and SMS-based crypto transactions
   
   [Detailed product specification with market analysis]
```

## Best Practices for Maximum Effectiveness

### 1. Leverage CLAUDE.md as Project Memory
- Document all architectural decisions
- Include team coding standards
- Update with lessons learned
- Add common commands and workflows

### 2. Use Hierarchical Command Structure
- **Project commands** (`.claude/commands/`) for team workflows
- **User commands** (`~/.claude/commands/`) for personal productivity
- Organize by category for easy discovery

### 3. Embrace Extended Thinking
- Use "think" for standard analysis
- Use "think hard" for architectural decisions
- Use "ultrathink" for complex system design

### 4. Configure Appropriate Permissions
- Allowlist trusted tools for efficiency
- Require approval for file modifications
- Enable sandbox execution for safety

### 5. Maintain Clean Memory System
- Regular cleanup of outdated patterns
- Document both successes and failures
- Link decisions to original context

## Troubleshooting Common Issues

### MCP Server Connection Failures
```bash
# Debug MCP connections
claude --mcp-debug

# Verify environment variables
echo $BRAVE_API_KEY
echo $E2B_API_KEY
```

### Context Window Management
```
# Clear context when it gets cluttered
/clear

# Compact conversation history
/compact
```

### Performance Optimization
```
# Use appropriate model for task complexity
/model claude-4-sonnet    # For most tasks
/model claude-4-opus      # For complex reasoning
```

## Integration with Development Environments

### VS Code
- Launch with `Cmd+Esc` (Mac) or `Ctrl+Esc` (Windows/Linux)
- Automatic file context sharing
- Inline diff viewing

### Terminal Workflow
- Use git worktrees for parallel Claude sessions
- Background task execution with `&`
- Session logging for team collaboration

## Measuring Success

The protocol is working effectively when you see:
- ✅ Zero production bugs from AI-generated code
- ✅ Consistent coding patterns across the team
- ✅ Self-correcting development cycles
- ✅ Comprehensive documentation and tests
- ✅ Proactive problem identification and resolution

Remember: Prompt-or-Die isn't just about using AI to code—it's about creating a systematic approach to AI-assisted development that maintains the highest standards at every step. 