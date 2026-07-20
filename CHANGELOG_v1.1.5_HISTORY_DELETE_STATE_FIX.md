# BudgetTracker v1.1.5 — History Delete State Fix

## Fixed
- Repeated Delete requests are now idempotent instead of returning “already undone or deleted”.
- Expenses that already have a Delete ledger entry no longer appear as active expenses in History.
- Internal Deleted audit rows remain in Google Sheets but are hidden from the app History list.
- Updated frontend and Service Worker version to prevent stale cached JavaScript.

## Deployment
1. Replace `Code.gs` in Google Apps Script and deploy a new Web App version.
2. Upload the frontend files to GitHub.
3. Reload the installed app/page after deployment.
