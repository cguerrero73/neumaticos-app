# Tasks: Vehicle Scan Integration

## Phase 1: Infrastructure

- [x] 1.1 Add `@capacitor-mlkit/barcode-scanning` to `package.json` devDependencies (version 8.0.1)
- [x] 1.2 Create `src/app/core/services/barcode-scanner.service.ts` with `scan()` and `isAvailable()` methods
- [x] 1.3 Define TypeScript interface for scan result

## Phase 2: Core Implementation

- [x] 2.1 Implement `scan()` method using ML Kit barcode scanner
- [x] 2.2 Implement `isAvailable()` to check camera + permissions
- [x] 2.3 Handle CameraPermissionDenied error — throw descriptive error
- [x] 2.4 Handle BarcodeScannerException — reject with user-friendly message

## Phase 3: Integration

- [ ] 3.1 Add `startRealScan()` method to `home.page.ts` that calls barcodeScannerService.scan()
- [ ] 3.2 On scan success, call `this.loadVehicleWithConfig(code)`
- [ ] 3.3 On permission denied, show error toast + keep manual input visible
- [ ] 3.4 Connect scanner icon click to `startRealScan()` in `home.page.html`
- [ ] 3.5 Keep `simulateScan()` as dev fallback (commented or feature-flagged)

## Phase 4: Testing & Verification

- [ ] 4.1 Write unit test for `BarcodeScannerService.isAvailable()` (mock ML Kit)
- [ ] 4.2 Write unit test for `BarcodeScannerService.scan()` returns decoded string
- [ ] 4.3 Manual test: scan barcode → vehicle loads correctly
- [ ] 4.4 Manual test: permission denied → shows instructions + manual fallback works
- [ ] 4.5 Manual test: invalid code → shows "Vehicle not found"

## Dependencies

- ML Kit Barcode Scanning requires `@capacitor-mlkit/barcode-scanning` v8.0.1
- Camera permission via Capacitor Runtime
- No native Android/iOS config changes expected for basic barcode scanning
