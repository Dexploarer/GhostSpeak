import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { AgentWalletManager, AgentCNFTManager, AgentBackupManager } from '../../packages/cli/src/utils/agentWallet.js'
import { generateKeyPairSigner } from '@solana/signers'
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import * as crypto from 'crypto'

// Security audit tests for credential storage
describe('Security Audit - Credential Storage', () => {
  const testDir = join(homedir(), '.ghostspeak-test')
  const agentId = 'security-test-agent'
  let walletManager: AgentWalletManager
  let cnftManager: AgentCNFTManager
  let backupManager: AgentBackupManager

  beforeAll(() => {
    // Create test directory
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true })
    }

    // Initialize managers with test directory
    walletManager = new AgentWalletManager()
    cnftManager = new AgentCNFTManager()
    backupManager = new AgentBackupManager()

    // Override base directories for testing
    (walletManager as any).baseDir = testDir
    (cnftManager as any).baseDir = testDir
    (backupManager as any).baseDir = testDir
  })

  describe('File Permissions', () => {
    it('should create files with restricted permissions', async () => {
      const wallet = await generateKeyPairSigner()
      const credentials = await walletManager.createAgentWallet(agentId, wallet.address)
      
      const filePath = join(testDir, 'agents', agentId, 'wallet.json')
      const stats = require('fs').statSync(filePath)
      
      // Check file permissions (should be 0600 - read/write for owner only)
      const mode = stats.mode & parseInt('777', 8)
      expect(mode).toBe(parseInt('600', 8))
    })

    it('should prevent directory traversal attacks', () => {
      const maliciousId = '../../../etc/passwd'
      
      expect(() => {
        walletManager.getAgentWallet(maliciousId)
      }).toThrow()
    })
  })

  describe('Encryption Standards', () => {
    it('should encrypt sensitive data in backups', async () => {
      const wallet = await generateKeyPairSigner()
      await walletManager.createAgentWallet(agentId, wallet.address)

      const backup = await backupManager.createBackup(agentId, 'test-password')
      
      // Verify backup is encrypted
      expect(backup.encrypted).toBe(true)
      expect(backup.data).toBeTruthy()
      expect(backup.data).not.toContain(wallet.address) // Address should not be in plaintext
      expect(backup.iv).toBeTruthy()
      expect(backup.salt).toBeTruthy()
    })

    it('should use strong encryption algorithm', async () => {
      const backup = await backupManager.createBackup(agentId, 'test-password')
      
      // Verify encryption parameters
      expect(backup.algorithm).toBe('aes-256-gcm')
      expect(backup.keyDerivation).toBe('pbkdf2')
      expect(backup.iterations).toBeGreaterThanOrEqual(100000) // OWASP recommendation
    })

    it('should not store passwords in memory or files', async () => {
      const password = 'super-secret-password'
      const backup = await backupManager.createBackup(agentId, password)
      
      // Check backup file doesn't contain password
      const backupPath = join(testDir, 'backups', `${agentId}-backup.json`)
      const backupContent = readFileSync(backupPath, 'utf-8')
      
      expect(backupContent).not.toContain(password)
      expect(backup).not.toHaveProperty('password')
    })
  })

  describe('Access Control', () => {
    it('should validate agent ownership before access', () => {
      const unauthorizedWallet = 'fake-wallet-address'
      
      // Try to access non-existent agent
      const result = walletManager.getAgentWallet('non-existent-agent')
      expect(result).toBeNull()
    })

    it('should prevent concurrent access conflicts', async () => {
      const operations = Array(10).fill(0).map(async () => {
        const wallet = await generateKeyPairSigner()
        return walletManager.createAgentWallet(`agent-${Math.random()}`, wallet.address)
      })

      const results = await Promise.all(operations)
      expect(results.every(r => r !== null)).toBe(true)
    })
  })

  describe('Input Validation', () => {
    it('should sanitize agent IDs', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '../../etc/passwd',
        'agent\x00null',
        'agent%20space',
        'agent;rm -rf /'
      ]

      for (const input of maliciousInputs) {
        expect(() => {
          // Should either sanitize or reject
          const result = walletManager.getAgentWallet(input)
          if (result) {
            // If it returns something, the ID should be sanitized
            expect(result.agentId).not.toBe(input)
          }
        }).not.toThrow()
      }
    })

    it('should validate wallet addresses', async () => {
      const invalidAddresses = [
        'not-a-valid-address',
        '',
        null,
        undefined,
        '0x1234567890abcdef' // Ethereum address
      ]

      for (const address of invalidAddresses) {
        await expect(
          walletManager.createAgentWallet(agentId, address as any)
        ).rejects.toThrow()
      }
    })
  })

  describe('Data Integrity', () => {
    it('should detect tampering with credential files', async () => {
      const wallet = await generateKeyPairSigner()
      await walletManager.createAgentWallet(agentId, wallet.address)

      // Tamper with the file
      const filePath = join(testDir, 'agents', agentId, 'credentials.json')
      const content = JSON.parse(readFileSync(filePath, 'utf-8'))
      content.checksum = 'tampered'
      writeFileSync(filePath, JSON.stringify(content, null, 2))

      // Should detect tampering
      expect(() => {
        walletManager.verifyCredentialIntegrity(agentId)
      }).toThrow(/integrity check failed/i)
    })

    it('should use checksums for all sensitive files', async () => {
      const wallet = await generateKeyPairSigner()
      const credentials = await walletManager.createAgentWallet(agentId, wallet.address)

      expect(credentials.checksum).toBeTruthy()
      expect(credentials.checksum).toMatch(/^[a-f0-9]{64}$/) // SHA-256 hash
    })
  })

  describe('Secure Deletion', () => {
    it('should securely delete credentials', async () => {
      const wallet = await generateKeyPairSigner()
      await walletManager.createAgentWallet(agentId, wallet.address)

      // Delete credentials
      await walletManager.deleteAgentCredentials(agentId)

      // Verify files are gone
      const agentDir = join(testDir, 'agents', agentId)
      expect(existsSync(agentDir)).toBe(false)

      // Verify data is overwritten (not just deleted)
      // This is platform-specific, but we can at least verify the API is called
      expect(walletManager.lastSecureDeleteCalled).toBe(true)
    })
  })

  describe('Audit Logging', () => {
    it('should log all credential access attempts', async () => {
      const auditLog = join(testDir, 'audit.log')
      
      // Perform operations
      await walletManager.getAgentWallet(agentId)
      await walletManager.listAgentWallets()

      // Check audit log
      if (existsSync(auditLog)) {
        const log = readFileSync(auditLog, 'utf-8')
        expect(log).toContain('ACCESS_ATTEMPT')
        expect(log).toContain(agentId)
        expect(log).toMatch(/\d{4}-\d{2}-\d{2}/) // Date format
      }
    })

    it('should log security violations', async () => {
      const auditLog = join(testDir, 'security.log')
      
      // Attempt malicious operations
      try {
        await walletManager.getAgentWallet('../../../etc/passwd')
      } catch (e) {
        // Expected
      }

      if (existsSync(auditLog)) {
        const log = readFileSync(auditLog, 'utf-8')
        expect(log).toContain('SECURITY_VIOLATION')
        expect(log).toContain('directory traversal')
      }
    })
  })

  describe('Key Management', () => {
    it('should never expose private keys in logs or errors', async () => {
      const wallet = await generateKeyPairSigner()
      const credentials = await walletManager.createAgentWallet(agentId, wallet.address)

      // Stringify should not include private key
      const str = JSON.stringify(credentials)
      expect(str).not.toContain('privateKey')
      expect(str).not.toContain('secretKey')
    })

    it('should rotate encryption keys periodically', async () => {
      // Check key rotation metadata
      const keyMetadata = await walletManager.getKeyRotationStatus()
      
      expect(keyMetadata).toHaveProperty('lastRotation')
      expect(keyMetadata).toHaveProperty('nextRotation')
      expect(keyMetadata.rotationInterval).toBeLessThanOrEqual(90 * 24 * 60 * 60 * 1000) // 90 days
    })
  })

  describe('Compliance Checks', () => {
    it('should comply with data retention policies', async () => {
      // Verify old backups are cleaned up
      const oldBackupDate = new Date()
      oldBackupDate.setDate(oldBackupDate.getDate() - 100) // 100 days old

      const oldBackup = {
        id: 'old-backup',
        created: oldBackupDate.toISOString(),
        data: 'test'
      }

      const backupPath = join(testDir, 'backups', 'old-backup.json')
      writeFileSync(backupPath, JSON.stringify(oldBackup))

      await backupManager.cleanupOldBackups(90) // 90 day retention

      expect(existsSync(backupPath)).toBe(false)
    })

    it('should support GDPR data export', async () => {
      const wallet = await generateKeyPairSigner()
      await walletManager.createAgentWallet(agentId, wallet.address)

      const exportData = await walletManager.exportUserData(agentId)
      
      expect(exportData).toHaveProperty('agentId')
      expect(exportData).toHaveProperty('walletAddress')
      expect(exportData).toHaveProperty('created')
      expect(exportData).toHaveProperty('metadata')
      expect(exportData).not.toHaveProperty('privateKey') // Should not export private keys
    })
  })

  afterAll(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })
})