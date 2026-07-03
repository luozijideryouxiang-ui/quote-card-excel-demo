import test from "node:test";
import assert from "node:assert/strict";
import { calculateQuoteTotals, resolvePriceForLine } from "../src/estimateService.mjs";

test("resolvePriceForLine chooses annual price only when available", () => {
  const priceEntries = [
    {
      productId: "fx3",
      price: { standard: 1200, annual: 800 },
    },
    {
      productId: "router",
      price: { standard: 300, annual: null },
    },
  ];

  assert.equal(resolvePriceForLine({ productId: "fx3", isAnnualFrame: true }, priceEntries), 800);
  assert.equal(resolvePriceForLine({ productId: "fx3", isAnnualFrame: false }, priceEntries), 1200);
  assert.equal(resolvePriceForLine({ productId: "router", isAnnualFrame: true }, priceEntries), 300);
});

test("resolvePriceForLine chooses selected provider price when available", () => {
  const priceEntries = [
    {
      productId: "fx3",
      price: { standard: 1200, annual: 800 },
      providerPrices: [
        { provider: "欢屹", standard: null, annual: 200 },
        { provider: "茉谷", standard: null, annual: 300 },
      ],
    },
  ];

  assert.equal(resolvePriceForLine({ productId: "fx3", isAnnualFrame: true, provider: "茉谷" }, priceEntries), 300);
  assert.equal(resolvePriceForLine({ productId: "fx3", isAnnualFrame: true, provider: "欢屹" }, priceEntries), 200);
});

test("calculateQuoteTotals includes rehearsal quantity and rehearsal days plus tax", () => {
  const totals = calculateQuoteTotals({
    lines: [
      {
        productId: "fx3",
        quantity: 2,
        days: 3,
        rehearsalQuantity: 2,
        rehearsalDays: 1,
        isAnnualFrame: true,
      },
      {
        productId: "router",
        quantity: 1,
        days: 2,
        rehearsalQuantity: 0,
        rehearsalDays: 0,
        isAnnualFrame: false,
      },
    ],
    priceEntries: [
      { productId: "fx3", price: { standard: 1200, annual: 800 } },
      { productId: "router", price: { standard: 300, annual: null } },
    ],
    taxRate: 0.06,
  });

  assert.equal(totals.taxExclusiveTotal, 7000);
  assert.equal(totals.taxAmount, 420);
  assert.equal(totals.taxInclusiveTotal, 7420);
});
