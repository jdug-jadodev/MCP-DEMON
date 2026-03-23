import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import readFileTool from '../src/tools/read-file.js';
import writeFileTool from '../src/tools/write-file.js';
import listDirectoryTool from '../src/tools/list-directory.js';
import type { Config } from '../src/permissions/config-loader.js';

describe('Security Integration Tests (CA-2.6)', () => {
  const homeDir = os.homedir();
  const testDir = path.join(homeDir, 'test-integration-security');
  const deniedDir = path.join(homeDir, '.test-denied');
  
  // Setup test directories
  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(deniedDir, { recursive: true });
    
    // Create a test file in the allowed directory
    await fs.writeFile(
      path.join(testDir, 'allowed-file.txt'),
      'This file is in an allowed directory'
    );
    
    // Create a test file in the denied directory
    await fs.writeFile(
      path.join(deniedDir, 'secret.txt'),
      'This file is in a denied directory'
    );
    
    // Create a .exe file for extension testing
    await fs.writeFile(
      path.join(testDir, 'malicious.exe'),
      'fake executable'
    );
  });
  
  // Cleanup after tests
  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    await fs.rm(deniedDir, { recursive: true, force: true });
  });
  
  // Base configuration for tests
  const createConfig = (overrides?: Partial<Config>): Config => ({
    version: '1.0',
    permissions: {
      allowed: [
        { path: testDir, operations: ['read', 'list', 'search'] },
      ],
      denied: [deniedDir],
    },
    security: {
      maxFileSizeBytes: 5242880,
      allowedExtensions: ['.txt', '.md', '.json'],
      logAllAccess: false,
      logPath: path.join(homeDir, '.config', 'copilot-fs-mcp', 'logs'),
    },
    ...overrides,
  });
  
  describe('CA-2.6.1: Test successful read from allowed path', () => {
    it('should successfully read file from allowed directory', async () => {
      const config = createConfig();
      const filePath = path.join(testDir, 'allowed-file.txt');
      
      const result = await readFileTool({ path: filePath }, config);
      
      expect(result.content).toBe('This file is in an allowed directory');
      expect(result.path).toBe(filePath);
    });
    
    it('should successfully list allowed directory', async () => {
      const config = createConfig();
      
      const result = await listDirectoryTool({ path: testDir }, config);
      
      expect(result.entries).toBeInstanceOf(Array);
      expect(result.entries.length).toBeGreaterThan(0);
    });
  });
  
  describe('CA-2.6.2: Test explicit denial', () => {
    it('should deny read from explicitly denied path', async () => {
      const config = createConfig();
      const deniedFile = path.join(deniedDir, 'secret.txt');
      
      await expect(
        readFileTool({ path: deniedFile }, config)
      ).rejects.toThrow(/denied_path/);
    });
    
    it('should deny even if path is in both allowed and denied', async () => {
      const config = createConfig({
        permissions: {
          allowed: [
            { path: deniedDir, operations: ['read', 'write'] },
          ],
          denied: [deniedDir],
        },
      });
      const deniedFile = path.join(deniedDir, 'secret.txt');
      
      await expect(
        readFileTool({ path: deniedFile }, config)
      ).rejects.toThrow(/denied_path/);
    });
  });
  
  describe('CA-2.6.3: Test path traversal protection', () => {
    it('should block path traversal attempt to escape allowed directory', async () => {
      const config = createConfig();
      // Try to use .. to access denied directory from allowed directory
      const traversalPath = path.join(testDir, '..', '.test-denied', 'secret.txt');
      
      await expect(
        readFileTool({ path: traversalPath }, config)
      ).rejects.toThrow(/Access denied/);
    });
    
    it('should block multiple .. traversal attempts', async () => {
      const config = createConfig();
      const traversalPath = path.join(testDir, '..', '..', 'etc', 'passwd');
      
      await expect(
        readFileTool({ path: traversalPath }, config)
      ).rejects.toThrow(/Access denied/);
    });
    
    it('should block traversal even with complex paths', async () => {
      const config = createConfig();
      // Go out and come back, but end up outside allowed path
      const traversalPath = path.join(testDir, 'sub', '..', '..', '.test-denied', 'secret.txt');
      
      await expect(
        readFileTool({ path: traversalPath }, config)
      ).rejects.toThrow(/Access denied/);
    });
  });
  
  describe('CA-2.6.4: Test operation not permitted', () => {
    it('should deny write operation when not in allowed operations', async () => {
      const config = createConfig({
        permissions: {
          allowed: [
            { path: testDir, operations: ['read', 'list'] }, // No 'write'
          ],
          denied: [],
        },
      });
      const filePath = path.join(testDir, 'new-file.txt');
      
      await expect(
        writeFileTool({ path: filePath, content: 'test' }, config)
      ).rejects.toThrow(/operation_not_allowed/);
    });
    
    it('should allow operations that are explicitly permitted', async () => {
      const config = createConfig({
        permissions: {
          allowed: [
            { path: testDir, operations: ['read', 'write', 'list'] },
          ],
          denied: [],
        },
      });
      const filePath = path.join(testDir, 'writable-file.txt');
      
      // This should succeed
      const result = await writeFileTool(
        { path: filePath, content: 'test content' },
        config
      );
      
      expect(result.path).toBe(filePath);
      expect(result.bytes).toBeGreaterThan(0);
      
      // Cleanup
      await fs.unlink(filePath);
    });
  });
  
  describe('CA-2.6.5: Test extension not allowed', () => {
    it('should deny read of file with disallowed extension', async () => {
      const config = createConfig({
        security: {
          maxFileSizeBytes: 10000000,
          allowedExtensions: ['.txt', '.md'], // .exe not allowed
          logAllAccess: false,
          logPath: '',
        },
      });
      const exePath = path.join(testDir, 'malicious.exe');
      
      await expect(
        readFileTool({ path: exePath }, config)
      ).rejects.toThrow(/extension_not_allowed/);
    });
    
    it('should allow read of file with allowed extension', async () => {
      const config = createConfig({
        security: {
          maxFileSizeBytes: 10000000,
          allowedExtensions: ['.txt'],
          logAllAccess: false,
          logPath: '',
        },
      });
      const txtPath = path.join(testDir, 'allowed-file.txt');
      
      const result = await readFileTool({ path: txtPath }, config);
      
      expect(result.content).toBeDefined();
    });
    
    it('should be case-insensitive for extension checks', async () => {
      const config = createConfig({
        security: {
          maxFileSizeBytes: 10000000,
          allowedExtensions: ['.txt'],
          logAllAccess: false,
          logPath: '',
        },
      });
      
      // Create a file with uppercase extension
      const upperPath = path.join(testDir, 'uppercase.TXT');
      await fs.writeFile(upperPath, 'uppercase test');
      
      try {
        const result = await readFileTool({ path: upperPath }, config);
        expect(result.content).toBe('uppercase test');
      } finally {
        await fs.unlink(upperPath);
      }
    });
  });
  
  describe('Combined Security Scenarios', () => {
    it('should pass all security checks for a valid operation', async () => {
      const config = createConfig({
        permissions: {
          allowed: [
            { path: testDir, operations: ['read', 'write', 'list', 'search'] },
          ],
          denied: [],
        },
        security: {
          maxFileSizeBytes: 10000000,
          allowedExtensions: ['.txt', '.md', '.json'],
          logAllAccess: true,
          logPath: path.join(homeDir, 'logs'),
        },
      });
      
      const filePath = path.join(testDir, 'secure-file.txt');
      await fs.writeFile(filePath, 'secure content');
      
      try {
        // Should pass all 6 rules
        const result = await readFileTool({ path: filePath }, config);
        expect(result.content).toBe('secure content');
      } finally {
        await fs.unlink(filePath);
      }
    });
    
    it('should fail if any single security rule fails', async () => {
      const config = createConfig({
        permissions: {
          allowed: [
            { path: testDir, operations: ['write'] }, // read not allowed
          ],
          denied: [],
        },
      });
      const filePath = path.join(testDir, 'allowed-file.txt');
      
      // Should fail due to operation not allowed (Rule 3)
      await expect(
        readFileTool({ path: filePath }, config)
      ).rejects.toThrow(/operation_not_allowed/);
    });
  });
});
