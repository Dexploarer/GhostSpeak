/**
 * E2E Test: x402 Payment Flow
 */

import { test, expect } from '@playwright/test'
import { navigateAndWait, mockWalletConnection, waitForTransaction, mockAPI } from './utils/helpers'

test.describe('x402 Payments', () => {
  test.beforeEach(async ({ page }) => {
    await mockWalletConnection(page)
  })

  test('should display agent payment options', async ({ page }) => {
    await navigateAndWait(page, '/agents/demo-agent/interact')
    
    // Should see payment section
    const paymentSection = page.locator('[data-testid="payment-section"]')
    await expect(paymentSection).toBeVisible()
    
    // Should see payment amount
    const amount = page.locator('[data-testid="payment-amount"]')
    await expect(amount).toBeVisible()
  })

  test('should initiate payment successfully', async ({ page }) => {
    // Mock payment API
    await mockAPI(page, '**/api/x402/pay', {
      success: true,
      signature: 'mock-signature-123',
      transactionId: 'tx123'
    })
    
    await navigateAndWait(page, '/agents/demo-agent/interact')
    
    // Click pay button
    await page.click('[data-testid="pay-button"]')
    
    // Wait for payment modal
    await page.waitForSelector('[data-testid="payment-modal"]', { state: 'visible' })
    
    // Confirm payment
    await page.click('[data-testid="confirm-payment"]')
    
    // Wait for transaction
    await waitForTransaction(page)
    
    // Verify success message
    const successToast = page.locator('text=Payment successful')
    await expect(successToast).toBeVisible()
  })

  test('should verify payment on-chain', async ({ page }) => {
    await mockAPI(page, '**/api/x402/pay', {
      success: true,
      signature: '5signature123...'
    })
    
    await mockAPI(page, '**/api/x402/verify', {
      valid: true,
      amount: '1000000',
      recipient: 'DemoAgent123...'
    })
    
    await navigateAndWait(page, '/agents/demo-agent/interact')
    
    // Make payment
    await page.click('[data-testid="pay-button"]')
    await page.click('[data-testid="confirm-payment"]')
    
    // Wait for verification
    await page.waitForSelector('[data-testid="payment-verified"]', { state: 'visible' })
    
    // Verify checkmark or confirmation
    const verified = page.locator('[data-testid="payment-verified"]')
    await expect(verified).toBeVisible()
  })

  test('should handle payment failure', async ({ page }) => {
    // Mock failed payment
    await mockAPI(page, '**/api/x402/pay', {
      success: false,
      error: 'Insufficient funds'
    })
    
    await navigateAndWait(page, '/agents/demo-agent/interact')
    
    // Try to pay
    await page.click('[data-testid="pay-button"]')
    await page.click('[data-testid="confirm-payment"]')
    
    // Wait for error message
    const errorToast = page.locator('text=Insufficient funds')
    await expect(errorToast).toBeVisible({ timeout: 10000 })
  })

  test('should display payment history', async ({ page }) => {
    await navigateAndWait(page, '/dashboard/payments')
    
    // Should see payment history table
    const historyTable = page.locator('[data-testid="payment-history"]')
    await expect(historyTable).toBeVisible()
    
    // Should have at least headers
    const headers = page.locator('th')
    await expect(headers.first()).toBeVisible()
  })
})
