# Getting Started with Cursor Swarm Development

## Overview
This guide walks you through using the enhanced Cursor IDE configuration for Claude Swarm development patterns. You'll learn how to leverage Cursor's advanced features, MCP servers, and role-based development within a single IDE instance.

## Prerequisites

### Required Software
- **Cursor IDE**: Latest version with MCP support
- **Node.js**: 18.0+ for MCP servers
- **Git**: For version control and collaboration

### Recommended Knowledge
- Basic understanding of software development workflows
- Familiarity with VS Code/Cursor interface
- Understanding of multi-agent development concepts

## Initial Setup

### 1. Run the Setup Script
```bash
# In your project root
./.claude/cursor/setup-cursor-swarm.sh
```

This script creates:
- Cursor MCP server configurations
- VS Code workspace settings
- Project rules for role-based development
- Memory system initialization
- Performance optimization files

### 2. Configure Cursor IDE

#### Enable MCP Servers
1. Open Cursor Settings (⌘, on Mac, Ctrl+, on Windows/Linux)
2. Navigate to **MCP** section
3. You should see the configured servers from `mcp.json`
4. Enable the servers you want to use:
   - **context7**: Enhanced documentation access
   - **filesystem**: Advanced file operations
   - **memory_bank**: Persistent memory across sessions
   - **sequential_thinking**: Step-by-step problem solving
   - **git_integration**: Advanced Git operations
   - **web_search**: Real-time web information

#### Verify Rules Configuration
1. Go to **Settings > Rules**
2. Confirm that project rules are loaded
3. Check that the core swarm rule (000-swarm-core.mdc) is active
4. Verify role-specific rules appear in the available rules list

### 3. Set Environment Variables
Create a `.env` file or set system environment variables:
```bash
# Optional: If using Context7 MCP server
CONTEXT7_API_KEY=your_api_key_here

# Optional: Database URL if using database tools
DATABASE_URL=your_database_connection_string
```

## Understanding the System

### Directory Structure
```
your-project/
├── .cursor/
│   ├── mcp.json              # MCP server configurations
│   ├── index.mdc             # Always-active project rules
│   └── rules/                # Role-specific rules
│       ├── 000-swarm-core.mdc
│       ├── 100-architect.mdc
│       ├── 200-frontend.mdc
│       ├── 300-backend.mdc
│       └── 400-database.mdc
├── .vscode/
│   ├── settings.json         # Optimized workspace settings
│   ├── tasks.json           # Swarm coordination tasks
│   └── extensions.json      # Recommended extensions
└── .claude/
    ├── memory/              # Persistent memory files
    ├── patterns/            # Reusable development patterns
    └── protocols/           # Process guidelines
```

### How Rules Work
- **Always Active**: Core swarm coordination (000-swarm-core.mdc)
- **Context-Aware**: Role-specific rules activate automatically based on file types
- **Manual**: Some rules require explicit mention to activate

## Basic Usage

### Starting a Development Session

#### 1. Initialize Session
Use Command Palette (⌘⇧P / Ctrl+Shift+P):
```
> Tasks: Run Task > Initialize Swarm Session
```

#### 2. First Role Switch
In Cursor chat, start with:
```
Switch to architect mode. I need to plan the architecture for a new feature.
```

The AI will:
- Adopt the architect role perspective
- Apply architect-specific rules and standards
- Provide system-level guidance
- Document decisions appropriately

### Role-Based Development Workflow

#### 1. Architecture Phase
```
Switch to architect mode

Task: Design a user authentication system
Requirements:
- JWT-based authentication
- Role-based access control
- Password reset functionality
- Social login integration
```

Expected output:
- System architecture diagram
- Component relationships
- Technology recommendations
- Integration specifications
- ADR (Architecture Decision Record)

#### 2. Frontend Development
```
Switch to frontend mode

Context: Implementing the authentication system designed by the architect
Task: Create login and registration components
```

Expected output:
- React/Vue components with TypeScript
- Proper form validation
- Accessibility considerations
- Responsive design implementation
- Component documentation

#### 3. Backend Development
```
Switch to backend mode

Context: Frontend components are ready for integration
Task: Implement authentication API endpoints
```

Expected output:
- RESTful API endpoints
- Business logic implementation
- Error handling and validation
- Security best practices
- API documentation

#### 4. Database Design
```
Switch to database mode

Context: Backend APIs require user data storage
Task: Design user authentication schema
```

Expected output:
- Database schema design
- Migration scripts
- Index optimization
- Data validation rules
- Security considerations

### Advanced Features

#### Using MCP Servers

##### Sequential Thinking
For complex problem-solving:
```
Use sequential thinking to break down this complex refactoring task step by step.
```

##### Web Search Integration
For current best practices:
```
@Web search for latest React 18 authentication patterns and security considerations
```

##### Memory Bank
For persistent context:
```
Remember this architectural decision for future reference: We're using JWT with refresh tokens for authentication, stored in httpOnly cookies for security.
```

#### File References
Always use @File notation for context:
```
Based on @src/components/LoginForm.tsx, implement the corresponding backend validation logic.
```

#### Context Management
Reference memory files:
```
According to @.claude/memory/decisionLog.md, review our previous authentication decisions and ensure consistency.
```

## Best Practices

### Context Optimization

#### Do's
- ✅ Use specific @File references instead of broad searches
- ✅ Switch roles for appropriate tasks
- ✅ Document decisions in memory files
- ✅ Keep conversations focused on current role objectives
- ✅ Use MCP servers for specialized functionality

#### Don'ts
- ❌ Mix multiple roles in single conversations
- ❌ Ignore role-specific quality gates
- ❌ Skip documentation updates
- ❌ Overload context with irrelevant information
- ❌ Forget to preserve handoff context between roles

### Performance Optimization

#### Token Usage
- Monitor active rules in Cursor settings
- Use .cursorignore for large files
- Leverage .cursorindexignore for selective access
- Keep rule files under 100 lines each

#### Speed Enhancement
- Enable only necessary MCP servers
- Use specific file patterns in rules
- Maintain focused conversations
- Regular cleanup of temporary memory files

### Quality Assurance

#### Before Switching Roles
- [ ] Current task completed to satisfaction
- [ ] Decisions documented appropriately
- [ ] Handoff context prepared for next role
- [ ] Quality gates satisfied for current role

#### Regular Maintenance
- [ ] Update memory files weekly
- [ ] Review and optimize active rules monthly
- [ ] Clean up temporary files regularly
- [ ] Monitor MCP server performance

## Troubleshooting

### Common Issues

#### MCP Servers Not Loading
1. Check Node.js version (18.0+ required)
2. Verify .cursor/mcp.json syntax
3. Check environment variables
4. Restart Cursor IDE
5. Check Cursor settings > MCP for error messages

#### Rules Not Activating
1. Verify .mdc file syntax
2. Check glob patterns in rule frontmatter
3. Ensure rules are saved properly
4. Restart Cursor if needed
5. Check Settings > Rules for active rules list

#### Performance Issues
1. Review .cursorignore patterns
2. Monitor token usage in conversations
3. Simplify rule files if too complex
4. Disable unnecessary MCP servers
5. Clear temporary memory files

#### Context Loss
1. Check memory file persistence
2. Verify @File references are working
3. Ensure handoff context is documented
4. Review session state in activeContext.md

### Getting Help

#### Debug Information
To gather debug information:
1. Use Command Palette: "Developer: Reload Window"
2. Check Console for errors (Developer > Toggle Developer Tools)
3. Review MCP server logs in Cursor settings
4. Validate rule syntax using JSON/Markdown linters

#### Support Resources
- Cursor Documentation: docs.cursor.com
- MCP Documentation: modelcontextprotocol.io
- Claude Swarm Patterns: .claude/patterns/
- Project Memory: .claude/memory/

## Advanced Workflows

### Feature Development Cycle
1. **Planning** (Architect): System design and specifications
2. **Frontend** (Frontend Dev): UI/UX implementation
3. **Backend** (Backend Dev): API and business logic
4. **Database** (DB Specialist): Schema and optimization
5. **Security** (Security): Security review and hardening
6. **Testing** (QA): Comprehensive testing strategy
7. **Deployment** (DevOps): Infrastructure and deployment

### Bug Investigation Workflow
1. **Reproduction** (QA): Detailed bug reproduction
2. **Analysis** (Relevant Specialist): Root cause investigation
3. **Fix** (Developer): Implementation of solution
4. **Security Review** (Security): Impact assessment
5. **Validation** (QA): Fix verification and regression testing

### Performance Optimization Workflow
1. **Measurement** (Performance): Baseline performance metrics
2. **Analysis** (Performance): Bottleneck identification
3. **Database** (DB Specialist): Query optimization
4. **Backend** (Backend Dev): Server-side optimization
5. **Frontend** (Frontend Dev): Client-side optimization
6. **Infrastructure** (DevOps): Infrastructure tuning

## Next Steps

### Immediate Actions
1. ✅ Complete setup using the provided script
2. ✅ Test role switching with a simple task
3. ✅ Verify MCP servers are working
4. ✅ Create your first memory entries

### Short-term Goals
- [ ] Implement your first feature using the full role cycle
- [ ] Customize rules based on your project's specific needs
- [ ] Establish team patterns if working with others
- [ ] Set up automated quality checks

### Long-term Optimization
- [ ] Create project-specific MCP servers
- [ ] Develop custom rules for your domain
- [ ] Integrate with CI/CD pipelines
- [ ] Share patterns with the community

## Success Metrics

### Development Velocity
- Faster feature completion through specialized expertise
- Reduced debugging time through comprehensive analysis
- Improved code quality through role-specific reviews

### Code Quality
- Consistent architecture through architect involvement
- Better security through dedicated security reviews
- Optimal performance through specialized performance analysis

### Team Coordination
- Clear handoffs between different aspects of development
- Comprehensive documentation through memory system
- Consistent patterns through shared rule base

---

**Ready to start? Run the setup script and begin your first role-switching session!** 