# GhostSpeak Incident Response Playbook

## Overview

This playbook defines procedures for responding to production incidents on mainnet.

**Scope:** Mainnet deployment only
**Audience:** Engineering team, on-call engineers, management
**Review:** Quarterly

---

## Severity Levels

### Critical (P0)

- Service completely unavailable
- Smart contract vulnerability actively exploited
- Data breach or unauthorized access
- Funds at risk or lost

**Response Time:** Immediate
**Escalation:** All hands on deck

### High (P1)

- Major feature broken
- Transaction success rate < 90%
- RPC provider outage
- Significant user impact

**Response Time:** Within 15 minutes
**Escalation:** On-call engineer + manager

### Medium (P2)

- Minor feature degraded
- Performance issues
- Elevated error rates
- Limited user impact

**Response Time:** Within 1 hour
**Escalation:** On-call engineer

### Low (P3)

- Cosmetic issues
- Non-critical bugs
- Enhancement requests

**Response Time:** Next business day
**Escalation:** None

---

## Incident Types

## 1. Critical Smart Contract Bug

### Symptoms
- Funds locked in escrow cannot be released
- Unauthorized state changes detected
- Arithmetic overflow/underflow causing incorrect balances
- PDA collision allowing account takeover

### Immediate Actions (First 15 Minutes)

1. **Alert the Team**
   ```
   POST to Slack: #incidents
   "🚨 CRITICAL: Smart contract vulnerability detected in [instruction_name]
   Impact: [describe]
   Status: Investigating
   Response Team: @engineering-team"
   ```

2. **Assess Impact**
   - Which instruction is affected?
   - How many users impacted?
   - What is the potential loss?
   - Is exploitation ongoing?

3. **Contain the Incident**
   - **If pause function exists:**
     ```bash
     # Create emergency pause proposal (multisig)
     squads create-proposal \
       --multisig MULTISIG_ADDRESS \
       --title "EMERGENCY: Pause Protocol" \
       --description "Critical vulnerability in [instruction]" \
       --urgent \
       --cluster mainnet
     ```
   - **If no pause function:**
     - Contact RPC providers to potentially filter transactions
     - Post urgent notice on website/Twitter
     - Prepare emergency program upgrade

4. **Notify Stakeholders**
   - Post on Twitter: "We are investigating a technical issue. Transactions may be paused temporarily."
   - Update Discord: Pin message in #announcements
   - Email VIP users (if time permits)

### Investigation (Next 30 Minutes)

5. **Reproduce the Bug**
   - Identify the vulnerable code path
   - Reproduce on devnet if possible
   - Document exact steps to exploit

6. **Assess Severity**
   - Can funds be drained?
   - Can state be corrupted permanently?
   - Is user data exposed?
   - What is the maximum potential loss?

7. **Plan Remediation**
   - Can bug be fixed with a hotfix?
   - Does this require a full program upgrade?
   - Can we migrate state to a new program?

### Resolution (Next 2-24 Hours)

8. **Develop Fix**
   - Code the fix
   - Write tests that catch the bug
   - Review with at least 2 senior engineers
   - Test thoroughly on devnet

9. **Deploy Fix**
   - Build verifiable binary: `anchor build --verifiable`
   - Create multisig proposal for upgrade
   - Get 3-of-5 approvals
   - Execute upgrade
   - Verify fix deployed correctly

10. **Resume Operations**
    - Un-pause protocol (if paused)
    - Monitor closely for 24 hours
    - Post all-clear message to users

### Post-Incident (Within 7 Days)

11. **Post-Mortem**
    - Write detailed incident report
    - Timeline of events
    - Root cause analysis
    - What went well / what went wrong
    - Action items to prevent recurrence

12. **User Communication**
    - Public incident report (transparency)
    - Compensation plan for affected users (if applicable)
    - Updated security measures

13. **Security Review**
    - Request emergency audit of fix
    - Review similar code patterns
    - Update testing procedures

---

## 2. Smart Contract Exploit in Progress

### Symptoms
- Unusual transaction patterns detected
- Multiple users reporting unexpected behavior
- Funds being drained from protocol accounts
- Governance votes being manipulated

### Immediate Actions (First 5 Minutes)

1. **EMERGENCY ALERT**
   ```
   @channel CRITICAL SECURITY INCIDENT
   Potential exploit in progress
   DO NOT EXECUTE ANY MULTISIG PROPOSALS
   War room: [Zoom/Discord link]
   ```

2. **Stop the Bleeding**
   - Execute emergency pause (if available)
   - Contact Solana validators to potentially halt affected transactions
   - Contact RPC providers (Helius, Triton, etc.) to filter exploit transactions

3. **Preserve Evidence**
   - Save all transaction signatures
   - Screenshot wallet explorer
   - Export affected account states
   - Document timestamps

4. **Alert Authorities**
   - If large funds at risk, contact:
     - Solana Foundation: security@solana.org
     - FBI IC3: https://ic3.gov (for >$100k loss)
     - Local law enforcement

### Containment (Next 30 Minutes)

5. **Identify Attack Vector**
   - Which instruction is being exploited?
   - What is the attack pattern?
   - Who is the attacker (wallet address)?
   - How much has been stolen?

6. **Mitigate Further Damage**
   - If possible, drain remaining vulnerable funds to safe multisig
   - Block attacker's wallet address (if application-level controls exist)
   - Upgrade program to patch vulnerability

7. **Public Communication**
   ```
   Tweet: "GhostSpeak has detected suspicious activity and has temporarily
   paused the protocol while we investigate. User funds are safe. Updates
   to follow. Do not interact with any unofficial links."
   ```

### Recovery (Next 24-72 Hours)

8. **Patch Vulnerability**
   - Develop fix
   - Test extensively
   - Deploy via multisig
   - Verify exploit no longer works

9. **Assess Losses**
   - Total amount stolen
   - Affected users
   - Protocol reserve impact
   - Reputational damage

10. **Compensation Plan**
    - Protocol treasury covers losses (if feasible)
    - Partial reimbursement plan
    - Insurance claim (if covered)

11. **Resume Operations**
    - Un-pause with enhanced monitoring
    - 24/7 engineering coverage for 1 week
    - Reduced transaction limits initially

### Post-Incident

12. **Public Disclosure**
    - Detailed post-mortem (30 days after resolution)
    - Compensation details
    - Security improvements made

13. **Security Enhancements**
    - Emergency audit
    - Bug bounty increase
    - Additional security tooling
    - Incident response training

---

## 3. RPC Provider Outage

### Symptoms
- Transactions failing to confirm
- Wallet connections timing out
- High RPC latency (>5s)
- Users reporting "Network error"

### Immediate Actions (First 5 Minutes)

1. **Verify Outage**
   ```bash
   # Test primary RPC
   curl -X POST https://api.mainnet-beta.solana.com \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'

   # Test backup RPC
   curl -X POST https://solana-mainnet.rpcpool.com/YOUR_KEY \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
   ```

2. **Switch to Backup RPC**
   - Update environment variable:
     ```bash
     # In production environment
     export SOLANA_RPC_URL=https://backup-rpc-url.com
     ```
   - Restart API servers
   - Verify transactions working

3. **Notify Users**
   ```
   Tweet: "We are experiencing temporary delays due to RPC provider issues.
   Switching to backup infrastructure. Transactions may be slower than usual."
   ```

### Resolution (Next 1-2 Hours)

4. **Contact RPC Provider**
   - Open support ticket
   - Escalate to account manager
   - Request ETA for resolution

5. **Monitor Performance**
   - Track RPC latency
   - Monitor transaction success rate
   - Watch for any side effects of failover

6. **Resume Normal Operations**
   - Once primary RPC restored, switch back
   - Verify all services working
   - Post all-clear message

### Post-Incident

7. **Review RPC Strategy**
   - Evaluate provider reliability
   - Consider additional backup providers
   - Implement automatic failover
   - Negotiate better SLA

---

## 4. Database Corruption/Outage

### Symptoms
- Database connection errors
- Data inconsistencies
- Queries timing out
- Application errors related to DB

### Immediate Actions (First 10 Minutes)

1. **Assess Severity**
   - Can we connect to database?
   - Is data corrupted or just unavailable?
   - Is this a connection issue or data loss?

2. **Enable Read-Only Mode (if possible)**
   - Prevent further writes that could corrupt data
   - Allow read operations to continue

3. **Check Recent Backups**
   ```bash
   # List available backups
   aws s3 ls s3://ghostspeak-backups/

   # Verify most recent backup
   aws s3 cp s3://ghostspeak-backups/latest.sql.gz /tmp/
   ```

### Recovery (Next 1-6 Hours)

4. **Restore from Backup**
   ```bash
   # Download backup
   aws s3 cp s3://ghostspeak-backups/TIMESTAMP.sql.gz /tmp/

   # Restore to database
   gunzip /tmp/TIMESTAMP.sql.gz
   psql -U username -d ghostspeak_mainnet -f /tmp/TIMESTAMP.sql
   ```

5. **Replay Missed Transactions**
   - Identify last backup timestamp
   - Query Solana blockchain for transactions since then
   - Re-index missed data

6. **Verify Data Integrity**
   - Run consistency checks
   - Compare critical counts with blockchain
   - Spot-check user accounts

### Prevention

7. **Increase Backup Frequency**
   - Change from 6 hours to 1 hour
   - Enable point-in-time recovery
   - Test restore procedure monthly

---

## 5. DDoS Attack

### Symptoms
- Extremely high traffic volume
- API rate limits constantly exceeded
- Legitimate users unable to access site
- Single IP or IP range making excessive requests

### Immediate Actions (First 5 Minutes)

1. **Verify Attack**
   - Check CloudFlare analytics
   - Review server logs for traffic patterns
   - Identify attack vectors (API, web, RPC)

2. **Enable DDoS Protection**
   ```bash
   # Cloudflare: Enable "I'm Under Attack" mode
   # This will show challenge page to suspicious traffic
   ```

3. **Rate Limiting**
   - Lower rate limits temporarily
   - Block suspicious IPs/ranges
   - Enable CAPTCHA for high-risk endpoints

### Mitigation (Next 30 Minutes)

4. **Analyze Attack Pattern**
   - What endpoints are targeted?
   - What is the attack vector (GET, POST, WebSocket)?
   - Are they using botnets or single source?

5. **Apply Targeted Blocks**
   - Block abusive IPs
   - Block user-agents (if bot pattern detected)
   - Geo-block if attack from specific country (temporary)

6. **Scale Infrastructure**
   - Increase server capacity temporarily
   - Enable auto-scaling
   - Activate CDN caching more aggressively

### Post-Attack

7. **Permanent Protections**
   - Implement Web Application Firewall (WAF) rules
   - Set up anomaly detection
   - Review and optimize rate limits

---

## 6. Unauthorized Access / Security Breach

### Symptoms
- Unfamiliar logins detected
- API keys used from unexpected locations
- Unauthorized changes to production
- Secrets exposed in logs or public repos

### Immediate Actions (First 10 Minutes)

1. **STOP EVERYTHING**
   - Do NOT make any changes to production
   - Do NOT execute any pending multisig proposals
   - Assume attacker has access to all systems

2. **Rotate All Secrets**
   ```bash
   # Immediately rotate:
   # - Database passwords
   # - API keys (RPC, Crossmint, PayAI, Stripe)
   # - Session secrets
   # - Webhook secrets
   # - Admin keypairs
   ```

3. **Audit Recent Changes**
   - Review all production changes in last 7 days
   - Check multisig proposals
   - Review database changes
   - Check for new admin users

4. **Preserve Evidence**
   - Export all logs
   - Screenshot suspicious activity
   - Document timeline
   - Do NOT delete anything

### Containment (Next 1 Hour)

5. **Identify Breach Source**
   - Was a secret exposed?
   - Was a team member's account compromised?
   - Was there a vulnerability in our application?

6. **Revoke Access**
   - Disable compromised accounts
   - Remove suspicious team members (if insider threat)
   - Invalidate all active sessions

7. **Notify Affected Parties**
   - If user data exposed: Notify users within 72 hours (GDPR)
   - If funds at risk: Immediate notification
   - Contact law enforcement if criminal activity

### Recovery

8. **Comprehensive Security Audit**
   - Engage external security firm
   - Review all access logs
   - Penetration testing
   - Code review for backdoors

9. **User Communication**
   - Transparent disclosure (after containment)
   - Steps taken to prevent recurrence
   - Compensation for affected users (if applicable)

---

## Communication Templates

### Twitter: Service Disruption

```
We are currently experiencing technical issues affecting [service].
Our team is investigating and working on a resolution.

Status updates: https://status.ghostspeak.io

Thank you for your patience.
```

### Twitter: Security Incident

```
⚠️ URGENT: We have detected suspicious activity and have temporarily
paused the protocol. User funds are safe.

DO NOT interact with any links claiming to be GhostSpeak support.

Official updates: https://ghostspeak.io/security
```

### Discord: Incident Update

```
**Incident Update - [Timestamp]**

**Status:** [Investigating / Identified / Monitoring / Resolved]

**Impact:** [Description of user impact]

**Current Actions:** [What we're doing now]

**ETA:** [When we expect resolution]

**Next Update:** [When next update will be posted]
```

### Email: User Notification

```
Subject: Important: GhostSpeak Service Disruption

Dear GhostSpeak User,

We are writing to inform you of a [brief description of incident]
that occurred on [date] at [time] UTC.

Impact: [How users were affected]

Resolution: [What we did to fix it]

Your Action Required: [If any]

We sincerely apologize for this disruption and the inconvenience it
may have caused. We have taken steps to prevent similar incidents
in the future.

If you have any questions, please contact support@ghostspeak.io.

Sincerely,
GhostSpeak Team
```

---

## On-Call Rotation

### Primary On-Call (24/7 Coverage)

- Week 1: Engineer A
- Week 2: Engineer B
- Week 3: Engineer C
- Week 4: Engineer D

### Escalation Path

1. **Primary On-Call** (0-15 min)
2. **Secondary On-Call** (15-30 min)
3. **Engineering Manager** (30-60 min)
4. **CTO** (60+ min or critical severity)
5. **Founder/CEO** (funds at risk or legal issues)

### On-Call Expectations

- Acknowledge alert within 5 minutes
- Join incident channel within 10 minutes
- Provide status update within 15 minutes
- Escalate if not resolved within 30 minutes

---

## Contact List

### Internal Team

| Role | Name | Phone | Email | Telegram |
|------|------|-------|-------|----------|
| On-Call Primary | [Name] | [Phone] | [Email] | [@handle] |
| On-Call Secondary | [Name] | [Phone] | [Email] | [@handle] |
| Engineering Manager | [Name] | [Phone] | [Email] | [@handle] |
| CTO | [Name] | [Phone] | [Email] | [@handle] |
| Founder/CEO | [Name] | [Phone] | [Email] | [@handle] |
| Security Lead | [Name] | [Phone] | [Email] | [@handle] |

### External Contacts

| Service | Contact | Support URL | Emergency Phone |
|---------|---------|-------------|-----------------|
| RPC Provider (Helius) | [Name] | https://helius.dev/support | [Phone] |
| Database (Neon) | Support | https://neon.tech/support | N/A |
| Cloudflare | Support | https://cloudflare.com/support | Enterprise: [Phone] |
| Solana Foundation | Security | security@solana.org | N/A |
| Security Auditor | [Name] | [Email] | [Phone] |

---

## Tools & Resources

### Monitoring Dashboards

- Grafana: https://grafana.ghostspeak.io
- Datadog: https://app.datadoghq.com/ghostspeak
- Solana Explorer: https://explorer.solana.com

### Runbooks

- High Error Rate: https://docs.ghostspeak.io/runbooks/high-error-rate
- RPC Outage: https://docs.ghostspeak.io/runbooks/rpc-outage
- Database Failure: https://docs.ghostspeak.io/runbooks/database-failure

### War Room

- Zoom Link: [Emergency Meeting Link]
- Discord: #war-room (private channel)

---

## Post-Incident Review Template

```markdown
# Incident Post-Mortem: [Title]

**Date:** [Incident Date]
**Severity:** [P0/P1/P2/P3]
**Duration:** [Start - End]
**Responders:** [Names]

## Summary

[Brief description of what happened]

## Timeline

- [Time] - Incident detected
- [Time] - Team alerted
- [Time] - Root cause identified
- [Time] - Fix deployed
- [Time] - Incident resolved

## Root Cause

[Detailed explanation of what caused the incident]

## Impact

- Users affected: [Number]
- Transactions failed: [Number]
- Financial impact: $[Amount]
- Downtime: [Duration]

## Resolution

[What was done to resolve the incident]

## What Went Well

- [Thing 1]
- [Thing 2]

## What Went Wrong

- [Thing 1]
- [Thing 2]

## Action Items

- [ ] [Action 1] - Owner: [Name] - Due: [Date]
- [ ] [Action 2] - Owner: [Name] - Due: [Date]

## Lessons Learned

[Key takeaways to prevent future incidents]
```

---

**Last Updated:** 2025-12-30
**Version:** 1.0
**Next Review:** 2026-03-30
