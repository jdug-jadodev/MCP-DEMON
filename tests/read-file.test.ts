import { it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import readFileTool from '../src/tools/read-file';

it('readFileTool reads a file', async () => {
  const tmpDir = path.join(__dirname, 'fixtures');
  await fs.mkdir(tmpDir, { recursive: true });
  const f = path.join(tmpDir, 'test.txt');
  await fs.writeFile(f, 'hello-vitest', 'utf8');
  const res = await readFileTool({ path: f });
  expect(res.content).toBe('hello-vitest');
});
