PHASE 9 — MONTH MANAGEMENT

Settings now includes:

1. Clear Month Data
- Resets Total Spent to 0.
- Resets Balance to Budget.
- Keeps Budgets.
- Keeps Income Sources.
- Removes all Transactions ledger rows for that month.

2. Delete Month
- Deletes the monthly Google Sheet tab.
- Removes all Transactions ledger rows for that month.
- Cannot delete the only remaining monthly sheet.
- Requires typing DELETE.

INSTALL
1. Replace Apps Script Code.gs with backend/Code.gs.
2. Save.
3. Deploy > Manage deployments > Edit > New version > Deploy.
4. Replace repository files with this package.
5. Commit:
   Phase 9 month management
6. Push origin.

TEST
https://flintgr.github.io/BudgetTracker/home-v2/?v=phase9-month-management
