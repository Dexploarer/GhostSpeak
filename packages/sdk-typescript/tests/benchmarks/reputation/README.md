# Reputation Benchmarking Framework

Open-source framework for testing reputation strategies against attack scenarios.

## Overview

This framework provides a comprehensive testing environment for evaluating reputation algorithms' resistance to common attack vectors in AI agent marketplaces. Instead of relying on financial stakes (pay-to-win), GhostSpeak uses merit-based reputation as the security model - making this framework **critical** for ensuring the system can't be gamed.

## Features

✅ **Attack Simulation** - Test against 8 common attack scenarios
✅ **Performance Metrics** - Measure resistance, detection accuracy, convergence time
✅ **Strategy Comparison** - Compare different reputation algorithms
✅ **Reproducible** - Fixed random seeds for consistent testing
✅ **CI/CD Ready** - Quick scenarios for automated testing

## Quick Start

```typescript
import { ReputationSimulator, SYBIL_ATTACK } from './benchmarks/reputation'

// Create simulator
const simulator = new ReputationSimulator()

// Run attack scenario
const result = await simulator.runScenario(SYBIL_ATTACK)

// Check results
console.log(`Attack Resistance: ${result.metrics.attackResistanceScore}/100`)
console.log(`Honest Agent Avg: ${result.metrics.honestAgentAvgReputation}`)
console.log(`Attacker Avg: ${result.metrics.attackerAvgReputation}`)
console.log(`Separation: ${result.metrics.reputationSeparation}`)
```

## Attack Scenarios

### 1. Honest Baseline
**Pure honest agents** - No attacks, establishes baseline performance.
- 100 honest agents
- 50 rounds
- Tests: Convergence time, resource efficiency

### 2. Sybil Attack
**Multiple coordinated fake agents** - Attackers create many accounts that boost each other.
- 50 attackers + 100 honest
- 100 rounds
- Tests: Can honest agents maintain higher reputation?

### 3. Reputation Gaming
**Artificial score inflation** - Attackers try to game the algorithm with fake perfect scores.
- 30 attackers + 100 honest
- 75 rounds
- Tests: Detection accuracy, false positive rate

### 4. Collusion Network
**Coordinated group** - Network of agents that help each other boost reputation.
- 40 attackers + 100 honest
- 80 rounds
- Tests: Network effect resistance

### 5. Selective Service
**Selectively good service** - Good to some users (build rep), bad to others (scam).
- 25 attackers + 100 honest
- 60 rounds
- Tests: Pattern detection, victim protection

### 6. Rapid Registration Spam
**Mass account creation** - Attacker floods marketplace with spam agents.
- 200 attackers + 100 honest
- 50 rounds
- Tests: Spam filtering effectiveness

### 7. Reputation Washing
**Account abandonment** - Abandon low-rep accounts, create new ones.
- 50 attackers + 100 honest
- 100 rounds
- Tests: Identity continuity enforcement

### 8. Mixed Attack
**Realistic combination** - Multiple attack types simultaneously.
- 60 attackers (20 each type) + 100 honest
- 100 rounds
- Tests: Real-world resilience

## Metrics

Each benchmark produces comprehensive metrics:

```typescript
interface StrategyBenchmarkResult {
  // Primary Metrics
  attackResistanceScore: number      // 0-100, higher = better
  gamingDetectionAccuracy: number    // 0-1, % of attacks detected
  falsePositiveRate: number          // 0-1, % honest flagged incorrectly

  // Performance Metrics
  convergenceTime: number            // Rounds until stabilization
  resourceEfficiency: number         // Operations per second

  // Separation Metrics
  honestAgentAvgReputation: number   // Average reputation (honest)
  attackerAvgReputation: number      // Average reputation (attackers)
  reputationSeparation: number       // Honest - Attacker gap
}
```

### Success Criteria

✅ **Attack Resistance > 50** - System resists attacks
✅ **Reputation Separation > 500** - Clear honest/attacker distinction (5%+)
✅ **Detection Accuracy > 0.7** - Catches 70%+ of attacks
✅ **False Positive Rate < 0.05** - Less than 5% honest agents flagged
✅ **Convergence Time < 80% of rounds** - Efficient stabilization
✅ **Resource Efficiency > 100 ops/sec** - Acceptable performance

## Running Benchmarks

### Full Test Suite
```bash
npm run test:benchmarks:reputation
```

### Quick Tests (CI/CD)
```bash
npm run test:benchmarks:quick
```

### Specific Scenario
```typescript
import { ReputationSimulator, SELECTIVE_SERVICE } from './benchmarks/reputation'

const simulator = new ReputationSimulator(42) // Fixed seed
const result = await simulator.runScenario(SELECTIVE_SERVICE)
```

### All Scenarios
```typescript
import { ReputationSimulator, ALL_SCENARIOS } from './benchmarks/reputation'

const simulator = new ReputationSimulator()

for (const scenario of ALL_SCENARIOS) {
  const result = await simulator.runScenario(scenario)
  console.log(`${scenario.name}: ${result.metrics.attackResistanceScore}/100`)
}
```

## Custom Scenarios

Create your own attack scenarios:

```typescript
import { AttackScenario, AgentBehaviorType } from './framework/types'

const customScenario: AttackScenario = {
  name: 'my-custom-attack',
  description: 'Custom attack vector',
  attackerCount: 20,
  honestAgentCount: 50,
  rounds: 60,
  attackStrategy: 'sybil-coordinated',
  attackerProfiles: [
    {
      agentId: 'attacker-1',
      behaviorType: AgentBehaviorType.Sybil,
      completionRate: 0.3,
      qualityScore: 40,
      timelinessFactor: 2.0,
      disputeRate: 0.5,
      clientSatisfaction: 20
    }
    // ... more profiles
  ],
  honestProfiles: [
    // ... honest agent profiles
  ]
}

const result = await simulator.runScenario(customScenario)
```

## Custom Reputation Strategies

Test alternative reputation algorithms:

```typescript
import { ReputationStrategy } from './framework/types'

const velocityDampenedStrategy: ReputationStrategy = {
  name: 'velocity-dampened',
  description: 'Prevents rapid reputation changes',
  calculateReputation: (currentData, jobPerformance) => {
    // Your custom algorithm
    const baseScore = calculateBaseScore(jobPerformance)
    const dampingFactor = calculateDampingFactor(currentData)
    return baseScore * dampingFactor
  },
  detectFraud: (data, job) => {
    // Custom fraud detection
    return detectSuspiciousPatterns(data, job)
  }
}

const result = await simulator.runScenario(SYBIL_ATTACK, velocityDampenedStrategy)
```

## Architecture

```
reputation/
├── framework/
│   ├── types.ts                    # Type definitions
│   └── ReputationSimulator.ts      # Core simulation engine
├── scenarios/
│   └── index.ts                    # Attack scenario definitions
├── strategies/                     # Custom reputation strategies (future)
├── index.ts                        # Public API
├── reputation-benchmarks.test.ts   # Test suite
└── README.md                       # This file
```

## Integration with CI/CD

Add to your `.github/workflows/ci.yml`:

```yaml
- name: Run Reputation Benchmarks
  run: npm run test:benchmarks:quick

- name: Verify Attack Resistance
  run: |
    npm run test:benchmarks:reputation -- --reporter=json > results.json
    node scripts/verify-resistance-threshold.js results.json 50
```

## Why This Matters

GhostSpeak uses **reputation as the security model** instead of financial stakes:

❌ **Staking** = Pay-to-win, barriers to entry
✅ **Reputation** = Merit-based, accessible to all

This means the reputation algorithm **must be attack-resistant**. This framework:
- ✅ Proves the system can't be easily gamed
- ✅ Provides quantitative security metrics
- ✅ Enables continuous testing of improvements
- ✅ Documents attack vectors for audit

## Example Output

```
📊 Sybil Attack Results:
  Honest Avg: 7842
  Attacker Avg: 3215
  Separation: 4627 (46.3%)
  Attack Resistance: 46.3/100
  Detection Accuracy: 73.2%
  Convergence Time: 67 rounds
  Resource Efficiency: 1247.3 ops/sec

✅ PASS - System successfully resists sybil attacks
```

## Future Enhancements

Planned additions:
- [ ] Stake-weighted reputation strategy (optional)
- [ ] Velocity dampening strategy
- [ ] Peer review / cross-validation strategy
- [ ] Real-world data replay
- [ ] Visual dashboard for results
- [ ] Automated regression testing

## Contributing

To add new scenarios:
1. Define scenario in `scenarios/index.ts`
2. Add test case in `reputation-benchmarks.test.ts`
3. Document expected behavior
4. Run full benchmark suite

To add new strategies:
1. Implement `ReputationStrategy` interface
2. Add to `strategies/` directory
3. Benchmark against all scenarios
4. Compare metrics with current strategy

## License

Same as GhostSpeak project (MIT)
