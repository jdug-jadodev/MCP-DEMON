import path from 'path';
import writeFileTool from '../src/tools/write-file';
import readFileTool from '../src/tools/read-file';

async function main() {
  const f = path.join(__dirname, 'tmp', 'prueba.txt');
  await writeFileTool({ path: f, content: 'hola desde prueba' });
  const res = await readFileTool({ path: f });
  console.log('leído:', res.content);
}

main().catch((e) => { console.error(e); process.exit(1); });