# Design: Vehicle Scan Integration

## Technical Approach

Implementar escaneo real de códigos de barras/QR usando `@capacitor-mlkit/barcode-scanning` con fallback a entrada manual. El flujo existente de `home.page.ts` ya maneja la carga del vehículo — solo necesitamos integrar el scanner y conectarlo a ese flujo.

## Architecture Decisions

### Decision: Barcode Scanning Plugin

**Choice**: `@capacitor-mlkit/barcode-scanning`
**Alternatives considered**:

- `@capacitor-community/barcode-scanner` — API menos mantenida, menos formatos soportados
- `phonegap-plugin-barcodescanner` — Phonegap legacy, no tiene soporte para QR moderno
  **Rationale**: ML Kit es el motor de Google, soporta QR, Barcode (EAN, UPC, Code128, etc.), y tiene mejor documentación. El proyecto ya usa Capacitor 8, así que ML Kit es compatible.

### Decision: Permission Handling

**Choice**: Solicitar permiso de cámara al activar el scanner, no al cargar la app
**Alternatives considered**:

- Solicitar al inicio — invasivo, el usuario quizás nunca use el scanner
- Solo fallback — no dar instrucciones claras
  **Rationale**: Mejor UX pedir permiso cuando el usuario explícitamente quiere escanear. Si denied, mostrar instrucciones claras de cómo habilitarla en settings.

### Decision: Page Structure

**Choice**: Integrar scanner en `home.page.ts` existente, no crear página separada
**Alternatives considered**:

- Nueva página `/scan` — más código, más navegación
- Modal overlay — más complejo de implementar
  **Rationale**: El `home.page.ts` ya tiene la sección scanner con `scanner-icon` y `manual-input`. El scanner real puede reemplazar o coexistir con `simulateScan()`. Mínimo cambio.

## Data Flow

```
User taps scanner icon
        │
        ▼
Request camera permission
        │
   ┌────┴────┐
   │ Denied? │───Yes──→ Show instructions + manual fallback
   └────┬────┘
        │ No
        ▼
Open camera / ML Kit barcode scanner
        │
   ┌────┴────┐
   │ Code    │───Yes──→ Call loadVehicleWithConfig(code)
   │ found?  │
   └────┬────┘
        │ No
        ▼
Show "No vehicle found" + retry option
```

## File Changes

| File                                               | Action     | Description                                                          |
| -------------------------------------------------- | ---------- | -------------------------------------------------------------------- |
| `src/app/core/services/barcode-scanner.service.ts` | **Create** | Wrapper service para ML Kit barcode scanning                         |
| `package.json`                                     | Modify     | Add `@capacitor-mlkit/barcode-scanning` dependency                   |
| `src/app/pages/home/home.page.ts`                  | Modify     | Replace `simulateScan()` con `startRealScan()` + permission handling |
| `src/app/pages/home/home.page.html`                | Modify     | Agregar botón de scan real junto al de simulación                    |

## Interfaces / Contracts

```typescript
// src/app/core/services/barcode-scanner.service.ts
export interface BarcodeScannerService {
  /**
   * Start continuous barcode/QR scanning
   * Returns a promise that resolves with the scanned code
   * Rejects if permission denied or camera unavailable
   */
  scan(): Promise<string>;

  /**
   * Check if scanning is available (camera + permissions)
   */
  isAvailable(): Promise<boolean>;
}
```

## Testing Strategy

| Layer       | What to Test                         | Approach                          |
| ----------- | ------------------------------------ | --------------------------------- |
| Unit        | BarcodeScannerService method returns | Mock ML Kit                       |
| Integration | Permission flow, error recovery      | Manual test on device             |
| E2E         | Full scan → vehicle load flow        | Playwright/Capacitor E2E (future) |

## Open Questions

- [ ] ¿El plugin ML Kit requiere configurar Google Play Services en Android? Verificar si el proyecto ya lo tiene.
- [ ] ¿El scanner debe ser continuo o single-shot? Por ahora single-shot (más simple).
- [ ] ¿Soportar NFC además de QR/Barcode? Queda para future work — el MVP es solo barcode.

## Rollout

No migration required — local prototype with mock data.

---

**Note**: El código de `simulateScan()` en `home.page.ts` puede quedarse como feature flag para desarrollo. En producción, se usa el scanner real.
