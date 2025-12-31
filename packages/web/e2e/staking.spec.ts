/**
 * E2E Test: Staking Flow
 */

import { test, expect } from '@playwright/test'
import { navigateAndWait, mockWalletConnection, fillField, waitForLoader } from './utils/helpers'

test.describe('Staking', () => {
  test.beforeEach(async ({ page }) => {
    await mockWalletConnection(page)
  })

  test('should display staking dashboard', async ({ page }) => {
    await navigateAndWait(page, '/dashboard/staking')

    // Should see staking stats
    const totalStaked = page.locator('[data-testid="total-staked"]')
    await expect(totalStaked).toBeVisible()

    const baseApy = page.locator('[data-testid="base-apy"]')
    await expect(baseApy).toBeVisible()
  })

  test('should create staking account', async ({ page }) => {
    await navigateAndWait(page, '/dashboard/staking')

    // Click create account button
    const createButton = page.locator('button:has-text("Create Staking Account")')

    if (await createButton.isVisible()) {
      await createButton.click()

      // Wait for transaction
      const successToast = page.locator('text=Staking account created')
      await expect(successToast).toBeVisible({ timeout: 15000 })
    }
  })

  test('should stake tokens', async ({ page }) => {
    await navigateAndWait(page, '/dashboard/staking')

    // Open stake modal
    await page.click('[data-testid="stake-button"]')

    // Enter amount
    await fillField(page, '[data-testid="stake-amount"]', '100')

    // Select lockup period
    await page.selectOption('[data-testid="lockup-tier"]', '3') // 3 months

    // Confirm stake
    await page.click('[data-testid="confirm-stake"]')

    // Wait for success
    const successToast = page.locator('text=Tokens staked successfully')
    await expect(successToast).toBeVisible({ timeout: 15000 })
  })

  test('should claim rewards', async ({ page }) => {
    await navigateAndWait(page, '/dashboard/staking')

    // Check if rewards available
    const claimButton = page.locator('[data-testid="claim-rewards-button"]')

    if (!(await claimButton.isDisabled())) {
      await claimButton.click()

      // Wait for transaction
      const successToast = page.locator('text=Rewards claimed')
      await expect(successToast).toBeVisible({ timeout: 15000 })
    }
  })

  test('should display lockup tiers', async ({ page }) => {
    await navigateAndWait(page, '/dashboard/staking')

    // Should see tier information
    const tiers = page.locator('[data-testid="lockup-tier"]')
    const count = await tiers.count()
    expect(count).toBeGreaterThan(0)

    // Each tier should show APY bonus
    const firstTier = tiers.first()
    const tierText = await firstTier.textContent()
    expect(tierText).toContain('%')
  })

  test('should show staking stats', async ({ page }) => {
    await navigateAndWait(page, '/dashboard/staking')

    // Total stakers
    const totalStakers = page.locator('text=/\\d+ Total Stakers/i')
    await expect(totalStakers).toBeVisible()

    // My rewards
    const myRewards = page.locator('[data-testid="my-rewards"]')
    await expect(myRewards).toBeVisible()
  })
})
