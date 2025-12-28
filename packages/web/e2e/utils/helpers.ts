/**
 * Test Utilities for E2E Tests
 */

import { Page, expect } from '@playwright/test'

/**
 * Wait for a specific element to be visible
 */
export async function waitForElement(page: Page, selector: string, timeout = 10000) {
  await page.waitForSelector(selector, { state: 'visible', timeout })
}

/**
 * Navigate and wait for page load
 */
export async function navigateAndWait(page: Page, url: string) {
  await page.goto(url)
  await page.waitForLoadState('networkidle')
}

/**
 * Mock wallet connection for testing
 */
export async function mockWalletConnection(page: Page) {
  // Inject mock wallet into the page
  await page.addInitScript(() => {
    // Mock Crossmint wallet
    (window as any).__mockWallet = {
      address: 'DemoWallet1234567890abcdefghijklmnopqrstuv',
      connected: true,
      publicKey: {
        toString: () => 'DemoWallet1234567890abcdefghijklmnopqrstuv'
      }
    }
  })
}

/**
 * Wait for transaction to complete
 */
export async function waitForTransaction(page: Page, timeout = 30000) {
  // Wait for success toast or confirmation
  await page.waitForSelector('[data-testid="transaction-success"]', { timeout })
}

/**
 * Fill form field safely
 */
export async function fillField(page: Page, selector: string, value: string) {
  await page.fill(selector, value)
  await expect(page.locator(selector)).toHaveValue(value)
}

/**
 * Click and wait for navigation
 */
export async function clickAndNavigate(page: Page, selector: string) {
  await Promise.all([
    page.waitForNavigation(),
    page.click(selector)
  ])
}

/**
 * Check if element exists
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  return await page.locator(selector).count() > 0
}

/**
 * Get text content safely
 */
export async function getTextContent(page: Page, selector: string): Promise<string> {
  const element = page.locator(selector)
  await element.waitFor({ state: 'visible' })
  return await element.textContent() || ''
}

/**
 * Take screenshot with name
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true })
}

/**
 * Mock API response
 */
export async function mockAPI(page: Page, url: string, response: any) {
  await page.route(url, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response)
    })
  })
}

/**
 * Wait for loader to disappear
 */
export async function waitForLoader(page: Page) {
  await page.waitForSelector('[data-testid="loader"]', { state: 'hidden', timeout: 10000 })
    .catch(() => {
      // Loader might not appear at all, which is fine
    })
}
