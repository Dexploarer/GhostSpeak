# Development Environment Setup

This guide provides complete instructions for setting up a production-ready development environment for GhostSpeak. Follow these steps for optimal development experience.

## System Requirements

### Hardware Requirements
- **CPU**: 4+ cores (8+ cores recommended)
- **RAM**: 8GB minimum (16GB+ recommended)
- **Storage**: 20GB free space (SSD recommended)
- **Network**: Stable internet connection for RPC calls

### Operating System Support
- ✅ **Linux** (Ubuntu 20.04+, Debian 11+, Arch Linux)
- ✅ **macOS** (10.15 Catalina or later)
- ✅ **Windows** (Windows 10/11 with WSL2)

> **Windows Users**: WSL2 is strongly recommended for the best development experience.

## Prerequisites Installation

### 1. Core Tools

#### Node.js (18+ Required)
```bash
# Using Node Version Manager (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
nvm alias default 18

# Verify installation
node --version  # Should be v18.x.x or higher
npm --version
```

#### Bun (Recommended Package Manager)
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Verify installation
bun --version
```

#### Rust (1.79.0+ Required)
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Install required components
rustup component add rustfmt clippy

# Verify installation
rustc --version  # Should be 1.79.0 or higher
cargo --version
```

#### Git
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install git

# macOS
xcode-select --install

# Verify
git --version
```

### 2. Solana Development Tools

#### Solana CLI
```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.18.22/install)"

# Add to PATH
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Verify installation
solana --version  # Should be 1.18.22 or higher
```

#### Anchor Framework
```bash
# Install AVM (Anchor Version Manager)
cargo install --git https://github.com/coral-xyz/anchor avm --force

# Install and use Anchor 0.31.1
avm install 0.31.1
avm use 0.31.1

# Verify installation
anchor --version  # Should be 0.31.1
```

### 3. Development Tools

#### VS Code (Recommended)
```bash
# Download from https://code.visualstudio.com/
# Or via package manager:

# Ubuntu/Debian
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
sudo install -o root -g root -m 644 packages.microsoft.gpg /etc/apt/trusted.gpg.d/
sudo sh -c 'echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/trusted.gpg.d/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" > /etc/apt/sources.list.d/vscode.list'
sudo apt update && sudo apt install code

# macOS
brew install --cask visual-studio-code
```

#### Required VS Code Extensions
```bash
# Install via command line
code --install-extension rust-lang.rust-analyzer
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-vscode.vscode-json
code --install-extension redhat.vscode-yaml
code --install-extension ms-vscode.hexeditor
```

## Project Setup

### 1. Clone GhostSpeak

```bash
# Clone the repository
git clone https://github.com/Prompt-or-Die/ghostspeak.git
cd ghostspeak

# Verify project structure
ls -la
```

### 2. Install Dependencies

```bash
# Install all dependencies using Bun (recommended)
bun install

# Alternative: Install with npm
npm install

# Install Rust dependencies
cargo build --workspace
```

### 3. Environment Configuration

#### Create Environment File
```bash
# Copy example environment file
cp .env.example .env

# Edit with your preferred editor
nano .env
```

#### Environment Variables
```env
# Solana Configuration
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_COMMITMENT=confirmed

# Program Configuration  
PROGRAM_ID=HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps

# Development Settings
LOG_LEVEL=debug
NODE_ENV=development

# Optional: Custom RPC endpoints
# SOLANA_RPC_URL=https://your-custom-rpc.com
# SOLANA_WEBSOCKET_URL=wss://your-custom-ws.com

# Optional: IPFS Configuration
IPFS_GATEWAY=https://ipfs.io/ipfs/
IPFS_API_URL=https://api.pinata.cloud

# Optional: Analytics
ANALYTICS_ENABLED=true
METRICS_ENDPOINT=http://localhost:3001/metrics
```

### 4. Wallet Setup

#### Create Development Wallet
```bash
# Create a new keypair for development
solana-keygen new --outfile ~/.config/solana/devnet-wallet.json --no-bip39-passphrase

# Set as default
solana config set --keypair ~/.config/solana/devnet-wallet.json

# Configure for devnet
solana config set --url devnet

# Verify configuration
solana config get
```

#### Fund Development Wallet
```bash
# Get SOL for testing (devnet only)
solana airdrop 5

# Check balance
solana balance

# Get wallet address
solana address
```

### 5. Build and Test

#### Build Smart Contract
```bash
# Build the smart contract
anchor build

# Deploy to devnet
anchor deploy --network devnet

# Verify deployment
anchor test --skip-deploy
```

#### Build SDKs
```bash
# Build TypeScript SDK
cd packages/sdk-typescript
bun run build
cd ../..

# Build Rust SDK  
cargo build --package sdk-rust

# Run all tests
bun test
cargo test --workspace
```

## Development Workflow

### 1. Daily Development Setup

```bash
# Start development session
cd ghostspeak

# Pull latest changes
git pull origin main

# Update dependencies
bun install
cargo update

# Start development services
bun run dev
```

### 2. Testing Workflow

```bash
# Run all tests
bun run test:all

# Run specific test suites
bun test packages/sdk-typescript
cargo test --package core
anchor test

# Run with coverage
bun run test:coverage
```

### 3. Code Quality

```bash
# Format code
bun run format
cargo fmt --all

# Lint code
bun run lint
cargo clippy --all-targets --all-features

# Type checking
bun run type-check
```

## IDE Configuration

### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "rust-analyzer.cargo.features": "all",
  "rust-analyzer.checkOnSave.command": "clippy",
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "files.associations": {
    "*.toml": "toml",
    "Anchor.toml": "toml"
  },
  "solana.defaultCluster": "devnet"
}
```

### Recommended Extensions List

Create `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "rust-lang.rust-analyzer",
    "ms-vscode.vscode-typescript-next", 
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "ms-vscode.hexeditor",
    "serum-foundation.anchor",
    "solana-labs.solana-developer-tools"
  ]
}
```

## Advanced Configuration

### 1. Custom RPC Configuration

For better performance, consider using a custom RPC provider:

```bash
# Example with QuickNode
export SOLANA_RPC_URL="https://your-quicknode-endpoint.solana-devnet.quiknode.pro/your-key/"

# Example with Alchemy  
export SOLANA_RPC_URL="https://solana-devnet.g.alchemy.com/v2/your-api-key"

# Update Solana CLI
solana config set --url $SOLANA_RPC_URL
```

### 2. Performance Optimization

#### Rust Compilation
```bash
# Add to ~/.cargo/config.toml
mkdir -p ~/.cargo
cat >> ~/.cargo/config.toml << 'EOF'
[build]
rustflags = ["-C", "link-arg=-fuse-ld=lld"]

[target.x86_64-unknown-linux-gnu]
linker = "clang"
rustflags = ["-C", "link-arg=-fuse-ld=lld"]
EOF
```

#### Node.js Optimization
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=8192"

# Add to ~/.bashrc
echo 'export NODE_OPTIONS="--max-old-space-size=8192"' >> ~/.bashrc
```

### 3. Development Scripts

Create useful development scripts in `scripts/dev-setup.sh`:

```bash
#!/bin/bash
# Development environment setup script

echo "🚀 Setting up GhostSpeak development environment..."

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required"; exit 1; }
command -v rust >/dev/null 2>&1 || { echo "❌ Rust is required"; exit 1; }
command -v solana >/dev/null 2>&1 || { echo "❌ Solana CLI is required"; exit 1; }

# Install dependencies
echo "📦 Installing dependencies..."
bun install
cargo build --workspace

# Setup environment
if [ ! -f .env ]; then
    cp .env.example .env
    echo "📝 Created .env file - please configure it"
fi

# Check wallet
if [ ! -f ~/.config/solana/id.json ]; then
    echo "💳 Creating development wallet..."
    solana-keygen new --outfile ~/.config/solana/id.json --no-bip39-passphrase
fi

# Fund wallet if on devnet
NETWORK=$(solana config get | grep "RPC URL" | awk '{print $3}')
if [[ $NETWORK == *"devnet"* ]]; then
    echo "💰 Funding devnet wallet..."
    solana airdrop 2 || echo "⚠️ Airdrop failed - may have rate limits"
fi

echo "✅ Development environment ready!"
echo "💡 Run 'bun run dev' to start development"
```

Make it executable:
```bash
chmod +x scripts/dev-setup.sh
./scripts/dev-setup.sh
```

## Troubleshooting

### Common Issues

#### Solana CLI Issues
```bash
# Update Solana CLI
solana-install update

# Reset configuration
rm -rf ~/.config/solana
solana-keygen new --outfile ~/.config/solana/id.json

# Check cluster connectivity
solana cluster-version
```

#### Anchor Build Issues
```bash
# Clean build artifacts
anchor clean
rm -rf target/

# Rebuild from scratch
anchor build

# Check Anchor version
avm list
avm use 0.31.1
```

#### Node.js/Bun Issues
```bash
# Clear package manager cache
bun pm cache rm
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json bun.lockb
bun install
```

#### Rust Compilation Issues
```bash
# Update Rust toolchain
rustup update

# Clean Rust cache
cargo clean
rm -rf ~/.cargo/registry/cache

# Rebuild
cargo build --workspace
```

### Performance Issues

#### Slow RPC Responses
- Use a dedicated RPC provider (QuickNode, Alchemy, etc.)
- Configure connection pooling
- Use local validator for development

#### Memory Issues
- Increase Node.js memory limit
- Use `--release` builds for Rust
- Close unnecessary applications

#### Build Speed Optimization
- Use `sccache` for Rust compilation caching
- Enable Bun's fast builds
- Use incremental compilation

## Development Best Practices

### 1. Git Workflow
```bash
# Create feature branch
git checkout -b feature/new-agent-capability

# Commit with conventional commits
git commit -m "feat(agents): add multi-language support"

# Push and create PR
git push origin feature/new-agent-capability
```

### 2. Testing Strategy
- Write tests before implementing features
- Test on devnet before mainnet
- Use property-based testing for critical functions
- Maintain high test coverage (>90% for smart contracts)

### 3. Security Practices
- Never commit private keys
- Use environment variables for sensitive data
- Regular dependency updates
- Code reviews for all changes

### 4. Documentation
- Update documentation with code changes
- Include examples in docstrings
- Maintain up-to-date README files
- Document breaking changes

## Next Steps

Once your development environment is set up:

1. **Complete the Tutorial**: Try the [5-minute quick start](./quick-start.md)
2. **Build Your First Agent**: Follow the [first agent guide](../guides/first-agent.md)
3. **Explore the Architecture**: Read the [architecture documentation](../core-concepts/architecture.md)
4. **Review Best Practices**: Check [development guidelines](../development/code-standards.md)

## Getting Help

- 📖 **Documentation**: Browse our [complete docs](../README.md)
- 🐛 **Issues**: Report problems on [GitHub](https://github.com/Prompt-or-Die/ghostspeak/issues)
- 💬 **Community**: Join our [Discord](../resources/community.md)
- 📧 **Support**: See [support resources](../resources/README.md)

---

**Environment ready?** Time to [build your first agent](../guides/first-agent.md)! 🚀 