# BudgetTracker v1.1.0 — Offline Engine Beta

## Implemented
- PWA app-shell caching for Home V2 and core assets.
- IndexedDB cache for the latest app data and History.
- Offline Add Expense queue.
- Optimistic Home/Dashboard category totals while offline.
- Automatic sync when connection returns.
- Manual Sync now button.
- Pending transaction display in offline History.
- ClientTransactionID backend idempotency to prevent duplicate expenses after retries.

## Safety boundary
Offline mode supports adding expenses and viewing saved data. Category management, budgets, month management, delete/undo and income editing still require an internet connection.

## Deployment
1. Replace all GitHub Pages frontend files.
2. Replace backend/Code.gs in Apps Script.
3. Deploy a NEW Apps Script web-app version.
4. Hard refresh once while online, then test airplane/offline mode.

## Beta validation
Test with one small expense first. Confirm it appears once in Transactions after reconnecting.
