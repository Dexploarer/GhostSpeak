# 🔍 Self-Evaluation Prompt Patterns

## Core Self-Check Templates

These patterns ensure consistent, thorough self-evaluation after every code generation.

## Pattern 1: Initial Code Review

```prompt
I just generated [FILE/COMPONENT]. Let me perform a self-evaluation:

SYNTAX CHECK:
- [ ] Code compiles/parses without errors
- [ ] All imports are valid and available  
- [ ] No undefined variables or functions
- [ ] Proper syntax for the language

LOGIC REVIEW:
- [ ] Algorithm correctly implements requirements
- [ ] Edge cases are handled
- [ ] No infinite loops or recursion issues
- [ ] Return values match expected types

BEST PRACTICES:
- [ ] Follows language conventions
- [ ] Uses appropriate design patterns
- [ ] No code duplication
- [ ] Clear variable/function names

CONCERNS FOUND: [LIST ANY ISSUES]
```

## Pattern 2: Security Audit

```prompt
Security evaluation for [COMPONENT]:

INPUT VALIDATION:
- [ ] All user inputs sanitized
- [ ] SQL injection prevention
- [ ] XSS protection implemented
- [ ] Path traversal blocked

AUTHENTICATION/AUTHORIZATION:
- [ ] Proper authentication checks
- [ ] Authorization before actions
- [ ] Session management secure
- [ ] Token validation present

DATA PROTECTION:
- [ ] Sensitive data encrypted
- [ ] No secrets in code
- [ ] Secure communication (HTTPS)
- [ ] No data leaks in logs

VULNERABILITIES: [LIST IF ANY]
RESEARCH NEEDED: [SECURITY TOPICS TO VERIFY]
```

## Pattern 3: Performance Analysis

```prompt
Performance review of [COMPONENT]:

ALGORITHMIC COMPLEXITY:
- Time complexity: O([ANALYSIS])
- Space complexity: O([ANALYSIS])
- Bottlenecks identified: [LIST]

RESOURCE USAGE:
- [ ] Memory leaks prevented
- [ ] Database queries optimized
- [ ] Network calls minimized
- [ ] Caching implemented where beneficial

SCALABILITY:
- Current capacity: [ESTIMATE]
- Scaling limits: [IDENTIFY]
- Optimization opportunities: [LIST]

CONCERNS: [PERFORMANCE ISSUES TO ADDRESS]
```

## Pattern 4: Error Handling Validation

```prompt
Error handling audit for [FILE]:

ERROR SCENARIOS COVERED:
- [ ] Null/undefined inputs
- [ ] Network failures
- [ ] Timeout conditions
- [ ] Invalid data formats
- [ ] Resource exhaustion

ERROR RESPONSES:
- [ ] Meaningful error messages
- [ ] Proper error codes/types
- [ ] No sensitive data in errors
- [ ] Graceful degradation

RECOVERY MECHANISMS:
- [ ] Retry logic where appropriate
- [ ] Fallback behaviors defined
- [ ] State consistency maintained
- [ ] User notified appropriately

GAPS: [UNHANDLED ERROR CASES]
```

## Pattern 5: Integration Compatibility

```prompt
Integration check for [COMPONENT]:

EXTERNAL DEPENDENCIES:
- API versions used: [LIST]
- Breaking changes checked: [Y/N]
- Deprecation warnings: [ANY?]
- Alternative libraries: [CONSIDERED?]

INTERFACE CONTRACTS:
- [ ] Input formats validated
- [ ] Output formats consistent
- [ ] Error contracts defined
- [ ] Version compatibility ensured

INTEGRATION POINTS:
- Database schema compatible: [CHECK]
- API endpoints correct: [VERIFY]
- Message formats valid: [CONFIRM]
- Authentication working: [TEST]

ISSUES: [INTEGRATION PROBLEMS FOUND]
```

## Pattern 6: Testing Coverage

```prompt
Test evaluation for [COMPONENT]:

TEST COVERAGE:
- Unit tests written: [COUNT]
- Integration tests: [COUNT]  
- Edge cases covered: [LIST]
- Error paths tested: [LIST]

TEST QUALITY:
- [ ] Tests are independent
- [ ] Clear assertions
- [ ] Meaningful test names
- [ ] No flaky tests

MISSING TESTS:
- [SCENARIO 1]
- [SCENARIO 2]
- [SCENARIO 3]

ACTION: [TESTS TO ADD]
```

## Pattern 7: Documentation Check

```prompt
Documentation review for [COMPONENT]:

CODE DOCUMENTATION:
- [ ] Function/class comments present
- [ ] Parameter types documented
- [ ] Return values explained
- [ ] Complex logic annotated

API DOCUMENTATION:
- [ ] Endpoints documented
- [ ] Request/response examples
- [ ] Error codes listed
- [ ] Authentication explained

USAGE DOCUMENTATION:
- [ ] Setup instructions clear
- [ ] Configuration options listed
- [ ] Common use cases shown
- [ ] Troubleshooting guide present

GAPS: [MISSING DOCUMENTATION]
```

## Pattern 8: Improvement Identification

```prompt
After reviewing [COMPONENT], improvements needed:

IMMEDIATE FIXES:
1. [CRITICAL ISSUE]: [HOW TO FIX]
2. [BUG]: [SOLUTION]
3. [SECURITY HOLE]: [PATCH]

OPTIMIZATIONS:
1. [PERFORMANCE]: [IMPROVEMENT METHOD]
2. [READABILITY]: [REFACTORING NEEDED]
3. [MAINTAINABILITY]: [RESTRUCTURING]

RESEARCH REQUIRED:
1. [TOPIC]: [WHAT TO INVESTIGATE]
2. [BEST PRACTICE]: [TO VALIDATE]
3. [ALTERNATIVE]: [TO EXPLORE]

PRIORITY: [HIGH/MEDIUM/LOW]
ESTIMATED EFFORT: [TIME NEEDED]
```

## Pattern 9: Knowledge Gap Detection

```prompt
Evaluating my knowledge for [TECHNOLOGY/PATTERN]:

CONFIDENCE LEVEL:
- Very confident: [AREAS]
- Somewhat confident: [AREAS]
- Uncertain: [AREAS]
- Need research: [AREAS]

WARNING SIGNS:
- Used phrases like "I think" or "probably"
- Copied patterns without full understanding
- Made assumptions about behavior
- Skipped error handling due to uncertainty

RESEARCH PLAN:
1. Search: "[SPECIFIC QUERIES]"
2. Check docs: [OFFICIAL SOURCES]
3. Validate: [HOW TO TEST]
4. Learn: [CONCEPTS TO STUDY]
```

## Pattern 10: Final Validation

```prompt
Final check before considering [COMPONENT] complete:

✓ CHECKLIST:
- [ ] All identified issues resolved
- [ ] Tests pass consistently
- [ ] Performance acceptable
- [ ] Security validated
- [ ] Documentation complete
- [ ] Code review ready

CONFIDENCE SCORE: [1-10]
REMAINING CONCERNS: [LIST]
READY FOR: [HUMAN REVIEW/PRODUCTION/MORE WORK]

RECOMMENDATION: [PROCEED/ITERATE/RESEARCH]
```

## Meta-Pattern: Pattern Selection

```prompt
For [COMPONENT TYPE], I should apply these evaluation patterns:

1. [PATTERN NAME] - because [REASON]
2. [PATTERN NAME] - because [REASON]
3. [PATTERN NAME] - because [REASON]

Additional checks needed:
- [CUSTOM CHECK 1]
- [CUSTOM CHECK 2]

This ensures comprehensive validation for this component type.
```

## Usage Guide

1. **Always start with Pattern 1** (Initial Code Review)
2. **Apply relevant patterns** based on component type
3. **Use Pattern 8** (Improvement Identification) if issues found
4. **End with Pattern 10** (Final Validation)
5. **Document findings** using these structured formats

## Remember

> "Self-evaluation is not about finding perfection - it's about finding problems before users do."

These patterns create a consistent, thorough approach to self-evaluation that catches issues early and drives continuous improvement. 