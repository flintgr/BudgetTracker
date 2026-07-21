# BudgetTracker v1.2.0 — Developer Diagnostics

## Added
- Read-only Developer Diagnostics panel behind the existing Developer Mode switch.
- App version, network connection, API status and response duration.
- Current month, cached transaction count and pending sync queue count.
- Last successful sync and latest sync/API error.
- Manual Refresh Diagnostics button.

## Changed
- Updated application and Service Worker cache versions to v1.2.0.

## Safety
- Diagnostics are read-only and do not modify budget or transaction data.
- No backend changes are required.
