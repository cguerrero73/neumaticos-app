# EAM Proxy Server

Este proxy reenvía requests al servidor Hexagon EAM, evitando problemas de CORS.

## Uso

### 1. Instalar dependencias

```bash
cd proxy
npm install
```

### 2. Configurar variables de entorno (opcional)

```bash
# Linux/Mac
export EAM_BASE_URL="https://us1.eam.hxgnsmartcloud.com/axis/restservices"
export EAM_API_KEY="tu-api-key"
export EAM_TENANT="tu-tenant"
export EAM_ORG="tu-organizacion"

# Windows (CMD)
set EAM_BASE_URL=https://...
set EAM_API_KEY=tu-api-key
set EAM_TENANT=tu-tenant
set EAM_ORG=tu-organizacion
```

### 3. Iniciar el proxy

```bash
cd proxy
npm start
```

### 4. En Angular, usar las rutas con /eam

```
http://localhost:3000/eam/assets
```

## Flujo

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Angular    │ ───► │  EAM Proxy   │ ───► │  Hexagon    │
│  (localhost) │      │  (localhost) │      │  EAM Server │
└──────────────┘      └──────────────┘      └──────────────┘
```

## Endpoints proxyados

- `/eam/assets` → `/assets`
- `/eam/assets/{id}` → `/assets/{id}`
- etc.

## Scripts disponibles

```bash
npm start          # Iniciar proxy
npm run dev         # Con nodemon (reinicio automático)
```

## Puerto

Por defecto usa puerto 3001. Para cambiar:

```bash
PORT=3002 npm start
```
