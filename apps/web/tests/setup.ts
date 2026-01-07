import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Clean up after each test
afterEach(() => {
  cleanup()
})

// Global test timeout
vi.setConfig({ testTimeout: 10000 })
