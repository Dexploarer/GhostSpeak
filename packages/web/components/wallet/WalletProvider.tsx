'use client'

import React, { FC, ReactNode } from 'react'

// TEMPORARY STUB for GitHub Pages deployment
// TODO: Replace with actual wallet provider once compatibility issues are resolved

interface WalletContextProviderProps {
  children: ReactNode
}

export const WalletContextProvider: FC<WalletContextProviderProps> = ({ children }) => {
  // STUB: No wallet functionality for deployment
  return <>{children}</>
}
