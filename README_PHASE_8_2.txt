PHASE 8.2 — USER SPENDING FIX

Fixes:
- User spending donut now reads the existing Transactions ledger correctly.
- Only active Added transactions are counted.
- Undo and Deleted transactions are excluded through the existing reversal logic.
- Supports user names Χρήστος / Chris / Christos and Γιάννα / Gianna.
- Refresh button now has clear pressed, loading and success feedback.

INSTALL
1. Replace Apps Script Code.gs with backend/Code.gs.
2. Save.
3. Deploy > Manage deployments > Edit > New version > Deploy.
4. Replace repository files with this package.
5. Commit:
   Phase 8.2 user spending fix
6. Push origin.

TEST
https://flintgr.github.io/BudgetTracker/home-v2/?v=phase8-2-spending-fix
