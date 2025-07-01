# 🔍 Performance Investigation Workflow

## Multi-Role Performance Debugging Like Claude Swarm Teams

This workflow replicates Claude Swarm's coordinated performance investigation approach, using specialized roles to analyze, diagnose, and fix performance issues systematically.

## Phase 1: Investigation Coordination Setup

### Performance Team Structure
```
Investigation Roles:

COORDINATOR (Lead Developer)
├── Coordinates investigation team
├── Synthesizes findings from specialists  
├── Makes architectural decisions
├── Manages timeline and priorities
└── Communicates with stakeholders

DATA_EXPERT (Performance Analyst)
├── Analyzes metrics and monitoring data
├── Identifies timing patterns and correlations
├── Quantifies performance impact
├── Tracks user segments affected
└── Provides data-driven insights

CODE_EXPERT (Implementation Specialist)  
├── Reviews code changes and implementations
├── Identifies algorithmic inefficiencies
├── Analyzes dependency and version impacts
├── Reviews resource management patterns
└── Focuses on actionable code-level fixes

INFRASTRUCTURE_EXPERT (DevOps Specialist)
├── Analyzes system resources and bottlenecks
├── Reviews deployment and configuration changes
├── Monitors infrastructure metrics
├── Identifies scaling and capacity issues
└── Focuses on environmental factors
```

### Workflow Activation Triggers
```
Trigger Conditions:
- Performance alerts or monitoring thresholds exceeded
- User complaints about application slowness
- Significant increase in response times or error rates
- Performance regression after deployments
- Capacity planning or scaling concerns

Investigation Priority:
HIGH: Production issues affecting users
MEDIUM: Staging environment performance problems  
LOW: Proactive optimization opportunities
```

## Phase 2: Parallel Investigation Phase

### Coordinator Role: Investigation Launch
```markdown
**Role:** COORDINATOR
**Working Directory:** .
**Duration:** 30-60 minutes

### Investigation Setup Tasks:
1. **Define Investigation Scope**
   - Identify affected systems and timeframes
   - Set investigation priorities and deadlines
   - Define success criteria for resolution

2. **Create Investigation Workspace** 
   File: .claude/memory/perf-investigation-[DATE].md
   ```
   # Performance Investigation: [ISSUE_DESCRIPTION]
   **Start:** [TIMESTAMP]
   **Priority:** [HIGH|MEDIUM|LOW]
   **Affected Systems:** [LIST]
   **Impact:** [USER_IMPACT_DESCRIPTION]
   
   ## Investigation Timeline
   - Data Analysis: [ETA]
   - Code Review: [ETA]  
   - Infrastructure Review: [ETA]
   - Synthesis: [ETA]
   - Implementation: [ETA]
   ```

3. **Delegate Investigation Tasks**
   Create tasks for each specialist:
   - DATA_EXPERT: "Analyze performance metrics for [TIMEFRAME]"
   - CODE_EXPERT: "Review recent changes in [AFFECTED_AREAS]"
   - INFRASTRUCTURE_EXPERT: "Check system resources and scaling"

### Task Delegation Template:
```
**Task:** PERF_DATA_001
**From:** COORDINATOR -> **To:** DATA_EXPERT
**Type:** RESEARCH
**Priority:** HIGH

**Objective:** Identify when and where performance degradation occurred
**Context:** Users reporting slow response times since [TIMEFRAME]

**Requirements:**
- Analyze response time metrics (p95, p99) for affected endpoints
- Identify correlations with deployment times or traffic patterns
- Quantify impact on user segments and geographic regions
- Focus on actionable data points with specific timestamps

**Expected Output:**
- Timeline of performance degradation with specific metrics
- Affected user segments and geographic distribution
- Correlation analysis with system events
- Recommended areas for deeper investigation

**Working Directory:** ./monitoring/logs
**Tools Required:** [Read, Bash]
**Deadline:** [TIMESTAMP + 2 hours]
```
```

### Data Expert Role: Metrics Analysis
```markdown
**Role:** DATA_EXPERT
**Working Directory:** ./monitoring/logs
**Duration:** 2-3 hours

### Analysis Framework:
1. **Performance Metrics Collection**
   ```bash
   # Analyze response time trends
   grep "response_time" application.log | 
   awk '{print $1, $4}' | 
   sort -k1 > response_times.csv
   
   # Identify error rate spikes
   grep "ERROR" application.log | 
   awk '{print $1}' | 
   uniq -c > error_trends.csv
   
   # Check database query performance
   grep "query_time" db.log | 
   awk '$3 > 1000 {print}' > slow_queries.csv
   ```

2. **Correlation Analysis**
   - Map performance drops to deployment times
   - Check traffic volume changes during degradation
   - Analyze geographic distribution of affected users
   - Identify specific endpoints or features impacted

3. **Impact Quantification**
   ```
   Performance Impact Summary:
   - P95 Response Time: [BEFORE] -> [AFTER] ([CHANGE])
   - Error Rate: [BEFORE] -> [AFTER] ([CHANGE])
   - Affected Traffic: [PERCENTAGE] of total requests
   - User Segments: [DESCRIPTION]
   - Geographic Distribution: [REGIONS]
   
   Critical Findings:
   - [KEY_FINDING_1]: [EVIDENCE]
   - [KEY_FINDING_2]: [EVIDENCE]
   ```

### Expected Output:
```sql
-- Query shows latency spike at 2:15 PM yesterday  
-- P95 response time increased from 250ms to 890ms
-- Affecting 15% of traffic, primarily checkout flows
-- Correlates with deployment at 2:10 PM
-- Database query times also increased 3x during period
```
```

### Code Expert Role: Implementation Analysis  
```markdown
**Role:** CODE_EXPERT  
**Working Directory:** ./src
**Duration:** 2-3 hours

### Code Analysis Framework:
1. **Recent Changes Review**
   ```bash
   # Check recent commits around performance degradation
   git log --since="yesterday" --until="today" --oneline
   
   # Review changes in affected areas
   git diff HEAD~10 HEAD -- src/checkout/
   
   # Check dependency changes
   git diff HEAD~5 HEAD -- package.json package-lock.json
   ```

2. **Performance Pattern Analysis**
   - Review for N+1 query patterns
   - Check connection pooling configurations  
   - Analyze caching implementation changes
   - Look for blocking I/O operations
   - Review memory allocation patterns

3. **Dependency Impact Assessment**
   ```bash
   # Check for version bumps that might cause issues
   npm audit
   npm outdated
   
   # Review specific package changes
   git log -p package-lock.json | grep -A5 -B5 "version"
   ```

### Expected Output:
```typescript
// Performance Analysis Findings:

// 1. NEW ISSUE: Connection pool exhaustion in database client
// - Recent change disabled connection pooling (commit abc123)
// - Each request now creates new database connection
// - Causes 300-500ms overhead per request

// 2. REGRESSION: Caching disabled for user sessions  
// - Session data now fetched from database on every request
// - Previously cached for 10 minutes
// - Adds 150ms+ to all authenticated requests

// 3. DEPENDENCY ISSUE: Updated ORM library
// - New version has performance regression in query builder
// - Complex queries 2-3x slower than previous version
// - Affects checkout and user profile endpoints

// RECOMMENDED FIXES:
// 1. Re-enable connection pooling with proper configuration
// 2. Restore session caching with appropriate TTL
// 3. Pin ORM to previous version until fix available
```
```

### Infrastructure Expert Role: System Analysis
```markdown
**Role:** INFRASTRUCTURE_EXPERT
**Working Directory:** ./infrastructure  
**Duration:** 2-3 hours

### Infrastructure Analysis Framework:
1. **Resource Utilization Review**
   ```bash
   # Check CPU and memory trends
   grep "cpu_usage\|memory_usage" system.log | 
   awk '{print $1, $3, $4}' > resource_usage.csv
   
   # Database connection analysis
   grep "connection_pool" db.log | 
   tail -100 > connection_analysis.log
   
   # Network latency patterns
   grep "network_latency" network.log > latency_trends.csv
   ```

2. **Scaling and Capacity Analysis**
   - Review auto-scaling trigger patterns
   - Check container resource limits and usage
   - Analyze load balancer distribution
   - Review database connection pool utilization

3. **Configuration Change Review**
   ```bash
   # Check recent infrastructure changes
   git log --since="48 hours ago" infrastructure/
   
   # Review configuration changes
   diff -u config/production.yml.backup config/production.yml
   ```

### Expected Output:
```yaml
# Infrastructure Analysis Results:

Resource Bottlenecks:
  - Database connections: 95% pool utilization (up from 60%)
  - Application memory: Increased 40% since yesterday
  - CPU usage: Spikes to 90% during peak periods
  
Configuration Issues:
  - Database connection pool: Reduced from 50 to 20 connections
  - Application timeout: Increased from 30s to 60s (masking issues)
  - Cache TTL: Reduced from 10min to 1min (increased cache misses)

Scaling Concerns:
  - Auto-scaling triggers not activated despite high CPU
  - Load balancer health checks timing out
  - Database read replicas not being utilized

Recommended Actions:
  - Restore database connection pool to 50
  - Fix auto-scaling configuration
  - Implement database read replica routing
```
```

## Phase 3: Findings Synthesis and Root Cause Analysis

### Coordinator Role: Analysis Synthesis
```markdown
**Role:** COORDINATOR
**Working Directory:** .
**Duration:** 1-2 hours

### Synthesis Process:
1. **Collect Specialist Findings**
   - Review data expert's metrics analysis
   - Review code expert's implementation findings  
   - Review infrastructure expert's system analysis
   - Identify common patterns and root causes

2. **Root Cause Identification**
   ```
   # Root Cause Analysis Template
   
   ## Primary Root Cause: [MAIN_ISSUE]
   **Evidence:**
   - Data: [METRICS_EVIDENCE]
   - Code: [IMPLEMENTATION_EVIDENCE]  
   - Infrastructure: [SYSTEM_EVIDENCE]
   
   ## Contributing Factors:
   1. [FACTOR_1]: [DESCRIPTION_AND_EVIDENCE]
   2. [FACTOR_2]: [DESCRIPTION_AND_EVIDENCE]
   
   ## Impact Assessment:
   - Performance: [QUANTIFIED_IMPACT]
   - Users: [AFFECTED_SEGMENTS]
   - Business: [BUSINESS_IMPACT]
   
   ## Solution Strategy:
   - Immediate: [QUICK_FIXES]
   - Short-term: [PROPER_SOLUTIONS]  
   - Long-term: [PREVENTIVE_MEASURES]
   ```

3. **Implementation Plan Creation**
   Create prioritized fix implementation tasks:
   - Critical: Fixes that immediately improve performance
   - Important: Solutions that prevent recurrence
   - Enhancement: Optimizations for future improvement

### Example Synthesis Output:
```markdown
# Performance Investigation Summary

## Root Cause: Database Connection Pool Misconfiguration
**Primary Issue:** Recent deployment accidentally reduced database connection pool from 50 to 20 connections, causing connection exhaustion during peak traffic.

**Supporting Evidence:**
- **Data:** 300ms increase in response times correlating with 2:10 PM deployment
- **Code:** Configuration change found in commit abc123 that modified pool settings  
- **Infrastructure:** 95% connection pool utilization vs historical 60%

## Contributing Factors:
1. **Disabled Session Caching:** Increased database load by 40%
2. **ORM Version Regression:** Complex queries 2-3x slower in new version
3. **Auto-scaling Misconfiguration:** Servers not scaling despite high load

## Solution Plan:
**Immediate (< 1 hour):**
- Restore database connection pool to 50 connections
- Re-enable session caching with 10-minute TTL

**Short-term (< 24 hours):**  
- Rollback ORM to previous stable version
- Fix auto-scaling configuration
- Implement additional monitoring for connection pool usage

**Long-term (< 1 week):**
- Implement configuration change review process
- Add automated performance regression testing
- Set up proactive alerting for resource utilization
```
```

## Phase 4: Coordinated Implementation

### Implementation Task Delegation
```markdown
**Role:** COORDINATOR -> All Specialists
**Duration:** Variable by fix complexity

### Critical Path Implementation:
1. **Database Configuration (Infrastructure Expert)**
   ```
   **Task:** PERF_FIX_001
   **Priority:** CRITICAL
   **ETA:** 30 minutes
   
   **Objective:** Restore database connection pool configuration
   **Steps:**
   - Revert connection pool settings to 50 connections
   - Deploy configuration change
   - Monitor connection utilization for 30 minutes
   - Confirm performance improvement
   ```

2. **Caching Restoration (Code Expert)**
   ```
   **Task:** PERF_FIX_002  
   **Priority:** HIGH
   **ETA:** 1 hour
   
   **Objective:** Re-enable session caching
   **Steps:**
   - Restore session caching middleware
   - Set TTL to 10 minutes
   - Test cache hit rates
   - Deploy and monitor performance impact
   ```

3. **ORM Version Management (Code Expert)**
   ```
   **Task:** PERF_FIX_003
   **Priority:** HIGH  
   **ETA:** 2 hours
   
   **Objective:** Address ORM performance regression
   **Steps:**
   - Pin ORM to previous stable version
   - Test all affected functionality
   - Deploy with rollback plan ready
   - Monitor query performance
   ```

### Implementation Coordination:
- Deploy fixes in order of impact and risk
- Monitor performance metrics after each change
- Coordinate rollback procedures if issues arise
- Document all changes and their effectiveness
```

## Phase 5: Validation and Monitoring

### Performance Validation Protocol
```markdown
**Role:** ALL -> COORDINATOR
**Duration:** 2-4 hours post-fix

### Validation Framework:
1. **Immediate Validation (0-30 minutes)**
   - Monitor key performance metrics
   - Check error rates and response times
   - Validate fix deployment success
   - Confirm no new issues introduced

2. **Short-term Validation (30 minutes - 2 hours)**  
   - Monitor sustained performance improvement
   - Check performance under normal traffic patterns
   - Validate all affected endpoints are working
   - Confirm user experience improvements

3. **Extended Validation (2-24 hours)**
   - Monitor performance under peak traffic
   - Check for any delayed side effects
   - Validate long-term stability
   - Measure business impact improvements

### Success Metrics:
```bash
# Performance Improvement Targets
Response Time (P95): < 300ms (target: < 250ms)
Error Rate: < 0.1% (target: < 0.05%)  
Database Connections: < 70% utilization
User Satisfaction: Return to baseline levels

# Monitoring Commands
grep "response_time" logs/application.log | tail -100
grep "ERROR" logs/application.log | wc -l
kubectl top pods | grep app-server
```
```

## Phase 6: Post-Investigation Learning

### Retrospective and Process Improvement
```markdown
**Role:** ALL -> COORDINATOR
**Working Directory:** .claude/memory/

### Retrospective Framework:
1. **What Worked Well:**
   - Effective coordination between specialists
   - Quick identification of root cause
   - Successful parallel investigation approach

2. **What Could Be Improved:**
   - Earlier detection of configuration changes
   - Better integration between monitoring and alerting
   - More proactive performance regression testing

3. **Process Improvements:**
   - Add configuration change review checkpoints
   - Implement automated performance testing in CI/CD
   - Enhance monitoring for database connection pools
   - Create performance runbooks for common issues

4. **Knowledge Transfer:**
   Update team documentation:
   - .claude/patterns/performance-patterns.md
   - .claude/memory/performance-playbooks.md
   - .claude/workflows/incident-response.md
```

### Documentation Updates
```markdown
File: .claude/memory/performance-investigations.md

## Investigation: [DATE] - Database Connection Pool Issue
**Duration:** 6 hours (detection to resolution)
**Impact:** 15% of traffic, 300ms response time increase
**Root Cause:** Configuration change reduced connection pool

### Key Learnings:
- Configuration changes need performance impact review
- Database connection monitoring is critical
- Session caching has significant performance impact
- ORM version updates require performance validation

### Preventive Measures Implemented:
- Added connection pool utilization alerts
- Configuration change review process
- Automated performance regression testing
- Enhanced monitoring dashboard

### Playbook Created:**
- Quick database connection pool diagnosis steps
- Session caching troubleshooting guide
- Performance investigation coordination template
```

## Success Patterns

1. **Parallel Investigation**: Specialists work simultaneously on different aspects
2. **Clear Communication**: Structured handoffs and status updates
3. **Data-Driven Decisions**: Quantified impact and evidence-based solutions
4. **Coordinated Implementation**: Prioritized fixes with monitoring
5. **Learning Integration**: Document insights for future investigations

## Remember

> "Performance issues are system problems requiring system solutions. Coordinate expertise, synthesize findings, implement systematically."

This workflow provides the structured, multi-role approach of Claude Swarm's performance investigation within Cursor's development environment. 