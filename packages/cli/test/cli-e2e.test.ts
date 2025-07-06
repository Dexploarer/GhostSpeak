import { describe, test, expect } from 'bun:test';
import { spawn } from 'child_process';
import path from 'path';

const CLI_PATH = path.resolve(__dirname, '../bin/ghostspeak.js');

function runCli(args: string[], input?: string): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const proc = spawn('bun', [CLI_PATH, ...args], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (data) => (stdout += data.toString()));
    proc.stderr.on('data', (data) => (stderr += data.toString()));
    proc.on('close', (code) => resolve({ stdout, stderr, code: code ?? -1 }));
    if (input) proc.stdin.write(input);
    proc.stdin.end();
  });
}

describe('CLI E2E Tests (devnet, real SDK client)', () => {
  test('should register a new agent', async () => {
    const { stdout, stderr, code } = await runCli(['agent', 'register', '--name', 'e2e-test-agent', '--description', 'E2E Test Agent']);
    expect(code).toBe(0);
    expect(stdout).toMatch(/Registered agent|✅/);
    expect(stderr).toBe('');
  });

  test('should create a new channel', async () => {
    const { stdout, stderr, code } = await runCli(['channel', 'create', '--name', 'e2e-test-channel', '--description', 'E2E Test Channel']);
    expect(code).toBe(0);
    expect(stdout).toMatch(/Created channel|✅/);
    expect(stderr).toBe('');
  });

  test('should run analytics', async () => {
    const { stdout, stderr, code } = await runCli(['analytics', 'run']);
    expect(code).toBe(0);
    expect(stdout).toMatch(/Platform analytics|📊/);
    expect(stderr).toBe('');
  });

  // Add more CLI E2E tests as needed (escrow, message, marketplace, etc.)
}); 