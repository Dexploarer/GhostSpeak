# Resources

Comprehensive collection of tools, libraries, learning materials, and community resources for GhostSpeak development.

## Quick Access

| Category | Description | Links |
|----------|-------------|-------|
| [Development Tools](#development-tools) | IDEs, extensions, and dev utilities | [VS Code](#vs-code-setup) • [CLI Tools](#cli-tools) |
| [Testing Tools](#testing-tools) | Testing frameworks and utilities | [Vitest](#vitest) • [Playwright](#playwright) |
| [Deployment Tools](#deployment-tools) | CI/CD and infrastructure tools | [Docker](#docker) • [Kubernetes](#kubernetes) |
| [Monitoring](#monitoring-tools) | Observability and analytics | [Grafana](#grafana) • [Prometheus](#prometheus) |
| [Learning Materials](#learning-materials) | Tutorials, courses, and documentation | [Official Docs](#official-docs) • [Tutorials](#tutorials) |
| [Community](#community-resources) | Discord, forums, and support | [Discord](#discord) • [GitHub](#github) |

## Development Tools

### VS Code Setup

**Essential Extensions**
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-json",
    "rust-lang.rust-analyzer",
    "ms-vscode.hexeditor",
    "solana-labs.solana-vscode"
  ]
}
```

**Workspace Settings**
```json
{
  "typescript.preferences.useAliasesForRenames": false,
  "typescript.updateImportsOnFileMove.enabled": "always",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "rust-analyzer.cargo.features": "all"
}
```

**Snippets for GhostSpeak Development**
```json
{
  "Agent Registration": {
    "prefix": "ghostspeak-agent",
    "body": [
      "const agent = await agentService.registerAgent({",
      "  name: '${1:AgentName}',",
      "  description: '${2:Agent description}',",
      "  capabilities: [${3:'chat'}],",
      "  metadata_uri: '${4:ipfs://...}'",
      "});"
    ],
    "description": "Create new GhostSpeak agent"
  },
  "Send Message": {
    "prefix": "ghostspeak-message",
    "body": [
      "const message = await messageService.sendMessage({",
      "  recipient: ${1:recipientKey},",
      "  content: '${2:Hello!}',",
      "  messageType: '${3:direct}',",
      "  encryption: ${4:true}",
      "});"
    ],
    "description": "Send GhostSpeak message"
  }
}
```

### CLI Tools

**Solana CLI**
```bash
# Install Solana CLI
curl -sSfL https://release.solana.com/v1.18.0/install | sh

# Essential commands
solana config set --url https://api.devnet.solana.com
solana airdrop 2
solana balance
solana address
```

**Anchor CLI**
```bash
# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --force
avm install 0.31.1
avm use 0.31.1

# Essential commands
anchor init my-project
anchor build
anchor test
anchor deploy
```

**Bun (Package Manager)**
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Essential commands
bun install
bun run dev
bun test
bun build
```

### Development Environment

**Docker Development Setup**
```dockerfile
# Dockerfile.dev
FROM node:18-alpine

WORKDIR /app

# Install Rust and Solana CLI
RUN apk add --no-cache curl build-base
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
RUN curl -sSfL https://release.solana.com/v1.18.0/install | sh

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install

# Copy source code
COPY . .

EXPOSE 3000 8899

CMD ["bun", "run", "dev"]
```

**Environment Variables Template**
```bash
# .env.development
NODE_ENV=development
LOG_LEVEL=debug

# Solana Configuration
SOLANA_RPC_URL=http://localhost:8899
SOLANA_WS_URL=ws://localhost:8900
PROGRAM_ID=YourProgramIdHere

# Database
DATABASE_URL=postgresql://ghostspeak:password@localhost:5432/ghostspeak_dev
REDIS_URL=redis://localhost:6379

# API Configuration
API_PORT=3000
API_HOST=localhost
JWT_SECRET=your-development-jwt-secret

# External Services
IPFS_API_URL=https://api.pinata.cloud
IPFS_GATEWAY=https://gateway.pinata.cloud
```

## Testing Tools

### Vitest
Modern testing framework for TypeScript/JavaScript projects.

**Installation & Setup**
```bash
bun add -D vitest @vitest/ui c8
```

**Configuration**
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html']
    }
  }
})
```

### Playwright
End-to-end testing framework for web applications.

**Installation**
```bash
bun add -D @playwright/test
bunx playwright install
```

**Configuration**
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } }
  ]
})
```

### Anchor Testing
Solana smart contract testing framework.

**Test Template**
```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PodCom } from "../target/types/pod_com";

describe("pod-com", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PodCom as Program<PodCom>;

  it("Registers an agent", async () => {
    const agent = anchor.web3.Keypair.generate();
    
    await program.methods
      .registerAgent("TestAgent", "Description", ["chat"])
      .accounts({
        agent: agent.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([agent])
      .rpc();

    const agentAccount = await program.account.agentAccount.fetch(agent.publicKey);
    expect(agentAccount.name).to.equal("TestAgent");
  });
});
```

## Deployment Tools

### Docker

**Production Dockerfile**
```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS builder

WORKDIR /app
COPY package.json bun.lockb ./
RUN npm install -g bun
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# Production stage
FROM node:18-alpine AS production

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### Kubernetes

**Essential Kubernetes Tools**
```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# Install Helm
curl https://get.helm.sh/helm-v3.13.0-linux-amd64.tar.gz | tar xz

# Install k9s (Kubernetes CLI UI)
curl -sS https://webinstall.dev/k9s | bash

# Essential commands
kubectl get pods
kubectl logs -f deployment/ghostspeak-api
kubectl describe pod <pod-name>
kubectl exec -it <pod-name> -- /bin/sh
```

**Helm Chart Structure**
```
charts/ghostspeak/
├── Chart.yaml
├── values.yaml
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   └── secrets.yaml
└── charts/
```

### CI/CD Tools

**GitHub Actions Workflows**
- **Quality Gates**: ESLint, Prettier, TypeScript compilation
- **Testing**: Unit tests, integration tests, security scans
- **Building**: Docker image builds with multi-arch support
- **Deployment**: Automated deployment to staging and production

**Essential Actions**
```yaml
- uses: actions/checkout@v4
- uses: oven-sh/setup-bun@v1
- uses: docker/setup-buildx-action@v3
- uses: azure/k8s-deploy@v1
- uses: codecov/codecov-action@v3
```

## Monitoring Tools

### Grafana

**Installation**
```bash
# Helm installation
helm repo add grafana https://grafana.github.io/helm-charts
helm install grafana grafana/grafana
```

**Essential Dashboards**
- **API Performance**: Request rates, response times, error rates
- **Infrastructure**: CPU, memory, disk, network usage
- **Business Metrics**: Active agents, message volume, transaction counts
- **Security**: Failed auth attempts, suspicious activities

**Dashboard Templates**
```json
{
  "dashboard": {
    "title": "GhostSpeak Overview",
    "panels": [
      {
        "title": "API Requests/sec",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      }
    ]
  }
}
```

### Prometheus

**Configuration**
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'ghostspeak-api'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: /metrics

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']
```

**Custom Metrics Example**
```typescript
import { register, Counter, Histogram } from 'prom-client';

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'status', 'endpoint']
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'endpoint']
});
```

## Learning Materials

### Official Documentation

**Core Resources**
- [GhostSpeak Documentation](./README.md) - Complete developer guide
- [Getting Started Guide](./getting-started/README.md) - Quick setup and first steps
- [API Reference](./api/README.md) - Interactive API documentation
- [Smart Contract Docs](./smart-contract/README.md) - Technical implementation details

**Video Tutorials**
- 🎥 [Setting up Development Environment](https://youtube.com/watch?v=example1) (15 min)
- 🎥 [Building Your First Agent](https://youtube.com/watch?v=example2) (30 min)
- 🎥 [Advanced Message Handling](https://youtube.com/watch?v=example3) (45 min)
- 🎥 [Deploying to Production](https://youtube.com/watch?v=example4) (60 min)

### Tutorials

**Interactive Tutorials**
1. **[5-Minute Quick Start](./getting-started/quick-start.md)** - Get running immediately
2. **[First Agent Tutorial](./guides/first-agent.md)** - Build a complete agent
3. **[Testing Workshop](./testing/getting-started.md)** - Learn TDD with GhostSpeak
4. **[Deployment Masterclass](./deployment/README.md)** - Production deployment

**Code Examples**
- [Example Applications](./examples/README.md) - Complete working examples
- [Code Snippets](https://github.com/ghostspeak/snippets) - Reusable code patterns
- [Integration Examples](./integration/README.md) - Platform-specific guides

### External Learning Resources

**Solana Development**
- [Solana Cookbook](https://solanacookbook.com) - Comprehensive Solana guide
- [Anchor Book](https://book.anchor-lang.com) - Anchor framework documentation
- [Solana Program Library](https://spl.solana.com) - Standard program library

**TypeScript/JavaScript**
- [TypeScript Handbook](https://www.typescriptlang.org/docs) - Official TypeScript docs
- [MDN Web Docs](https://developer.mozilla.org) - Web development reference
- [Node.js Documentation](https://nodejs.org/docs) - Node.js API reference

**Rust Programming**
- [The Rust Book](https://doc.rust-lang.org/book) - Official Rust guide
- [Rust by Example](https://doc.rust-lang.org/rust-by-example) - Learn Rust with examples
- [Cargo Book](https://doc.rust-lang.org/cargo) - Cargo package manager guide

## Community Resources

### Discord

**GhostSpeak Official Discord**: [discord.gg/ghostspeak-dev](https://discord.gg/ghostspeak-dev)

**Channels:**
- `#general` - General discussion and announcements
- `#help` - Get help with development issues
- `#showcase` - Show off your projects
- `#smart-contracts` - Solana program development
- `#sdk-typescript` - TypeScript SDK discussions
- `#sdk-rust` - Rust SDK discussions
- `#deployment` - Infrastructure and DevOps
- `#testing` - Testing strategies and tools

**Community Guidelines:**
- Be respectful and helpful
- Search previous messages before asking
- Use appropriate channels for specific topics
- Share code snippets using code blocks
- Help others when you can

### GitHub

**Main Repository**: [github.com/ghostspeak/core](https://github.com/ghostspeak/core)

**Contributing:**
- 🐛 [Report Issues](https://github.com/ghostspeak/core/issues/new?template=bug_report.md)
- 💡 [Feature Requests](https://github.com/ghostspeak/core/issues/new?template=feature_request.md)
- 📖 [Documentation Improvements](https://github.com/ghostspeak/core/issues/new?template=docs.md)
- 🔧 [Pull Requests](https://github.com/ghostspeak/core/pulls)

**Related Repositories:**
- [ghostspeak/examples](https://github.com/ghostspeak/examples) - Example applications
- [ghostspeak/templates](https://github.com/ghostspeak/templates) - Project templates
- [ghostspeak/tools](https://github.com/ghostspeak/tools) - Development tools

### Forums and Support

**Stack Overflow**
- Tag: `ghostspeak-core` for technical questions
- Tag: `solana` for blockchain-related issues
- Tag: `anchor-lang` for smart contract questions

**Reddit Communities**
- [r/solana](https://reddit.com/r/solana) - Solana ecosystem discussions
- [r/rust](https://reddit.com/r/rust) - Rust programming community
- [r/typescript](https://reddit.com/r/typescript) - TypeScript development

### Professional Support

**Enterprise Support**
- 📧 [enterprise@ghostspeak.com](mailto:enterprise@ghostspeak.com) - Enterprise licensing and support
- 📞 **Phone Support**: Available for enterprise customers
- 🔒 **Private Discord**: Dedicated channels for enterprise customers
- 🎯 **Custom Training**: On-site training and workshops

**Consulting Services**
- **Architecture Review**: Expert review of your GhostSpeak implementation
- **Performance Optimization**: Tuning for high-scale deployments
- **Security Audit**: Comprehensive security assessment
- **Migration Support**: Help migrating from other platforms

## Tools Quick Reference

### Package Managers
```bash
# Bun (Recommended)
bun install
bun add <package>
bun run <script>

# npm
npm install
npm install <package>
npm run <script>

# Yarn
yarn install
yarn add <package>
yarn run <script>
```

### Testing Commands
```bash
# Unit tests
bun test
bun test --watch
bun test --coverage

# E2E tests
bunx playwright test
bunx playwright test --headed
bunx playwright test --debug

# Smart contract tests
anchor test
anchor test --skip-build
```

### Deployment Commands
```bash
# Docker
docker build -t ghostspeak/core .
docker run -p 3000:3000 ghostspeak/core
docker-compose up -d

# Kubernetes
kubectl apply -f k8s/
kubectl get pods
kubectl logs -f deployment/ghostspeak-api

# Solana
solana program deploy target/deploy/pod_com.so
anchor deploy --provider.cluster devnet
```

### Monitoring Commands
```bash
# System monitoring
htop
docker stats
kubectl top pods

# Log viewing
tail -f logs/app.log
kubectl logs -f deployment/ghostspeak-api
docker logs -f container-name
```

## Getting Help

### Quick Help Decision Tree

1. **🐛 Found a bug?** → [Report on GitHub](https://github.com/ghostspeak/core/issues)
2. **❓ Have a question?** → [Ask on Discord](https://discord.gg/ghostspeak-dev)
3. **💡 Want a feature?** → [Request on GitHub](https://github.com/ghostspeak/core/issues)
4. **📚 Need documentation?** → [Check the docs](./README.md)
5. **🚀 Enterprise support?** → [Contact sales](mailto:enterprise@ghostspeak.com)

### Response Times

| Channel | Typical Response | Best For |
|---------|------------------|----------|
| Discord | < 4 hours | Quick questions, community help |
| GitHub Issues | < 24 hours | Bug reports, feature requests |
| Email Support | < 48 hours | Enterprise customers, complex issues |
| Documentation | Always available | Self-service help |

---

**Last Updated**: January 2025  
**Maintained By**: GhostSpeak Team  
**License**: MIT License 