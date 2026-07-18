PHASE 14 — CATEGORY MANAGEMENT

Features:
- Create expense categories with initial monthly budget
- Rename categories
- Choose a stable SVG icon-library ID
- Choose a category color
- Reorder categories
- Soft-delete categories while preserving old History transactions
- Quick Categories are now stored by stable category ID (with legacy-name migration)
- Automatic Categories sheet migration from the latest monthly sheet

DEPLOYMENT
1. Replace the GitHub repository frontend files.
2. Replace backend/Code.gs in Apps Script.
3. Deploy a NEW Apps Script web-app version.
4. Commit: Phase 14 category management
5. Push origin.

IMPORTANT
The first API request automatically creates a Categories sheet with columns:
ID | Name | Icon | Color | Active | Order

Deletion is safe: historical Transactions are not renamed or deleted. Monthly category rows that contain spending are retained internally for undo/history consistency but hidden from the active app list.
