# Contributing to GhostSpeak

First off, thank you for considering contributing to GhostSpeak! It's people like you that make GhostSpeak such a great tool for the AI agent economy.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples to demonstrate the steps**
- **Describe the behavior you observed after following the steps**
- **Explain which behavior you expected to see instead and why**
- **Include logs and error messages**

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title**
- **Provide a step-by-step description of the suggested enhancement**
- **Provide specific examples to demonstrate the steps**
- **Describe the current behavior and explain which behavior you expected**
- **Explain why this enhancement would be useful**

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code lints
6. Issue that pull request!

## Development Setup

### Prerequisites

- Node.js 18+
- Rust 1.75+
- Solana CLI 1.18+
- Anchor 0.31.1+

### Setup

```bash
# Clone your fork
git clone https://github.com/your-username/ghostspeak.git
cd ghostspeak

# Install dependencies
npm install

# Build everything
npm run build

# Run tests
npm test
```

### Development Workflow

1. **Smart Contracts** (Rust/Anchor)
   ```bash
   # Build contracts
   anchor build
   
   # Run tests
   anchor test
   
   # Deploy to devnet
   anchor deploy --provider.cluster devnet
   ```

2. **SDK Development** (TypeScript)
   ```bash
   # Watch mode
   npm run dev:sdk
   
   # Run tests
   npm run test:sdk
   
   # Build
   npm run build:sdk
   ```

3. **CLI Development**
   ```bash
   # Watch mode
   npm run dev:cli
   
   # Test commands
   npx ghostspeak --help
   
   # Build
   npm run build:cli
   ```

## Style Guides

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

### Rust Style Guide

- Follow the official [Rust Style Guide](https://doc.rust-lang.org/1.0.0/style/)
- Use `cargo fmt` before committing
- Run `cargo clippy` and fix warnings
- Write documentation for public APIs

### TypeScript Style Guide

- Use TypeScript strict mode
- Prefer `const` over `let`
- Use meaningful variable names
- Document complex logic with comments
- Write JSDoc for public APIs

### Documentation Style Guide

- Use Markdown for documentation
- Include code examples where applicable
- Keep language clear and concise
- Update docs with code changes

## Testing

### Smart Contract Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_register_agent() {
        // Test implementation
    }
}
```

### SDK Tests

```typescript
describe('GhostSpeakClient', () => {
  it('should register an agent', async () => {
    // Test implementation
  });
});
```

### CLI Tests

```typescript
describe('agent command', () => {
  it('should register a new agent', async () => {
    // Test implementation
  });
});
```

## Project Structure

When adding new features, follow the existing structure:

- Smart contract instructions go in `programs/src/instructions/`
- SDK client methods go in `packages/sdk-typescript/src/client/`
- CLI commands go in `packages/cli/src/commands/`
- Tests mirror the source structure

## Release Process

1. Update version numbers in all package.json files
2. Update CHANGELOG.md
3. Create a git tag: `git tag -a v1.0.0 -m "Version 1.0.0"`
4. Push the tag: `git push origin v1.0.0`
5. Create a GitHub release

## Questions?

Feel free to open an issue with your question or reach out on our [Discord](https://discord.gg/ghostspeak).

Thank you for contributing!