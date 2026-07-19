PHASE 15.2 — PERFORMANCE + QUICK CATEGORY FIX

Fixed
-----
- QUICK_IDS_STORAGE_KEY is not defined.
- getAppData taking 40–90+ seconds.
- Rewriting the Transactions header on every request.
- Rebuilding the category library repeatedly for every monthly row.

Main performance change
-----------------------
Home/getAppData no longer scans all monthly sheets and all History transactions.
Usage is loaded only when Rename, Delete, or Merge needs it.

Installation
------------
1. Replace all GitHub repository files.
2. Replace Apps Script backend/Code.gs.
3. Deploy > Manage deployments > Edit > New version > Deploy.
4. Commit: Phase 15.2 performance fix
5. Push origin.
6. Open:
   https://flintgr.github.io/BudgetTracker/home-v2/?v=phase15-2
7. Hard reload once, or fully close/reopen the PWA.
