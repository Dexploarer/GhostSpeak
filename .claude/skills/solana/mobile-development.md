# Solana Mobile Development Reference

Complete guide for building iOS/Android apps with Solana App Kit (December 2025).

## Solana App Kit Overview

React Native framework for production Solana mobile apps with 18+ protocol integrations.

### Quick Start

```bash
# Scaffold new app
npx start-solana-app

# Or manual setup
npx create-expo-app my-solana-app --template blank-typescript
cd my-solana-app
npm install @solana/web3.js react-native-get-random-values
```

### Core Modules

| Module | Features |
|--------|----------|
| `wallet-providers` | Privy, Dynamic, Turnkey, MWA |
| `swap` | Jupiter aggregator |
| `pump-fun` | Token launches, PumpSwap |
| `raydium` | AMM, concentrated liquidity |
| `meteora` | Dynamic pools |
| `nft` | Metaplex, Tensor |
| `data-module` | Helius, Birdeye, CoinGecko |
| `moonpay` | Fiat on-ramp |
| `solana-agent-kit` | AI chat interface |

---

## Project Structure

```
src/
├── modules/
│   ├── wallet-providers/
│   │   ├── hooks/
│   │   │   ├── useWallet.ts
│   │   │   └── useConnection.ts
│   │   ├── providers/
│   │   │   ├── PrivyProvider.tsx
│   │   │   ├── DynamicProvider.tsx
│   │   │   └── MWAProvider.tsx
│   │   └── index.ts
│   ├── swap/
│   │   ├── hooks/useSwap.ts
│   │   ├── services/jupiterService.ts
│   │   └── components/SwapForm.tsx
│   ├── pump-fun/
│   │   ├── hooks/usePumpFun.ts
│   │   ├── services/pumpfunService.ts
│   │   └── components/
│   ├── data-module/
│   │   ├── hooks/
│   │   │   ├── useFetchTokens.ts
│   │   │   ├── useTokenPrice.ts
│   │   │   └── usePortfolio.ts
│   │   └── services/
│   └── solana-agent-kit/
│       ├── hooks/useChat.ts
│       ├── lib/ai/providers.ts
│       └── components/ChatInterface.tsx
├── screens/
│   ├── HomeScreen.tsx
│   ├── WalletScreen.tsx
│   ├── SwapScreen.tsx
│   └── SettingsScreen.tsx
├── components/
├── navigation/
├── utils/
└── App.tsx
```

---

## Wallet Integration

### Embedded Wallets (Privy)

```typescript
// providers/PrivyProvider.tsx
import { PrivyProvider } from '@privy-io/react-auth';
import { SolanaWalletConnectorConfig } from '@privy-io/react-auth/solana';

const solanaConfig: SolanaWalletConnectorConfig = {
  cluster: 'mainnet-beta',
  rpcUrl: process.env.RPC_URL,
};

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.PRIVY_APP_ID!}
      config={{
        loginMethods: ['email', 'google', 'apple', 'twitter'],
        appearance: {
          theme: 'dark',
          accentColor: '#9945FF',
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
          solana: solanaConfig,
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
```

```typescript
// hooks/usePrivyWallet.ts
import { usePrivy, useSolanaWallets } from '@privy-io/react-auth';

export function usePrivyWallet() {
  const { login, logout, authenticated, user } = usePrivy();
  const { wallets, createWallet } = useSolanaWallets();
  
  const solanaWallet = wallets.find(w => w.walletClientType === 'privy');
  
  const signTransaction = async (transaction: Transaction) => {
    if (!solanaWallet) throw new Error('No wallet');
    return solanaWallet.signTransaction(transaction);
  };
  
  const signAndSendTransaction = async (transaction: Transaction) => {
    if (!solanaWallet) throw new Error('No wallet');
    const signed = await solanaWallet.signTransaction(transaction);
    const connection = new Connection(process.env.RPC_URL!);
    return connection.sendRawTransaction(signed.serialize());
  };
  
  return {
    connected: authenticated && !!solanaWallet,
    publicKey: solanaWallet?.address,
    login,
    logout,
    signTransaction,
    signAndSendTransaction,
  };
}
```

### Mobile Wallet Adapter (MWA)

Connect to external wallets like Phantom, Backpack.

```typescript
// hooks/useMWA.ts
import { 
  transact,
  Web3MobileWallet,
} from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { Connection, Transaction, PublicKey } from '@solana/web3.js';

export function useMobileWallet() {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  
  const connect = async () => {
    const result = await transact(async (wallet: Web3MobileWallet) => {
      const authResult = await wallet.authorize({
        cluster: 'mainnet-beta',
        identity: {
          name: 'My Solana App',
          uri: 'https://myapp.com',
          icon: 'favicon.ico',
        },
      });
      
      return {
        publicKey: authResult.accounts[0].publicKey,
        authToken: authResult.auth_token,
      };
    });
    
    setPublicKey(new PublicKey(result.publicKey));
    setAuthToken(result.authToken);
  };
  
  const signAndSendTransaction = async (transaction: Transaction) => {
    if (!authToken) throw new Error('Not connected');
    
    const connection = new Connection(process.env.RPC_URL!);
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = publicKey!;
    
    const signature = await transact(async (wallet) => {
      await wallet.reauthorize({ auth_token: authToken });
      
      const signedTxs = await wallet.signAndSendTransactions({
        transactions: [transaction],
      });
      
      return signedTxs[0];
    });
    
    return signature;
  };
  
  const disconnect = () => {
    setPublicKey(null);
    setAuthToken(null);
  };
  
  return {
    connected: !!publicKey,
    publicKey,
    connect,
    disconnect,
    signAndSendTransaction,
  };
}
```

### Deep Link Wallet Connection

```typescript
// For wallets that support deep linking
import { Linking } from 'react-native';

const PHANTOM_DEEP_LINK = 'phantom://';

export async function connectPhantomDeepLink() {
  const supported = await Linking.canOpenURL(PHANTOM_DEEP_LINK);
  if (!supported) {
    throw new Error('Phantom not installed');
  }
  
  // Build connect URL
  const connectUrl = new URL('https://phantom.app/ul/v1/connect');
  connectUrl.searchParams.set('app_url', 'https://myapp.com');
  connectUrl.searchParams.set('dapp_encryption_public_key', myEncryptionPublicKey);
  connectUrl.searchParams.set('redirect_link', 'myapp://callback');
  connectUrl.searchParams.set('cluster', 'mainnet-beta');
  
  await Linking.openURL(connectUrl.toString());
}

// Handle callback
Linking.addEventListener('url', ({ url }) => {
  if (url.startsWith('myapp://callback')) {
    // Parse response and decrypt
    const params = new URL(url).searchParams;
    const data = params.get('data');
    const nonce = params.get('nonce');
    // Decrypt and store public key
  }
});
```

---

## Unified Wallet Hook

```typescript
// hooks/useWallet.ts
import { usePrivyWallet } from './usePrivyWallet';
import { useMobileWallet } from './useMWA';
import { create } from 'zustand';

type WalletType = 'privy' | 'mwa' | 'none';

interface WalletStore {
  walletType: WalletType;
  setWalletType: (type: WalletType) => void;
}

const useWalletStore = create<WalletStore>((set) => ({
  walletType: 'none',
  setWalletType: (type) => set({ walletType: type }),
}));

export function useWallet() {
  const { walletType, setWalletType } = useWalletStore();
  const privy = usePrivyWallet();
  const mwa = useMobileWallet();
  
  const wallet = walletType === 'privy' ? privy : 
                 walletType === 'mwa' ? mwa : null;
  
  return {
    connected: wallet?.connected ?? false,
    publicKey: wallet?.publicKey,
    walletType,
    
    connectPrivy: async () => {
      await privy.login();
      setWalletType('privy');
    },
    
    connectMWA: async () => {
      await mwa.connect();
      setWalletType('mwa');
    },
    
    disconnect: async () => {
      if (walletType === 'privy') await privy.logout();
      if (walletType === 'mwa') mwa.disconnect();
      setWalletType('none');
    },
    
    signTransaction: wallet?.signTransaction,
    signAndSendTransaction: wallet?.signAndSendTransaction,
  };
}
```

---

## Swap Module (Jupiter)

```typescript
// services/jupiterService.ts
const JUPITER_API = 'https://api.jup.ag/swap/v1';

export async function getQuote(params: {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps?: number;
}) {
  const query = new URLSearchParams({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: params.amount,
    slippageBps: (params.slippageBps ?? 50).toString(),
    restrictIntermediateTokens: 'true',
  });
  
  const response = await fetch(`${JUPITER_API}/quote?${query}`);
  return response.json();
}

export async function getSwapTransaction(
  quote: any,
  userPublicKey: string
) {
  const response = await fetch(`${JUPITER_API}/swap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto',
    }),
  });
  
  return response.json();
}
```

```typescript
// hooks/useSwap.ts
import { useWallet } from '../wallet-providers';
import { getQuote, getSwapTransaction } from '../services/jupiterService';
import { VersionedTransaction, Connection } from '@solana/web3.js';

export function useSwap() {
  const { publicKey, signAndSendTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  
  const fetchQuote = async (
    inputMint: string,
    outputMint: string,
    amount: string
  ) => {
    setLoading(true);
    try {
      const quoteData = await getQuote({
        inputMint,
        outputMint,
        amount,
        slippageBps: 50,
      });
      setQuote(quoteData);
      return quoteData;
    } finally {
      setLoading(false);
    }
  };
  
  const executeSwap = async () => {
    if (!quote || !publicKey) throw new Error('Not ready');
    
    setLoading(true);
    try {
      const swapData = await getSwapTransaction(quote, publicKey.toString());
      
      const transaction = VersionedTransaction.deserialize(
        Buffer.from(swapData.swapTransaction, 'base64')
      );
      
      const signature = await signAndSendTransaction(transaction);
      return signature;
    } finally {
      setLoading(false);
    }
  };
  
  return {
    loading,
    quote,
    fetchQuote,
    executeSwap,
    // Computed values
    inputAmount: quote?.inAmount,
    outputAmount: quote?.outAmount,
    priceImpact: quote?.priceImpactPct,
  };
}
```

```tsx
// components/SwapForm.tsx
import { useSwap } from '../hooks/useSwap';

export function SwapForm() {
  const { loading, quote, fetchQuote, executeSwap } = useSwap();
  const [inputMint, setInputMint] = useState(SOL_MINT);
  const [outputMint, setOutputMint] = useState(USDC_MINT);
  const [amount, setAmount] = useState('');
  
  const handleGetQuote = async () => {
    const lamports = parseFloat(amount) * 1e9;
    await fetchQuote(inputMint, outputMint, lamports.toString());
  };
  
  const handleSwap = async () => {
    try {
      const signature = await executeSwap();
      Alert.alert('Success', `Transaction: ${signature}`);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };
  
  return (
    <View>
      <TokenSelector value={inputMint} onChange={setInputMint} />
      <TextInput
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="Amount"
      />
      <TokenSelector value={outputMint} onChange={setOutputMint} />
      
      <Button title="Get Quote" onPress={handleGetQuote} disabled={loading} />
      
      {quote && (
        <View>
          <Text>Output: {quote.outAmount / 1e6} USDC</Text>
          <Text>Price Impact: {quote.priceImpactPct}%</Text>
          <Button title="Swap" onPress={handleSwap} disabled={loading} />
        </View>
      )}
    </View>
  );
}
```

---

## Pump.fun Module

```typescript
// hooks/usePumpFun.ts
import { useWallet } from '../wallet-providers';

interface LaunchParams {
  name: string;
  symbol: string;
  description: string;
  image: string; // URI
  initialBuy?: number;
}

export function usePumpFun() {
  const { publicKey, signAndSendTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  
  const checkTokenStatus = async (mint: string) => {
    const response = await fetch(
      `https://frontend-api.pump.fun/coins/${mint}`
    );
    const data = await response.json();
    
    return {
      isOnBondingCurve: !data.raydium_pool,
      progress: data.usd_market_cap / 69000,
      raydiumPool: data.raydium_pool,
    };
  };
  
  const buyToken = async (mint: string, solAmount: number) => {
    setLoading(true);
    try {
      // Check if on bonding curve
      const status = await checkTokenStatus(mint);
      
      if (status.isOnBondingCurve) {
        // Buy on Pump.fun
        // Implementation depends on backend service
        const response = await fetch(`${SERVER_URL}/pump/buy`, {
          method: 'POST',
          body: JSON.stringify({ mint, amount: solAmount }),
        });
        const { transaction } = await response.json();
        return await signAndSendTransaction(transaction);
      } else {
        // Use Jupiter for migrated tokens
        // ... Jupiter swap logic
      }
    } finally {
      setLoading(false);
    }
  };
  
  const launchToken = async (params: LaunchParams) => {
    setLoading(true);
    try {
      // Upload metadata
      const formData = new FormData();
      formData.append('name', params.name);
      formData.append('symbol', params.symbol);
      formData.append('description', params.description);
      formData.append('file', { uri: params.image });
      
      const metadataResponse = await fetch('https://pump.fun/api/ipfs', {
        method: 'POST',
        body: formData,
      });
      const { metadataUri } = await metadataResponse.json();
      
      // Create token via backend
      const response = await fetch(`${SERVER_URL}/pump/launch`, {
        method: 'POST',
        body: JSON.stringify({
          ...params,
          metadataUri,
          creator: publicKey?.toString(),
        }),
      });
      
      const { transaction, mint } = await response.json();
      const signature = await signAndSendTransaction(transaction);
      
      return { mint, signature };
    } finally {
      setLoading(false);
    }
  };
  
  return {
    loading,
    checkTokenStatus,
    buyToken,
    launchToken,
  };
}
```

---

## Data Module

```typescript
// hooks/useFetchTokens.ts
import { useQuery } from '@tanstack/react-query';

const HELIUS_API = 'https://mainnet.helius-rpc.com';

export function useFetchTokens(address: string | undefined) {
  return useQuery({
    queryKey: ['tokens', address],
    queryFn: async () => {
      if (!address) return [];
      
      const response = await fetch(`${HELIUS_API}/?api-key=${HELIUS_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'tokens',
          method: 'getAssetsByOwner',
          params: {
            ownerAddress: address,
            page: 1,
            limit: 1000,
            displayOptions: {
              showFungible: true,
              showNativeBalance: true,
            },
          },
        }),
      });
      
      const { result } = await response.json();
      return result.items;
    },
    enabled: !!address,
    staleTime: 30_000, // 30 seconds
  });
}

// hooks/useTokenPrice.ts
export function useTokenPrice(mint: string) {
  return useQuery({
    queryKey: ['price', mint],
    queryFn: async () => {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/token_price/solana?contract_addresses=${mint}&vs_currencies=usd`
      );
      const data = await response.json();
      return data[mint.toLowerCase()]?.usd ?? 0;
    },
    staleTime: 60_000,
  });
}

// hooks/usePortfolio.ts
export function usePortfolio(address: string | undefined) {
  const { data: tokens } = useFetchTokens(address);
  
  const portfolio = useMemo(() => {
    if (!tokens) return { total: 0, tokens: [] };
    
    const enrichedTokens = tokens.map(token => ({
      ...token,
      value: token.token_info?.price_info?.total_price ?? 0,
    }));
    
    const total = enrichedTokens.reduce((sum, t) => sum + t.value, 0);
    
    return {
      total,
      tokens: enrichedTokens.sort((a, b) => b.value - a.value),
    };
  }, [tokens]);
  
  return portfolio;
}
```

---

## AI Chat Module

```typescript
// hooks/useChat.ts
import { useState, useCallback } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: any[];
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  
  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
    };
    
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    
    try {
      const response = await fetch(`${SERVER_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      let assistantContent = '';
      
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        assistantContent += chunk;
        
        // Update message in real-time
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (updated[lastIdx]?.role === 'assistant') {
            updated[lastIdx].content = assistantContent;
          } else {
            updated.push({
              id: Date.now().toString(),
              role: 'assistant',
              content: assistantContent,
            });
          }
          return updated;
        });
      }
    } finally {
      setLoading(false);
    }
  }, [messages]);
  
  return {
    messages,
    loading,
    sendMessage,
    clearMessages: () => setMessages([]),
  };
}
```

---

## Environment Setup

```typescript
// .env
HELIUS_API_KEY=your_helius_key
PRIVY_APP_ID=your_privy_app_id
RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
SERVER_URL=https://your-backend.com
```

```typescript
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module:react-native-dotenv', {
        moduleName: '@env',
        path: '.env',
      }],
    ],
  };
};
```

---

## Build & Deploy

### Android

```bash
# Development
npx expo run:android

# Production build
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android
```

### iOS

```bash
# Development
npx expo run:ios

# Production build
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

### Solana dApp Store

```bash
# Build APK for dApp Store
eas build --platform android --profile preview

# Submit to Solana dApp Store
# https://github.com/solana-mobile/dapp-publishing
```

---

## Best Practices

1. **Use embedded wallets** for mainstream users (lower friction)
2. **Support MWA** for crypto-native users
3. **Cache token data** with react-query
4. **Handle errors gracefully** with user-friendly messages
5. **Test on real devices** - emulators miss wallet interactions
6. **Optimize bundle size** - tree-shake unused modules
