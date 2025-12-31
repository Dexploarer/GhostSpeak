# Contributing to GhostSpeak CLI

Thank you for your interest in contributing to the GhostSpeak CLI! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the problem
- **Expected vs actual behavior**
- **System information** (OS, Go version, CLI version)
- **Log output** if available (use `--debug` flag)

**Example Bug Report:**
```markdown
**Title:** Wallet creation fails on Windows

**Description:**
When running `ghost wallet create`, the CLI crashes with an error.

**Steps to Reproduce:**
1. Run `ghost wallet create my-wallet`
2. Enter password when prompted
3. CLI crashes

**Expected:** Wallet should be created successfully
**Actual:** CLI crashes with error: "failed to create wallet directory"

**System:**
- OS: Windows 11
- Go version: 1.21.5
- CLI version: 1.0.0

**Logs:**
```
[ERROR] Failed to create wallet directory: mkdir C:\Users\...: Access denied
```
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide detailed description** of the proposed functionality
- **Explain why this enhancement would be useful**
- **List examples** of how it would be used

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes** following our coding standards
4. **Write or update tests** for your changes
5. **Run tests** and ensure they pass:
   ```bash
   go test ./...
   ```
6. **Run the linter**:
   ```bash
   golangci-lint run
   ```
7. **Commit your changes** using conventional commits:
   ```bash
   git commit -m 'feat: add amazing feature'
   ```
8. **Push to your fork**:
   ```bash
   git push origin feature/amazing-feature
   ```
9. **Open a Pull Request**

## Development Setup

### Prerequisites

- Go 1.21 or higher
- Git
- Make (optional, for using Makefile)
- golangci-lint (for linting)

### Getting Started

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/cli-go.git
cd cli-go

# Add upstream remote
git remote add upstream https://github.com/ghostspeak/cli-go.git

# Install dependencies
go mod download

# Build the project
go build -o ghost

# Run tests
go test ./...

# Run linter
golangci-lint run
```

## Coding Standards

### Go Style Guide

- Follow [Effective Go](https://golang.org/doc/effective_go.html)
- Use `gofmt` for code formatting
- Follow [Go Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments)

### Project-Specific Standards

#### 1. Package Structure

```go
// Good
package domain

// Comment explaining the type
type Agent struct {
    ID string `json:"id"`
}

// Bad
package domain
type agent struct { // Should be exported
    id string // Should be exported if part of public API
}
```

#### 2. Error Handling

```go
// Good
if err != nil {
    return fmt.Errorf("failed to create agent: %w", err)
}

// Bad
if err != nil {
    return err // No context
}
```

#### 3. Comments

```go
// Good
// GetAgent retrieves an agent by ID from the blockchain.
// Returns ErrAgentNotFound if the agent doesn't exist.
func (s *AgentService) GetAgent(id string) (*domain.Agent, error) {
    // ...
}

// Bad
// get agent
func (s *AgentService) GetAgent(id string) (*domain.Agent, error) {
    // ...
}
```

#### 4. Testing

```go
// Good
func TestAgentService_GetAgent(t *testing.T) {
    tests := []struct {
        name    string
        agentID string
        want    *domain.Agent
        wantErr error
    }{
        {
            name:    "existing agent",
            agentID: "test-id",
            want:    &domain.Agent{ID: "test-id"},
            wantErr: nil,
        },
        {
            name:    "non-existent agent",
            agentID: "invalid",
            want:    nil,
            wantErr: domain.ErrAgentNotFound,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Test implementation
        })
    }
}
```

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(agent): add search functionality with filters

- Implement fuzzy search
- Add type and score filters
- Add pagination support

Closes #123
```

```
fix(wallet): resolve encryption issue on Windows

The wallet encryption was failing on Windows due to path separator issues.
Fixed by using filepath.Join instead of manual path construction.

Fixes #456
```

## Project Structure

```
cli-go/
├── cmd/                    # CLI commands
│   ├── root.go            # Root command
│   ├── agent.go           # Agent commands
│   └── ...
├── internal/
│   ├── app/               # Application container
│   ├── config/            # Configuration
│   ├── domain/            # Domain models
│   ├── services/          # Business logic
│   └── storage/           # Data storage
├── pkg/
│   └── solana/            # Solana client
├── ui/                    # TUI components
├── main.go                # Entry point
└── ...
```

### Adding a New Command

1. Create command file in `cmd/`:
```go
// cmd/mycommand.go
package cmd

import (
    "github.com/spf13/cobra"
)

var myCmd = &cobra.Command{
    Use:   "mycommand",
    Short: "Brief description",
    Long:  `Detailed description`,
    RunE:  runMyCommand,
}

func init() {
    rootCmd.AddCommand(myCmd)
}

func runMyCommand(cmd *cobra.Command, args []string) error {
    // Implementation
    return nil
}
```

2. Add domain models in `internal/domain/` if needed
3. Add service methods in `internal/services/` if needed
4. Add tests in `*_test.go` files
5. Update documentation

### Adding a New Service

1. Create service file in `internal/services/`:
```go
// internal/services/myservice.go
package services

import (
    "github.com/ghostspeak/cli-go/internal/config"
    "github.com/ghostspeak/cli-go/internal/domain"
)

type MyService struct {
    config *config.Config
    // dependencies
}

func NewMyService(cfg *config.Config) *MyService {
    return &MyService{
        config: cfg,
    }
}

func (s *MyService) DoSomething() error {
    // Implementation
    return nil
}
```

2. Add to App container in `internal/app/app.go`
3. Write tests in `myservice_test.go`

## Testing Guidelines

### Unit Tests

- Test all exported functions
- Use table-driven tests when appropriate
- Mock external dependencies
- Aim for >80% code coverage

```bash
# Run tests
go test ./...

# Run tests with coverage
go test -cover ./...

# Generate coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

### Integration Tests

For tests that require external services:

```go
// +build integration

package services_test

func TestAgentService_Integration(t *testing.T) {
    if testing.Short() {
        t.Skip("skipping integration test")
    }
    // Test implementation
}
```

Run integration tests:
```bash
go test -tags=integration ./...
```

## Documentation

### Code Documentation

- Add godoc comments for all exported types and functions
- Include examples in godoc when helpful
- Keep comments up-to-date with code changes

### User Documentation

- Update README.md for new features
- Add examples to relevant sections
- Update CHANGELOG.md

## Review Process

1. **Automated Checks**: All PRs must pass:
   - Tests (`go test ./...`)
   - Linter (`golangci-lint run`)
   - Build (`go build`)

2. **Code Review**: At least one maintainer must approve

3. **Documentation**: Ensure docs are updated

4. **Testing**: Verify changes work as expected

## Release Process

Releases are managed by maintainers:

1. Update version in `cmd/root.go`
2. Update CHANGELOG.md
3. Create git tag: `git tag v1.x.x`
4. Push tag: `git push origin v1.x.x`
5. GitHub Actions will build and release binaries

## Questions?

- 💬 Join our [Discord](https://discord.gg/ghostspeak)
- 📧 Email: dev@ghostspeak.ai
- 🐛 Open an [issue](https://github.com/ghostspeak/cli-go/issues)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to GhostSpeak! 👻
