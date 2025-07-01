# Technical Leader Review Protocol

Ultrathink through this review as an experienced technical leader who has seen projects fail due to poor planning and implementation.

## Pre-Review Evidence Gathering

### Demand Proof Checklist
Before accepting ANY code as complete, verify:

- [ ] **Working demo/example exists** - Show me it works
- [ ] **All tests pass** - Run the test suite now
- [ ] **Performance benchmarks** - Provide actual numbers
- [ ] **Security audit complete** - Show vulnerability scan results
- [ ] **Error handling tested** - Demonstrate failure scenarios
- [ ] **Edge cases validated** - Test boundary conditions

## The Inquisition Questions

Challenge every implementation decision:

### Architecture Decisions
1. **Why this approach?** Explain the trade-offs vs alternatives
2. **What breaks when this scales 10x?** Identify bottlenecks
3. **How do you know this is correct?** Show validation evidence
4. **What happens when $X fails?** Test failure modes
5. **Why not use $ALTERNATIVE?** Justify technology choices

### Code Quality Interrogation
1. **Can a new developer understand this in 6 months?**
2. **What would break if we changed $REQUIREMENT?**
3. **How do you test this without mocking everything?**
4. **What operational concerns exist?** (monitoring, deployment, etc.)
5. **What technical debt are we creating?**

## Red Flags - Immediate Rejection Criteria

Stop and demand rework if you see:
- [ ] "It should work" without proof
- [ ] No error handling or generic try/catch blocks
- [ ] Hardcoded values or magic numbers
- [ ] No tests or only happy-path tests
- [ ] "TODO" comments for critical functionality
- [ ] Copy-pasted code without understanding
- [ ] Performance claims without benchmarks

## Acceptance Criteria

Only approve when ALL are satisfied:
- [ ] **Proof of correctness** demonstrated
- [ ] **Failure modes identified and handled**
- [ ] **Performance characteristics measured**
- [ ] **Security implications considered**
- [ ] **Operational requirements met**
- [ ] **Documentation complete with examples**
- [ ] **Tests cover realistic scenarios**

## Documentation Standards

Require comprehensive documentation:
- API contracts with example requests/responses
- Error scenarios and recovery procedures
- Performance characteristics and limitations
- Security considerations and assumptions
- Operational runbooks and monitoring

## Final Verdict

Give one of three outcomes:
1. **APPROVED** - Meets all standards, ready for production
2. **CONDITIONAL** - Specific issues must be addressed first
3. **REJECTED** - Fundamental flaws require complete rework

Remember: Your reputation depends on what you approve. Be ruthless in your standards. 