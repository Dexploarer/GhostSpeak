# 🔗 MCP Server Coordination Protocol

## Integrate External Tools Like Claude Swarm's MCP Connections

This protocol provides structured coordination with MCP (Model Context Protocol) servers, replicating Claude Swarm's ability to integrate external tools and services into development workflows.

## MCP Integration Framework

### MCP Server Categories
```
Development MCP Servers:

DOCUMENTATION SERVERS
├── Context7: Real-time documentation and code examples
├── GitHub: Repository and issue management
├── Confluence: Team documentation and knowledge base
└── API Docs: OpenAPI and service documentation

DATA ANALYSIS SERVERS  
├── Database: Query execution and schema analysis
├── Monitoring: Performance metrics and alerting
├── Analytics: User behavior and business metrics
└── Logs: Application and system log analysis

AUTOMATION SERVERS
├── CI/CD: Build and deployment automation
├── Testing: Test execution and reporting
├── Security: Vulnerability scanning and compliance
└── Infrastructure: Resource management and scaling

COMMUNICATION SERVERS
├── Slack: Team communication and notifications
├── Email: Stakeholder communication
├── Ticketing: Issue tracking and project management
└── Calendar: Meeting and milestone coordination
```

### MCP Server Configuration Template
```yaml
# .claude/configs/mcp-servers.yml

servers:
  documentation:
    context7:
      type: sse
      url: "https://your-context7-server.com/sse"
      description: "Real-time documentation and code examples"
      capabilities: ["library_docs", "code_examples", "best_practices"]
      
    github:
      type: stdio
      command: "github-mcp"
      args: ["--repo", "your-org/your-repo"]
      description: "GitHub repository integration"
      capabilities: ["issues", "pull_requests", "releases"]

  data_analysis:
    database:
      type: stdio  
      command: "postgres-mcp"
      args: ["--connection", "${DB_CONNECTION_STRING}"]
      description: "Database query and analysis"
      capabilities: ["query", "schema", "performance"]
      
    monitoring:
      type: sse
      url: "https://your-monitoring.com/mcp"
      description: "Performance metrics and alerting"
      capabilities: ["metrics", "alerts", "dashboards"]

  automation:
    cicd:
      type: stdio
      command: "jenkins-mcp"  
      args: ["--server", "${JENKINS_URL}"]
      description: "CI/CD pipeline management"
      capabilities: ["builds", "deployments", "status"]
```

## Role-Based MCP Integration

### Architect Role: Strategic MCP Usage
```markdown
**MCP Integration Focus:** High-level coordination and decision-making

### Primary MCP Servers:
- **Documentation (Context7)**: Research architectural patterns and best practices
- **GitHub**: Review system architecture across repositories
- **Monitoring**: Understand system performance characteristics
- **Database**: Analyze data architecture and relationships

### Usage Patterns:
1. **Architecture Research**
   ```
   Use Context7 MCP to research:
   - Current best practices for chosen technology stack
   - Integration patterns for microservices
   - Security architecture recommendations
   - Performance optimization strategies
   ```

2. **System Analysis**
   ```
   Use Database MCP to:
   - Analyze current schema relationships
   - Understand data flow patterns
   - Identify optimization opportunities
   - Plan migration strategies
   ```

3. **Team Coordination**
   ```
   Use GitHub MCP to:
   - Review cross-repository dependencies
   - Coordinate feature development across teams
   - Track architectural decision implementation
   - Manage technical debt across projects
   ```

### MCP Delegation Examples:
```
**Task:** ARCH_RESEARCH_001
**MCP Server:** Context7
**Objective:** Research microservices communication patterns

**MCP Query:** "Best practices for service-to-service communication in Node.js microservices 2025"
**Context:** "Designing event-driven architecture for e-commerce platform"
**Expected Output:** 
- Communication pattern recommendations
- Technology stack analysis
- Performance considerations
- Security implications
```
```

### Frontend Role: Development-Focused MCP Usage
```markdown
**MCP Integration Focus:** Component development and user experience

### Primary MCP Servers:
- **Context7**: Frontend framework and library documentation
- **Testing**: Automated testing for UI components
- **Analytics**: User behavior and frontend performance
- **Design Systems**: Component library and design standards

### Usage Patterns:
1. **Component Development**
   ```
   Use Context7 MCP for:
   - React component best practices
   - TypeScript type definitions
   - CSS architecture patterns
   - Accessibility implementation guides
   ```

2. **Performance Optimization**
   ```
   Use Analytics MCP for:
   - Frontend performance metrics
   - User interaction patterns
   - Bundle size analysis
   - Core Web Vitals tracking
   ```

3. **Quality Assurance**
   ```
   Use Testing MCP for:
   - Component testing strategies
   - E2E test execution
   - Visual regression testing
   - Accessibility auditing
   ```

### MCP Integration Examples:
```
**Task:** FRONTEND_PERF_001
**MCP Server:** Analytics
**Objective:** Analyze frontend performance impact

**MCP Query:** "Get Core Web Vitals for checkout flow over last 7 days"
**Context:** "Investigating performance regression in checkout process"
**Expected Output:**
- Performance metric trends
- User segment analysis
- Geographic performance variations
- Recommended optimization areas
```
```

### Backend Role: Infrastructure-Focused MCP Usage
```markdown
**MCP Integration Focus:** API development and system reliability

### Primary MCP Servers:
- **Database**: Query optimization and schema management
- **Monitoring**: API performance and error tracking
- **Security**: Vulnerability scanning and compliance
- **CI/CD**: Deployment automation and testing

### Usage Patterns:
1. **API Development**
   ```
   Use Database MCP for:
   - Query performance optimization
   - Schema design validation
   - Data relationship analysis
   - Migration planning and execution
   ```

2. **System Monitoring**
   ```
   Use Monitoring MCP for:
   - API endpoint performance tracking
   - Error rate analysis and alerting
   - Resource utilization monitoring
   - SLA compliance reporting
   ```

3. **Security Implementation**
   ```
   Use Security MCP for:
   - Vulnerability assessment of dependencies
   - API security best practices
   - Compliance requirement validation
   - Penetration testing coordination
   ```

### MCP Integration Examples:
```
**Task:** BACKEND_SECURITY_001  
**MCP Server:** Security
**Objective:** Assess API security posture

**MCP Query:** "Scan authentication endpoints for security vulnerabilities"
**Context:** "Preparing for security audit of user management system"
**Expected Output:**
- Vulnerability assessment report
- Compliance gap analysis
- Remediation recommendations
- Security testing results
```
```

## MCP Coordination Workflows

### Cross-Role MCP Collaboration
```markdown
### Pattern: Performance Investigation with MCP
**Scenario:** Application performance degradation requires multi-role analysis

#### Phase 1: Coordinator MCP Research
**Role:** COORDINATOR
**MCP Servers:** [Monitoring, Documentation]

```
Tasks:
1. Use Monitoring MCP to gather performance baselines
2. Use Context7 MCP to research performance debugging strategies
3. Create investigation plan based on MCP insights

MCP Queries:
- "Get application performance metrics for last 24 hours"
- "Best practices for Node.js application performance debugging"
- "Performance monitoring tools comparison 2025"
```

#### Phase 2: Specialist MCP Analysis  
**Parallel Investigation Using MCP:**

```
DATA_EXPERT + Analytics MCP:
- Query: "Analyze user behavior patterns during performance issues"
- Output: User impact assessment and affected workflows

CODE_EXPERT + GitHub MCP:  
- Query: "Review recent commits affecting performance-critical paths"
- Output: Code changes that may have caused regression

INFRASTRUCTURE_EXPERT + Monitoring MCP:
- Query: "Check system resource utilization and bottlenecks"  
- Output: Infrastructure-level performance analysis
```

#### Phase 3: Solution Implementation with MCP
**Coordinated Fix Implementation:**

```
BACKEND + Security MCP:
- Validate that performance fixes don't introduce security issues

FRONTEND + Testing MCP:
- Run automated performance tests to verify improvements

DEVOPS + CI/CD MCP:
- Deploy fixes with monitoring and rollback capabilities
```
```

### MCP Server Health and Coordination
```markdown
### MCP Server Status Monitoring
**File:** .claude/memory/mcp-server-status.md

```
## Active MCP Servers: [DATE]

### Documentation Servers
- **Context7**: ✅ Online - Response time: 150ms
- **GitHub**: ✅ Online - API rate limit: 4500/5000
- **Internal Docs**: ⚠️ Degraded - Slow response times

### Data Analysis Servers  
- **Database**: ✅ Online - Connection pool: 30/50
- **Monitoring**: ✅ Online - Dashboard responsive
- **Analytics**: ❌ Offline - Server maintenance until 3PM

### Automation Servers
- **CI/CD**: ✅ Online - 3 builds in queue
- **Testing**: ✅ Online - All test suites passing
- **Security**: ✅ Online - Last scan: 2 hours ago

### Coordination Impact:
- Analytics offline: Use cached data for frontend analysis
- Internal docs slow: Fall back to external documentation
- All other systems operational for investigation work
```

### MCP Error Handling and Fallbacks
```
When MCP servers are unavailable:

1. **Documentation Fallback**
   Context7 offline → Use official documentation websites
   GitHub unavailable → Use local git commands and file analysis
   
2. **Data Analysis Fallback**
   Database MCP down → Use direct database connection
   Monitoring offline → Use log file analysis and system commands
   
3. **Automation Fallback**  
   CI/CD MCP unavailable → Use manual deployment procedures
   Testing MCP down → Run tests locally and manually validate

4. **Communication Protocol**
   Update .claude/memory/mcp-server-status.md immediately
   Notify all roles of affected capabilities
   Adjust workflow expectations and timelines
   Document workaround procedures used
```
```

## MCP Integration Commands

### MCP Server Management
```bash
# Check MCP server status
mcp-status --all
mcp-status --server context7
mcp-status --server database

# Test MCP server connectivity
mcp-test context7 "React best practices 2025"
mcp-test database "SELECT COUNT(*) FROM users"

# Restart problematic MCP servers
mcp-restart monitoring
mcp-restart --all
```

### MCP Query Templates
```bash
# Documentation queries
mcp-query context7 "How to implement [FEATURE] in [TECHNOLOGY] with [CONSTRAINTS]"
mcp-query github "List recent issues related to [COMPONENT]"

# Data analysis queries  
mcp-query database "EXPLAIN ANALYZE [SLOW_QUERY]"
mcp-query monitoring "Get error rate for [ENDPOINT] over [TIMEFRAME]"

# Automation queries
mcp-query cicd "Get build status for [BRANCH]"
mcp-query testing "Run test suite for [COMPONENT]"
```

### MCP Integration Validation
```bash
# Validate MCP responses
mcp-validate --query-id [ID] --expected-format json
mcp-validate --server database --query "SELECT 1" --expected-result "1"

# Monitor MCP performance
mcp-perf --server context7 --duration 1h
mcp-perf --all --report .claude/memory/mcp-performance.md
```

## MCP Security and Access Control

### MCP Server Authentication
```yaml
# .claude/configs/mcp-auth.yml

authentication:
  github:
    method: token
    token_env: GITHUB_TOKEN
    scopes: ["repo", "issues"]
    
  database:
    method: connection_string
    connection_env: DATABASE_URL
    ssl_required: true
    
  monitoring:
    method: api_key
    key_env: MONITORING_API_KEY
    rate_limit: 1000/hour

access_control:
  role_permissions:
    ARCHITECT:
      servers: ["context7", "github", "monitoring", "database"]
      operations: ["read", "query", "analyze"]
      
    FRONTEND:
      servers: ["context7", "testing", "analytics"]
      operations: ["read", "query", "test"]
      
    BACKEND:
      servers: ["database", "monitoring", "security", "cicd"]
      operations: ["read", "query", "execute", "deploy"]
```

### MCP Data Privacy
```markdown
### Data Handling Guidelines:

1. **Sensitive Data Protection**
   - Never send production user data to external MCP servers
   - Use anonymized or synthetic data for analysis
   - Implement data masking for database queries
   - Log all MCP interactions for audit purposes

2. **Access Logging**
   ```
   File: .claude/memory/mcp-access-log.md
   
   ## MCP Access Log: [DATE]
   **User:** [ROLE]
   **Server:** [MCP_SERVER]
   **Query:** [SANITIZED_QUERY]
   **Timestamp:** [TIMESTAMP]
   **Response Size:** [BYTES]
   **Status:** [SUCCESS|ERROR]
   ```

3. **Compliance Requirements**
   - Ensure MCP servers comply with data protection regulations
   - Validate that external servers have appropriate security certifications
   - Document data flows for compliance auditing
   - Implement data retention policies for MCP interactions
```

## Success Patterns

1. **Strategic Integration**: Use MCP servers that align with role responsibilities
2. **Fallback Planning**: Always have alternatives when MCP servers are unavailable
3. **Security First**: Protect sensitive data in all MCP interactions
4. **Performance Monitoring**: Track MCP server response times and reliability
5. **Coordination Benefits**: Leverage MCP for cross-role collaboration and insight sharing

## Remember

> "MCP servers are force multipliers for development teams. Integrate strategically, coordinate effectively, protect data vigilantly."

This protocol brings Claude Swarm's MCP integration advantages to cursor-based development workflows, enabling powerful external tool coordination while maintaining security and reliability. 