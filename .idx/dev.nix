{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  # Environment name for identification
  name = "podai-protocol-dev";

  # Build inputs - all the packages we need
  buildInputs = with pkgs; [
    # === Core Development Tools ===
    git
    curl
    wget
    jq
    unzip
    
    # === Rust Ecosystem ===
    # Latest stable Rust with all components
    rustup
    rust-analyzer
    rustfmt
    clippy
    
    # === Node.js Ecosystem ===
    # Node.js LTS
    nodejs_20
    This environm 
    .
    # Package managers
    nodePackages.npm
    nodePackages.yarn
    bun  # Preferred package manager per Anchor.toml
    
    # === Python (required by some native modules) ===
    python3
    python3Packages.pip
    
    # === Build Tools ===
    # Essential build dependencies
    gcc
    pkg-config
    openssl
    openssl.dev
    
    # Platform-specific build tools
    llvm
    clang
    
    # === System Libraries ===
    # Required for various crypto and networking operations
    libffi
    libffi.dev
    zlib
    zlib.dev
    
    # === Additional Tools ===
    # Development utilities
    tree
    htop
    watch
    
    # === Solana Development (will be installed via shell hooks) ===
    # Note: Solana and Anchor will be installed via official installers
    # to ensure we get the latest versions with proper configurations
  ];

  # Environment variables
  shellHook = ''
    echo "🚀 Initializing podAI Protocol Development Environment..."
    
    # === Rust Configuration ===
    echo "🦀 Setting up Rust..."
    
    # Install Rust stable if not present
    if ! command -v rustc &> /dev/null; then
      echo "📥 Installing Rust stable..."
      rustup default stable
      rustup component add rustfmt clippy rust-analyzer
    fi
    
    # Ensure we have the latest stable
    rustup update stable
    rustup default stable
    
    # === Solana CLI Installation ===
    echo "⚡ Setting up Solana CLI..."
    
    # Set Solana installation path
    export SOLANA_INSTALL_DIR="$HOME/.local/share/solana/install"
    export PATH="$SOLANA_INSTALL_DIR/active_release/bin:$PATH"
    
    # Install Solana CLI if not present or update if present
    if ! command -v solana &> /dev/null; then
      echo "📥 Installing Solana CLI..."
      sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
    else
      echo "🔄 Updating Solana CLI..."
      agave-install update || echo "Update check completed"
    fi
    
    # === Anchor Framework Installation ===
    echo "⚓ Setting up Anchor Framework..."
    
    # Install AVM (Anchor Version Manager) if not present
    if ! command -v avm &> /dev/null; then
      echo "📥 Installing Anchor Version Manager (AVM)..."
      cargo install --git https://github.com/coral-xyz/anchor avm --force
    fi
    
    # Install and use latest Anchor
    if ! command -v anchor &> /dev/null; then
      echo "📥 Installing Anchor CLI..."
      avm install latest
      avm use latest
    else
      echo "🔄 Ensuring latest Anchor version..."
      avm install latest || echo "Anchor install check completed"
      avm use latest || echo "Anchor use latest completed"
    fi
    
    # === Environment Variables ===
    echo "🔧 Configuring environment variables..."
    
    # Rust environment
    export RUST_BACKTRACE=1
    export RUSTFLAGS="-C target-cpu=native"
    
    # Solana configuration
    export SOLANA_INSTALL_DIR="$HOME/.local/share/solana/install"
    export PATH="$SOLANA_INSTALL_DIR/active_release/bin:$PATH"
    
    # Node.js configuration
    export NODE_OPTIONS="--max-old-space-size=8192"
    
    # Development flags
    export ANCHOR_PROVIDER_URL="https://api.devnet.solana.com"
    export ANCHOR_WALLET="$HOME/.config/solana/id.json"
    
    # === Package Manager Configuration ===
    echo "📦 Configuring package managers..."
    
    # Configure bun for faster operations
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    
    # Install bun if not present
    if ! command -v bun &> /dev/null; then
      echo "📥 Installing Bun..."
      curl -fsSL https://bun.sh/install | bash
      export PATH="$HOME/.bun/bin:$PATH"
    fi
    
    # === Project-Specific Setup ===
    echo "🏗️ Setting up project environment..."
    
    # Create necessary directories
    mkdir -p ~/.config/solana
    mkdir -p ~/.cache/solana
    mkdir -p .anchor
    
    # Set Solana to devnet for development
    if [ -f ~/.config/solana/id.json ]; then
      solana config set --url devnet --keypair ~/.config/solana/id.json &> /dev/null || true
    else
      echo "⚠️  No Solana keypair found. Run 'solana-keygen new' to create one."
    fi
    
    # === Development Aliases ===
    echo "🛠️ Setting up development aliases..."
    
    # Anchor shortcuts
    alias ab="anchor build"
    alias at="anchor test"
    alias ad="anchor deploy" 
    alias aib="anchor idl build"
    
    # Solana shortcuts
    alias sconfig="solana config get"
    alias sbalance="solana balance"
    alias sairdrop="solana airdrop 2"
    
    # Development shortcuts
    alias ll="ls -la"
    alias la="ls -la"
    alias ..="cd .."
    alias ...="cd ../.."
    
    # Project-specific shortcuts
    alias dev-test="bun run test:enhanced"
    alias dev-build="bun run build:optimized"
    alias dev-lint="bun run lint:all"
    
    # === Version Information ===
    echo ""
    echo "🎯 Development Environment Ready!"
    echo "================================="
    echo "📍 Project: podAI Protocol"
    echo "🏠 Location: $(pwd)"
    echo ""
    echo "🔧 Tool Versions:"
    echo "  • Rust: $(rustc --version 2>/dev/null || echo 'Installing...')"
    echo "  • Solana: $(solana --version 2>/dev/null || echo 'Installing...')"
    echo "  • Anchor: $(anchor --version 2>/dev/null || echo 'Installing...')"
    echo "  • Node.js: $(node --version 2>/dev/null || echo 'Not installed')"
    echo "  • Bun: $(bun --version 2>/dev/null || echo 'Installing...')"
    echo ""
    echo "🚀 Quick Commands:"
    echo "  • ab          - Build Anchor project"
    echo "  • at          - Run Anchor tests"
    echo "  • aib         - Build IDL"
    echo "  • sconfig     - Show Solana config"
    echo "  • sairdrop    - Request devnet SOL"
    echo ""
    echo "📚 Next Steps:"
    echo "  1. Run 'solana-keygen new' if you need a keypair"
    echo "  2. Run 'sairdrop' to get devnet SOL"
    echo "  3. Run 'ab' to build the project"
    echo "  4. Run 'at' to test everything works"
    echo ""
    
    # === Final Setup ===
    # Ensure all paths are properly set
    export PATH="$HOME/.bun/bin:$HOME/.cargo/bin:$SOLANA_INSTALL_DIR/active_release/bin:$PATH"
    
    # Set working directory to project root if we're in a subdirectory
    if [ -f "Anchor.toml" ]; then
      echo "📂 Already in project root directory"
    elif [ -f "../Anchor.toml" ]; then
      echo "📂 Moving to project root directory"
      cd ..
    fi
    
    echo "✅ Environment setup complete! Happy coding! 🎉"
    echo ""
    
    # === IDE Integration ===
    export RUST_SRC_PATH="$(rustc --print sysroot)/lib/rustlib/src/rust/library"
    export RUST_ANALYZER_SERVER_PATH="$(which rust-analyzer)"
    
    # === Performance Optimizations ===
    export CARGO_NET_GIT_FETCH_WITH_CLI=true
    export CARGO_REGISTRIES_CRATES_IO_PROTOCOL=sparse
    
    # === Security ===
    export RUSTFLAGS="-D warnings"
    export CARGO_AUDIT_VERSION="latest"
  '';

  # Additional environment variables for the shell
  env = {
    # Ensure SSL certificates work correctly
    SSL_CERT_FILE = "${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt";
    
    # Configure OpenSSL
    OPENSSL_DIR = "${pkgs.openssl.dev}";
    OPENSSL_LIB_DIR = "${pkgs.openssl.out}/lib";
    OPENSSL_INCLUDE_DIR = "${pkgs.openssl.dev}/include";
    
    # Configure pkg-config
    PKG_CONFIG_PATH = "${pkgs.openssl.dev}/lib/pkgconfig:${pkgs.libffi.dev}/lib/pkgconfig";
    
    # Development environment marker
    PODAI_DEV_ENV = "nix";
    
    # Disable telemetry for privacy
    ANCHOR_CLI_TELEMETRY_DISABLED = "1";
    SOLANA_CLI_TELEMETRY_DISABLED = "1";
  };
  
  # Meta information
  meta = {
    description = "Complete development environment for podAI Protocol";
    platforms = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
  };
} 