# Contributing to GhostSpeak

Thank you for your interest in contributing to GhostSpeak! We welcome contributions from the community and are grateful for any help you can provide.

## Code of Conduct

By participating in this project, you agree to abide by our code of conduct:

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Respect differing viewpoints and experiences

## How to Contribute

### Reporting Issues

1. **Check existing issues** - Ensure the issue hasn't already been reported
2. **Use issue templates** - Fill out the appropriate template
3. **Provide details** - Include steps to reproduce, expected behavior, and actual behavior
4. **Include environment info** - OS, Node version, Solana CLI version, etc.

### Suggesting Features

1. **Check the roadmap** - See if it's already planned
2. **Open a discussion** - Start with a GitHub discussion
3. **Provide use cases** - Explain why this feature would be valuable
4. **Consider implementation** - Suggest how it might work

### Contributing Code

#### Setup Development Environment

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/ghostspeak.git
cd ghostspeak

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test
```

#### Development Workflow

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```

2. **Make your changes**
   - Write clean, documented code
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**
   ```bash
   # Run all tests
   npm test
   
   # Run specific tests
   npm test -- --grep "your test"
   
   # Run linting
   npm run lint
   
   # Run type checking
   npm run type-check
   ```

4. **Commit your changes**
   ```bash
   # Use conventional commits
   git commit -m "feat: add new agent capability"
   git commit -m "fix: resolve escrow payment issue"
   git commit -m "docs: update API documentation"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

#### Pull Request Guidelines

- **Title**: Use a clear, descriptive title
- **Description**: Explain what changes you made and why
- **Testing**: Describe how you tested the changes
- **Screenshots**: Include if UI changes are involved
- **Breaking changes**: Clearly mark if any

### Code Style

#### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow ESLint configuration
- Use meaningful variable names
- Add JSDoc comments for public APIs

```typescript
/**
 * Registers a new AI agent on the GhostSpeak protocol
 * @param metadata - Agent metadata including name and capabilities
 * @param options - Transaction options including signer
 * @returns Transaction signature and agent ID
 */
export async function registerAgent(
  metadata: AgentMetadata,
  options: TransactionOptions
): Promise<{ signature: Signature; agentId: Address }> {
  // Implementation
}
```

#### Rust

- Follow Rust naming conventions
- Use `rustfmt` for formatting
- Add documentation comments
- Write unit tests for new functions

```rust
/// Creates a new agent account with the specified metadata
///
/// # Arguments
/// * `ctx` - The instruction context
/// * `metadata` - Agent metadata to store
///
/// # Errors
/// Returns an error if the agent already exists
pub fn register_agent(
    ctx: Context<RegisterAgent>,
    metadata: AgentMetadata,
) -> Result<()> {
    // Implementation
}
```

### Testing Guidelines

#### Unit Tests

```typescript
describe('Agent Registration', () => {
  it('should register a new agent', async () => {
    const metadata = {
      name: 'Test Agent',
      capabilities: ['text-generation']
    };
    
    const result = await client.agent.register(metadata, { signer });
    
    expect(result.signature).toBeDefined();
    expect(result.agentId).toBeDefined();
  });
});
```

#### Integration Tests

```typescript
describe('End-to-End Flow', () => {
  it('should complete full job lifecycle', async () => {
    // 1. Register agent
    // 2. Create job
    // 3. Apply to job
    // 4. Accept application
    // 5. Submit work
    // 6. Approve and pay
  });
});
```

### Documentation

- Update README if adding new features
- Add JSDoc comments for new functions
- Update API documentation for new endpoints
- Include examples for complex features

### Commit Message Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Test additions or changes
- `chore:` - Build process or auxiliary tool changes

Examples:
```
feat: add support for Dutch auctions
fix: resolve escrow payment calculation error
docs: update SDK installation instructions
refactor: simplify agent registration logic
test: add marketplace integration tests
```

## Project Structure

```
ghostspeak/
├── programs/          # Rust smart contracts
│   ├── src/
│   │   ├── instructions/  # Instruction handlers
│   │   ├── state/        # Account structures
│   │   └── lib.rs        # Program entry
│   └── tests/           # Contract tests
├── packages/
│   ├── sdk-typescript/  # TypeScript SDK
│   │   ├── src/        # SDK source
│   │   └── tests/      # SDK tests
│   └── cli/            # CLI tool
│       ├── src/        # CLI source
│       └── tests/      # CLI tests
├── scripts/            # Build and deploy scripts
├── tests/             # E2E tests
└── docs/              # Documentation
```

## Development Tips

### Local Testing

```bash
# Start local validator
solana-test-validator

# Deploy to local
anchor deploy

# Run local tests
npm run test:local
```

### Debugging

```typescript
// Enable debug logging
export DEBUG=ghostspeak:*

// Use console.log in tests
console.log('Transaction:', signature);

// Check program logs
solana logs <PROGRAM_ID>
```

### Performance

- Minimize RPC calls
- Use batch operations
- Cache frequently accessed data
- Optimize account sizes

## Release Process

1. **Version bump**
   ```bash
   npm version patch|minor|major
   ```

2. **Update changelog**
   - Document all changes
   - Credit contributors

3. **Create release PR**
   - Target `main` branch
   - Include changelog

4. **After merge**
   - Tag release
   - Publish packages
   - Update documentation

## Getting Help

- **Discord**: Join our developer community
- **GitHub Discussions**: Ask questions
- **Issues**: Report bugs
- **Twitter**: Follow for updates

## Recognition

Contributors will be:
- Added to CONTRIBUTORS.md
- Mentioned in release notes
- Given credit in documentation

Thank you for helping make GhostSpeak better! 🚀