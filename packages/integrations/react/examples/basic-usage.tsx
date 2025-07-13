/**
 * Basic React Integration Example
 * 
 * This example demonstrates how to use the GhostSpeak React integration
 * in a typical React application.
 */

import React from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { 
  GhostSpeakProvider, 
  useGhostSpeak, 
  useAgent,
  AgentCard 
} from '@ghostspeak/react';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

const wallets = [new PhantomWalletAdapter()];
const endpoint = 'https://api.devnet.solana.com';

function AgentsList() {
  const { connected, error } = useGhostSpeak();
  const { agents, loading, fetchAgents } = useAgent();

  React.useEffect(() => {
    if (connected) {
      fetchAgents();
    }
  }, [connected, fetchAgents]);

  if (!connected) {
    return (
      <div className="p-4">
        <h2>Please connect your wallet to view agents</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        <h2>Error: {error}</h2>
      </div>
    );
  }

  if (loading.list) {
    return (
      <div className="p-4">
        <h2>Loading agents...</h2>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Available Agents</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onMessage={(agent) => console.log('Message agent:', agent.name)}
            onHire={(agent) => console.log('Hire agent:', agent.name)}
          />
        ))}
      </div>
      {agents.length === 0 && (
        <p className="text-gray-600">No agents available</p>
      )}
    </div>
  );
}

function App() {
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <GhostSpeakProvider
            network="devnet"
            rpcUrl={endpoint}
            autoConnect={true}
            config={{
              debug: true
            }}
          >
            <div className="min-h-screen bg-gray-50">
              <header className="bg-white shadow-sm p-4">
                <h1 className="text-xl font-bold">GhostSpeak React Example</h1>
              </header>
              <main>
                <AgentsList />
              </main>
            </div>
          </GhostSpeakProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;