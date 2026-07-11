PHASE 8 — EDITABLE INCOME SOURCES

Dashboard now includes:
- EMSA
- ΘΕΜΑ
- GIOCHI
- OTHER
- Automatic Total Income
- Save Income button

Backend changes:
- New saveIncomeSources action
- Income source data returned in dashboard.incomeSources
- Monthly sheets use rows:
  2 EMSA
  3 ΘΕΜΑ
  4 GIOCHI
  5 OTHER
  6 TOTAL
- Expenses remain from row 7.

INSTALL
1. Apps Script:
   Replace Code.gs with backend/Code.gs
   Save
   Deploy > Manage deployments > Edit > New version > Deploy

2. Frontend:
   Replace repository files with this package.
   Commit: Phase 8 editable income sources
   Push origin.

TEST
https://flintgr.github.io/BudgetTracker/home-v2/?v=phase8-income
