# 🔥 MASTER IMPLEMENTATION GUIDE - PROMPT-OR-DIE PROTOCOL
## Comprehensive AI Development System for Cursor IDE

> **"Either your prompts produce production-grade code, or they die in review."**

---

## 🎯 OVERVIEW

This guide combines the **Cursor Master Global Rules** with the **Prompt-or-Die protocol** to create a comprehensive AI development system that:

1. **Gathers context** from codebase and memory files
2. **Examines project state** to identify current stage
3. **Picks up development** from where it left off
4. **Enforces coding requirements** and fail-safes
5. **Validates every output** through rigorous review

---

## 📋 CRITICAL KNOWLEDGE REQUIREMENTS

### BEFORE ANY CODE GENERATION:
- **ALWAYS use Context7**: Add "use context7" to every prompt involving libraries/frameworks
- **ALWAYS web search**: Current best practices for 2025
- **NEVER rely on training data**: Information from 2024 is outdated
- **ALWAYS validate**: Cross-reference multiple authoritative sources

### Context7 Integration
The master rules require Context7 MCP server for up-to-date documentation:
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx", 
      "args": ["-y", "@upstash/context7-mcp@latest"]
    }
  }
}
```

---

## 🚀 PROMPT-OR-DIE EXECUTION PROTOCOL

### Every Code Generation Must Follow:

#### 1. Research Phase (MANDATORY)
```
BEFORE ANY CODE:
✓ Use Context7: Add "use context7" for library/framework info
✓ Web search: Current best practices for technology stack
✓ Check memory files: Review past decisions and patterns
✓ Validate approach: Cross-reference multiple sources
```

#### 2. Generation + Stop Phase
```
GENERATE + IMMEDIATE STOP
- Create initial implementation
- DO NOT proceed without evaluation
- Trigger self-evaluation protocol
```

#### 3. Self-Evaluation Loop
```
Technical Validation:
□ Code compiles/parses without errors
□ All imports/dependencies valid and available
□ Error handling comprehensive
□ Security vulnerabilities assessed
□ Follows established patterns

Knowledge Validation:
□ Web search confirms current best practices
□ Context7 validates library usage
□ Pattern matches project conventions
□ No known anti-patterns detected

Improvement Application:
□ Document specific issues found
□ Apply targeted fixes
□ Re-evaluate after changes
□ Update memory files with learnings
```

#### 4. Technical Leader Review
```
BEFORE ACCEPTANCE - DEMAND PROOF:
□ Working demo/example provided
□ All tests pass (show results)
□ Performance benchmarks met
□ Security audit complete
□ Error scenarios tested
□ Edge cases validated

RED FLAGS - IMMEDIATE REJECTION:
✗ "It should work" without proof
✗ No error handling
✗ Hardcoded values
✗ Missing tests
✗ TODO comments for critical functionality
```

---

## 📊 STATUS REPORTING SYSTEM

### Mandatory Response Format
```
[TASK: CURRENT_STATUS] - Brief description

## Progress Update
- **Current Objective**: What we're working on
- **Stage**: Where in the development lifecycle
- **Files Modified**: List of changed files
- **Blockers**: Any impediments encountered
- **Next Steps**: Immediate planned actions

## Research Performed
- **Context7 Usage**: Libraries researched
- **Web Search Results**: Current practices validated
- **Memory File Updates**: Patterns/decisions documented
```

---

## ⚡ ABSOLUTE REQUIREMENTS

### Production Standards (NO EXCEPTIONS)
- **NO STUBS, MOCK DATA, OR PLACEHOLDERS** - Production code only
- **NO "TODO" COMMENTS** for critical functionality
- **NO HARDCODED VALUES** or magic numbers
- **NO ASSUMPTIONS** - Always verify and validate
- **BACKEND-FIRST APPROACH** - API before frontend
- **REAL DATA FLOWS ONLY** - No mock data in frontend

### Quality Gates
Before ANY task is considered complete:
□ Code compiles without warnings
□ All tests pass (unit, integration, e2e)
□ Security vulnerabilities addressed
□ Performance requirements met
□ Documentation updated
□ Memory files updated with learnings

---

## 🎯 IMPLEMENTATION PROMISE

When this protocol is followed completely:
- **Zero production bugs** from AI-generated code
- **100% test coverage** on all new features
- **Complete documentation** for all public interfaces
- **Consistent quality** across all development sessions
- **Self-correcting workflows** that improve over time

**Either your development process produces production-grade results, or it dies in review.**

**Choose excellence. Code with discipline. Ship with confidence.**
