/**
 * EAM Proxy Server
 *
 * Este proxy reenvía requests al servidor Hexagon EAM.
 * Del lado servidor no hay CORS, así que funciona sin problemas.
 *
 * Uso: node proxy/server.js
 */

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Sin body parsing - el proxy lo maneja directo

// Configuración - estos headers se agregan a TODAS las requests
const EAM_HEADERS = {
  tenant: process.env.EAM_TENANT || '',
  organization: process.env.EAM_ORG || '',
  apiversion: 'v1',
  'X-API-Key': process.env.EAM_API_KEY || '',
};

// Middleware para agregar headers de autenticación (sin body parsing)
const authHeadersMiddleware = (req, res, next) => {
  // Log de request entrante
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📥 INCOMING REQUEST');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Method:', req.method);
  console.log('  URL:', req.url);
  console.log('  Path:', req.path);
  console.log('  Query:', JSON.stringify(req.query, null, 2));

  // Log headers relevantes (sin API key completo)
  console.log('\n  Headers:');
  console.log('    accept:', req.headers.accept);
  console.log('    content-type:', req.headers['content-type']);
  console.log('    tenant:', req.headers.tenant);
  console.log('    organization:', req.headers.organization);
  console.log('    apiversion:', req.headers.apiversion);
  console.log(
    '    x-api-key:',
    req.headers['x-api-key'] ? req.headers['x-api-key'].substring(0, 10) + '...' : 'NOT SET',
  );

  // Agregar headers de EAM a la request
  Object.keys(EAM_HEADERS).forEach((key) => {
    if (EAM_HEADERS[key]) {
      req.headers[key.toLowerCase()] = EAM_HEADERS[key];
    }
  });
  next();
};

// Proxy middleware para EAM
const eamProxy = createProxyMiddleware({
  target: process.env.EAM_BASE_URL || 'https://us1.eam.hxgnsmartcloud.com/axis/restservices',
  changeOrigin: true,
  pathRewrite: {
    '^/eam': '', // Remove /eam prefix when forwarding
  },
  on: {
    proxyReq: (proxyReq, req, res) => {
      // Log de request saliente al EAM
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('📤 OUTGOING REQUEST TO EAM');
      console.log('═══════════════════════════════════════════════════════');
      console.log('  Target URL:', proxyReq.path);
      console.log('  Method:', proxyReq.method);

      // Log headers que se envían al EAM
      console.log('\n  Headers sent to EAM:');
      console.log('    tenant:', proxyReq.getHeader('tenant') || 'NOT SET');
      console.log('    organization:', proxyReq.getHeader('organization') || 'NOT SET');
      console.log('    apiversion:', proxyReq.getHeader('apiversion') || 'NOT SET');
      const apiKey = proxyReq.getHeader('x-api-key');
      console.log('    x-api-key:', apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET');
      console.log('    content-type:', proxyReq.getHeader('content-type'));

      // Si hay body, loguearlo completo
      if (req.body) {
        console.log('\n  Body (full):');
        const bodyStr = JSON.stringify(req.body, null, 2);
        console.log('  ' + bodyStr.split('\n').join('\n  '));
      } else {
        console.log('\n  Body: none');
      }
    },
    proxyRes: (proxyRes, req, res) => {
      // Forzar que el response no se cachee
      proxyRes.headers['cache-control'] = 'no-cache, no-store, must-revalidate';
      proxyRes.headers['pragma'] = 'no-cache';
      proxyRes.headers['expires'] = '0';

      // Acumular response para hacer summary
      let responseBody = '';
      proxyRes.on('data', (chunk) => {
        responseBody += chunk.toString();
      });

      proxyRes.on('end', () => {
        console.log('\n═══════════════════════════════════════════════════════');
        console.log('📥 RESPONSE FROM EAM');
        console.log('═══════════════════════════════════════════════════════');
        console.log('  Status:', proxyRes.statusCode);
        console.log('\n  Response headers:');
        console.log('    content-type:', proxyRes.headers['content-type']);
        console.log('    content-length:', proxyRes.headers['content-length']);

        // Resumen del body
        if (responseBody) {
          console.log('\n  Body (first 1000 chars):');
          const truncated =
            responseBody.length > 1000
              ? responseBody.substring(0, 1000) + '\n  ... (truncated)'
              : responseBody;
          console.log('  ' + truncated.split('\n').join('\n  '));
        } else {
          console.log('\n  Body: empty');
        }

        // Parse y mostrar estructura
        try {
          const json = JSON.parse(responseBody);
          console.log('\n  Body structure:');
          if (Array.isArray(json)) {
            console.log('    Type: Array');
            console.log('    Length:', json.length);
            if (json.length > 0) {
              console.log('    First item keys:', Object.keys(json[0]).join(', '));
            }
          } else if (typeof json === 'object' && json !== null) {
            console.log('    Type: Object');
            console.log('    Keys:', Object.keys(json).join(', '));
            // MostrarGRID structure si existe
            if (json.GRID) {
              console.log('    GRID structure:');
              console.log('      ROWCOUNT:', json.GRID.ROWCOUNT);
              console.log(
                '      HEADER keys:',
                json.GRID.HEADER ? Object.keys(json.GRID.HEADER).join(', ') : 'none',
              );
              console.log(
                '      DATA keys:',
                json.GRID.DATA ? Object.keys(json.GRID.DATA).join(', ') : 'none',
              );
            }
            if (json.Result?.ResultData?.GRID) {
              console.log('    Result.ResultData.GRID exists');
            }
          } else {
            console.log('    Type:', typeof json);
          }
        } catch {
          console.log('\n  Body is not JSON (plain text)');
        }
        console.log('\n═══════════════════════════════════════════════════════\n');
      });
    },
    error: (err, req, res) => {
      console.error('\n❌ Proxy error:', err.message);
      res.status(500).json({ error: 'Proxy error', message: err.message });
    },
  },
});

// Rutas
app.use('/eam', authHeadersMiddleware, eamProxy);
// app.use('/eam/griddata', authHeadersMiddleware, eamProxy);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', target: process.env.EAM_BASE_URL });
});

// Configuración (para debugging)
app.get('/config', (req, res) => {
  res.json({
    target: process.env.EAM_BASE_URL || 'https://us1.eam.hxgnsmartcloud.com/axis/restservices',
    hasApiKey: !!process.env.EAM_API_KEY,
    hasTenant: !!process.env.EAM_TENANT,
    hasOrg: !!EAM_ORG,
  });
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    EAM Proxy Server                          ║
╠═══════════════════════════════════════════════════════════════╣
║  URL:       http://localhost:${PORT}                             ║
║  Target:   ${(process.env.EAM_BASE_URL || 'https://...').substring(0, 50).padEnd(50)}║
╠═══════════════════════════════════════════════════════════════╣
║  Uso desde Angular:                                          ║
║  fetch('/eam/assets') → reenvía a EAM                          ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});
