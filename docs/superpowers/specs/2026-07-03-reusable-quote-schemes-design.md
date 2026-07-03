# Reusable Quote Schemes Design

Goal: reduce repeated quote setup work by letting users reuse imported quote history and save the current quote lines as a named scheme.

Scope:
- Add a quote workspace "方案库" mode next to "设备目录" and "场景套餐".
- Show saved schemes and imported quote history as reusable cards.
- Clicking a scheme replaces the current QuoteLine list with editable copied lines.
- Add a "保存方案" button that saves the current QuoteLine list using the project name as the scheme name.
- Store schemes in local JSON under `data/settings/schemes.json`.
- Keep Excel V5 rendering unchanged. Schemes only operate on `QuoteLine[]`.

Data model:
```json
{
  "id": "scheme_1783040000000_ab12cd",
  "name": "上海w品牌直播活动",
  "source": "custom | import",
  "createdAt": "2026-07-03T12:00:00+08:00",
  "lineCount": 12,
  "lines": []
}
```

API:
- `GET /api/schemes`: returns saved schemes plus reusable import history.
- `POST /api/schemes`: saves the current quote as a custom scheme.

UI behavior:
- "方案库" cards use the current industrial console style.
- Saved schemes are labelled "常用方案"; imported records are labelled "历史报价".
- Loading a scheme replaces current lines and gives every copied line a fresh `lineId`.
- Loaded lines remain editable and can still generate Excel through the existing renderer.

Testing:
- Service tests cover save/load and import-history reuse.
- Server contract test covers the new endpoints.
- Frontend contract test covers the new mode, save button, and API calls.
