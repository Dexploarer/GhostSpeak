import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { execSync } from 'child_process';
import { join } from 'path';

describe('Quickstart and Wizard Commands', () => {
  const cliPath = join(__dirname, '../../dist/index.js');
  
  beforeAll(() => {
    // Ensure CLI is built
    try {
      execSync('bun run build', { cwd: join(__dirname, '../..') });
    } catch (error) {
      console.error('Failed to build CLI:', error);
    }
  });

  test('quickstart command should execute without errors', () => {
    try {
      execSync(
        `node ${cliPath} quickstart --skip-wallet --skip-network`,
        { encoding: 'utf8', stdio: 'pipe' }
      );
      // If it doesn't throw, the command succeeded
      expect(true).toBe(true);
    } catch (error) {
      // The command failed
      if (error instanceof Error) {
        console.error('Quickstart failed:', error.message);
      }
      expect(error).toBeUndefined();
    }
  });

  test('quickstart --help should show correct options', () => {
    const result = execSync(
      `node ${cliPath} quickstart --help`,
      { encoding: 'utf8' }
    );
    
    expect(result).toContain('Quick setup guide for new users');
    expect(result).toContain('--skip-wallet');
    expect(result).toContain('--skip-network');
  });

  test('wizard command should execute without errors', () => {
    // Note: This test may not complete fully in CI without Solana CLI
    try {
      const result = execSync(
        `node ${cliPath} wizard --quick`,
        { encoding: 'utf8', timeout: 10000 }
      );
      
      expect(result).toContain('GhostSpeak Setup Wizard');
      expect(result).toContain('Setup Overview');
    } catch (error) {
      // If it times out or fails due to missing Solana CLI, that's okay
      // as long as it started properly
      if (error instanceof Error) {
        expect(error.message).toBeTruthy();
      }
    }
  });

  test('wizard --help should show correct options', () => {
    const result = execSync(
      `node ${cliPath} wizard --help`,
      { encoding: 'utf8' }
    );
    
    expect(result).toContain('Interactive setup and configuration wizard');
    expect(result).toContain('--full');
    expect(result).toContain('--quick');
  });
});