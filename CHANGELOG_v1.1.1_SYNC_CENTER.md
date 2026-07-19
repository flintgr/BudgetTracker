# BudgetTracker v1.1.1 — Sync Center Beta

## Added
- Settings → Sync Center
- Pending transaction list with retry counts and errors
- Last successful and failed sync timestamps
- Last sync duration
- Retry Now and Refresh Status controls
- Recovery-only Clear Pending Queue control with confirmation
- Smart sync continues after individual transaction failures while online
- Persistent sync diagnostics in IndexedDB

## Deployment
Frontend-only update. The backend Code.gs is unchanged from v1.1.0.
Upload the frontend files to GitHub Pages and perform one hard refresh.
