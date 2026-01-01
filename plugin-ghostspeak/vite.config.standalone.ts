import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';

// Standalone Vite config for running frontend without agent
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    // Mock API middleware for standalone development
    {
      name: 'mock-api',
      configureServer(server) {
        // Mock /api/time endpoint
        server.middlewares.use('/api/time', (req, res, next) => {
          const now = new Date();
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              timestamp: now.toISOString(),
              unix: Math.floor(now.getTime() / 1000),
              formatted: now.toLocaleString('en-US', {
                dateStyle: 'full',
                timeStyle: 'long',
              }),
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            })
          );
        });

        // Mock /helloworld endpoint
        server.middlewares.use('/helloworld', (req, res, next) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              message: 'Hello World!',
            })
          );
        });

        // Mock /api/ghost-score/:agentAddress endpoint
        server.middlewares.use('/api/ghost-score', (req, res, next) => {
          const agentAddress = req.url?.split('/').pop() || 'test';
          
          // Mock Ghost Score data
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              verified: true,
              ghostScore: 785,
              tier: 'GOLD',
              agentAddress,
              agentName: 'Test Agent',
              metrics: {
                totalJobs: 1247,
                successRate: 94,
                isActive: true,
                reputationScore: 78500,
              },
              timestamp: new Date().toISOString(),
            })
          );
        });

        // Mock /api/agents/search endpoint
        server.middlewares.use('/api/agents/search', (req, res, next) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              agents: [
                {
                  address: '11111111111111111111111111111111',
                  name: 'Test Agent 1',
                  description: 'A test agent for demonstration',
                  capabilities: ['coding', 'writing'],
                  ghostScore: 850,
                  tier: 'GOLD',
                  isActive: true,
                },
                {
                  address: '22222222222222222222222222222222',
                  name: 'Test Agent 2',
                  description: 'Another test agent',
                  capabilities: ['analysis', 'research'],
                  ghostScore: 720,
                  tier: 'SILVER',
                  isActive: true,
                },
              ],
            })
          );
        });

        // Mock /api/agents/register endpoint
        server.middlewares.use('/api/agents/register', (req, res, next) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }
          
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              success: true,
              address: '33333333333333333333333333333333',
              signature: 'mock-transaction-signature-' + Date.now(),
            })
          );
        });

        // Mock /api/payai/discover endpoint
        server.middlewares.use('/api/payai/discover', (req, res, next) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              resources: [
                {
                  url: 'https://payai.example.com/agent1',
                  description: 'Expert coding agent',
                  accepts: [{ token: 'SOL', amount: '0.1' }],
                  tags: ['coding', 'python', 'javascript'],
                },
                {
                  url: 'https://payai.example.com/agent2',
                  description: 'Content writing specialist',
                  accepts: [{ token: 'USDC', amount: '5' }],
                  tags: ['writing', 'content'],
                },
              ],
              count: 2,
            })
          );
        });

        // Mock /api/elizaos/discover endpoint
        server.middlewares.use('/api/elizaos/discover', (req, res, next) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              agents: [
                {
                  id: 'elizaos-agent-1',
                  name: 'Cloud Agent Alpha',
                  description: 'ElizaOS Cloud agent for coding tasks',
                  capabilities: ['coding', 'debugging'],
                  contact_info: {
                    email: 'alpha@example.com',
                    website: 'https://alpha.example.com',
                  },
                  status: 'active',
                  created_at: new Date().toISOString(),
                },
                {
                  id: 'elizaos-agent-2',
                  name: 'Cloud Agent Beta',
                  description: 'ElizaOS Cloud agent for content creation',
                  capabilities: ['writing', 'editing'],
                  contact_info: {
                    email: 'beta@example.com',
                  },
                  status: 'active',
                  created_at: new Date().toISOString(),
                },
              ],
              count: 2,
            })
          );
        });

        // Mock /api/elizaos/register endpoint
        server.middlewares.use('/api/elizaos/register', (req, res, next) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }
          
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              success: true,
              agentId: 'elizaos-agent-' + Date.now(),
              agent: {
                id: 'elizaos-agent-' + Date.now(),
                name: 'Registered Agent',
                status: 'active',
              },
            })
          );
        });

        // Mock /api/reputation/:agentAddress endpoint
        server.middlewares.use('/api/reputation', (req, res, next) => {
          const agentAddress = req.url?.split('/').pop() || 'test';
          
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              successRate: 94,
              serviceQuality: 88,
              responseTime: 95,
              volumeConsistency: 82,
              riskScore: 12,
              trustLevel: 'HIGH',
              badges: [
                { name: 'Gold Member', description: 'High reputation tier' },
                { name: 'Reliable', description: 'Consistent performance' },
              ],
              performanceHistory: [
                { period: 'Last 30 days', score: 94, jobsCompleted: 150 },
                { period: 'Last 7 days', score: 96, jobsCompleted: 45 },
              ],
              categoryScores: {
                coding: 92,
                writing: 88,
                analysis: 90,
              },
            })
          );
        });

        // Mock /api/credentials/verify endpoint
        server.middlewares.use('/api/credentials/verify', (req, res, next) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }
          
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              isValid: true,
              errors: [],
              verifiedAt: new Date().toISOString(),
              credential: {
                issuer: 'did:example:issuer',
                subject: 'did:example:subject',
                type: ['VerifiableCredential', 'AgentCredential'],
                validFrom: new Date(Date.now() - 86400000).toISOString(),
                validUntil: new Date(Date.now() + 86400000 * 365).toISOString(),
              },
            })
          );
        });

        // Mock /api/trust-scoreboard endpoint
        server.middlewares.use('/api/trust-scoreboard', (req, res, next) => {
          const url = new URL(req.url || '', 'http://localhost');
          const limit = parseInt(url.searchParams.get('limit') || '10');
          const category = url.searchParams.get('category') || '';

          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              agents: [
                {
                  address: '11111111111111111111111111111111',
                  name: 'Diamond Elite Alpha',
                  ghostScore: 950,
                  tier: 'DIAMOND', // >= 9000 basis points AND >= 100 jobs
                  totalJobs: 1247,
                  successRate: 98,
                  hasCredential: true,
                  credentialId: 'cred-123',
                  rank: 1,
                },
                {
                  address: '22222222222222222222222222222222',
                  name: 'Platinum Standard Beta',
                  ghostScore: 875,
                  tier: 'PLATINUM', // >= 7500 basis points AND >= 50 jobs
                  totalJobs: 892,
                  successRate: 95,
                  hasCredential: true,
                  credentialId: 'cred-456',
                  rank: 2,
                },
                {
                  address: '33333333333333333333333333333333',
                  name: 'Gold Lining Gamma',
                  ghostScore: 720,
                  tier: 'GOLD', // >= 6000 basis points AND >= 25 jobs
                  totalJobs: 534,
                  successRate: 92,
                  hasCredential: false,
                  rank: 3,
                },
                {
                  address: '44444444444444444444444444444444',
                  name: 'Silver Warrior Delta',
                  ghostScore: 450,
                  tier: 'SILVER', // >= 4000 basis points AND >= 10 jobs
                  totalJobs: 234,
                  successRate: 88,
                  hasCredential: false,
                  rank: 4,
                },
                {
                  address: '55555555555555555555555555555555',
                  name: 'Bronze Rising Epsilon',
                  ghostScore: 380,
                  tier: 'BRONZE', // >= 2000 basis points AND >= 5 jobs
                  totalJobs: 156,
                  successRate: 85,
                  hasCredential: true,
                  credentialId: 'cred-789',
                  rank: 5,
                },
              ].slice(0, limit),
              count: Math.min(5, limit),
              total: 5,
            })
          );
        });
      },
    },
  ],
  base: './',
  build: {
    emptyOutDir: true,
    outDir: 'dist',
    manifest: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    open: '/standalone.html',
  },
});
