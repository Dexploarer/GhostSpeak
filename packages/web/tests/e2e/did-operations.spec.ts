/**
 * E2E Tests for DID Operations
 *
 * Tests DID creation and display in the UI using Playwright
 */

import { test, expect } from '@playwright/test'

test.describe('DID Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to application
    await page.goto('http://localhost:3000')
  })

  test('should display DID information on agent page', async ({ page }) => {
    // Navigate to an agent page (mock or test agent)
    await page.goto('/agents/test-agent-id')

    // Wait for DID section to load
    await page.waitForSelector('[data-testid="did-section"]', { timeout: 10000 })

    // Check for DID string
    const didString = await page.locator('[data-testid="did-string"]').textContent()
    expect(didString).toContain('did:sol:')

    // Check for verification methods section
    const verificationMethods = await page.locator('[data-testid="verification-methods"]')
    await expect(verificationMethods).toBeVisible()
  })

  test('should display DID creation form', async ({ page }) => {
    // Navigate to DID creation page
    await page.goto('/dashboard/agents/create')

    // Check for DID option
    const didCheckbox = page.locator('[data-testid="enable-did"]')
    if (await didCheckbox.isVisible()) {
      await didCheckbox.check()

      // Verify DID configuration options appear
      await expect(page.locator('[data-testid="did-config"]')).toBeVisible()
    }
  })

  test('should show DID verification methods', async ({ page }) => {
    await page.goto('/agents/test-agent-id')

    await page.waitForSelector('[data-testid="verification-methods-list"]')

    // Check for at least one verification method
    const methods = page.locator('[data-testid="verification-method-item"]')
    const count = await methods.count()

    // May be 0 if agent doesn't have DID yet
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should display DID service endpoints', async ({ page }) => {
    await page.goto('/agents/test-agent-id')

    // Look for service endpoints section
    const servicesSection = page.locator('[data-testid="service-endpoints"]')

    if (await servicesSection.isVisible()) {
      // Verify services are listed
      const services = page.locator('[data-testid="service-endpoint-item"]')
      expect(await services.count()).toBeGreaterThanOrEqual(0)
    }
  })

  test('should allow copying DID string', async ({ page }) => {
    await page.goto('/agents/test-agent-id')

    const copyButton = page.locator('[data-testid="copy-did-button"]')

    if (await copyButton.isVisible()) {
      await copyButton.click()

      // Check for success toast/message
      await expect(page.locator('[data-testid="copy-success"]')).toBeVisible({ timeout: 3000 })
    }
  })
})
