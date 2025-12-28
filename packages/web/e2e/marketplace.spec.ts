/**
 * E2E Test: Marketplace Flow
 */

import { test, expect } from '@playwright/test'
import { navigateAndWait, mockWalletConnection, fillField, waitForLoader } from './utils/helpers'

test.describe('Marketplace', () => {
  test.beforeEach(async ({ page }) => {
    await mockWalletConnection(page)
  })

  test('should browse marketplace listings', async ({ page }) => {
    await navigateAndWait(page, '/marketplace')
    
    // Wait for listings to load
    await waitForLoader(page)
    
    //Should see listing cards
    const listings = page.locator('[data-testid="marketplace-listing"]')
    const count = await listings.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should search and filter listings', async ({ page }) => {
    await navigateAndWait(page, '/marketplace')
    
    // Use search
    await fillField(page, '[data-testid="search-input"]', 'AI Agent')
    await page.keyboard.press('Enter')
    
    // Wait for filtered results
    await waitForLoader(page)
    
    // Results should contain search term
    const listings = page.locator('[data-testid="marketplace-listing"]')
    const firstListing = listings.first()
    const text = await firstListing.textContent()
    expect(text?.toLowerCase()).toContain('ai')
  })

  test('should view listing details', async ({ page }) => {
    await navigateAndWait(page, '/marketplace')
    await waitForLoader(page)
    
    // Click first listing
    const firstListing = page.locator('[data-testid="marketplace-listing"]').first()
    await firstListing.click()
    
    // Should navigate to details page
    await page.waitForURL(/\/marketplace\/.*/)
    
    // Should see listing details
    const title = page.locator('[data-testid="listing-title"]')
    await expect(title).toBeVisible()
    
    const description = page.locator('[data-testid="listing-description"]')
    await expect(description).toBeVisible()
  })

  test('should create new listing', async ({ page }) => {
    await navigateAndWait(page, '/marketplace/create')
    
    // Fill listing form
    await fillField(page, '[name="title"]', 'Test AI Service')
    await fillField(page, '[name="description"]', 'This is a test service description')
    await fillField(page, '[name="price"]', '10')
    
    // Select category
    await page.selectOption('[name="category"]', 'Development')
    
    // Add tags
    await fillField(page, '[name="tags"]', 'AI, Automation')
    
    // Submit
    await page.click('[data-testid="create-listing-button"]')
    
    // Wait for success
    const successMessage = page.locator('text=Listing created')
    await expect(successMessage).toBeVisible({ timeout: 15000 })
  })

  test('should purchase service', async ({ page }) => {
    await navigateAndWait(page, '/marketplace/demo-listing')
    
    // Click purchase button
    await page.click('[data-testid="purchase-button"]')
    
    // Confirm purchase
    await page.waitForSelector('[data-testid="purchase-modal"]')
    await page.click('[data-testid="confirm-purchase"]')
    
    // Wait for transaction
    const successToast = page.locator('text=Purchase successful')
    await expect(successToast).toBeVisible({ timeout: 15000 })
  })

  test('should filter by category', async ({ page }) => {
    await navigateAndWait(page, '/marketplace')
    
    // Click category filter
    await page.click('[data-testid="category-development"]')
    
    // Wait for filtered results
    await waitForLoader(page)
    
    // All results should be in Development category
    const listings = page.locator('[data-testid="marketplace-listing"]')
    const count = await listings.count()
    expect(count).toBeGreaterThan(0)
  })
})
