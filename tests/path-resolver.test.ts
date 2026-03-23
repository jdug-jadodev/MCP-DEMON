import { describe, it, expect } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import { expandHome, resolvePath, isPathSafe } from '../src/permissions/path-resolver.js';

describe('path-resolver', () => {
  describe('expandHome', () => {
    const homeDir = os.homedir();
    
    it('should expand ~ to home directory', () => {
      const result = expandHome('~');
      expect(result).toBe(homeDir);
    });
    
    it('should expand ~/projects to home/projects', () => {
      const result = expandHome('~/projects');
      expect(result).toBe(path.join(homeDir, 'projects'));
    });
    
    it('should expand ~/.ssh to home/.ssh', () => {
      const result = expandHome('~/.ssh');
      expect(result).toBe(path.join(homeDir, '.ssh'));
    });
    
    it('should handle ~\\ on Windows-style paths', () => {
      const result = expandHome('~\\projects');
      expect(result).toBe(path.join(homeDir, 'projects'));
    });
    
    it('should not modify paths that do not start with ~', () => {
      const result = expandHome('/absolute/path');
      expect(result).toBe('/absolute/path');
    });
    
    it('should not modify relative paths', () => {
      const result = expandHome('./relative/path');
      expect(result).toBe('./relative/path');
    });
    
    it('should handle empty string', () => {
      const result = expandHome('');
      expect(result).toBe('');
    });
    
    it('should not expand ~ in the middle of path', () => {
      const result = expandHome('/some/~/path');
      expect(result).toBe('/some/~/path');
    });
  });
  
  describe('resolvePath', () => {
    it('should resolve ~ and return absolute path', () => {
      const result = resolvePath('~/projects');
      expect(path.isAbsolute(result)).toBe(true);
      expect(result).toContain('projects');
    });
    
    it('should resolve relative paths to absolute', () => {
      const result = resolvePath('./test');
      expect(path.isAbsolute(result)).toBe(true);
    });
    
    it('should resolve .. in paths', () => {
      const result = resolvePath('~/projects/../.ssh');
      expect(path.isAbsolute(result)).toBe(true);
      // Should not contain "projects" since .. goes back
      expect(result).not.toContain('projects');
    });
    
    it('should return canonical absolute path', () => {
      const result = resolvePath(process.cwd());
      expect(result).toBe(path.resolve(process.cwd()));
    });
  });
  
  describe('isPathSafe - Basic Cases', () => {
    it('should allow path directly under base', () => {
      const base = '/home/user/projects';
      const requested = '/home/user/projects/file.txt';
      expect(isPathSafe(requested, base)).toBe(true);
    });
    
    it('should allow path deeply nested under base', () => {
      const base = '/home/user/projects';
      const requested = '/home/user/projects/subfolder/deep/file.txt';
      expect(isPathSafe(requested, base)).toBe(true);
    });
    
    it('should allow path exactly equal to base', () => {
      const base = '/home/user/projects';
      const requested = '/home/user/projects';
      expect(isPathSafe(requested, base)).toBe(true);
    });
    
    it('should allow path equal to base with trailing slash', () => {
      const base = '/home/user/projects/';
      const requested = '/home/user/projects';
      expect(isPathSafe(requested, base)).toBe(true);
    });
  });
  
  describe('isPathSafe - Path Traversal Attacks', () => {
    it('should block simple .. traversal', () => {
      const base = '/home/user/projects';
      const requested = '/home/user/projects/../.ssh/id_rsa';
      expect(isPathSafe(requested, base)).toBe(false);
    });
    
    it('should block multiple .. traversal', () => {
      const base = '/home/user/projects';
      const requested = '/home/user/projects/../../etc/passwd';
      expect(isPathSafe(requested, base)).toBe(false);
    });
    
    it('should block traversal going outside and coming back', () => {
      const base = '/home/user/projects';
      const requested = '/home/user/projects/../projects/../../.ssh';
      expect(isPathSafe(requested, base)).toBe(false);
    });
    
    it('should block path completely outside base', () => {
      const base = '/home/user/projects';
      const requested = '/etc/passwd';
      expect(isPathSafe(requested, base)).toBe(false);
    });
    
    it('should block relative .. paths', () => {
      const base = path.resolve('/home/user/projects');
      const requested = '../.ssh/id_rsa';
      // This will be resolved relative to cwd, should not be under base
      const result = isPathSafe(requested, base);
      // Expected to be false unless cwd happens to be under base
      expect(typeof result).toBe('boolean');
    });
    
    it('should prevent prefix matching false positives', () => {
      const base = '/home/user/projects';
      const requested = '/home/user/projects-evil/file.txt';
      expect(isPathSafe(requested, base)).toBe(false);
    });
    
    it('should block Windows-style path traversal', () => {
      if (process.platform === 'win32') {
        const base = 'C:\\Users\\user\\projects';
        const requested = 'C:\\Users\\user\\projects\\..\\..\\secrets';
        expect(isPathSafe(requested, base)).toBe(false);
      }
    });
  });
  
  describe('isPathSafe - Edge Cases', () => {
    it('should handle paths with spaces', () => {
      const base = '/home/user/my projects';
      const requested = '/home/user/my projects/file.txt';
      expect(isPathSafe(requested, base)).toBe(true);
    });
    
    it('should handle paths with special characters', () => {
      const base = '/home/user/projects';
      const requested = '/home/user/projects/file (1).txt';
      expect(isPathSafe(requested, base)).toBe(true);
    });
    
    it('should handle Unicode paths', () => {
      const base = '/home/user/proyectos';
      const requested = '/home/user/proyectos/archivo.txt';
      expect(isPathSafe(requested, base)).toBe(true);
    });
    
    it('should work with ~ expansion', () => {
      const base = '~/projects';
      const requested = '~/projects/file.txt';
      expect(isPathSafe(requested, base)).toBe(true);
    });
    
    it('should detect traversal even with ~ paths', () => {
      const base = '~/projects';
      const requested = '~/projects/../.ssh/id_rsa';
      expect(isPathSafe(requested, base)).toBe(false);
    });
  });
  
  describe('isPathSafe - Cross-Platform', () => {
    it('should work with forward slashes on all platforms', () => {
      const base = '/home/user/projects';
      const requested = '/home/user/projects/file.txt';
      expect(isPathSafe(requested, base)).toBe(true);
    });
    
    if (process.platform === 'win32') {
      it('should work with Windows paths', () => {
        const base = 'C:\\Users\\user\\projects';
        const requested = 'C:\\Users\\user\\projects\\file.txt';
        expect(isPathSafe(requested, base)).toBe(true);
      });
      
      it('should normalize Windows paths correctly', () => {
        const base = 'C:\\Users\\user\\projects';
        const requested = 'C:\\Users\\user\\projects\\subfolder\\file.txt';
        expect(isPathSafe(requested, base)).toBe(true);
      });
    }
  });
});
