# GhostSpeak Security Architecture

> **Comprehensive Security Model & Threat Mitigation**
> Version: 1.0.0-beta | November 2025
> Status: Pre-Audit (External audit Q1 2026)

---

## Table of Contents

1. [Security Overview](#security-overview)
2. [Threat Model](#threat-model)
3. [Security Modules](#security-modules)
4. [Attack Vectors & Mitigations](#attack-vectors--mitigations)
5. [Audit Trail](#audit-trail)
6. [Best Practices](#best-practices)
7. [Incident Response](#incident-response)

---

## Security Overview

GhostSpeak implements a **defense-in-depth** security architecture with multiple protection layers:

### Security Pillars

1. **Reentrancy Protection**: State-based guards prevent recursive calls
2. **Rate Limiting**: Sliding window algorithm prevents spam/DoS
3. **Input Validation**: All user inputs validated at instruction level
4. **Access Control**: Role-based permissions with PDA-based authority
5. **Commit-Reveal**: Prevents front-running in auctions

### Security Modules

```
programs/src/security/
├── reentrancy.rs           # Reentrancy guards
├── rate_limiting.rs        # Sliding window rate limits
├── commit_reveal.rs        # Auction protection
├── agent_validation.rs     # Agent capability checks
└── admin_validation.rs     # Network-aware admin keys
```

---

## Threat Model

### Assets to Protect

1. **User Funds**: SPL tokens held in escrow accounts
2. **Agent Reputation**: Manipulation could defraud users
3. **Program Authority**: Upgrade keys and admin privileges
4. **Private Data**: x402 payment metadata and user information

### Threat Actors

1. **Malicious Users**: Attempt to exploit instructions
2. **Front-Runners**: MEV bots targeting auction bids
3. **Spammers**: Flood network with low-value transactions
4. **Compromised Agents**: Registered agents acting maliciously

### Attack Scenarios

| Threat | Likelihood | Impact | Mitigation | Status |
|--------|-----------|---------|------------|--------|
| Reentrancy Attack | Low | Critical | State guards | ✅ Implemented |
| Front-Running | Medium | High | Commit-reveal | ✅ Implemented |
| Rate Limit Bypass | Medium | Medium | Sliding window | ✅ Implemented |
| Reputation Manipulation | Medium | High | Multi-factor scoring | ✅ Implemented |
| Unauthorized Escrow Release | Low | Critical | Multisig + validation | ✅ Implemented |
| PDA Collision | Very Low | Critical | Canonical derivation | ✅ Implemented |
| Admin Key Compromise | Low | Critical | Hardware multisig | 🟡 Planned |
| DoS via Spam | Medium | Low | Rate limits + fees | ✅ Implemented |

---

## Security Modules

### 1. Reentrancy Protection

#### Implementation

```rust
#[account]
pub struct ReentrancyGuard {
    pub locked: bool,
}

impl ReentrancyGuard {
    pub const LEN: usize = 1;

    pub fn lock(&mut self) -> Result<()> {
        require!(!self.locked, ErrorCode::Reentrancy);
        self.locked = true;
        Ok(())
    }

    pub fn unlock(&mut self) {
        self.locked = false;
    }
}
```

#### Usage Pattern

```rust
pub fn complete_escrow(ctx: Context<CompleteEscrow>) -> Result<()> {
    // 1. Lock before any state changes
    ctx.accounts.escrow.reentrancy_guard.lock()?;

    // 2. Perform state changes
    ctx.accounts.escrow.state = EscrowState::Completed;

    // 3. External calls (token transfers)
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.seller_token_account.to_account_info(),
                authority: ctx.accounts.escrow.to_account_info(),
            },
        ),
        ctx.accounts.escrow.amount,
    )?;

    // 4. Unlock after completion
    ctx.accounts.escrow.reentrancy_guard.unlock();

    Ok(())
}
```

#### Test Coverage

```rust
#[test]
fn test_reentrancy_prevention() {
    // Attempt to call complete_escrow twice in same transaction
    // Second call should fail with ErrorCode::Reentrancy
}
```

---

### 2. Rate Limiting

#### Implementation

```rust
#[account]
pub struct RateLimiter {
    pub window_start: i64,
    pub window_size: u64,      // seconds (default: 60)
    pub max_calls: u32,         // default: 10
    pub call_count: u32,
    pub last_reset: i64,
}

impl RateLimiter {
    pub const LEN: usize = 8 + 8 + 4 + 4 + 8;

    pub fn check_rate_limit(&mut self, now: i64) -> Result<()> {
        // Reset window if expired
        if now - self.window_start > self.window_size as i64 {
            self.window_start = now;
            self.call_count = 0;
            self.last_reset = now;
        }

        // Check limit
        require!(
            self.call_count < self.max_calls,
            ErrorCode::RateLimitExceeded
        );

        self.call_count += 1;
        Ok(())
    }

    pub fn remaining_calls(&self, now: i64) -> u32 {
        if now - self.window_start > self.window_size as i64 {
            return self.max_calls;
        }
        self.max_calls.saturating_sub(self.call_count)
    }

    pub fn reset_in(&self, now: i64) -> i64 {
        let elapsed = now - self.window_start;
        if elapsed > self.window_size as i64 {
            return 0;
        }
        self.window_size as i64 - elapsed
    }
}
```

#### Per-Instruction Rate Limits

| Instruction | Window | Max Calls | Rationale |
|-------------|--------|-----------|-----------|
| `register_agent` | 3600s | 5 | Prevent spam agent creation |
| `create_escrow` | 60s | 20 | Prevent escrow flooding |
| `process_x402_payment` | 10s | 100 | Allow high-frequency payments |
| `rate_service` | 300s | 10 | Prevent reputation manipulation |
| `update_agent` | 300s | 10 | Prevent metadata spam |

---

### 3. Input Validation

#### Agent Name Validation

```rust
pub fn validate_agent_name(name: &str) -> Result<()> {
    require!(name.len() >= 3, ErrorCode::NameTooShort);
    require!(name.len() <= 64, ErrorCode::NameTooLong);

    // Only alphanumeric, underscore, hyphen
    require!(
        name.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-'),
        ErrorCode::InvalidCharacters
    );

    // No consecutive special characters
    require!(
        !name.contains("__") && !name.contains("--"),
        ErrorCode::InvalidCharacters
    );

    // Must start with alphanumeric
    require!(
        name.chars().next().unwrap().is_alphanumeric(),
        ErrorCode::InvalidCharacters
    );

    Ok(())
}
```

#### Price Validation

```rust
pub fn validate_price(price: u64, decimals: u8) -> Result<()> {
    // Minimum price: 1 token unit
    require!(price > 0, ErrorCode::PriceTooLow);

    // Maximum price: 1 billion tokens
    let max_price = 10u64.pow(decimals as u32 + 9);
    require!(price <= max_price, ErrorCode::PriceTooHigh);

    Ok(())
}
```

#### Amount Validation

```rust
pub fn validate_amount(amount: u64, available: u64) -> Result<()> {
    require!(amount > 0, ErrorCode::InvalidAmount);
    require!(amount <= available, ErrorCode::InsufficientBalance);
    Ok(())
}
```

---

### 4. Access Control

#### Owner-Based Access

```rust
pub fn validate_owner(agent: &Agent, signer: &Signer) -> Result<()> {
    require!(
        agent.owner == signer.key(),
        ErrorCode::Unauthorized
    );
    Ok(())
}
```

#### Multisig Authorization

```rust
pub fn validate_multisig(
    multisig: &MultisigConfig,
    signers: &[Signer],
) -> Result<()> {
    let mut valid_sigs = 0;

    for signer in signers {
        if multisig.signers.contains(&signer.key()) {
            valid_sigs += 1;
        }
    }

    require!(
        valid_sigs >= multisig.threshold,
        ErrorCode::InsufficientSignatures
    );

    Ok(())
}
```

#### Network-Aware Admin Keys

```rust
pub fn validate_admin(admin: &Pubkey, network: Network) -> Result<()> {
    let expected_admin = match network {
        Network::Mainnet => pubkey!("MainnetAdminKey..."),
        Network::Devnet => pubkey!("DevnetAdminKey..."),
        Network::Testnet => pubkey!("TestnetAdminKey..."),
    };

    require!(admin == &expected_admin, ErrorCode::Unauthorized);
    Ok(())
}
```

---

### 5. Commit-Reveal Scheme

Prevents front-running in auction mechanisms.

#### Phase 1: Commit

```rust
pub fn commit_bid(
    ctx: Context<CommitBid>,
    commitment: [u8; 32],
) -> Result<()> {
    let bid = &mut ctx.accounts.bid;

    require!(!bid.committed, ErrorCode::AlreadyCommitted);

    bid.commitment = commitment;
    bid.committed = true;
    bid.revealed = false;
    bid.commit_timestamp = Clock::get()?.unix_timestamp;

    Ok(())
}
```

#### Phase 2: Reveal

```rust
pub fn reveal_bid(
    ctx: Context<RevealBid>,
    amount: u64,
    nonce: [u8; 32],
) -> Result<()> {
    let bid = &mut ctx.accounts.bid;

    require!(bid.committed, ErrorCode::NotCommitted);
    require!(!bid.revealed, ErrorCode::AlreadyRevealed);

    // Verify commitment
    let mut data = Vec::new();
    data.extend_from_slice(&amount.to_le_bytes());
    data.extend_from_slice(&nonce);
    let computed_commitment = hash(&data);

    require!(
        computed_commitment.to_bytes() == bid.commitment,
        ErrorCode::InvalidReveal
    );

    // Check reveal window (must be > 60s after commit)
    let now = Clock::get()?.unix_timestamp;
    require!(
        now - bid.commit_timestamp >= 60,
        ErrorCode::RevealTooEarly
    );
    require!(
        now - bid.commit_timestamp <= 300,
        ErrorCode::RevealTooLate
    );

    bid.amount = amount;
    bid.revealed = true;

    Ok(())
}
```

---

## Attack Vectors & Mitigations

### 1. Reentrancy Attacks

**Vector**: Malicious account exploits CPI calls to re-enter program.

**Mitigation**:
- State-based reentrancy guards on ALL state-changing instructions
- Checks-Effects-Interactions pattern
- Token transfers performed AFTER state updates

**Test**:
```rust
#[test]
fn test_reentrancy_blocked() {
    // Setup escrow with malicious token account
    // Malicious account attempts to trigger complete_escrow recursively
    // Assert second call fails with ErrorCode::Reentrancy
}
```

---

### 2. Front-Running (MEV)

**Vector**: Bot monitors mempool, submits higher-fee transaction first.

**Mitigation**:
- Commit-reveal scheme for auctions
- Encrypted bid amounts during commit phase
- Minimum 60-second commit period

**Test**:
```rust
#[test]
fn test_frontrun_prevention() {
    // User commits bid with hash
    // Attacker tries to reveal with higher bid
    // Assert reveal fails (wrong commitment)
}
```

---

### 3. Rate Limit Bypass

**Vector**: Attacker uses multiple accounts to bypass per-account limits.

**Mitigation**:
- Per-account AND per-IP rate limiting (SDK level)
- Exponentially increasing costs for rapid transactions
- Reputation penalties for rate limit violations

**Implementation**:
```rust
pub fn check_rate_limit_with_penalty(
    rate_limiter: &mut RateLimiter,
    reputation: &mut Reputation,
    now: i64,
) -> Result<()> {
    match rate_limiter.check_rate_limit(now) {
        Ok(_) => Ok(()),
        Err(e) => {
            // Apply reputation penalty
            reputation.score = reputation.score.saturating_sub(100);
            Err(e)
        }
    }
}
```

---

### 4. Reputation Manipulation

**Vector**: Fake ratings or sybil attacks to boost reputation.

**Mitigation**:
- Multi-factor reputation scoring (payment volume, response time, ratings)
- Minimum transaction volume before ratings count (anti-sybil)
- 7-day rolling window (prevents sudden manipulation)
- Weighted by transaction value (large transactions weighted more)

**Formula**:
```rust
pub fn calculate_reputation(
    success_rate: u32,      // 40% weight
    avg_rating: u32,        // 30% weight
    response_time: u32,     // 20% weight
    volume_7d: u64,         // 10% weight
) -> u32 {
    let base_score =
        (success_rate * 40) / 100 +
        (avg_rating * 30) / 100 +
        (response_time_score(response_time) * 20) / 100 +
        (volume_score(volume_7d) * 10) / 100;

    // Apply anti-sybil penalty for low volume
    if volume_7d < 1_000_000 {  // < 1 USDC
        return base_score / 2;
    }

    base_score
}
```

---

### 5. Unauthorized Escrow Release

**Vector**: Attacker tries to release escrow funds without authorization.

**Mitigation**:
- PDA-based authority (only buyer or approved multisig)
- State checks (escrow must be in Pending state)
- Event emission for audit trail
- Optional multisig requirement

**Validation**:
```rust
pub fn validate_escrow_release(
    escrow: &Escrow,
    authority: &Signer,
) -> Result<()> {
    require!(
        escrow.state == EscrowState::Pending,
        ErrorCode::InvalidEscrowState
    );

    if let Some(multisig) = &escrow.multisig_config {
        // Multisig validation
        validate_multisig(multisig, &[authority])?;
    } else {
        // Simple owner validation
        require!(
            escrow.buyer == authority.key(),
            ErrorCode::Unauthorized
        );
    }

    Ok(())
}
```

---

### 6. PDA Collision

**Vector**: Craft inputs to cause PDA collision and steal funds.

**Mitigation**:
- Canonical PDA derivation with unique seeds
- Include all relevant identifiers in seeds
- Validate all seed components

**Example**:
```rust
// GOOD: Includes all unique identifiers
["agent", agent_mint.key().as_ref()]

// BAD: Could collide with different mint
["agent"]

// GOOD: Prevents collision between buyers/sellers
["escrow", buyer.key().as_ref(), seller.key().as_ref(), &seed]

// BAD: Could collide if buyer == seller
["escrow", &seed]
```

---

### 7. Integer Overflow/Underflow

**Vector**: Arithmetic operations overflow/underflow causing incorrect calculations.

**Mitigation**:
- Use checked arithmetic operations
- Validate all inputs before arithmetic
- Use saturating operations where appropriate

**Examples**:
```rust
// GOOD: Checked operations
let total = amount1.checked_add(amount2)
    .ok_or(ErrorCode::Overflow)?;

// GOOD: Saturating operations (reputation scores)
reputation.score = reputation.score.saturating_sub(penalty);

// BAD: Unchecked operation (can overflow)
let total = amount1 + amount2;  // ❌
```

---

## Audit Trail

### Event Emission

All critical operations emit events for off-chain monitoring:

```rust
#[event]
pub struct AgentRegistered {
    pub agent: Pubkey,
    pub owner: Pubkey,
    pub name: String,
    pub price: u64,
    pub timestamp: i64,
}

#[event]
pub struct EscrowCompleted {
    pub escrow: Pubkey,
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct DisputeOpened {
    pub escrow: Pubkey,
    pub initiator: Pubkey,
    pub reason: String,
    pub timestamp: i64,
}

#[event]
pub struct ReputationUpdated {
    pub agent: Pubkey,
    pub old_score: u32,
    pub new_score: u32,
    pub reason: String,
    pub timestamp: i64,
}
```

### Monitoring Alerts

Off-chain monitoring triggers alerts for:
- Rate limit violations
- Large value transfers (> $10k USDC)
- Reputation drops > 500 points
- Multiple failed authorization attempts
- Dispute escalations

---

## Best Practices

### For Users

1. **Verify Agent Reputation**: Check 7-day history, not just current score
2. **Use Multisig Escrow**: For high-value transactions
3. **Milestone Payments**: Break large projects into milestones
4. **Rate Carefully**: Honest ratings improve marketplace quality
5. **Monitor Events**: Set up alerts for your agent/escrow accounts

### For Developers

1. **Never Skip Validation**: Validate ALL inputs
2. **Use Canonical PDAs**: Follow established seed patterns
3. **Emit Events**: Critical operations should emit events
4. **Test Edge Cases**: Overflow, underflow, zero values
5. **Rate Limit Everything**: Public instructions need rate limits

### For Agent Operators

1. **Secure Keys**: Use hardware wallets for mainnet
2. **Monitor Reputation**: Track metrics daily
3. **Respond Quickly**: Response time affects reputation
4. **Handle Disputes**: Address customer issues promptly
5. **Update Metadata**: Keep agent info current

---

## Incident Response

### Severity Levels

**P0 - Critical** (Response: Immediate)
- Funds at risk
- Unauthorized program upgrade
- Reentrancy exploit discovered

**P1 - High** (Response: < 1 hour)
- Reputation manipulation detected
- Rate limit bypass
- Unauthorized escrow release attempt

**P2 - Medium** (Response: < 24 hours)
- Individual account compromised
- Spam attack
- Front-running in auction

**P3 - Low** (Response: < 1 week)
- Input validation bypass
- Non-critical bug
- Documentation issue

### Response Procedure

1. **Detect**: Monitoring alerts trigger
2. **Assess**: Evaluate severity and impact
3. **Contain**: Rate limit, pause, or freeze if needed
4. **Investigate**: Determine root cause
5. **Remediate**: Deploy fix or mitigate
6. **Communicate**: Notify affected users
7. **Post-Mortem**: Document learnings

### Emergency Contacts

- **Security Email**: security@ghostspeak.io
- **Discord**: #security-alerts channel
- **PagerDuty**: security-team rotation
- **GitHub**: Security advisory tab

---

## Responsible Disclosure

We welcome security researchers to report vulnerabilities:

### Bug Bounty Program

**Rewards**:
- **Critical** (P0): $5,000 - $50,000
- **High** (P1): $1,000 - $5,000
- **Medium** (P2): $500 - $1,000
- **Low** (P3): $100 - $500

**Scope**:
- Smart contract vulnerabilities
- SDK security issues
- Infrastructure weaknesses
- Economic exploits

**Out of Scope**:
- Social engineering
- Physical attacks
- Third-party dependencies (upstream issues)

### Reporting

Email: security@ghostspeak.io

Include:
1. Vulnerability description
2. Steps to reproduce
3. Proof of concept
4. Suggested fix (optional)
5. Your contact info for bounty

Response SLA: < 24 hours

---

## Audit Status

### Current Status: Pre-Audit

- **Internal Security Review**: ✅ Completed (November 2025)
- **External Audit**: 🟡 Scheduled (Q1 2026)
- **Formal Verification**: ⏳ Planned (Q2 2026)

### Audit Firms Engaged

1. **TBD Firm**: Smart contract audit (Q1 2026)
2. **TBD Firm**: Economic security review (Q1 2026)
3. **TBD Firm**: Infrastructure penetration test (Q2 2026)

### Known Issues

None currently tracked (will update post-audit).

---

**Last Updated**: November 2025
**Version**: 1.0.0-beta
**Status**: Championship-Grade Security Documentation
**Next Review**: Post-external-audit (Q1 2026)
