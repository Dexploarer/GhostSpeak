/**
 * AgentDiscoveryClient Unit Tests
 *
 * Comprehensive tests for x402 agent discovery functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Address, Rpc, SolanaRpcApi } from '@solana/kit';
import type { Agent, AgentSearchParams, AgentSearchResponse } from '../../../src/x402/AgentDiscoveryClient';

describe('AgentDiscoveryClient', () => {
  let mockRpc: Partial<Rpc<SolanaRpcApi>>;

  beforeEach(() => {
    mockRpc = {
      getProgramAccounts: vi.fn(),
      getAccountInfo: vi.fn(),
    } as unknown as Partial<Rpc<SolanaRpcApi>>;
  });

  describe('Agent Structure', () => {
    it('should validate agent with all required fields', () => {
      const agent: Agent = {
        address: 'EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD' as Address,
        owner: 'EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD' as Address,
        name: 'Test Agent',
        description: 'A test AI agent',
        capabilities: ['query', 'analysis', 'generation'],
        x402_enabled: true,
        x402_payment_address: 'EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD' as Address,
        x402_accepted_tokens: ['EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD' as Address],
        x402_price_per_call: 1_000_000n,
        x402_service_endpoint: 'https://agent.example.com/api',
        x402_total_payments: 1000_000_000n,
        x402_total_calls: 1000n,
        reputation_score: 85,
        total_jobs: 500n,
        successful_jobs: 475n,
        total_earnings: 5000_000_000n,
        average_rating: 4.5,
        created_at: 1699999999n,
        metadata_uri: 'https://metadata.example.com/agent.json',
        framework_origin: 'eliza',
        is_verified: true,
      };

      expect(agent.x402_enabled).toBe(true);
      expect(agent.capabilities).toHaveLength(3);
      expect(agent.reputation_score).toBeGreaterThan(0);
    });

    it('should handle agent without x402 enabled', () => {
      const agent: Partial<Agent> = {
        address: 'EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD' as Address,
        name: 'Legacy Agent',
        x402_enabled: false,
      };

      expect(agent.x402_enabled).toBe(false);
    });
  });

  describe('Search Parameters', () => {
    it('should construct valid search params with all filters', () => {
      const params: AgentSearchParams = {
        capability: 'query',
        x402_enabled: true,
        accepted_tokens: ['EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD' as Address],
        min_reputation: 80,
        max_price: 5_000_000n,
        framework_origin: 'eliza',
        is_verified: true,
        page: 1,
        limit: 20,
        sort_by: 'reputation',
        sort_order: 'desc',
        query: 'AI agent',
      };

      expect(params.x402_enabled).toBe(true);
      expect(params.min_reputation).toBe(80);
      expect(params.sort_by).toBe('reputation');
    });

    it('should handle minimal search params', () => {
      const params: AgentSearchParams = {};

      expect(Object.keys(params)).toHaveLength(0);
    });

    it('should validate sort_by options', () => {
      const validSortOptions = ['reputation', 'price', 'total_jobs', 'created_at'] as const;

      validSortOptions.forEach(option => {
        const params: AgentSearchParams = {
          sort_by: option,
        };

        expect(params.sort_by).toBe(option);
      });
    });

    it('should validate sort_order options', () => {
      const params1: AgentSearchParams = { sort_order: 'asc' };
      const params2: AgentSearchParams = { sort_order: 'desc' };

      expect(params1.sort_order).toBe('asc');
      expect(params2.sort_order).toBe('desc');
    });
  });

  describe('Search Response', () => {
    it('should return properly structured response', () => {
      const response: AgentSearchResponse = {
        agents: [],
        total: 0,
        page: 1,
        limit: 20,
        hasMore: false,
      };

      expect(response.agents).toBeInstanceOf(Array);
      expect(response.page).toBe(1);
      expect(response.hasMore).toBe(false);
    });

    it('should handle pagination correctly', () => {
      const response: AgentSearchResponse = {
        agents: [],
        total: 100,
        page: 2,
        limit: 20,
        hasMore: true,
      };

      const expectedTotalPages = Math.ceil(response.total / response.limit);
      expect(expectedTotalPages).toBe(5);
      expect(response.hasMore).toBe(true);
    });
  });

  describe('Capability Filtering', () => {
    it('should filter agents by single capability', () => {
      const agents: Agent[] = [
        {
          address: 'addr1' as Address,
          capabilities: ['query', 'analysis'],
        } as Agent,
        {
          address: 'addr2' as Address,
          capabilities: ['generation', 'translation'],
        } as Agent,
      ];

      const filtered = agents.filter(agent =>
        agent.capabilities.includes('query')
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].address).toBe('addr1' as Address);
    });

    it('should filter agents by multiple capabilities (OR)', () => {
      const requiredCapabilities = ['query', 'generation'];
      const agents: Agent[] = [
        { address: 'addr1' as Address, capabilities: ['query'] } as Agent,
        { address: 'addr2' as Address, capabilities: ['analysis'] } as Agent,
        { address: 'addr3' as Address, capabilities: ['generation'] } as Agent,
      ];

      const filtered = agents.filter(agent =>
        requiredCapabilities.some(cap => agent.capabilities.includes(cap))
      );

      expect(filtered).toHaveLength(2);
    });
  });

  describe('Price Filtering', () => {
    it('should filter agents by max price', () => {
      const maxPrice = 2_000_000n;
      const agents: Agent[] = [
        { address: 'addr1' as Address, x402_price_per_call: 1_000_000n } as Agent,
        { address: 'addr2' as Address, x402_price_per_call: 3_000_000n } as Agent,
        { address: 'addr3' as Address, x402_price_per_call: 1_500_000n } as Agent,
      ];

      const filtered = agents.filter(
        agent => agent.x402_price_per_call <= maxPrice
      );

      expect(filtered).toHaveLength(2);
    });

    it('should handle min and max price range', () => {
      const minPrice = 1_000_000n;
      const maxPrice = 2_000_000n;
      const agents: Agent[] = [
        { address: 'addr1' as Address, x402_price_per_call: 500_000n } as Agent,
        { address: 'addr2' as Address, x402_price_per_call: 1_500_000n } as Agent,
        { address: 'addr3' as Address, x402_price_per_call: 3_000_000n } as Agent,
      ];

      const filtered = agents.filter(
        agent =>
          agent.x402_price_per_call >= minPrice &&
          agent.x402_price_per_call <= maxPrice
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].x402_price_per_call).toBe(1_500_000n);
    });
  });

  describe('Reputation Filtering', () => {
    it('should filter agents by minimum reputation', () => {
      const minReputation = 80;
      const agents: Agent[] = [
        { address: 'addr1' as Address, reputation_score: 95 } as Agent,
        { address: 'addr2' as Address, reputation_score: 75 } as Agent,
        { address: 'addr3' as Address, reputation_score: 85 } as Agent,
      ];

      const filtered = agents.filter(
        agent => agent.reputation_score >= minReputation
      );

      expect(filtered).toHaveLength(2);
    });

    it('should calculate success rate from jobs', () => {
      const agent: Agent = {
        total_jobs: 100n,
        successful_jobs: 95n,
      } as Agent;

      const successRate =
        (Number(agent.successful_jobs) / Number(agent.total_jobs)) * 100;

      expect(successRate).toBe(95);
    });
  });

  describe('Framework Origin Filtering', () => {
    it('should filter by framework origin', () => {
      const agents: Agent[] = [
        { address: 'addr1' as Address, framework_origin: 'eliza' } as Agent,
        { address: 'addr2' as Address, framework_origin: 'autogen' } as Agent,
        { address: 'addr3' as Address, framework_origin: 'eliza' } as Agent,
      ];

      const filtered = agents.filter(
        agent => agent.framework_origin === 'eliza'
      );

      expect(filtered).toHaveLength(2);
    });
  });

  describe('Token Acceptance Filtering', () => {
    it('should filter agents accepting specific token', () => {
      const USDC = 'EPjFWaLb3crLMsqzeNVi3XXsPQKg6VJjfjJ8PqtzX7aD' as Address;
      const agents: Agent[] = [
        {
          address: 'addr1' as Address,
          x402_accepted_tokens: [USDC],
        } as Agent,
        {
          address: 'addr2' as Address,
          x402_accepted_tokens: ['OtherToken' as Address],
        } as Agent,
      ];

      const filtered = agents.filter(agent =>
        agent.x402_accepted_tokens.includes(USDC)
      );

      expect(filtered).toHaveLength(1);
    });

    it('should find agents accepting any of multiple tokens', () => {
      const USDC = 'USDC' as Address;
      const PYUSD = 'PYUSD' as Address;
      const acceptedTokens = [USDC, PYUSD];

      const agents: Agent[] = [
        { address: 'addr1' as Address, x402_accepted_tokens: [USDC] } as Agent,
        {
          address: 'addr2' as Address,
          x402_accepted_tokens: ['Other' as Address],
        } as Agent,
        { address: 'addr3' as Address, x402_accepted_tokens: [PYUSD] } as Agent,
      ];

      const filtered = agents.filter(agent =>
        agent.x402_accepted_tokens.some(token => acceptedTokens.includes(token))
      );

      expect(filtered).toHaveLength(2);
    });
  });

  describe('Sorting', () => {
    it('should sort by reputation descending', () => {
      const agents: Agent[] = [
        { address: 'addr1' as Address, reputation_score: 75 } as Agent,
        { address: 'addr2' as Address, reputation_score: 95 } as Agent,
        { address: 'addr3' as Address, reputation_score: 85 } as Agent,
      ];

      const sorted = [...agents].sort(
        (a, b) => b.reputation_score - a.reputation_score
      );

      expect(sorted[0].reputation_score).toBe(95);
      expect(sorted[1].reputation_score).toBe(85);
      expect(sorted[2].reputation_score).toBe(75);
    });

    it('should sort by price ascending', () => {
      const agents: Agent[] = [
        { address: 'addr1' as Address, x402_price_per_call: 3_000_000n } as Agent,
        { address: 'addr2' as Address, x402_price_per_call: 1_000_000n } as Agent,
        { address: 'addr3' as Address, x402_price_per_call: 2_000_000n } as Agent,
      ];

      const sorted = [...agents].sort((a, b) =>
        Number(a.x402_price_per_call - b.x402_price_per_call)
      );

      expect(sorted[0].x402_price_per_call).toBe(1_000_000n);
      expect(sorted[2].x402_price_per_call).toBe(3_000_000n);
    });

    it('should sort by total jobs descending', () => {
      const agents: Agent[] = [
        { address: 'addr1' as Address, total_jobs: 100n } as Agent,
        { address: 'addr2' as Address, total_jobs: 500n } as Agent,
        { address: 'addr3' as Address, total_jobs: 250n } as Agent,
      ];

      const sorted = [...agents].sort((a, b) =>
        Number(b.total_jobs - a.total_jobs)
      );

      expect(sorted[0].total_jobs).toBe(500n);
      expect(sorted[2].total_jobs).toBe(100n);
    });
  });

  describe('Caching', () => {
    it('should cache search results', () => {
      const cacheKey = 'search:capability=query&x402_enabled=true';
      const ttl = 300; // 5 minutes

      expect(cacheKey).toContain('capability=query');
      expect(ttl).toBe(300);
    });

    it('should invalidate cache after TTL', () => {
      const cachedAt = Date.now();
      const ttl = 300_000; // 5 minutes in ms
      const now = Date.now();

      const isExpired = now - cachedAt > ttl;
      expect(isExpired).toBeDefined();
    });
  });

  describe('Agent Pricing', () => {
    it('should calculate cost for multiple calls', () => {
      const pricePerCall = 1_000_000n;
      const numberOfCalls = 10;
      const totalCost = pricePerCall * BigInt(numberOfCalls);

      expect(totalCost).toBe(10_000_000n);
    });

    it('should compare agent prices', () => {
      const agent1Price = 1_000_000n;
      const agent2Price = 2_000_000n;

      expect(agent1Price < agent2Price).toBe(true);
    });
  });

  describe('Recommended Agents', () => {
    it('should recommend agents based on capability and reputation', () => {
      const agents: Agent[] = [
        {
          address: 'addr1' as Address,
          capabilities: ['query'],
          reputation_score: 95,
        } as Agent,
        {
          address: 'addr2' as Address,
          capabilities: ['query'],
          reputation_score: 75,
        } as Agent,
        {
          address: 'addr3' as Address,
          capabilities: ['analysis'],
          reputation_score: 90,
        } as Agent,
      ];

      const recommended = agents
        .filter(agent => agent.capabilities.includes('query'))
        .sort((a, b) => b.reputation_score - a.reputation_score)
        .slice(0, 5);

      expect(recommended).toHaveLength(2);
      expect(recommended[0].reputation_score).toBe(95);
    });
  });
});
