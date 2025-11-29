// STUB replacement for @solana/wallet-adapter-react
// TEMPORARY for GitHub Pages deployment

import React from 'react'

export const useWallet = () => ({
  publicKey: null,
  connected: false,
  connecting: false,
  disconnect: () => {},
  connect: () => {},
  wallet: null,
  wallets: [],
  select: () => {},
})

export const useConnection = () => ({
  connection: null,
})

export const ConnectionProvider = ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children)
export const WalletProvider = ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children)

// Stub for any other exports that might be used
export const useWalletModal = () => ({
  setVisible: () => {},
})

// Re-export types that might be expected
export type WalletAdapter = any
export type WalletAdapterNetwork = any
