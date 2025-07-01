# 🔍 Root Cause Analysis Protocol

## When This Protocol Activates

This protocol triggers when:
- Errors persist after 2 fix attempts
- Same type of error appears in multiple places
- Fix causes new unexpected errors
- Performance degrades after changes
- The AI says "I'm not sure why this isn't working"

## The 5-Why Analysis Framework

### Step 1: Immediate Stop
```
"Multiple attempts have failed. Entering root cause analysis mode.
Current symptoms: [DESCRIBE ERRORS/ISSUES]
Switching from fixing to understanding."
```

### Step 2: Gather Full Context

Before analysis, collect:

1. **Error Timeline**
   ```
   Error History:
   - First occurrence: [WHEN/WHERE]
   - Attempted fixes: [LIST ATTEMPTS]
   - Results of each fix: [OUTCOMES]
   - Pattern observed: [ANY PATTERNS]
   ```

2. **System State**
   ```
   Current State:
   - Files affected: [LIST]
   - Dependencies involved: [LIST]
   - Recent changes: [WHAT CHANGED]
   - Working vs broken: [COMPARISON]
   ```

3. **Assumption Audit**
   ```
   Assumptions I've made:
   1. [ASSUMPTION] - Verified: ✓/✗
   2. [ASSUMPTION] - Verified: ✓/✗
   3. [ASSUMPTION] - Verified: ✓/✗
   ```

### Step 3: The 5-Why Analysis

For each symptom, ask why 5 times:

```
Symptom: [ERROR OR ISSUE]

Why 1: Why is this error occurring?
→ Answer: [IMMEDIATE CAUSE]

Why 2: Why does [IMMEDIATE CAUSE] happen?
→ Answer: [DEEPER CAUSE]

Why 3: Why does [DEEPER CAUSE] exist?
→ Answer: [ROOT PATTERN]

Why 4: Why wasn't [ROOT PATTERN] caught earlier?
→ Answer: [PROCESS GAP]

Why 5: Why does this [PROCESS GAP] exist?
→ Answer: [TRUE ROOT CAUSE]
```

### Step 4: Systemic Analysis

Beyond the immediate issue:

1. **Dependency Analysis**
   ```
   Dependency Tree:
   - Direct dependencies: [LIST]
   - Transitive dependencies: [LIST]
   - Version conflicts: [CHECK]
   - Missing dependencies: [CHECK]
   ```

2. **Integration Points**
   ```
   External Interfaces:
   - API calls: [VALIDATE EACH]
   - Data formats: [CHECK SCHEMAS]
   - Protocol versions: [VERIFY]
   - Authentication: [CONFIRM]
   ```

3. **Environmental Factors**
   ```
   Environment Check:
   - Runtime version: [VERIFY]
   - Configuration: [VALIDATE]
   - Permissions: [CHECK]
   - Resource limits: [CONFIRM]
   ```

### Step 5: Research Deep Dive

Based on root cause hypothesis:

1. **Targeted Research**
   ```
   Research Queries:
   - "[ROOT CAUSE] common solutions"
   - "[TECHNOLOGY] [SYMPTOM] production issues"
   - "[ERROR MESSAGE] root cause"
   - "[PATTERN] architectural problems"
   ```

2. **Documentation Review**
   ```
   Check Official Docs:
   - Migration guides
   - Breaking changes
   - Known issues
   - Best practices
   ```

3. **Community Knowledge**
   ```
   Search For:
   - GitHub issues with similar problems
   - Stack Overflow solutions
   - Blog posts about the issue
   - Workarounds used by others
   ```

### Step 6: Solution Design

After identifying root cause:

1. **Solution Options**
   ```
   Option 1: [DESCRIPTION]
   - Pros: [LIST]
   - Cons: [LIST]
   - Risk: [ASSESSMENT]
   
   Option 2: [DESCRIPTION]
   - Pros: [LIST]
   - Cons: [LIST]
   - Risk: [ASSESSMENT]
   ```

2. **Implementation Plan**
   ```
   Step-by-step fix:
   1. [PREREQUISITE CHANGES]
   2. [CORE FIX]
   3. [VALIDATION STEPS]
   4. [ROLLBACK PLAN]
   ```

3. **Prevention Strategy**
   ```
   To prevent recurrence:
   - Add checks for: [WHAT]
   - Monitor: [METRICS]
   - Document: [PATTERNS]
   - Test for: [SCENARIOS]
   ```

## Common Root Cause Patterns

### Pattern 1: Version Mismatch
**Symptoms**: Works locally, fails in production
**Root Cause**: Different dependency versions
**Fix**: Lock versions, use exact dependencies

### Pattern 2: Race Conditions
**Symptoms**: Intermittent failures, timing-dependent
**Root Cause**: Async operations not properly synchronized
**Fix**: Add proper await/promise handling

### Pattern 3: State Corruption
**Symptoms**: Gradual degradation, inconsistent behavior
**Root Cause**: Mutable state being shared incorrectly
**Fix**: Immutable patterns, proper state isolation

### Pattern 4: Hidden Dependencies
**Symptoms**: "Should work" but doesn't
**Root Cause**: Implicit dependencies not declared
**Fix**: Explicit dependency injection

### Pattern 5: Incorrect Mental Model
**Symptoms**: Fix attempts make things worse
**Root Cause**: Misunderstanding how system works
**Fix**: Research and correct understanding

## Research Mode Prompts

### Initial Investigation
```
"Entering research mode for: [PROBLEM]
Theory: [ROOT CAUSE HYPOTHESIS]
Searching for validation and solutions..."
```

### Deep Dive Research
```
"Root cause identified as: [CAUSE]
Researching:
1. How others solved this
2. Official recommendations
3. Long-term implications
4. Alternative approaches"
```

### Solution Validation
```
"Proposed solution: [DESCRIPTION]
Validating against:
- Will this fix the root cause?
- Are there side effects?
- Is this maintainable?
- Does this prevent recurrence?"
```

## Documentation Template

After root cause analysis, document:

```markdown
## Issue: [TITLE]
**Date**: [DATE]
**Severity**: Critical/High/Medium/Low

### Symptoms
- [SYMPTOM 1]
- [SYMPTOM 2]

### Root Cause
[DETAILED EXPLANATION]

### 5-Why Analysis
1. [WHY 1]
2. [WHY 2]
3. [WHY 3]
4. [WHY 4]
5. [WHY 5]

### Solution Implemented
[WHAT WAS DONE]

### Prevention Measures
- [MEASURE 1]
- [MEASURE 2]

### Lessons Learned
- [LESSON 1]
- [LESSON 2]
```

## Remember

> "A problem well-understood is half-solved. Rush to fix, and you'll be fixing forever. Pause to understand, and you'll fix it once."

Root cause analysis isn't about blame - it's about building better systems that fail less often and recover more gracefully. 