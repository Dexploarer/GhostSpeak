/**
 * Next.js Agents Page Example
 * 
 * This example demonstrates server-side rendering with GhostSpeak
 * and client-side interactions with agents.
 */

import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useState } from 'react';
import { useGhostSpeak, useAgent, AgentCard } from '@ghostspeak/react';

export default function AgentsPage() {
  const { connected, loading, error } = useGhostSpeak();
  const { agents, createAgent, loading: agentLoading } = useAgent();
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleCreateAgent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const result = await createAgent({
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      type: 'assistant',
      capabilities: (formData.get('capabilities') as string).split(',').map(c => c.trim()),
      pricing: {
        basePrice: parseFloat(formData.get('basePrice') as string),
        currency: 'SOL'
      }
    });

    if (result) {
      setShowCreateForm(false);
      // Reset form would go here
    }
  };

  return (
    <>
      <Head>
        <title>AI Agents - GhostSpeak</title>
        <meta name="description" content="Browse and interact with AI agents on GhostSpeak" />
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">AI Agents</h1>
          {connected && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              disabled={agentLoading.create}
            >
              {agentLoading.create ? 'Creating...' : 'Create Agent'}
            </button>
          )}
        </div>

        {!connected ? (
          <div className="text-center py-12">
            <h2 className="text-xl mb-4">Connect your wallet to get started</h2>
            <p className="text-gray-600">
              You need to connect a Solana wallet to view and interact with agents.
            </p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-red-800 font-semibold">Error</h2>
            <p className="text-red-600">{error}</p>
          </div>
        ) : (
          <>
            {/* Create Agent Form */}
            {showCreateForm && (
              <div className="bg-white border rounded-lg p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">Create New Agent</h2>
                <form onSubmit={handleCreateAgent} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input
                      type="text"
                      name="name"
                      required
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="Agent name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      name="description"
                      required
                      rows={3}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="What does this agent do?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Capabilities</label>
                    <input
                      type="text"
                      name="capabilities"
                      required
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="coding, writing, analysis (comma-separated)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Base Price (SOL)</label>
                    <input
                      type="number"
                      step="0.001"
                      name="basePrice"
                      required
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="0.1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={agentLoading.create}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {agentLoading.create ? 'Creating...' : 'Create Agent'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Agents List */}
            {agentLoading.list ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading agents...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    detailed={false}
                    onMessage={(agent) => {
                      // Navigate to message page or open modal
                      console.log('Message agent:', agent.name);
                    }}
                    onHire={(agent) => {
                      // Navigate to hire page or open modal
                      console.log('Hire agent:', agent.name);
                    }}
                  />
                ))}
              </div>
            )}

            {agents.length === 0 && !agentLoading.list && (
              <div className="text-center py-12">
                <h2 className="text-xl mb-4">No agents found</h2>
                <p className="text-gray-600 mb-4">
                  Be the first to create an agent on the platform!
                </p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Create Agent
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  // Here you could fetch initial data server-side if needed
  // For example, featured agents or public marketplace data
  
  return {
    props: {
      // initialAgents: await fetchFeaturedAgents(),
    }
  };
};