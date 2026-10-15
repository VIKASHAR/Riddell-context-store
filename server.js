const http = require('http');
const fs = require('fs');
const path = require('path');

// ==============================================================================
// Load Confidential .env Configuration
// ==============================================================================
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      });
      console.log('🔒 Loaded confidential environment configuration from .env');
    } catch (err) {
      console.warn('⚠️ Could not parse .env file:', err.message);
    }
  } else {
    console.warn('⚠️ No .env file found. Using default process environment.');
  }
}

loadEnv();

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Route: GET /api/config — Provides client with public config while keeping API key private
  if (req.url === '/api/config' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      agentId: process.env.LYZR_AGENT_ID || '6ad09364bb3cc892445a6a34',
      userId: process.env.LYZR_USER_ID || 'avikash@kaartech.com',
      sessionId: process.env.LYZR_SESSION_ID || '6ad09364bb3cc892445a6a34-wmpp27k0',
      endpoint: process.env.LYZR_ENDPOINT || 'https://agent-prod.studio.lyzr.ai/v3/inference/chat/',
      hasServerApiKey: Boolean(process.env.LYZR_API_KEY)
    }));
    return;
  }

  // Route: POST /api/chat — Server-side secure inference proxy keeping API key confidential
  if ((req.url === '/api/chat' || req.url === '/api/chat-proxy') && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body || '{}');

        // Prefer client header/override if provided in UI settings, else use secret server-side .env key
        const apiKey = req.headers['x-api-key'] || parsed.apiKey || process.env.LYZR_API_KEY;
        const targetEndpoint = process.env.LYZR_ENDPOINT || 'https://agent-prod.studio.lyzr.ai/v3/inference/chat/';

        if (!apiKey) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No Lyzr API key configured in .env or request.' }));
          return;
        }

        const payload = {
          user_id: parsed.user_id || process.env.LYZR_USER_ID || 'avikash@kaartech.com',
          agent_id: parsed.agent_id || process.env.LYZR_AGENT_ID || '6ad09364bb3cc892445a6a34',
          session_id: parsed.session_id || process.env.LYZR_SESSION_ID || '6ad09364bb3cc892445a6a34-wmpp27k0',
          message: parsed.message || ''
        };

        const lyzrRes = await fetch(targetEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
          },
          body: JSON.stringify(payload)
        });

        const data = await lyzrRes.json();
        res.writeHead(lyzrRes.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } catch (err) {
        console.error('Proxy Error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Static file serving
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const filePath = path.join(PUBLIC_DIR, reqPath);

  // Security check: ensure path stays within PUBLIC_DIR
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Access Denied');
    return;
  }

  // Block direct web access to sensitive environment files
  const baseName = path.basename(filePath);
  if (baseName === '.env' || baseName.startsWith('.env.')) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Access Forbidden: Environment configuration files cannot be accessed over HTTP.');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🛡️  Riddell ERP SAP Knowledge Store Server Running`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🔒 API Key Protection: Enabled (Loaded from .env)`);
  console.log(`======================================================\n`);
});
