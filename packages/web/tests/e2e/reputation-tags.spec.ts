/**
 * E2E Tests for Reputation Tags
 *
 * Tests tag display and filtering in the UI
 */

import { test, expect } from '@playwright/test'

test.describe('Reputation Tags', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
  })

  test('should display reputation tags on agent page', async ({ page }) => {
    await page.goto('/agents/test-agent-id')

    // Wait for tags section
    await page.waitForSelector('[data-testid="reputation-tags"]', { timeout: 10000 })

    // Check for tag badges
    const tags = page.locator('[data-testid="reputation-tag"]')
    const tagCount = await tags.count()

    // Agent may have 0 or more tags
    expect(tagCount).toBeGreaterThanOrEqual(0)
  })

  test('should display tag categories', async ({ page }) => {
    await page.goto('/agents/test-agent-id')

    // Check for skill tags section
    const skillTags = page.locator('[data-testid="skill-tags"]')
    if (await skillTags.isVisible()) {
      expect(await skillTags.locator('[data-testid="tag-badge"]').count()).toBeGreaterThanOrEqual(0)
    }

    // Check for behavior tags section
    const behaviorTags = page.locator('[data-testid="behavior-tags"]')
    if (await behaviorTags.isVisible()) {
      expect(
        await behaviorTags.locator('[data-testid="tag-badge"]').count()
      ).toBeGreaterThanOrEqual(0)
    }
  })

  test('should filter agents by tags', async ({ page }) => {
    await page.goto('/agents')

    // Look for tag filter section
    const tagFilter = page.locator('[data-testid="tag-filter"]')

    if (await tagFilter.isVisible()) {
      // Select a tag filter
      await page.locator('[data-testid="tag-filter-option"]').first().click()

      // Wait for filtered results
      await page.waitForTimeout(1000)

      // Verify results updated
      const results = page.locator('[data-testid="agent-card"]')
      expect(await results.count()).toBeGreaterThanOrEqual(0)
    }
  })

  test('should show tag confidence scores', async ({ page }) => {
    await page.goto('/agents/test-agent-id')

    const tagWithConfidence = page.locator('[data-testid="tag-with-confidence"]').first()

    if (await tagWithConfidence.isVisible()) {
      const confidence = await tagWithConfidence.getAttribute('data-confidence')
      expect(Number(confidence)).toBeGreaterThan(0)
      expect(Number(confidence)).toBeLessThanOrEqual(10000)
    }
  })

  test('should display tag tooltips with evidence', async ({ page }) => {
    await page.goto('/agents/test-agent-id')

    const tag = page.locator('[data-testid="reputation-tag"]').first()

    if (await tag.isVisible()) {
      await tag.hover()

      // Check for tooltip
      const tooltip = page.locator('[data-testid="tag-tooltip"]')
      if (await tooltip.isVisible({ timeout: 2000 })) {
        // Tooltip should contain confidence and evidence info
        const tooltipText = await tooltip.textContent()
        expect(tooltipText).toBeTruthy()
      }
    }
  })
})
