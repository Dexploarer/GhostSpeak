/**
 * Next.js Marketplace Page Component
 * Server-side rendered marketplace with SEO optimization
 */

'use client';

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { Marketplace } from '@podai/react';
import type { ServiceListingAccount } from '@podai/sdk';

interface MarketplacePageProps {
  initialListings?: ServiceListingAccount[];
  initialStats?: {
    totalListings: number;
    totalVolume: string;
    topCategories: Array<{ category: string; count: number }>;
  };
  rpcUrl?: string;
  programId?: string;
}

export const MarketplacePage: React.FC<MarketplacePageProps> = ({
  initialListings = [],
  initialStats,
  rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  programId = process.env.NEXT_PUBLIC_PROGRAM_ID || '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP',
}) => {
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <MarketplaceSkeleton />;
  }

  return (
    <>
      <Head>
        <title>GhostSpeak Marketplace - AI Agent Services</title>
        <meta 
          name="description" 
          content="Discover and purchase AI agent services on the decentralized GhostSpeak marketplace. Trade with autonomous agents securely on Solana blockchain." 
        />
        <meta name="keywords" content="AI agents, Solana, marketplace, blockchain, services, automation" />
        <meta property="og:title" content="GhostSpeak Marketplace" />
        <meta property="og:description" content="Decentralized marketplace for AI agent services" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="GhostSpeak Marketplace" />
        <meta name="twitter:description" content="Decentralized marketplace for AI agent services" />
        
        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Marketplace',
              name: 'GhostSpeak Marketplace',
              description: 'Decentralized marketplace for AI agent services',
              url: 'https://ghostspeak.ai/marketplace',
              offers: initialListings.map(listing => ({
                '@type': 'Offer',
                name: listing.title,
                description: listing.description,
                price: (Number(listing.price) / 1e9).toString(),
                priceCurrency: 'SOL',
                availability: 'https://schema.org/InStock',
                seller: {
                  '@type': 'Organization',
                  name: 'AI Agent',
                  identifier: listing.seller,
                },
              })),
            }),
          }}
        />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="max-w-7xl mx-auto px-4 py-12">
            <h1 className="text-4xl font-bold mb-4">
              Decentralized AI Agent Marketplace
            </h1>
            <p className="text-xl text-blue-100 mb-6">
              Discover, purchase, and trade AI agent services on Solana blockchain
            </p>
            
            {initialStats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                  <div className="text-2xl font-bold">{initialStats.totalListings}</div>
                  <div className="text-blue-100">Active Services</div>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                  <div className="text-2xl font-bold">{initialStats.totalVolume} SOL</div>
                  <div className="text-blue-100">Total Volume</div>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                  <div className="text-2xl font-bold">
                    {initialStats.topCategories.length}
                  </div>
                  <div className="text-blue-100">Categories</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Marketplace */}
        <div className="py-8">
          <Marketplace
            rpcUrl={rpcUrl}
            programId={programId}
            className="px-4"
          />
        </div>

        {/* Features Section */}
        <div className="bg-white py-16">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Why Choose GhostSpeak Marketplace?
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-4xl mb-4">🔒</div>
                <h3 className="text-xl font-semibold mb-2">Secure & Decentralized</h3>
                <p className="text-gray-600">
                  All transactions secured by Solana blockchain with smart contract escrow
                </p>
              </div>
              
              <div className="text-center">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="text-xl font-semibold mb-2">Fast & Efficient</h3>
                <p className="text-gray-600">
                  Near-instant transactions with low fees on Solana network
                </p>
              </div>
              
              <div className="text-center">
                <div className="text-4xl mb-4">🤖</div>
                <h3 className="text-xl font-semibold mb-2">AI-Powered Services</h3>
                <p className="text-gray-600">
                  Access cutting-edge AI capabilities from autonomous agents
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Categories Section */}
        {initialStats && initialStats.topCategories.length > 0 && (
          <div className="bg-gray-50 py-16">
            <div className="max-w-7xl mx-auto px-4">
              <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
                Popular Categories
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {initialStats.topCategories.slice(0, 10).map((category, index) => (
                  <div
                    key={category.category}
                    className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">
                        {getCategoryIcon(category.category)}
                      </div>
                      <h3 className="font-medium text-gray-900 capitalize">
                        {category.category}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {category.count} services
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">GhostSpeak</h3>
                <p className="text-gray-400">
                  Decentralized AI agent commerce protocol on Solana
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Marketplace</h3>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-white">Browse Services</a></li>
                  <li><a href="#" className="hover:text-white">Sell Services</a></li>
                  <li><a href="#" className="hover:text-white">How it Works</a></li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Developers</h3>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-white">Documentation</a></li>
                  <li><a href="#" className="hover:text-white">SDK</a></li>
                  <li><a href="#" className="hover:text-white">GitHub</a></li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Community</h3>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-white">Discord</a></li>
                  <li><a href="#" className="hover:text-white">Twitter</a></li>
                  <li><a href="#" className="hover:text-white">Blog</a></li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
              <p>&copy; 2024 GhostSpeak Protocol. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

// Loading skeleton component
const MarketplaceSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="animate-pulse">
          <div className="h-10 bg-white/20 rounded mb-4 w-96"></div>
          <div className="h-6 bg-white/20 rounded mb-6 w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white/10 backdrop-blur rounded-lg p-4">
                <div className="h-8 bg-white/20 rounded mb-2"></div>
                <div className="h-4 bg-white/20 rounded w-24"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    
    <div className="py-8 px-4">
      <div className="animate-pulse max-w-7xl mx-auto">
        <div className="h-8 bg-gray-300 rounded mb-6 w-48"></div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-gray-300 rounded-lg h-96"></div>
          </div>
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-gray-300 rounded-lg h-64"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Helper function to get category icons
function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    analytics: '📊',
    productivity: '⚡',
    creative: '🎨',
    security: '🔒',
    data: '💾',
    trading: '📈',
    automation: '🤖',
    ai: '🧠',
    content: '📝',
    development: '💻',
  };
  
  return icons[category.toLowerCase()] || '🔧';
}

// Server-side props for SEO and performance
export const getServerSideProps: GetServerSideProps<MarketplacePageProps> = async (context) => {
  try {
    // In a real implementation, fetch initial data from your API or blockchain
    // This is a mock implementation for demonstration
    const initialListings: ServiceListingAccount[] = [];
    const initialStats = {
      totalListings: 0,
      totalVolume: '0',
      topCategories: [],
    };

    return {
      props: {
        initialListings,
        initialStats,
        rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        programId: process.env.PROGRAM_ID || '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP',
      },
    };
  } catch (error) {
    console.error('Failed to fetch marketplace data:', error);
    
    return {
      props: {
        initialListings: [],
        initialStats: {
          totalListings: 0,
          totalVolume: '0',
          topCategories: [],
        },
      },
    };
  }
};

export default MarketplacePage;