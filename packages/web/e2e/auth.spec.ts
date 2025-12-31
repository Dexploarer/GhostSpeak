/**
 * E2E Test: Authentication Flow
 */

import { test, expect } from '@playwright/test'
import { navigateAndWait, mockWalletConnection, waitForElement } from './utils/helpers'

test.describe('Authentication', () => {
  test('should load home page', async ({ page }) => {
    await navigateAndWait(page, '/')
    await expect(page).toHaveTitle(/GhostSpeak/)
  })

  test('should show connect wallet button', async ({ page }) => {
    await navigateAndWait(page, '/')
    const connectButton = page.locator('button:has-text("Connect Wallet")')
    await expect(connectButton).toBeVisible()
  })

  test('should connect wallet successfully', async ({ page }) => {
    // Mock wallet connection
    await mockWalletConnection(page)

    await navigateAndWait(page, '/')

    // Click connect wallet
    await page.click('button:has-text("Connect Wallet")')

    // Wait for connection
    await waitForElement(page, '[data-testid="wallet-connected"]', 15000)

    // Verify wallet address is displayed
    const walletDisplay = page.locator('[data-testid="wallet-address"]')
    await expect(walletDisplay).toBeVisible()
  })

  test('should persist session after page reload', async ({ page }) => {
    await mockWalletConnection(page)
    await navigateAndWait(page, '/')

    // Connect wallet
    await page.click('button:has-text("Connect Wallet")')
    await waitForElement(page, '[data-testid="wallet-connected"]')

    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Verify still connected
    const walletDisplay = page.locator('[data-testid="wallet-address"]')
    await expect(walletDisplay).toBeVisible()
  })

  test('should logout successfully', async ({ page }) => {
    await mockWalletConnection(page)
    await navigateAndWait(page, '/')

    // Connect wallet
    await page.click('button:has-text("Connect Wallet")')
    await waitForElement(page, '[data-testid="wallet-connected"]')

    // Open user menu and logout
    await page.click('[data-testid="user-menu"]')
    await page.click('button:has-text("Disconnect")')

    // Verify disconnected
    const connectButton = page.locator('button:has-text("Connect Wallet")')
    await expect(connectButton).toBeVisible()
  })
})
