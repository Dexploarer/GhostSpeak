# Load Deep Context for Package

Load comprehensive context and rules for a specific package or module in the monorepo.

## Usage

```bash
/context-load [package-name]
```

## Arguments

- `package-name`: One of: `web`, `sdk`, `cli`, `programs`, `all`

## Behavior

Based on the package name, this command will load:

### /context-load web
- Rules from `.claude/rules/apps-web.md`
- Convex skill knowledge
- Next.js 15 + React 19 patterns
- Solana wallet integration
- API route handling

Focus: Building and debugging the Next.js web application with Convex backend.

### /context-load sdk
- Rules from `.claude/rules/packages-sdk.md`
- Module architecture patterns
- Solana @solana/kit v2 usage
- TypeScript SDK development
- Testing patterns

Focus: Developing the @ghostspeak/sdk TypeScript package.

### /context-load cli
- Rules from `.claude/rules/packages-cli.md`
- Commander.js command patterns
- Ink UI component development
- Clack prompt patterns
- Configuration management

Focus: Building terminal commands and UI for @ghostspeak/cli.

### /context-load programs
- Rules from `.claude/rules/programs.md`
- Anchor program patterns
- Security best practices
- Account validation
- Testing with Mollusk

Focus: Writing and auditing Rust smart contracts.

### /context-load all
- Load all rules files
- Load all relevant skills
- Full monorepo context

Use for cross-cutting tasks that span multiple packages.

## Examples

```bash
# Working on web app API routes
/context-load web

# Developing new SDK module
/context-load sdk

# Adding new CLI command
/context-load cli

# Implementing smart contract instruction
/context-load programs

# Planning major refactoring
/context-load all
```

## Notes

- Context is loaded conditionally to reduce token usage
- Rules auto-apply based on file path when editing
- Use this command to explicitly load context for research or planning
