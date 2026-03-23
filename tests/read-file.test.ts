import { it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import readFileTool from '../src/tools/read-file';
import type { Config } from '../src/permissions/config-loader';

it('readFileTool reads a file', async () => {
  const tmpDir = path.join(__dirname, 'fixtures');
  await fs.mkdir(tmpDir, { recursive: true });
  const f = path.join(tmpDir, 'test.txt');
  await fs.writeFile(f, 'hello-vitest', 'utf8');
  
  // Create a config that allows reading from the test fixtures directory
  const config: Config = {
    version: '1.0',
    permissions: {
      allowed: [
        { path: tmpDir, operations: ['read', 'write', 'list'] },
      ],
      denied: [],
    },
    security: {
      maxFileSizeBytes: 10000000,
      allowedExtensions: ['.txt', '.js', '.ts', '.json', '.md'],
      logAllAccess: false,
      logPath: '',
    },
  };
  
  const res = await readFileTool({ path: f }, config);
  expect(res.content).toBe('hello-vitest');
});
