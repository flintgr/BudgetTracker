# v1.1.4 – Category Rename Compatibility Fix

## Fixed
- History Delete now resolves legacy transactions after a category has been renamed.
- Delete uses the stable CategoryID whenever available.
- Legacy transactions without CategoryID can resolve a renamed category through saved aliases.
- A compatibility fallback maps old internal category names to a unique category icon (for example, DELIVERY to the current category using the Delivery icon).
- Future category renames preserve the previous name in the Categories sheet `Aliases` column.
- Deleted/Undo ledger entries are written with the current category name and stable CategoryID.

## Deployment
1. Replace the Google Apps Script `Code.gs` with the included file.
2. Deploy a new Web App version.
3. Upload the frontend files to GitHub Pages.
4. Refresh/reopen the app so the new service-worker cache is activated.
