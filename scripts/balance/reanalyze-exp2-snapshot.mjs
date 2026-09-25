// scripts/balance/reanalyze-exp2-snapshot.mjs
//
// Протокол v2, шаг 0.2: пересчитать УЖЕ СУЩЕСТВУЮЩИЙ
// results/2026-09-25-exp2.csv (бюджет 30, цены 5/8/12 — тот CSV, на
// котором в сессии 12 обучалась регрессия) новым методом анализа —
// средний винрейт КАЖДОГО состава против ВСЕХ остальных, не регрессия
// на коэффициентах. Без новых партий, это снимок "до" для сравнения с
// результатом после протокола v2 (см. scripts/balance/protocol-v2.md,
// шаг 0.2 и критерий шага 5: "у всех составов 40-60%").
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = 'scripts/balance/results/2026-09-25-exp2.csv';
const raw = readFileSync(SRC, 'utf8').trim().split('\n');
const header = raw[0].split(',');
const rows = raw.slice(1).map(line => {
  const cells = line.split(',');
  return Object.fromEntries(header.map((h, i) => [h, cells[i]]));
});

function compLabel(wdd, wcc, wbb) {
  return `${wdd}w${wcc}c${wbb}b`;
}

// Собираем для каждого состава: {games, wins, totalSpent}
const stats = {};

for (const r of rows) {
  const unresolved = r.unresolved === 'true';
  const labelA = compLabel(r.comp_a_wdd, r.comp_a_wcc, r.comp_a_wbb);
  const labelB = compLabel(r.comp_b_wdd, r.comp_b_wcc, r.comp_b_wbb);
  stats[labelA] = stats[labelA] || { games: 0, wins: 0, spentSum: 0, spentN: 0 };
  stats[labelB] = stats[labelB] || { games: 0, wins: 0, spentSum: 0, spentN: 0 };

  if (r.cost_a) { stats[labelA].spentSum += Number(r.cost_a); stats[labelA].spentN++; }
  if (r.cost_b) { stats[labelB].spentSum += Number(r.cost_b); stats[labelB].spentN++; }

  if (unresolved) continue;
  stats[labelA].games++;
  stats[labelB].games++;
  if (r.winner_label === 'A') stats[labelA].wins++;
  else if (r.winner_label === 'B') stats[labelB].wins++;
}

const lines = [];
lines.push('# Пересчёт exp2 (бюджет=30, цена 5/8/12) — средний винрейт состава против всех (протокол v2, метод шага 5)');
lines.push('');
lines.push('Снимок "до" (протокол v2, шаг 0.2) — без новых партий, тот же CSV сессии 12, только новый метод анализа: средний винрейт против ВСЕХ противников, не регрессия на коэффициентах.');
lines.push('');
lines.push('| Состав | партий | винрейт | средний расход |');
lines.push('|---|---|---|---|');
const labels = Object.keys(stats).sort();
for (const label of labels) {
  const s = stats[label];
  const wr = s.games ? (100 * s.wins / s.games).toFixed(1) + '%' : 'н/д';
  const avgSpent = s.spentN ? (s.spentSum / s.spentN).toFixed(1) : 'н/д';
  lines.push(`| ${label} | ${s.games} | ${wr} | ${avgSpent} |`);
}
lines.push('');
const winrates = labels.map(l => stats[l].games ? stats[l].wins / stats[l].games : null).filter(v => v != null);
const minWr = Math.min(...winrates) * 100, maxWr = Math.max(...winrates) * 100;
lines.push(`Диапазон средних винрейтов по составам: ${minWr.toFixed(1)}%-${maxWr.toFixed(1)}% (критерий протокола v2, шаг 5: 40-60% у ВСЕХ составов).`);

const outPath = 'scripts/balance/results/2026-09-25-exp2-snapshot-before-v2.md';
writeFileSync(outPath, lines.join('\n') + '\n');
console.error(lines.join('\n'));
console.error(`\nWritten: ${outPath}`);
