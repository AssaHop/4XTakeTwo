// scripts/balance/exp-mixed-composition.mjs
//
// Протокол v2 (scripts/balance/protocol-v2.md), шаг 5 — проверка ДВУХ
// кандидатных цен на смешанных составах. Цены НЕ применяются к игре
// (economyLogic.js не трогается этим скриптом) — только сравниваются
// между собой по критерию "у всех составов среднего винрейта 40-60%
// против всех остальных".
//
// Цена A: WDD:5/WCC:7/WBB:14, бюджет 42.
// Цена B: WDD:5/WCC:7/WBB:12, бюджет 36.
// Составы — maximalSpendOnly (остаток < цены самого дешёвого юнита=5),
// полная матрица пар, карта 12.
import { mirroredPair, silenceGameLogs, DEFAULT_MAP_SIZE } from './lib/harness.mjs';
import { createCsvWriter } from './lib/csv.mjs';
import { enumerateByBudget, maximalSpendOnly, compLabel } from './lib/compositions.mjs';
import { writeFileSync } from 'node:fs';

silenceGameLogs();

const MAP_SIZE = DEFAULT_MAP_SIZE;
const MAX_UNITS = 10;
const PILOT_SEEDS = Number(process.env.MIXED_PILOT_SEEDS || 5); // ×2 = 10 партий/пару в пилоте
const FULL_SEEDS = Number(process.env.MIXED_SEEDS || 20); // ×2 = 40 партий/пару
const PILOT_ONLY = process.env.MIXED_PILOT_ONLY === '1';

const PRICES = [
  { label: 'A', price: { WDD: 5, WCC: 7, WBB: 14 }, budget: 42 },
  { label: 'B', price: { WDD: 5, WCC: 7, WBB: 12 }, budget: 36 },
];

function compsFor(price, budget) {
  const all = enumerateByBudget(budget, price);
  const maximal = maximalSpendOnly(all, budget, price).filter(c => (c.WDD + c.WCC + c.WBB) <= MAX_UNITS);
  return maximal;
}

function isWddHeavy(c) {
  return c.WDD > c.WCC && c.WDD > c.WBB;
}

async function runMatrix(comps, seeds, csv, priceLabel) {
  const pairs = [];
  for (let i = 0; i < comps.length; i++) for (let j = i + 1; j < comps.length; j++) pairs.push([comps[i], comps[j]]);

  const winStats = {}; // label -> {wins, games, comp}
  for (const c of comps) winStats[compLabel(c)] = { wins: 0, games: 0, comp: c };

  const diagnosticPairs = []; // {a,b,rateA} где rateA<30 или >70

  const t0 = Date.now();
  const totalGames = pairs.length * seeds * 2;
  let gamesDone = 0;

  for (let pi = 0; pi < pairs.length; pi++) {
    const [compA, compB] = pairs[pi];
    const labelA = compLabel(compA), labelB = compLabel(compB);
    let aWins = 0, decisive = 0;

    for (let s = 1; s <= seeds; s++) {
      const [g0, g1] = await mirroredPair({ seed: s, size: MAP_SIZE, compA, compB });
      for (const r of [g0, g1]) {
        csv.writeRow({
          price: priceLabel, pair_id: pi, seed: s, mirror: r.mirror, pos_a: r.posA,
          comp_a: labelA, comp_b: labelB, cost_a: r.spentA, cost_b: r.spentB,
          winner_label: r.winnerLabel ?? 'draw', turns: r.turns, unresolved: r.unresolved,
        });
        if (!r.unresolved && r.winnerLabel) {
          decisive++;
          winStats[labelA].games++; winStats[labelB].games++;
          if (r.winnerLabel === 'A') { winStats[labelA].wins++; aWins++; }
          else { winStats[labelB].wins++; }
        }
        gamesDone++;
      }
    }

    const rateA = decisive ? 100 * aWins / decisive : NaN;
    if (rateA < 30 || rateA > 70) diagnosticPairs.push({ a: labelA, b: labelB, rateA, decisive });

    if ((pi + 1) % 20 === 0 || pi === pairs.length - 1) {
      const elapsed = (Date.now() - t0) / 1000;
      const rate = gamesDone / elapsed;
      const eta = (totalGames - gamesDone) / rate;
      console.error(`  [цена ${priceLabel}] пара ${pi + 1}/${pairs.length} — ${gamesDone}/${totalGames} games, ${elapsed.toFixed(0)}s elapsed, ETA ${eta.toFixed(0)}s`);
    }
  }

  return { winStats, diagnosticPairs, totalGames, pairsCount: pairs.length };
}

async function evaluatePrice({ label, price, budget }, seeds, csvPrefix) {
  const comps = compsFor(price, budget);
  console.error(`\n=== Цена ${label} (WDD:${price.WDD}/WCC:${price.WCC}/WBB:${price.WBB}, бюджет ${budget}): ${comps.length} составов, ${comps.length * (comps.length - 1) / 2} пар ===`);
  const csv = createCsvWriter(`scripts/balance/results/${csvPrefix}-mixed-price-${label}.csv`,
    ['price', 'pair_id', 'seed', 'mirror', 'pos_a', 'comp_a', 'comp_b', 'cost_a', 'cost_b', 'winner_label', 'turns', 'unresolved']);
  const result = await runMatrix(comps, seeds, csv, label);
  await csv.close();
  return { label, price, budget, comps, ...result };
}

function summarize(evalResult) {
  const rows = Object.values(evalResult.winStats).map(s => ({
    label: compLabel(s.comp), cost: s.comp.cost, games: s.games,
    rate: s.games ? 100 * s.wins / s.games : NaN,
    wdd: s.comp.WDD, wcc: s.comp.WCC, wbb: s.comp.WBB,
  }));
  const rates = rows.map(r => r.rate).filter(r => !Number.isNaN(r));
  const inBand = rows.filter(r => r.rate >= 40 && r.rate <= 60).length;
  const wddHeavy = rows.filter(r => isWddHeavy(r) || (r.wdd > r.wcc && r.wdd > r.wbb));
  const wddHeavyAvg = wddHeavy.length ? wddHeavy.reduce((s, r) => s + r.rate, 0) / wddHeavy.length : NaN;
  return {
    rows,
    minRate: Math.min(...rates), maxRate: Math.max(...rates),
    inBandCount: inBand, totalComps: rows.length,
    wddHeavyCount: wddHeavy.length, wddHeavyAvgRate: wddHeavyAvg,
  };
}

// ---- Пилот ----
console.error('=== ПИЛОТ ===');
let pilotOk = true;
for (const cfg of PRICES) {
  const evalResult = await evaluatePrice(cfg, PILOT_SEEDS, '_pilot');
  // winStats[label].games считает partии ОБЕИХ сторон пары (инкремент и у
  // A, и у B в каждой решённой партии) — сумма вдвое больше реального
  // числа решённых партий, делим на 2.
  const decisiveGames = Object.values(evalResult.winStats).reduce((s, w) => s + w.games, 0) / 2;
  const unresolvedShare = 1 - decisiveGames / evalResult.totalGames;
  console.error(`  Цена ${cfg.label}: нерешённых ~${(100 * unresolvedShare).toFixed(1)}%`);
  if (unresolvedShare > 0.15) pilotOk = false;
}
if (!pilotOk) { console.error('ПИЛОТ: высокая доля нерешённых — остановка.'); process.exit(1); }
console.error('Пилот пройден — переходим к полному прогону.\n');

if (PILOT_ONLY) { console.error('MIXED_PILOT_ONLY=1 — остановка после пилота.'); process.exit(0); }

// ---- Полный прогон ----
const date = new Date().toISOString().slice(0, 10);
const evaluations = [];
for (const cfg of PRICES) {
  const evalResult = await evaluatePrice(cfg, FULL_SEEDS, date);
  evaluations.push(evalResult);
}

// ---- Отчёт ----
const lines = [];
lines.push('# Эксперимент "смешанные составы" (протокол v2, шаг 5) — сравнение цен A и B');
lines.push('');
lines.push(`Дата: ${date}. Карта: размер ${MAP_SIZE}. ${FULL_SEEDS * 2} партий/пару. Цены НЕ применены к игре — только сравнение между собой.`);
lines.push('');

for (const evalResult of evaluations) {
  const s = summarize(evalResult);
  lines.push(`## Цена ${evalResult.label} (WDD:${evalResult.price.WDD}/WCC:${evalResult.price.WCC}/WBB:${evalResult.price.WBB}, бюджет ${evalResult.budget})`);
  lines.push('');
  lines.push(`Составов: ${s.totalComps}, пар: ${evalResult.pairsCount}, партий: ${evalResult.totalGames}.`);
  lines.push(`Диапазон средних винрейтов: ${s.minRate.toFixed(1)}%-${s.maxRate.toFixed(1)}%. В коридоре 40-60%: ${s.inBandCount}/${s.totalComps} составов.`);
  lines.push(`WDD-преобладающие составы (WDD > WCC и WDD > WBB): ${s.wddHeavyCount} шт, средний винрейт ${s.wddHeavyAvgRate.toFixed(1)}%.`);
  lines.push('');
  lines.push('| Состав | Цена | Партий | Винрейт |');
  lines.push('|---|---|---|---|');
  for (const r of s.rows.sort((a, b) => a.rate - b.rate)) {
    const mark = (r.rate >= 40 && r.rate <= 60) ? '' : ' ⚠️';
    lines.push(`| ${r.label} | ${r.cost} | ${r.games} | ${r.rate.toFixed(1)}%${mark} |`);
  }
  lines.push('');
  lines.push(`Диагностика — пары за пределами 70/30 (не провал критерия, критерий на среднем винрейте состава, не на паре): ${evalResult.diagnosticPairs.length} из ${evalResult.pairsCount}.`);
  if (evalResult.diagnosticPairs.length) {
    lines.push('');
    for (const d of evalResult.diagnosticPairs.slice(0, 20)) {
      lines.push(`- ${d.a} vs ${d.b}: ${d.rateA.toFixed(1)}% / ${(100 - d.rateA).toFixed(1)}% (n=${d.decisive})`);
    }
    if (evalResult.diagnosticPairs.length > 20) lines.push(`- ... и ещё ${evalResult.diagnosticPairs.length - 20}`);
  }
  lines.push('');
}

lines.push('## Итог — какая цена ближе к критерию (40-60% у ВСЕХ составов)');
lines.push('');
for (const evalResult of evaluations) {
  const s = summarize(evalResult);
  lines.push(`- Цена ${evalResult.label}: ${s.inBandCount}/${s.totalComps} в коридоре, диапазон ${s.minRate.toFixed(1)}-${s.maxRate.toFixed(1)}%.`);
}

const summaryPath = `scripts/balance/results/${date}-exp-mixed-composition-summary.md`;
writeFileSync(summaryPath, lines.join('\n') + '\n');
console.error('\n' + lines.join('\n'));
console.error(`\nSummary: ${summaryPath}`);
