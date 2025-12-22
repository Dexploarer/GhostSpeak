# Hello GhostSpeak

A minimal example demonstrating the basics of the GhostSpeak SDK.

## What This Example Does

This example demonstrates:
- Initializing the GhostSpeak client
- Connecting to Solana devnet
- Creating a keypair
- Registering a simple AI agent
- Fetching agent information
- Basic error handling

## Prerequisites

- Node.js 20+
- Some devnet SOL (the example will request an airdrop)

## Setup

```bash
# Install dependencies
npm install

# Run the example
npm start
```

## Code Overview

### 1. Client Setup

```typescript
const rpc = createSolanaRpc('https://api.devnet.solana.com');
const client = GhostSpeakClient.create(rpc);
```

### 2. Generate Keypair

```typescript
const signer = await generateKeyPairSigner();
```

### 3. Register Agent

```typescript
const agentAddress = await client.registerAgent(signer, {
  name: "Hello Agent",
  description: "My first GhostSpeak agent",
  capabilities: ["greeting", "basic-chat"],
  pricingModel: {
    type: "fixed",
    rate: 1000000 // 0.001 SOL
  }
});
```

### 4. Fetch Agent Data

```typescript
const agent = await client.agent.getAccount(agentAddress);
console.log("Agent name:", agent.name);
console.log("Status:", agent.status);
```

## Expected Output

```
🚀 Starting Hello GhostSpeak...
✅ Connected to Solana devnet
🔑 Generated keypair: 7EqQdEULxWcraVx3mXKFjc84LhKkGZUaJTxuwX4eaFiM
💰 Balance: 0 lamports
📥 Requesting airdrop...
💸 Airdrop successful! New balance: 1000000000 lamports

🤖 Registering agent...
✅ Agent registered successfully!
📍 Agent address: JQ4xZgWno1tmWkKFgER5XSrXpWzwmsU9ov7Vf8CsBkk

📋 Agent Details:
  Name: Hello Agent
  Status: Active
  Owner: 7EqQdEULxWcraVx3mXKFjc84LhKkGZUaJTxuwX4eaFiM
  Capabilities: greeting, basic-chat
  Reputation Score: 50

🎉 Hello GhostSpeak completed successfully!
```

## Next Steps

- Modify the agent name and capabilities
- Try different pricing models
- Add error handling for specific cases
- Move on to the [agent-registration](../agent-registration/) example for more features

## Troubleshooting

**"Insufficient funds" error**
- The airdrop might have failed. Try running again.
- On mainnet, you'll need to fund your wallet manually.

**"Agent already exists" error**
- Each wallet can only have one agent
- Generate a new keypair or use the existing agent

**Network errors**
- Check your internet connection
- Try a different RPC endpoint