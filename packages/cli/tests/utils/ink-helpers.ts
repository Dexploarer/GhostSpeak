/**
 * Ink Testing Utilities
 * Helpers for testing Ink React components using ink-testing-library
 */

import { render as inkRender } from 'ink-testing-library'
import type { ReactElement } from 'react'

/**
 * Render an Ink component for testing
 */
export const renderInk = (component: ReactElement) => {
  return inkRender(component)
}

/**
 * Wait for component output to contain expected text
 */
export const waitForText = async (
  instance: ReturnType<typeof inkRender>,
  expectedText: string,
  timeout = 2000
): Promise<boolean> => {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const output = instance.lastFrame()
    if (output && output.includes(expectedText)) {
      return true
    }
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  return false
}

/**
 * Get the last frame (output) from an Ink instance
 */
export const getLastFrame = (instance: ReturnType<typeof inkRender>): string => {
  return instance.lastFrame() || ''
}

/**
 * Simulate user input to an Ink component
 */
export const typeInput = (instance: ReturnType<typeof inkRender>, text: string) => {
  for (const char of text) {
    instance.stdin.write(char)
  }
}

/**
 * Simulate Enter key press
 */
export const pressEnter = (instance: ReturnType<typeof inkRender>) => {
  instance.stdin.write('\r')
}

/**
 * Simulate arrow key navigation
 */
export const pressArrowDown = (instance: ReturnType<typeof inkRender>) => {
  instance.stdin.write('\x1B[B')
}

export const pressArrowUp = (instance: ReturnType<typeof inkRender>) => {
  instance.stdin.write('\x1B[A')
}

/**
 * Simulate Escape key press
 */
export const pressEscape = (instance: ReturnType<typeof inkRender>) => {
  instance.stdin.write('\x1B')
}

/**
 * Wait for component to unmount
 */
export const waitForUnmount = async (
  instance: ReturnType<typeof inkRender>,
  timeout = 2000
): Promise<boolean> => {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    try {
      instance.lastFrame()
      await new Promise(resolve => setTimeout(resolve, 50))
    } catch {
      // Component has unmounted
      return true
    }
  }

  return false
}

/**
 * Assert component output contains text
 */
export const assertInkOutput = (
  instance: ReturnType<typeof inkRender>,
  expectedText: string
): void => {
  const output = instance.lastFrame()
  if (!output || !output.includes(expectedText)) {
    throw new Error(`Expected output to contain "${expectedText}", but got: ${output}`)
  }
}

/**
 * Assert component output does not contain text
 */
export const assertInkOutputDoesNotContain = (
  instance: ReturnType<typeof inkRender>,
  unexpectedText: string
): void => {
  const output = instance.lastFrame()
  if (output && output.includes(unexpectedText)) {
    throw new Error(`Expected output to not contain "${unexpectedText}", but it did`)
  }
}

/**
 * Cleanup Ink instance
 */
export const cleanupInk = (instance: ReturnType<typeof inkRender>) => {
  try {
    instance.unmount()
  } catch {
    // Already unmounted
  }
}
