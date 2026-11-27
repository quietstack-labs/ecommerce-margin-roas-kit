# Margin & ROAS Kit

💼 **Get the full kit:** [E-Commerce Profit, Margin & Break-Even ROAS Kit ($15)](https://playmaster72.gumroad.com/l/ecommerce-margin-roas-kit) — spreadsheet templates, pricing playbook and commercial license.


A profit calculator for e-commerce sellers and the marketers who run their ads. It works for Shopify, Amazon, Etsy, eBay, TikTok Shop, Naver SmartStore, Coupang and your own DTC store. It runs in the browser, needs no install, and sends nothing anywhere.

**Live demo:** https://quietstack-labs.github.io/ecommerce-margin-roas-kit/

## What it calculates

- **Per-order profit:** net revenue after VAT/GST, platform fees (% + fixed), payment fees (% + fixed), COGS, shipping, packaging, other costs, a returns allowance and ad cost per order
- **Net margin %, contribution margin % and markup %**
- **Break-even ROAS, break-even ACoS and break-even CPA:** the most you can pay for an order before you lose money
- **Target ROAS and CPA** for any net margin goal, plus the **price you would need** to reach that margin at your current CPA
- **Ad spend scenarios:** orders, revenue, CPA, profit and ROI for a budget across any list of ROAS values
- **Bulk SKU calculator:** paste or load a CSV with hundreds of SKUs, see which ones lose money, and export a full report to CSV (opens cleanly in Excel, with UTF-8 BOM and formula-injection protection)
- **English / Korean toggle** and USD, KRW, EUR, GBP and JPY formatting

## Formulas

| Metric | Formula |
| --- | --- |
| Net revenue | price − VAT included in price (`price − price / (1 + VAT%)`) |
| Fees | `price × platform% + platform fixed` + `price × payment% + payment fixed` |
| Profit before ads (contribution) | net revenue − product cost − fees − returns allowance |
| Net profit | contribution − ad cost per order |
| Break-even ROAS | `price / contribution` |
| Break-even CPA | contribution |
| Target ROAS | `price / (contribution − target margin × net revenue)` |
| Scenario profit | `(budget × ROAS / price) × contribution − budget` |

## Run it

Open `index.html` in any browser. That's all.

To host it: push the folder to GitHub and turn on Pages, or drag it into Netlify Drop or Cloudflare Pages.

## Rebrand it

Edit `config.js`: brand name, default currency, default language and your buy link.

## Bulk CSV columns

`sku, price, cogs, shipping, packaging, otherCost, platformPct, platformFixed, paymentPct, paymentFixed, returnRatePct, taxPct, adCostPerOrder, targetMarginPct`

Only `price` is required. Columns you leave out use the values on the main form. See `samples/`.

## Tests

```
npm test
```

Node 18+ runs 16 unit tests covering every profit, fee, VAT, ROAS, scenario and CSV function. No packages to install.

## Files

- `index.html`, `styles.css`, `app.js`: the app
- `calc.js`: all of the math, as pure functions you can reuse in Node or the browser
- `config.js`: white-label settings
- `docs/PLAYBOOK.md` (paid kit): how to use the numbers to set prices and ad bids
- `samples/` (paid kit): example SKU CSV files
- `test/`: unit tests

Fee presets are typical published rates and change often. Check your own plan, category and region before you rely on them.
