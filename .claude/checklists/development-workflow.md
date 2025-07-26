# GhostSpeak Development Workflow Checklist

## Before Starting Any Task

- [ ] Review current phase progress in `.claude/memories/ghostspeak-mvp-progress.md`
- [ ] Check todo list for context on current priorities
- [ ] Understand the specific MVP phase we're working on
- [ ] Verify we're maintaining the "no additional features" constraint

## Development Task Checklist

### 1. Planning Phase
- [ ] Use TodoWrite tool for multi-step tasks
- [ ] Break down complex features into smaller, testable components
- [ ] Consider security implications (validation, rate limiting, reentrancy)
- [ ] Plan for both Rust (Anchor) and TypeScript (SDK) components

### 2. Implementation Phase
- [ ] **Rust Implementation**:
  - [ ] Use Anchor 0.31.1+ patterns
  - [ ] Include proper input validation
  - [ ] Add rate limiting where appropriate
  - [ ] Implement reentrancy protection
  - [ ] Use canonical PDA derivations
  - [ ] Never log sensitive data

- [ ] **TypeScript SDK Implementation**:
  - [ ] Use @solana/kit (Web3.js v2) patterns only
  - [ ] Define proper TypeScript interfaces (no `any` types)
  - [ ] Use TypedRpcClient for all RPC calls
  - [ ] Implement enhanced error handling
  - [ ] Follow existing file organization patterns

### 3. Quality Assurance Phase
- [ ] **Code Quality**:
  ```bash
  npm run lint          # Must be 0 errors
  npm run type-check     # Must pass completely
  ```
- [ ] **Security Review**:
  - [ ] No private keys, seeds, or sensitive data in logs
  - [ ] Proper input validation at instruction level
  - [ ] Rate limiting implemented for public instructions
  - [ ] PDA derivations use canonical patterns
  - [ ] Protection against reentrancy attacks

### 4. Testing Phase
- [ ] **Unit Tests** (when applicable):
  - [ ] Cryptographic operations (ElGamal, proofs)
  - [ ] RPC query functions
  - [ ] Extension parsing logic
  - [ ] Error handling paths
- [ ] **Integration Tests** (when applicable):
  - [ ] Instruction builders
  - [ ] Multi-step workflows
  - [ ] Error scenarios

### 5. Documentation Phase
- [ ] Update progress in CLAUDE.md phase tracking
- [ ] Update `.claude/memories/ghostspeak-mvp-progress.md`
- [ ] Add inline documentation for complex functions
- [ ] Update relevant README files if needed

## Critical Commands Reference

```bash
# Quality checks (must pass)
npm run lint
npm run type-check

# Development
npm run build          # Verify build works
npm run test           # Run tests (when they exist)

# Anchor (from project root)
anchor build           # Compile Rust program
anchor test            # Run Anchor tests
anchor deploy --provider.cluster devnet  # Deploy to devnet

# Context7 library lookups
# Use MCP server to check latest patterns for:
# - /solana/web3js (Web3.js v2 patterns)
# - /anchor-lang/anchor (Anchor patterns)
# - /solana/spl-token (Token-2022 patterns)
# - /noble/curves (Cryptography patterns)
```

## Quality Gates (Must Pass)

### Code Quality Gate
- ✅ ESLint: 0 errors
- ✅ TypeScript: 0 errors  
- ✅ Build: Successful
- ✅ No `any` types (except when absolutely required)
- ✅ All imports justified

### Security Gate
- ✅ No sensitive data exposure
- ✅ Input validation implemented
- ✅ Rate limiting considered
- ✅ Reentrancy protection where needed
- ✅ Canonical PDA patterns used

### Functionality Gate
- ✅ Real implementation (no placeholders)
- ✅ Error handling implemented
- ✅ Integration with existing systems
- ✅ Backwards compatibility maintained
- ✅ Performance considerations addressed

## Emergency Procedures

### If ESLint Errors Appear
1. Run `npm run lint` to see all errors
2. Fix systematically (prefer proper types over `any`)
3. Use established patterns from existing code
4. Verify fixes don't break functionality

### If TypeScript Errors Appear
1. Run `npm run type-check` to see all errors
2. Define proper interfaces instead of using `any`
3. Check imports and exports are correct
4. Verify type compatibility across files

### If Build Fails
1. Check for missing dependencies
2. Verify all imports resolve correctly
3. Check for circular dependencies
4. Ensure generated code is up to date

---

**This checklist ensures every task maintains our quality standards and MVP focus.**