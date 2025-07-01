# Decision Log

## 2025-01-01: Rust SDK Architecture Decisions

### Web3.js v2 Pattern Adoption
**Decision**: Adopt factory pattern and functional approach from web3.js v2 in Rust SDK
**Rationale**: 
- Provides consistent developer experience across SDKs
- Enables configurability and customization
- Follows modern Solana development patterns

**Implementation**:
- Create factory functions for transaction builders
- Use builder pattern for configuration
- Implement functional composition where appropriate

### SPL Token 2022 Integration
**Decision**: Use SPL Token 2022 (v9.0.0) as primary token standard
**Rationale**:
- Latest version with all extensions
- Backward compatible with original token program
- Future-proof for new features

**Implementation**:
- Use `StateWithExtensions` for all account deserialization
- Support transfer fees, metadata, and other extensions
- Use `transfer_checked` for all token operations

### Transaction Management
**Decision**: Implement sophisticated transaction building and management
**Rationale**:
- Web3.js v2 provides powerful transaction features
- Need to handle priority fees intelligently
- Support both legacy and versioned transactions

**Implementation**:
- Factory functions for transaction builders
- Automatic priority fee estimation
- Retry logic with exponential backoff
- Comprehensive simulation before sending

### Error Handling Strategy
**Decision**: Use structured error types with context
**Rationale**:
- Better debugging experience
- Proper error categorization
- Support for retryable vs non-retryable errors

**Implementation**:
- Use `thiserror` for structured errors
- Include context and retryability information
- Map Solana errors to SDK error types

## Previous Decisions

### 2024-12-XX: Web3.js v2 Migration
**Decision**: Migrate TypeScript SDK from Web3.js v1 to v2
**Status**: COMPLETED
**Outcome**: Successful migration with improved performance and developer experience 