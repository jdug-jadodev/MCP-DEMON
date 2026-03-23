import * as os from 'os';
import * as path from 'path';

/**
 * Expands ~ to the user's home directory.
 * Works on Windows (%USERPROFILE%) and Unix (~).
 * 
 * @param p - Path potentially containing ~
 * @returns Path with ~ expanded to home directory
 * 
 * @example
 * expandHome('~/projects') // '/home/user/projects'
 * expandHome('~/.ssh') // '/home/user/.ssh'
 */
export function expandHome(p: string): string {
  if (!p) return p;
  
  // Replace leading ~ or ~/ or ~\
  if (p === '~' || p.startsWith('~/') || p.startsWith('~\\')) {
    return path.join(os.homedir(), p.slice(1));
  }
  
  return p;
}

/**
 * Resolves a path to its absolute canonical form.
 * Applies expandHome first, then path.resolve().
 * 
 * @param p - Path to resolve
 * @returns Absolute canonical path
 * 
 * @example
 * resolvePath('~/projects') // '/home/user/projects'
 * resolvePath('../file.txt') // '/absolute/path/to/file.txt'
 */
export function resolvePath(p: string): string {
  const expanded = expandHome(p);
  return path.resolve(expanded);
}

/**
 * Validates that a requested path is safely contained within an allowed base path.
 * Protects against path traversal attacks using ../ or ..\
 * 
 * @param requestedPath - The path being requested (may be relative or contain ..)
 * @param allowedBase - The base path that requestedPath must be under
 * @returns true if requestedPath is safely within allowedBase, false otherwise
 * 
 * @example
 * isPathSafe('/home/user/projects/file.txt', '/home/user/projects') // true
 * isPathSafe('/home/user/projects/../.ssh/id_rsa', '/home/user/projects') // false
 * isPathSafe('../../../etc/passwd', '/home/user/projects') // false
 */
export function isPathSafe(requestedPath: string, allowedBase: string): boolean {
  // Resolve both paths to their canonical absolute forms
  const resolvedRequested = resolvePath(requestedPath);
  const resolvedBase = resolvePath(allowedBase);
  
  // Ensure the base path ends with a separator for accurate prefix matching
  // This prevents /home/user/projects from matching /home/user/projects-evil
  const baseWithSep = resolvedBase.endsWith(path.sep) 
    ? resolvedBase 
    : resolvedBase + path.sep;
  
  // Check if requested path starts with the base path
  // OR is exactly equal to the base path (allowing access to the directory itself)
  return resolvedRequested === resolvedBase || resolvedRequested.startsWith(baseWithSep);
}
