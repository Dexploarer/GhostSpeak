# Feature Development Workflow

## Phase 1: Research and Planning
1. **Context Gathering**
   - Search latest documentation for libraries/frameworks
   - Check current best practices and patterns
   - Review security considerations
   - Update memory files with findings

2. **Architecture Design**
   - Design service layer interfaces
   - Plan error handling strategy
   - Design testing approach
   - Document decisions in ADR

## Phase 2: Implementation
1. **Core Implementation**
   - Write type definitions first
   - Implement service layer logic
   - Add comprehensive error handling
   - Follow coding standards strictly

2. **Testing**
   - Write unit tests alongside code
   - Add integration tests
   - Test error conditions
   - Validate with real blockchain data

## Phase 3: Integration and Documentation
1. **Integration**
   - Test with existing services
   - Verify backward compatibility
   - Check performance characteristics
   - Update examples

2. **Documentation**
   - Update API documentation
   - Add usage examples
   - Update README if needed
   - Record lessons learned

## Status Tracking
- Update progress.md every 15 minutes during active development
- Use task statuses: NOT_STARTED → RESEARCHING → PLANNING → IMPLEMENTING → TESTING → REVISING → COMPLETED
- Document any blockers immediately

## Quality Gates
- All tests must pass
- Code coverage >90%
- No clippy warnings
- Security review completed
- Documentation updated 