# Coding Standards

## Rust Coding Standards

### Code Style
- Follow official Rust style guide
- Use `rustfmt` with default settings
- Use `clippy` with no warnings allowed
- All code must be safe (no `unsafe` blocks without documentation)

### Error Handling
- Use `Result<T, E>` for fallible operations
- Use `anyhow` for error propagation in applications
- Use `thiserror` for custom error types
- Always handle errors explicitly, no `unwrap()` in production

### Documentation
- All public items must have doc comments
- Use examples in doc comments where appropriate
- Keep documentation up to date with code changes

### Testing
- Unit tests for all public functions
- Integration tests for public APIs
- Property-based testing for complex logic
- 100% test coverage target

### Async Code
- Use `tokio` runtime consistently
- Use `async-trait` for async traits
- Handle async cancellation properly
- Use structured concurrency patterns

### Dependencies
- Prefer stable, well-maintained crates
- Pin exact versions for reproducible builds
- Minimize dependency tree depth
- Regular security audits of dependencies

## Web3 Development Standards

### Transaction Building
- Use modern factory patterns from web3.js v2
- Implement proper priority fee estimation
- Support both legacy and versioned transactions
- Include comprehensive simulation before sending

### SPL Token 2022 Support
- Use `StateWithExtensions` for account deserialization
- Support all standard extensions (transfer fees, metadata, etc.)
- Use `transfer_checked` for all token operations
- Handle extension-specific errors gracefully

### Account Management
- Use PDAs consistently for deterministic addressing
- Implement proper account validation
- Cache frequently accessed account data
- Handle account resizing for extensions

### Error Categories
- Network errors (transient, retryable)
- Validation errors (permanent, not retryable)
- Program errors (smart contract specific)
- SDK errors (internal logic errors) 