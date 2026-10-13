// 外部ライブラリなしで、アプリだけをローカル配信する。
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const file = new URL('../index.html', import.meta.url);
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname !== '/' && pathname !== '/index.html') {
    res.writeHead(404); res.end('Not found'); return;
  }
  try {
    const html = await readFile(file);
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(req.method === 'HEAD' ? undefined : html);
  } catch {
    res.writeHead(500); res.end('Cannot read index.html');
  }
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE'
    ? '8080番は使用中です。前に起動したサーバーをControl+Cで止めてください。'
    : error.message);
  process.exitCode = 1;
});
server.listen(8080, '127.0.0.1', () => {
  console.log('http://127.0.0.1:8080 をブラウザで開いてください。停止: Control+C');
});
