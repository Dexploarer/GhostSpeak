---
name: testing-expert-2026
description: Expert testing patterns for GhostSpeak monorepo (January 2026). Use when (1) Writing unit tests, (2) Building integration tests, (3) Creating E2E tests with Playwright, (4) Testing Solana programs, (5) Testing React components, (6) Testing Convex functions, or any testing strategy questions.
---

# Testing Expert Guide - January 2026

## Testing Stack

| Layer | Tool | Location |
|-------|------|----------|
| **Unit Tests** | Bun Test | All packages |
| **Integration Tests** | Bun Test | All packages |
| **E2E Tests** | Playwright | `apps/web/e2e/` |
| **Solana Programs** | Mollusk, LiteSVM, Anchor | `programs/tests/` |
| **React Components** | React Testing Library + Bun | `apps/web/__tests__/` |

## Quick Commands

```bash
# Run all tests
bun test

# Run specific package
bun run test:web
bun run test:sdk
bun run test:cli

# Run in watch mode
bun test --watch

# Run with coverage
bun test --coverage

# Run E2E tests
cd apps/web
bun run test:e2e

# Run specific E2E test
bun run test:e2e -- tests/e2e/wallet-auth.spec.ts
```

## Unit Tests (Bun Test)

### SDK Tests
```typescript
// packages/sdk-typescript/tests/unit/agent.test.ts
import { describe, test, expect, beforeAll } from "bun:test";
import { GhostSpeakClient } from "../../src";

describe("AgentModule", () => {
  let client: GhostSpeakClient;

  beforeAll(() => {
    client = new GhostSpeakClient({ cluster: "devnet" });
  });

  test("should register an agent", async () => {
    const signature = await client.agents.register({
      name: "Test Agent",
      address: "test-123",
    });

    expect(signature).toBeDefined();
    expect(signature.length).toBeGreaterThan(0);
  });

  test("should fetch agent by address", async () => {
    const agent = await client.agents.getAgent("test-123");

    expect(agent).toBeDefined();
    expect(agent?.name).toBe("Test Agent");
  });
});
```

### Utility Tests
```typescript
// packages/sdk-typescript/tests/unit/utils.test.ts
import { describe, test, expect } from "bun:test";
import { calculateGhostScore } from "../../src/utils";

describe("calculateGhostScore", () => {
  test("should return 0 for no transactions", () => {
    const score = calculateGhostScore(0, 0n);
    expect(score).toBe(0);
  });

  test("should cap score at 1000", () => {
    const score = calculateGhostScore(10000, 1000000000n);
    expect(score).toBe(1000);
  });

  test("should calculate correctly", () => {
    const score = calculateGhostScore(100, 5000000n);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1000);
  });
});
```

## Integration Tests

```typescript
// packages/sdk-typescript/tests/integration/agent-lifecycle.test.ts
import { describe, test, expect } from "bun:test";
import { GhostSpeakClient } from "../../src";

describe("Agent Lifecycle", () => {
  test("complete agent lifecycle", async () => {
    const client = new GhostSpeakClient({ cluster: "devnet" });

    // Register
    const registerSig = await client.agents.register({
      name: "Lifecycle Test",
      address: `test-${Date.now()}`,
    });
    expect(registerSig).toBeDefined();

    // Fetch
    const agent = await client.agents.getAgent(testAddress);
    expect(agent?.name).toBe("Lifecycle Test");

    // Update
    const updateSig = await client.agents.update({
      address: testAddress,
      name: "Updated Name",
    });
    expect(updateSig).toBeDefined();

    // Deactivate
    const deactivateSig = await client.agents.deactivate(testAddress);
    expect(deactivateSig).toBeDefined();
  });
});
```

## E2E Tests (Playwright)

```typescript
// apps/web/e2e/wallet-auth.spec.ts
import { test, expect } from "@playwright/test";

test("wallet authentication flow", async ({ page }) => {
  // Navigate to app
  await page.goto("http://localhost:3333");

  // Click connect wallet
  await page.click('button:has-text("Connect Wallet")');

  // Wait for wallet modal
  await page.waitForSelector('[data-testid="wallet-modal"]');

  // Select Phantom
  await page.click('button:has-text("Phantom")');

  // Verify connected state
  await expect(page.locator('[data-testid="wallet-address"]')).toBeVisible();
});

test("agent registration", async ({ page }) => {
  await page.goto("http://localhost:3333/dashboard");

  // Fill form
  await page.fill('input[name="agentName"]', "Test Agent");
  await page.fill('input[name="agentAddress"]', "test-123");

  // Submit
  await page.click('button:has-text("Register Agent")');

  // Verify success
  await expect(page.locator('text=Agent registered!')).toBeVisible();
});
```

## React Component Tests

```typescript
// apps/web/__tests__/auth-sessions.test.ts
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect } from "bun:test";
import { ConnectWalletButton } from "../components/auth/ConnectWalletButton";

describe("ConnectWalletButton", () => {
  test("renders connect button when not connected", () => {
    render(<ConnectWalletButton />);
    expect(screen.getByText("Connect Wallet")).toBeDefined();
  });

  test("calls onConnect when clicked", () => {
    const onConnect = jest.fn();
    render(<ConnectWalletButton onConnect={onConnect} />);

    fireEvent.click(screen.getByText("Connect Wallet"));
    expect(onConnect).toHaveBeenCalled();
  });
});
```

## Solana Program Tests

### Mollusk (Fast Unit Tests)
```rust
// programs/tests/unit/agent_tests.rs
use mollusk::Mollusk;
use solana_sdk::{account::AccountSharedData, pubkey::Pubkey};

#[test]
fn test_register_agent() {
    let program_id = Pubkey::new_unique();
    let mut mollusk = Mollusk::new(&program_id, "target/deploy/ghostspeak_marketplace");

    let authority = Pubkey::new_unique();
    let (agent_pda, _bump) = Pubkey::find_program_address(
        &[b"agent", authority.as_ref()],
        &program_id,
    );

    // Build instruction
    let instruction = build_register_instruction(agent_pda, authority);

    // Execute
    let result = mollusk.process_instruction(&instruction, &accounts);
    assert!(result.is_ok());

    // Verify state
    let agent_account = mollusk.get_account(&agent_pda).unwrap();
    let agent: Agent = Account::try_deserialize(&mut agent_account.data.as_slice()).unwrap();
    assert_eq!(agent.authority, authority);
}
```

### Anchor Tests (Integration)
```typescript
// programs/tests/integration/agent.spec.ts
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";

describe("agent", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.GhostspeakMarketplace as Program;

  it("registers an agent", async () => {
    const [agentPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("agent"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .registerAgent("Test Agent")
      .accounts({
        agent: agentPda,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const agent = await program.account.agent.fetch(agentPda);
    expect(agent.name).to.equal("Test Agent");
  });
});
```

## Convex Function Tests

```typescript
// apps/web/convex/agents.test.ts
import { convexTest } from "convex-test";
import { describe, test, expect } from "bun:test";
import schema from "./schema";
import { listAgents, registerAgent } from "./agents";

describe("agents", () => {
  test("should list agents", async () => {
    const t = convexTest(schema);

    // Seed data
    await t.mutation(registerAgent, {
      address: "test-1",
      name: "Agent 1",
      owner: "wallet-1",
    });

    // Query
    const agents = await t.query(listAgents, {});

    expect(agents.length).toBe(1);
    expect(agents[0].name).toBe("Agent 1");
  });

  test("should reject duplicate registration", async () => {
    const t = convexTest(schema);

    await t.mutation(registerAgent, {
      address: "test-1",
      name: "Agent 1",
      owner: "wallet-1",
    });

    await expect(
      t.mutation(registerAgent, {
        address: "test-1",
        name: "Agent 2",
        owner: "wallet-2",
      })
    ).rejects.toThrow("Agent already registered");
  });
});
```

## Test Organization

```
packages/sdk-typescript/
   tests/
      unit/              # Unit tests (isolated)
         agent.test.ts
         reputation.test.ts
         utils.test.ts
      integration/       # Integration tests (end-to-end)
          agent-lifecycle.test.ts

apps/web/
   __tests__/             # React component tests
      auth-sessions.test.ts
   e2e/                   # E2E tests
       wallet-auth.spec.ts

programs/
   tests/
       unit/              # Mollusk tests
       integration/       # Anchor tests
```

## Best Practices

1. **Test in isolation** - Mock external dependencies
2. **Use descriptive names** - `test("should register agent when valid data provided")`
3. **Arrange, Act, Assert** - Clear test structure
4. **Test edge cases** - Not just happy path
5. **Use fixtures** - Reusable test data
6. **Clean up** - Reset state between tests
7. **Run tests in CI** - Automated testing on every commit

## Coverage Thresholds

Target coverage:
- **Unit tests**: 80%+
- **Integration tests**: Critical paths
- **E2E tests**: User flows

```bash
# Generate coverage report
bun test --coverage

# View HTML report
open coverage/index.html
```

## Additional Resources

- Bun Test Docs: https://bun.sh/docs/cli/test
- Playwright Docs: https://playwright.dev
- React Testing Library: https://testing-library.com/docs/react-testing-library/intro
- Mollusk Docs: https://github.com/buffalojoec/mollusk
