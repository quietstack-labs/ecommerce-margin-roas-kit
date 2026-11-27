(function () {
  'use strict';
  const C = window.MarginCalc;
  const CFG = window.KIT_CONFIG || {};
  const $ = id => document.getElementById(id);

  const FIELDS = [
    ['price', 'Selling price', '판매가', 49],
    ['cogs', 'Product cost (COGS)', '상품 원가', 14],
    ['shipping', 'Shipping / fulfillment', '배송·풀필먼트비', 6],
    ['packaging', 'Packaging', '포장비', 1],
    ['otherCost', 'Other per-unit cost', '기타 개당 비용', 0],
    ['platformPct', 'Platform fee %', '플랫폼 수수료 %', 0],
    ['platformFixed', 'Platform fixed fee', '플랫폼 고정 수수료', 0],
    ['paymentPct', 'Payment fee %', '결제 수수료 %', 2.9],
    ['paymentFixed', 'Payment fixed fee', '결제 고정 수수료', 0.3],
    ['returnRatePct', 'Returns / refunds %', '반품·환불률 %', 3],
    ['taxPct', 'VAT/GST included in price %', '가격 포함 부가세 %', 0],
    ['adCostPerOrder', 'Ad cost per order (CPA)', '주문당 광고비(CPA)', 10],
    ['targetMarginPct', 'Target net margin %', '목표 순이익률 %', 20]
  ];

  const T = {
    en: {}, ko: {
      unit: '단위 경제성', preset: '플랫폼 프리셋', custom: '직접 입력', presetNote: '프리셋은 일반 공시 요율입니다. 본인 요금제·카테고리를 확인하세요.',
      results: '주문당 결과', netProfit: '순이익', margin: '순이익률', beRoas: '손익분기 ROAS', beCpa: '손익분기 CPA',
      scenarios: '광고비 시나리오', adBudget: '광고 예산', roasList: 'ROAS 값 (쉼표 구분)', bulk: '대량 SKU 계산기',
      bulkHint: '헤더가 있는 CSV를 붙여넣거나 파일을 불러오세요. 빠진 열은 위 입력값을 사용합니다.',
      calc: '계산', export: 'CSV 내보내기', template: '템플릿 받기', privacy: '모든 계산은 브라우저에서만 실행됩니다. 업로드 없음.', buy: '셀러 키트 받기'
    }
  };
  const EN = {};
  document.querySelectorAll('[data-i18n]').forEach(el => { EN[el.dataset.i18n] = el.textContent; });
  T.en = EN;

  const ROWS = {
    price: ['Price', '판매가'], taxAmount: ['VAT/GST', '부가세'], netRevenue: ['Net revenue', '순매출'],
    productCost: ['Product + shipping cost', '원가+배송'], platformFee: ['Platform fee', '플랫폼 수수료'],
    paymentFee: ['Payment fee', '결제 수수료'], returnsAllowance: ['Returns allowance', '반품 충당'],
    contribution: ['Profit before ads', '광고 전 이익'], adCostPerOrder: ['Ad cost per order', '주문당 광고비'],
    netProfit: ['Net profit', '순이익']
  };
  const SC_HEAD = { en: ['ROAS', 'Ad spend', 'Revenue', 'Orders', 'CPA', 'Profit', 'ROI'], ko: ['ROAS', '광고비', '매출', '주문수', 'CPA', '이익', 'ROI'] };
  const BULK_HEAD = { en: ['SKU', 'Price', 'Profit before ads', 'Net profit', 'Margin', 'BE ROAS', 'BE CPA'], ko: ['SKU', '판매가', '광고 전 이익', '순이익', '이익률', '손익분기 ROAS', '손익분기 CPA'] };

  let lang = CFG.defaultLang === 'ko' ? 'ko' : 'en';
  let currency = CFG.defaultCurrency || 'USD';
  let bulkResults = [];

  const load = (k, d) => { try { const v = localStorage.getItem('mrk-' + k); return v === null ? d : JSON.parse(v); } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem('mrk-' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } };
  lang = load('lang', lang); currency = load('currency', currency);

  const money = v => {
    if (!Number.isFinite(v)) return '∞';
    const dp = currency === 'KRW' || currency === 'JPY' ? 0 : 2;
    try { return new Intl.NumberFormat(lang === 'ko' ? 'ko-KR' : 'en-US', { style: 'currency', currency, maximumFractionDigits: dp, minimumFractionDigits: dp }).format(v); }
    catch { return v.toFixed(dp); }
  };
  const pct = v => Number.isFinite(v) ? v.toFixed(1) + '%' : '–';
  const x = v => Number.isFinite(v) ? v.toFixed(2) + 'x' : '∞';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Build inputs
  const saved = load('inputs', {});
  $('inputs').innerHTML = FIELDS.map(([k, en, ko, d]) =>
    `<label><span data-f="${k}">${lang === 'ko' ? ko : en}</span><input type="number" step="any" id="f-${k}" value="${saved[k] ?? d}"></label>`).join('');

  const readInputs = () => Object.fromEntries(FIELDS.map(([k]) => [k, $('f-' + k).value]));

  function render() {
    const inp = readInputs();
    save('inputs', inp);
    const r = C.unitEconomics(inp);
    $('k-profit').textContent = money(r.netProfit);
    $('k-profit').className = r.netProfit < 0 ? 'neg' : 'pos';
    $('k-margin').textContent = pct(r.marginPct);
    $('k-beroas').textContent = x(r.breakEvenROAS);
    $('k-becpa').textContent = money(r.breakEvenCPA);
    const L = lang === 'ko' ? 1 : 0;
    $('breakdown').innerHTML = Object.entries(ROWS).map(([k, lab]) => {
      const sign = ['taxAmount', 'productCost', 'platformFee', 'paymentFee', 'returnsAllowance', 'adCostPerOrder'].includes(k) ? '−' : '';
      const strong = k === 'contribution' || k === 'netProfit';
      return `<tr class="${strong ? 'strong' : ''}"><td>${lab[L]}</td><td>${sign}${money(r[k])}</td></tr>`;
    }).join('');
    const p = C.priceForTargetMargin(inp, inp.targetMarginPct);
    $('target-line').textContent = lang === 'ko'
      ? `목표 순이익률 ${inp.targetMarginPct}% 달성: 목표 ROAS ${x(r.targetROAS)}, 최대 CPA ${money(r.targetCPA)}, 현재 CPA 기준 필요 판매가 ${money(p)}`
      : `To hit ${inp.targetMarginPct}% net margin: target ROAS ${x(r.targetROAS)}, max CPA ${money(r.targetCPA)}, or price ${money(p)} at your current CPA.`;

    const roas = $('roas-list').value.split(',').map(s => s.trim()).filter(Boolean);
    const sc = C.adScenarios(inp, $('ad-budget').value, roas);
    $('scenarios').innerHTML = '<tr>' + SC_HEAD[lang].map(h => `<th>${h}</th>`).join('') + '</tr>' + sc.map(s =>
      `<tr class="${s.profitable ? 'ok' : 'bad'}"><td>${x(s.roas)}</td><td>${money(s.adSpend)}</td><td>${money(s.revenue)}</td><td>${s.orders}</td><td>${money(s.cpa)}</td><td>${money(s.profit)}</td><td>${pct(s.roi)}</td></tr>`).join('');
    save('scen', { b: $('ad-budget').value, r: $('roas-list').value });
  }

  function runBulk() {
    const inp = readInputs(); delete inp.price;
    try { bulkResults = C.bulkFromCSV($('bulk-input').value, inp); } catch (e) { bulkResults = []; }
    $('bulk-table').innerHTML = '<tr>' + BULK_HEAD[lang].map(h => `<th>${h}</th>`).join('') + '</tr>' + bulkResults.map(({ sku, result: r }) =>
      `<tr class="${r.netProfit >= 0 ? 'ok' : 'bad'}"><td>${esc(sku)}</td><td>${money(r.price)}</td><td>${money(r.contribution)}</td><td>${money(r.netProfit)}</td><td>${pct(r.marginPct)}</td><td>${x(r.breakEvenROAS)}</td><td>${money(r.breakEvenCPA)}</td></tr>`).join('');
  }

  function download(name, text) {
    const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  function applyLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => { const v = T[lang][el.dataset.i18n]; if (v) el.textContent = v; });
    FIELDS.forEach(([k, en, ko]) => { document.querySelector(`[data-f="${k}"]`).textContent = lang === 'ko' ? ko : en; });
    $('lang').textContent = lang === 'ko' ? 'English' : '한국어';
    render(); runBulk();
  }

  // Events
  $('inputs').addEventListener('input', () => { $('preset').value = 'custom'; render(); });
  $('preset').addEventListener('change', e => {
    const p = C.PRESETS[e.target.value]; if (!p) return;
    if (e.target.value !== 'custom') Object.entries(p).forEach(([k, v]) => { $('f-' + k).value = v; });
    render();
  });
  ['ad-budget', 'roas-list'].forEach(id => $(id).addEventListener('input', render));
  $('lang').addEventListener('click', () => { lang = lang === 'ko' ? 'en' : 'ko'; save('lang', lang); applyLang(); });
  $('currency').addEventListener('change', e => { currency = e.target.value; save('currency', currency); render(); runBulk(); });
  $('bulk-run').addEventListener('click', runBulk);
  $('bulk-file').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const rd = new FileReader(); rd.onload = () => { $('bulk-input').value = rd.result; runBulk(); }; rd.readAsText(f);
  });
  $('bulk-export').addEventListener('click', () => { runBulk(); download('sku-profit-report.csv', C.bulkToCSV(bulkResults)); });
  $('bulk-template').addEventListener('click', () => download('sku-template.csv', C.toCSV([C.SKU_FIELDS, ['SKU-001', 29, 8.5, 4.2, 0.6, 0, 0, 0, 2.9, 0.3, 3, 0, 6, 20]])));

  // Init
  $('currency').value = currency;
  const sc = load('scen', null); if (sc) { $('ad-budget').value = sc.b; $('roas-list').value = sc.r; }
  if (CFG.buyUrl) $('buy-link').href = CFG.buyUrl; else $('buy-link').hidden = true;
  if (CFG.brand) document.querySelector('.brand').textContent = CFG.brand;
  applyLang();
})();
