# Contributing to GhostSpeak SDK

Thank you for your interest in contributing to the GhostSpeak SDK! This document provides guidelines and instructions for contributing to the project.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites
- **Node.js 18+** (LTS recommended)
- **Bun** (latest version) - Used as the primary package manager
- **Rust** (latest stable) - For WASM module compilation
- **wasm-pack** - For building WebAssembly modules

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/ghostspeak.git
   cd ghostspeak/packages/sdk-typescript
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Install Rust and wasm-pack**
   ```bash
   # Install Rust (if not already installed)
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   
   # Install wasm-pack
   bun run wasm:install
   ```

4. **Build the project**
   ```bash
   bun run build
   ```

5. **Run tests**
   ```bash
   bun run test
   ```

## Development Workflow

### Branch Strategy
- `main` - Production-ready code
- `develop` - Development branch for new features
- `feature/*` - Feature branches
- `fix/*` - Bug fix branches

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**
   ```bash
   # Type checking
   bun run type-check
   
   # Linting
   bun run lint
   
   # Unit tests
   bun run test:unit
   
   # Integration tests
   bun run test:integration
   
   # Build verification
   bun run build
   ```

## Code Style Guidelines

### TypeScript
- Use strict TypeScript configuration
- No `any` types unless absolutely necessary
- Prefer interfaces over type aliases for object shapes
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### File Organization
- Group related functionality in modules
- Use barrel exports (`index.ts`) for clean imports
- Keep files focused and reasonably sized
- Place types in appropriate type definition files

### Naming Conventions
- **Files**: kebab-case (`my-module.ts`)
- **Classes**: PascalCase (`GhostSpeakClient`)
- **Functions/Variables**: camelCase (`createAgent`)
- **Constants**: SCREAMING_SNAKE_CASE (`DEFAULT_RPC_URL`)
- **Types/Interfaces**: PascalCase (`AgentConfig`)

## Testing

### Test Structure
- **Unit tests**: `tests/unit/` - Test individual functions/classes
- **Integration tests**: `tests/integration/` - Test component interactions
- **E2E tests**: `tests/e2e/` - Test complete user workflows

### Writing Tests
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Test both success and error cases

### Running Tests
```bash
# All tests
bun run test

# Specific test suites
bun run test:unit
bun run test:integration
bun run test:e2e

# With coverage
bun run test:coverage

# Watch mode
bun run test:watch
```

## Documentation

### API Documentation
- All public APIs must have JSDoc comments
- Include parameter descriptions and return types
- Provide usage examples where helpful

### Examples
- Add examples to the `examples/` directory
- Include README files with setup instructions
- Keep examples simple and focused

## Submitting Changes

### Pull Request Process

1. **Ensure your code is ready**
   - All tests pass
   - Code is properly formatted
   - Documentation is updated
   - No linting errors

2. **Create a pull request**
   - Use the PR template
   - Write a clear title and description
   - Link related issues
   - Add appropriate labels

3. **Review process**
   - Address reviewer feedback
   - Keep PR scope focused
   - Rebase if requested

### Commit Messages
Use conventional commit format:
```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
- `feat(client): add agent replication support`
- `fix(crypto): resolve elgamal encryption edge case`
- `docs(api): update escrow examples`

## Release Process

Releases are automated through GitHub Actions:

1. **Version bump** - Update version in `package.json`
2. **Create tag** - Push a version tag (`v2.1.0`)
3. **Automated release** - GitHub Actions handles:
   - Running tests
   - Building the package
   - Publishing to npm
   - Creating GitHub release

## Getting Help

- **Issues**: Check existing issues or create a new one
- **Discussions**: Use GitHub Discussions for questions
- **Discord**: Join our community Discord server

## Recognition

Contributors will be recognized in:
- Release notes
- Contributors section
- Special mentions for significant contributions

Thank you for contributing to GhostSpeak SDK! 🚀