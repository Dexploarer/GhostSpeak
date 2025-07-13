/**
 * GhostSpeak Next.js App Component
 *
 * Pre-configured app wrapper that sets up all necessary providers
 * and optimizations for Next.js applications.
 */
import { ReactNode } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
export interface GhostSpeakAppProps {
    children: ReactNode;
    /** Solana network */
    network?: WalletAdapterNetwork;
    /** Custom RPC endpoint */
    endpoint?: string;
    /** GhostSpeak configuration */
    ghostspeakConfig?: {
        autoConnect?: boolean;
        debug?: boolean;
        programIds?: Record<string, string>;
    };
    /** Wallet configuration */
    walletConfig?: {
        wallets?: any[];
        autoConnect?: boolean;
    };
}
export declare function GhostSpeakApp({ children, network, endpoint, ghostspeakConfig, walletConfig }: GhostSpeakAppProps): import("react/jsx-runtime").JSX.Element;
export default GhostSpeakApp;
//# sourceMappingURL=GhostSpeakApp.d.ts.map