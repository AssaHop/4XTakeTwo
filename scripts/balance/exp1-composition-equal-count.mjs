// scripts/balance/exp1-composition-equal-count.mjs
//
// Эксперимент 1 протокола калибровки WDD/WCC/WBB (docs/known-issues.md #35):
// при фиксированном ЧИСЛЕ юнитов (без экономики/цены) какая ПРОПОРЦИЯ
// классов сильнее. Перебор всех составов [wdd,wcc,wbb] с суммой TOTAL=6,
// попарные бои с зеркалированием, логистическая регрессия
// P(победа стороны 1) ~ Δwdd + Δwcc + Δwbb. Статы читаются из
// classTemplates.js на момент запуска — предполагается, что это ПОСЛЕ
// решения пользователя по итогам эксперимента B (см. lib/harness.mjs).
import { mirroredPair, silenceGameLogs, TURN_LIMIT } from './lib/harness.mjs';
import { createCsvWriter } from './lib/csv.mjs';
import { standardize, logisticFit } from './lib/regression.mjs';
import { enumerateByCount, compToArray, compLabel, CLASSES } from './lib/compositions.mjs';
import { writeFileSync } from 'node:fs';

silenceGameLogs();

const TOTAL = Number(process.env.EXP1_TOTAL || 6);
const GAMES_PER_PAIR = Number(process.env.EXP1_GAMES || 5); // ×2 (mirror) = 10 партий на пару
const MAP_SIZE = 18;
const FULL_MATRIX = process.env.EXP1_FULL_MATRIX !== '0'; // по умолчанию полная матрица пар
const MAX_PAIRS = Number(process.env.EXP1_MAX_PAIRS || 0); // 0 = без ограничения (кроме FULL_MATRIX=0 сэмплирования)

const allComps = enumerateByCount(TOTAL);
console.error(`Составов при total=${TOTAL}: ${allComps.length}`);

function buildPairs() {
  const pairs = [];
  for (let i = 0; i < allComps.length; i++) {
    for (let j = i + 1; j < allComps.length; j++) {
      pairs.push([allComps[i], allComps[j]]);
    }
  }
  if (FULL_MATRIX) return pairs;
  // Случайная выборка без полной матрицы (сигнал протокола: время не позволяет).
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
  `scripts/balance/results/${date}-exp1.csv`,
  ['pair_id', 'seed', 'mirror', 'pos_a', 'first_mover', 'comp_a_wdd', 'comp_a_wcc', 'comp_a_wbb',
   'comp_b_wdd', 'comp_b_wcc', 'comp_b_wbb', 'winner_label', 'turns', 'unresolved']
);

const totalGames = pairs.length * GAMES_PER_PAIR * 2;
console.error(`Пар: ${pairs.length} (${FULL_MATRIX ? 'полная матрица' : 'выборка'}), партий на пару: ${GAMES_PER_PAIR * 2}, всего партий: ${totalGames}`);

const regressionRows = []; // { dWdd, dWcc, dWbb, aWon }
// mirrorPairTally — на уровне ОДНОЙ зеркальной пары (2 партии, 1 seed):
// 'A' — A выиграла обе, 'B' — B выиграла обе, 'split' — по разу каждая,
// 'unresolved' — хотя бы одна партия не решилась. Много 'split' = позиция/
// первый ход решают больше, чем состав (протокол, п.5).
const mirrorPairTally = { A: 0, B: 0, split: 0, unresolved: 0 };
const t0 = Date.now();
let gamesDone = 0;

for (let pairId = 0; pairId < pairs.length; pairId++) {
  const [compA, compB] = pairs[pairId];
  const arrA = compToArray(compA);
  const arrB = compToArray(compB);

  for (let s = 0; s < GAMES_PER_PAIR; s++) {
    const seed = pairId * 1000 + s + 1;
    const pair = await mirroredPair({ seed, size: MAP_SIZE, compA: arrA, compB: arrB });

    const winners = [];
    for (const r of pair) {
      csv.writeRow({
        pair_id: pairId, seed, mirror: r.mirror, pos_a: r.posA, first_mover: r.firstMoverLabel,
        comp_a_wdd: compA.WDD, comp_a_wcc: compA.WCC, comp_a_wbb: compA.WBB,
        comp_b_wdd: compB.WDD, comp_b_wcc: compB.WCC, comp_b_wbb: compB.WBB,
        winner_label: r.winnerLabel ?? 'draw', turns: r.turns, unresolved: r.unresolved,
      });
      if (!r.unresolved && r.winnerLabel) {
        regressionRows.push({
          dWdd: compA.WDD - compB.WDD, dWcc: compA.WCC - compB.WCC, dWbb: compA.WBB - compB.WBB,
          aWon: r.winnerLabel === 'A' ? 1 : 0,
        });
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
    console.error(`pair ${pairId + 1}/${pairs.length} [${compLabel(compA)} vs ${compLabel(compB)}] — ` +
      `${gamesDone}/${totalGames} games, ${elapsed.toFixed(0)}s elapsed, ETA ${eta.toFixed(0)}s`);
  }
}

await csv.close();

const X = regressionRows.map(r => [r.dWdd, r.dWcc, r.dWbb]);
const y = regressionRows.map(r => r.aWon);
const { standardized, stds } = standardize(X);
const fit = logisticFit(standardized, y);

const unresolvedCount = pairs.length * GAMES_PER_PAIR * 2 - regressionRows.length;

const lines = [];
lines.push('# Эксперимент 1 — состав при равном числе юнитов (WDD/WCC/WBB)');
lines.push('');
lines.push(`Дата: ${date}. total=${TOTAL}, составов: ${allComps.length}, пар: ${pairs.length} (${FULL_MATRIX ? 'полная матрица' : 'выборка'}), партий на пару: ${GAMES_PER_PAIR * 2}, всего партий: ${totalGames}. Лимит ходов: ${TURN_LIMIT}. Нерешённых: ${unresolvedCount}/${totalGames}.`);
lines.push('');
lines.push('| Класс | коэффициент (станд.) | raw (per unit) |');
lines.push('|---|---|---|');
CLASSES.forEach((c, i) => {
  lines.push(`| ${c} | ${fit.coefficients[i].toFixed(3)} | ${(fit.coefficients[i] / stds[i]).toFixed(3)} |`);
});
lines.push('');
lines.push(`intercept: ${fit.intercept.toFixed(3)}`);
lines.push('');
lines.push('Коэффициент — предельный вклад одной доп. единицы класса в logit(P(победа)) при равном общем числе юнитов, независимо от токенов.');
lines.push('');
const mpTotal = mirrorPairTally.A + mirrorPairTally.B + mirrorPairTally.split + mirrorPairTally.unresolved;
lines.push(`Распределение зеркальных пар (1 seed = 2 партии, состав меняет позицию/очерёдность хода): ` +
  `A выиграла обе ${mirrorPairTally.A}, B выиграла обе ${mirrorPairTally.B}, 1:1 (split) ${mirrorPairTally.split}, ` +
  `хотя бы одна не решилась ${mirrorPairTally.unresolved} (всего ${mpTotal} зеркальных пар). ` +
  `Высокая доля split = позиция/первый ход решают больше, чем состав (протокол, п.5).`);

const summaryPath = `scripts/balance/results/${date}-exp1-summary.md`;
writeFileSync(summaryPath, lines.join('\n') + '\n');
console.error('\n' + lines.join('\n'));
console.error(`\nCSV: scripts/balance/results/${date}-exp1.csv`);
console.error(`Summary: ${summaryPath}`);
