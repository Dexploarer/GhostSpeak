# Release Notes: v2.0.0-beta.21

**Release Date**: January 2, 2026

## 🎉 Major Feature: Ghost Claiming with SAS Attestation

This release introduces complete Ghost claiming functionality, enabling users to claim discovered external agents with cryptographic ownership validation through Solana Attestation Service (SAS).

## 📦 Package Information

- **Package**: `@ghostspeak/cli`
- **Version**: `2.0.0-beta.21`
- **Repository**: https://github.com/Ghostspeak/cli
- **NPM**: `@ghostspeak/cli` (pending publish)

## ✨ New Features

### 1. Ghost Claiming Commands

#### `ghost claim-ghost` (Production)
Complete production-ready Ghost claiming with Convex discovery database integration:

```bash
# List all discovered Ghosts
ghost claim-ghost --list

# Claim a specific Ghost
ghost claim-ghost --ghost-address <address>
```

**Features**:
- ✅ Lists 52+ discovered Ghosts from x402 indexer
- ✅ Interactive agent selection from Convex database
- ✅ SAS attestation creation for ownership proof
- ✅ On-chain claim transaction with signature verification
- ✅ Automatic Convex database updates (marks Ghost as claimed)
- ✅ Ghost Score display after successful claim
- ✅ Transaction explorer links

#### `ghost claim-ghost-test` (Development)
Development testing command that bypasses discovery database:

```bash
ghost claim-ghost-test <agent-address> [--facilitator <address>]
```

**Use Cases**:
- Testing claim flow with owned agents
- Development without waiting for indexer
- Validating SAS attestation integration

### 2. Convex Integration

New real-time database integration for Ghost discovery and claiming:

**New Functions**:
- `queryDiscoveredAgents()` - Fetch Ghosts from Convex
- `markGhostClaimed()` - Update Ghost status after claim
- `getGhostScore()` - Fetch agent reputation score
- `getDiscoveryStats()` - Get discovery database statistics

**Convex Mutations**:
- `claimAgent` - Public mutation for marking Ghosts as claimed
- Stores claim transaction signatures
- Records claim timestamps and owner addresses

### 3. Ghost Score Display

Automatic Ghost Score fetching and display after successful claims:

```
Ghost Score:
  Score: 785/1000
  Tier: Gold
  Components:
    - Credentials: 250
    - Transactions: 320
    - Reputation: 215
```

**Features**:
- ✅ Real-time score calculation
- ✅ Tier classification (Bronze/Silver/Gold/Platinum)
- ✅ Component breakdown
- ✅ Graceful fallback if unavailable

### 4. Enhanced Error Handling

Context-aware error messages with actionable troubleshooting:

| Error Scenario | Guidance Provided |
|----------------|-------------------|
| Invalid address | Shows expected format and examples |
| Ghost not found | Explains possible reasons (not indexed, wrong address) |
| Already claimed | Shows who claimed it and when |
| SAS attestation failed | Specific setup instructions |
| Network/RPC errors | Suggests alternative endpoints |
| Insufficient funds | Exact commands to request airdrop |

## 🔐 Security Features

### SAS Attestation-Based Ownership Validation

**Two-Step Verification**:
1. **SAS Attestation Creation**: Proves claimer controls x402 payment address
2. **On-Chain Validation**: Verifies transaction signer matches attestation owner

**Attack Prevention**:
- ❌ Cannot claim without valid SAS attestation
- ❌ Cannot forge SAS authority signatures
- ❌ Cannot use someone else's attestation (signature mismatch)
- ❌ Cannot bypass ownership checks (enforced on-chain)

**Documentation**: See `OWNERSHIP_VALIDATION.md` for complete security analysis

## 📚 New Documentation

### OWNERSHIP_VALIDATION.md
Comprehensive security documentation covering:
- SAS attestation mechanism
- Cryptographic ownership proof
- Attack vectors and prevention
- Manual testing procedures
- Security guarantees

### REPOSITORY_STRUCTURE.md (Monorepo Root)
Complete guide to GhostSpeak's hybrid repository architecture:
- Monorepo vs multi-repo setup
- Git remote configuration
- Development workflow
- Publishing process
- Common tasks and troubleshooting

## 🛠️ Technical Implementation

### New Files
```
packages/cli/
├── src/
│   ├── commands/
│   │   ├── ghost-claim.ts         # Production claiming
│   │   ├── ghost-claim-test.ts    # Development testing
│   │   ├── ghost.ts                # Ghost management
│   │   └── ghost-ui.ts             # Interactive UI
│   └── utils/
│       ├── convex-client.ts        # Convex integration
│       └── sas-helpers.ts          # SAS attestation helpers
└── OWNERSHIP_VALIDATION.md         # Security docs
```

### Updated Files
- `src/index.ts` - Registered new commands
- `package.json` - Version bump to 2.0.0-beta.21
- `CHANGELOG.md` - Release notes

## 📈 Statistics

- **Files Changed**: 44
- **Insertions**: 7,481
- **Deletions**: 480
- **New Commands**: 2 (claim-ghost, claim-ghost-test)
- **New Utilities**: 2 (convex-client, sas-helpers)
- **Documentation**: 2 new files

## 🔄 Migration Guide

### From Previous Versions

No breaking changes. This release adds new functionality without removing existing features.

### New Dependencies

```json
{
  "sas-lib": "^1.0.0",
  "convex": "^1.31.2"
}
```

Already included in package.json.

## 📦 Installation

### From NPM (After Publishing)

```bash
# Install globally
bun add -g @ghostspeak/cli

# Or use with bunx
bunx @ghostspeak/cli claim-ghost --list
```

### From Source

```bash
# Clone the repository
git clone https://github.com/Ghostspeak/cli.git
cd cli

# Install dependencies
bun install

# Build
bun run build

# Run
./dist/index.js claim-ghost --list
```

## 🧪 Testing

### Verified Scenarios

✅ **Production Flow**:
- Listed 52 discovered Ghosts from Convex
- Fetched Ghost details successfully
- Loaded SAS configuration
- Wallet and RPC initialization
- Interactive confirmation prompts

✅ **Security Validation**:
- SAS attestation ownership proof
- On-chain signature verification
- Attack vector prevention

✅ **Error Handling**:
- Invalid address format
- Ghost not found
- Already claimed detection
- Network failures
- Insufficient funds

## 🚀 What's Next

### Planned for v2.0.0-beta.22

- [ ] Complete end-to-end claim test on devnet
- [ ] Add claim history command (`ghost claim history`)
- [ ] Add claim status verification
- [ ] Enhanced Ghost Score breakdown display
- [ ] Batch claiming for multiple Ghosts

### Future Enhancements

- [ ] Ghost transfer functionality
- [ ] Ghost delegation/sharing
- [ ] Advanced filtering for discovered Ghosts
- [ ] Integration with elizaOS plugin

## 🐛 Known Issues

None at this time.

## 📞 Support

- **Issues**: https://github.com/Ghostspeak/cli/issues
- **Discord**: https://discord.gg/ghostspeak
- **Documentation**: https://docs.ghostspeak.io

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**Built with ❤️ by the GhostSpeak Team**

*Making AI agent commerce trustworthy, one Ghost at a time.*
