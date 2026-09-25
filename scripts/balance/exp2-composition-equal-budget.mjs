// scripts/balance/exp2-composition-equal-budget.mjs
//
// Эксперимент 2 протокола калибровки WDD/WCC/WBB (docs/known-issues.md #35):
// при фиксированном ТОКЕН-БЮДЖЕТЕ (SPAWN_COSTS) какая пропорция классов
// сильнее — правильна ли текущая цена относительно боевой ценности,
// подтверждённой экспериментом 1. Перебор составов, полностью
// расходующих бюджет (maximalSpendOnly — см. lib/compositions.mjs),
// попарные бои с зеркалированием, логистическая регрессия. Сравнение
// коэффициента (боевая ценность) с текущей ценой класса → предложение
// новых SPAWN_COSTS.
import { mirroredPair, silenceGameLogs, TURN_LIMIT } from './lib/harness.mjs';
import { createCsvWriter } from './lib/csv.mjs';
import { standardize, logisticFit } from './lib/regression.mjs';
import { enumerateByBudget, maximalSpendOnly, compLabel, CLASSES } from './lib/compositions.mjs';
import { SPAWN_COSTS } from '../../src/core/economyLogic.js';
import { writeFileSync } from 'node:fs';

silenceGameLogs();

const GAMES_PER_PAIR = Number(process.env.EXP2_GAMES || 10); // ×2 (mirror) = 20 партий на пару (по просьбе пользователя)
const MAP_SIZE = 18;
const FULL_MATRIX = process.env.EXP2_FULL_MATRIX !== '0';
const MAX_PAIRS = Number(process.env.EXP2_MAX_PAIRS || 0);
const TARGET_COMPS_MIN = 8;
const TARGET_COMPS_MAX = 12;

// Подбираем бюджет так, чтобы "полностью расходующих" составов было 8-12
// (протокол: "не 1-2 варианта и не сотня").
function findBudget() {
  const minCost = Math.min(SPAWN_COSTS.WDD, SPAWN_COSTS.WCC, SPAWN_COSTS.WBB);
  for (let budget = minCost; budget <= minCost * 40; budget += minCost) {
    const all = enumerateByBudget(budget, SPAWN_COSTS);
    const maximal = maximalSpendOnly(all, budget, SPAWN_COSTS);
    if (maximal.length >= TARGET_COMPS_MIN && maximal.length <= TARGET_COMPS_MAX) {
      return { budget, comps: maximal };
    }
  }
  // fallback — ближайшее к целевому диапазону, если точного попадания 8-12 не нашлось
  let best = null;
  for (let budget = minCost; budget <= minCost * 60; budget += minCost) {
    const all = enumerateByBudget(budget, SPAWN_COSTS);
    const maximal = maximalSpendOnly(all, budget, SPAWN_COSTS);
    if (!best || Math.abs(maximal.length - 10) < Math.abs(best.comps.length - 10)) {
      best = { budget, comps: maximal };
    }
  }
  return best;
}

const { budget, comps: allComps } = findBudget();
console.error(`Бюджет: ${budget} (SPAWN_COSTS: WDD=${SPAWN_COSTS.WDD}, WCC=${SPAWN_COSTS.WCC}, WBB=${SPAWN_COSTS.WBB}), составов: ${allComps.length}`);
allComps.forEach(c => console.error(`  ${compLabel(c)} cost=${c.cost}`));

function buildPairs() {
  const pairs = [];
  for (let i = 0; i < allComps.length; i++) {
    for (let j = i + 1; j < allComps.length; j++) {
      pairs.push([allComps[i], allComps[j]]);
    }
  }
  if (FULL_MATRIX) return pairs;
  const sampleSize = MAX_PAIRS || Math.min(pairs.length, allComps.length * 3);
  const shuffled = pairs.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, sampleSize);
}

let pairs = buildPairs();
if (MAX_PAIRS > 0) pairs = pairs.slice(0, MAX_PAIRS);

const date = new Date().toISOString().slice(0, 10);
const csv = createCsvWriter(
  `scripts/balance/results/${date}-exp2.csv`,
  ['pair_id', 'seed', 'mirror', 'pos_a', 'first_mover', 'comp_a_wdd', 'comp_a_wcc', 'comp_a_wbb', 'cost_a',
   'comp_b_wdd', 'comp_b_wcc', 'comp_b_wbb', 'cost_b', 'winner_label', 'turns', 'unresolved']
);

const totalGames = pairs.length * GAMES_PER_PAIR * 2;
console.error(`Пар: ${pairs.length} (${FULL_MATRIX ? 'полная матрица' : 'выборка'}), партий на пару: ${GAMES_PER_PAIR * 2}, всего партий: ${totalGames}`);

const regressionRows = [];
const winStats = {}; // compLabel -> {wins, games}
const mirrorPairTally = { A: 0, B: 0, split: 0, unresolved: 0 };
const t0 = Date.now();
let gamesDone = 0;

for (let pairId = 0; pairId < pairs.length; pairId++) {
  const [compA, compB] = pairs[pairId];
  const labelA = compLabel(compA), labelB = compLabel(compB);
  winStats[labelA] = winStats[labelA] || { wins: 0, games: 0 };
  winStats[labelB] = winStats[labelB] || { wins: 0, games: 0 };

  for (let s = 0; s < GAMES_PER_PAIR; s++) {
    const seed = pairId * 1000 + s + 1;
    const pair = await mirroredPair({ seed, size: MAP_SIZE, compA, compB });

    const winners = [];
    for (const r of pair) {
      csv.writeRow({
        pair_id: pairId, seed, mirror: r.mirror, pos_a: r.posA, first_mover: r.firstMoverLabel,
        comp_a_wdd: compA.WDD, comp_a_wcc: compA.WCC, comp_a_wbb: compA.WBB, cost_a: r.spentA,
        comp_b_wdd: compB.WDD, comp_b_wcc: compB.WCC, comp_b_wbb: compB.WBB, cost_b: r.spentB,
        winner_label: r.winnerLabel ?? 'draw', turns: r.turns, unresolved: r.unresolved,
      });
      if (!r.unresolved && r.winnerLabel) {
        regressionRows.push({
          dWdd: compA.WDD - compB.WDD, dWcc: compA.WCC - compB.WCC, dWbb: compA.WBB - compB.WBB,
          dSpend: compA.cost - compB.cost,
          aWon: r.winnerLabel === 'A' ? 1 : 0,
        });
        winStats[labelA].games++; winStats[labelB].games++;
        if (r.winnerLabel === 'A') winStats[labelA].wins++; else winStats[labelB].wins++;
      }
      winners.push(r.unresolved ? null : r.winnerLabel);
      gamesDone++;
    }
    if (winners[0] == null || winners[1] == null) mirrorPairTally.unresolved++;
    else if (winners[0] === winners[1]) mirrorPairTally[winners[0]]++;
    else mirrorPairTally.split++;
  }

  if ((pairId + 1) % 10 === 0 || pairId === pairs.length - 1) {
    const elapsed = (Date.now() - t0) / 1000;
    const rate = gamesDone / elapsed;
    const eta = (totalGames - gamesDone) / rate;
    console.error(`pair ${pairId + 1}/${pairs.length} [${labelA} vs ${labelB}] — ` +
      `${gamesDone}/${totalGames} games, ${elapsed.toFixed(0)}s elapsed, ETA ${eta.toFixed(0)}s`);
  }
}

await csv.close();

// dSpend (разница трат compA-compB) добавлена отдельной переменной —
// maximalSpendOnly допускает остаток до minCost-1 токенов, составы одной
// пары могут тратить неодинаковую сумму (замечание пользователя); так
// коэффициенты классов не смешиваются с эффектом "потратил чуть больше".
const X = regressionRows.map(r => [r.dWdd, r.dWcc, r.dWbb, r.dSpend]);
const y = regressionRows.map(r => r.aWon);
const { standardized, stds } = standardize(X);
const fit = logisticFit(standardized, y);
const rawCoeffs = CLASSES.map((c, i) => fit.coefficients[i] / stds[i]);
const rawSpendCoeff = fit.coefficients[3] / stds[3];

// Предложение новой цены: цена пропорциональна боевой ценности (raw
// коэффициент), с той же суммой цен, что сейчас (сохраняем общий масштаб
// экономики, меняем только относительные пропорции между классами). Цель —
// одинаковая "ценность за токен" (coeff/cost = const) у всех классов, это
// и даёт прямая пропорция cost ∝ coeff. НЕ вычитать минимум перед
// нормализацией — вычитание сдвигает шкалу так, будто у самого слабого
// класса ценность около нуля, хотя его raw-коэффициент (1.032 у WDD в
// первом прогоне) вполне положительный — из-за этого первая версия
// формулы предлагала обнулить цену WDD (5→1), что не отражало данные.
// Клампим к небольшому положительному минимуму перед нормализацией — на
// маленькой выборке (или у по-настоящему бесполезного класса) raw-коэффициент
// может уйти в отрицательную область, а цена юнита отрицательной/нулевой
// быть не может в принципе.
const currentTotal = SPAWN_COSTS.WDD + SPAWN_COSTS.WCC + SPAWN_COSTS.WBB;
const MIN_COEFF = 0.05;
const clampedCoeffs = rawCoeffs.map(v => Math.max(v, MIN_COEFF));
const coeffSum = clampedCoeffs.reduce((a, b) => a + b, 0);
const proposedCosts = Object.fromEntries(CLASSES.map((c, i) => [c, Math.round((clampedCoeffs[i] / coeffSum) * currentTotal)]));

const unresolvedCount = totalGames - regressionRows.length;

const lines = [];
lines.push('# Эксперимент 2 — состав при равном бюджете токенов (WDD/WCC/WBB)');
lines.push('');
lines.push(`Дата: ${date}. Бюджет: ${budget}, составов: ${allComps.length}, пар: ${pairs.length} (${FULL_MATRIX ? 'полная матрица' : 'выборка'}), партий на пару: ${GAMES_PER_PAIR * 2}, всего партий: ${totalGames}. Лимит ходов: ${TURN_LIMIT}. Нерешённых: ${unresolvedCount}/${totalGames}.`);
lines.push('');
lines.push('## Составы в бюджете');
allComps.forEach(c => lines.push(`- ${compLabel(c)}: cost=${c.cost}, winrate=${winStats[compLabel(c)] ? (100 * winStats[compLabel(c)].wins / winStats[compLabel(c)].games).toFixed(1) + '%' : 'н/д'} (${winStats[compLabel(c)]?.games ?? 0} игр)`));
lines.push('');
lines.push('| Класс | текущая цена | коэффициент (raw) | предложенная цена |');
lines.push('|---|---|---|---|');
CLASSES.forEach((c, i) => {
  lines.push(`| ${c} | ${SPAWN_COSTS[c]} | ${rawCoeffs[i].toFixed(3)} | ${proposedCosts[c]} |`);
});
lines.push('');
lines.push(`Коэффициент dSpend (контроль за неравенством трат внутри пары, из-за остатка < minCost при maximalSpendOnly): ${rawSpendCoeff.toFixed(3)} raw — если близко к 0, разница в остатке токенов не искажает коэффициенты классов выше.`);
lines.push('');
const mpTotal = mirrorPairTally.A + mirrorPairTally.B + mirrorPairTally.split + mirrorPairTally.unresolved;
lines.push(`Распределение зеркальных пар (1 seed = 2 партии): A выиграла обе ${mirrorPairTally.A}, B выиграла обе ${mirrorPairTally.B}, ` +
  `1:1 (split) ${mirrorPairTally.split}, хотя бы одна не решилась ${mirrorPairTally.unresolved} (всего ${mpTotal}).`);
lines.push('');
const winrates = Object.values(winStats).filter(s => s.games > 0).map(s => s.wins / s.games);
const minWr = Math.min(...winrates) * 100, maxWr = Math.max(...winrates) * 100;
lines.push(`Диапазон винрейтов между составами при ТЕКУЩЕЙ цене: ${minWr.toFixed(1)}%–${maxWr.toFixed(1)}% (целевой коридор протокола: 45-55%).`);

const summaryPath = `scripts/balance/results/${date}-exp2-summary.md`;
writeFileSync(summaryPath, lines.join('\n') + '\n');
console.error('\n' + lines.join('\n'));
console.error(`\nCSV: scripts/balance/results/${date}-exp2.csv`);
console.error(`Summary: ${summaryPath}`);
