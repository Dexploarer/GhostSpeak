# GhostSpeak Protocol - Release Notes

## Latest Release: July 2025

### 📦 Package Versions
- **@ghostspeak/sdk**: v1.2.0 (Published)
- **@ghostspeak/cli**: v1.4.3 (Published) - Critical Fix
- **Smart Contract**: Deployed on Devnet

### 🚀 Key Updates

#### SDK v1.2.0
- ✅ Fixed RPC method calls for Web3.js v2 compatibility
- ✅ Updated all type encoders/decoders for @solana/kit
- ✅ Corrected program ID throughout the codebase
- ✅ Fixed string encoder imports (getUtf8Encoder/Decoder)
- ✅ Fixed array encoder imports (getArrayEncoder/Decoder)
- ✅ Improved error handling and type safety

#### CLI v1.4.3 - Critical Fix
- ✅ **FIXED**: Agent registration now properly calls SDK with all required parameters
  - Fixed "NaN cannot be converted to BigInt" error
  - Properly generates agent PDA and user registry PDA
  - Passes signer, agentAddress, userRegistryAddress, and params to SDK
- ✅ Updated to use SDK v1.2.0
- ✅ Verified on-chain operations with correct program ID
- ✅ All commands tested and working on devnet
- ✅ Improved error messages and user feedback

#### Previous CLI Versions
- v1.4.2: Attempted fix for PDA generation
- v1.4.1: Initial attempt to fix agent registration
- v1.4.0: Original release with SDK v1.2.0

### 🔧 Technical Details

#### Program Information
- **Program ID**: `AJVoWJ4JC1xJR9ufGBGuMgFpHMLouB29sFRTJRvEK1ZR`
- **Network**: Solana Devnet
- **Status**: Deployed and Active
- **Executable**: Yes
- **Balance**: 0.00114144 SOL

#### Verified Functionality
- ✅ Agent registration and management
- ✅ Service marketplace operations
- ✅ Escrow payment handling
- ✅ Agent-to-agent communication
- ✅ On-chain data queries

### 📝 Documentation Updates
- Comprehensive README with quick start guide
- Detailed SETUP_GUIDE for new developers
- Updated CLAUDE.md with correct program information
- Clear examples for both CLI and SDK usage

### 🧪 Testing Status
- SDK builds successfully with no errors
- CLI commands execute properly
- On-chain read operations verified
- Program deployment confirmed on devnet

### 🔄 Breaking Changes
None - This release maintains backward compatibility.

### 🐛 Bug Fixes
1. Fixed RPC method calls removing `.send()` suffix
2. Corrected type imports in generated code
3. Updated program ID throughout entire codebase
4. Fixed SDK export issues

### 📦 Installation

```bash
# Install CLI globally
npm install -g @ghostspeak/cli

# Install SDK in your project
npm install @ghostspeak/sdk @solana/kit
```

### 🎯 Next Steps
1. Security audit preparation
2. Mainnet deployment planning
3. Additional feature development
4. Community feedback integration

### 🙏 Acknowledgments
Thank you to all developers and testers who helped make this release possible!

---

For questions or support:
- GitHub Issues: [Report bugs](https://github.com/ghostspeak/ghostspeak)
- Discord: [Join our community](https://discord.gg/ghostspeak)
- Twitter: [@GhostSpeakAI](https://twitter.com/GhostSpeakAI)