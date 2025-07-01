# Research Mode Protocol

When errors persist after 2 fix attempts or you encounter "I'm not sure why this isn't working", enter deep research mode.

## Research Phase Activation

**Trigger Conditions:**
- Same error after 2+ different fix attempts
- Error patterns appearing across multiple files
- Performance degradation without clear cause
- "Unknown" or "unexpected" error messages
- AI uncertainty about root cause

## Multi-Source Investigation

### 1. Web Search Investigation
Use Brave Search MCP to research:
- Current best practices for this technology stack
- Known issues with specific versions/configurations  
- Recent security vulnerabilities or breaking changes
- Community discussions about similar errors
- Official documentation updates

**Search Queries to Try:**
```
"[ERROR_MESSAGE]" [TECHNOLOGY] 2024 2025
"[TECHNOLOGY] [VERSION] breaking changes"
"[TECHNOLOGY] [FEATURE] performance issues"
"[ERROR_TYPE] production debugging"
```

### 2. Codebase Pattern Analysis
Examine the entire codebase for:
- Similar implementations that work correctly
- Inconsistent patterns that might cause conflicts
- Recent changes that correlate with the issue
- Dependencies that might have version conflicts
- Configuration differences between environments

### 3. Fundamental Assumption Questioning

Challenge every assumption:
- **Is the problem what we think it is?** Re-examine symptoms
- **Are we solving the right problem?** Look for root causes
- **Is our approach fundamentally flawed?** Consider alternatives
- **Are there environmental factors?** Check system dependencies
- **Is this a known limitation?** Research architectural constraints

### 4. Documentation Deep Dive
Research authoritative sources:
- Official framework/library documentation
- API reference materials
- Architecture decision records (ADRs)
- Release notes and changelogs
- Security advisories

### 5. Code Execution Analysis
Use E2B sandbox to:
- Test minimal reproductions in clean environment
- Validate assumptions with isolated experiments
- Profile performance characteristics
- Test different configuration combinations

## Investigation Documentation

Create comprehensive research log:

```markdown
# Research Session: [ISSUE_DESCRIPTION]
**Date:** [TIMESTAMP]
**Trigger:** [WHAT_CAUSED_RESEARCH_MODE]

## Hypothesis Evolution
1. **Initial Hypothesis:** [FIRST_ASSUMPTION]
   - **Evidence For:** [SUPPORTING_DATA]
   - **Evidence Against:** [CONTRADICTING_DATA]
   - **Status:** [CONFIRMED/REJECTED/UNCERTAIN]

2. **Revised Hypothesis:** [UPDATED_THEORY]
   - **New Evidence:** [ADDITIONAL_FINDINGS]
   - **Test Results:** [VALIDATION_ATTEMPTS]

## Investigation Sources
- **Web Search Results:** [KEY_FINDINGS]
- **Codebase Analysis:** [PATTERN_DISCOVERIES]
- **Documentation Review:** [AUTHORITATIVE_SOURCES]
- **Experimental Results:** [SANDBOX_TESTS]

## Root Cause Identified
**Primary Cause:** [FUNDAMENTAL_ISSUE]
**Contributing Factors:** [SECONDARY_ISSUES]
**Evidence:** [PROOF_OF_ROOT_CAUSE]

## Solution Strategy
**Approach:** [SOLUTION_METHOD]
**Validation Plan:** [HOW_TO_VERIFY_FIX]
**Rollback Plan:** [RECOVERY_STRATEGY]
```

## Exit Criteria

Only exit research mode when you have:
- [ ] Clear understanding of root cause with evidence
- [ ] Validated solution approach through testing
- [ ] Documented lessons learned for future reference
- [ ] Updated project patterns to prevent recurrence

## Memory Update

Document findings in:
- `.claude/memory/failures.md` - What went wrong and why
- `.claude/memory/patterns.md` - New patterns discovered
- `.claude/memory/decisions.md` - Architectural insights gained

Remember: If you're guessing, you're not done researching. 