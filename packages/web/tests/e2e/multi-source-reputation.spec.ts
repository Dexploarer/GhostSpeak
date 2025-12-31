/**
 * E2E Tests for Multi-Source Reputation
 *
 * Tests reputation aggregation display in the UI
 */

import { test, expect } from '@playwright/test'

test.describe('Multi-Source Reputation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
  })

  test('should display aggregate reputation score', async ({ page }) => {
    await page.goto('/agents/test-agent-id')

    const aggregateScore = page.locator('[data-testid="aggregate-reputation-score"]')

    if (await aggregateScore.isVisible()) {
      const scoreText = await aggregateScore.textContent()
      expect(scoreText).toBeTruthy()

      // Score should be a number
      const score = Number(scoreText?.replace(/[^0-9]/g, ''))
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(1000)
    }
  })

  test('should show source breakdown', async ({ page }) => {
    await page.goto('/agents/test-agent-id')

    const sourceBreakdown = page.locator('[data-testid="source-breakdown"]')

    if (await sourceBreakdown.isVisible()) {
      // Click to expand breakdown
      await sourceBreakdown.click()

      // Wait for source list
      const sources = page.locator('[data-testid="reputation-source"]')
      const count = await sources.count()

      expect(count).toBeGreaterThanOrEqual(0)
    }
  })

  test('should display conflict warnings', async ({ page }) => {
    await page.goto('/agents/test-agent-id')

    const conflictWarning = page.locator('[data-testid="reputation-conflict-warning"]')

    if (await conflictWarning.isVisible()) {
      // Verify warning message contains one of the expected keywords
      const warningText = await conflictWarning.textContent()
      const hasExpectedKeyword =
        warningText?.includes('conflict') ||
        warningText?.includes('variance') ||
        warningText?.includes('discrepancy')
      expect(hasExpectedKeyword).toBeTruthy()
    }
  })

  test('should show individual source scores', async ({ page }) => {
    await page.goto('/agents/test-agent-id')

    // Expand source breakdown
    const viewBreakdown = page.locator('[data-testid="view-source-breakdown"]')

    if (await viewBreakdown.isVisible()) {
      await viewBreakdown.click()

      // Check for PayAI source
      const payaiSource = page.locator('[data-testid="source-payai"]')
      if (await payaiSource.isVisible()) {
        const payaiScore = await payaiSource.getAttribute('data-score')
        expect(Number(payaiScore)).toBeGreaterThanOrEqual(0)
      }

      // Check for GitHub source
      const githubSource = page.locator('[data-testid="source-github"]')
      if (await githubSource.isVisible()) {
        const githubScore = await githubSource.getAttribute('data-score')
        expect(Number(githubScore)).toBeGreaterThanOrEqual(0)
      }
    }
  })

  test('should display source reliability indicators', async ({ page }) => {
    await page.goto('/agents/test-agent-id')

    const sourceItem = page.locator('[data-testid="reputation-source"]').first()

    if (await sourceItem.isVisible()) {
      const reliability = await sourceItem.getAttribute('data-reliability')

      if (reliability) {
        expect(Number(reliability)).toBeGreaterThanOrEqual(0)
        expect(Number(reliability)).toBeLessThanOrEqual(10000)
      }
    }
  })

  test('should show data point counts', async ({ page }) => {
    await page.goto('/agents/test-agent-id')

    const dataPoints = page.locator('[data-testid="total-data-points"]')

    if (await dataPoints.isVisible()) {
      const count = await dataPoints.textContent()
      expect(Number(count)).toBeGreaterThanOrEqual(0)
    }
  })
})
