import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'public');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };

createServer(async (req, res) => {
  const requested = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const path = normalize(join(root, requested));
  if (!path.startsWith(root)) { res.writeHead(403); return res.end('Forbidden'); }
  try {
    const body = await readFile(path);
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'text/plain' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
}).listen(4173, () => console.log('Ngekost Jogja running at http://localhost:4173'));

