# 🤝 Contributing to Wija Studio VS Code Extension

Welcome to the Wija Studio community! We're excited you want to contribute to making this the most powerful AI development assistant for VS Code.

## 🎯 **Quick Start for Contributors**

### Prerequisites

- **Node.js** 18+ and **npm** 8+
- **VS Code** 1.74.0 or higher
- **Git** for version control
- Basic knowledge of **TypeScript** and **VS Code Extension API**

### Development Setup

```bash
# 1. Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/wija-studio-vscode.git
cd wija-studio-vscode/packages/cursor-extension

# 2. Install dependencies
npm install

# 3. Build the extension
npm run build

# 4. Open in VS Code for development
code .

# 5. Press F5 to launch Extension Development Host
# This opens a new VS Code window with your extension loaded
```

---

## 🏗️ **Project Architecture**

### Core Structure

```
packages/cursor-extension/
├── src/
│   ├── extension.ts              # Main entry point
│   ├── providers/                # Feature providers
│   │   ├── prompt-vault-provider.ts     # Prayer Vault core
│   │   ├── spirit-echo-provider.ts      # Spirit Echo scanner
│   │   └── prayer-pocket-provider.ts    # Code selection features
│   ├── commands/                 # VS Code command handlers
│   ├── ui/                      # User interface components
│   └── utils/                   # Shared utilities
├── assets/                      # Icons, themes, resources
├── test/                       # Test files and fixtures
└── package.json                # Extension manifest & dependencies
```

### Key Design Patterns

1. **Provider Pattern** - Each major feature is a provider class
2. **Command Pattern** - VS Code commands are cleanly separated
3. **Factory Pattern** - AI providers use factory for instantiation
4. **Observer Pattern** - Event-driven UI updates
5. **Strategy Pattern** - Configurable AI provider strategies

---

## 📝 **Development Guidelines**

### Code Style

We follow **strict TypeScript** with these conventions:

```typescript
// ✅ Good: Clear, typed, documented
interface PrayerData {
  name: string;
  category: PrayerCategory;
  content: string;
  tags: string[];
  createdAt: Date;
}

/**
 * Creates a new prayer in the vault
 * @param data Prayer data to create
 * @returns Promise resolving to created prayer ID
 */
async function createPrayer(data: PrayerData): Promise<string> {
  // Implementation
}

// ❌ Bad: Untyped, unclear
function create(stuff: any): any {
  // Implementation
}
```

### File Naming Conventions

- **PascalCase** for class files: `PrayerVaultProvider.ts`
- **kebab-case** for utility files: `file-utils.ts`
- **camelCase** for function files: `apiHelpers.ts`
- **UPPER_CASE** for constants: `CONSTANTS.ts`

### Testing Standards

Every feature MUST have tests:

```typescript
// test/prayer-vault.test.ts
describe('Prayer Vault Provider', () => {
  test('should create prayer with valid data', async () => {
    const provider = new WijaPrayerVaultProvider();
    const data: PrayerData = {
      name: 'Test Prayer',
      category: 'Functions',
      content: 'test code',
      tags: ['test'],
      createdAt: new Date()
    };
    
    const id = await provider.createPrayer(data);
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
  });
});
```

---

## 🎯 **Feature Development Process**

### 1. **Issue Creation**

Before starting work:

1. Check existing issues to avoid duplicates
2. Create detailed issue with:
   - Clear problem statement
   - Expected behavior
   - Acceptance criteria
   - UI mockups (if applicable)

### 2. **Branch Naming**

```bash
# Feature branches
git checkout -b feature/prayer-vault-analytics
git checkout -b feature/spirit-echo-performance

# Bug fixes
git checkout -b fix/code-selection-context-menu
git checkout -b fix/ai-provider-timeout

# Documentation
git checkout -b docs/contributing-guide
git checkout -b docs/api-reference
```

### 3. **Development Workflow**

```bash
# 1. Create feature branch
git checkout -b feature/my-awesome-feature

# 2. Develop with tests
npm run test:watch  # Run tests in watch mode

# 3. Ensure code quality
npm run lint        # Check code style
npm run typecheck   # Verify TypeScript
npm run test        # Run all tests

# 4. Test in extension host
# Press F5 in VS Code to test your changes

# 5. Commit with conventional commits
git commit -m "feat(prayer-vault): add export functionality"
```

### 4. **Pull Request Process**

1. **Fill out PR template completely**
2. **Include screenshots/GIFs** for UI changes
3. **Verify all checks pass**
4. **Request review** from maintainers
5. **Address feedback** promptly

---

## 🧪 **Testing Guidelines**

### Test Categories

1. **Unit Tests** - Individual functions/methods
2. **Integration Tests** - Feature interactions
3. **E2E Tests** - Full user workflows
4. **Performance Tests** - Speed/memory benchmarks

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests (requires Extension Development Host)
npm run test:e2e

# Coverage report
npm run test:coverage
```

### Writing Good Tests

```typescript
// ✅ Good test structure
describe('Spirit Echo Scanner', () => {
  let provider: WijaSpiritEchoProvider;
  
  beforeEach(() => {
    provider = new WijaSpiritEchoProvider();
  });
  
  describe('scanFiles', () => {
    it('should find TODO comments in TypeScript files', async () => {
      // Arrange
      const testFile = 'test-file.ts';
      const testContent = '// TODO: implement this feature';
      
      // Act
      const results = await provider.scanContent(testContent, testFile);
      
      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('todo');
      expect(results[0].severity).toBe('critical');
    });
  });
});
```

---

## 🎨 **UI/UX Guidelines**

### Mystical Branding

- **Emojis**: Use mystical/spiritual emojis (🔮, 👻, ⚡, 🌟)
- **Language**: "Prayers", "Spirits", "Echoes", "Vault"
- **Colors**: Deep purples, mystical blues, ethereal whites
- **Animations**: Smooth, magical transitions

### VS Code Integration

- **TreeView** for hierarchical data (Prayer Vault)
- **WebView** for complex UI (Analytics dashboard)
- **StatusBar** for quick status (Active provider)
- **Notifications** for feedback (Progress, errors)

### Accessibility

- **Keyboard navigation** for all features
- **Screen reader** support with aria-labels
- **High contrast** mode compatibility
- **Reduced motion** respect

---

## 🔧 **Common Development Tasks**

### Adding New AI Provider

```typescript
// 1. Define provider interface
interface AIProvider {
  id: string;
  name: string;
  baseUrl: string;
  models: AIModel[];
  features: string[];
}

// 2. Implement provider class
class NewAIProvider implements AIProvider {
  // Implementation
}

// 3. Register in provider registry
AIProviderRegistry.register('new-provider', NewAIProvider);

// 4. Add to UI dropdown
// Update provider-config.ts with new option

// 5. Add tests
// test/ai-providers/new-provider.test.ts
```

### Adding New Spirit Echo Pattern

```typescript
// 1. Define pattern in echo-patterns.ts
export const NEW_PATTERN: EchoPattern = {
  name: 'custom-pattern',
  regex: /CUSTOM:\s*(.*)/gi,
  severity: 'medium',
  category: 'Custom',
  description: 'Custom pattern for specific needs'
};

// 2. Add to pattern registry
EchoPatternRegistry.register(NEW_PATTERN);

// 3. Add test cases
// Verify pattern detection works correctly

// 4. Update documentation
// Add to README.md pattern list
```

### Adding New Prayer Category

```typescript
// 1. Update types
export type PrayerCategory = 
  | 'Functions'
  | 'Classes' 
  | 'Error Handling'
  | 'Performance'
  | 'Security'
  | 'NewCategory';  // Add here

// 2. Update UI
// Add to category dropdown in Prayer Vault

// 3. Update auto-detection
// Add pattern matching for new category

// 4. Add tests
// Verify categorization works
```

---

## 🚀 **Release Process**

### Version Numbering

We use **Semantic Versioning** (semver):

- **Major** (1.0.0): Breaking changes
- **Minor** (1.1.0): New features, backward compatible
- **Patch** (1.0.1): Bug fixes, backward compatible

### Release Checklist

```bash
# 1. Update version
npm version minor  # or major/patch

# 2. Update CHANGELOG.md
# Document all changes since last release

# 3. Run full test suite
npm run test:all

# 4. Build production package
npm run package

# 5. Test packaged extension
# Install .vsix file and test manually

# 6. Create release PR
# Include changelog and version bump

# 7. After merge, create GitHub release
# Tag: v1.1.0, attach .vsix file

# 8. Publish to VS Code Marketplace
vsce publish
```

---

## 📊 **Performance Guidelines**

### Extension Startup

- **< 200ms** activation time
- **Lazy loading** for heavy components
- **Minimal initial bundle** size

### Memory Usage

- **< 50MB** base memory usage
- **Efficient cleanup** of event listeners
- **Dispose patterns** for resources

### File Operations

- **Async operations** for file I/O
- **Progress indicators** for long operations
- **Cancellation support** for user-initiated cancellation

### AI Provider Calls

- **Timeout handling** (30s default)
- **Retry logic** with exponential backoff
- **Rate limiting** to respect API limits
- **Caching** for repeated requests

---

## 🛡️ **Security Guidelines**

### API Key Handling

```typescript
// ✅ Secure: Use VS Code's secret storage
await context.secrets.store('openai-api-key', apiKey);
const apiKey = await context.secrets.get('openai-api-key');

// ❌ Insecure: Plain text storage
settings.apiKey = 'sk-...';  // Never do this!
```

### Input Validation

```typescript
// Always validate user inputs
function validatePrayerName(name: string): boolean {
  if (!name || name.trim().length === 0) {
    throw new Error('Prayer name cannot be empty');
  }
  if (name.length > 100) {
    throw new Error('Prayer name too long');
  }
  return true;
}
```

### Error Handling

```typescript
// Don't expose sensitive information
try {
  await apiCall();
} catch (error) {
  // ✅ Safe: Generic error message
  vscode.window.showErrorMessage('Failed to connect to AI provider');
  
  // ❌ Unsafe: Exposing API keys or internal details
  vscode.window.showErrorMessage(error.message);
}
```

---

## 💬 **Getting Help**

### Documentation

- **README.md** - Feature overview and usage
- **API.md** - Technical API reference
- **TROUBLESHOOTING.md** - Common issues and solutions

### Communication Channels

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - General questions and ideas
- **Discord Server** - Real-time community chat
- **Email** - Direct contact with maintainers

### Code Reviews

- **Be respectful** and constructive
- **Focus on code**, not the person
- **Suggest improvements** with examples
- **Learn from feedback** - it makes us all better

---

## 🏆 **Recognition**

### Contributor Levels

- **Community Member** - Anyone who participates
- **Contributor** - Merged PRs or significant issues
- **Maintainer** - Regular contributor with commit access
- **Core Team** - Project leadership and vision

### Hall of Fame

Outstanding contributors are recognized in:

- **README.md** acknowledgments section
- **CONTRIBUTORS.md** detailed list
- **GitHub profile** contributor badge
- **Discord** special role and channel access

---

## 📋 **Checklist for New Contributors**

- [ ] ⭐ Star the repository
- [ ] 🍴 Fork the repository
- [ ] 📖 Read this contributing guide completely
- [ ] 🛠️ Set up development environment
- [ ] 🧪 Run tests to ensure everything works
- [ ] 🎯 Find a "good first issue" to work on
- [ ] 💬 Join our Discord community
- [ ] 📝 Make your first contribution!

---

**Thank you for contributing to Wija Studio! Together, we're building the future of AI-powered development tools.** 🔮✨

*May your code be bug-free and your commits be meaningful!* 🙏
