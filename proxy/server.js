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

// Configuración - estos headers se agregan a TODAS las requests
const EAM_HEADERS = {
  tenant: process.env.EAM_TENANT || '',
  organization: process.env.EAM_ORG || '',
  apiversion: 'v1',
  'X-API-Key': process.env.EAM_API_KEY || '',
};

// Middleware para agregar headers de autenticación
const authHeadersMiddleware = (req, res, next) => {
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
      // Asegurar que los headers estén en la request proxy
      Object.keys(EAM_HEADERS).forEach((key) => {
        if (EAM_HEADERS[key]) {
          proxyReq.setHeader(key, EAM_HEADERS[key]);
        }
      });
    },
    error: (err, req, res) => {
      console.error('Proxy error:', err.message);
      res.status(500).json({ error: 'Proxy error', message: err.message });
    },
  },
});

// Rutas
app.use('/eam', authHeadersMiddleware, eamProxy);

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
