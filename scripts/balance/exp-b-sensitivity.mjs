// scripts/balance/exp-b-sensitivity.mjs
//
// Эксперимент B протокола калибровки WDD/WCC/WBB (docs/known-issues.md #35):
// чувствительность исхода боя к HP/ATK/DEF каждого класса. Симметричный
// состав [WDD×2, WCC×2, WBB×1] на обе стороны, обеим сторонам один и тот же
// случайный набор статов X (±30% от classTemplates.js) на партию — метрика
// не "кто выиграл" (стороны симметричны), а доля выживших юнитов каждого
// класса к концу партии/лимиту ходов. Регрессия (МНК, стандартизованные
// предикторы) отдельно на класс: survival_share ~ HP + ATK + DEF.
import { mirroredPair, silenceGameLogs, TURN_LIMIT } from './lib/harness.mjs';
import { createCsvWriter } from './lib/csv.mjs';
import { standardize, olsFit } from './lib/regression.mjs';
import { createSeededRNG } from '../../src/utils/islandBuilder.js';
import { ClassTemplates } from '../../src/core/classTemplates.js';
import { writeFileSync } from 'node:fs';

silenceGameLogs();

const CLASSES = ['WDD', 'WCC', 'WBB'];
const COMP = ['WDD', 'WDD', 'WCC', 'WCC', 'WBB'];
const NUM_CONFIGS = Number(process.env.EXPB_CONFIGS || 100);
const SEEDS_PER_CONFIG = Number(process.env.EXPB_SEEDS || 5); // ×2 (mirror) = 10 games/config
const MAP_SIZE = 18;
const VARIATION = 0.30;

const BASELINE = Object.fromEntries(CLASSES.map(c => [c, {
  hp: ClassTemplates[c].hp, atk: ClassTemplates[c].atDamage, def: ClassTemplates[c].def,
}]));

function round1(v) { return Math.round(v * 10) / 10; }

function sampleConfig(rng) {
  const cfg = {};
  for (const c of CLASSES) {
    const b = BASELINE[c];
    cfg[c] = {
      hp: round1(b.hp * (1 + (rng() * 2 - 1) * VARIATION)),
      atk: round1(b.atk * (1 + (rng() * 2 - 1) * VARIATION)),
      def: round1(b.def * (1 + (rng() * 2 - 1) * VARIATION)),
    };
  }
  return cfg;
}

const date = new Date().toISOString().slice(0, 10);
const csv = createCsvWriter(
  `scripts/balance/results/${date}-exp-b.csv`,
  ['config_id', 'seed', 'mirror', 'side', 'pos', 'first_mover',
   'wdd_hp', 'wdd_atk', 'wdd_def', 'wcc_hp', 'wcc_atk', 'wcc_def', 'wbb_hp', 'wbb_atk', 'wbb_def',
   'wdd_start', 'wdd_end', 'wcc_start', 'wcc_end', 'wbb_start', 'wbb_end',
   'turns', 'unresolved']
);

// per-config aggregated survival shares, для регрессии
const perConfig = []; // { config, shares: {WDD:[...], WCC:[...], WBB:[...]} }

const configRng = createSeededRNG(12345);
const t0 = Date.now();
let gamesDone = 0;
const totalGames = NUM_CONFIGS * SEEDS_PER_CONFIG * 2;

for (let configId = 0; configId < NUM_CONFIGS; configId++) {
  const cfg = sampleConfig(configRng);
  const statOverrides = Object.fromEntries(CLASSES.map(c => [c, cfg[c]]));
  const shares = { WDD: [], WCC: [], WBB: [] };

  for (let s = 0; s < SEEDS_PER_CONFIG; s++) {
    const seed = configId * 1000 + s + 1;
    const pair = await mirroredPair({
      seed, size: MAP_SIZE, compA: COMP, compB: COMP,
      statOverridesA: statOverrides, statOverridesB: statOverrides,
    });

    for (let mirror = 0; mirror < 2; mirror++) {
      const r = pair[mirror];
      for (const [label, start, end] of [['A', r.startLabelA, r.endLabelA], ['B', r.startLabelB, r.endLabelB]]) {
        const pos = label === 'A' ? r.posA : (r.posA === 'P1' ? 'P2' : 'P1');
        csv.writeRow({
          config_id: configId, seed, mirror, side: label, pos, first_mover: r.firstMoverLabel,
          wdd_hp: cfg.WDD.hp, wdd_atk: cfg.WDD.atk, wdd_def: cfg.WDD.def,
          wcc_hp: cfg.WCC.hp, wcc_atk: cfg.WCC.atk, wcc_def: cfg.WCC.def,
          wbb_hp: cfg.WBB.hp, wbb_atk: cfg.WBB.atk, wbb_def: cfg.WBB.def,
          wdd_start: start.WDD || 0, wdd_end: end.WDD || 0,
          wcc_start: start.WCC || 0, wcc_end: end.WCC || 0,
          wbb_start: start.WBB || 0, wbb_end: end.WBB || 0,
          turns: r.turns, unresolved: r.unresolved,
        });
        for (const c of CLASSES) {
          const st = start[c] || 0;
          if (st > 0) shares[c].push((end[c] || 0) / st);
        }
      }
      gamesDone++;
    }
  }

  perConfig.push({ cfg, shares });

  if ((configId + 1) % 10 === 0 || configId === NUM_CONFIGS - 1) {
    const elapsed = (Date.now() - t0) / 1000;
    const rate = gamesDone / elapsed;
    const eta = (totalGames - gamesDone) / rate;
    console.error(`config ${configId + 1}/${NUM_CONFIGS} — ${gamesDone}/${totalGames} games, ` +
      `${elapsed.toFixed(0)}s elapsed, ETA ${eta.toFixed(0)}s`);
  }
}

await csv.close();

// ---- Регрессия: отдельно на класс, survival_share ~ HP + ATK + DEF ----
const results = {};
for (const c of CLASSES) {
  const X = [];
  const y = [];
  for (const { cfg, shares } of perConfig) {
    const avgShare = shares[c].length ? shares[c].reduce((a, b) => a + b, 0) / shares[c].length : null;
    if (avgShare == null) continue;
    X.push([cfg[c].hp, cfg[c].atk, cfg[c].def]);
    y.push(avgShare);
  }
  const { standardized } = standardize(X);
  const fit = olsFit(standardized, y);
  results[c] = { n: X.length, intercept: fit.intercept, betaHp: fit.coefficients[0], betaAtk: fit.coefficients[1], betaDef: fit.coefficients[2] };
}

let unresolvedTotal = 0, rowsTotal = 0;
for (const { shares } of perConfig) rowsTotal += 1;

const summaryLines = [];
summaryLines.push(`# Эксперимент B — чувствительность статов WDD/WCC/WBB`);
summaryLines.push('');
summaryLines.push(`Дата: ${date}. Конфигов: ${NUM_CONFIGS}, партий на конфиг: ${SEEDS_PER_CONFIG * 2} (${SEEDS_PER_CONFIG} сидов × зеркалирование). Всего партий: ${totalGames}. Лимит ходов: ${TURN_LIMIT}.`);
summaryLines.push('');
summaryLines.push('| Класс | n конфигов | β(HP) | β(ATK) | β(DEF) |');
summaryLines.push('|---|---|---|---|---|');
for (const c of CLASSES) {
  const r = results[c];
  summaryLines.push(`| ${c} | ${r.n} | ${r.betaHp.toFixed(3)} | ${r.betaAtk.toFixed(3)} | ${r.betaDef.toFixed(3)} |`);
}
summaryLines.push('');
summaryLines.push(`Базовые статы (classTemplates.js, ±30% диапазон сэмплирования):`);
for (const c of CLASSES) {
  const b = BASELINE[c];
  summaryLines.push(`- ${c}: hp=${b.hp}, atk=${b.atk}, def=${b.def}`);
}

const summaryPath = `scripts/balance/results/${date}-exp-b-summary.md`;
writeFileSync(summaryPath, summaryLines.join('\n') + '\n');

console.error('\n' + summaryLines.join('\n'));
console.error(`\nCSV: scripts/balance/results/${date}-exp-b.csv`);
console.error(`Summary: ${summaryPath}`);
