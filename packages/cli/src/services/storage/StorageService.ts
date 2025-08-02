/**
 * Storage service for persistent data management
 */

import { promises as fs } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import type { IStorageService } from '../../types/services.js'

export class StorageService implements IStorageService {
  private readonly baseDir: string

  constructor(baseDir?: string) {
    this.baseDir = baseDir ?? join(homedir(), '.ghostspeak', 'data')
  }

  /**
   * Save data to storage
   */
  async save<T>(key: string, data: T): Promise<void> {
    try {
      await this.ensureDirectoryExists()
      const filePath = this.getFilePath(key)
      const jsonData = JSON.stringify(data, null, 2)
      await fs.writeFile(filePath, jsonData, 'utf-8')
    } catch (_error) {
      throw new Error(`Failed to save data for key "${key}": ${error instanceof Error ? _error.message : 'Unknown error'}`)
    }
  }

  /**
   * Load data from storage
   */
  async load<T>(key: string): Promise<T | null> {
    try {
      const filePath = this.getFilePath(key)
      const jsonData = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(jsonData) as T
    } catch (_error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return null // File doesn't exist
      }
      throw new Error(`Failed to load data for key "${key}": ${error instanceof Error ? _error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete data from storage
   */
  async delete(key: string): Promise<void> {
    try {
      const filePath = this.getFilePath(key)
      await fs.unlink(filePath)
    } catch (_error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return // File doesn't exist, nothing to delete
      }
      throw new Error(`Failed to delete data for key "${key}": ${error instanceof Error ? _error.message : 'Unknown error'}`)
    }
  }

  /**
   * Check if data exists in storage
   */
  async exists(key: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(key)
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * List all keys with optional prefix filter
   */
  async listKeys(prefix?: string): Promise<string[]> {
    try {
      await this.ensureDirectoryExists()
      const files = await fs.readdir(this.baseDir)
      const keys = files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''))
        .map(file => file.replace(/~/g, '/')) // Restore path separators
      
      if (prefix) {
        return keys.filter(key => key.startsWith(prefix))
      }
      
      return keys
    } catch (_error) {
      throw new Error(`Failed to list keys: ${error instanceof Error ? _error.message : 'Unknown error'}`)
    }
  }

  /**
   * Clear all data (useful for testing)
   */
  async clear(): Promise<void> {
    try {
      const exists = await this.directoryExists()
      if (exists) {
        await fs.rm(this.baseDir, { recursive: true, force: true })
      }
    } catch (_error) {
      throw new Error(`Failed to clear storage: ${error instanceof Error ? _error.message : 'Unknown error'}`)
    }
  }

  /**
   * Private helper methods
   */
  private getFilePath(key: string): string {
    // Replace path separators with safe characters for filename
    const safeKey = key.replace(/[/\\]/g, '~')
    return join(this.baseDir, `${safeKey}.json`)
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true })
    } catch (_error) {
      throw new Error(`Failed to create storage directory: ${error instanceof Error ? _error.message : 'Unknown error'}`)
    }
  }

  private async directoryExists(): Promise<boolean> {
    try {
      await fs.access(this.baseDir)
      return true
    } catch {
      return false
    }
  }
}

// Factory function for dependency injection
export function createStorageService(baseDir?: string): StorageService {
  return new StorageService(baseDir)
}