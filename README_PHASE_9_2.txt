PHASE 9.2 — SETTINGS CLEANUP

Changes:
- Removed Family Budget / Quick Categories header from Settings.
- Removed User and Month controls from the Settings header.
- Settings page now has a simple Settings title.
- Quick Categories is now a collapsible menu, closed by default.
- Month Management is now a collapsible menu, closed by default.
- Removed the subtitle "Clear or delete a month".
- Removed "Home V2" wording from Settings.
- No backend logic changes.

INSTALL
1. Replace Apps Script Code.gs with backend/Code.gs.
2. Save.
3. Deploy > Manage deployments > Edit > New version > Deploy.
4. Replace repository files with this package.
5. Commit:
   Phase 9.2 settings cleanup
6. Push origin.

TEST
https://flintgr.github.io/BudgetTracker/home-v2/?v=phase9-2-settings-cleanup
