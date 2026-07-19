PHASE 15 — DYNAMIC CATEGORIES SYSTEM

Included
--------
- Stable Category IDs.
- Automatic Transactions migration to:
  Date | User | CategoryID | CategoryName | Amount | Month | Action | Related ID | Note
- Renaming a category updates all monthly sheets and all matching History rows.
- Rename confirmation shows how many History and monthly rows will change.
- Category usage counts in Manage Categories.
- Safe deletion: categories in use cannot be deleted.
- Merge Categories: moves monthly budgets/spending and all History transactions.
- SVG Color, Background Color, Transparent Background.
- Drag-and-drop category reordering, while arrow buttons remain available.
- Quick Categories continue to use stable Category IDs.

Automatic migration
-------------------
The first Phase 15 backend request migrates the existing Transactions sheet without deleting data.
Existing category names are matched to the stable IDs in the Categories sheet.

Important safety step
---------------------
Before deployment, make a copy of the Google Sheet:
File > Make a copy

Installation
------------
1. Replace all GitHub repository files with this package.
2. Replace Apps Script backend/Code.gs.
3. Apps Script: Deploy > Manage deployments > Edit > New version > Deploy.
4. Commit: Phase 15 dynamic categories
5. Push origin.
6. Open: https://flintgr.github.io/BudgetTracker/home-v2/?v=phase15
7. Reload once. If installed as a PWA, fully close and reopen it.

Recommended checks
------------------
1. Open Settings > Manage Categories.
2. Rename a test category and verify old History rows display the new name.
3. Add a new expense and verify Transactions contains CategoryID and CategoryName.
4. Test Merge only after confirming the backup copy exists.
