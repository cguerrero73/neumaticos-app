# Proposal: Tire Management Mobile App

## Intent

Enable field technicians to identify vehicles by scanning RFID/QR/Barcode and manage tire positions visually on a vehicle template. This replaces manual paper-based tracking and enables real-time tire lifecycle management (view details, assign tires, create work orders, record tread depth).

## Scope

### In Scope
- Scanner integration for vehicle identification (RFID/QR/Barcode)
- Vehicle template visualization with SVG tire positions
- Tire code display per position
- Contextual menu per tire: view detail, change tire, create work order (OT), record tread depth

### Out of Scope
- Backend API design (mock services only for prototype)
- Tire inventory management
- Fleet reporting dashboard

## Capabilities

### New Capabilities
- `vehicle-scan`: Scan RFID/QR/Barcode to identify vehicle and retrieve template
- `vehicle-template`: Display SVG-based vehicle diagram with tire positions
- `tire-context-menu`: Provide actions menu per tire position
- `tire-detail`: Show tire information (code, brand, model, DOT, tread depth history)
- `work-order-create`: Create repair/maintenance work order linked to tire
- `tread-depth-record`: Record tread depth measurement for a tire position

### Modified Capabilities
- None — this is the initial feature set

## Approach

Build a mobile-first Ionic + Capacitor app that:
1. Uses Capacitor plugins (BarcodeScanner, NFC if available) for scanning
2. Renders vehicle SVG templates dynamically based on vehicle type
3. Stores data locally using Ionic Storage for prototype
4. Uses Angular Signals for reactive state management

The app targets Android/iOS via Capacitor and responsive web.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/` | New | Feature modules and components |
| `src/app/pages/scan/` | New | Scanner page with camera/NFC |
| `src/app/pages/vehicle/` | New | Vehicle template visualization |
| `src/app/components/` | New | Reusable UI components |
| `src/assets/templates/` | New | SVG vehicle templates |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| NFC not available on all devices | Medium | Fallback to QR/Barcode scanning |
| SVG template performance on low-end devices | Low | Test on target devices, optimize if needed |
| Camera permission denied | Medium | Show clear instructions, provide manual entry fallback |

## Rollback Plan

1. Revert to previous commit via git
2. Remove `src/app/pages/scan/`, `src/app/pages/vehicle/`, and new components
3. No database migrations needed (local prototype)

## Dependencies

- Ionic Storage (already available via Ionic)
- Capacitor Camera/Barcode Scanner plugins
- No external API for MVP (local mock data)

## Success Criteria

- [ ] User can scan a barcode and see the corresponding vehicle template with tire positions
- [ ] Each tire position shows tire code and responds to tap with context menu
- [ ] User can view tire details from the menu
- [ ] User can record tread depth and see it stored for that position
- [ ] App builds successfully for Android APK and responsive web