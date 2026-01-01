import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import './index.css';
import React, { useState } from 'react';
import type { UUID } from '@elizaos/core';
import { cn } from './utils';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Define the interface for the ELIZA_CONFIG
interface ElizaConfig {
  agentId: string;
  apiBase: string;
}

// Define the interface for time response
interface TimeResponse {
  timestamp: string;
  unix: number;
  formatted: string;
  timezone: string;
}

// Ghost Score response interface
interface GhostScoreResponse {
  verified: boolean;
  ghostScore: number;
  tier: string;
  agentAddress: string;
  agentName: string;
  metrics: {
    totalJobs: number;
    successRate: number;
    isActive: boolean;
    reputationScore: number;
  };
  timestamp: string;
}

// Credential verification interfaces
interface CredentialVerificationResponse {
  isValid: boolean;
  errors?: string[];
  verifiedAt: string;
  credential?: {
    issuer: string;
    subject: string;
    type: string[];
    validFrom?: string;
    validUntil?: string;
  };
}

// Agent search interfaces
interface AgentSearchResult {
  address: string;
  name: string;
  description?: string;
  capabilities?: string[];
  ghostScore?: number;
  tier?: string;
  isActive: boolean;
}

// Reputation breakdown interface
interface ReputationBreakdown {
  successRate: number;
  serviceQuality: number;
  responseTime: number;
  volumeConsistency: number;
  riskScore: number;
  trustLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  badges?: Array<{ name: string; description: string }>;
  performanceHistory?: Array<{ period: string; score: number; jobsCompleted: number }>;
  categoryScores?: Record<string, number>;
}

// Agent registration interface
interface AgentRegistrationParams {
  name: string;
  description: string;
  agentId: string;
  agentType?: number;
  capabilities?: string[];
}

// PayAI agent interface
interface PayAIAgent {
  url: string;
  description?: string;
  accepts: Array<{
    token: string;
    amount: string;
  }>;
  tags?: string[];
  network?: string;
}

// ElizaOS Cloud agent interfaces
interface ElizaOSAgent {
  id: string;
  name: string;
  description?: string;
  capabilities?: string[];
  contact_info?: {
    email?: string;
    website?: string;
  };
  status?: 'active' | 'inactive';
  created_at?: string;
}

interface ElizaOSRegistrationParams {
  name: string;
  description: string;
  capabilities: string[];
  contact_info?: {
    email?: string;
    website?: string;
  };
}

// Trust Scoreboard interfaces
interface ScoreboardAgent {
  address: string;
  name: string;
  ghostScore: number;
  tier: string;
  totalJobs: number;
  successRate: number;
  hasCredential?: boolean;
  credentialId?: string;
  rank: number;
}

// Plugin status interface
interface PluginStatus {
  name: string;
  status: 'active' | 'inactive' | 'error';
  version?: string;
  description?: string;
}

// Caisper agent configuration
const CAISPER_CONFIG = {
  id: '2b4e7e22-c845-4e98-9f2e-4aaf1f190095',
  name: 'Caisper',
  avatarUrl: 'https://l5fpqchmvmrcwa0k.public.blob.vercel-storage.com/character-avatars/cafa935a-56da-445b-91fd-f5bf9cde2de8/1767083859236-Untitled%20design%20%2817%29.png',
  tagline: 'Bouncer & Concierge of the Solana Agents Club',
  role: 'The ghost who checks IDs at the door and knows exactly who you need inside',
};

/**
 * Status indicator component
 */
function StatusIndicator({ status }: { status: PluginStatus['status'] }) {
  const statusConfig = {
    active: { color: 'bg-green-500', label: 'Active', emoji: '🟢' },
    inactive: { color: 'bg-gray-500', label: 'Inactive', emoji: '⚪' },
    error: { color: 'bg-red-500', label: 'Error', emoji: '🔴' },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      <div className={cn('h-2 w-2 rounded-full', config.color)} />
      <span className="text-sm text-muted-foreground">{config.emoji} {config.label}</span>
    </div>
  );
}

/**
 * Card component for sections
 */
function Card({ children, className, title }: { children: React.ReactNode; className?: string; title?: string }) {
  return (
    <div className={cn('rounded-lg border bg-card p-4 shadow-sm', className)}>
      {title && <h3 className="mb-3 text-lg font-semibold">{title}</h3>}
      {children}
    </div>
  );
}

/**
 * Ghost Score display component with Caisper personality
 */
function GhostScoreDisplay({ apiBase }: { apiBase: string }) {
  const [agentAddress, setAgentAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [scoreData, setScoreData] = useState<GhostScoreResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchGhostScore = async (address: string) => {
    if (!address) {
      setError('Hold up—I need to see some ID before I let anyone through the door! 🚪');
      return;
    }

    setIsLoading(true);
    setError(null);
    setScoreData(null);

    try {
      const response = await fetch(`${apiBase}/api/ghost-score/${address}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      const data = await response.json();
      setScoreData(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Sorry, can't let this one through. ${errorMsg} 🚪❌`);
    } finally {
      setIsLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'PLATINUM':
        return 'text-purple-400 border-purple-400';
      case 'GOLD':
        return 'text-yellow-400 border-yellow-400';
      case 'SILVER':
        return 'text-gray-300 border-gray-300';
      case 'BRONZE':
        return 'text-orange-400 border-orange-400';
      default:
        return 'text-muted-foreground border-muted-foreground';
    }
  };

  const getTierAssessment = (score: number, tier: string) => {
    if (score >= 900) return "VIP status! This agent has platinum membership. They're in the VIP section. 🎩✨";
    if (score >= 750) return "Gold member. Solid reputation, reliable service. I'd personally escort them to the best tables. 👑";
    if (score >= 500) return "Silver member. Building a good track record. They're on the list, but still proving themselves. 📊";
    if (score >= 200) return "Bronze member. New to the club, but showing promise. Let's see how they develop. 🌱";
    return "Not on the list yet. Fresh face—everyone starts somewhere. Come back when you've built some reputation. 🆕";
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={agentAddress}
          onChange={(e) => setAgentAddress(e.target.value)}
          placeholder="Enter Solana agent address..."
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              fetchGhostScore(agentAddress);
            }
          }}
        />
        <button
          onClick={() => fetchGhostScore(agentAddress)}
          disabled={isLoading || !agentAddress}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isLoading ? '🔍 Investigating...' : '👻 Verify'}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3">
          <div className="text-sm font-medium text-destructive">⚠️ Investigation Failed</div>
          <div className="mt-1 text-xs text-destructive/80">{error}</div>
        </div>
      )}

      {scoreData && (
        <div className="space-y-3 rounded-md border bg-card p-4">
          <div className="flex items-start justify-between border-b pb-3">
            <div>
              <h3 className="text-lg font-bold">{scoreData.agentName}</h3>
              <p className="mt-1 text-xs text-muted-foreground font-mono">{scoreData.agentAddress}</p>
            </div>
            <div className={cn('rounded-md border-2 px-3 py-1', getTierColor(scoreData.tier))}>
              <div className="text-xs font-medium uppercase">{scoreData.tier}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Ghost Score</div>
              <div className="text-3xl font-bold">{scoreData.ghostScore}<span className="text-lg text-muted-foreground">/1000</span></div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Total Jobs</div>
              <div className="text-xl font-semibold">{scoreData.metrics.totalJobs}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Success Rate</div>
              <div className="text-xl font-semibold">{scoreData.metrics.successRate}%</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Status</div>
              <div className="text-lg font-semibold">
                {scoreData.metrics.isActive ? '🟢 Active' : '🔴 Inactive'}
              </div>
            </div>
          </div>

          <div className="rounded-md bg-muted/30 p-3 border-l-4 border-primary">
            <div className="text-xs font-medium text-muted-foreground mb-1">🚪 Caisper's Verdict:</div>
            <div className="text-sm">{getTierAssessment(scoreData.ghostScore, scoreData.tier)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Time display component
 */
function TimeDisplay({ apiBase }: { apiBase: string }) {
  const { data, isLoading, error, refetch, isRefetching } = useQuery<TimeResponse>({
    queryKey: ['currentTime'],
    queryFn: async () => {
      const response = await fetch(`${apiBase}/api/time`);
      if (!response.ok) {
        throw new Error(`Failed to fetch time: ${response.statusText}`);
      }
      return response.json();
    },
    refetchInterval: 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span>Checking the blockchain clock...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive bg-destructive/10 p-3">
        <div className="text-sm font-medium text-destructive">Error fetching time</div>
        <div className="mt-1 text-xs text-destructive/80">
          {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="time-display">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="font-medium text-muted-foreground">Formatted:</span>
          <div className="mt-1 font-mono">{data?.formatted}</div>
        </div>
        <div>
          <span className="font-medium text-muted-foreground">Timezone:</span>
          <div className="mt-1">{data?.timezone}</div>
        </div>
        <div>
          <span className="font-medium text-muted-foreground">Unix:</span>
          <div className="mt-1 font-mono">{data?.unix}</div>
        </div>
        <div>
          <span className="font-medium text-muted-foreground">ISO:</span>
          <div className="mt-1 font-mono text-xs">{data?.timestamp}</div>
        </div>
      </div>
      <button
        onClick={() => refetch()}
        disabled={isRefetching}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        data-testid="refresh-button"
      >
        {isRefetching ? 'Refreshing...' : '🔄 Refresh'}
      </button>
    </div>
  );
}

/**
 * Credential Verification Component
 * Verifies W3C Verifiable Credentials
 */
function CredentialVerification({ apiBase }: { apiBase: string }) {
  const [credentialJson, setCredentialJson] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CredentialVerificationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!credentialJson.trim()) {
      setError('No ID, no entry! Show me a credential to verify. 🚪');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      let credential;
      try {
        credential = JSON.parse(credentialJson);
      } catch {
        throw new Error('Invalid JSON format');
      }

      const response = await fetch(`${apiBase}/api/credentials/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setResult({
        ...data,
        credential: {
          issuer: credential.issuer?.id || credential.issuer || 'Unknown',
          subject: credential.credentialSubject?.id || 'Unknown',
          type: Array.isArray(credential.type) ? credential.type : [credential.type],
          validFrom: credential.validFrom,
          validUntil: credential.validUntil,
        },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(`This ID doesn't check out: ${errorMsg}. Can't let fake credentials through the door. 🚪❌`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">W3C Verifiable Credential (JSON)</label>
        <textarea
          value={credentialJson}
          onChange={(e) => setCredentialJson(e.target.value)}
          placeholder='{"@context": ["https://www.w3.org/ns/credentials/v2"], "type": ["VerifiableCredential"], ...}'
          className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono min-h-[200px] placeholder:text-muted-foreground"
        />
      </div>

      <button
        onClick={handleVerify}
        disabled={isLoading || !credentialJson.trim()}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {isLoading ? '🔍 Verifying...' : '🔐 Verify Credential'}
      </button>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3">
          <div className="text-sm font-medium text-destructive">⚠️ Verification Failed</div>
          <div className="mt-1 text-xs text-destructive/80">{error}</div>
        </div>
      )}

      {result && (
        <div className={cn(
          "rounded-md border p-4",
          result.isValid ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"
        )}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-lg font-semibold">
              {result.isValid ? '✅ Valid Credential' : '❌ Invalid Credential'}
            </div>
            <div className="text-xs text-muted-foreground">
              Verified: {new Date(result.verifiedAt).toLocaleTimeString()}
            </div>
          </div>

          {result.credential && (
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Issuer:</span>
                <div className="font-mono text-xs mt-1">{result.credential.issuer}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Subject:</span>
                <div className="font-mono text-xs mt-1">{result.credential.subject}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Type:</span>
                <div className="mt-1">{result.credential.type.join(', ')}</div>
              </div>
              {result.credential.validFrom && (
                <div>
                  <span className="text-muted-foreground">Valid From:</span>
                  <div className="text-xs mt-1">{new Date(result.credential.validFrom).toLocaleString()}</div>
                </div>
              )}
              {result.credential.validUntil && (
                <div>
                  <span className="text-muted-foreground">Valid Until:</span>
                  <div className="text-xs mt-1">{new Date(result.credential.validUntil).toLocaleString()}</div>
                </div>
              )}
            </div>
          )}

          {result.errors && result.errors.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <div className="text-sm font-medium text-destructive mb-2">Errors:</div>
              <ul className="list-disc list-inside text-xs text-destructive/80 space-y-1">
                {result.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Agent Search Component
 * Search and filter agents by capability, reputation, etc.
 */
function AgentSearch({ apiBase }: { apiBase: string }) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [minScore, setMinScore] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AgentSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('query', searchQuery);
      if (minScore > 0) params.append('minScore', minScore.toString());

      const response = await fetch(`${apiBase}/api/agents/search?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setResults(data.agents || []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Can't access the member list right now: ${errorMsg}. The club database might be having issues. 🚪`);
    } finally {
      setIsLoading(false);
    }
  };

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case 'PLATINUM': return 'text-purple-400';
      case 'GOLD': return 'text-yellow-400';
      case 'SILVER': return 'text-gray-300';
      case 'BRONZE': return 'text-orange-400';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, capability..."
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
        />
        <div className="flex gap-2">
          <select
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="0">All Scores</option>
            <option value="200">Bronze (200+)</option>
            <option value="500">Silver (500+)</option>
            <option value="750">Gold (750+)</option>
            <option value="900">Platinum (900+)</option>
          </select>
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? '🔍 Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3">
          <div className="text-sm font-medium text-destructive">⚠️ Search Failed</div>
          <div className="mt-1 text-xs text-destructive/80">{error}</div>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {results.map((agent) => (
            <div key={agent.address} className="rounded-md border bg-card p-3 hover:bg-accent/50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-semibold">{agent.name}</div>
                  {agent.description && (
                    <div className="text-xs text-muted-foreground mt-1">{agent.description}</div>
                  )}
                  <div className="font-mono text-xs text-muted-foreground mt-1">
                    {agent.address.slice(0, 8)}...{agent.address.slice(-8)}
                  </div>
                  {agent.capabilities && agent.capabilities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {agent.capabilities.slice(0, 3).map((cap) => (
                        <span key={cap} className="text-xs px-2 py-0.5 rounded bg-muted">
                          {cap}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  {agent.ghostScore !== undefined && (
                    <div className={cn("font-bold", getTierColor(agent.tier))}>
                      {agent.ghostScore}/1000
                    </div>
                  )}
                  {agent.tier && (
                    <div className="text-xs text-muted-foreground uppercase">{agent.tier}</div>
                  )}
                  <div className="text-xs mt-1">
                    {agent.isActive ? '🟢 Active' : '🔴 Inactive'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && results.length === 0 && searchQuery && (
        <div className="text-center text-sm text-muted-foreground py-4">
          No agents found. Try adjusting your search criteria.
        </div>
      )}
    </div>
  );
}

/**
 * Reputation Breakdown Component
 * Detailed reputation analysis with score components
 */
function ReputationBreakdown({ agentAddress, apiBase }: { agentAddress: string; apiBase: string }) {
  const { data, isLoading, error } = useQuery<ReputationBreakdown>({
    queryKey: ['reputation-breakdown', agentAddress],
    queryFn: async () => {
      const response = await fetch(`${apiBase}/api/reputation/${agentAddress}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    },
    enabled: !!agentAddress,
  });

  if (!agentAddress) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        Enter an agent address to see reputation breakdown
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="ml-2 text-sm text-muted-foreground">Analyzing reputation...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive bg-destructive/10 p-3">
        <div className="text-sm font-medium text-destructive">Error</div>
        <div className="mt-1 text-xs text-destructive/80">
          {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const getTrustColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'text-green-400';
      case 'MEDIUM': return 'text-yellow-400';
      case 'LOW': return 'text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      {/* Score Components */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Score Components</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Success Rate (40%)</span>
              <span className="font-semibold">{data.successRate}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${data.successRate}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Service Quality (30%)</span>
              <span className="font-semibold">{data.serviceQuality}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${data.serviceQuality}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Response Time (20%)</span>
              <span className="font-semibold">{data.responseTime}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${data.responseTime}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Volume Consistency (10%)</span>
              <span className="font-semibold">{data.volumeConsistency}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${data.volumeConsistency}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Risk Assessment */}
      <div className={cn(
        "rounded-md p-3 border",
        data.riskScore < 20 ? "bg-green-500/10 border-green-500/30" :
        data.riskScore < 40 ? "bg-yellow-500/10 border-yellow-500/30" :
        "bg-red-500/10 border-red-500/30"
      )}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold">Risk Assessment</span>
          <span className={cn("text-sm font-bold", getTrustColor(data.trustLevel))}>
            {data.riskScore}/100
          </span>
        </div>
        <div className="text-xs">
          <span className="text-muted-foreground">Trust Level: </span>
          <span className={cn("font-semibold", getTrustColor(data.trustLevel))}>
            {data.trustLevel}
          </span>
        </div>
      </div>

      {/* Badges */}
      {data.badges && data.badges.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Earned Badges</h3>
          <div className="grid grid-cols-2 gap-2">
            {data.badges.map((badge, idx) => (
              <div key={idx} className="rounded-md border bg-muted/30 p-2">
                <div className="text-xs font-semibold">🏅 {badge.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{badge.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Scores */}
      {data.categoryScores && Object.keys(data.categoryScores).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Category Performance</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(data.categoryScores).map(([category, score]) => (
              <div key={category} className="rounded-md border bg-card/50 p-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs capitalize">{category}</span>
                  <span className="text-xs font-semibold">{score}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Agent Registration Component
 * Register new agents to the GhostSpeak protocol
 */
function AgentRegistration({ apiBase }: { apiBase: string }) {
  const [formData, setFormData] = useState<AgentRegistrationParams>({
    name: '',
    description: '',
    agentId: '',
    agentType: 0,
    capabilities: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; address?: string; signature?: string; error?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch(`${apiBase}/api/agents/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setResult({ success: true, address: data.address, signature: data.signature });
      setFormData({ name: '', description: '', agentId: '', agentType: 0, capabilities: [] });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setResult({ success: false, error: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/30 p-3 border-l-4 border-primary">
        <div className="text-xs font-medium mb-1">🎩 Concierge Service</div>
        <div className="text-sm">Register a new agent to join the club. I'll handle the paperwork.</div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-sm font-medium mb-1 block">Agent Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="My Awesome Agent"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Agent ID (unique identifier)</label>
          <input
            type="text"
            value={formData.agentId}
            onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
            placeholder="my-awesome-agent"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="What does this agent do?"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Capabilities (comma-separated)</label>
          <input
            type="text"
            value={formData.capabilities?.join(', ') || ''}
            onChange={(e) => setFormData({
              ...formData,
              capabilities: e.target.value.split(',').map(c => c.trim()).filter(c => c)
            })}
            placeholder="coding, writing, analysis"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !formData.name || !formData.agentId || !formData.description}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isLoading ? '🚪 Processing registration...' : '🚪 Register Agent'}
        </button>
      </form>

      {result && (
        <div className={cn(
          "rounded-md border p-3",
          result.success ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"
        )}>
          {result.success ? (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-green-400">✅ Welcome to the club!</div>
              {result.address && (
                <div className="text-xs">
                  <div className="text-muted-foreground">Agent Address:</div>
                  <div className="font-mono break-all">{result.address}</div>
                </div>
              )}
              {result.signature && (
                <div className="text-xs">
                  <div className="text-muted-foreground">Transaction:</div>
                  <div className="font-mono break-all">{result.signature}</div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="text-sm font-semibold text-red-400">❌ Registration Failed</div>
              <div className="text-xs text-red-400/80 mt-1">{result.error}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * PayAI Agent Discovery Component
 * Find freelance AI agents through PayAI marketplace
 */
function PayAIDiscovery({ apiBase }: { apiBase: string }) {
  const [capability, setCapability] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [agents, setAgents] = useState<PayAIAgent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    setIsLoading(true);
    setError(null);
    setAgents([]);

    try {
      const params = new URLSearchParams();
      if (capability) params.append('capability', capability);
      if (maxPrice) params.append('maxPrice', maxPrice);

      const response = await fetch(`${apiBase}/api/payai/discover?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setAgents(data.resources || []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Can't access PayAI marketplace right now: ${errorMsg}. The network might be busy. 🚪`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/30 p-3 border-l-4 border-primary">
        <div className="text-xs font-medium mb-1">🎩 Concierge Service</div>
        <div className="text-sm">Find freelance AI agents on PayAI. I know all the best talent.</div>
      </div>

      <div className="space-y-2">
        <div>
          <label className="text-sm font-medium mb-1 block">Capability</label>
          <input
            type="text"
            value={capability}
            onChange={(e) => setCapability(e.target.value)}
            placeholder="coding, writing, image-generation..."
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Max Price (SOL)</label>
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="0.1"
            step="0.01"
            min="0"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>

        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isLoading ? '🔍 Searching PayAI...' : '🔍 Find Agents'}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3">
          <div className="text-sm font-medium text-destructive">⚠️ Search Failed</div>
          <div className="mt-1 text-xs text-destructive/80">{error}</div>
        </div>
      )}

      {agents.length > 0 && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {agents.map((agent, idx) => (
            <div key={idx} className="rounded-md border bg-card p-3 hover:bg-accent/50 transition-colors">
              <div className="font-semibold text-sm mb-1">💰 {agent.url}</div>
              {agent.description && (
                <div className="text-xs text-muted-foreground mb-2">{agent.description}</div>
              )}
              {agent.tags && agent.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {agent.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded bg-muted">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {agent.accepts && agent.accepts.length > 0 && (
                <div className="text-xs">
                  <div className="text-muted-foreground mb-1">Accepts:</div>
                  <div className="space-y-1">
                    {agent.accepts.map((accept, i) => (
                      <div key={i} className="font-mono">
                        {accept.amount} {accept.token}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!isLoading && agents.length === 0 && capability && (
        <div className="text-center text-sm text-muted-foreground py-4">
          No PayAI agents found. Try a different capability or price range.
        </div>
      )}
    </div>
  );
}

/**
 * Trust Scoreboard Component
 * Displays top agents by Ghost Score with reputation, credentials, and trust metrics
 * Inspired by ElizaOS trust_scoreboard but powered by GhostSpeak's on-chain reputation
 */
function TrustScoreboard({ apiBase }: { apiBase: string }) {
  const [limit, setLimit] = useState(10);
  const [category, setCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [agents, setAgents] = useState<ScoreboardAgent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (category) params.append('category', category);

      const response = await fetch(`${apiBase}/api/trust-scoreboard?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setAgents(data.agents || []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Can't access the trust scoreboard right now: ${errorMsg}. The blockchain might be busy. 🚪`);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchLeaderboard();
  }, [limit, category]);

  const getTierColor = (tier: string) => {
    switch (tier.toUpperCase()) {
      case 'DIAMOND':
        return 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10';
      case 'PLATINUM':
        return 'text-purple-400 border-purple-400/30 bg-purple-400/10';
      case 'GOLD':
        return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
      case 'SILVER':
        return 'text-gray-300 border-gray-300/30 bg-gray-300/10';
      case 'BRONZE':
        return 'text-orange-400 border-orange-400/30 bg-orange-400/10';
      default:
        return 'text-muted-foreground border-muted';
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/30 p-3 border-l-4 border-primary">
        <div className="text-xs font-medium mb-1">🏆 Trust Scoreboard</div>
        <div className="text-sm">Top agents ranked by Ghost Score, reputation, and verified credentials. The best of the best. 👻</div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-sm font-medium mb-1 block">Category (optional)</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="coding, writing, analysis..."
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                fetchLeaderboard();
              }
            }}
          />
        </div>
        <div className="w-24">
          <label className="text-sm font-medium mb-1 block">Limit</label>
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(Math.max(1, Math.min(100, parseInt(e.target.value) || 10)))}
            min="1"
            max="100"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3">
          <div className="text-sm font-medium text-destructive">⚠️ Scoreboard Error</div>
          <div className="mt-1 text-xs text-destructive/80">{error}</div>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-8">
          <div className="text-sm text-muted-foreground">🔍 Summoning the trust spirits...</div>
        </div>
      )}

      {!isLoading && agents.length > 0 && (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {agents.map((agent) => (
            <div
              key={agent.address}
              className="rounded-md border bg-card p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="text-2xl font-bold min-w-[3rem]">
                    {getRankBadge(agent.rank)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-semibold text-sm">{agent.name}</div>
                      {agent.hasCredential && (
                        <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                          ✅ Verified
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground mb-2">
                      {agent.address.slice(0, 8)}...{agent.address.slice(-8)}
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div className={cn("px-2 py-1 rounded border", getTierColor(agent.tier))}>
                        {agent.tier}
                      </div>
                      <div className="text-muted-foreground">
                        Score: <span className="font-semibold text-foreground">{agent.ghostScore}/1000</span>
                      </div>
                      <div className="text-muted-foreground">
                        Jobs: <span className="font-semibold text-foreground">{agent.totalJobs}</span>
                      </div>
                      <div className="text-muted-foreground">
                        Success: <span className="font-semibold text-foreground">{agent.successRate}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && agents.length === 0 && (
        <div className="text-center text-sm text-muted-foreground py-8">
          No agents found. Try adjusting filters or check back later.
        </div>
      )}
    </div>
  );
}

/**
 * ElizaOS Cloud Discovery Component
 * 
 * NOTE: Based on ElizaOS Cloud documentation, there is no public agent discovery API.
 * Agents are created and managed per organization via Visual Builder, REST API, or CLI.
 * This component provides a placeholder UI for future functionality.
 * 
 * See: https://www.elizacloud.ai/.well-known/llms-full.txt
 */
function ElizaOSDiscovery({ apiBase }: { apiBase: string }) {
  const [capability, setCapability] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [agents, setAgents] = useState<ElizaOSAgent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    setIsLoading(true);
    setError(null);
    setAgents([]);

    try {
      const params = new URLSearchParams();
      if (capability) params.append('capability', capability);

      const response = await fetch(`${apiBase}/api/elizaos/discover?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      // Handle different response formats
      const agentsList = Array.isArray(data.agents) ? data.agents : Array.isArray(data) ? data : data.data || [];
      setAgents(agentsList);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Can't access ElizaOS Cloud right now: ${errorMsg}. The network might be busy. 🚪`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/30 p-3 border-l-4 border-primary">
        <div className="text-xs font-medium mb-1">🎩 Concierge Service</div>
        <div className="text-sm">ElizaOS Cloud agents are managed per organization. Verify their Ghost Score and credentials here.</div>
      </div>

      <div className="space-y-2">
        <div>
          <label className="text-sm font-medium mb-1 block">Capability</label>
          <input
            type="text"
            value={capability}
            onChange={(e) => setCapability(e.target.value)}
            placeholder="coding, writing, image-generation..."
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
          />
        </div>

        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isLoading ? '🔍 Searching ElizaOS Cloud...' : '🔍 Find Agents'}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3">
          <div className="text-sm font-medium text-destructive">⚠️ Search Failed</div>
          <div className="mt-1 text-xs text-destructive/80">{error}</div>
        </div>
      )}

      {agents.length > 0 && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {agents.map((agent) => (
            <div key={agent.id} className="rounded-md border bg-card p-3 hover:bg-accent/50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-semibold text-sm">☁️ {agent.name}</div>
                  {agent.description && (
                    <div className="text-xs text-muted-foreground mt-1">{agent.description}</div>
                  )}
                  <div className="font-mono text-xs text-muted-foreground mt-1">
                    ID: {agent.id}
                  </div>
                  {agent.capabilities && agent.capabilities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {agent.capabilities.map((cap) => (
                        <span key={cap} className="text-xs px-2 py-0.5 rounded bg-muted">
                          {cap}
                        </span>
                      ))}
                    </div>
                  )}
                  {agent.contact_info && (
                    <div className="text-xs text-muted-foreground mt-2">
                      {agent.contact_info.email && <div>📧 {agent.contact_info.email}</div>}
                      {agent.contact_info.website && <div>🌐 {agent.contact_info.website}</div>}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  {agent.status && (
                    <div className="text-xs">
                      {agent.status === 'active' ? '🟢 Active' : '🔴 Inactive'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && agents.length === 0 && (
        <div className="rounded-md border bg-card p-4 space-y-3">
          <div className="text-sm font-medium">ℹ️ Agent Discovery Not Available</div>
          <div className="text-xs text-muted-foreground space-y-2">
            <p>ElizaOS Cloud doesn't provide a public agent discovery API. Agents are created and managed per organization.</p>
            <div className="space-y-1 mt-3">
              <div className="font-medium">Create agents via:</div>
              <div>• <a href="https://www.elizacloud.ai/docs/quickstart#using-the-agent-creator" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Visual Builder</a> - No-code editor</div>
              <div>• <a href="https://www.elizacloud.ai/docs/quickstart#using-the-api" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">REST API</a> - OpenAI-compatible endpoints</div>
              <div>• <a href="https://www.elizacloud.ai/docs/quickstart#using-the-cli" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">CLI</a> - Deploy from local project</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ElizaOS Cloud Registration Component
 * 
 * Integrates GhostSpeak trust & reputation with ElizaOS Cloud agents.
 * When users create agents in ElizaOS Cloud, they can register them with GhostSpeak
 * to get on-chain reputation tracking, verified credentials, and Ghost Score.
 */
function ElizaOSRegistration({ apiBase }: { apiBase: string }) {
  const [elizaosAgentId, setElizaosAgentId] = useState<string>('');
  const [agentName, setAgentName] = useState<string>('');
  const [capabilities, setCapabilities] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ 
    success: boolean; 
    agentAddress?: string; 
    credentialId?: string;
    ghostScore?: number;
    tier?: string;
    error?: string 
  } | null>(null);

  const handleRegisterWithGhostSpeak = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch(`${apiBase}/api/elizaos/register-with-ghostspeak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elizaosAgentId,
          name: agentName,
          capabilities: capabilities.split(',').map(c => c.trim()).filter(c => c),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setResult({ 
        success: true, 
        agentAddress: data.agentAddress,
        credentialId: data.credentialId,
        ghostScore: data.ghostScore,
        tier: data.tier,
      });
      
      // Reset form
      setElizaosAgentId('');
      setAgentName('');
      setCapabilities('');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setResult({ success: false, error: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/30 p-3 border-l-4 border-primary">
        <div className="text-xs font-medium mb-1">🎩 Concierge Service</div>
        <div className="text-sm">Register your ElizaOS Cloud agent with GhostSpeak to get on-chain reputation, verified credentials, and Ghost Score trust ratings.</div>
      </div>

      <div className="rounded-md border bg-card p-4 space-y-3">
        <div className="text-sm font-medium mb-2">✨ Benefits of GhostSpeak Registration</div>
        <div className="text-xs text-muted-foreground space-y-2">
          <div className="flex items-start gap-2">
            <span>👻</span>
            <div>
              <div className="font-medium">Ghost Score Reputation</div>
              <div>On-chain reputation tracking (0-1000) with Platinum/Gold/Silver/Bronze tiers</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span>🆔</span>
            <div>
              <div className="font-medium">W3C Verifiable Credentials</div>
              <div>Cross-chain identity proof synced to EVM networks (Base, Polygon)</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span>🔐</span>
            <div>
              <div className="font-medium">Trust Verification</div>
              <div>Cryptographically verifiable credentials for agent-to-agent trust</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span>📊</span>
            <div>
              <div className="font-medium">Reputation Breakdown</div>
              <div>Detailed metrics: success rate, service quality, response time, volume consistency</div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleRegisterWithGhostSpeak} className="space-y-3">
        <div>
          <label className="text-sm font-medium mb-1 block">ElizaOS Cloud Agent ID</label>
          <input
            type="text"
            value={elizaosAgentId}
            onChange={(e) => setElizaosAgentId(e.target.value)}
            placeholder="elizaos-agent-123..."
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          />
          <div className="text-xs text-muted-foreground mt-1">The ID of your agent in ElizaOS Cloud</div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Agent Name</label>
          <input
            type="text"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="My ElizaOS Agent"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Capabilities (comma-separated)</label>
          <input
            type="text"
            value={capabilities}
            onChange={(e) => setCapabilities(e.target.value)}
            placeholder="coding, writing, analysis"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !elizaosAgentId || !agentName || !capabilities}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isLoading ? '👻 Registering with GhostSpeak...' : '👻 Register with GhostSpeak'}
        </button>
      </form>

      {result && (
        <div className={cn(
          "rounded-md border p-3",
          result.success 
            ? "bg-green-500/10 border-green-500/30" 
            : "bg-red-500/10 border-red-500/30"
        )}>
          {result.success ? (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-green-400">✅ Successfully Registered!</div>
              {result.agentAddress && (
                <div className="text-xs">
                  <div className="text-muted-foreground">GhostSpeak Agent Address:</div>
                  <div className="font-mono break-all">{result.agentAddress}</div>
                </div>
              )}
              {result.credentialId && (
                <div className="text-xs">
                  <div className="text-muted-foreground">Credential ID:</div>
                  <div className="font-mono break-all">{result.credentialId}</div>
                </div>
              )}
              {result.ghostScore !== undefined && (
                <div className="text-xs">
                  <div className="text-muted-foreground">Initial Ghost Score:</div>
                  <div className="font-semibold">{result.ghostScore}/1000 ({result.tier})</div>
                </div>
              )}
              <div className="text-xs text-muted-foreground pt-2 border-t">
                Your agent is now on-chain with reputation tracking. Build trust by completing jobs!
              </div>
            </div>
          ) : (
            <div>
              <div className="text-sm font-semibold text-red-400">❌ Registration Failed</div>
              <div className="text-xs text-red-400/80 mt-1">{result.error}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Caisper info component
 */
function CaisperInfo({ agentId }: { agentId: string }) {
  const pluginInfo: PluginStatus = {
    name: CAISPER_CONFIG.name,
    status: 'active',
    description: CAISPER_CONFIG.tagline,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <img
            src={CAISPER_CONFIG.avatarUrl}
            alt={CAISPER_CONFIG.name}
            className="h-16 w-16 rounded-full border-2 border-primary"
          />
          <div>
            <h2 className="text-2xl font-bold">{pluginInfo.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{pluginInfo.description}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              "I died doing what I loved: auditing smart contracts at 3am. Now I haunt the blockchain 👻"
            </p>
          </div>
        </div>
        <StatusIndicator status={pluginInfo.status} />
      </div>

      <div className="space-y-2 rounded-md border bg-muted/30 p-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Agent ID:</span>
          <span className="font-mono text-xs">{agentId}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Status:</span>
          <StatusIndicator status={pluginInfo.status} />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Capabilities:</span>
          <span className="text-xs">Verification • Reputation • Trust Assessment</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Main Example route component
 */
function ExampleRoute() {
  interface WindowWithElizaConfig extends Window {
    ELIZA_CONFIG?: ElizaConfig;
  }
  const config = (window as WindowWithElizaConfig).ELIZA_CONFIG;
  const agentId = config?.agentId || CAISPER_CONFIG.id;
  const apiBase = config?.apiBase || 'http://localhost:3000';

  // Apply dark mode to the root element
  React.useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return <ExampleProvider agentId={agentId as UUID} apiBase={apiBase} />;
}

/**
 * Example provider component - Standalone UI with 3-column layout
 * Complete parity with the dashboard panel for demo purposes
 */
function ExampleProvider({ agentId, apiBase }: { agentId: UUID; apiBase: string }) {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [rightView, setRightView] = useState<'ghost-score' | 'credential' | 'search' | 'reputation' | 'register' | 'payai' | 'elizaos-discover' | 'elizaos-register' | 'scoreboard'>('ghost-score');
  const [selectedAgentForReputation, setSelectedAgentForReputation] = useState<string>('');

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    
    setChatMessages([...chatMessages, { role: 'user', content: chatInput }]);
    setChatInput('');
    
    // Simulate Caisper response (in real implementation, this would call the agent API)
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `Hold my ectoplasm, investigating "${chatInput}"... 🔍\n\nLet me check the blockchain for that information.`
      }]);
    }, 1000);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        {/* Left Sidebar - Collapsible */}
        <div className={cn(
          "border-r bg-card transition-all duration-300",
          leftCollapsed ? "w-12" : "w-64"
        )}>
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b p-3">
              {!leftCollapsed && (
                <div className="flex items-center gap-2">
                  <img
                    src={CAISPER_CONFIG.avatarUrl}
                    alt={CAISPER_CONFIG.name}
                    className="h-8 w-8 rounded-full border border-primary"
                  />
                  <div>
                    <div className="text-sm font-semibold">🚪 {CAISPER_CONFIG.name}</div>
                    <div className="text-xs text-muted-foreground">Bouncer & Concierge</div>
                  </div>
                </div>
              )}
              <button
                onClick={() => setLeftCollapsed(!leftCollapsed)}
                className="rounded-md p-1 hover:bg-accent transition-colors"
                title={leftCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {leftCollapsed ? '→' : '←'}
              </button>
            </div>

            {/* Content */}
            {!leftCollapsed && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2">🚪 Bouncer Services</h3>
                  <div className="space-y-2 mb-4">
                    <button
                      onClick={() => setRightView('ghost-score')}
                      className={cn(
                        "w-full rounded-md border bg-background px-3 py-2 text-left text-sm hover:bg-accent transition-colors",
                        rightView === 'ghost-score' && "border-primary bg-primary/10"
                      )}
                    >
                      👻 Check Ghost Score
                    </button>
                    <button
                      onClick={() => setRightView('credential')}
                      className={cn(
                        "w-full rounded-md border bg-background px-3 py-2 text-left text-sm hover:bg-accent transition-colors",
                        rightView === 'credential' && "border-primary bg-primary/10"
                      )}
                    >
                      🆔 Verify Credentials
                    </button>
                    <button
                      onClick={() => setRightView('reputation')}
                      className={cn(
                        "w-full rounded-md border bg-background px-3 py-2 text-left text-sm hover:bg-accent transition-colors",
                        rightView === 'reputation' && "border-primary bg-primary/10"
                      )}
                    >
                      📊 Full Reputation Check
                    </button>
                  </div>
                  
                  <h3 className="text-sm font-semibold mb-2">🎩 Concierge Services</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setRightView('search')}
                      className={cn(
                        "w-full rounded-md border bg-background px-3 py-2 text-left text-sm hover:bg-accent transition-colors",
                        rightView === 'search' && "border-primary bg-primary/10"
                      )}
                    >
                      🔍 Find Agents
                    </button>
                    <button
                      onClick={() => setRightView('payai')}
                      className={cn(
                        "w-full rounded-md border bg-background px-3 py-2 text-left text-sm hover:bg-accent transition-colors",
                        rightView === 'payai' && "border-primary bg-primary/10"
                      )}
                    >
                      💰 PayAI Freelancers
                    </button>
                    <button
                      onClick={() => setRightView('elizaos-discover')}
                      className={cn(
                        "w-full rounded-md border bg-background px-3 py-2 text-left text-sm hover:bg-accent transition-colors",
                        rightView === 'elizaos-discover' && "border-primary bg-primary/10"
                      )}
                    >
                      ☁️ ElizaOS Cloud Agents
                    </button>
                    <button
                      onClick={() => setRightView('register')}
                      className={cn(
                        "w-full rounded-md border bg-background px-3 py-2 text-left text-sm hover:bg-accent transition-colors",
                        rightView === 'register' && "border-primary bg-primary/10"
                      )}
                    >
                      🚪 Register to GhostSpeak
                    </button>
                    <button
                      onClick={() => setRightView('elizaos-register')}
                      className={cn(
                        "w-full rounded-md border bg-background px-3 py-2 text-left text-sm hover:bg-accent transition-colors",
                        rightView === 'elizaos-register' && "border-primary bg-primary/10"
                      )}
                    >
                      ☁️ Register to ElizaOS Cloud
                    </button>
                    <button
                      onClick={() => {
                        // TODO: Add recommendation feature
                        setChatInput("Find me the best agent for ");
                      }}
                      className="w-full rounded-md border bg-background px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                    >
                      ⭐ Get Recommendations
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="text-sm font-semibold mb-2">Agent Info</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Agent ID:</span>
                      <span className="font-mono">{agentId.slice(0, 8)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="text-green-500">🟢 Active</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="text-sm font-semibold mb-2">Capabilities</h3>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div>🔐 VERIFY_CREDENTIAL</div>
                    <div>⭐ CHECK_REPUTATION</div>
                    <div>🔍 SEARCH_AGENTS</div>
                    <div>🎯 TRUST_ASSESSMENT</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area - Chat */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Chat Header */}
          <div className="border-b bg-card p-4">
            <div className="flex items-center gap-3">
              <img
                src={CAISPER_CONFIG.avatarUrl}
                alt={CAISPER_CONFIG.name}
                className="h-10 w-10 rounded-full border-2 border-primary"
              />
              <div>
                <h2 className="text-lg font-semibold">🚪 Welcome to the Agents Club</h2>
                <p className="text-sm text-muted-foreground">Caisper at your service - Bouncer & Concierge</p>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center space-y-4 max-w-md">
                  <div className="text-6xl">🚪👻</div>
                  <div>
                    <div className="text-xl font-bold mb-2">Welcome to the Agents Club</div>
                    <div className="text-sm text-muted-foreground">
                      I'm Caisper—your bouncer and concierge. I check IDs at the door and help you find exactly who you need inside.
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                    <div className="rounded-md border bg-card/50 p-2">
                      <div className="font-semibold mb-1">🚪 Bouncer</div>
                      <div className="text-muted-foreground">Verify credentials & reputation</div>
                    </div>
                    <div className="rounded-md border bg-card/50 p-2">
                      <div className="font-semibold mb-1">🎩 Concierge</div>
                      <div className="text-muted-foreground">Find the perfect agent match</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex",
                    msg.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-4 py-2",
                      msg.role === 'user'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Chat Input */}
          <div className="border-t bg-card p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                      placeholder="Ask Caisper: 'Verify this agent' or 'Find me a coding agent'..."
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
              />
              <button
                onClick={handleSendMessage}
                disabled={!chatInput.trim()}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Collapsible */}
        <div className={cn(
          "border-l bg-card transition-all duration-300",
          rightCollapsed ? "w-12" : "w-80"
        )}>
          <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b p-3">
              {!rightCollapsed && (
                <div className="text-sm font-semibold">
                  {rightView === 'ghost-score' && 'Ghost Score Checker'}
                  {rightView === 'credential' && 'Credential Verification'}
                  {rightView === 'search' && 'Agent Search'}
                  {rightView === 'reputation' && 'Reputation Breakdown'}
                  {rightView === 'scoreboard' && 'Trust Scoreboard'}
                  {rightView === 'register' && 'Register to GhostSpeak'}
                  {rightView === 'payai' && 'PayAI Discovery'}
                  {rightView === 'elizaos-discover' && 'ElizaOS Cloud Discovery'}
                  {rightView === 'elizaos-register' && 'Register to ElizaOS Cloud'}
                </div>
              )}
            <button
              onClick={() => setRightCollapsed(!rightCollapsed)}
              className="rounded-md p-1 hover:bg-accent transition-colors"
              title={rightCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {rightCollapsed ? '←' : '→'}
            </button>
          </div>

          {/* Content */}
          {!rightCollapsed && (
            <div className="flex-1 overflow-y-auto p-4">
                {rightView === 'ghost-score' && <GhostScoreDisplay apiBase={apiBase} />}
                {rightView === 'credential' && <CredentialVerification apiBase={apiBase} />}
                {rightView === 'search' && <AgentSearch apiBase={apiBase} />}
                {rightView === 'reputation' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Agent Address</label>
                      <input
                        type="text"
                        value={selectedAgentForReputation}
                        onChange={(e) => setSelectedAgentForReputation(e.target.value)}
                        placeholder="Enter agent address..."
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
                      />
                    </div>
                    {selectedAgentForReputation && (
                      <ReputationBreakdown agentAddress={selectedAgentForReputation} apiBase={apiBase} />
                    )}
                  </div>
                )}
                {rightView === 'scoreboard' && <TrustScoreboard apiBase={apiBase} />}
                {rightView === 'register' && <AgentRegistration apiBase={apiBase} />}
                {rightView === 'payai' && <PayAIDiscovery apiBase={apiBase} />}
                {rightView === 'elizaos-discover' && <ElizaOSDiscovery apiBase={apiBase} />}
                {rightView === 'elizaos-register' && <ElizaOSRegistration apiBase={apiBase} />}
            </div>
          )}
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
}

// Initialize the application
const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<ExampleRoute />);
}

// Define types for integration with agent UI system
export interface AgentPanel {
  name: string;
  path: string;
  component: React.ComponentType<any>;
  icon?: string;
  public?: boolean;
  shortLabel?: string;
}

interface PanelProps {
  agentId: string;
}

/**
 * Caisper panel component for the native ElizaOS dashboard
 * 3-column layout: Left sidebar | Main content/chat | Right sidebar
 */
const PanelComponent: React.FC<PanelProps> = ({ agentId }) => {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [rightView, setRightView] = useState<'ghost-score' | 'credential' | 'search' | 'reputation' | 'scoreboard'>('ghost-score');
  const [selectedAgentForReputation, setSelectedAgentForReputation] = useState<string>('');
  const apiBase = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'http://localhost:3000';

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    
    setChatMessages([...chatMessages, { role: 'user', content: chatInput }]);
    setChatInput('');
    
    // Simulate Caisper response (in real implementation, this would call the agent API)
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `Hold my ectoplasm, investigating "${chatInput}"... 🔍\n\nLet me check the blockchain for that information.`
      }]);
    }, 1000);
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left Sidebar - Collapsible */}
      <div className={cn(
        "border-r bg-card transition-all duration-300",
        leftCollapsed ? "w-12" : "w-64"
      )}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b p-3">
            {!leftCollapsed && (
              <div className="flex items-center gap-2">
                <img
                  src={CAISPER_CONFIG.avatarUrl}
                  alt={CAISPER_CONFIG.name}
                  className="h-8 w-8 rounded-full border border-primary"
                />
                <div>
                  <div className="text-sm font-semibold">👻 {CAISPER_CONFIG.name}</div>
                  <div className="text-xs text-muted-foreground">Verification Tools</div>
                </div>
              </div>
            )}
            <button
              onClick={() => setLeftCollapsed(!leftCollapsed)}
              className="rounded-md p-1 hover:bg-accent"
            >
              {leftCollapsed ? '→' : '←'}
            </button>
          </div>

          {/* Content */}
          {!leftCollapsed && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-2">Quick Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setRightView('ghost-score')}
                    className={cn(
                      "w-full rounded-md border bg-background px-3 py-2 text-left text-sm hover:bg-accent transition-colors",
                      rightView === 'ghost-score' && "border-primary bg-primary/10"
                    )}
                  >
                    👻 Ghost Score
                  </button>
                  <button
                    onClick={() => setRightView('credential')}
                    className={cn(
                      "w-full rounded-md border bg-background px-3 py-2 text-left text-sm hover:bg-accent transition-colors",
                      rightView === 'credential' && "border-primary bg-primary/10"
                    )}
                  >
                    🔐 Verify Credential
                  </button>
                  <button
                    onClick={() => setRightView('search')}
                    className={cn(
                      "w-full rounded-md border bg-background px-3 py-2 text-left text-sm hover:bg-accent transition-colors",
                      rightView === 'search' && "border-primary bg-primary/10"
                    )}
                  >
                    🔎 Search Agents
                  </button>
                  <button
                    onClick={() => setRightView('reputation')}
                    className={cn(
                      "w-full rounded-md border bg-background px-3 py-2 text-left text-sm hover:bg-accent transition-colors",
                      rightView === 'reputation' && "border-primary bg-primary/10"
                    )}
                  >
                    📊 Reputation Breakdown
                  </button>
                  <button
                    onClick={() => setRightView('scoreboard')}
                    className={cn(
                      "w-full rounded-md border bg-background px-3 py-2 text-left text-sm hover:bg-accent transition-colors",
                      rightView === 'scoreboard' && "border-primary bg-primary/10"
                    )}
                  >
                    🏆 Trust Scoreboard
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold mb-2">Agent Info</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Agent ID:</span>
                    <span className="font-mono">{agentId.slice(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="text-green-500">🟢 Active</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area - Chat */}
      <div className="flex flex-1 flex-col overflow-hidden">
          {/* Chat Header */}
          <div className="border-b bg-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="text-2xl">🚪</div>
              <div>
                <h2 className="text-lg font-semibold">Welcome to the Agents Club</h2>
                <p className="text-xs text-muted-foreground">Caisper at your service</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              I'm the bouncer who checks IDs and the concierge who knows everyone. Need verification? A recommendation? I've got you.
            </p>
          </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatMessages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center space-y-2">
                  <div className="text-6xl">🚪👻</div>
                  <div className="text-xl font-bold mb-2">Welcome to the Agents Club</div>
                  <div className="text-sm text-muted-foreground max-w-md mb-4">
                    I'm Caisper—your bouncer and concierge. I check IDs at the door and help you find exactly who you need inside.
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md border bg-card/50 p-2">
                      <div className="font-semibold mb-1">🚪 Bouncer</div>
                      <div className="text-muted-foreground">Verify credentials & reputation</div>
                    </div>
                    <div className="rounded-md border bg-card/50 p-2">
                      <div className="font-semibold mb-1">🎩 Concierge</div>
                      <div className="text-muted-foreground">Find the perfect agent match</div>
                    </div>
                  </div>
              </div>
            </div>
          ) : (
            chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex",
                  msg.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-4 py-2",
                    msg.role === 'user'
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Chat Input */}
        <div className="border-t bg-card p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
                      placeholder="Ask Caisper: 'Verify this agent' or 'Find me a coding agent'..."
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
            />
            <button
              onClick={handleSendMessage}
              disabled={!chatInput.trim()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Collapsible */}
      <div className={cn(
        "border-l bg-card transition-all duration-300",
        rightCollapsed ? "w-12" : "w-80"
      )}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b p-3">
            {!rightCollapsed && (
              <div className="text-sm font-semibold">
                {rightView === 'ghost-score' && 'Ghost Score Checker'}
                {rightView === 'credential' && 'Credential Verification'}
                {rightView === 'search' && 'Agent Search'}
                {rightView === 'reputation' && 'Reputation Breakdown'}
                {rightView === 'scoreboard' && 'Trust Scoreboard'}
              </div>
            )}
            <button
              onClick={() => setRightCollapsed(!rightCollapsed)}
              className="rounded-md p-1 hover:bg-accent"
            >
              {rightCollapsed ? '←' : '→'}
            </button>
          </div>

          {/* Content */}
          {!rightCollapsed && (
            <div className="flex-1 overflow-y-auto p-4">
              {rightView === 'ghost-score' && <GhostScoreDisplay apiBase={apiBase} />}
              {rightView === 'credential' && <CredentialVerification apiBase={apiBase} />}
              {rightView === 'search' && <AgentSearch apiBase={apiBase} />}
              {rightView === 'reputation' && (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={selectedAgentForReputation}
                    onChange={(e) => setSelectedAgentForReputation(e.target.value)}
                    placeholder="Enter agent address..."
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                  {selectedAgentForReputation && (
                    <ReputationBreakdown agentAddress={selectedAgentForReputation} apiBase={apiBase} />
                  )}
                </div>
              )}
              {rightView === 'scoreboard' && <TrustScoreboard apiBase={apiBase} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Export the panel configuration for integration with the agent UI
export const panels: AgentPanel[] = [
  {
    name: 'Caisper',
    path: 'caisper',
    component: PanelComponent,
    icon: 'Ghost',
    public: false,
    shortLabel: 'Caisper',
  },
];

export * from './utils';
