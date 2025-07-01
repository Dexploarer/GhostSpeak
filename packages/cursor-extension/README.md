# 🔮 Wija Studio - Cursor/VS Code Extension

**Complete development environment for the Wija Agent Commerce Protocol**

## Overview

Wija Studio is a VS Code extension that provides comprehensive development tools for the Wija Agent Commerce Protocol. It integrates deeply with the existing Wija monorepo and CLI to provide a seamless development experience.

## Key Features

### 🔍 **Intelligent Project Detection**
- Automatically detects Wija projects and configurations
- Integrates with the existing adaptive CLI context detection
- Supports Anchor programs, TypeScript SDK, and Rust SDK projects

### 🤖 **Agent Development**
- Visual agent registration and deployment
- Channel creation and management
- Real-time agent testing and simulation
- Integration with the agent marketplace

### 🌐 **Blockchain Integration**
- Live network status monitoring
- Transaction simulation and debugging
- Multi-network support (devnet, testnet, mainnet)
- Wallet integration and management

### 🎨 **Visual Tools**
- Interactive dashboard for project management
- Embedded marketplace browser
- Real-time performance analytics
- Transaction explorer and debugging tools

## Architecture

The extension is designed as part of the Wija monorepo with the following structure:

```
packages/cursor-extension/
├── src/
│   ├── extension.ts              # Main entry point
│   ├── utils/
│   │   └── project-detector.ts   # Project context detection
│   ├── providers/                # UI providers
│   ├── commands/                 # Command handlers
│   ├── language-server/          # LSP integration
│   └── ui/                       # UI components
├── package.json                  # Extension manifest
└── README.md                     # This file
```

## Integration with Wija Ecosystem

### CLI Integration
- Leverages existing `wija` CLI commands
- Shares configuration and context detection
- Provides visual interface for CLI operations

### SDK Integration
- Direct integration with TypeScript and Rust SDKs
- Shared type definitions and utilities
- Unified development experience

### Smart Contract Integration
- Works with existing Anchor programs
- Provides debugging and testing tools
- Visual IDL code generation

## Installation

### Prerequisites
- VS Code 1.74.0+
- Node.js 16+ and Bun
- Solana CLI and Anchor CLI
- Wija CLI (from this monorepo)

### Development Setup
```bash
cd packages/cursor-extension
bun install
bun run compile
```

### Install from VSIX
```bash
bun run package
code --install-extension wija-studio-1.0.0.vsix
```

## Usage

### Project Detection
The extension automatically activates when you open:
- The Wija monorepo
- Projects with Wija configuration (`.wija` files)
- Anchor programs with Wija-related code
- TypeScript/Rust projects with Wija dependencies

### Main Features
1. **Wija Panel**: Access agents, channels, marketplace, and network status
2. **Dashboard**: Visual project overview and management
3. **Commands**: Use Command Palette for Wija operations
4. **Context Menus**: Right-click actions for common tasks

### Key Commands
- `wija.initialize`: Initialize new Wija project
- `wija.openDashboard`: Open interactive dashboard
- `wija.deployAgent`: Deploy agent to blockchain
- `wija.createChannel`: Create communication channel
- `wija.openMarketplace`: Browse agent marketplace
- `wija.generateSDKCode`: Generate SDK code from IDL

## Configuration

The extension uses VS Code settings with the `wija` prefix:

```json
{
  "wija.network.defaultCluster": "devnet",
  "wija.development.autoSave": true,
  "wija.debugging.enableTransactionTracing": true,
  "wija.marketplace.enableBrowsing": true,
  "wija.wallet.preferredProvider": "phantom"
}
```

## Development

### Contributing
1. Clone the monorepo
2. Navigate to `packages/cursor-extension`
3. Run `bun install` and `bun run watch`
4. Press F5 in VS Code to launch Extension Development Host

### Testing
```bash
bun run test          # Unit tests
bun run test:extension # Extension tests
```

## Integration Points

### Monorepo Integration
- **Part of Workspace**: Included in the main Wija monorepo
- **Shared Dependencies**: Uses common types and utilities
- **Build Integration**: Integrated with monorepo build system

### CLI Integration
- **Context Detection**: Uses the adaptive CLI's context system
- **Command Execution**: Wraps CLI commands with visual feedback
- **Configuration**: Shares CLI configuration and network settings

### SDK Integration
- **TypeScript SDK**: Direct imports and usage
- **Rust SDK**: Integration for performance-critical operations
- **Type Safety**: Shared interfaces and type definitions

## Why Monorepo?

The extension is part of the monorepo because:

1. **Shared Code**: Reuses types, utilities, and configuration
2. **Consistent APIs**: Maintains consistency with CLI and SDKs
3. **Unified Development**: Single repository for all tooling
4. **Easy Testing**: Can test against real local implementations
5. **Version Synchronization**: All components stay in sync

## Future Enhancements

- Advanced debugging capabilities
- AI-powered code suggestions
- Enhanced marketplace features
- Multi-chain support
- Performance optimization tools

## License

MIT License - Part of the Wija project.

---

**🔮 "Transform your editor into a mystical portal for AI agent development"** 