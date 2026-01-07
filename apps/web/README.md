# GhostSpeak Web

**B2C Ghost Score App & B2B API Platform for AI Agent Reputation**

The official web interface for GhostSpeak Protocol - providing both a consumer-facing Ghost Score application and a comprehensive B2B API platform for AI agent verification and reputation management.

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- pnpm (recommended) or npm

### Environment Variables

Create a `.env.local` file:

```bash
# =============================================================================
# REQUIRED - Crossmint (https://www.crossmint.com/console)
# =============================================================================

# Client API key (public) - for wallet connection
NEXT_PUBLIC_CROSSMINT_API_KEY=your_client_api_key_here

# Server API key (secret) - for orders, wallets, transactions
# Required scopes: orders.create, orders.read, wallets:transactions.create
# Accepts either name:
CROSSMINT_SECRET_KEY=your_server_api_key_here
# or: CROSSMINT_SERVER_API_KEY=your_server_api_key_here

# =============================================================================
# REQUIRED - Solana
# =============================================================================

# RPC endpoint
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# GhostSpeak Program ID
NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID=your_program_id_here

# Network
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# =============================================================================
# OPTIONAL
# =============================================================================

# Crossmint API URL (defaults to staging)
# CROSSMINT_API_URL=https://staging.crossmint.com/api/2022-06-09
```

### How to Get Crossmint Keys

1. Go to [Crossmint Console](https://www.crossmint.com/console)
2. Create a new project
3. Go to **API Keys** section
4. Create a **Client-side** key → `NEXT_PUBLIC_CROSSMINT_API_KEY`
5. Create a **Server-side** key with scopes:
   - `orders.create`
   - `orders.read`
   - `wallets:transactions.create`
     → `CROSSMINT_SERVER_API_KEY`

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Features

### Wallet Connection

GhostSpeak uses **Crossmint** for wallet connection ([docs](https://docs.crossmint.com/wallets/overview)):

- ✅ **Email login** - No browser extension needed
- ✅ **Instant wallet creation** - Users get a Solana wallet on first login
- ✅ **Multi-chain ready** - Solana, Base, Polygon support
- ✅ **Perfect for AI agents** - Programmatic wallet creation via API

### Crossmint Agentic Commerce Integration

GhostSpeak integrates with [Crossmint's Agentic Commerce](https://docs.crossmint.com/solutions/ai-agents/introduction) for autonomous AI agent purchases:

| Feature                | Endpoint                            | Description                        |
| ---------------------- | ----------------------------------- | ---------------------------------- |
| **Payment Delegation** | `/api/crossmint/order-intent`       | Create order intents with mandates |
| **Order Creation**     | `/api/crossmint/orders`             | Create purchase orders             |
| **Order Tracking**     | `/api/crossmint/orders?orderId=xxx` | Track order status                 |
| **Agent Wallets**      | `/api/crossmint/wallets`            | Programmable wallets for agents    |
| **Transactions**       | `/api/crossmint/transactions`       | Sign and submit payments           |

### React Hook

```typescript
import { useCrossmintAgentCommerce } from '@/lib/hooks/useCrossmintAgentCommerce'

function AgentPurchaseComponent() {
  const {
    createAgentWallet,
    createOrder,
    purchaseWithAgent,
    pollOrderStatus,
    loading
  } = useCrossmintAgentCommerce()

  const handlePurchase = async () => {
    // Create order and sign payment in one call
    const result = await purchaseWithAgent('agent-wallet-id', {
      recipient: {
        email: 'user@example.com',
        physicalAddress: {
          name: 'John Doe',
          line1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US'
        }
      },
      lineItems: [{ productLocator: 'amazon:B00O79SKV6' }],
      payment: {
        method: 'solana',
        currency: 'usdc'
      }
    })

    if (result) {
      // Poll for completion
      await pollOrderStatus(result.order.orderId)
    }
  }

  return (
    <button onClick={handlePurchase} disabled={loading}>
      {loading ? 'Processing...' : 'Purchase'}
    </button>
  )
}
```

## Project Structure

```
packages/web/
├── app/
│   ├── api/
│   │   ├── crossmint/          # Crossmint API routes
│   │   │   ├── order-intent/   # Payment delegation
│   │   │   ├── orders/         # Order CRUD
│   │   │   ├── transactions/   # Transaction signing
│   │   │   └── wallets/        # Agent wallets
│   │   └── x402/               # x402 payment routes
│   ├── dashboard/              # User dashboard
│   ├── x402/                   # x402 pages
│   └── page.tsx                # Landing page
├── components/
│   ├── payments/               # Crossmint components
│   ├── wallet/                 # Wallet connection
│   └── x402/                   # x402 components
└── lib/
    └── hooks/
        ├── useCrossmintAgentCommerce.ts  # Agentic commerce hook
        ├── useGhostSpeak.tsx             # GhostSpeak SDK hook
        └── useX402.ts                    # x402 payments hook
```

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy

### Production Checklist

- [ ] Set `CROSSMINT_API_URL` to production endpoint
- [ ] Use production Crossmint API keys with required scopes:
  - `orders.create`
  - `orders.read`
  - `wallets:transactions.create`
- [ ] Configure Solana mainnet RPC

## Learn More

- [GhostSpeak Documentation](https://docs.ghostspeak.io)
- [Crossmint Agentic Commerce](https://docs.crossmint.com/solutions/ai-agents/introduction)
- [x402 Payment Protocol](https://www.x402.org)
- [Solana Web3.js](https://solana.com/docs)

## License

MIT
