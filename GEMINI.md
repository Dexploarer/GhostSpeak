# GhostSpeak Project Context

## Project Overview
**GhostSpeak** is an open-source protocol enabling autonomous AI agents to trade services on the Solana blockchain. It utilizes the **x402 payment protocol** for micropayments and compressed NFTs for cost efficiency.

> **Note**: Currently deployed on Devnet only. This is pre-production software.

## Architecture
This is a **monorepo** utilizing Bun workspaces.
- **Smart Contracts**: `programs/` (Rust/Anchor)
- **SDK**: `packages/sdk-typescript` (TypeScript)
- **CLI**: `packages/cli` (TypeScript)
- **Web**: `packages/web` (Next.js/React)
- **Docs**: `packages/docs` (Astro)

## Key Technologies
- **Languages**: TypeScript (Node.js 20+), Rust (1.75+)
- **Runtime/Package Manager**: Bun (v1.0+)
- **Blockchain Frameworks**: Solana (v2.3.13), Anchor (v0.32.1)
- **Libraries**: `@solana/kit` (Web3.js v2), `@ghostspeak/sdk`

## Development Workflow

### Prerequisites
- Node.js 20+
- Bun 1.0+
- Rust 1.75+ & Cargo
- Solana CLI 2.1.0+

### Installation
```bash
bun install
```

### Key Commands
| Action | Command | Description |
|BO|BO|BO|
| **Build All** | `bun run build:all` | Builds Anchor programs and all packages |
| **Build SDK** | `bun run build:sdk` | Builds only the TypeScript SDK |
| **Test All** | `bun run test:all` | Runs unit, integration, perf, and security tests |
| **Test Unit** | `bun run test:unit` | Runs Vitest unit tests |
| **Test Rust** | `cd programs && cargo test` | Runs smart contract tests |
| **Lint** | `bun run lint` | Runs ESLint (TS) and Clippy (Rust) |
| **Format** | `bun run format` | Formats Rust code |
| **Deploy (Devnet)**| `bun run deploy:devnet` | Deploys programs to Solana Devnet |

## Coding Standards & Conventions
*   **Strict TypeScript**: No `any` types allowed. Strict type safety is enforced.
*   **Zero Warnings**: Code must pass ESLint and Clippy with zero warnings.
*   **Nullish Coalescing**: Prefer `??` over `||`.
*   **Naming**: `snake_case` for Rust instructions, `camelCase` for TypeScript.
*   **Verification**: Changes are typically verified using `kluster.ai` protocols (internal workflow).
*   **Solana Patterns**: Use modern `@solana/kit` (Web3.js v2) patterns. Do not use legacy Web3.js v1.
*   **x402 Protocol**: All agent services must support HTTP 402 payment headers.

## Important Files
- `package.json`: Root scripts and workspace definitions.
- `Anchor.toml`: Anchor framework configuration and network settings.
- `CLAUDE.md`: Detailed developer context and architectural decisions (refer to this for deep dives).
- `programs/src/lib.rs`: Entry point for Solana smart contracts.
