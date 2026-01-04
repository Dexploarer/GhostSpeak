# Gill Migration - Phase 4: Mollusk Testing Agent

**Use with**: `Task` tool, `subagent_type: "general-purpose"`
**Estimated time**: 4 hours
**Complexity**: Medium
**Can run in parallel with**: Phase 2 or 3 (independent Rust work)

---

## Prompt

```
You are adding Mollusk testing to the GhostSpeak Anchor program for faster unit tests.

## Context

This is Phase 4 of the Gill migration - focused on Rust/Anchor testing.

**Completed Phases**:
- Phase 1: web package ✅
- Phase 2: CLI package
- Phase 3: SDK package

**Current Testing**: The program uses `solana-program-test` with BanksClient - slow (~500ms per test)

**Goal**: Add Mollusk for fast unit tests (~5-10ms per test) = 50-100x speedup

## Your Task

Add Mollusk testing to `programs/ghostspeak-marketplace`.

### Step 1: Research Mollusk

FIRST, use deepwiki to understand Mollusk:
```
mcp__deepwiki__ask_question
repo: "solana-program/mollusk"
question: "How do I set up Mollusk for testing an Anchor program? Show complete example with Cargo.toml setup and test structure."
```

### Step 2: Update Cargo.toml

**File**: `programs/ghostspeak-marketplace/Cargo.toml`

Add Mollusk to dev-dependencies:
```toml
[dev-dependencies]
solana-program-test = "2.3"  # Keep for complex integration tests
mollusk-svm = "0.1"           # Add for fast unit tests
mollusk-svm-bencher = "0.1"   # Optional: for benchmarking
```

**IMPORTANT**: Check deepwiki for current version numbers - they may have changed!

### Step 3: Create Unit Test Directory

```bash
mkdir -p programs/ghostspeak-marketplace/tests/unit
```

### Step 4: Create Mollusk Test File

**File**: `programs/ghostspeak-marketplace/tests/unit/mod.rs`

```rust
//! Fast unit tests using Mollusk
//!
//! These tests run ~50-100x faster than solana-program-test
//! Use for single-instruction testing and TDD cycles

mod staking_tests;
mod agent_tests;
mod reputation_tests;
```

### Step 5: Convert Representative Tests

Pick 5 representative tests to convert:

**File**: `programs/ghostspeak-marketplace/tests/unit/staking_tests.rs`

```rust
use mollusk_svm::Mollusk;
use ghostspeak_marketplace::id;

#[test]
fn test_initialize_staking_config_fast() {
    // Load program
    let program_id = id();
    let mut mollusk = Mollusk::new(&program_id, "target/deploy/ghostspeak_marketplace");

    // Create test instruction
    let instruction = /* create instruction */;
    let accounts = vec![/* test accounts */];

    // Execute and validate (FAST!)
    let result = mollusk.process_and_validate_instruction(
        &instruction,
        &accounts,
        &[Check::success()],
    );

    assert!(result.is_ok());
}

#[test]
fn test_stake_tokens_fast() {
    let program_id = id();
    let mut mollusk = Mollusk::new(&program_id, "target/deploy/ghostspeak_marketplace");

    // ... test implementation
}
```

### Step 6: Test Structure Decision

**Keep solana-program-test for**:
- Multi-instruction flows
- Tests requiring validator state
- Cross-program invocations
- Full lifecycle tests

**Use Mollusk for**:
- Single instruction tests
- Error condition testing
- Compute unit validation
- TDD cycles (fast feedback)

### Step 7: Update Test Runner

**File**: `programs/ghostspeak-marketplace/tests/lib.rs` (or equivalent)

```rust
// Integration tests (slow but comprehensive)
mod integration;

// Unit tests (fast, use Mollusk)
mod unit;
```

### Step 8: Benchmark

Create a simple benchmark to compare:

```rust
// tests/benchmark.rs
use std::time::Instant;

#[test]
fn benchmark_mollusk_vs_banks() {
    // Mollusk test
    let start = Instant::now();
    // ... run mollusk test 10 times
    let mollusk_time = start.elapsed();

    // Banks test
    let start = Instant::now();
    // ... run banks test 10 times
    let banks_time = start.elapsed();

    println!("Mollusk: {:?}", mollusk_time / 10);
    println!("Banks: {:?}", banks_time / 10);
    println!("Speedup: {:.1}x", banks_time.as_millis() as f64 / mollusk_time.as_millis() as f64);
}
```

### Step 9: Build and Test

```bash
cd programs/ghostspeak-marketplace

# Build program first (Mollusk needs the .so file)
anchor build

# Run all tests
cargo test

# Run only Mollusk tests
cargo test unit::

# Run with output
cargo test unit:: -- --nocapture
```

### Success Criteria

- [ ] Mollusk added to Cargo.toml
- [ ] Unit test directory created
- [ ] 5 representative tests converted
- [ ] `anchor build` succeeds
- [ ] `cargo test` passes (all tests)
- [ ] Mollusk tests run <1 second total
- [ ] Documented which tests use which framework

### Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Unit test time | ~5 seconds | <0.5 seconds |
| TDD cycle | Slow | Fast |
| CI/CD time | ~5 minutes | ~2 minutes |

### Deliverables

1. Updated Cargo.toml
2. New tests/unit/ directory
3. 5 converted Mollusk tests
4. Benchmark results
5. Testing strategy documentation

### Important Notes

1. **Build First**: Mollusk needs the compiled .so file - always `anchor build` before testing

2. **Account Setup**: Mollusk requires manual account setup (no automatic account creation like BanksClient)

3. **Compute Units**: Mollusk accurately measures compute units - useful for optimization

4. **Keep Both**: Don't remove solana-program-test - it's still needed for integration tests

DO NOT modify TypeScript packages.
DO NOT remove existing integration tests.
```

---

## Pre-Flight Checklist

Before spawning this agent:

- [ ] Anchor and Rust toolchain installed
- [ ] Run `anchor build` to ensure program compiles
- [ ] Review existing tests in `programs/ghostspeak-marketplace/tests/`

## Deepwiki Queries (Critical)

The agent MUST run these queries first:

1. `repo: "solana-program/mollusk" question: "What is the current version of mollusk-svm and how do I add it to an Anchor project?"`

2. `repo: "solana-program/mollusk" question: "Show a complete example of testing an instruction with Mollusk including account setup"`

3. `repo: "solana-program/mollusk" question: "How does Mollusk differ from solana-program-test? When should I use each?"`

## Current Test Structure

Review these before migration:
```
programs/ghostspeak-marketplace/tests/
├── integration/
│   ├── staking_tests.rs         # 30+ test cases
│   ├── agent_registration_impl.rs
│   └── ghost_protect_tests.rs
└── property/
    └── crypto_properties.rs     # Property-based tests
```

## Expected Output

1. **Files Created**:
   - `programs/ghostspeak-marketplace/tests/unit/mod.rs`
   - `programs/ghostspeak-marketplace/tests/unit/staking_tests.rs`
   - `programs/ghostspeak-marketplace/tests/unit/agent_tests.rs`
   - `programs/ghostspeak-marketplace/tests/unit/reputation_tests.rs`

2. **Files Modified**:
   - `programs/ghostspeak-marketplace/Cargo.toml`
   - `programs/ghostspeak-marketplace/tests/lib.rs`

3. **Completion Report**: `GILL_PHASE4_MOLLUSK_COMPLETE.md`

## Parallel Execution Note

This phase is **independent of TypeScript work** and can run in parallel with:
- Phase 2 (CLI)
- Phase 3 (SDK)

The only dependency is that `anchor build` must succeed before Mollusk tests can run.

## Benchmark Template

Include this in the completion report:

```markdown
## Benchmark Results

| Test Type | Framework | Time (10 runs) | Avg per Test |
|-----------|-----------|----------------|--------------|
| Staking Init | Banks | Xms | Xms |
| Staking Init | Mollusk | Xms | Xms |
| Agent Register | Banks | Xms | Xms |
| Agent Register | Mollusk | Xms | Xms |

**Overall Speedup**: X.Xx faster
```
