# Contributing to GhostSpeak CLI

Thank you for your interest in contributing to the GhostSpeak CLI! This document provides guidelines and information for contributors.

## 🎯 Project Overview

The GhostSpeak CLI is a production-ready TypeScript application that provides a command-line interface to the GhostSpeak AI Agent Commerce Protocol on Solana. It enables users to create, manage, and monetize AI agents in a decentralized marketplace.

## 🚀 Getting Started

### Prerequisites

- **Node.js**: >= 20.0.0
- **Package Manager**: [Bun](https://bun.sh/) (recommended) or npm
- **TypeScript**: Familiarity with TypeScript development
- **Solana**: Basic understanding of Solana blockchain concepts

### Development Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Prompt-or-Die/ghostspeak.git
   cd ghostspeak/packages/cli
   ```

2. **Install Dependencies**
   ```bash
   bun install
   # or
   npm install
   ```

3. **Development Commands**
   ```bash
   # Start development mode with hot reload
   bun run dev

   # Build for production
   bun run build

   # Run type checking
   bun run type-check

   # Run linting
   bun run lint

   # Run tests
   bun run test

   # Run all quality checks
   bun run lint && bun run type-check && bun run test
   ```

4. **Test the CLI**
   ```bash
   # Test built CLI
   node dist/index.js --help

   # Or install locally for testing
   npm link
   ghostspeak --help
   ```

## 📁 Project Structure

```
src/
├── commands/              # CLI command implementations
│   ├── agent/            # Agent-related commands
│   ├── marketplace/      # Marketplace commands
│   └── ...
├── services/             # Business logic services
├── utils/                # Utility functions and helpers
├── types/                # TypeScript type definitions
├── core/                 # Core architecture components
└── index.ts              # Main CLI entry point
```

### Key Files
- **`src/index.ts`** - Main CLI application setup
- **`src/commands/`** - Command implementations using Commander.js
- **`src/services/`** - Business logic separated from CLI commands
- **`src/utils/`** - Pure utility functions and helpers
- **`package.json`** - Dependencies and build configuration

## 🛠️ Development Guidelines

### Code Standards

We maintain high code quality standards:

- **TypeScript Strict Mode**: All code must pass TypeScript strict mode checks
- **Zero Lint Errors**: ESLint must pass with 0 errors and 0 warnings
- **Type Safety**: No `any` types except when absolutely necessary
- **Modern ES2022**: Use modern JavaScript/TypeScript features

### Naming Conventions

- **Files**: Use kebab-case for file names (`agent-service.ts`)
- **Classes**: Use PascalCase (`AgentService`)
- **Functions/Variables**: Use camelCase (`createAgent`)
- **Constants**: Use UPPER_SNAKE_CASE (`PROGRAM_ID`)
- **Interfaces**: Use PascalCase with descriptive names (`AgentCredentials`)

### Code Organization

- **Commands**: Keep command files focused on CLI interaction only
- **Services**: Business logic goes in service classes
- **Utils**: Pure functions without side effects
- **Types**: Centralized type definitions

## 🧪 Testing Guidelines

### Testing Strategy
- **Unit Tests**: Test individual functions and classes
- **Integration Tests**: Test command workflows end-to-end
- **Type Tests**: Ensure TypeScript types are correct

### Writing Tests
```typescript
import { describe, it, expect } from 'vitest'
import { AgentService } from '../services/AgentService'

describe('AgentService', () => {
  it('should create agent with valid parameters', async () => {
    const service = new AgentService()
    const result = await service.createAgent({
      name: 'Test Agent',
      description: 'Test Description'
    })
    
    expect(result).toBeDefined()
    expect(result.name).toBe('Test Agent')
  })
})
```

## 📝 Making Changes

### Branch Strategy
1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow coding standards
   - Add tests for new functionality
   - Update documentation if needed

3. **Quality Checks**
   ```bash
   # Run all checks before committing
   bun run lint
   bun run type-check  
   bun run test
   bun run build
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new agent management feature"
   ```

### Commit Message Format
We follow conventional commits:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `test:` - Adding or fixing tests
- `chore:` - Maintenance tasks

**Examples:**
```
feat: add auction monitoring command
fix: resolve wallet balance display issue
docs: update installation instructions
refactor: extract common validation logic
```

## 🔧 Adding New Features

### Adding a New Command

1. **Create Command File**
   ```typescript
   // src/commands/my-feature.ts
   import { Command } from 'commander'
   import { intro, outro } from '@clack/prompts'
   
   export function myFeatureCommand(): Command {
     return new Command('my-feature')
       .description('Description of the feature')
       .action(async () => {
         intro('My Feature')
         // Implementation
         outro('Feature completed')
       })
   }
   ```

2. **Register Command**
   ```typescript
   // src/index.ts
   import { myFeatureCommand } from './commands/my-feature.js'
   
   program.addCommand(myFeatureCommand())
   ```

3. **Add Tests**
   ```typescript
   // tests/commands/my-feature.test.ts
   import { describe, it, expect } from 'vitest'
   // Test implementation
   ```

4. **Update Documentation**
   - Add command to README.md
   - Update help text and examples

### Working with Solana

When adding blockchain functionality:

```typescript
import { initializeClient } from '../utils/client.js'

// Always use the centralized client initialization
const { client, wallet, rpc } = await initializeClient('devnet')

// Use proper error handling
try {
  const result = await client.someOperation()
  return result
} catch (error) {
  throw new Error(`Operation failed: ${error.message}`)
}
```

## 🐛 Bug Reports

### Reporting Issues
When reporting bugs, please include:

1. **Environment Information**
   - Node.js version
   - Operating system
   - CLI version (`ghostspeak --version`)

2. **Steps to Reproduce**
   - Exact commands run
   - Expected behavior
   - Actual behavior

3. **Error Messages**
   - Full error output
   - Stack traces if available

4. **Additional Context**
   - Network configuration
   - Wallet setup
   - Any relevant logs

### Bug Fix Process
1. Create issue describing the bug
2. Create branch: `fix/issue-number-description`
3. Write failing test that reproduces the bug
4. Fix the bug
5. Ensure test passes
6. Submit pull request

## 📋 Pull Request Process

### Before Submitting
- [ ] All tests pass (`bun run test`)
- [ ] Linting passes (`bun run lint`)
- [ ] Type checking passes (`bun run type-check`)
- [ ] Build succeeds (`bun run build`)
- [ ] Documentation updated if needed
- [ ] Manual testing completed

### PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Added/updated tests
- [ ] Manual testing completed
- [ ] All quality checks pass

## Checklist
- [ ] Code follows project standards
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### Review Process
1. Automated checks must pass
2. Code review by maintainers
3. Manual testing if needed
4. Approval and merge

## 🚀 Release Process

### Version Management
We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist
- [ ] Update version in `package.json`
- [ ] Update `CHANGELOG.md`
- [ ] Create release branch
- [ ] Final testing on all supported platforms
- [ ] Create GitHub release
- [ ] Publish to npm

## 💬 Community

### Communication Channels
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and discussions
- **Discord**: Real-time community chat
- **Documentation**: Detailed guides and API docs

### Code of Conduct
We are committed to providing a welcoming and inclusive environment. Please:
- Be respectful and professional
- Focus on constructive feedback
- Help create a positive community
- Follow our [Code of Conduct](../../CODE_OF_CONDUCT.md)

## 🎓 Learning Resources

### Understanding the Codebase
- **Architecture**: Service-based architecture with clear separation
- **CLI Framework**: Built with Commander.js and @clack/prompts
- **Blockchain Integration**: Uses @solana/kit v2+ for Solana interaction
- **Type Safety**: Leverages TypeScript strict mode throughout

### Recommended Reading
- [Commander.js Documentation](https://github.com/tj/commander.js)
- [Solana Web3.js Guide](https://docs.solana.com/developing/clients/javascript-api)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Testing Framework](https://vitest.dev/)

## 🤝 Recognition

Contributors will be:
- Listed in our contributors section
- Mentioned in release notes for significant contributions
- Invited to our contributors Discord channel
- Eligible for contributor rewards and recognition

## 📞 Getting Help

If you need help:
1. Check existing documentation
2. Search GitHub issues
3. Ask in GitHub Discussions
4. Join our Discord community
5. Contact maintainers directly

---

Thank you for contributing to GhostSpeak! Your contributions help build the future of decentralized AI agent commerce. 🚀

**Happy coding!** 💻✨