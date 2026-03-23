import type { Config } from '../permissions/config-loader.js';

export default async function getPermissionsTool(_input: unknown, config: Config) {
  return {
    version: config.version,
    permissions: {
      allowed: config.permissions.allowed.map(entry => ({
        path: entry.path,
        operations: entry.operations,
      })),
      denied: config.permissions.denied,
    },
    security: {
      maxFileSizeBytes: config.security.maxFileSizeBytes,
      allowedExtensions: config.security.allowedExtensions,
    },
  };
}
