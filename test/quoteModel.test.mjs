import test from "node:test";
import assert from "node:assert/strict";
import {
  createLineSubtotalFormula,
  createLookupFormula,
  makeOutputFileName,
} from "../src/quoteModel.mjs";

test("formula helpers create guarded formulas for populated template rows", () => {
  assert.equal(
    createLineSubtotalFormula("equipment", 8),
    '=IF(B8="","",D8*(IF(E8="",0,E8)+IF(F8="",0,F8)*IF(G8="",0,G8)))',
  );
  assert.equal(createLineSubtotalFormula("reimbursement", 40), '=IF(B40="","",D40*F40)');
  assert.equal(
    createLookupFormula("equipment", 8),
    '=IF(B8="","",IFERROR(VLOOKUP(B8,\'年框+自有设备清单\'!$B$3:$C$120,2,FALSE),"未匹配"))',
  );
});

test("makeOutputFileName creates a desktop-safe Excel file name", () => {
  assert.match(makeOutputFileName("上海 w 品牌/直播"), /^上海_w_品牌_直播_报价单_\d{8}_\d{6}\.xlsx$/);
});
