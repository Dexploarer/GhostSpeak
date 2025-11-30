<!-- turso-database-integration plan -->
# Turso Database Integration Plan

## Overview

Integrate Turso (SQLite edge database) with Drizzle ORM into GhostSpeak to provide caching, transaction indexing, and analytics aggregation. This will improve performance for agent discovery, reduce on-chain RPC queries, and enable real-time analytics while staying within Turso's free tier limits (5GB storage, 500M reads/month, 10M writes/month).

## Architecture Decision

- **Primary Database**: Turso (SQLite over HTTP, edge-optimized, free tier available)
- **ORM**: Drizzle ORM (TypeScript-native, type-safe, excellent DX)
- **Use Cases**: 
  - Agent registry cache (reduce RPC calls by 80%+)
  - x402 transaction indexing (enable fast queries)
  - Analytics aggregation (real-time metrics)
- **Data Source**: Solana blockchain remains primary source of truth
- **Storage**: IPFS continues for encrypted metadata (keep existing)

## Phase 1: Infrastructure Setup

### Task 1.1: Install Dependencies
- **File**: `packages/sdk-typescript/package.json`
- **Action**: Add Turso and Drizzle dependencies
- **Dependencies to add**:
  ```json
  "drizzle-orm": "^0.36.0",
  "@libsql/client": "^0.15.0"
  ```
- **Validation**: Run `bun install` and verify packages installed, check `bun.lock` updated

### Task 1.2: Create Database Configuration Module
- **File**: `packages/sdk-typescript/src/database/config.ts` (new file)
- **Action**: Create Turso connection configuration
- **Content**: 
  - Environment variable handling (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`)
  - Connection pooling configuration
  - Error handling for missing credentials
  - Development vs production modes
- **Validation**: File exists, exports `getTursoConfig()` function, handles missing env vars gracefully

### Task 1.3: Setup Environment Variables
- **Files**: `.env.example`, `packages/sdk-typescript/README.md`
- **Action**: Add Turso environment variables documentation
- **Variables**: 
  - `TURSO_DATABASE_URL` (required for production)
  - `TURSO_AUTH_TOKEN` (required for production)
- **Documentation**: Include setup instructions, link to Turso docs
- **Validation**: `.env.example` updated, README includes setup instructions

### Task 1.4: Create Database Connection Utility
- **File**: `packages/sdk-typescript/src/database/connection.ts` (new file)
- **Action**: Create singleton database connection manager
- **Features**: 
  - Connection pooling
  - Health checks (`ping()` method)
  - Graceful shutdown
  - Connection retry logic
  - Lazy initialization
- **Validation**: Connection can be established, health check works, retry logic functions

**Phase 1 Validation Checklist**:
- [ ] All dependencies installed (`bun install` successful)
- [ ] Database config module created and exports config function
- [ ] Environment variables documented in `.env.example` and README
- [ ] Connection utility works and can connect to Turso
- [ ] Health check method works
- [ ] Run `bun run type-check` - no TypeScript errors
- [ ] Can successfully connect to Turso test database

## Phase 2: Schema Design and Drizzle Setup

### Task 2.1: Create Database Schema Directory
- **File**: `packages/sdk-typescript/src/database/schema/` (new directory)
- **Action**: Create schema directory structure
- **Validation**: Directory exists at correct path

### Task 2.2: Define Agent Registry Cache Schema
- **File**: `packages/sdk-typescript/src/database/schema/agents.ts` (new file)
- **Action**: Create Drizzle schema for agent cache
- **Tables**: 
  - `agents` (main agent data)
  - `agent_capabilities` (many-to-many relationship)
  - `agent_pricing` (x402 pricing information)
- **Fields**: Based on `Agent` struct from Rust (`programs/src/state/agent.rs`)
  - `agent_address` (primary key, Solana address)
  - `owner`, `name`, `description`
  - `x402_enabled`, `is_verified`
  - `reputation_score`, `total_jobs`, `success_rate`
  - `created_at`, `updated_at`, `cached_at`
- **Indexes**: `agent_address`, `owner`, `x402_enabled`, `reputation_score`
- **Validation**: Schema compiles, types match Rust struct, indexes defined

### Task 2.3: Define Transaction Index Schema
- **File**: `packages/sdk-typescript/src/database/schema/transactions.ts` (new file)
- **Action**: Create schema for x402 transaction indexing
- **Tables**: 
  - `x402_transactions` (main transaction data)
  - `x402_payments` (payment details)
- **Fields**:
  - `signature` (primary key, transaction signature)
  - `agent_address`, `payer_address`, `recipient_address`
  - `amount`, `token_mint`, `token_decimals`
  - `status`, `timestamp`, `block_time`
  - `response_time_ms`, `metadata_hash` (IPFS)
- **Indexes**: `signature`, `agent_address`, `timestamp`, `status`, `token_mint`
- **Validation**: Schema compiles, supports time-range queries, indexes optimized

### Task 2.4: Define Analytics Schema
- **File**: `packages/sdk-typescript/src/database/schema/analytics.ts` (new file)
- **Action**: Create schema for analytics aggregation
- **Tables**: 
  - `agent_analytics` (agent-level metrics)
  - `market_analytics` (market-level metrics)
  - `daily_metrics` (time-series data)
- **Fields**: Based on `AgentAnalytics` and `MarketAnalytics` from Rust
  - Agent: `total_revenue`, `total_jobs`, `success_rate`, `average_rating`, `response_time_avg`
  - Market: `total_volume`, `active_agents`, `average_price`, `price_volatility`, `demand_trend`
  - Daily: `date`, `metric_type`, `value`, `metadata`
- **Indexes**: `agent_address`, `date`, `metric_type` for time-series queries
- **Validation**: Schema compiles, supports time-series aggregation, types correct

### Task 2.5: Create Schema Index File
- **File**: `packages/sdk-typescript/src/database/schema/index.ts` (new file)
- **Action**: Export all schemas and create Drizzle instance
- **Content**: 
  - Import all schema files
  - Create and export Drizzle instance
  - Export all table definitions
  - Export TypeScript types
- **Validation**: All schemas exported, Drizzle instance created, types available

### Task 2.6: Create Database Migration System
- **File**: `packages/sdk-typescript/src/database/migrations/` (new directory)
- **Action**: Setup Drizzle migrations
- **Files**: 
  - `0000_initial_schema.sql` (initial migration)
  - `drizzle.config.ts` (Drizzle config)
  - Migration runner script
- **Validation**: Can run migrations (`bun run db:migrate`), tables created in Turso

**Phase 2 Validation Checklist**:
- [ ] All schema files created and compile without errors
- [ ] Schemas match Rust struct definitions
- [ ] Types are correct (TypeScript types match database schema)
- [ ] Indexes defined for common query patterns
- [ ] Migrations can be run successfully
- [ ] Tables created in Turso database
- [ ] Run `bun run type-check` - no errors

## Phase 3: Agent Registry Cache Implementation

### Task 3.1: Create Agent Cache Service
- **File**: `packages/sdk-typescript/src/database/services/AgentCacheService.ts` (new file)
- **Action**: Create service class for agent registry caching
- **Methods**: 
  - `cacheAgent(agent: Agent): Promise<void>`
  - `getAgent(address: Address): Promise<Agent | null>`
  - `searchAgents(params: AgentSearchParams): Promise<Agent[]>`
  - `invalidateAgent(address: Address): Promise<void>`
  - `bulkCacheAgents(agents: Agent[]): Promise<void>`
- **Validation**: Service class exists, all methods defined with correct signatures

### Task 3.2: Implement Agent Caching Logic
- **File**: `packages/sdk-typescript/src/database/services/AgentCacheService.ts`
- **Action**: Implement caching methods with Drizzle queries
- **Features**: 
  - Upsert agents (insert or update)
  - Search by capabilities (join with capabilities table)
  - Filter by pricing, reputation, x402_enabled
  - Pagination support
  - Sorting (reputation, price, total_jobs)
- **Validation**: Can cache and retrieve agents, search works, filters apply correctly

### Task 3.3: Integrate with AgentDiscoveryClient
- **File**: `packages/sdk-typescript/src/x402/AgentDiscoveryClient.ts`
- **Action**: Add cache layer to discovery client
- **Logic**: 
  - Check cache first for agent data
  - If cache miss or stale, fetch from on-chain
  - Update cache after on-chain fetch
  - Use cache for search operations
- **Validation**: Discovery client uses cache, reduces RPC calls, fallback works

### Task 3.4: Add Cache Invalidation Strategy
- **File**: `packages/sdk-typescript/src/database/services/AgentCacheService.ts`
- **Action**: Implement invalidation logic
- **Features**: 
  - TTL-based expiration (e.g., 5 minutes default)
  - Event-based invalidation (on agent updates)
  - Manual invalidation method
  - Batch invalidation
- **Validation**: Cache expires correctly, updates trigger invalidation, manual invalidation works

### Task 3.5: Create Agent Cache Tests
- **File**: `packages/sdk-typescript/tests/unit/database/AgentCacheService.test.ts` (new file)
- **Action**: Write comprehensive unit tests
- **Coverage**: 
  - Cache operations (get, set, upsert)
  - Search functionality
  - Filtering and sorting
  - Cache invalidation
  - Error handling
- **Validation**: All tests pass, coverage > 80%

**Phase 3 Validation Checklist**:
- [ ] AgentCacheService fully implemented
- [ ] Integration with AgentDiscoveryClient works
- [ ] Cache reduces RPC calls (measure before/after)
- [ ] Cache invalidation works correctly
- [ ] Unit tests pass with good coverage
- [ ] Run `bun run test:unit` - all tests pass
- [ ] Performance improvement verified (80%+ RPC reduction)

## Phase 4: Transaction Indexing

### Task 4.1: Create Transaction Index Service
- **File**: `packages/sdk-typescript/src/database/services/TransactionIndexService.ts` (new file)
- **Action**: Create service for indexing x402 transactions
- **Methods**: 
  - `indexTransaction(tx: Transaction, x402Data: X402PaymentData): Promise<void>`
  - `getTransactions(params: TransactionQueryParams): Promise<Transaction[]>`
  - `getAgentTransactions(agentAddress: Address): Promise<Transaction[]>`
  - `getTransactionBySignature(signature: string): Promise<Transaction | null>`
- **Validation**: Service class exists, methods defined

### Task 4.2: Implement Transaction Indexing
- **File**: `packages/sdk-typescript/src/database/services/TransactionIndexService.ts`
- **Action**: Implement indexing logic
- **Features**: 
  - Parse Solana transaction data
  - Extract x402 payment information
  - Store transaction metadata
  - Handle duplicate indexing (idempotent)
  - Batch indexing for efficiency
- **Validation**: Can index transactions, duplicates handled, batch operations work

### Task 4.3: Create Transaction Listener
- **File**: `packages/sdk-typescript/src/database/listeners/TransactionListener.ts` (new file)
- **Action**: Create listener for new transactions
- **Logic**: 
  - Subscribe to Solana transactions (WebSocket or polling)
  - Filter for x402 payment transactions
  - Extract payment data
  - Index automatically via TransactionIndexService
  - Handle errors gracefully
- **Validation**: Listener indexes new transactions, handles errors, doesn't crash

### Task 4.4: Add Transaction Query Methods
- **File**: `packages/sdk-typescript/src/database/services/TransactionIndexService.ts`
- **Action**: Add query methods for analytics
- **Methods**: 
  - `getTransactionHistory(params: HistoryParams): Promise<Transaction[]>`
  - `getVolumeByPeriod(start: Date, end: Date, token?: Address): Promise<bigint>`
  - `getTopAgents(limit: number, period?: DateRange): Promise<AgentStats[]>`
  - `getTransactionStats(params: StatsParams): Promise<TransactionStats>`
- **Validation**: Queries return correct data, performance acceptable, handles edge cases

### Task 4.5: Create Transaction Index Tests
- **File**: `packages/sdk-typescript/tests/unit/database/TransactionIndexService.test.ts` (new file)
- **Action**: Write comprehensive tests
- **Validation**: All tests pass, coverage > 80%

**Phase 4 Validation Checklist**:
- [ ] TransactionIndexService fully implemented
- [ ] Transaction listener works and indexes transactions
- [ ] Transactions indexed correctly (verify sample data)
- [ ] Query methods work and return correct results
- [ ] Unit tests pass
- [ ] Run `bun run test:unit` - all tests pass
- [ ] Can query transaction history efficiently

## Phase 5: Analytics Aggregation

### Task 5.1: Create Analytics Service
- **File**: `packages/sdk-typescript/src/database/services/AnalyticsService.ts` (new file)
- **Action**: Create service for analytics aggregation
- **Methods**: 
  - `aggregateAgentMetrics(agentAddress: Address): Promise<AgentAnalytics>`
  - `aggregateMarketMetrics(): Promise<MarketAnalytics>`
  - `getDailyMetrics(date: Date): Promise<DailyMetrics>`
  - `getTimeSeriesMetrics(start: Date, end: Date): Promise<TimeSeriesData[]>`
- **Validation**: Service class exists, methods defined

### Task 5.2: Implement Agent Analytics Aggregation
- **File**: `packages/sdk-typescript/src/database/services/AnalyticsService.ts`
- **Action**: Implement agent-level analytics
- **Metrics**: 
  - Total revenue (sum of payments)
  - Transaction count
  - Success rate (successful / total)
  - Average rating (from reputation data)
  - Average response time (from transaction metadata)
  - Customer retention
- **Validation**: Aggregations calculate correctly, match on-chain data when available

### Task 5.3: Implement Market Analytics Aggregation
- **File**: `packages/sdk-typescript/src/database/services/AnalyticsService.ts`
- **Action**: Implement market-level analytics
- **Metrics**: 
  - Total volume (sum of all transactions)
  - Active agents count
  - Average price per transaction
  - Price volatility (standard deviation)
  - Demand/supply trends
  - Market cap estimates
- **Validation**: Market metrics calculated correctly, trends identified

### Task 5.4: Add Time-Series Analytics
- **File**: `packages/sdk-typescript/src/database/services/AnalyticsService.ts`
- **Action**: Add time-series aggregation methods
- **Features**: 
  - Daily/hourly metrics aggregation
  - Trend analysis (comparing periods)
  - Period comparisons (week-over-week, month-over-month)
  - Moving averages
- **Validation**: Time-series queries work, trends calculated correctly

### Task 5.5: Integrate with Existing Analytics
- **File**: `packages/sdk-typescript/src/utils/analytics-aggregation.ts`
- **Action**: Update existing analytics to use database
- **Logic**: 
  - Check database first for aggregated data
  - If not available, aggregate from on-chain
  - Cache aggregated results in database
  - Fallback gracefully if database unavailable
- **Validation**: Analytics use database when available, fallback works, performance improved

### Task 5.6: Create Analytics Tests
- **File**: `packages/sdk-typescript/tests/unit/database/AnalyticsService.test.ts` (new file)
- **Action**: Write comprehensive tests
- **Validation**: All tests pass, coverage > 80%

**Phase 5 Validation Checklist**:
- [ ] AnalyticsService fully implemented
- [ ] Agent analytics work and match expected calculations
- [ ] Market analytics work and provide insights
- [ ] Time-series queries work efficiently
- [ ] Integration with existing analytics works
- [ ] Unit tests pass
- [ ] Run `bun run test:unit` - all tests pass
- [ ] Analytics queries perform well (< 100ms for simple, < 1s for complex)

## Phase 6: Integration and Optimization

### Task 6.1: Create Database Module Index
- **File**: `packages/sdk-typescript/src/database/index.ts` (new file)
- **Action**: Export all database services and utilities
- **Exports**: 
  - All services (AgentCacheService, TransactionIndexService, AnalyticsService)
  - Connection utilities
  - Schema types
  - Database instance
- **Validation**: All exports work, types available

### Task 6.2: Add Database to SDK Exports
- **File**: `packages/sdk-typescript/src/index.ts`
- **Action**: Export database module
- **Export**: `export * from './database/index.js'`
- **Validation**: Database accessible from SDK, types work

### Task 6.3: Add Connection Health Monitoring
- **File**: `packages/sdk-typescript/src/database/connection.ts`
- **Action**: Add health check and monitoring
- **Features**: 
  - Connection status method
  - Query performance tracking
  - Error tracking and logging
  - Connection pool metrics
- **Validation**: Health checks work, metrics collected

### Task 6.4: Optimize Queries and Indexes
- **Files**: All schema files
- **Action**: Review and optimize database indexes
- **Focus**: 
  - Common query patterns from AgentDiscoveryClient
  - Transaction history queries
  - Analytics aggregation queries
  - Add composite indexes where needed
- **Validation**: Queries perform well, indexes used effectively

### Task 6.5: Add Error Handling and Retries
- **Files**: All service files
- **Action**: Add robust error handling
- **Features**: 
  - Retry logic for transient failures
  - Graceful degradation (fallback to on-chain)
  - Error logging
  - Circuit breaker pattern for repeated failures
- **Validation**: Errors handled gracefully, fallback works, no crashes

### Task 6.6: Create Integration Tests
- **File**: `packages/sdk-typescript/tests/integration/database-integration.test.ts` (new file)
- **Action**: Write end-to-end integration tests
- **Coverage**: 
  - Cache + on-chain integration
  - Transaction indexing flow
  - Analytics aggregation flow
  - Error scenarios
  - Performance benchmarks
- **Validation**: All integration tests pass

### Task 6.7: Update Documentation
- **Files**: `packages/sdk-typescript/README.md`, `docs/`
- **Action**: Document database integration
- **Content**: 
  - Setup instructions (Turso account, environment variables)
  - Usage examples (caching, indexing, analytics)
  - Architecture diagram
  - Performance benefits
  - Free tier limits and optimization
- **Validation**: Documentation complete, examples work

**Phase 6 Validation Checklist**:
- [ ] Database module exported and accessible
- [ ] Health monitoring works
- [ ] Queries optimized (benchmark performance)
- [ ] Error handling robust (test error scenarios)
- [ ] Integration tests pass
- [ ] Documentation complete with working examples
- [ ] Run `bun run test:all` - all tests pass
- [ ] Run `bun run lint` - no errors
- [ ] Run `bun run type-check` - no errors

## Phase 7: Performance and Free Tier Optimization

### Task 7.1: Monitor Database Usage
- **Action**: Track storage, reads, writes against free tier limits
- **Tools**: Turso dashboard, custom monitoring utility
- **Metrics**: 
  - Current storage usage
  - Reads per day/week/month
  - Writes per day/week/month
  - Projected usage
- **Validation**: Usage tracking works, alerts configured

### Task 7.2: Optimize Write Operations
- **Files**: All service files
- **Action**: Reduce write operations
- **Strategies**: 
  - Batch writes (combine multiple inserts)
  - Upsert instead of insert+update
  - Reduce unnecessary cache updates
  - Implement write debouncing
- **Goal**: Stay under 10M writes/month
- **Validation**: Write operations optimized, usage within limits

### Task 7.3: Optimize Read Operations
- **Files**: All service files
- **Action**: Reduce read operations
- **Strategies**: 
  - Add application-level read caching
  - Optimize queries (select only needed fields)
  - Use pagination effectively
  - Cache query results
- **Goal**: Stay under 500M reads/month
- **Validation**: Read operations optimized, usage within limits

### Task 7.4: Implement Data Retention Policy
- **Files**: All service files
- **Action**: Archive old data, implement cleanup
- **Strategies**: 
  - Archive transactions older than 90 days
  - Keep only aggregated analytics for old data
  - Regular cleanup jobs
  - Compress historical data
- **Goal**: Stay under 5GB storage
- **Validation**: Data retention works, storage optimized

### Task 7.5: Create Usage Dashboard
- **File**: `packages/sdk-typescript/src/database/monitoring.ts` (new file)
- **Action**: Create usage monitoring utilities
- **Features**: 
  - Current usage stats
  - Projected usage calculations
  - Alerts for approaching limits
  - Optimization recommendations
- **Validation**: Can track usage metrics, alerts work

**Phase 7 Validation Checklist**:
- [ ] Usage monitoring implemented and working
- [ ] Write operations optimized (under 10M/month)
- [ ] Read operations optimized (under 500M/month)
- [ ] Data retention policy implemented (under 5GB)
- [ ] Usage dashboard works
- [ ] Free tier limits respected with buffer
- [ ] Optimization strategies documented

## Execution Rules

1. **Sequential Phase Execution**: Complete each phase fully before starting next phase
2. **Validation Gates**: Each phase has validation checklist that MUST pass before proceeding
3. **Atomic Tasks**: Each task is independent and can be verified individually
4. **No Skipping**: Do not proceed to next phase until current phase validation passes
5. **Free Tier Awareness**: Monitor usage throughout all phases, optimize for free tier limits
6. **Fallback Strategy**: Always implement fallback to on-chain if database unavailable
7. **Type Safety**: Maintain 100% TypeScript type safety throughout
8. **Performance First**: Optimize queries and operations from the start
9. **Testing Required**: Each service must have comprehensive unit tests before integration

## Success Criteria

- Agent discovery uses cache (reduces RPC calls by 80%+)
- Transactions indexed and queryable in < 100ms
- Analytics aggregated efficiently (< 1s for complex queries)
- All operations stay within Turso free tier limits
- Zero breaking changes to existing API
- All tests pass (unit + integration)
- Documentation complete with examples
- Performance benchmarks documented
- Error handling robust with graceful degradation

## To-dos

- [ ] Phase 1: Infrastructure Setup (4 tasks)
  - [ ] Install Turso and Drizzle dependencies in package.json
  - [ ] Create database configuration module (config.ts)
  - [ ] Setup environment variables for Turso (TURSO_DATABASE_URL, TURSO_AUTH_TOKEN)
  - [ ] Create database connection utility with pooling and health checks
  - [ ] Phase 1 Validation: Verify dependencies installed, config works, connection established

- [ ] Phase 2: Schema Design and Drizzle Setup (6 tasks)
  - [ ] Create database schema directory structure
  - [ ] Define Agent Registry Cache schema (agents, agent_capabilities, agent_pricing tables)
  - [ ] Define Transaction Index schema (x402_transactions, x402_payments tables)
  - [ ] Define Analytics schema (agent_analytics, market_analytics, daily_metrics tables)
  - [ ] Create schema index file exporting all schemas and Drizzle instance
  - [ ] Create database migration system with Drizzle migrations
  - [ ] Phase 2 Validation: Verify schemas compile, migrations run, tables created

- [ ] Phase 3: Agent Registry Cache Implementation (5 tasks)
  - [ ] Create AgentCacheService with cacheAgent, getAgent, searchAgents, invalidateAgent methods
  - [ ] Implement agent caching logic with Drizzle queries (upsert, search, filter)
  - [ ] Integrate cache layer into AgentDiscoveryClient (check cache first, fallback to on-chain)
  - [ ] Add cache invalidation strategy (TTL-based and event-based)
  - [ ] Create unit tests for AgentCacheService
  - [ ] Phase 3 Validation: Verify cache works, reduces RPC calls, tests pass

- [ ] Phase 4: Transaction Indexing (5 tasks)
  - [ ] Create TransactionIndexService with indexTransaction, getTransactions, getAgentTransactions methods
  - [ ] Implement transaction indexing logic (parse transaction data, extract x402 info)
  - [ ] Create TransactionListener to subscribe to Solana transactions and auto-index x402 payments
  - [ ] Add transaction query methods (getTransactionHistory, getVolumeByPeriod, getTopAgents)
  - [ ] Create unit tests for TransactionIndexService
  - [ ] Phase 4 Validation: Verify transactions indexed, queries work, tests pass

- [ ] Phase 5: Analytics Aggregation (6 tasks)
  - [ ] Create AnalyticsService with aggregateAgentMetrics, aggregateMarketMetrics, getDailyMetrics methods
  - [ ] Implement agent analytics aggregation (revenue, transaction count, success rate, rating, response time)
  - [ ] Implement market analytics aggregation (total volume, active agents, average price, volatility, trends)
  - [ ] Add time-series analytics (daily/hourly metrics, trend analysis, period comparisons)
  - [ ] Integrate with existing analytics-aggregation.ts to use database when available
  - [ ] Create unit tests for AnalyticsService
  - [ ] Phase 5 Validation: Verify analytics work, time-series queries work, tests pass

- [ ] Phase 6: Integration and Optimization (7 tasks)
  - [ ] Create database module index.ts exporting all services and utilities
  - [ ] Add database to SDK exports in src/index.ts
  - [ ] Add connection health monitoring (status, query performance, error tracking)
  - [ ] Optimize queries and indexes for common query patterns
  - [ ] Add robust error handling with retries and fallback to on-chain
  - [ ] Create integration tests for end-to-end flows
  - [ ] Update documentation with setup instructions, usage examples, architecture
  - [ ] Phase 6 Validation: Verify exports work, health monitoring works, all tests pass, docs complete

- [ ] Phase 7: Performance and Free Tier Optimization (5 tasks)
  - [ ] Monitor database usage (storage, reads, writes) against free tier limits
  - [ ] Optimize write operations (batch writes, reduce unnecessary updates) to stay under 10M/month
  - [ ] Optimize read operations (add read caching, optimize queries) to stay under 500M/month
  - [ ] Implement data retention policy (archive old data, cleanup) to stay under 5GB
  - [ ] Create usage monitoring dashboard/utilities
  - [ ] Phase 7 Validation: Verify usage optimized, free tier limits respected, monitoring works

