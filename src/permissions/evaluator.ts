import * as path from 'path';
import { promises as fs } from 'fs';
import type { Config } from './config-loader.js';
import { resolvePath, isPathSafe } from './path-resolver.js';

/**
 * Supported filesystem operations
 */
export type Operation = 'read' | 'write' | 'list' | 'search';

/**
 * Result of permission evaluation
 * Either allowed or denied with a specific reason
 */
export type PermissionResult =
  | { allowed: true }
  | { allowed: false; reason: string };

/**
 * Reasons for permission denial
 */
export const DenialReasons = {
  DENIED_PATH: 'denied_path',
  PATH_NOT_ALLOWED: 'path_not_allowed',
  OPERATION_NOT_ALLOWED: 'operation_not_allowed',
  FILE_TOO_LARGE: 'file_too_large',
  EXTENSION_NOT_ALLOWED: 'extension_not_allowed',
  PATH_TRAVERSAL_DETECTED: 'path_traversal_detected',
  CONFIG_ERROR: 'config_error',
} as const;

/**
 * Main permission evaluation function.
 * Applies 6 rules in strict order to determine if an operation is allowed.
 * 
 * Rule Order (stops at first denial):
 * 1. Explicit Denial: Check if path is in denied list
 * 2. Path Authorization: Check if path is under an allowed entry
 * 3. Operation Authorization: Check if operation is in the allowed list
 * 4. File Size Limit: Check if file size is within limits (read/write only)
 * 5. Extension Check: Check if file extension is allowed (read/write only)
 * 6. Grant: If all checks pass, allow the operation
 * 
 * @param config - The validated configuration object (treated as readonly)
 * @param requestedPath - The filesystem path being requested
 * @param operation - The operation being performed
 * @returns PermissionResult indicating allowed or denied with reason
 */
export async function checkPermission(
  config: Readonly<Config>,
  requestedPath: string,
  operation: Operation
): Promise<PermissionResult> {
  try {
    // Resolve the requested path to its canonical absolute form
    const resolvedPath = resolvePath(requestedPath);
    
    // RULE 1: Explicit Denial Trumps All
    // If the path is in the denied list, deny immediately
    for (const deniedPath of config.permissions.denied) {
      const resolvedDenied = resolvePath(deniedPath);
      const deniedWithSep = resolvedDenied.endsWith(path.sep) 
        ? resolvedDenied 
        : resolvedDenied + path.sep;
      
      if (resolvedPath === resolvedDenied || resolvedPath.startsWith(deniedWithSep)) {
        return { allowed: false, reason: DenialReasons.DENIED_PATH };
      }
    }
    
    // RULE 2: Path Must Be Under an Allowed Entry
    // Find which allowed entry (if any) contains this path
    let matchingEntry = null;
    
    for (const entry of config.permissions.allowed) {
      const resolvedBase = resolvePath(entry.path);
      
      if (isPathSafe(resolvedPath, resolvedBase)) {
        matchingEntry = entry;
        break;
      }
    }
    
    if (!matchingEntry) {
      return { allowed: false, reason: DenialReasons.PATH_NOT_ALLOWED };
    }
    
    // RULE 3: Operation Must Be in Allowed List
    if (!matchingEntry.operations.includes(operation)) {
      return { allowed: false, reason: DenialReasons.OPERATION_NOT_ALLOWED };
    }
    
    // RULES 4 & 5: File Size and Extension (only apply to read/write operations)
    if (operation === 'read' || operation === 'write') {
      // RULE 4: File Size Limit
      // Only check if file exists (for write, file may not exist yet)
      try {
        const stats = await fs.stat(resolvedPath);
        
        if (stats.isFile() && stats.size > config.security.maxFileSizeBytes) {
          return { allowed: false, reason: DenialReasons.FILE_TOO_LARGE };
        }
      } catch (error) {
        // File doesn't exist - this is OK for write operations (creating new file)
        // For read operations, let the actual file operation handle the ENOENT error
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          // Log other stat errors but don't deny (could be permission issue with stat itself)
          console.error(`Warning: Could not stat file ${resolvedPath}:`, error);
        }
      }
      
      // RULE 5: Extension Check
      const ext = path.extname(resolvedPath).toLowerCase();
      
      // If file has an extension, it must be in the allowed list
      if (ext) {
        const allowedExtensions = config.security.allowedExtensions.map(e => e.toLowerCase());
        
        if (!allowedExtensions.includes(ext)) {
          return { allowed: false, reason: DenialReasons.EXTENSION_NOT_ALLOWED };
        }
      }
      // If no extension, we allow it (e.g., Makefile, README)
    }
    
    // RULE 6: Grant Permission
    // All checks passed
    return { allowed: true };
    
  } catch (error) {
    // Catch any unexpected errors and deny with config_error
    console.error('Error during permission evaluation:', error);
    return { allowed: false, reason: DenialReasons.CONFIG_ERROR };
  }
}

/**
 * Checks if a path would be allowed under the given configuration without
 * performing filesystem operations (no stat check).
 * Useful for pre-validation or dry-run scenarios.
 * 
 * @param config - The validated configuration object
 * @param requestedPath - The filesystem path being requested
 * @param operation - The operation being performed
 * @returns PermissionResult indicating allowed or denied with reason
 */
export function checkPermissionSync(
  config: Readonly<Config>,
  requestedPath: string,
  operation: Operation
): PermissionResult {
  try {
    const resolvedPath = resolvePath(requestedPath);
    
    // RULE 1: Explicit Denial
    for (const deniedPath of config.permissions.denied) {
      const resolvedDenied = resolvePath(deniedPath);
      const deniedWithSep = resolvedDenied.endsWith(path.sep) 
        ? resolvedDenied 
        : resolvedDenied + path.sep;
      
      if (resolvedPath === resolvedDenied || resolvedPath.startsWith(deniedWithSep)) {
        return { allowed: false, reason: DenialReasons.DENIED_PATH };
      }
    }
    
    // RULE 2: Path Authorization
    let matchingEntry = null;
    
    for (const entry of config.permissions.allowed) {
      const resolvedBase = resolvePath(entry.path);
      
      if (isPathSafe(resolvedPath, resolvedBase)) {
        matchingEntry = entry;
        break;
      }
    }
    
    if (!matchingEntry) {
      return { allowed: false, reason: DenialReasons.PATH_NOT_ALLOWED };
    }
    
    // RULE 3: Operation Authorization
    if (!matchingEntry.operations.includes(operation)) {
      return { allowed: false, reason: DenialReasons.OPERATION_NOT_ALLOWED };
    }
    
    // RULE 5: Extension Check (skip Rule 4 since we don't stat)
    if (operation === 'read' || operation === 'write') {
      const ext = path.extname(resolvedPath).toLowerCase();
      
      if (ext) {
        const allowedExtensions = config.security.allowedExtensions.map(e => e.toLowerCase());
        
        if (!allowedExtensions.includes(ext)) {
          return { allowed: false, reason: DenialReasons.EXTENSION_NOT_ALLOWED };
        }
      }
    }
    
    return { allowed: true };
    
  } catch (error) {
    console.error('Error during synchronous permission evaluation:', error);
    return { allowed: false, reason: DenialReasons.CONFIG_ERROR };
  }
}
