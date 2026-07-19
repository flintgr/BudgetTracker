# BudgetTracker v1.0.0 — Stabilization Build

## Completed in this build

- Removed duplicate backend function declarations.
- Removed duplicate Quick Categories functions in `home-v2/home-v2.js`.
- Preserved the latest Phase 15.2 implementation of every duplicated operation.
- Removed Transactions migration from the Home startup path.
- Kept transaction migration lazy: it runs only when History or a ledger operation needs it.
- Added explicit release/backend version identifiers.
- Confirmed that `QUICK_IDS_STORAGE_KEY` is declared before use.

## Important

This is the first stabilization build. It should be tested against a copy of the Google Sheet before being treated as production-confirmed. No offline queue is included yet.

## Deployment

1. Replace the Apps Script `Code.gs` with `backend/Code.gs`.
2. Deploy a new Web App version.
3. Update the GitHub Pages frontend with the files in this package.
4. Hard refresh the browser once after deployment.
