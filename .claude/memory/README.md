# 🧠 Prompt-or-Die Memory System

## Purpose

This directory serves as the persistent memory for all learnings, failures, successes, and decisions made during development. It ensures we don't repeat mistakes and continuously improve our processes.

## Memory Files

### 📝 failures.md
Documents every significant failure, its root cause, and lessons learned. This is our most valuable learning resource.

**Format:**
```markdown
## [DATE] - [COMPONENT/FEATURE]
**Failure**: What went wrong
**Root Cause**: Why it happened  
**Impact**: What it affected
**Fix Applied**: How we resolved it
**Prevention**: How to avoid in future
**Tags**: #security #performance #logic
```

### ✅ successes.md
Captures successful patterns and approaches that worked well.

**Format:**
```markdown
## [DATE] - [COMPONENT/FEATURE]
**Success**: What worked well
**Why It Worked**: Key factors
**Pattern**: Reusable approach
**Metrics**: Measurable impact
**Tags**: #architecture #performance
```

### 🏛️ decisions.md
Records all architectural and technical decisions with their rationale.

**Format:**
```markdown
## [DATE] - [DECISION TITLE]
**Context**: Situation requiring decision
**Options Considered**:
  1. Option A - Pros/Cons
  2. Option B - Pros/Cons
**Decision**: What we chose
**Rationale**: Why we chose it
**Consequences**: Expected outcomes
**Review Date**: When to revisit
```

### 📈 improvements.md
Tracks continuous improvements and optimization opportunities.

**Format:**
```markdown
## [DATE] - [IMPROVEMENT AREA]
**Current State**: How things are now
**Desired State**: How they should be
**Action Items**:
  - [ ] Task 1
  - [ ] Task 2
**Priority**: High/Medium/Low
**Impact**: Expected benefits
```

## Usage Guidelines

### When to Write

1. **Immediately after a failure** - While details are fresh
2. **After successful deployments** - Capture what worked
3. **During architecture reviews** - Document decisions
4. **Weekly retrospectives** - Identify improvements

### How to Search

Use tags and dates to find relevant experiences:
- `#security` - Security-related learnings
- `#performance` - Performance optimizations
- `#architecture` - Design decisions
- `#debugging` - Debugging techniques
- `#integration` - Integration challenges

### Memory Queries

Before starting new work, ask:
1. "Have we encountered similar issues before?"
2. "What patterns have worked for this type of problem?"
3. "Are there documented decisions affecting this?"
4. "What improvements were suggested for this area?"

## Best Practices

### 1. Be Specific
Don't write "API failed" - write "POST /users endpoint returned 500 due to missing database index on email field"

### 2. Include Context
Always note:
- Environment (dev/staging/prod)
- Load conditions
- Dependencies involved
- Team members involved

### 3. Make It Actionable
Every entry should help future-you:
- What to do differently
- What to watch out for
- What worked well

### 4. Regular Reviews
- Weekly: Review recent entries
- Monthly: Identify patterns
- Quarterly: Update best practices

## Memory Integration

### With File Generation
Before generating any file, check:
```prompt
Checking memory for: [COMPONENT TYPE]
Similar failures: [SEARCH RESULTS]
Successful patterns: [SEARCH RESULTS]
Relevant decisions: [SEARCH RESULTS]
```

### With Root Cause Analysis
During analysis, reference:
```prompt
Historical data shows:
- This pattern failed before: [REFERENCE]
- Similar root cause found: [REFERENCE]
- Previous fix that worked: [REFERENCE]
```

### With Technical Review
During review, validate against:
```prompt
Memory check results:
- Known anti-patterns detected: [LIST]
- Successful patterns missing: [LIST]
- Decisions being violated: [LIST]
```

## Memory Maintenance

### Weekly Tasks
- [ ] Review and tag new entries
- [ ] Identify emerging patterns
- [ ] Update improvement priorities

### Monthly Tasks
- [ ] Consolidate similar learnings
- [ ] Extract new best practices
- [ ] Archive outdated decisions

### Quarterly Tasks
- [ ] Major pattern analysis
- [ ] Update protocol documents
- [ ] Team knowledge sharing

## Remember

> "Those who cannot remember the past are condemned to repeat it." - George Santayana

This memory system is only valuable if we:
1. **Write consistently** - Every significant event
2. **Reference regularly** - Before new work
3. **Learn actively** - Apply past lessons

The goal is not just to document, but to ensure every line of code benefits from our collective experience. 