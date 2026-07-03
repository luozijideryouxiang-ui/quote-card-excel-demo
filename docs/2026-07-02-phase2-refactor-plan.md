# Phase 2 Quote Tool Refactor Plan

Goal: replace the first-demo selection/overrides flow with a QuoteLine-based configurator while preserving the Excel V5 template structure.

Architecture:
- Catalog is extracted from the V5 workbook sheet `年框+自有设备清单`.
- QuoteLine[] is the only quote state sent to the renderer.
- Packages expand into editable QuoteLine rows.
- Price import is external config, applied only at render time.
- Excel renderer is the only output layer and may write values/formulas only inside fixed V5 ranges.

Tasks:
1. Add tests for catalog extraction from V5 workbook.
2. Add tests for QuoteLine normalization, package expansion, price paste parsing, and price application.
3. Add tests for importing an existing V5 quote workbook into QuoteLine rows.
4. Update the renderer to accept project + lines + prices and preserve fixed row blocks.
5. Replace front-end selection state with QuoteLine[] and an editable quote table.
6. Add packages, import quote, and price paste API endpoints.
7. Rebuild the standalone HTML, sync desktop copy, restart the local service.
8. Verify tests, API smoke checks, downloaded workbook formula scan, and key merge ranges.
