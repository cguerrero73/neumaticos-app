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
  console.log('\n📥 INCOMING REQUEST');
  console.log('  Method:', req.method);
  console.log('  URL:', req.url);
  console.log('  Path:', req.path);

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
      // Log de request saliente
      console.log('\n📤 OUTGOING REQUEST');
      console.log('  Target:', proxyReq.path);
      console.log('  Method:', proxyReq.method);

      // Si hay body, loguearlo (solo primero 500 chars)
      if (req.body) {
        const bodyStr = JSON.stringify(req.body);
        console.log('  Body:', bodyStr.substring(0, 500) + (bodyStr.length > 500 ? '...' : ''));
      }

      // Asegurar que los headers estén en la request proxy
      Object.keys(EAM_HEADERS).forEach((key) => {
        if (EAM_HEADERS[key]) {
          proxyReq.setHeader(key, EAM_HEADERS[key]);
        }
      });
    },
    proxyRes: (proxyRes, req, res) => {
      // Forzar que el response no se cachee
      proxyRes.headers['cache-control'] = 'no-cache, no-store, must-revalidate';
      proxyRes.headers['pragma'] = 'no-cache';
      proxyRes.headers['expires'] = '0';

      console.log('\n📥 RESPONSE');
      console.log('  Status:', proxyRes.statusCode);
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
