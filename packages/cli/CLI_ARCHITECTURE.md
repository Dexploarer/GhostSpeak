# GhostSpeak CLI Architecture

**Complete Interactive Menu-Driven Experience**

## 🎯 Design Philosophy

Users just run `ghost` and everything else is intuitive through interactive menus.

## 🚀 Entry Points

### **Default Interactive Mode**
```bash
ghost                    # Launches interactive menu
ghost -i                 # Force interactive mode
ghost --interactive      # Force interactive mode
```

### **Direct Commands** (for scripting/automation)
```bash
ghost agent register     # Direct command execution
ghost ghost claim        # Bypass menu, run command
ghost --help            # Show all commands
```

## 📊 Interactive Menu Structure

```
┌─ 🚀 Welcome to GhostSpeak Interactive Mode ─────────────────┐
│                                                              │
│  🚀 Quick Start                                              │
│  🤖 AI Agents          ← Register and manage your AI agents │
│  👻 Ghost Agents       ← Claim external AI identities       │
│  ⭐ Reputation & Staking                                     │
│  🔐 Multisig Wallets   ← NEW: Shared control wallets        │
│  🔑 Pre-Authorizations ← NEW: Trustless permissions         │
│  💳 Wallet                                                   │
│  🏛️ Governance                                               │
│  🛠️ Development                                              │
│  📊 Interactive Dashboards ← NEW: Visual monitoring         │
│  ⏱️ Recent Commands                                          │
│  📚 Help & Support                                           │
│  👋 Exit                                                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## 🎨 Complete Menu Tree

### 1. 🚀 Quick Start
```
Quick Start
├── 🚀 One-Click Setup (automatic wallet + config)
├── 💳 Import Existing Wallet
├── 📋 Guided Setup Wizard
└── 📊 Check Setup Status
```

### 2. 🤖 AI Agents
```
AI Agents
├── 🤖 Register New Agent
├── 📋 List My Agents
├── 📊 Agent Status
├── ✏️ Update Agent
├── 📈 Agent Analytics
├── 🔍 Search Agents
└── 🔐 Manage Credentials
```

### 3. 👻 Ghost Agents (NEW)
```
Ghost Agents
├── 👻 Ghost Dashboard (ink UI - live monitoring)
├── 🆕 Claim Ghost Agent (SAS attestation)
├── 🔗 Link External ID (Twitter, GitHub, etc.)
└── 📋 List My Ghosts
```

### 4. ⭐ Reputation & Staking
```
Reputation & Staking
├── 📊 Reputation Dashboard (ink UI - Ghost Score)
├── 💎 Staking Dashboard (ink UI - GHOST tokens)
├── ⭐ Check Ghost Score
├── 💰 Stake GHOST
└── 🔒 Privacy Settings
```

### 5. 🔐 Multisig Wallets (NEW)
```
Multisig Wallets
├── 🔐 Multisig Dashboard (ink UI - proposals & status)
├── 🆕 Create Multisig (threshold-based)
├── 📝 Create Proposal
├── ✅ Approve Proposal
├── ⚡ Execute Proposal
└── 📋 List Multisigs
```

### 6. 🔑 Pre-Authorizations (NEW)
```
Pre-Authorizations
├── 🔑 Authorization Dashboard (ink UI - usage tracking)
├── 🆕 Create Authorization (time & index limits)
├── ❌ Revoke Authorization
├── ✅ Verify Authorization
└── 📋 List Authorizations
```

### 7. 💳 Wallet
```
Wallet
├── 📋 List Wallets
├── 🆕 Create Wallet
├── 📥 Import Wallet
├── 💰 Check Balance
└── 🔄 Switch Wallet
```

### 8. 🏛️ Governance
```
Governance
├── 🔐 Create Multisig
├── 📋 List Multisigs
├── 📜 View Proposals
└── 🗳️ Vote on Proposal
```

### 9. 🛠️ Development
```
Development
├── 🪂 Get GHOST Tokens (airdrop)
├── 💧 Get SOL (faucet)
├── 📦 SDK Information
├── 🔍 Diagnose Issues
└── ⬆️ Update CLI
```

### 10. 📊 Interactive Dashboards (NEW)
```
Dashboards (Beautiful Ink UI)
├── 📊 Main Dashboard (overview)
├── ⭐ Reputation Dashboard (Ghost Score)
├── 💎 Staking Dashboard (GHOST staking)
├── 👻 Ghost Dashboard (claimed agents)
├── 🔐 Multisig Dashboard (shared wallets)
├── 🔑 Authorization Dashboard (permissions)
└── 🪂 Airdrop Dashboard (token claims)
```

## 🎭 Two Interface Modes

### **Interactive Menus** (Primary UX)
- Navigate with arrow keys
- Select with Enter
- Visual feedback and hints
- Auto-saves recent commands
- Returns to menu after each action

**Triggered when:**
- Running `ghost` with no arguments
- Using `-i` or `--interactive` flag
- First-time user (auto-triggers onboarding)

### **Direct Commands** (For Automation)
- Traditional CLI syntax
- Script-friendly
- JSON output available
- Bypasses interactive menus

**Examples:**
```bash
ghost agent register --name "MyAgent"
ghost ghost claim --external-id @agent
ghost multisig create --threshold 2
ghost auth create --limit 100
```

## 🔄 Smart Features

### **Recent Commands Tracking**
- Last 5 commands saved to `~/.ghostspeak/recent-commands.json`
- Quick access from main menu
- Shows command name + timestamp

### **Context-Aware Hints**
- First run: Shows "⭐ Start here!" on Quick Start
- Incomplete setup: Guides to missing steps
- Recent activity: Shows command count in hint

### **Auto-Refresh Dashboards**
- All ink dashboards refresh every 5-10s
- Real-time data visualization
- Keyboard shortcuts for actions

## 📁 File Structure

```
packages/cli/
├── src/
│   ├── commands/              # Direct command implementations
│   │   ├── agent/
│   │   ├── ghost.ts          # Ghost claiming commands
│   │   ├── multisig.ts       # Multisig commands
│   │   ├── authorization.ts  # Pre-auth commands
│   │   ├── ghost-ui.ts       # Ghost dashboard wrapper
│   │   ├── multisig-ui.ts    # Multisig dashboard wrapper
│   │   └── authorization-ui.ts # Auth dashboard wrapper
│   │
│   ├── ui/commands/          # Ink (React) dashboards
│   │   ├── Ghost.tsx         # Ghost claiming dashboard
│   │   ├── Multisig.tsx      # Multisig management dashboard
│   │   ├── Authorization.tsx # Pre-auth dashboard
│   │   ├── Staking.tsx
│   │   ├── Reputation.tsx
│   │   └── Dashboard.tsx
│   │
│   ├── utils/
│   │   ├── interactive-menu.ts  # Interactive menu system
│   │   ├── sdk-helpers.ts       # Safe SDK wrappers
│   │   └── client.ts
│   │
│   └── index.ts              # CLI entry point
```

## 🎯 Complete Feature Matrix

| Feature | CLI Commands | Interactive Menu | Ink Dashboard |
|---------|--------------|------------------|---------------|
| **AI Agents** | ✅ `agent` | ✅ | ❌ |
| **Ghost Claiming** | ✅ `ghost` | ✅ | ✅ `ghost-ui` |
| **Reputation** | ✅ `reputation` | ✅ | ✅ `reputation-ui` |
| **Staking** | ✅ `staking` | ✅ | ✅ `staking-ui` |
| **Multisig** | ✅ `multisig` | ✅ | ✅ `multisig-ui` |
| **Authorization** | ✅ `auth` | ✅ | ✅ `auth-ui` |
| **Privacy** | ✅ `privacy` | ✅ | ❌ |
| **DID** | ✅ `did` | ❌ | ❌ |
| **Escrow** | ✅ `escrow` | ❌ | ❌ |
| **Governance** | ✅ `governance` | ✅ | ❌ |
| **Wallet** | ✅ `wallet` | ✅ | ❌ |
| **Development** | ✅ `airdrop`, `faucet` | ✅ | ✅ `airdrop-ui` |

## 🔑 Key Keyboard Shortcuts

### **Interactive Menu**
- `↑/↓` - Navigate options
- `Enter` - Select
- `Ctrl+C` or `Esc` - Exit
- `q` - Quit (in dashboards)

### **Ink Dashboards**
- `r` - Refresh data
- `h` or `?` - Toggle help
- `c` - Claim/Create (context-dependent)
- `s` - Simulate (staking)
- `b` - Back to dashboard
- `q` or `Esc` - Exit dashboard

## 🎉 User Experience Flow

### **First-Time User**
```
1. Run `ghost`
2. See welcome banner + "Start here!" hint
3. Select "Quick Start"
4. Choose "One-Click Setup"
5. Wallet created + funded + configured automatically
6. Return to menu
7. Select "AI Agents" → "Register New Agent"
8. Done!
```

### **Experienced User**
```
1. Run `ghost`
2. See "Recent Commands" with last actions
3. Select recent command or browse new features
4. Use dashboards for monitoring
5. Use direct commands for scripting
```

## 🚀 Launch Experience

When users run `ghost` for the first time:

```bash
$ ghost

   ___ _           _   ___                _
  / __| |_  ___ __| |_/ __|_ __  ___ __ _| | __
 | (_ | ' \/ _ (_-<  _\__ \ '_ \/ -_) _` | / /
  \___|_||_\___/__/\__|___/ .__/\___\__,_|_\_\
                          |_|
AI Agent Commerce Protocol CLI
CLI v2.0.0-beta.20 | SDK v2.0.4

👋 Welcome to GhostSpeak! It looks like this is your first time.

Quick Start Options:
  • Run ghost quickstart for complete guided setup
  • Run ghost onboard for interactive onboarding
  • Run ghost -i for interactive menu mode
  • Run ghost help getting-started for help documentation

┌   Welcome to GhostSpeak Interactive Mode
│
◆  What would you like to do?
│  ○ 🚀 Quick Start ⭐ Start here!
│  ○ 🤖 AI Agents
│  ○ 👻 Ghost Agents
│  ○ ⭐ Reputation & Staking
│  ...
```

## 📝 Summary

The GhostSpeak CLI provides:

✅ **Fully interactive menu-driven experience** - No command memorization
✅ **Beautiful ink dashboards** - Real-time visual monitoring
✅ **Smart context awareness** - Guides new users automatically
✅ **100% feature coverage** - Every SDK capability accessible
✅ **Dual interface** - Menus for humans, commands for scripts
✅ **Recent command history** - Quick access to frequent actions
✅ **Auto-refresh dashboards** - Live data without manual refresh

Users can just run `ghost` and navigate everything intuitively! 🎉
