PHASE 14.1 — CATEGORY MANAGEMENT FIX

Problem fixed
-------------
Phase 14 started the app before the Category Management overrides were registered.
That meant Settings and the initial data load could keep using the older functions,
so Manage Categories displayed the Add Category form without the existing list.

Fix
---
- App boot moved after all Phase 14 functions and overrides.
- Existing categories render when Manage Categories opens.
- A clear warning appears if the frontend is connected to an older backend.
- Service worker cache name changed to force fresh frontend assets.
- Backend version updated to Phase 14.1.

Installation
------------
1. Replace all GitHub repository files with this package.
2. Replace Apps Script backend/Code.gs.
3. Apps Script: Deploy > Manage deployments > Edit > New version > Deploy.
4. Commit:
   Phase 14.1 category management fix
5. Push origin.
6. Test:
   https://flintgr.github.io/BudgetTracker/home-v2/?v=phase14-1
7. Reload once. If installed as a PWA, fully close and reopen it.

A new Apps Script deployment is required.
