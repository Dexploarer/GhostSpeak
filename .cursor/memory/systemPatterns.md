# 🏗️ System Patterns & Standards

**Project**: ghostspeak  
**Purpose**: Document recurring patterns, standards, and best practices  
**Last Updated**: January 27, 2025

---

## 🎯 **ARCHITECTURAL PATTERNS**

### **1. Multi-SDK Consistency Pattern**
**Problem**: Maintain consistent behavior across Rust and TypeScript SDKs
**Solution**: Standardized service layer architecture

```rust
// Rust SDK Pattern
pub struct AgentService {
    client: Arc<SolanaClient>,
    program_id: Pubkey,
}

impl AgentService {
    pub async fn register_agent(&self, params: RegisterAgentParams) -> Result<Signature> {
        let instruction = create_register_agent_instruction(params)?;
        self.client.send_and_confirm_transaction(instruction).await
    }
}
```

```typescript
// TypeScript SDK Pattern (matching structure)
class AgentService {
  constructor(
    private rpc: Rpc<SolanaRpcApi>,
    private programId: Address
  ) {}

  async registerAgent(params: RegisterAgentParams): Promise<TransactionResult> {
    const instruction = createRegisterAgent(params);
    return this.sendAndConfirmTransaction(instruction);
  }
}
```

**Benefits**:
- Consistent API across languages
- Predictable developer experience
- Shared documentation patterns
- Cross-SDK testing compatibility

---

### **2. Web3.js v2 Modern Patterns**
**Problem**: Legacy Web3.js v1 patterns incompatible with modern Solana development
**Solution**: Comprehensive v2 migration with modular imports

```typescript
// ❌ Legacy v1 Pattern (Deprecated)
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
const connection = new Connection(url);
const keypair = Keypair.generate();
const address = new PublicKey(string);

// ✅ Modern v2 Pattern (Current Standard)
import { createSolanaRpc } from "@solana/rpc";
import { generateKeyPairSigner } from "@solana/signers";
import { address } from "@solana/addresses";

const rpc = createSolanaRpc(url);
const signer = await generateKeyPairSigner();
const addr = address(string);
```

**Implementation Guidelines**:
- Always use modular package imports
- Prefer factory functions over constructors
- Use async patterns for signer generation
- Maintain type safety with branded types

---

### **3. Real Implementation Pattern**
**Problem**: Avoid mock/stub implementations that hide integration issues
**Solution**: All implementations must use real blockchain transactions

```typescript
// ❌ Anti-Pattern: Mock Implementation
class BadService {
  async registerAgent(params: any): Promise<any> {
    console.log('Mock: Registering agent', params);
    return { success: true, txId: 'mock-123' }; // NOT ACCEPTABLE
  }
}

// ✅ Correct Pattern: Real Implementation
class GoodService {
  async registerAgent(params: RegisterAgentParams): Promise<TransactionResult> {
    const instruction = createRegisterAgent({
      name: params.name,
      description: params.description,
      metadataUrl: params.metadataUrl,
      signer: params.signer,
    });
    
    const transaction = pipe(
      createSolanaTransaction({ version: 0 }),
      (tx) => addTransactionInstructions([instruction], tx)
    );
    
    return this.sendAndConfirmTransaction(transaction, params.signer);
  }
}
```

**Enforcement**:
- No TODO comments for core functionality
- No mock data in production code paths
- All methods must perform real blockchain operations
- Comprehensive error handling for real failure modes

---

## 🔧 **DEVELOPMENT PATTERNS**

### **4. Error Handling Pattern**
**Problem**: Inconsistent error handling across the codebase
**Solution**: Structured error handling with custom error types

```rust
// Rust Error Pattern
#[derive(Error, Debug)]
pub enum GhostSpeakError {
    #[error("Agent not found: {address}")]
    AgentNotFound { address: String },
    
    #[error("Transaction failed: {reason}")]
    TransactionFailed { reason: String },
    
    #[error("Invalid parameters: {details}")]
    InvalidParameters { details: String },
}

pub type Result<T> = std::result::Result<T, GhostSpeakError>;
```

```typescript
// TypeScript Error Pattern
export class GhostSpeakError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'GhostSpeakError';
  }
}

export class AgentNotFoundError extends GhostSpeakError {
  constructor(address: string) {
    super(`Agent not found: ${address}`, 'AGENT_NOT_FOUND', { address });
  }
}
```

**Guidelines**:
- Always use typed errors, never throw strings
- Include relevant context in error messages
- Distinguish between user errors and system errors
- Provide actionable error messages

---

### **5. Transaction Factory Pattern**
**Problem**: Complex transaction creation and signing logic
**Solution**: Centralized transaction factory with consistent patterns

```typescript
// Transaction Factory Pattern
export const sendAndConfirmTransactionFactory = (rpc: Rpc<SolanaRpcApi>) => 
  async (transaction: Transaction, signers: KeyPairSigner[]): Promise<TransactionResult> => {
    try {
      // Sign transaction
      const signedTransaction = await signTransaction(signers, transaction);
      
      // Send and confirm
      const signature = await sendAndConfirmTransaction(rpc, signedTransaction, {
        commitment: 'confirmed',
        skipPreflight: false,
      });
      
      return {
        signature,
        confirmationStatus: 'confirmed',
        error: null,
      };
    } catch (error) {
      throw new TransactionError('Transaction failed', error);
    }
  };

// Usage Pattern
class ServiceClass {
  private sendTransaction = sendAndConfirmTransactionFactory(this.rpc);
  
  async serviceMethod(params: any) {
    const instruction = createInstruction(params);
    const transaction = pipe(
      createSolanaTransaction({ version: 0 }),
      (tx) => addTransactionInstructions([instruction], tx)
    );
    
    return this.sendTransaction(transaction, [params.signer]);
  }
}
```

**Benefits**:
- Consistent transaction handling across all services
- Centralized error handling and retry logic
- Standardized confirmation levels
- Reusable across different instruction types

---

## 📊 **TESTING PATTERNS**

### **6. Integration Testing Pattern**
**Problem**: Need comprehensive testing of real blockchain interactions
**Solution**: Multi-layered testing with real RPC connections

```typescript
// Integration Test Pattern
describe('AgentService Integration', () => {
  let rpc: Rpc<SolanaRpcApi>;
  let programId: Address;
  let agentService: AgentService;
  let testSigner: KeyPairSigner;

  beforeAll(async () => {
    rpc = createSolanaRpc('https://api.devnet.solana.com');
    programId = address('PodAI111111111111111111111111111111111111111');
    agentService = new AgentService(rpc, programId);
    testSigner = await generateKeyPairSigner();
  });

  it('should register agent successfully', async () => {
    const params = {
      name: 'TestAgent',
      description: 'Test agent for integration testing',
      metadataUrl: 'https://example.com/metadata.json',
      signer: testSigner,
    };

    const result = await agentService.registerAgent(params);
    
    expect(result.signature).toBeDefined();
    expect(result.confirmationStatus).toBe('confirmed');
    
    // Verify agent was created on-chain
    const agentPda = deriveAgentPda(testSigner.address, programId);
    const agentAccount = await fetchMaybeAgentAccount(rpc, agentPda);
    
    expect(agentAccount.exists).toBe(true);
    expect(agentAccount.data.name).toBe(params.name);
  });
});
```

**Testing Layers**:
1. **Unit Tests**: Individual function logic
2. **Integration Tests**: Real blockchain interactions
3. **E2E Tests**: Complete user workflows
4. **Cross-SDK Tests**: Consistency between Rust and TypeScript

---

### **7. Test Data Management Pattern**
**Problem**: Consistent test data across different test suites
**Solution**: Centralized test data factory with realistic data

```typescript
// Test Data Factory Pattern
export class TestDataFactory {
  static async createTestAgent(): Promise<TestAgentData> {
    const signer = await generateKeyPairSigner();
    return {
      signer,
      name: `TestAgent_${Date.now()}`,
      description: 'Integration test agent',
      metadataUrl: 'https://example.com/test-metadata.json',
    };
  }

  static async createTestChannel(): Promise<TestChannelData> {
    const creator = await generateKeyPairSigner();
    return {
      creator,
      name: `TestChannel_${Date.now()}`,
      visibility: 'public' as const,
      maxParticipants: 100,
    };
  }
}

// Usage in tests
it('should create channel successfully', async () => {
  const testData = await TestDataFactory.createTestChannel();
  const result = await channelService.createChannel(testData);
  expect(result.signature).toBeDefined();
});
```

**Benefits**:
- Consistent test data across test suites
- Realistic data that matches production patterns
- Easy to maintain and update
- Prevents test data duplication

---

## 🔒 **SECURITY PATTERNS**

### **8. Access Control Pattern**
**Problem**: Ensure proper authorization for all operations
**Solution**: Consistent access control validation

```rust
// Smart Contract Access Control Pattern
#[derive(Accounts)]
pub struct RegisterAgent<'info> {
    #[account(
        init,
        payer = signer,
        space = AgentAccount::SIZE,
        seeds = [b"agent", signer.key().as_ref()],
        bump
    )]
    pub agent_account: Account<'info, AgentAccount>,
    
    #[account(mut)]
    pub signer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}
```

```typescript
// SDK Access Control Pattern
class AgentService {
  private validateSigner(signer: KeyPairSigner, expectedAddress?: Address): void {
    if (expectedAddress && signer.address !== expectedAddress) {
      throw new UnauthorizedError('Signer does not match expected address');
    }
  }

  async updateAgent(agentAddress: Address, params: UpdateAgentParams): Promise<TransactionResult> {
    // Verify ownership before proceeding
    const agentAccount = await fetchMaybeAgentAccount(this.rpc, agentAddress);
    if (!agentAccount.exists) {
      throw new AgentNotFoundError(agentAddress);
    }
    
    this.validateSigner(params.signer, agentAccount.data.owner);
    
    // Proceed with update...
  }
}
```

**Security Guidelines**:
- Always validate signer authority
- Use PDA derivation for predictable addressing
- Implement proper account ownership checks
- Validate all input parameters

---

## 📚 **DOCUMENTATION PATTERNS**

### **9. API Documentation Pattern**
**Problem**: Consistent documentation across all methods
**Solution**: Standardized JSDoc/rustdoc format

```typescript
/**
 * Registers a new agent on the ghostspeak platform
 * 
 * @description Creates a new agent account with the provided metadata and associates it
 * with the signer's public key. The agent will be discoverable in the marketplace
 * and can participate in channels and commerce activities.
 * 
 * @param params - Agent registration parameters
 * @param params.name - Human-readable name for the agent (max 32 characters)
 * @param params.description - Description of the agent's capabilities (max 256 characters)
 * @param params.metadataUrl - URL to additional metadata (JSON format)
 * @param params.signer - Keypair signer that will own the agent account
 * 
 * @returns Promise resolving to transaction result with signature and confirmation
 * 
 * @throws {InvalidParametersError} When parameters fail validation
 * @throws {TransactionError} When blockchain transaction fails
 * @throws {NetworkError} When RPC connection fails
 * 
 * @example
 * ```typescript
 * const signer = await generateKeyPairSigner();
 * const result = await agentService.registerAgent({
 *   name: 'MyAgent',
 *   description: 'AI agent for customer service',
 *   metadataUrl: 'https://my-domain.com/agent-metadata.json',
 *   signer,
 * });
 * 
 * console.log('Agent registered:', result.signature);
 * ```
 * 
 * @see {@link AgentAccount} for the resulting account structure
 * @see {@link UpdateAgent} for updating agent information after creation
 */
async registerAgent(params: RegisterAgentParams): Promise<TransactionResult>
```

**Documentation Requirements**:
- Complete parameter descriptions with types and constraints
- All possible error conditions documented
- Working code examples that compile and run
- Cross-references to related methods and types
- Security considerations when relevant

---

## 🚀 **DEPLOYMENT PATTERNS**

### **10. Environment Configuration Pattern**
**Problem**: Manage different configurations across environments
**Solution**: Environment-specific configuration with validation

```typescript
// Environment Configuration Pattern
export interface EnvironmentConfig {
  network: 'devnet' | 'testnet' | 'mainnet';
  rpcUrl: string;
  programId: Address;
  commitment: 'processed' | 'confirmed' | 'finalized';
}

export const ENVIRONMENT_CONFIGS: Record<string, EnvironmentConfig> = {
  development: {
    network: 'devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    programId: address('PodAI111111111111111111111111111111111111111'),
    commitment: 'processed',
  },
  
  staging: {
    network: 'testnet',
    rpcUrl: 'https://api.testnet.solana.com',
    programId: address('PodAI111111111111111111111111111111111111111'),
    commitment: 'confirmed',
  },
  
  production: {
    network: 'mainnet',
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    programId: address('PodAI111111111111111111111111111111111111111'),
    commitment: 'finalized',
  },
};

// Usage Pattern
export function createGhostSpeakClient(environment: string): GhostSpeakClient {
  const config = ENVIRONMENT_CONFIGS[environment];
  if (!config) {
    throw new Error(`Unknown environment: ${environment}`);
  }
  
  const rpc = createSolanaRpc(config.rpcUrl);
  return new GhostSpeakClient(rpc, config.programId, config);
}
```

**Benefits**:
- Clear separation of environment concerns
- Validation of environment configuration
- Easy switching between environments
- Production safety with proper defaults

---

## 📈 **PERFORMANCE PATTERNS**

### **11. Connection Pooling Pattern**
**Problem**: Efficient RPC connection management
**Solution**: Connection pooling with retry logic

```typescript
// Connection Pool Pattern
class ConnectionPool {
  private connections: Map<string, Rpc<SolanaRpcApi>> = new Map();
  private readonly maxConnections = 10;
  private readonly connectionTTL = 5 * 60 * 1000; // 5 minutes

  getConnection(rpcUrl: string): Rpc<SolanaRpcApi> {
    let connection = this.connections.get(rpcUrl);
    
    if (!connection) {
      if (this.connections.size >= this.maxConnections) {
        this.evictOldestConnection();
      }
      
      connection = createSolanaRpc(rpcUrl, {
        httpAgent: new HttpAgent({
          keepAlive: true,
          maxSockets: 50,
        }),
      });
      
      this.connections.set(rpcUrl, connection);
      
      // Set TTL for connection
      setTimeout(() => {
        this.connections.delete(rpcUrl);
      }, this.connectionTTL);
    }
    
    return connection;
  }
}
```

**Performance Guidelines**:
- Pool RPC connections to avoid connection overhead
- Implement retry logic for transient failures
- Use appropriate commitment levels for use case
- Monitor and log performance metrics

---

## 🔄 **CONTINUOUS IMPROVEMENT PATTERNS**

### **12. Pattern Evolution Process**
**Problem**: Patterns become outdated as project evolves
**Solution**: Regular pattern review and evolution process

**Pattern Lifecycle**:
1. **Identification**: New pattern emerges from repeated code
2. **Documentation**: Pattern documented with examples
3. **Adoption**: Pattern applied across codebase
4. **Review**: Regular evaluation of pattern effectiveness
5. **Evolution**: Pattern updated or deprecated as needed

**Review Schedule**:
- **Weekly**: Pattern usage in new code
- **Monthly**: Pattern effectiveness assessment  
- **Quarterly**: Major pattern evolution decisions
- **Annually**: Complete pattern architecture review

**Metrics for Pattern Success**:
- Code consistency across the codebase
- Developer productivity and satisfaction
- Bug reduction in areas using the pattern
- Maintainability improvements

---

**Pattern Status**: 🔄 **ACTIVELY MAINTAINED** - Patterns updated regularly based on project evolution and team feedback 