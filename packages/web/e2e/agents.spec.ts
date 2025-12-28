/**
 * E2E Test: Agent Management
 */

import { test, expect } from '@playwright/test'
import { navigateAndWait, mockWalletConnection, fillField, waitForLoader } from './utils/helpers'

test.describe('Agent Management', () => {
  test.beforeEach(async ({ page }) => {
    await mockWalletConnection(page)
  })

  test('should browse agent directory', async ({ page }) => {
    await navigateAndWait(page, '/agents')
    await waitForLoader(page)
    
    // Should see agent cards
    const agents = page.locator('[data-testid="agent-card"]')
    const count = await agents.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should view agent details', async ({ page }) => {
    await navigateAndWait(page, '/agents')
    await waitForLoader(page)
    
    // Click first agent
    const firstAgent = page.locator('[data-testid="agent-card"]').first()
    await firstAgent.click()
    
    // Should navigate to agent page
    await page.waitForURL(/\/agents\/.*/)
    
    // Should see agent info
    const agentName = page.locator('[data-testid="agent-name"]')
    await expect(agentName).toBeVisible()
    
    const capabilities = page.locator('[data-testid="agent-capabilities"]')
    await expect(capabilities).toBeVisible()
  })

  test('should register new agent', async ({ page }) => {
    await navigateAndWait(page, '/dashboard/agents/register')
    
    // Fill registration form
    await fillField(page, '[name="name"]', 'Test AI Agent')
    await fillField(page, '[name="description"]', 'A test agent for automated testing')
    
    // Add capabilities
    await page.click('[data-testid="add-capability"]')
    await fillField(page, '[data-testid="capability-input"]', 'Translation')
    
    // Set pricing
    await fillField(page, '[name="pricePerHour"]', '5')
    
    // Submit registration
    await page.click('[data-testid="register-agent-button"]')
    
    // Wait for success
    const successMessage = page.locator('text=Agent registered')
    await expect(successMessage).toBeVisible({ timeout: 15000 })
  })

  test('should update agent profile', async ({ page }) => {
    await navigateAndWait(page, '/dashboard/agents')
    
    // Click edit on first owned agent
    const editButtons = page.locator('[data-testid="edit-agent-button"]')
    await editButtons.first().click()

    
    // Update description
    await fillField(page, '[name="description"]', 'Updated description')
    
    // Save changes
    await page.click('[data-testid="save-agent-button"]')
    
    // Wait for success
    const successToast = page.locator('text=Agent updated')
    await expect(successToast).toBeVisible()
  })

  test('should filter agents by capability', async ({ page }) => {
    await navigateAndWait(page, '/agents')
    
    // Select a capability filter
    await page.click('[data-testid="filter-capability"]')
    await page.click('text=Translation')
    
    // Wait for filtered results
    await waitForLoader(page)
    
    // All agents should have Translation capability
    const agents = page.locator('[data-testid="agent-card"]')
    const firstAgent = agents.first()
    const capabilities = await firstAgent.locator('[data-testid="agent-capabilities"]').textContent()
    expect(capabilities).toContain('Translation')
  })

  test('should interact with agent', async ({ page }) => {
    await navigateAndWait(page, '/agents/demo-agent/interact')
    
    // Should see chat interface
    const chatBox = page.locator('[data-testid="chat-input"]')
    await expect(chatBox).toBeVisible()
    
    // Send message
    await fillField(page, '[data-testid="chat-input"]', 'Hello, agent!')
    await page.click('[data-testid="send-message"]')
    
    // Should see message sent
    const sentMessage = page.locator('text=Hello, agent!')
    await expect(sentMessage).toBeVisible()
  })
})
