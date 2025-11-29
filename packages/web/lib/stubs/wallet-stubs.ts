// TEMPORARY STUBS for GitHub Pages deployment
// TODO: Replace with actual wallet adapter implementations once compatibility issues are resolved

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

// Stub for wallet modal
export const useWalletModal = () => ({
  setVisible: () => {},
})

// Stub for connection
export const useConnection = () => ({
  connection: null,
})
