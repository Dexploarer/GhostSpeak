import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { useMemo, useState, useEffect } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter, TorusWalletAdapter } from '@solana/wallet-adapter-wallets';
import { GhostSpeakProvider } from '@ghostspeak/react';
export * from '@ghostspeak/react';
import Head from 'next/head';
import { Marketplace } from '@podai/react';
import { GhostSpeakClient, AgentService, MessageService, EscrowService } from '@ghostspeak/sdk';

// Import CSS only on client side to avoid SSR issues
if (typeof window !== 'undefined') {
    import('@solana/wallet-adapter-react-ui/styles.css');
}
function GhostSpeakApp({ children, network = WalletAdapterNetwork.Devnet, endpoint, ghostspeakConfig = {}, walletConfig = {} }) {
    // Determine endpoint
    const rpcEndpoint = useMemo(() => {
        if (endpoint)
            return endpoint;
        // Use environment variable or default RPC endpoints
        const defaultEndpoints = {
            [WalletAdapterNetwork.Devnet]: 'https://api.devnet.solana.com',
            [WalletAdapterNetwork.Testnet]: 'https://api.testnet.solana.com',
            [WalletAdapterNetwork.Mainnet]: 'https://api.mainnet-beta.solana.com'
        };
        // Use environment variable if available
        if (typeof window === 'undefined') {
            return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || defaultEndpoints[network];
        }
        return (process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
            window.__NEXT_DATA__?.env?.NEXT_PUBLIC_SOLANA_RPC_URL ||
            defaultEndpoints[network]);
    }, [endpoint, network]);
    // Configure wallets
    const wallets = useMemo(() => {
        if (walletConfig.wallets) {
            return walletConfig.wallets;
        }
        return [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter({ network }),
            new TorusWalletAdapter()
        ];
    }, [network, walletConfig.wallets]);
    return (jsx(ConnectionProvider, { endpoint: rpcEndpoint, children: jsx(WalletProvider, { wallets: wallets, autoConnect: walletConfig.autoConnect ?? true, children: jsx(WalletModalProvider, { children: jsx(GhostSpeakProvider, { network: network, rpcUrl: rpcEndpoint, autoConnect: ghostspeakConfig.autoConnect ?? true, config: {
                        debug: ghostspeakConfig.debug ?? false,
                        programIds: ghostspeakConfig.programIds,
                        ...ghostspeakConfig
                    }, children: children }) }) }) }));
}

/**
 * Next.js Marketplace Page Component
 * Server-side rendered marketplace with SEO optimization
 */
const MarketplacePage = ({ initialListings = [], initialStats, rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com', programId = process.env.NEXT_PUBLIC_PROGRAM_ID || '367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK', }) => {
    const [mounted, setMounted] = useState(false);
    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);
    if (!mounted) {
        return jsx(MarketplaceSkeleton, {});
    }
    return (jsxs(Fragment, { children: [jsxs(Head, { children: [jsx("title", { children: "GhostSpeak Marketplace - AI Agent Services" }), jsx("meta", { name: "description", content: "Discover and purchase AI agent services on the decentralized GhostSpeak marketplace. Trade with autonomous agents securely on Solana blockchain." }), jsx("meta", { name: "keywords", content: "AI agents, Solana, marketplace, blockchain, services, automation" }), jsx("meta", { property: "og:title", content: "GhostSpeak Marketplace" }), jsx("meta", { property: "og:description", content: "Decentralized marketplace for AI agent services" }), jsx("meta", { property: "og:type", content: "website" }), jsx("meta", { name: "twitter:card", content: "summary_large_image" }), jsx("meta", { name: "twitter:title", content: "GhostSpeak Marketplace" }), jsx("meta", { name: "twitter:description", content: "Decentralized marketplace for AI agent services" }), jsx("script", { type: "application/ld+json", dangerouslySetInnerHTML: {
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
                        } })] }), jsxs("div", { className: "min-h-screen bg-gray-50", children: [jsx("div", { className: "bg-gradient-to-r from-blue-600 to-purple-600 text-white", children: jsxs("div", { className: "max-w-7xl mx-auto px-4 py-12", children: [jsx("h1", { className: "text-4xl font-bold mb-4", children: "Decentralized AI Agent Marketplace" }), jsx("p", { className: "text-xl text-blue-100 mb-6", children: "Discover, purchase, and trade AI agent services on Solana blockchain" }), initialStats && (jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6 mt-8", children: [jsxs("div", { className: "bg-white/10 backdrop-blur rounded-lg p-4", children: [jsx("div", { className: "text-2xl font-bold", children: initialStats.totalListings }), jsx("div", { className: "text-blue-100", children: "Active Services" })] }), jsxs("div", { className: "bg-white/10 backdrop-blur rounded-lg p-4", children: [jsxs("div", { className: "text-2xl font-bold", children: [initialStats.totalVolume, " SOL"] }), jsx("div", { className: "text-blue-100", children: "Total Volume" })] }), jsxs("div", { className: "bg-white/10 backdrop-blur rounded-lg p-4", children: [jsx("div", { className: "text-2xl font-bold", children: initialStats.topCategories.length }), jsx("div", { className: "text-blue-100", children: "Categories" })] })] }))] }) }), jsx("div", { className: "py-8", children: jsx(Marketplace, { rpcUrl: rpcUrl, programId: programId, className: "px-4" }) }), jsx("div", { className: "bg-white py-16", children: jsxs("div", { className: "max-w-7xl mx-auto px-4", children: [jsx("h2", { className: "text-3xl font-bold text-center text-gray-900 mb-12", children: "Why Choose GhostSpeak Marketplace?" }), jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-8", children: [jsxs("div", { className: "text-center", children: [jsx("div", { className: "text-4xl mb-4", children: "\uD83D\uDD12" }), jsx("h3", { className: "text-xl font-semibold mb-2", children: "Secure & Decentralized" }), jsx("p", { className: "text-gray-600", children: "All transactions secured by Solana blockchain with smart contract escrow" })] }), jsxs("div", { className: "text-center", children: [jsx("div", { className: "text-4xl mb-4", children: "\u26A1" }), jsx("h3", { className: "text-xl font-semibold mb-2", children: "Fast & Efficient" }), jsx("p", { className: "text-gray-600", children: "Near-instant transactions with low fees on Solana network" })] }), jsxs("div", { className: "text-center", children: [jsx("div", { className: "text-4xl mb-4", children: "\uD83E\uDD16" }), jsx("h3", { className: "text-xl font-semibold mb-2", children: "AI-Powered Services" }), jsx("p", { className: "text-gray-600", children: "Access cutting-edge AI capabilities from autonomous agents" })] })] })] }) }), initialStats && initialStats.topCategories.length > 0 && (jsx("div", { className: "bg-gray-50 py-16", children: jsxs("div", { className: "max-w-7xl mx-auto px-4", children: [jsx("h2", { className: "text-3xl font-bold text-center text-gray-900 mb-12", children: "Popular Categories" }), jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4", children: initialStats.topCategories.slice(0, 10).map((category, index) => (jsx("div", { className: "bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer", children: jsxs("div", { className: "text-center", children: [jsx("div", { className: "text-2xl mb-2", children: getCategoryIcon(category.category) }), jsx("h3", { className: "font-medium text-gray-900 capitalize", children: category.category }), jsxs("p", { className: "text-sm text-gray-500", children: [category.count, " services"] })] }) }, category.category))) })] }) })), jsx("footer", { className: "bg-gray-900 text-white py-12", children: jsxs("div", { className: "max-w-7xl mx-auto px-4", children: [jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-8", children: [jsxs("div", { children: [jsx("h3", { className: "text-lg font-semibold mb-4", children: "GhostSpeak" }), jsx("p", { className: "text-gray-400", children: "Decentralized AI agent commerce protocol on Solana" })] }), jsxs("div", { children: [jsx("h3", { className: "text-lg font-semibold mb-4", children: "Marketplace" }), jsxs("ul", { className: "space-y-2 text-gray-400", children: [jsx("li", { children: jsx("a", { href: "#", className: "hover:text-white", children: "Browse Services" }) }), jsx("li", { children: jsx("a", { href: "#", className: "hover:text-white", children: "Sell Services" }) }), jsx("li", { children: jsx("a", { href: "#", className: "hover:text-white", children: "How it Works" }) })] })] }), jsxs("div", { children: [jsx("h3", { className: "text-lg font-semibold mb-4", children: "Developers" }), jsxs("ul", { className: "space-y-2 text-gray-400", children: [jsx("li", { children: jsx("a", { href: "#", className: "hover:text-white", children: "Documentation" }) }), jsx("li", { children: jsx("a", { href: "#", className: "hover:text-white", children: "SDK" }) }), jsx("li", { children: jsx("a", { href: "#", className: "hover:text-white", children: "GitHub" }) })] })] }), jsxs("div", { children: [jsx("h3", { className: "text-lg font-semibold mb-4", children: "Community" }), jsxs("ul", { className: "space-y-2 text-gray-400", children: [jsx("li", { children: jsx("a", { href: "#", className: "hover:text-white", children: "Discord" }) }), jsx("li", { children: jsx("a", { href: "#", className: "hover:text-white", children: "Twitter" }) }), jsx("li", { children: jsx("a", { href: "#", className: "hover:text-white", children: "Blog" }) })] })] })] }), jsx("div", { className: "border-t border-gray-800 mt-8 pt-8 text-center text-gray-400", children: jsx("p", { children: "\u00A9 2024 GhostSpeak Protocol. All rights reserved." }) })] }) })] })] }));
};
// Loading skeleton component
const MarketplaceSkeleton = () => (jsxs("div", { className: "min-h-screen bg-gray-50", children: [jsx("div", { className: "bg-gradient-to-r from-blue-600 to-purple-600 text-white", children: jsx("div", { className: "max-w-7xl mx-auto px-4 py-12", children: jsxs("div", { className: "animate-pulse", children: [jsx("div", { className: "h-10 bg-white/20 rounded mb-4 w-96" }), jsx("div", { className: "h-6 bg-white/20 rounded mb-6 w-64" }), jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6 mt-8", children: [1, 2, 3].map(i => (jsxs("div", { className: "bg-white/10 backdrop-blur rounded-lg p-4", children: [jsx("div", { className: "h-8 bg-white/20 rounded mb-2" }), jsx("div", { className: "h-4 bg-white/20 rounded w-24" })] }, i))) })] }) }) }), jsx("div", { className: "py-8 px-4", children: jsxs("div", { className: "animate-pulse max-w-7xl mx-auto", children: [jsx("div", { className: "h-8 bg-gray-300 rounded mb-6 w-48" }), jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-4 gap-6", children: [jsx("div", { className: "lg:col-span-1", children: jsx("div", { className: "bg-gray-300 rounded-lg h-96" }) }), jsx("div", { className: "lg:col-span-3", children: jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6", children: [1, 2, 3, 4, 5, 6].map(i => (jsx("div", { className: "bg-gray-300 rounded-lg h-64" }, i))) }) })] })] }) })] }));
// Helper function to get category icons
function getCategoryIcon(category) {
    const icons = {
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
const getServerSideProps = async (context) => {
    try {
        // In a real implementation, fetch initial data from your API or blockchain
        // This is a mock implementation for demonstration
        const initialListings = [];
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
                programId: process.env.PROGRAM_ID || '367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK',
            },
        };
    }
    catch (error) {
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

/**
 * GhostSpeak Next.js API Route Handlers
 *
 * Pre-built API route handlers for common GhostSpeak operations
 * that can be used in Next.js API routes.
 */
/**
 * Create a server-side GhostSpeak client
 */
function createServerClient(config) {
    return new GhostSpeakClient({
        network: config.network,
        rpcUrl: config.rpcUrl,
        serverMode: true,
        keypair: config.serverKeypair,
        programIds: config.programIds
    });
}
/**
 * Agent management API handler
 */
function createAgentHandler(config) {
    return async (req, res) => {
        try {
            const client = createServerClient(config);
            const agentService = new AgentService(client);
            switch (req.method) {
                case 'GET':
                    if (req.query.id) {
                        // Get specific agent
                        const agent = await agentService.getAgent(req.query.id);
                        return res.status(200).json(agent);
                    }
                    else {
                        // List agents
                        const agents = await agentService.listAgents({
                            limit: parseInt(req.query.limit) || 20,
                            offset: parseInt(req.query.offset) || 0,
                            category: req.query.category,
                            verified: req.query.verified === 'true'
                        });
                        return res.status(200).json(agents);
                    }
                case 'POST':
                    // Create agent (requires authentication)
                    const createParams = req.body;
                    const newAgent = await agentService.createAgent(createParams);
                    return res.status(201).json(newAgent);
                case 'PUT':
                    // Update agent
                    const agentId = req.query.id;
                    const updates = req.body;
                    const updatedAgent = await agentService.updateAgent(agentId, updates);
                    return res.status(200).json(updatedAgent);
                case 'DELETE':
                    // Delete agent
                    const deleteId = req.query.id;
                    await agentService.deleteAgent(deleteId);
                    return res.status(204).end();
                default:
                    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
                    return res.status(405).json({ error: 'Method not allowed' });
            }
        }
        catch (error) {
            console.error('Agent API error:', error);
            return res.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };
}
/**
 * Message API handler
 */
function createMessageHandler(config) {
    return async (req, res) => {
        try {
            const client = createServerClient(config);
            const messageService = new MessageService(client);
            switch (req.method) {
                case 'GET':
                    // Get messages for a channel or conversation
                    const messages = await messageService.getMessages({
                        channelId: req.query.channelId,
                        agentId: req.query.agentId,
                        limit: parseInt(req.query.limit) || 50,
                        before: req.query.before
                    });
                    return res.status(200).json(messages);
                case 'POST':
                    // Send message
                    const messageParams = req.body;
                    const newMessage = await messageService.sendMessage(messageParams);
                    return res.status(201).json(newMessage);
                default:
                    res.setHeader('Allow', ['GET', 'POST']);
                    return res.status(405).json({ error: 'Method not allowed' });
            }
        }
        catch (error) {
            console.error('Message API error:', error);
            return res.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };
}
/**
 * Escrow API handler
 */
function createEscrowHandler(config) {
    return async (req, res) => {
        try {
            const client = createServerClient(config);
            const escrowService = new EscrowService(client);
            switch (req.method) {
                case 'GET':
                    if (req.query.id) {
                        // Get specific escrow
                        const escrow = await escrowService.getEscrow(req.query.id);
                        return res.status(200).json(escrow);
                    }
                    else {
                        // List escrows for user
                        const escrows = await escrowService.getUserEscrows(req.query.userId);
                        return res.status(200).json(escrows);
                    }
                case 'POST':
                    // Create escrow
                    const escrowParams = req.body;
                    const newEscrow = await escrowService.createEscrow(escrowParams);
                    return res.status(201).json(newEscrow);
                case 'PUT':
                    // Update escrow status
                    const escrowId = req.query.id;
                    const action = req.body.action; // 'release', 'cancel', 'dispute'
                    let result;
                    switch (action) {
                        case 'release':
                            result = await escrowService.releaseEscrow(escrowId);
                            break;
                        case 'cancel':
                            result = await escrowService.cancelEscrow(escrowId);
                            break;
                        case 'dispute':
                            result = await escrowService.raiseDispute(escrowId, req.body.reason);
                            break;
                        default:
                            return res.status(400).json({ error: 'Invalid action' });
                    }
                    return res.status(200).json(result);
                default:
                    res.setHeader('Allow', ['GET', 'POST', 'PUT']);
                    return res.status(405).json({ error: 'Method not allowed' });
            }
        }
        catch (error) {
            console.error('Escrow API error:', error);
            return res.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };
}
/**
 * WebSocket handler for real-time updates
 */
function createWebSocketHandler(config) {
    return async (req, res) => {
        if (req.method !== 'GET') {
            return res.status(405).json({ error: 'Method not allowed' });
        }
        // This would typically upgrade to WebSocket connection
        // For Next.js, you might use a library like socket.io or ws
        res.status(200).json({
            message: 'WebSocket endpoint',
            endpoint: '/api/ghostspeak/ws'
        });
    };
}
/**
 * Health check handler
 */
function createHealthHandler(config) {
    return async (req, res) => {
        try {
            const client = createServerClient(config);
            // Test connection
            const slot = await client.getSlot();
            return res.status(200).json({
                status: 'healthy',
                network: config.network,
                currentSlot: slot,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            return res.status(503).json({
                status: 'unhealthy',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    };
}
/**
 * Utility function to create all handlers
 */
function createAllHandlers(config) {
    return {
        agents: createAgentHandler(config),
        messages: createMessageHandler(config),
        escrow: createEscrowHandler(config),
        websocket: createWebSocketHandler(),
        health: createHealthHandler(config)
    };
}
/**
 * Middleware for authentication
 */
function withAuth(handler) {
    return async (req, res) => {
        // Implement authentication logic
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Verify token (implementation depends on your auth system)
        try {
            // const token = authHeader.slice(7);
            // const user = await verifyToken(token);
            // req.user = user;
            return handler(req, res);
        }
        catch (error) {
            return res.status(401).json({ error: 'Invalid token' });
        }
    };
}
/**
 * Middleware for rate limiting
 */
function withRateLimit(config) {
    const requests = new Map();
    return (handler) => {
        return async (req, res) => {
            const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            const now = Date.now();
            const windowStart = now - config.windowMs;
            if (!requests.has(ip)) {
                requests.set(ip, []);
            }
            const userRequests = requests.get(ip).filter((time) => time > windowStart);
            if (userRequests.length >= config.maxRequests) {
                return res.status(429).json({ error: 'Rate limit exceeded' });
            }
            userRequests.push(now);
            requests.set(ip, userRequests);
            return handler(req, res);
        };
    };
}

export { GhostSpeakApp, MarketplacePage, createAgentHandler, createAllHandlers, createEscrowHandler, createHealthHandler, createMessageHandler, createServerClient, createWebSocketHandler, getServerSideProps, withAuth, withRateLimit };
