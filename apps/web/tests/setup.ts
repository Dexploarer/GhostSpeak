import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Clean up after each test
afterEach(() => {
  cleanup()
})

// Global test timeout
vi.setConfig({ testTimeout: 10000 })
