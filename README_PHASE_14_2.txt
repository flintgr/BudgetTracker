PHASE 14.2 — SVG COLOR + ICON BACKGROUND COLOR

New
---
Each category now has two independent appearance controls:
- SVG Color
- Background Color
- Optional Transparent Background

The selected style is used consistently in:
- Home quick categories
- Quick Categories settings
- Edit Budget
- Dashboard
- History
- Manage Categories

Google Sheets migration
-----------------------
The Categories sheet is migrated automatically:

Old:
ID | Name | Icon | Color | Active | Order

New:
ID | Name | Icon | IconColor | BackgroundColor | Active | Order

Existing Color values become IconColor.
Existing categories receive #eef3ef as their initial BackgroundColor.

Installation
------------
1. Replace all repository files.
2. Replace backend/Code.gs in Apps Script.
3. Deploy > Manage deployments > Edit > New version > Deploy.
4. Commit:
   Phase 14.2 icon and background colors
5. Push origin.
6. Test:
   https://flintgr.github.io/BudgetTracker/home-v2/?v=phase14-2

A new Apps Script deployment is required.
