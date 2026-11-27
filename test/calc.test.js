const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../calc.js');

const base = { price: 100, cogs: 30, shipping: 10, packaging: 0, otherCost: 0, platformPct: 0, platformFixed: 0, paymentPct: 0, paymentFixed: 0 };

test('net profit and margin with no fees', () => {
  const r = C.unitEconomics(base);
  assert.equal(r.contribution, 60);
  assert.equal(r.netProfit, 60);
  assert.equal(r.marginPct, 60);
  assert.equal(r.markupPct, 150);
});

test('percent + fixed payment and platform fees', () => {
  const r = C.unitEconomics({ ...base, platformPct: 15, platformFixed: 1, paymentPct: 2.9, paymentFixed: 0.3 });
  assert.equal(r.platformFee, 16);
  assert.equal(r.paymentFee, 3.2);
  assert.equal(r.totalFees, 19.2);
  assert.equal(r.contribution, 40.8);
});

test('break-even ROAS and CPA', () => {
  const r = C.unitEconomics(base); // contribution 60 on price 100
  assert.equal(r.breakEvenROAS, 1.67);
  assert.equal(r.breakEvenCPA, 60);
  assert.equal(r.breakEvenACoSPct, 60);
});

test('break-even ROAS is Infinity when product loses money before ads', () => {
  const r = C.unitEconomics({ ...base, cogs: 120 });
  assert.equal(r.breakEvenROAS, Infinity);
  assert.equal(r.breakEvenCPA, 0);
});

test('ad cost per order reduces net profit', () => {
  const r = C.unitEconomics({ ...base, adCostPerOrder: 25 });
  assert.equal(r.netProfit, 35);
  assert.equal(r.marginPct, 35);
});

test('VAT included in price is removed from revenue', () => {
  const r = C.unitEconomics({ price: 110, cogs: 50, taxPct: 10 });
  assert.equal(r.taxAmount, 10);
  assert.equal(r.netRevenue, 100);
  assert.equal(r.netProfit, 50);
  assert.equal(r.marginPct, 50);
});

test('returns allowance is a percentage of price', () => {
  const r = C.unitEconomics({ ...base, returnRatePct: 5 });
  assert.equal(r.returnsAllowance, 5);
  assert.equal(r.contribution, 55);
});

test('target margin ROAS and CPA', () => {
  const r = C.unitEconomics({ ...base, targetMarginPct: 20 }); // headroom 60 - 20 = 40
  assert.equal(r.targetCPA, 40);
  assert.equal(r.targetROAS, 2.5);
});

test('priceForTargetMargin solves price that yields the target', () => {
  const inp = { cogs: 30, shipping: 10, paymentPct: 2.9, paymentFixed: 0.3, platformPct: 15, adCostPerOrder: 8, taxPct: 10 };
  const p = C.priceForTargetMargin(inp, 25);
  const r = C.unitEconomics({ ...inp, price: p });
  assert.ok(Math.abs(r.marginPct - 25) < 0.05, `margin ${r.marginPct}`);
  assert.equal(C.priceForTargetMargin({ cogs: 1, platformPct: 90 }, 20), Infinity);
});

test('ad spend scenarios: profit = orders * contribution - spend', () => {
  const sc = C.adScenarios(base, 1000, [1, 2, 3]);
  assert.deepEqual(sc.map(s => s.revenue), [1000, 2000, 3000]);
  assert.deepEqual(sc.map(s => s.orders), [10, 20, 30]);
  assert.deepEqual(sc.map(s => s.profit), [-400, 200, 800]);
  assert.deepEqual(sc.map(s => s.profitable), [false, true, true]);
  assert.equal(sc[1].cpa, 50);
  assert.equal(sc[1].roi, 20);
});

test('scenario exactly at break-even ROAS is profit 0', () => {
  const sc = C.adScenarios(base, 600, [100 / 60]);
  assert.ok(Math.abs(sc[0].profit) < 0.01);
});

test('Shopify preset fees on a $50 order', () => {
  const r = C.unitEconomics({ price: 50, cogs: 20, ...C.PRESETS.shopify_basic });
  assert.equal(r.paymentFee, 1.75);
  assert.equal(r.contribution, 28.25);
});

test('inputs accept strings with thousands separators', () => {
  const r = C.unitEconomics({ price: '29,000', cogs: '9,000' });
  assert.equal(r.netProfit, 20000);
  assert.throws(() => C.unitEconomics({ price: -1 }), RangeError);
});

test('CSV parser handles quotes, commas, CRLF and BOM', () => {
  const rows = C.parseCSV('﻿a,b\r\n"x, y","he said ""hi"""\r\n\r\n1,2');
  assert.deepEqual(rows, [['a', 'b'], ['x, y', 'he said "hi"'], ['1', '2']]);
});

test('bulk SKU CSV uses defaults for missing columns and exports', () => {
  const res = C.bulkFromCSV('sku,price,cogs\nA,100,30\nB,50,45\n', { shipping: 10 });
  assert.equal(res.length, 2);
  assert.equal(res[0].result.netProfit, 60);
  assert.equal(res[1].result.netProfit, -5);
  const out = C.bulkToCSV(res);
  const lines = out.split('\r\n');
  assert.equal(lines.length, 3);
  assert.ok(lines[0].startsWith('sku,price,cogs,shipping'));
  assert.ok(lines[1].startsWith('A,100,30,10'));
});

test('CSV export guards against formula injection', () => {
  assert.equal(C.toCSV([['=HYPERLINK("x")', '-5', '@a']]), `"'=HYPERLINK(""x"")",-5,'@a`);
});
