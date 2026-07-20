# v1.1.6 — History Load Optimization

## Fixed
- Removed repeated Categories-sheet lookups while loading History.
- Category IDs, aliases, renamed category names, and legacy icon fallback are now resolved from one in-memory map per request.
- Preserved the v1.1.5 delete-state behavior: deleted expenses remain hidden from active History.

## Performance
- Replaced potentially hundreds of Google Sheets service calls with a single Categories-sheet read during each ledger load.

## Deployment
- Replace `Code.gs` and create a new Google Apps Script deployment.
- Upload the frontend files to GitHub Pages so the new Service Worker cache is installed.
