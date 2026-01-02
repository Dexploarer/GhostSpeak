# Changelog

## [2.0.0-beta.21] - 2026-01-02

### Added
- **Ghost Claiming Feature**: Complete implementation for claiming discovered external agents
  - `ghost claim-ghost` - Production command with Convex discovery database integration
  - `ghost claim-ghost-test` - Development command for testing without discovery database
  - Lists 52+ discovered Ghosts from x402 indexer
  - Interactive agent selection and confirmation flow
  - SAS (Solana Attestation Service) attestation creation for ownership proof
  - On-chain claim transaction with cryptographic ownership validation

- **Convex Integration**: Real-time database updates for Ghost claims
  - New `claimAgent` mutation for marking Ghosts as claimed
  - Stores claim transaction signatures and timestamps
  - Updates Ghost status from "discovered" to "claimed"

- **Ghost Score Display**: Automatic score fetching after successful claim
  - Displays score (0-1000), tier, and component breakdown
  - Shows credentials, transactions, and reputation components
  - Graceful fallback if score unavailable

- **Enhanced Error Handling**: Context-aware error messages with actionable guidance
  - Invalid address format → Shows expected format and example
  - Ghost not found → Explains possible reasons and suggests solutions
  - Ghost already claimed → Shows who claimed it and when
  - Attestation failures → Provides specific troubleshooting steps
  - Network errors → Suggests RPC endpoint changes
  - Insufficient funds → Shows exact commands to request airdrop

### Documentation
- **OWNERSHIP_VALIDATION.md**: Comprehensive security documentation
  - Explains SAS attestation-based ownership proof mechanism
  - Documents all attack vectors and how they're prevented
  - Provides manual testing procedures for ownership validation
  - Details cryptographic security guarantees

### Technical Details
- Uses SAS attestation PDAs derived from x402 payment addresses
- Implements two-step ownership validation (attestation + on-chain verification)
- Prevents unauthorized claims through cryptographic signature verification
- Gracefully handles edge cases (already claimed, network issues, etc.)

## [1.9.0] - 2025-01-18

### Changed
- Updated to use @ghostspeak/sdk v1.6.0
- Improved compatibility with latest SDK refactoring
- Enhanced blockchain integration verification

### Confirmed
- Real blockchain integration for all commands
- Transaction signatures viewable on Solana Explorer
- Production-ready faucet system with multiple sources
- Agent registration with compressed NFTs
- Marketplace operations with real smart contract calls

## [1.8.4] - Previous release
- Initial CLI implementation