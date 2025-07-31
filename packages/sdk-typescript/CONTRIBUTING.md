# Contributing to GhostSpeak TypeScript SDK

Thank you for your interest in contributing to the GhostSpeak TypeScript SDK! This document provides guidelines and information for contributors.

## 🚀 **Quick Start**

1. **Fork the Repository**
   ```bash
   git clone https://github.com/your-username/ghostspeak.git
   cd ghostspeak/packages/sdk-typescript
   ```

2. **Install Dependencies**
   ```bash
   bun install  # Recommended
   # or npm install
   ```

3. **Development Setup**
   ```bash
   bun run dev          # Start development build
   bun run test:watch   # Run tests in watch mode
   bun run lint         # Check code quality
   ```

## 📋 **Development Standards**

### **Code Quality Requirements**
- ✅ **Zero ESLint Errors**: All code must pass linting
- ✅ **100% TypeScript**: Strict mode enabled, no `any` types
- ✅ **Comprehensive Tests**: Unit tests required for new features
- ✅ **Documentation**: JSDoc comments for public APIs

### **Commit Convention**
We use [Conventional Commits](https://conventionalcommits.org/):

```bash
# Features
git commit -m "feat: add bulletproof verification system"

# Bug fixes  
git commit -m "fix: resolve native mint address validation"

# Documentation
git commit -m "docs: update API reference for escrow module"

# Performance improvements
git commit -m "perf: optimize ElGamal encryption performance"

# Breaking changes
git commit -m "feat!: restructure agent module API"
```

## 🛠️ **Development Workflow**

### **1. Create a Feature Branch**
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

### **2. Development Process**
```bash
# Make your changes
bun run lint          # Ensure code quality
bun run type-check    # Verify TypeScript
bun run test          # Run all tests
bun run build         # Verify build works
```

### **3. Testing Requirements**

**Unit Tests**
```typescript
// tests/unit/modules/your-module.test.ts
import { describe, it, expect, vi } from 'vitest'
import { YourModule } from '../../../src/modules/YourModule.js'

describe('YourModule', () => {
  it('should handle basic functionality', async () => {
    // Test implementation
    expect(result).toBeDefined()
  })
})
```

**Integration Tests**
```typescript
// tests/integration/your-feature.test.ts
describe('Your Feature Integration', () => {
  it('should work with real Solana connection', async () => {
    // Integration test implementation
  })
})
```

### **4. Pull Request Process**

1. **Update Documentation**
   - Update README.md if needed
   - Add JSDoc comments to new APIs
   - Update CHANGELOG.md

2. **Quality Checklist**
   - [ ] All tests pass (`bun run test`)
   - [ ] Zero ESLint warnings (`bun run lint`)
   - [ ] TypeScript compiles (`bun run type-check`)
   - [ ] Build succeeds (`bun run build`)
   - [ ] Documentation updated

3. **Create Pull Request**
   - Use descriptive title and description
   - Link related issues
   - Add screenshots for UI changes
   - Request review from maintainers

## 🎯 **Areas for Contribution**

### **High Priority**
- 🔐 **Security Enhancements**: Cryptographic improvements, audit findings
- 🧪 **Test Coverage**: Unit tests, integration tests, E2E tests
- 📚 **Documentation**: API docs, tutorials, examples
- 🐛 **Bug Fixes**: Issue resolution, stability improvements

### **Medium Priority**
- ⚡ **Performance**: Optimization, caching, bundle size reduction
- 🔧 **Developer Experience**: Better error messages, debugging tools
- 🌐 **Browser Compatibility**: Cross-platform testing and fixes
- 📦 **Build System**: Tooling improvements, CI/CD enhancements

### **Lower Priority**
- ✨ **Features**: New functionality (discuss first)
- 🎨 **Code Style**: Refactoring, code organization
- 📝 **Examples**: More usage examples and demos

## 🏗️ **Architecture Overview**

### **Project Structure**
```
src/
├── core/                 # Core client and base classes
├── modules/             # Feature modules (agents, escrow, etc.)
├── crypto/              # Cryptographic utilities
├── utils/               # Helper utilities
├── types/               # TypeScript type definitions
└── generated/           # Auto-generated from Anchor IDL

tests/
├── unit/                # Unit tests
├── integration/         # Integration tests
└── e2e/                 # End-to-end tests
```

### **Key Principles**
- **Type Safety**: Comprehensive TypeScript usage
- **Modularity**: Clean separation of concerns
- **Performance**: Efficient algorithms and caching
- **Security**: Defense in depth, input validation
- **Testability**: High test coverage, mocking support

## 🔍 **Code Review Guidelines**

### **For Contributors**
- Keep PRs focused and reasonably sized
- Write clear commit messages and PR descriptions
- Respond to feedback promptly
- Test your changes thoroughly

### **For Reviewers**
- Focus on correctness, security, and maintainability
- Provide constructive, specific feedback
- Approve when standards are met
- Be respectful and encouraging

## 🐛 **Bug Reports**

### **Before Submitting**
1. Search existing issues
2. Try the latest version
3. Create minimal reproduction

### **Issue Template**
```markdown
**Bug Description**
Clear description of the issue

**Reproduction Steps**
1. Step one
2. Step two
3. Step three

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- SDK Version: 2.0.0
- Node.js Version: 20.x
- Operating System: macOS/Linux/Windows
```

## 💡 **Feature Requests**

We welcome feature suggestions! Please:

1. **Check Roadmap**: Review our [roadmap](./docs/ROADMAP.md)
2. **Create Discussion**: Use GitHub Discussions for initial conversation
3. **Provide Context**: Explain the use case and benefits
4. **Consider Scope**: Keep proposals focused and well-defined

## 🏆 **Recognition**

Contributors are recognized in several ways:

- **CONTRIBUTORS.md**: Listed in our contributors file
- **Changelog**: Credited in release notes
- **Discord Role**: Special contributor role in our Discord
- **Swag**: GhostSpeak merchandise for significant contributions

## 📞 **Getting Help**

- **Discord**: [Join our community](https://discord.gg/ghostspeak)
- **GitHub Discussions**: For design discussions
- **GitHub Issues**: For bugs and feature requests
- **Email**: `dev@ghostspeak.com` for private questions

## 📄 **License**

By contributing to GhostSpeak, you agree that your contributions will be licensed under the [MIT License](./LICENSE).

---

**Happy coding! 🎉**

*Thank you for helping make GhostSpeak better for everyone.*