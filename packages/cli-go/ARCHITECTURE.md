# Architecture Documentation

This document describes the architecture and design decisions of the GhostSpeak CLI.

## Table of Contents

- [Overview](#overview)
- [Design Principles](#design-principles)
- [Architecture Patterns](#architecture-patterns)
- [Project Structure](#project-structure)
- [Component Descriptions](#component-descriptions)
- [Data Flow](#data-flow)
- [Security Architecture](#security-architecture)
- [Performance Considerations](#performance-considerations)

## Overview

The GhostSpeak CLI is built using **Clean Architecture** principles with a focus on:
- **Separation of Concerns** - Domain, services, and presentation layers are isolated
- **Dependency Injection** - Services are injected via the App container
- **Testability** - Each layer can be tested independently
- **Maintainability** - Clear boundaries and responsibilities

### Technology Stack

- **Language**: Go 1.21+
- **CLI Framework**: Cobra
- **TUI Framework**: Bubbletea
- **Styling**: Lipgloss
- **Storage**: BadgerDB (embedded key-value store)
- **Configuration**: Viper
- **Blockchain**: Solana (via custom client)

## Design Principles

### 1. Clean Architecture

```
┌─────────────────────────────────────┐
│         Presentation Layer          │
│    (cmd/ - Cobra Commands)          │
│    (ui/ - Bubbletea TUI)            │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         Application Layer           │
│    (internal/app - Container)       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│          Service Layer              │
│    (internal/services)              │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│          Domain Layer               │
│    (internal/domain)                │
└─────────────────────────────────────┘
```

### 2. Dependency Rule

Dependencies point inward:
- **Presentation** depends on **Application**
- **Application** depends on **Services**
- **Services** depend on **Domain**
- **Domain** depends on nothing (pure business logic)

### 3. Interface Segregation

Each service exposes a focused interface:
```go
type AgentService interface {
    Register(params RegisterParams) (*Agent, error)
    GetAgent(id string) (*Agent, error)
    ListAgents(owner string) ([]Agent, error)
}
```

## Architecture Patterns

### 1. Repository Pattern

Storage is abstracted through interfaces:

```go
type Repository interface {
    Get(key string, value interface{}) error
    Set(key string, value interface{}) error
    Delete(key string) error
}

// Implementation
type BadgerDB struct {
    db *badger.DB
}
```

**Benefits:**
- Easy to swap storage backends
- Testable with mocks
- Clear data access patterns

### 2. Service Pattern

Business logic is encapsulated in services:

```go
type WalletService struct {
    config  *config.Config
    client  *solana.Client
    storage *storage.BadgerDB
}

func (s *WalletService) CreateWallet(name, password string) (*Wallet, error) {
    // Business logic here
}
```

**Benefits:**
- Single Responsibility Principle
- Reusable across commands and TUI
- Easy to test with mocks

### 3. Command Pattern

CLI commands are structured using Cobra:

```go
var agentCmd = &cobra.Command{
    Use:   "agent",
    Short: "Manage AI agents",
    RunE:  runAgent,
}

func runAgent(cmd *cobra.Command, args []string) error {
    // Use services via app container
    agent, err := application.AgentService.GetAgent(id)
    // ...
}
```

**Benefits:**
- Self-documenting CLI structure
- Consistent flag handling
- Built-in help generation

### 4. Model-View-Update (MVU)

TUI components use the Elm Architecture:

```go
type DashboardModel struct {
    state State
    data  DashboardData
}

func (m *DashboardModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    // Handle messages, update state
}

func (m *DashboardModel) View() string {
    // Render UI
}
```

**Benefits:**
- Predictable state management
- Easy to reason about
- Testable rendering logic

## Project Structure

```
cli-go/
├── cmd/                          # Command layer (Cobra)
│   ├── root.go                   # Root command, global flags
│   ├── agent.go                  # Agent commands
│   ├── wallet.go                 # Wallet commands
│   ├── did.go                    # DID commands
│   ├── credential.go             # Credential commands
│   ├── reputation.go             # Reputation commands
│   ├── staking.go                # Staking commands
│   ├── governance.go             # Governance commands
│   ├── escrow.go                 # Escrow commands
│   └── ...
│
├── internal/                     # Private application code
│   ├── app/                      # Application container
│   │   └── app.go                # Dependency injection
│   │
│   ├── config/                   # Configuration management
│   │   ├── config.go             # Config struct
│   │   ├── loader.go             # Load/save config
│   │   └── logger.go             # Logging setup
│   │
│   ├── domain/                   # Domain models (pure)
│   │   ├── agent.go              # Agent domain
│   │   ├── did.go                # DID domain
│   │   ├── credential.go         # Credential domain
│   │   ├── reputation.go         # Reputation domain
│   │   ├── staking.go            # Staking domain
│   │   ├── governance.go         # Governance domain
│   │   ├── escrow.go             # Escrow domain
│   │   ├── tokens.go             # Token configuration
│   │   └── errors.go             # Domain errors
│   │
│   ├── services/                 # Business logic
│   │   ├── agent.go              # Agent operations
│   │   ├── wallet.go             # Wallet operations
│   │   ├── did.go                # DID operations
│   │   ├── credential.go         # Credential operations
│   │   ├── reputation.go         # Reputation calculations
│   │   ├── staking.go            # Staking logic
│   │   ├── governance.go         # Governance logic
│   │   ├── escrow.go             # Escrow logic
│   │   ├── ipfs.go               # IPFS integration
│   │   ├── crossmint.go          # Crossmint integration
│   │   └── faucet.go             # Faucet API client
│   │
│   └── storage/                  # Data persistence
│       └── badgerdb.go           # BadgerDB implementation
│
├── pkg/                          # Public packages
│   └── solana/                   # Solana blockchain client
│       ├── client.go             # Solana RPC client
│       ├── transaction.go        # Transaction building
│       └── types.go              # Solana types
│
├── ui/                           # Terminal UI (Bubbletea)
│   ├── model.go                  # Main model & navigation
│   ├── styles.go                 # GhostSpeak styling
│   ├── splash.go                 # ASCII art & branding
│   ├── dashboard.go              # Dashboard view
│   ├── agent_list.go             # Agent list view
│   ├── agent_form.go             # Agent registration form
│   ├── did_manager.go            # DID manager view
│   ├── credential_viewer.go      # Credential viewer
│   ├── ghost_score.go            # Ghost Score dashboard
│   ├── staking_panel.go          # Staking panel
│   ├── governance.go             # Governance view
│   └── escrow.go                 # Escrow manager
│
├── main.go                       # Entry point
├── go.mod                        # Go modules
└── go.sum                        # Dependency checksums
```

## Component Descriptions

### Application Container (`internal/app/app.go`)

Central dependency injection container:

```go
type App struct {
    Config            *config.Config
    Client            *solana.Client
    SolanaClient      *solana.Client
    Storage           *storage.BadgerDB
    WalletService     *services.WalletService
    IPFSService       *services.IPFSService
    AgentService      *services.AgentService
    DIDService        *services.DIDService
    CredentialService *services.CredentialService
    ReputationService *services.ReputationService
    EscrowService     *services.EscrowService
    GovernanceService *services.GovernanceService
    StakingService    *services.StakingService
}
```

**Responsibilities:**
- Initialize all services
- Manage service lifecycle
- Provide centralized access to services

### Domain Models (`internal/domain/`)

Pure business logic with no dependencies:

```go
// Agent domain model
type Agent struct {
    ID              string
    Owner           string
    Name            string
    AgentType       AgentType
    MetadataURI     string
    Status          AgentStatus
    TotalJobs       uint64
    CompletedJobs   uint64
    AverageRating   float64
    // ...
}

// Business logic methods
func (a *Agent) CalculateSuccessRate() float64 {
    if a.TotalJobs == 0 {
        return 0.0
    }
    return float64(a.CompletedJobs) / float64(a.TotalJobs) * 100
}
```

**Characteristics:**
- No external dependencies
- Pure functions
- Validation logic
- Business rules

### Services (`internal/services/`)

Orchestrate domain objects and external dependencies:

```go
type AgentService struct {
    config        *config.Config
    solanaClient  *solana.Client
    walletService *WalletService
    ipfsService   *IPFSService
    storage       *storage.BadgerDB
}

func (s *AgentService) RegisterAgent(params domain.RegisterAgentParams) (*domain.Agent, error) {
    // 1. Validate params
    if err := domain.ValidateRegisterParams(params); err != nil {
        return nil, err
    }

    // 2. Upload metadata to IPFS
    metadataURI, err := s.ipfsService.UploadJSON(metadata)

    // 3. Create on-chain account
    signature, err := s.solanaClient.CreateAgent(...)

    // 4. Cache locally
    s.storage.SetJSON(cacheKey, agent)

    // 5. Return agent
    return agent, nil
}
```

**Responsibilities:**
- Coordinate domain objects
- Integrate external services
- Handle caching
- Transaction management

### Storage Layer (`internal/storage/`)

Abstracted persistence:

```go
type BadgerDB struct {
    db *badger.DB
}

func (b *BadgerDB) GetJSON(key string, value interface{}) error {
    // Read from BadgerDB
    // Unmarshal JSON
}

func (b *BadgerDB) SetJSONWithTTL(key string, value interface{}, ttl time.Duration) error {
    // Marshal JSON
    // Write to BadgerDB with TTL
}
```

**Features:**
- 5-minute TTL for cache entries
- JSON serialization
- Namespace support
- Batch operations

## Data Flow

### Command Execution Flow

```
User Input → Cobra Command → App Container → Service → Domain → Storage/Blockchain
                                  ↓
                            Response Flow
                                  ↓
User Output ← Formatted Display ← Service Response ← Domain Logic
```

### Example: Agent Registration

1. **User runs**: `ghost agent register --name "MyAgent"`
2. **Cobra** parses flags and calls `runAgentRegister()`
3. **Command** accesses `application.AgentService`
4. **Service** validates params via domain
5. **Service** uploads metadata to IPFS
6. **Service** creates on-chain account via Solana client
7. **Service** caches result in BadgerDB
8. **Command** formats and displays success message

### Caching Strategy

- **5-minute TTL** for most data
- **Cache-aside pattern**: Check cache → If miss, fetch → Store in cache
- **Invalidation**: Manual invalidation on mutations

```go
// Cache read
cacheKey := "agent:" + id
if err := s.storage.GetJSON(cacheKey, &agent); err == nil {
    return agent, nil // Cache hit
}

// Fetch from blockchain
agent, err := s.solanaClient.GetAgent(id)

// Store in cache
s.storage.SetJSONWithTTL(cacheKey, agent, 5*time.Minute)
```

## Security Architecture

### Wallet Encryption

1. **Key Derivation**: scrypt (N=32768, r=8, p=1)
2. **Encryption**: AES-256-GCM
3. **Storage**: Encrypted JSON files in `~/.ghostspeak/wallets/`

```go
// Encrypt private key
salt := randomBytes(32)
key := scrypt.Key(password, salt, 32768, 8, 1, 32)
ciphertext := aes-gcm.Encrypt(key, privateKey)
```

### Secrets Management

- Passwords never logged
- Private keys never stored in plaintext
- Sensitive data cleared from memory after use

### Network Security

- HTTPS for all external API calls
- RPC endpoint verification
- Transaction signing done locally

## Performance Considerations

### 1. Caching

- **Local cache** (BadgerDB) reduces blockchain queries
- **5-minute TTL** balances freshness vs performance
- **Batch operations** minimize round-trips

### 2. Concurrency

- **Goroutines** for parallel operations
- **Mutex locks** for shared state
- **Context cancellation** for timeouts

### 3. Binary Size

- **Compiled binary**: ~29MB
- **Statically linked**: No runtime dependencies
- **Stripped**: Debug symbols removed in release builds

### 4. Startup Time

- **Lazy initialization**: Services created on-demand
- **Config caching**: Avoid repeated file reads
- **Connection pooling**: Reuse HTTP connections

## Testing Strategy

### Unit Tests

```go
func TestAgentService_GetAgent(t *testing.T) {
    // Mock dependencies
    mockClient := &mockSolanaClient{}
    mockStorage := &mockStorage{}

    service := NewAgentService(cfg, mockClient, mockStorage)

    // Test
    agent, err := service.GetAgent("test-id")

    // Assertions
    assert.NoError(t, err)
    assert.Equal(t, "test-id", agent.ID)
}
```

### Integration Tests

```go
// +build integration

func TestAgentService_Integration(t *testing.T) {
    // Use real dependencies
    client := solana.NewClient(cfg)
    storage, _ := storage.NewBadgerDB(cfg)

    service := NewAgentService(cfg, client, storage)

    // Test actual blockchain interaction
}
```

## Future Enhancements

### Planned Architecture Improvements

1. **Event System**: Implement event bus for cross-component communication
2. **Plugin System**: Allow third-party plugins
3. **GraphQL Client**: Add GraphQL support alongside RPC
4. **Metrics**: Add Prometheus metrics for observability
5. **Distributed Caching**: Replace BadgerDB with Redis for multi-instance support

### Scalability Considerations

- **Horizontal scaling**: Support multiple CLI instances
- **Rate limiting**: Built-in rate limiting for API calls
- **Connection pooling**: Advanced connection management
- **Stream processing**: Handle large data sets efficiently

---

**Last Updated**: 2024-12-31
**Version**: 1.0.0
