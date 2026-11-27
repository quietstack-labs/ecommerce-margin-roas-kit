/* Margin & ROAS Kit core math. Pure functions, no dependencies. Works in the browser and in Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MarginCalc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const num = (v, d = 0) => {
    const n = typeof v === 'string' ? parseFloat(v.replace(/[,\s]/g, '')) : Number(v);
    return Number.isFinite(n) ? n : d;
  };
  const round = (v, dp = 2) => {
    if (!Number.isFinite(v)) return v;
    const f = Math.pow(10, dp);
    return Math.round((v + Number.EPSILON) * f) / f;
  };

  /** Platform presets: percent referral/transaction fee + fixed per-order fee, plus payment processing. */
  const PRESETS = {
    custom: { platformPct: 0, platformFixed: 0, paymentPct: 0, paymentFixed: 0 },
    shopify_basic: { platformPct: 0, platformFixed: 0, paymentPct: 2.9, paymentFixed: 0.3 },
    shopify_external_gateway: { platformPct: 2, platformFixed: 0, paymentPct: 2.9, paymentFixed: 0.3 },
    amazon_fba_15: { platformPct: 15, platformFixed: 0, paymentPct: 0, paymentFixed: 0 },
    etsy: { platformPct: 6.5, platformFixed: 0.2, paymentPct: 3, paymentFixed: 0.25 },
    ebay: { platformPct: 13.25, platformFixed: 0.4, paymentPct: 0, paymentFixed: 0 },
    tiktok_shop: { platformPct: 6, platformFixed: 0, paymentPct: 0, paymentFixed: 0 },
    naver_smartstore: { platformPct: 2, platformFixed: 0, paymentPct: 3.63, paymentFixed: 0 },
    coupang: { platformPct: 10.8, platformFixed: 0, paymentPct: 0, paymentFixed: 0 }
  };

  /**
   * Unit economics for one order of one SKU.
   * Inputs (all per unit/order): price, cogs, shipping, packaging, otherCost,
   * platformPct, platformFixed, paymentPct, paymentFixed, returnRatePct, taxPct (VAT/GST included in price),
   * adCostPerOrder (optional, i.e. CPA), targetMarginPct (optional).
   */
  function unitEconomics(input) {
    const i = {};
    for (const k of ['price', 'cogs', 'shipping', 'packaging', 'otherCost', 'platformPct', 'platformFixed',
      'paymentPct', 'paymentFixed', 'returnRatePct', 'taxPct', 'adCostPerOrder', 'targetMarginPct']) i[k] = num(input[k]);
    if (i.price < 0) throw new RangeError('price must be >= 0');

    const taxAmount = i.taxPct > 0 ? i.price - i.price / (1 + i.taxPct / 100) : 0;
    const netRevenue = i.price - taxAmount;
    const platformFee = i.price * i.platformPct / 100 + i.platformFixed;
    const paymentFee = i.price * i.paymentPct / 100 + i.paymentFixed;
    const returnsAllowance = i.price * i.returnRatePct / 100;
    const productCost = i.cogs + i.shipping + i.packaging + i.otherCost;
    const variableCost = productCost + platformFee + paymentFee + returnsAllowance;
    const contribution = netRevenue - variableCost; // profit before ads
    const netProfit = contribution - i.adCostPerOrder;
    const marginPct = netRevenue > 0 ? netProfit / netRevenue * 100 : 0;
    const contributionMarginPct = netRevenue > 0 ? contribution / netRevenue * 100 : 0;
    const markupPct = productCost > 0 ? (i.price - productCost) / productCost * 100 : null;

    // Break-even ROAS: revenue/ad spend at which ad cost per order equals contribution. ROAS is measured on gross price.
    const breakEvenROAS = contribution > 0 ? i.price / contribution : Infinity;
    const breakEvenCPA = Math.max(contribution, 0);
    const targetProfit = netRevenue * i.targetMarginPct / 100;
    const targetHeadroom = contribution - targetProfit;
    const targetROAS = targetHeadroom > 0 ? i.price / targetHeadroom : Infinity;
    const targetCPA = Math.max(targetHeadroom, 0);

    return {
      price: round(i.price), taxAmount: round(taxAmount), netRevenue: round(netRevenue),
      platformFee: round(platformFee), paymentFee: round(paymentFee), totalFees: round(platformFee + paymentFee),
      returnsAllowance: round(returnsAllowance), productCost: round(productCost), variableCost: round(variableCost),
      contribution: round(contribution), adCostPerOrder: round(i.adCostPerOrder), netProfit: round(netProfit),
      marginPct: round(marginPct), contributionMarginPct: round(contributionMarginPct),
      markupPct: markupPct === null ? null : round(markupPct),
      breakEvenROAS: round(breakEvenROAS), breakEvenACoSPct: contribution > 0 ? round(contribution / i.price * 100) : 0,
      breakEvenCPA: round(breakEvenCPA), targetROAS: round(targetROAS), targetCPA: round(targetCPA)
    };
  }

  /** Price needed to hit a target net margin % (before ads unless adCostPerOrder given). Solves for gross price. */
  function priceForTargetMargin(input, targetMarginPct) {
    const t = num(targetMarginPct) / 100;
    const taxDiv = 1 + num(input.taxPct) / 100;
    const pct = (num(input.platformPct) + num(input.paymentPct) + num(input.returnRatePct)) / 100;
    const fixed = num(input.cogs) + num(input.shipping) + num(input.packaging) + num(input.otherCost) +
      num(input.platformFixed) + num(input.paymentFixed) + num(input.adCostPerOrder);
    // profit = P/taxDiv - pct*P - fixed = t * P/taxDiv  =>  P * ((1-t)/taxDiv - pct) = fixed
    const k = (1 - t) / taxDiv - pct;
    if (k <= 0) return Infinity;
    return round(fixed / k);
  }

  /** Ad spend scenarios: for each ROAS, the orders, revenue and profit produced by a given ad budget. */
  function adScenarios(input, adSpend, roasList) {
    const ue = unitEconomics({ ...input, adCostPerOrder: 0 });
    const spend = num(adSpend);
    return roasList.map(r => {
      const roas = num(r);
      const revenue = spend * roas;
      const orders = ue.price > 0 ? revenue / ue.price : 0;
      const grossContribution = orders * ue.contribution;
      const profit = grossContribution - spend;
      const cpa = orders > 0 ? spend / orders : Infinity;
      return {
        roas: round(roas), adSpend: round(spend), revenue: round(revenue), orders: round(orders, 1),
        cpa: round(cpa), profit: round(profit), roi: spend > 0 ? round(profit / spend * 100) : 0,
        profitable: profit >= 0
      };
    });
  }

  // ---------- CSV ----------
  function parseCSV(text) {
    const rows = []; let row = []; let field = ''; let q = false;
    const s = String(text).replace(/^﻿/, '');
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (q) {
        if (c === '"') { if (s[i + 1] === '"') { field += '"'; i++; } else q = false; }
        else field += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && s[i + 1] === '\n') i++;
        row.push(field); field = '';
        if (row.some(f => f !== '')) rows.push(row);
        row = [];
      } else field += c;
    }
    row.push(field);
    if (row.some(f => f !== '')) rows.push(row);
    return rows;
  }

  const csvCell = v => {
    let s = v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s)) s = "'" + s; // spreadsheet formula injection guard
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const toCSV = rows => rows.map(r => r.map(csvCell).join(',')).join('\r\n');

  const SKU_FIELDS = ['sku', 'price', 'cogs', 'shipping', 'packaging', 'otherCost', 'platformPct', 'platformFixed',
    'paymentPct', 'paymentFixed', 'returnRatePct', 'taxPct', 'adCostPerOrder', 'targetMarginPct'];
  const OUT_FIELDS = ['netRevenue', 'totalFees', 'contribution', 'netProfit', 'marginPct', 'breakEvenROAS', 'breakEvenCPA', 'targetROAS'];

  /** Bulk SKU: CSV text in (header row with any of SKU_FIELDS), array of results out. Missing columns fall back to defaults. */
  function bulkFromCSV(text, defaults = {}) {
    const rows = parseCSV(text);
    if (!rows.length) return [];
    const header = rows[0].map(h => h.trim());
    return rows.slice(1).map((r, idx) => {
      const obj = { ...defaults };
      header.forEach((h, j) => { if (r[j] !== undefined && r[j].trim() !== '') obj[h] = h === 'sku' ? r[j].trim() : r[j]; });
      if (!obj.sku) obj.sku = 'SKU-' + (idx + 1);
      return { sku: obj.sku, input: obj, result: unitEconomics(obj) };
    });
  }

  function bulkToCSV(results) {
    const head = [...SKU_FIELDS, ...OUT_FIELDS];
    const body = results.map(({ input, result }) => [
      ...SKU_FIELDS.map(f => f === 'sku' ? input.sku : num(input[f])),
      ...OUT_FIELDS.map(f => Number.isFinite(result[f]) ? result[f] : 'n/a')
    ]);
    return toCSV([head, ...body]);
  }

  return { PRESETS, SKU_FIELDS, OUT_FIELDS, num, round, unitEconomics, priceForTargetMargin, adScenarios, parseCSV, toCSV, bulkFromCSV, bulkToCSV };
});
