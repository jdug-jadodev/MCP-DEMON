import { describe, it, expect, beforeEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { checkPermission, checkPermissionSync, DenialReasons, type Operation } from '../src/permissions/evaluator.js';
import type { Config } from '../src/permissions/config-loader.js';

describe('evaluator', () => {
  const homeDir = os.homedir();
  const testProjectsDir = path.join(homeDir, 'test-projects');
  const testSSHDir = path.join(homeDir, '.ssh');
  
  // Base configuration for tests
  const createTestConfig = (overrides?: Partial<Config>): Config => ({
    version: '1.0',
    permissions: {
      allowed: [
        { path: testProjectsDir, operations: ['read', 'write', 'list', 'search'] },
      ],
      denied: [testSSHDir, path.join(homeDir, '.aws')],
    },
    security: {
      maxFileSizeBytes: 5242880, // 5 MB
      allowedExtensions: ['.ts', '.js', '.json', '.md', '.txt'],
      logAllAccess: false,
      logPath: path.join(homeDir, '.config', 'copilot-fs-mcp', 'logs'),
    },
    ...overrides,
  });
  
  describe('RULE 1: Explicit Denial', () => {
    it('should deny access to paths in denied list', async () => {
      const config = createTestConfig();
      const deniedPath = path.join(testSSHDir, 'id_rsa');
      
      const result = await checkPermission(config, deniedPath, 'read');
      
      expect(result.allowed).toBe(false);
      expect(result.allowed === false && result.reason).toBe(DenialReasons.DENIED_PATH);
    });
    
    it('should deny access to paths under denied directories', async () => {
      const config = createTestConfig();
      const deniedPath = path.join(testSSHDir, 'keys', 'private', 'id_rsa');
      
      const result = await checkPermission(config, deniedPath, 'read');
      
      expect(result.allowed).toBe(false);
      expect(result.allowed === false && result.reason).toBe(DenialReasons.DENIED_PATH);
    });
    
    it('should deny even if path is also in allowed (denial trumps)', async () => {
      const config = createTestConfig({
        permissions: {
          allowed: [
            { path: testSSHDir, operations: ['read', 'list'] },
          ],
          denied: [testSSHDir],
        },
      });
      
      const result = await checkPermission(config, path.join(testSSHDir, 'id_rsa'), 'read');
      
      expect(result.allowed).toBe(false);
      expect(result.allowed === false && result.reason).toBe(DenialReasons.DENIED_PATH);
    });
    
    it('should deny path exactly matching denied entry', async () => {
      const config = createTestConfig();
      
      const result = await checkPermission(config, testSSHDir, 'list');
      
      expect(result.allowed).toBe(false);
      expect(result.allowed === false && result.reason).toBe(DenialReasons.DENIED_PATH);
    });
  });
  
  describe('RULE 2: Path Authorization', () => {
    it('should deny paths not under any allowed entry', async () => {
      const config = createTestConfig();
      const outsidePath = '/etc/passwd';
      
      const result = await checkPermission(config, outsidePath, 'read');
      
      expect(result.allowed).toBe(false);
      expect(result.allowed === false && result.reason).toBe(DenialReasons.PATH_NOT_ALLOWED);
    });
    
    it('should deny path traversal attempts', async () => {
      const config = createTestConfig();
      const traversalPath = path.join(testProjectsDir, '..', '.ssh', 'id_rsa');
      
      const result = await checkPermission(config, traversalPath, 'read');
      
      expect(result.allowed).toBe(false);
      // Should be either PATH_NOT_ALLOWED or DENIED_PATH depending on resolution
    });
    
    it('should allow paths within allowed directories', async () => {
      const config = createTestConfig();
      const allowedPath = path.join(testProjectsDir, 'src', 'index.ts');
      
      const result = await checkPermission(config, allowedPath, 'read');
      
      // May be denied by other rules, but not by Rule 2
      if (!result.allowed && result.reason === DenialReasons.PATH_NOT_ALLOWED) {
        expect.fail('Should not fail Rule 2 (Path Authorization)');
      }
    });
    
    it('should allow path exactly matching allowed entry', async () => {
      const config = createTestConfig();
      
      const result = await checkPermission(config, testProjectsDir, 'list');
      
      // Should pass Rule 1 and Rule 2
      if (!result.allowed && 
          (result.reason === DenialReasons.DENIED_PATH || 
           result.reason === DenialReasons.PATH_NOT_ALLOWED)) {
        expect.fail('Should pass Rules 1 and 2');
      }
    });
  });
  
  describe('RULE 3: Operation Authorization', () => {
    it('should deny operation not in allowed list', async () => {
      const config = createTestConfig({
        permissions: {
          allowed: [
            { path: testProjectsDir, operations: ['read', 'list'] },
          ],
          denied: [],
        },
      });
      const filePath = path.join(testProjectsDir, 'file.txt');
      
      const result = await checkPermission(config, filePath, 'write');
      
      expect(result.allowed).toBe(false);
      expect(result.allowed === false && result.reason).toBe(DenialReasons.OPERATION_NOT_ALLOWED);
    });
    
    it('should allow operation in allowed list', async () => {
      const config = createTestConfig({
        permissions: {
          allowed: [
            { path: testProjectsDir, operations: ['read', 'write'] },
          ],
          denied: [],
        },
      });
      const filePath = path.join(testProjectsDir, 'file.txt');
      
      const result = await checkPermission(config, filePath, 'read');
      
      // May be denied by other rules, but not by Rule 3
      if (!result.allowed && result.reason === DenialReasons.OPERATION_NOT_ALLOWED) {
        expect.fail('Should not fail Rule 3 (Operation Authorization)');
      }
    });
    
    it('should validate each operation independently', async () => {
      const config = createTestConfig({
        permissions: {
          allowed: [
            { path: testProjectsDir, operations: ['read'] },
          ],
          denied: [],
        },
      });
      const filePath = path.join(testProjectsDir, 'file.txt');
      
      const readResult = await checkPermission(config, filePath, 'read');
      const writeResult = await checkPermission(config, filePath, 'write');
      const listResult = await checkPermission(config, testProjectsDir, 'list');
      
      // read should pass Rule 3, others should fail at Rule 3
      expect(writeResult.allowed).toBe(false);
      expect(writeResult.allowed === false && writeResult.reason).toBe(DenialReasons.OPERATION_NOT_ALLOWED);
      expect(listResult.allowed).toBe(false);
      expect(listResult.allowed === false && listResult.reason).toBe(DenialReasons.OPERATION_NOT_ALLOWED);
    });
  });
  
  describe('RULE 4: File Size Limit', () => {
    it('should deny files larger than maxFileSizeBytes', async () => {
      const config = createTestConfig({
        security: {
          maxFileSizeBytes: 100, // Very small limit
          allowedExtensions: ['.txt'],
          logAllAccess: false,
          logPath: '',
        },
      });
      
      // Create a test file larger than 100 bytes
      const testFile = path.join(testProjectsDir, 'large-file.txt');
      const testContent = 'a'.repeat(200); // 200 bytes
      
      try {
        await fs.mkdir(testProjectsDir, { recursive: true });
        await fs.writeFile(testFile, testContent);
        
        const result = await checkPermission(config, testFile, 'read');
        
        expect(result.allowed).toBe(false);
        expect(result.allowed === false && result.reason).toBe(DenialReasons.FILE_TOO_LARGE);
      } finally {
        await fs.unlink(testFile).catch(() => {});
      }
    });
    
    it('should allow files within size limit', async () => {
      const config = createTestConfig({
        security: {
          maxFileSizeBytes: 1000,
          allowedExtensions: ['.txt'],
          logAllAccess: false,
          logPath: '',
        },
      });
      
      const testFile = path.join(testProjectsDir, 'small-file.txt');
      const testContent = 'small content';
      
      try {
        await fs.mkdir(testProjectsDir, { recursive: true });
        await fs.writeFile(testFile, testContent);
        
        const result = await checkPermission(config, testFile, 'read');
        
        // Should pass Rule 4
        if (!result.allowed && result.reason === DenialReasons.FILE_TOO_LARGE) {
          expect.fail('Should not fail Rule 4 (File Size)');
        }
      } finally {
        await fs.unlink(testFile).catch(() => {});
      }
    });
    
    it('should not apply Rule 4 to list operations', async () => {
      const config = createTestConfig({
        security: {
          maxFileSizeBytes: 0, // Zero limit
          allowedExtensions: [],
          logAllAccess: false,
          logPath: '',
        },
      });
      
      const result = await checkPermission(config, testProjectsDir, 'list');
      
      // Should not fail due to file size (Rule 4 doesn't apply to list)
      if (!result.allowed && result.reason === DenialReasons.FILE_TOO_LARGE) {
        expect.fail('Rule 4 should not apply to list operations');
      }
    });
    
    it('should not apply Rule 4 to search operations', async () => {
      const config = createTestConfig({
        security: {
          maxFileSizeBytes: 0,
          allowedExtensions: [],
          logAllAccess: false,
          logPath: '',
        },
      });
      
      const result = await checkPermission(config, testProjectsDir, 'search');
      
      if (!result.allowed && result.reason === DenialReasons.FILE_TOO_LARGE) {
        expect.fail('Rule 4 should not apply to search operations');
      }
    });
    
    it('should handle write to non-existent file (creation)', async () => {
      const config = createTestConfig();
      const newFile = path.join(testProjectsDir, 'new-file-' + Date.now() + '.txt');
      
      const result = await checkPermission(config, newFile, 'write');
      
      // Should not fail Rule 4 for non-existent file
      if (!result.allowed && result.reason === DenialReasons.FILE_TOO_LARGE) {
        expect.fail('Rule 4 should not apply to non-existent files on write');
      }
    });
  });
  
  describe('RULE 5: Extension Check', () => {
    it('should deny files with disallowed extensions', async () => {
      const config = createTestConfig({
        security: {
          maxFileSizeBytes: 10000000,
          allowedExtensions: ['.txt', '.md'],
          logAllAccess: false,
          logPath: '',
        },
      });
      const filePath = path.join(testProjectsDir, 'script.exe');
      
      const result = await checkPermission(config, filePath, 'read');
      
      expect(result.allowed).toBe(false);
      expect(result.allowed === false && result.reason).toBe(DenialReasons.EXTENSION_NOT_ALLOWED);
    });
    
    it('should allow files with allowed extensions', async () => {
      const config = createTestConfig({
        security: {
          maxFileSizeBytes: 10000000,
          allowedExtensions: ['.txt', '.txt'],
          logAllAccess: false,
          logPath: '',
        },
      });
      const filePath = path.join(testProjectsDir, 'file.txt');
      
      const result = await checkPermission(config, filePath, 'read');
      
      // Should pass Rule 5
      if (!result.allowed && result.reason === DenialReasons.EXTENSION_NOT_ALLOWED) {
        expect.fail('Should not fail Rule 5 (Extension Check)');
      }
    });
    
    it('should be case-insensitive for extensions', async () => {
      const config = createTestConfig({
        security: {
          maxFileSizeBytes: 10000000,
          allowedExtensions: ['.txt'],
          logAllAccess: false,
          logPath: '',
        },
      });
      const filePathUpper = path.join(testProjectsDir, 'file.TXT');
      const filePathMixed = path.join(testProjectsDir, 'file.TxT');
      
      const resultUpper = await checkPermission(config, filePathUpper, 'read');
      const resultMixed = await checkPermission(config, filePathMixed, 'read');
      
      // Both should pass Rule 5
      if (!resultUpper.allowed && resultUpper.reason === DenialReasons.EXTENSION_NOT_ALLOWED) {
        expect.fail('Extension check should be case-insensitive');
      }
      if (!resultMixed.allowed && resultMixed.reason === DenialReasons.EXTENSION_NOT_ALLOWED) {
        expect.fail('Extension check should be case-insensitive');
      }
    });
    
    it('should allow files without extensions', async () => {
      const config = createTestConfig({
        security: {
          maxFileSizeBytes: 10000000,
          allowedExtensions: ['.txt'],
          logAllAccess: false,
          logPath: '',
        },
      });
      const filePath = path.join(testProjectsDir, 'Makefile');
      
      const result = await checkPermission(config, filePath, 'read');
      
      // Should pass Rule 5 (no extension = allowed)
      if (!result.allowed && result.reason === DenialReasons.EXTENSION_NOT_ALLOWED) {
        expect.fail('Files without extensions should be allowed');
      }
    });
    
    it('should not apply Rule 5 to list operations', async () => {
      const config = createTestConfig({
        security: {
          maxFileSizeBytes: 10000000,
          allowedExtensions: [], // Empty list
          logAllAccess: false,
          logPath: '',
        },
      });
      
      const result = await checkPermission(config, testProjectsDir, 'list');
      
      if (!result.allowed && result.reason === DenialReasons.EXTENSION_NOT_ALLOWED) {
        expect.fail('Rule 5 should not apply to list operations');
      }
    });
    
    it('should not apply Rule 5 to search operations', async () => {
      const config = createTestConfig({
        security: {
          maxFileSizeBytes: 10000000,
          allowedExtensions: [],
          logAllAccess: false,
          logPath: '',
        },
      });
      
      const result = await checkPermission(config, testProjectsDir, 'search');
      
      if (!result.allowed && result.reason === DenialReasons.EXTENSION_NOT_ALLOWED) {
        expect.fail('Rule 5 should not apply to search operations');
      }
    });
  });
  
  describe('RULE 6: Grant Permission', () => {
    it('should allow when all rules pass', async () => {
      const config = createTestConfig({
        permissions: {
          allowed: [
            { path: testProjectsDir, operations: ['read', 'write', 'list', 'search'] },
          ],
          denied: [],
        },
        security: {
          maxFileSizeBytes: 10000000,
          allowedExtensions: ['.txt', '.js', '.ts', '.md'],
          logAllAccess: false,
          logPath: '',
        },
      });
      const filePath = path.join(testProjectsDir, 'valid-file.txt');
      
      try {
        await fs.mkdir(testProjectsDir, { recursive: true });
        await fs.writeFile(filePath, 'test content');
        
        const result = await checkPermission(config, filePath, 'read');
        
        expect(result.allowed).toBe(true);
      } finally {
        await fs.unlink(filePath).catch(() => {});
      }
    });
  });
  
  describe('checkPermissionSync', () => {
    it('should work without filesystem operations', () => {
      const config = createTestConfig();
      const filePath = path.join(testProjectsDir, 'any-file.txt');
      
      const result = checkPermissionSync(config, filePath, 'read');
      
      // Should complete without throwing
      expect(typeof result.allowed).toBe('boolean');
    });
    
    it('should apply Rules 1, 2, 3, and 5 (skip Rule 4)', () => {
      const config = createTestConfig({
        security: {
          maxFileSizeBytes: 0, // Would fail Rule 4 if checked
          allowedExtensions: ['.txt'],
          logAllAccess: false,
          logPath: '',
        },
      });
      const filePath = path.join(testProjectsDir, 'file.txt');
      
      const result = checkPermissionSync(config, filePath, 'read');
      
      // Should pass because Rule 4 is skipped in sync version
      expect(result.allowed).toBe(true);
    });
    
    it('should deny based on extension in sync mode', () => {
      const config = createTestConfig({
        security: {
          maxFileSizeBytes: 10000000,
          allowedExtensions: ['.txt'],
          logAllAccess: false,
          logPath: '',
        },
      });
      const filePath = path.join(testProjectsDir, 'file.exe');
      
      const result = checkPermissionSync(config, filePath, 'read');
      
      expect(result.allowed).toBe(false);
      expect(result.allowed === false && result.reason).toBe(DenialReasons.EXTENSION_NOT_ALLOWED);
    });
  });
  
  describe('Edge Cases and Error Handling', () => {
    it('should handle empty allowed list', async () => {
      const config = createTestConfig({
        permissions: {
          allowed: [],
          denied: [],
        },
      });
      const filePath = path.join(testProjectsDir, 'file.txt');
      
      const result = await checkPermission(config, filePath, 'read');
      
      expect(result.allowed).toBe(false);
      expect(result.allowed === false && result.reason).toBe(DenialReasons.PATH_NOT_ALLOWED);
    });
    
    it('should handle config with multiple allowed entries', async () => {
      const secondDir = path.join(homeDir, 'other-projects');
      const config = createTestConfig({
        permissions: {
          allowed: [
            { path: testProjectsDir, operations: ['read'] },
            { path: secondDir, operations: ['write'] },
          ],
          denied: [],
        },
      });
      
      const result1 = await checkPermission(config, path.join(testProjectsDir, 'file.txt'), 'read');
      const result2 = await checkPermission(config, path.join(secondDir, 'file.txt'), 'write');
      
      // Both should pass their respective rules
      if (!result1.allowed && result1.reason === DenialReasons.OPERATION_NOT_ALLOWED) {
        expect.fail('First path should allow read');
      }
      if (!result2.allowed && result2.reason === DenialReasons.OPERATION_NOT_ALLOWED) {
        expect.fail('Second path should allow write');
      }
    });
    
    it('should treat config as readonly', async () => {
      const config = createTestConfig();
      const originalAllowedLength = config.permissions.allowed.length;
      
      await checkPermission(config, path.join(testProjectsDir, 'file.txt'), 'read');
      
      expect(config.permissions.allowed.length).toBe(originalAllowedLength);
    });
  });
});
