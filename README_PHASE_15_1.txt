PHASE 15.1 — FIRST LOAD / JSONP TIMEOUT FIX

Fixed console errors
--------------------
- Error: API timeout
- Uncaught ReferenceError: fbv2_... is not defined

Cause
-----
The first Phase 15 request may take longer than 15 seconds while Apps Script
migrates Transactions and calculates category usage. The frontend deleted its
JSONP callback before the response returned.

Fix
---
- Timeout increased from 15 seconds to 120 seconds.
- Late JSONP responses no longer cause an uncaught callback error.
- New service-worker cache forces the corrected JavaScript to load.

Installation
------------
1. Replace all GitHub repository files.
2. Replace backend/Code.gs in Apps Script.
3. Deploy > Manage deployments > Edit > New version > Deploy.
4. Commit: Phase 15.1 first load timeout fix
5. Push origin.
6. Open:
   https://flintgr.github.io/BudgetTracker/home-v2/?v=phase15-1
7. Leave the page open during the first load. Do not repeatedly reload it.
