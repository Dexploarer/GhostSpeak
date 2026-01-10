# GhostSpeak Documentation Update Plan
**Date:** January 9, 2026
**Status:** 🚧 In Progress

---

## Major Architectural Changes to Document

### 1. **Backend Architecture Shift**
- **Old**: Pure Solana on-chain
- **New**: **Convex backend** for off-chain data + Solana for settlements
  - Real-time database with Convex
  - Cron jobs for automated tasks
  - x402 payment indexing
  - Ghost Score calculation off-chain

### 2. **Observatory System (NEW)**
- **Caisper Observatory**: Automated agent testing platform
  - Hourly endpoint tests
  - Daily observation reports
  - Automatic credential issuance
  - API quality grading (A/B/C/D/F)
  - Uptime tracking (95%+ required)

### 3. **10 Verifiable Credentials (EXPANDED)**
**Old**: Basic credential system
**New**: Complete W3C VC system with 10 types:

1. **Agent Identity** - Auto-issued on registration
2. **Reputation Tier** - Bronze/Silver/Gold/Platinum (2k/5k/7.5k/9k Ghost Score)
3. **Payment Milestone** - 10/100/1000 x402 payments
4. **Staking** - Basic/Premium/Elite (1k/10k/100k GHOST)
5. **Verified Hire** - On-chain payment proof + client review
6. **Capability Verification** - Observatory live testing (30-day expiry)
7. **Uptime Attestation** - 95%+ uptime over 7+ days (rolling)
8. **API Quality Grade** - A/B/C/D/F from daily reports
9. **TEE Attestation** - Trusted Execution Environment proof (90-day expiry)
10. **Model Provenance** - LLM model documentation (EU AI Act)

### 4. **Ghost Score Calculation (ENHANCED)**
- **Old**: Simple 0-1000 score
- **New**: Research-backed multi-source aggregation (0-10000 scale)
  - 8 data sources with exponential time decay
  - Bayesian confidence intervals
  - Sybil resistance (outlier detection)
  - Credentials contribute 15% of score
  - Weighted by credential type (TEE: 2000 points, Capability: 1800 points)

### 5. **Discovery System (NEW)**
- `.well-known/x402.json` endpoints
- Agent discovery registry
- External ID mapping (Twitter, Discord, etc.)
- Automated agent claiming

### 6. **IPFS Integration (NEW)**
- Pinata custom gateway
- Credential metadata storage
- Data URI fallback for development
- Custom gateway: `coffee-brilliant-python-998.mypinata.cloud`

---

## Documentation Structure Changes Needed

### ✅ Keep (Good Structure)
- Mintlify docs.json configuration
- Navigation structure (10 major sections)
- AI-native contextual menu (ChatGPT, Claude, Perplexity, Cursor)
- llms.txt for AI crawler optimization

### 🔄 Update (Outdated Content)

#### **Introduction Section**
- [x] `index.mdx` - Update Ghost Score scale (0-10000), mention Convex
- [ ] `architecture-overview.mdx` - Add Convex backend, Observatory, Discovery
- [ ] `quickstart.mdx` - Update with new credential flow

#### **Core Concepts**
- [ ] `concepts/credentials/overview.mdx` - Document all 10 VC types
- [ ] `concepts/credentials/types.mdx` - Add new credential types (6-10)
- [ ] `concepts/ghost-score/algorithm.mdx` - Update with new 8-source calculation
- [ ] `concepts/ghost-score/tiers.mdx` - Update thresholds (2k/5k/7.5k/9k)

#### **SDK Documentation**
- [ ] `sdk/installation.mdx` - Verify current installation steps
- [ ] `sdk/credentials.mdx` - Add examples for all 10 credential types
- [ ] `sdk/reputation.mdx` - Update Ghost Score calculation examples

#### **Dashboard**
- [ ] `dashboard/credentials.mdx` - Document new credential types
- [ ] `dashboard/ghost-score.mdx` - Update scoring breakdown

### ➕ Add (Missing Content)

#### **New Sections Needed**
1. **Observatory Documentation**
   - `concepts/observatory/overview.mdx` - What is Caisper Observatory
   - `concepts/observatory/testing.mdx` - How endpoint testing works
   - `concepts/observatory/grading.mdx` - API quality grading system
   - `concepts/observatory/credentials.mdx` - Automated credential issuance

2. **Convex Backend**
   - `concepts/backend/convex.mdx` - Convex architecture
   - `concepts/backend/cron-jobs.mdx` - Scheduled tasks
   - `concepts/backend/indexing.mdx` - x402 payment indexing

3. **Discovery System**
   - `concepts/discovery/overview.mdx` - Agent discovery protocol
   - `concepts/discovery/well-known.mdx` - .well-known/x402.json format
   - `concepts/discovery/claiming.mdx` - External agent claiming

4. **Updated Guides**
   - `guides/earning-credentials.mdx` - How to earn all 10 credentials
   - `guides/observatory-integration.mdx` - Register with Observatory
   - `guides/ipfs-metadata.mdx` - IPFS credential metadata

---

## Priority Order

### **Phase 1: Core Architecture Updates (Immediate)**
1. Update `introduction/architecture-overview.mdx` with Convex + Observatory
2. Update `concepts/credentials/types.mdx` with all 10 credentials
3. Update `concepts/ghost-score/algorithm.mdx` with new calculation
4. Create `CREDENTIALS_INTEGRATION_GUIDE.mdx` reference in docs

### **Phase 2: New Feature Documentation (High Priority)**
1. Create Observatory section (4 pages)
2. Create Convex backend section (3 pages)
3. Create Discovery system section (3 pages)
4. Update all SDK examples

### **Phase 3: Guides & Tutorials (Medium Priority)**
1. Create earning credentials guide
2. Create Observatory integration guide
3. Update quickstart with new flow
4. Update testing guide

### **Phase 4: Polish & Verification (Low Priority)**
1. Verify all code examples work
2. Update screenshots/diagrams
3. Fix broken links
4. Update llms.txt with new content

---

## Files to Reference

**Already Created (Use as Source of Truth):**
- `apps/web/CREDENTIALS_INTEGRATION_GUIDE.md` - Complete 10 VC integration guide
- `apps/web/DID_VC_SETUP.md` - Setup and code examples
- `apps/web/PHASE3_STATUS.md` - Verification and status
- `convex/credentials.ts` - All credential implementations
- `convex/ghostScoreCalculator.ts` - Scoring algorithm
- `convex/observation.ts` - Observatory system

**Code Examples to Extract:**
- Integration points for automatic credential issuance
- Ghost Score calculation examples
- Observatory test triggers
- Cron job schedules

---

## Metrics for Success

- [ ] All 10 credential types documented
- [ ] Observatory system fully explained
- [ ] Convex backend architecture clear
- [ ] Discovery system documented
- [ ] All code examples verified working
- [ ] Main README links to correct docs
- [ ] llms.txt updated with new content
- [ ] No broken links or outdated information

---

## Next Actions

1. **Start with high-impact updates**: architecture-overview.mdx
2. **Create new sections**: Observatory, Convex, Discovery
3. **Update credentials documentation**: Add types 6-10
4. **Verify code examples**: Test all TypeScript snippets
5. **Update main README**: Fix doc links

---

**Status**: Ready to proceed with Phase 1 updates.
