# kluster.ai MCP Verification Template

## Pre-Code Generation Checklist
- [ ] Understand user requirements clearly
- [ ] Research latest July 2025 patterns using context7/web search
- [ ] Plan implementation approach
- [ ] Identify potential security/performance concerns

## Code Generation Protocol

### Step 1: Generate Code
- Write production-ready code
- Follow GhostSpeak patterns (@solana/kit, Anchor 0.31.1+)
- Include proper TypeScript types
- Add comprehensive error handling

### Step 2: Mandatory kluster.ai Verification
```bash
# For single file verification
mcp__kluster-verify-mcp__verify

# For document-based verification  
mcp__kluster-verify-mcp__verify_document
```

**Verification Prompt Template**:
```
I just generated/modified [DESCRIPTION] code for the GhostSpeak protocol. 
This code should be production-ready, secure, and follow July 2025 Solana/TypeScript standards.

Please verify for:
1. Security vulnerabilities
2. Performance issues
3. Code quality problems  
4. Alignment with requirements
5. July 2025 best practices compliance
6. @solana/kit v2+ patterns
7. Anchor 0.31.1+ compatibility
```

### Step 3: Issue Resolution Protocol

#### P0-P1 Issues (Intent/Critical)
- **Action**: STOP immediately
- **Resolution**: Complete rewrite if necessary
- **Re-verify**: Must pass before proceeding

#### P2-P3 Issues (Critical/High)  
- **Action**: Fix before next task
- **Resolution**: Address root cause, not symptoms
- **Re-verify**: Confirm fix resolves issue

#### P4-P5 Issues (Medium/Low)
- **Action**: Document in project memory
- **Resolution**: Plan for future iteration
- **Re-verify**: Optional, track in backlog

### Step 4: Documentation Updates
- [ ] Update CLAUDE.md memories with key findings
- [ ] Document patterns that should be avoided
- [ ] Note successful approaches for reuse
- [ ] Update project context with lessons learned

### Step 5: Final Verification
- [ ] All P0-P3 issues resolved
- [ ] Code follows GhostSpeak patterns
- [ ] No security vulnerabilities
- [ ] Performance meets requirements
- [ ] TypeScript compilation clean
- [ ] ESLint errors: 0

## Common Issue Patterns to Watch For

### Security Issues (P0-P2)
- Exposed private keys or secrets
- Unvalidated user inputs
- SQL injection possibilities
- Cross-site scripting vulnerabilities
- Improper authentication/authorization

### Performance Issues (P2-P3)
- Inefficient database queries
- Memory leaks
- Blocking operations on main thread
- Large bundle sizes
- Unnecessary re-renders

### Code Quality Issues (P3-P4)
- Mixed import patterns (@solana/kit + legacy)
- Hardcoded values that should be configurable
- Missing error handling
- Inconsistent naming conventions
- Lack of type safety

### GhostSpeak-Specific Issues (P1-P3)
- Using @solana/web3.js v1 instead of @solana/kit
- Legacy Anchor patterns (pre-0.31.1)
- Missing Token-2022 compatibility
- Incorrect PDA derivations
- Mock implementations in production code

#### Specific GhostSpeak Examples:
```typescript
// ❌ P2 CRITICAL - Legacy web3.js import
import { Connection, PublicKey } from '@solana/web3.js'

// ✅ CORRECT - @solana/kit v2+ pattern
import { createSolanaRpc, address } from '@solana/kit'

// ❌ P3 HIGH - Missing Token-2022 extension support
const mint = await createMint(connection, payer, mintAuthority, freezeAuthority, decimals)

// ✅ CORRECT - Token-2022 with extensions
const mint = await createMintWithTransferFeeExtension(rpc, payer, {
  mintAuthority,
  freezeAuthority,
  decimals,
  transferFeeConfig: { maxFee: 5000n, feeBasisPoints: 250 }
})

// ❌ P2 CRITICAL - Hardcoded program ID
const PROGRAM_ID = new PublicKey('5PVu8KEhTJEJnA4rNUgY6qHZXuhMakRitnXWtFJnxBAG')

// ✅ CORRECT - Use current program ID from config
const PROGRAM_ID = address('F3qAjuzkNTbDL6wtZv4wGyHUi66j7uM2uRCDXWJ3Bg87')
```

## Success Criteria

### Code Quality Metrics
- ✅ 0 ESLint warnings/errors
- ✅ 100% TypeScript type coverage
- ✅ All tests passing
- ✅ Security scan clean
- ✅ Performance benchmarks met

### kluster.ai Verification Requirements
- ✅ No P0-P1 issues
- ✅ No P2-P3 issues (or documented exceptions)
- ✅ P4-P5 issues documented for future
- ✅ Re-verification passed after fixes
- ✅ Verification results logged

## Emergency Procedures

### If Verification Fails Repeatedly
1. Document the specific failure mode
2. Create minimal reproduction case
3. Escalate to manual expert review
4. Update verification patterns based on learnings

### If Critical Issues Found in Production
1. Immediate rollback if possible
2. Apply hotfix following full verification protocol
3. Post-mortem analysis of how issue escaped verification
4. Update verification rules to catch similar issues

## Verification History Template

```markdown
## [Date] - [File/Feature] Verification Results

**kluster.ai Verification**: [PASS/FAIL]
**Issues Found**: [Count by priority]
**Resolution Time**: [Duration]

### Issues Summary
- P0: [Description]
- P1: [Description] 
- P2: [Description]
- P3: [Description]

### Lessons Learned
- [Pattern to avoid]
- [Successful approach]
- [Update to verification rules]

### Memory Updates
- [Added to CLAUDE.md]
- [Updated project context]
```

---
**Remember**: No code generation is complete without kluster.ai verification. This is not optional - it's a core part of the development process for maintaining production quality standards.