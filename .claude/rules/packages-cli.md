---
globs: ["packages/cli/**"]
description: Rules and patterns for @ghostspeak/cli terminal application development
---

# CLI Development Rules (packages/cli)

## Architecture Context

**Package**: @ghostspeak/cli
**Current Version**: 2.0.0-beta.22
**Binary Names**: `ghostspeak` or `ghost` (alias)
**Framework**: Commander.js (CLI framework) + Ink (React for terminals) + Clack (prompts)
**Build Tool**: TSUp with shebang for executable
**Test Framework**: Bun Test

## Core Architecture

### Command Framework: Commander.js

```typescript
// src/index.ts
#!/usr/bin/env bun
import { Command } from 'commander';

const program = new Command();

program
  .name('ghostspeak')
  .description('GhostSpeak CLI - Trust layer for AI agent commerce')
  .version('2.0.0-beta.22');

// Register commands
program
  .command('agent')
  .description('Manage agents')
  .action(async (options) => {
    const { agentCommand } = await import('./commands/agent');
    await agentCommand(options);
  });

program.parse();
```

### UI Framework: Ink (React for Terminals)

```typescript
// src/commands/dashboard.tsx
import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import { GhostSpeakClient } from '@ghostspeak/sdk';

function Dashboard() {
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    const client = new GhostSpeakClient({ cluster: 'devnet' });
    client.agents.list().then(setAgents);
  }, []);

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">Agent Dashboard</Text>
      {agents.map(agent => (
        <Text key={agent.address}>{agent.name}</Text>
      ))}
    </Box>
  );
}

export async function dashboardCommand() {
  render(<Dashboard />);
}
```

### Prompts: Clack

```typescript
// src/commands/quickstart.ts
import * as clack from '@clack/prompts';
import color from 'picocolors';

export async function quickstartCommand() {
  clack.intro(color.bgCyan(' GhostSpeak Quickstart '));

  const name = await clack.text({
    message: 'What is your agent name?',
    placeholder: 'My Agent',
    validate: (value) => {
      if (!value) return 'Name is required';
    },
  });

  const cluster = await clack.select({
    message: 'Select network',
    options: [
      { value: 'devnet', label: 'Devnet (testing)' },
      { value: 'mainnet-beta', label: 'Mainnet (production)' },
    ],
  });

  const spinner = clack.spinner();
  spinner.start('Registering agent...');

  // Do work

  spinner.stop('Agent registered!');
  clack.outro(color.green('Setup complete!'));
}
```

## Command Categories (src/commands/)

### Setup Commands
- **quickstart** - Interactive onboarding
- **wallet** - Wallet management (create, import, list)
- **config** - Configuration (set RPC, cluster, program ID)
- **faucet** - Request devnet SOL airdrop

### Core Commands
- **agent** - Agent lifecycle (register, update, deactivate, list)
- **ghost-claim** - Claim GHOST tokens
- **reputation** - View and manage reputation
- **staking** - Stake GHOST for benefits
- **credentials** - Manage verifiable credentials

### UI Commands (Ink-based)
- **dashboard** - Real-time agent analytics
- **reputation-ui** - Interactive reputation view
- **staking-ui** - Interactive staking interface

### Dev Commands
- **sdk** - SDK utilities (generate, test)
- **diagnose** - System diagnostics
- **governance** - Governance proposals

## SDK Integration

### Using @ghostspeak/sdk

```typescript
// src/commands/agent.ts
import { GhostSpeakClient } from '@ghostspeak/sdk';
import { loadKeypairFromFile } from '../utils/keypair';

export async function agentCommand(options: AgentOptions) {
  // Load config
  const config = await loadConfig();
  const keypair = await loadKeypairFromFile(config.walletPath);

  // Initialize SDK client
  const client = new GhostSpeakClient({
    cluster: config.cluster,
    rpcUrl: config.rpcUrl,
    signer: keypair,
  });

  // Execute command
  switch (options.action) {
    case 'register':
      const signature = await client.agents.register({
        name: options.name,
        address: options.address,
      });
      console.log(`Agent registered! Signature: ${signature}`);
      break;

    case 'list':
      const agents = await client.agents.list();
      agents.forEach(agent => {
        console.log(`${agent.name}: ${agent.address}`);
      });
      break;
  }
}
```

## Configuration Management

### Config File (~/.ghostspeak/config.json)

```typescript
// src/utils/config.ts
import { homedir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';

export interface Config {
  cluster: 'devnet' | 'testnet' | 'mainnet-beta';
  rpcUrl: string;
  programId: string;
  walletPath: string;
}

const CONFIG_DIR = join(homedir(), '.ghostspeak');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

export async function loadConfig(): Promise<Config> {
  if (!existsSync(CONFIG_PATH)) {
    return getDefaultConfig();
  }

  const content = await readFile(CONFIG_PATH, 'utf-8');
  return JSON.parse(content);
}

export async function saveConfig(config: Config): Promise<void> {
  if (!existsSync(CONFIG_DIR)) {
    await mkdir(CONFIG_DIR, { recursive: true });
  }

  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function getDefaultConfig(): Config {
  return {
    cluster: 'devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    programId: '4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB',
    walletPath: join(homedir(), '.config/solana/id.json'),
  };
}
```

### Keypair Loading

```typescript
// src/utils/keypair.ts
import { readFile } from 'fs/promises';
import { generateKeyPairSigner, createKeyPairSignerFromBytes } from '@solana/signers';

export async function loadKeypairFromFile(path: string) {
  const content = await readFile(path, 'utf-8');
  const secretKey = Uint8Array.from(JSON.parse(content));
  return await createKeyPairSignerFromBytes(secretKey);
}

export async function generateAndSaveKeypair(path: string) {
  const keypair = await generateKeyPairSigner();
  const secretKey = Array.from(keypair.secretKey);
  await writeFile(path, JSON.stringify(secretKey));
  return keypair;
}
```

## Terminal UI Patterns (Ink)

### Layout Components

```typescript
import { Box, Text } from 'ink';

// Vertical layout
<Box flexDirection="column" gap={1}>
  <Text>Line 1</Text>
  <Text>Line 2</Text>
</Box>

// Horizontal layout
<Box flexDirection="row" gap={2}>
  <Text>Column 1</Text>
  <Text>Column 2</Text>
</Box>

// Centered
<Box justifyContent="center" alignItems="center">
  <Text>Centered</Text>
</Box>
```

### Styling

```typescript
import { Text } from 'ink';

<Text bold color="cyan">Heading</Text>
<Text dimColor>Subtitle</Text>
<Text backgroundColor="red" color="white">Error</Text>
<Text italic>Emphasized</Text>
```

### Interactive Components

```typescript
import { useInput } from 'ink';

function InteractiveList({ items, onSelect }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex(i => Math.max(0, i - 1));
    }
    if (key.downArrow) {
      setSelectedIndex(i => Math.min(items.length - 1, i + 1));
    }
    if (key.return) {
      onSelect(items[selectedIndex]);
    }
  });

  return (
    <Box flexDirection="column">
      {items.map((item, i) => (
        <Text key={i} color={i === selectedIndex ? 'cyan' : 'white'}>
          {i === selectedIndex ? '❯ ' : '  '}
          {item}
        </Text>
      ))}
    </Box>
  );
}
```

### Real-time Updates

```typescript
import { useState, useEffect } from 'react';
import { Text } from 'ink';

function LiveBalance({ address }) {
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    const interval = setInterval(async () => {
      const client = new GhostSpeakClient({ cluster: 'devnet' });
      const bal = await client.getBalance(address);
      setBalance(bal);
    }, 2000);

    return () => clearInterval(interval);
  }, [address]);

  return <Text>Balance: {balance} SOL</Text>;
}
```

## Build Configuration

### TSUp Config (tsup.config.ts)

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  dts: false, // CLI doesn't need type definitions
  bundle: true,
  minify: false, // Keep readable for debugging
  shims: true, // Polyfills for __dirname, etc.
  banner: {
    js: '#!/usr/bin/env bun', // Shebang for executable
  },
});
```

### Package.json Configuration

```json
{
  "name": "@ghostspeak/cli",
  "version": "2.0.0-beta.22",
  "bin": {
    "ghostspeak": "./dist/index.js",
    "ghost": "./dist/index.js"
  },
  "files": ["dist"],
  "type": "module",
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "prepublishOnly": "bun run build"
  }
}
```

## Error Handling

### User-Friendly Errors

```typescript
import color from 'picocolors';

export class CliError extends Error {
  constructor(
    message: string,
    public suggestion?: string,
  ) {
    super(message);
    this.name = 'CliError';
  }

  display() {
    console.error(color.red('✗ Error:'), this.message);
    if (this.suggestion) {
      console.error(color.yellow('→ Suggestion:'), this.suggestion);
    }
  }
}

// Usage
try {
  await client.agents.register({ name });
} catch (error) {
  if (error instanceof InsufficientBalanceError) {
    throw new CliError(
      'Insufficient SOL balance for transaction',
      'Run `ghost faucet` to request devnet SOL'
    );
  }
  throw error;
}
```

### Global Error Handler

```typescript
// src/index.ts
process.on('unhandledRejection', (error: Error) => {
  if (error instanceof CliError) {
    error.display();
  } else {
    console.error(color.red('Unexpected error:'), error.message);
    console.error(color.dim(error.stack));
  }
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log(color.yellow('\nInterrupted. Exiting...'));
  process.exit(0);
});
```

## Testing Patterns

### Command Tests

```typescript
import { describe, it, expect } from 'bun:test';
import { agentCommand } from '../src/commands/agent';

describe('Agent Command', () => {
  it('should register an agent', async () => {
    const result = await agentCommand({
      action: 'register',
      name: 'Test Agent',
      cluster: 'devnet',
    });

    expect(result.signature).toBeDefined();
  });
});
```

### UI Component Tests

```typescript
import { render } from 'ink-testing-library';
import { Dashboard } from '../src/commands/dashboard';

it('renders dashboard', () => {
  const { lastFrame } = render(<Dashboard />);
  expect(lastFrame()).toContain('Agent Dashboard');
});
```

## Development Workflow

### Local Development

```bash
# Build and watch for changes
bun run dev

# Test CLI locally
./dist/index.js --help
./dist/index.js agent register --name "Test"

# Or use bun directly
bun run src/index.ts --help
```

### Testing

```bash
bun test                              # All tests
bun test tests/commands/agent.test.ts # Specific test
bun test --watch                      # Watch mode
```

### Publishing

```bash
# Build
bun run build

# Test the built CLI
./dist/index.js --version

# Version bump
npm version prerelease --preid=beta  # 2.0.0-beta.22 -> 2.0.0-beta.23
npm version patch                     # 2.0.0-beta.22 -> 2.0.1

# Publish
npm publish --access public

# Install globally to test
bun add -g @ghostspeak/cli
ghost --version
```

## File Structure

```
packages/cli/
├── src/
│   ├── index.ts                 # Entry point + Commander setup
│   ├── commands/               # Command implementations
│   │   ├── quickstart.ts       # Interactive onboarding
│   │   ├── agent.ts            # Agent management
│   │   ├── wallet.ts           # Wallet commands
│   │   ├── config.ts           # Configuration
│   │   ├── dashboard.tsx       # Ink UI dashboard
│   │   ├── reputation-ui.tsx   # Ink UI reputation
│   │   └── staking-ui.tsx      # Ink UI staking
│   ├── utils/                  # Utilities
│   │   ├── config.ts           # Config management
│   │   ├── keypair.ts          # Keypair utilities
│   │   ├── formatting.ts       # Output formatting
│   │   └── errors.ts           # Error classes
│   └── components/             # Reusable Ink components
│       ├── Spinner.tsx
│       ├── Table.tsx
│       └── ProgressBar.tsx
├── tests/
│   └── commands/
├── dist/                       # Build output (gitignored)
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## Common Patterns

### Command with Progress Indicator

```typescript
import ora from 'ora';

export async function deployCommand() {
  const spinner = ora('Deploying agent...').start();

  try {
    await deployAgent();
    spinner.succeed('Agent deployed successfully!');
  } catch (error) {
    spinner.fail('Deployment failed');
    throw error;
  }
}
```

### Table Output

```typescript
import Table from 'cli-table3';
import color from 'picocolors';

export function displayAgents(agents: Agent[]) {
  const table = new Table({
    head: [
      color.cyan('Name'),
      color.cyan('Address'),
      color.cyan('Ghost Score'),
    ],
  });

  agents.forEach(agent => {
    table.push([agent.name, agent.address, agent.ghostScore.toString()]);
  });

  console.log(table.toString());
}
```

### Interactive Confirmation

```typescript
import { confirm } from '@clack/prompts';

export async function deactivateAgentCommand(address: string) {
  const shouldProceed = await confirm({
    message: 'This will deactivate your agent. Continue?',
  });

  if (!shouldProceed) {
    console.log('Cancelled.');
    return;
  }

  // Proceed with deactivation
}
```

## Common Pitfalls

### ❌ Don't: Use console.log for Structured Output

```typescript
// BAD: Unstructured output
console.log('Agent: ' + agent.name + ' Score: ' + agent.score);
```

### ✅ Do: Use Formatting Libraries

```typescript
// GOOD: Structured table output
displayAgents([agent]);
```

### ❌ Don't: Ignore Exit Codes

```typescript
// BAD: Always exits with 0
try {
  await command();
} catch (e) {
  console.error(e);
}
```

### ✅ Do: Use Proper Exit Codes

```typescript
// GOOD: Exit with error code
try {
  await command();
  process.exit(0);
} catch (e) {
  console.error(e);
  process.exit(1);
}
```

### ❌ Don't: Hardcode Paths

```typescript
// BAD: Hardcoded home directory
const configPath = '/Users/user/.ghostspeak/config.json';
```

### ✅ Do: Use os.homedir()

```typescript
// GOOD: Cross-platform
import { homedir } from 'os';
import { join } from 'path';

const configPath = join(homedir(), '.ghostspeak', 'config.json');
```

## Performance Best Practices

1. **Lazy load heavy dependencies** - Import commands only when needed
2. **Cache config** - Don't read config file on every command
3. **Batch RPC calls** - Use SDK's batch methods for multiple accounts
4. **Exit early** - Validate inputs before expensive operations
5. **Show progress** - Use spinners/progress bars for long operations

## User Experience Guidelines

1. **Clear feedback** - Always show what's happening
2. **Helpful errors** - Include suggestions for fixing issues
3. **Consistent styling** - Use same colors/icons throughout
4. **Interactive defaults** - Suggest reasonable defaults in prompts
5. **Exit on Ctrl+C** - Always allow graceful interruption
6. **Verbose mode** - Add `--verbose` flag for debugging

## Dependencies

### Core Dependencies

```json
{
  "commander": "^12.0.0",        // CLI framework
  "ink": "^5.0.0",                // React for terminals
  "@clack/prompts": "^0.8.0",    // Interactive prompts
  "picocolors": "^1.1.0",        // Terminal colors
  "ora": "^8.0.0",                // Spinners
  "cli-table3": "^0.6.0",        // Tables
  "@ghostspeak/sdk": "workspace:*"  // SDK integration
}
```

## Additional Resources

- Commander.js Docs: https://github.com/tj/commander.js
- Ink Docs: https://github.com/vadimdemedes/ink
- Clack Prompts: https://github.com/natemoo-re/clack
- Bun CLI Docs: https://bun.sh/docs/cli/run
