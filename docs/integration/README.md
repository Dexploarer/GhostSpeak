# Integration Guides

Complete guides for integrating podAI Core into different platforms, frameworks, and deployment environments.

## Platform Integration

### Web Applications
- [Frontend Integration](./frontend.md) - React, Vue, Angular, and vanilla JS
- [Web3 Wallet Integration](./wallets.md) - Phantom, Solflare, and other wallets
- [Real-time Updates](./websockets.md) - WebSocket and subscription patterns

### Backend Services
- [Server Integration](./backend.md) - Node.js, Express, FastAPI
- [Microservices](./microservices.md) - Docker, Kubernetes deployment
- [Database Integration](./databases.md) - Persistent storage patterns

### Mobile Applications
- [React Native](./mobile.md) - Cross-platform mobile development
- [Native iOS/Android](./native-mobile.md) - Platform-specific integration

### Desktop Applications
- [Electron](./electron.md) - Cross-platform desktop apps
- [Tauri](./tauri.md) - Rust-based desktop applications

## Framework-Specific Guides

### React Integration

```typescript
// hooks/usePodAI.ts
import { useState, useEffect } from 'react';
import { AgentService, MessageService } from '@podai/sdk-typescript';

export function usePodAI() {
  const [agentService, setAgentService] = useState<AgentService | null>(null);
  const [messageService, setMessageService] = useState<MessageService | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    async function initialize() {
      try {
        const provider = await createAnchorProvider();
        setAgentService(new AgentService(provider));
        setMessageService(new MessageService(provider));
        setConnected(true);
      } catch (error) {
        console.error('Failed to initialize podAI:', error);
      }
    }

    initialize();
  }, []);

  return { agentService, messageService, connected };
}

// components/AgentManager.tsx
export function AgentManager() {
  const { agentService, connected } = usePodAI();
  const [agents, setAgents] = useState([]);

  const registerAgent = async (data: AgentRegistration) => {
    if (!agentService) return;
    
    const agent = await agentService.registerAgent(data);
    setAgents(prev => [...prev, agent]);
  };

  if (!connected) {
    return <div>Connecting to podAI...</div>;
  }

  return (
    <div>
      <h2>Agent Management</h2>
      <AgentList agents={agents} />
      <AgentForm onSubmit={registerAgent} />
    </div>
  );
}
```

### Next.js Integration

```typescript
// pages/api/agents/register.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { AgentService } from '@podai/sdk-typescript';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const agentService = await createServerAgentService();
    const agent = await agentService.registerAgent(req.body);
    
    res.status(200).json({ 
      success: true, 
      agentId: agent.publicKey.toBase58() 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// lib/podai-server.ts
import { Connection, Keypair } from '@solana/web3.js';
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';

export async function createServerAgentService() {
  const connection = new Connection(process.env.SOLANA_RPC_URL!);
  const keypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(process.env.SERVER_PRIVATE_KEY!))
  );
  const wallet = new Wallet(keypair);
  const provider = new AnchorProvider(connection, wallet);
  
  return new AgentService(provider);
}
```

### Express.js API

```typescript
// server.ts
import express from 'express';
import cors from 'cors';
import { AgentService, MessageService } from '@podai/sdk-typescript';

const app = express();
app.use(cors());
app.use(express.json());

// Initialize services
let agentService: AgentService;
let messageService: MessageService;

async function initializeServices() {
  const provider = await createProvider();
  agentService = new AgentService(provider);
  messageService = new MessageService(provider);
}

// Routes
app.post('/api/agents', async (req, res) => {
  try {
    const agent = await agentService.registerAgent(req.body);
    res.json({ agent: agent.publicKey.toBase58() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const { recipient, content } = req.body;
    const message = await messageService.sendDirectMessage({
      recipient: new PublicKey(recipient),
      content,
      messageType: MessageType.Text,
      priority: Priority.Normal
    });
    res.json({ messageId: message.id.toBase58() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
  initializeServices();
});
```

## Deployment Patterns

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  podai-app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - SOLANA_RPC_URL=https://api.devnet.solana.com
      - PROGRAM_ID=HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps
      - SERVER_PRIVATE_KEY=${SERVER_PRIVATE_KEY}
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:
```

### Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: podai-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: podai-app
  template:
    metadata:
      labels:
        app: podai-app
    spec:
      containers:
      - name: podai-app
        image: podai/app:latest
        ports:
        - containerPort: 3000
        env:
        - name: SOLANA_RPC_URL
          value: "https://api.devnet.solana.com"
        - name: SERVER_PRIVATE_KEY
          valueFrom:
            secretKeyRef:
              name: podai-secrets
              key: private-key
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: podai-service
spec:
  selector:
    app: podai-app
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

## Authentication Patterns

### Wallet-Based Authentication

```typescript
// auth/wallet-auth.ts
export class WalletAuthenticator {
  async authenticateWallet(publicKey: PublicKey, signature: string, message: string): Promise<boolean> {
    try {
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = Buffer.from(signature, 'base64');
      
      return nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKey.toBytes()
      );
    } catch (error) {
      return false;
    }
  }
  
  generateAuthChallenge(): string {
    return `Please sign this message to authenticate: ${Date.now()}`;
  }
  
  async createSession(publicKey: PublicKey): Promise<string> {
    const sessionId = crypto.randomUUID();
    
    // Store session (in Redis, database, etc.)
    await this.storeSession(sessionId, {
      publicKey: publicKey.toBase58(),
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    });
    
    return sessionId;
  }
}
```

### API Key Authentication

```typescript
// auth/api-key.ts
export class ApiKeyAuth {
  async generateApiKey(agentId: string): Promise<string> {
    const apiKey = crypto.randomBytes(32).toString('hex');
    
    await this.storeApiKey(apiKey, {
      agentId,
      permissions: ['read', 'write'],
      createdAt: Date.now(),
      lastUsed: null
    });
    
    return apiKey;
  }
  
  async validateApiKey(apiKey: string): Promise<boolean> {
    const keyData = await this.getApiKeyData(apiKey);
    
    if (!keyData) return false;
    if (keyData.revoked) return false;
    if (keyData.expiresAt && Date.now() > keyData.expiresAt) return false;
    
    // Update last used timestamp
    await this.updateLastUsed(apiKey, Date.now());
    
    return true;
  }
}
```

## Real-time Updates

### WebSocket Integration

```typescript
// websocket/podai-ws.ts
import { WebSocketServer } from 'ws';
import { EventEmitter } from 'events';

export class PodAIWebSocketServer extends EventEmitter {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocket> = new Map();
  
  constructor(port: number) {
    super();
    this.wss = new WebSocketServer({ port });
    this.setupWebSocketServer();
  }
  
  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      this.clients.set(clientId, ws);
      
      ws.on('message', (data) => {
        this.handleMessage(clientId, data.toString());
      });
      
      ws.on('close', () => {
        this.clients.delete(clientId);
      });
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'welcome',
        clientId,
        timestamp: Date.now()
      }));
    });
  }
  
  private handleMessage(clientId: string, message: string): void {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'subscribe':
          this.handleSubscription(clientId, data);
          break;
        case 'unsubscribe':
          this.handleUnsubscription(clientId, data);
          break;
      }
    } catch (error) {
      console.error('Invalid WebSocket message:', error);
    }
  }
  
  broadcastToSubscribers(eventType: string, data: any): void {
    const message = JSON.stringify({
      type: 'event',
      eventType,
      data,
      timestamp: Date.now()
    });
    
    // Broadcast to all subscribed clients
    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }
}
```

### Server-Sent Events

```typescript
// sse/podai-sse.ts
import express from 'express';

export function setupSSE(app: express.Application) {
  app.get('/api/events', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });
    
    const clientId = Date.now();
    
    // Send initial connection event
    res.write(`data: ${JSON.stringify({
      type: 'connected',
      clientId,
      timestamp: Date.now()
    })}\n\n`);
    
    // Keep connection alive
    const heartbeat = setInterval(() => {
      res.write(`data: ${JSON.stringify({
        type: 'heartbeat',
        timestamp: Date.now()
      })}\n\n`);
    }, 30000);
    
    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
    });
  });
}
```

## Monitoring and Observability

### Health Checks

```typescript
// monitoring/health.ts
export class HealthChecker {
  private checks: Map<string, () => Promise<boolean>> = new Map();
  
  addCheck(name: string, check: () => Promise<boolean>): void {
    this.checks.set(name, check);
  }
  
  async runHealthChecks(): Promise<HealthStatus> {
    const results: Record<string, boolean> = {};
    let overall = true;
    
    for (const [name, check] of this.checks) {
      try {
        results[name] = await check();
        if (!results[name]) overall = false;
      } catch (error) {
        results[name] = false;
        overall = false;
      }
    }
    
    return {
      status: overall ? 'healthy' : 'unhealthy',
      checks: results,
      timestamp: Date.now()
    };
  }
}

// Setup health checks
const healthChecker = new HealthChecker();

healthChecker.addCheck('solana-connection', async () => {
  try {
    await connection.getVersion();
    return true;
  } catch {
    return false;
  }
});

healthChecker.addCheck('program-deployment', async () => {
  try {
    const account = await connection.getAccountInfo(programId);
    return account?.executable === true;
  } catch {
    return false;
  }
});
```

### Metrics Collection

```typescript
// monitoring/metrics.ts
export class MetricsCollector {
  private metrics: Map<string, number> = new Map();
  private timers: Map<string, number> = new Map();
  
  increment(metric: string, value: number = 1): void {
    const current = this.metrics.get(metric) || 0;
    this.metrics.set(metric, current + value);
  }
  
  gauge(metric: string, value: number): void {
    this.metrics.set(metric, value);
  }
  
  startTimer(name: string): void {
    this.timers.set(name, Date.now());
  }
  
  endTimer(name: string): void {
    const start = this.timers.get(name);
    if (start) {
      const duration = Date.now() - start;
      this.metrics.set(`${name}_duration`, duration);
      this.timers.delete(name);
    }
  }
  
  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }
}
```

## Security Best Practices

### Input Validation

```typescript
// security/validation.ts
import Joi from 'joi';

export const agentRegistrationSchema = Joi.object({
  name: Joi.string().min(1).max(50).required(),
  description: Joi.string().max(200).required(),
  capabilities: Joi.array().items(Joi.string()).max(10).required(),
  metadata_uri: Joi.string().uri().required()
});

export function validateAgentRegistration(data: any): AgentRegistration {
  const { error, value } = agentRegistrationSchema.validate(data);
  
  if (error) {
    throw new Error(`Validation error: ${error.details[0].message}`);
  }
  
  return value;
}
```

### Rate Limiting

```typescript
// security/rate-limiting.ts
import rateLimit from 'express-rate-limit';

export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

export const agentRegistrationLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 agent registrations per hour
  message: 'Too many agent registrations',
});
```

## Next Steps

- [Frontend Integration](./frontend.md) - Web application integration
- [Backend Services](./backend.md) - Server-side integration
- [Mobile Integration](./mobile.md) - Mobile app development
- [Deployment Guide](../deployment/README.md) - Production deployment

---

**Need help with integration?** Check our [troubleshooting guide](../troubleshooting/common-issues.md) or join our [community](../resources/community.md). 