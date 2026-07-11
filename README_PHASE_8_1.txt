PHASE 8.1 — USER SPENDING DONUT

Dashboard:
- No chart title.
- Animated donut showing Χρήστος vs Γιάννα spending share.
- Minimal man / woman icons inside the donut.
- Percentage inside the donut.
- Whole-euro amount legend below.
- Updates on Dashboard open, Refresh, month/data refresh.

Backend:
- New getUserSpending action.
- Aggregates net spending from the Transactions ledger for the selected month.
- Added transactions increase user spending.
- Undo / Undone rows reduce user spending.

INSTALL
1. Replace Apps Script Code.gs with backend/Code.gs.
2. Save.
3. Deploy > Manage deployments > Edit > New version > Deploy.
4. Replace repository files with this package.
5. Commit:
   Phase 8.1 animated user spending donut
6. Push origin.

TEST
https://flintgr.github.io/BudgetTracker/home-v2/?v=phase8-1-donut
