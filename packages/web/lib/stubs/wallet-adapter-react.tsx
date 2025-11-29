// STUB replacement for @solana/wallet-adapter-react
// TEMPORARY for GitHub Pages deployment

import React from 'react'

export const useWallet = () => ({
  publicKey: null as unknown,
  connected: false,
  connecting: false,
  disconnect: async () => {},
  connect: async () => {},
  signTransaction: async <T,>(tx: T): Promise<T> => tx,
  signAllTransactions: async <T,>(txs: T[]): Promise<T[]> => txs,
  wallet: null,
  wallets: [],
  select: () => {},
  sendTransaction: async () => '' as unknown,
})

export const useConnection = () => ({
  connection: null,
})

export const ConnectionProvider = ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children)
export const WalletProvider = ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children)

// Stub for any other exports that might be used
export const useWalletModal = () => ({
  setVisible: (visible?: boolean) => {},
})

// Re-export types that might be expected
export type WalletAdapter = any
export type WalletAdapterNetwork = any
