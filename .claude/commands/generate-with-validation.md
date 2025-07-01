# Generate File with Validation Loop

Think hard about the requirements and implement the Prompt-or-Die validation protocol:

## Phase 1: Initial Generation
1. Generate the requested file/code based on requirements
2. **STOP immediately** - Do not proceed without evaluation

## Phase 2: Self-Evaluation 
Perform comprehensive self-evaluation against:

### Technical Validation
- [ ] Does this code compile/parse without errors?
- [ ] Are all imports/dependencies valid and available?
- [ ] Is error handling comprehensive?
- [ ] Are there potential security vulnerabilities?
- [ ] Does it follow established patterns in CLAUDE.md?

### Knowledge Check
- [ ] Search web for current best practices for this technology
- [ ] Check against project patterns in `.claude/memory/patterns.md`
- [ ] Validate against similar implementations
- [ ] Review for common anti-patterns

### Logical Analysis
- [ ] Does this solve the stated problem correctly?
- [ ] Are edge cases handled?
- [ ] Is performance acceptable?
- [ ] Will this scale appropriately?

## Phase 3: Improvement Identification
Document specific improvements needed:
- What went wrong?
- What could be done better?
- What are the next steps?

## Phase 4: Apply Improvements
Make targeted changes based on identified issues.

## Phase 5: Second Evaluation
Repeat the validation process on the improved version.

## Phase 6: Final Polish or Research Mode
- If still failing: Enter research mode and investigate root causes
- If acceptable: Apply final polish and document lessons learned

## Memory Update
Update `.claude/memory/` files with:
- New patterns discovered
- Failures and their solutions
- Successful approaches

Remember: Either the code meets production standards, or it dies in review. 