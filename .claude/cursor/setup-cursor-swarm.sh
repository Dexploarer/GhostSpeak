#!/bin/bash

# Cursor Swarm Setup Script
# Initializes advanced Cursor IDE configuration for Claude Swarm development patterns

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT=$(pwd)
CLAUDE_DIR="$PROJECT_ROOT/.claude"
CURSOR_DIR="$PROJECT_ROOT/.cursor"
VSCODE_DIR="$PROJECT_ROOT/.vscode"

echo -e "${BLUE}🚀 Setting up Cursor IDE for Claude Swarm Development${NC}"
echo "Project: $PROJECT_ROOT"

# Function to create directory if it doesn't exist
create_dir() {
    if [ ! -d "$1" ]; then
        mkdir -p "$1"
        echo -e "${GREEN}Created directory: $1${NC}"
    else
        echo -e "${YELLOW}Directory exists: $1${NC}"
    fi
}

# Function to create file with content
create_file() {
    local file_path="$1"
    local content="$2"
    
    if [ ! -f "$file_path" ]; then
        echo "$content" > "$file_path"
        echo -e "${GREEN}Created file: $file_path${NC}"
    else
        echo -e "${YELLOW}File exists: $file_path${NC}"
    fi
}

# Create directory structure
echo -e "\n${BLUE}📁 Creating directory structure...${NC}"
create_dir "$CURSOR_DIR"
create_dir "$CURSOR_DIR/rules"
create_dir "$VSCODE_DIR"
create_dir "$CLAUDE_DIR/memory"
create_dir "$CLAUDE_DIR/patterns"
create_dir "$CLAUDE_DIR/protocols"

# Create Cursor MCP configuration
echo -e "\n${BLUE}⚙️ Creating MCP server configuration...${NC}"
MCP_CONFIG='{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"],
      "env": {
        "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."],
      "env": {
        "ALLOWED_DIRECTORIES": "."
      }
    },
    "memory_bank": {
      "command": "npx",
      "args": ["-y", "memory-bank-mcp"],
      "env": {
        "MEMORY_PERSISTENCE": "true",
        "MEMORY_PATH": ".claude/memory"
      }
    },
    "sequential_thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"],
      "env": {
        "ENABLE_VISUAL_TRACKING": "true"
      }
    },
    "git_integration": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-git"],
      "env": {
        "AUTO_BRANCH_TRACKING": "true"
      }
    },
    "web_search": {
      "command": "npx",
      "args": ["-y", "mcp-server-web-search"],
      "env": {
        "SEARCH_ENGINE": "google",
        "MAX_RESULTS": "10"
      }
    }
  }
}'

create_file "$CURSOR_DIR/mcp.json" "$MCP_CONFIG"

# Create Cursor index rule (always active)
echo -e "\n${BLUE}📝 Creating Cursor project rules...${NC}"
INDEX_RULE='---
description: Core project rules for Claude Swarm development coordination
globs: **/*
alwaysApply: true
---

# Project Overview
This project uses Claude Swarm development patterns within Cursor IDE, simulating multi-agent coordination through role-based development.

## Project Context
- **Development Pattern**: Claude Swarm simulation in single IDE
- **Coordination Method**: Role-switching with context preservation
- **Memory System**: Persistent memory in .claude/memory/
- **Documentation**: Living documentation in .claude/patterns/

## Global Standards
- Always identify current role when switching contexts
- Document decisions in appropriate memory files
- Use @File references for context sharing
- Maintain clean separation between role responsibilities
- Follow established patterns in .claude/patterns/

## Quality Requirements
- Comprehensive testing for all new features
- Security review for all changes touching authentication/authorization
- Performance benchmarks for critical path optimizations
- Documentation updates for all architectural changes

## Integration Points
- MCP servers provide enhanced capabilities
- Memory files maintain project context
- Patterns define reusable solutions
- Protocols establish process guidelines

Refer to role-specific rules in .cursor/rules/ for specialized guidance.'

create_file "$CURSOR_DIR/index.mdc" "$INDEX_RULE"

# Create VS Code workspace settings
echo -e "\n${BLUE}⚙️ Creating VS Code workspace settings...${NC}"
VSCODE_SETTINGS='{
  "cursor.ai.model": "claude-3.5-sonnet",
  "cursor.ai.temperature": 0.3,
  "cursor.ai.maxTokens": 4096,
  "cursor.ai.enableAutoCompletions": true,
  "cursor.ai.enableInlineChat": true,
  "cursor.ai.enableAgentMode": true,
  
  "cursor.rules.autoApply": true,
  "cursor.rules.contextAware": true,
  "cursor.rules.showActiveRules": true,
  
  "files.exclude": {
    "**/node_modules": true,
    "**/.git": true,
    "**/.DS_Store": true,
    "**/dist": true,
    "**/build": true,
    "**/*.log": true
  },
  
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/.git/objects/**": true,
    "**/dist/**": true,
    "**/build/**": true
  },
  
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  
  "terminal.integrated.env.osx": {
    "CURSOR_PROJECT_ROOT": "${workspaceFolder}"
  },
  "terminal.integrated.env.linux": {
    "CURSOR_PROJECT_ROOT": "${workspaceFolder}"
  },
  "terminal.integrated.env.windows": {
    "CURSOR_PROJECT_ROOT": "${workspaceFolder}"
  },
  
  "git.enableCommitSigning": true,
  "git.autoRepositoryDetection": true,
  "git.autofetch": true,
  
  "workbench.settings.editor": "json",
  "workbench.settings.openDefaultSettings": true,
  
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/build": true,
    "**/.claude/memory/temp": true
  }
}'

create_file "$VSCODE_DIR/settings.json" "$VSCODE_SETTINGS"

# Create VS Code tasks
echo -e "\n${BLUE}📋 Creating VS Code tasks...${NC}"
VSCODE_TASKS='{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Initialize Swarm Session",
      "type": "shell",
      "command": "echo",
      "args": ["\"Swarm session initialized. Use role-switch commands to begin.\""],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      },
      "options": {
        "cwd": "${workspaceFolder}"
      }
    },
    {
      "label": "Update Memory Files",
      "type": "shell",
      "command": "find",
      "args": [".claude/memory", "-name", "*.md", "-exec", "echo", "Updated: {}", ";"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "silent",
        "focus": false,
        "panel": "shared"
      }
    },
    {
      "label": "Validate Project Structure",
      "type": "shell",
      "command": "ls",
      "args": ["-la", ".claude/"],
      "group": "test",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    },
    {
      "label": "Generate Status Report",
      "type": "shell",
      "command": "echo",
      "args": ["\"Generating project status report...\""],
      "group": "build",
      "dependsOn": ["Update Memory Files", "Validate Project Structure"]
    }
  ]
}'

create_file "$VSCODE_DIR/tasks.json" "$VSCODE_TASKS"

# Create VS Code extensions recommendations
echo -e "\n${BLUE}🔌 Creating extension recommendations...${NC}"
VSCODE_EXTENSIONS='{
  "recommendations": [
    "ms-vscode.vscode-json",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-jest",
    "ms-vscode.vscode-docker",
    "ms-python.python",
    "ms-python.pylint",
    "ms-toolsai.jupyter",
    "redhat.vscode-yaml",
    "ms-vscode.vscode-markdown",
    "yzhang.markdown-all-in-one",
    "shd101wyy.markdown-preview-enhanced",
    "ms-vscode.vscode-github-pullrequest",
    "github.vscode-github-actions",
    "ms-vscode-remote.remote-containers",
    "ms-vscode-remote.remote-ssh",
    "ms-vscode.vscode-git-graph",
    "mhutchie.git-graph"
  ],
  "unwantedRecommendations": [
    "ms-vscode.vscode-copilot"
  ]
}'

create_file "$VSCODE_DIR/extensions.json" "$VSCODE_EXTENSIONS"

# Create .cursorignore for performance optimization
echo -e "\n${BLUE}🚫 Creating .cursorignore for performance...${NC}"
CURSOR_IGNORE='# Dependencies
node_modules/
**/node_modules/
.pnp
.pnp.js

# Build outputs
dist/
build/
out/
.next/
.nuxt/
.output/

# Cache directories
.cache/
.parcel-cache/
.turbo/

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE files
.vscode/settings.json
.idea/
*.swp
*.swo
*~

# Temporary directories
tmp/
temp/
.tmp/

# Large binary files
*.zip
*.tar.gz
*.rar
*.pdf
*.doc
*.docx
*.ppt
*.pptx
*.xls
*.xlsx

# Media files
*.mp4
*.avi
*.mov
*.wmv
*.mp3
*.wav
*.ogg
*.flac

# Git
.git/
*.orig

# Package managers
.yarn/
.pnpm-store/
yarn.lock
package-lock.json
pnpm-lock.yaml

# Test outputs
test-results/
playwright-report/
test-coverage/

# Database files
*.db
*.sqlite
*.sqlite3

# Backup files
*.bak
*.backup'

create_file "$PROJECT_ROOT/.cursorignore" "$CURSOR_IGNORE"

# Create .cursorindexignore for selective indexing
echo -e "\n${BLUE}📇 Creating .cursorindexignore for selective indexing...${NC}"
CURSOR_INDEX_IGNORE='# Documentation that should be available on-demand
docs/
documentation/
*.md
!README.md
!CHANGELOG.md

# Large configuration files
*.config.js
*.config.ts
webpack.config.*
rollup.config.*
vite.config.*

# Test files (available on-demand)
**/*.test.*
**/*.spec.*
**/__tests__/
**/__mocks__/

# Legacy code
legacy/
deprecated/
archive/

# Third-party libraries (use on-demand)
vendor/
third-party/
external/

# Generated files
generated/
auto-generated/
codegen/

# Temporary memory files
.claude/memory/temp/
.claude/memory/scratch/

# Large data files
data/
datasets/
fixtures/
samples/

# Compiled assets
assets/compiled/
assets/generated/
public/build/'

create_file "$PROJECT_ROOT/.cursorindexignore" "$CURSOR_INDEX_IGNORE"

# Create initial memory files
echo -e "\n${BLUE}🧠 Creating initial memory files...${NC}"
ACTIVE_CONTEXT='# Active Context

## Current Session State
- **Started**: $(date)
- **Project**: $(basename "$PROJECT_ROOT")
- **Phase**: Setup and Configuration

## Current Objectives
- [ ] Complete Cursor IDE setup for Claude Swarm patterns
- [ ] Validate MCP server configurations
- [ ] Test role-switching capabilities
- [ ] Initialize first development session

## Active Blockers
None currently identified.

## Recent Decisions
- Adopted Cursor IDE as primary development environment
- Implemented Claude Swarm simulation patterns
- Configured MCP servers for enhanced capabilities

## Next Steps
1. Test role switching with example tasks
2. Validate MCP server connectivity
3. Begin actual development work
4. Document any configuration adjustments needed

---
*This file tracks current session state and immediate objectives.*'

create_file "$CLAUDE_DIR/memory/activeContext.md" "$ACTIVE_CONTEXT"

PRODUCT_CONTEXT='# Product Context

## Project Overview
- **Name**: $(basename "$PROJECT_ROOT")
- **Type**: Software Development Project
- **Development Pattern**: Claude Swarm simulation
- **Primary IDE**: Cursor IDE

## Architecture Overview
To be defined during architecture phase.

## Technology Stack
To be determined by technical team.

## Team Structure (Simulated)
- System Architect: High-level design and technical strategy
- Frontend Developer: UI/UX implementation
- Backend Developer: Server-side logic and APIs
- Database Specialist: Data modeling and optimization
- DevOps Engineer: Infrastructure and deployment
- Security Specialist: Security implementation and review
- Performance Engineer: Performance optimization
- QA Engineer: Quality assurance and testing

## Project Scope
To be defined during planning phase.

## Key Components
To be identified during analysis phase.

---
*This file maintains high-level project context and scope.*'

create_file "$CLAUDE_DIR/memory/productContext.md" "$PRODUCT_CONTEXT"

# Create example pattern file
echo -e "\n${BLUE}📋 Creating example pattern files...${NC}"
SWARM_PATTERN='# Swarm Coordination Pattern

## Overview
This pattern enables effective coordination between different specialist roles within a single Cursor IDE session.

## Implementation

### 1. Role Switching Protocol
```
> Switch to architect mode
> Analysis: [current task requirements]
> Execution: [role-specific work]
> Handoff: [next role with context]
```

### 2. Context Preservation
- Document decisions in appropriate memory files
- Use @File references for context sharing
- Maintain role-specific knowledge separation
- Preserve session continuity across role switches

### 3. Quality Gates
- Each role validates work against domain standards
- Cross-role reviews for major decisions
- Documentation requirements vary by role
- Testing standards maintained throughout

## Usage Examples

### Feature Development
1. Architect: System design and component planning
2. Frontend: UI/UX implementation
3. Backend: API and business logic
4. Database: Schema design and optimization
5. DevOps: Deployment and infrastructure
6. Security: Security review and implementation
7. QA: Testing and validation

### Bug Investigation
1. QA: Issue reproduction and analysis
2. Relevant specialist: Root cause investigation
3. Developer: Fix implementation
4. Security: Security impact assessment
5. QA: Fix validation and regression testing

## Benefits
- Comprehensive coverage of all development aspects
- Consistent quality through specialist expertise
- Structured approach to complex problems
- Documentation and knowledge preservation

---
*Use this pattern for coordinated multi-specialist development.*'

create_file "$CLAUDE_DIR/patterns/swarm-coordination.md" "$SWARM_PATTERN"

# Make script executable
chmod +x "$0"

echo -e "\n${GREEN}✅ Cursor Swarm setup complete!${NC}"
echo -e "\n${BLUE}📋 Next Steps:${NC}"
echo "1. Open your project in Cursor IDE"
echo "2. Go to Cursor Settings > MCP to enable MCP servers"
echo "3. Verify that project rules are loaded in Settings > Rules"
echo "4. Run 'Initialize Swarm Session' task from Command Palette"
echo "5. Test role switching with: 'Switch to architect mode'"

echo -e "\n${BLUE}🔧 Configuration Summary:${NC}"
echo "- MCP servers configured in $CURSOR_DIR/mcp.json"
echo "- Project rules created in $CURSOR_DIR/rules/"
echo "- VS Code settings optimized in $VSCODE_DIR/"
echo "- Memory system initialized in $CLAUDE_DIR/memory/"
echo "- Performance optimizations applied (.cursorignore)"

echo -e "\n${YELLOW}⚠️  Important Notes:${NC}"
echo "- Set environment variables for MCP servers that require API keys"
echo "- Review and customize rules based on your specific project needs"
echo "- Monitor token usage and adjust context pruning as needed"
echo "- Regularly clean up temporary memory files"

echo -e "\n${GREEN}🎉 Ready to start Claude Swarm development!${NC}" 