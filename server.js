// Piccolo server statico locale per testare i progetti del repo (Presidente Serie A,
// Quizzotti) senza doverli pubblicare. Uso: node server.js, poi apri
// http://localhost:8099/carriera-serie-a/ o http://localhost:8099/quizzotti/
const http = require('http');
const fs = require('fs');
const path = require('path');
const port = process.env.PORT || 8099;
const root = __dirname;
const types = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain',
};

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(root, p);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(port, () => console.log('Server locale in ascolto su http://localhost:' + port));
