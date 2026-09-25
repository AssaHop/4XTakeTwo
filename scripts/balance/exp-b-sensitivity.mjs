// scripts/balance/exp-b-sensitivity.mjs
//
// Протокол v2 (scripts/balance/protocol-v2.md), шаг 2 — чувствительность
// статов. ЗАМЕНЯЕТ симметричную постановку сессии 12 (менялись статы ОБЕИХ
// сторон одинаково — при полной симметрии исход решает только позиция,
// коэффициенты выходили около нуля не потому что статы не важны, а по
// построению постановки).
//
// Новая постановка — асимметричная, одна переменная за раз:
// - Базовый флот ОБЕИХ сторон: [WDD×2, WCC×2, WBB×1].
// - Меняется ТОЛЬКО сторона A: у всех юнитов одного класса c один стат s
//   умножается на k. Сторона B — базовые статы без изменений.
// - c ∈ {WDD,WCC,WBB}, s ∈ {hp,atk,def}, k ∈ {0.7,0.85,1.15,1.3}.
// - 3×3×4 = 36 конфигураций. Партий на конфиг — по требованию пользователя
//   100 (50 сидов × 2 зеркала), не 40 — точнее оценка наклона.
// - Метрика: винрейт стороны A. Базовая точка k=1.0→50% НЕ измеряется —
//   это теоретическая константа (при идентичных статах A=B, симметрия даёт
//   ровно 50% по построению, см. нулевой контроль в verify-harness.mjs).
//   Наклон — регрессия ЧЕРЕЗ эту точку по 4 измеренным (lib/regression.mjs:
//   regressionThroughOrigin), с погрешностью (стандартной ошибкой).
import { mirroredPair, silenceGameLogs, TURN_LIMIT, DEFAULT_MAP_SIZE } from './lib/harness.mjs';
import { createCsvWriter } from './lib/csv.mjs';
import { regressionThroughOrigin } from './lib/regression.mjs';
import { ClassTemplates } from '../../src/core/classTemplates.js';
import { writeFileSync } from 'node:fs';

silenceGameLogs();

const CLASSES = ['WDD', 'WCC', 'WBB'];
const STATS = ['hp', 'atk', 'def'];
const K_VALUES = [0.7, 0.85, 1.15, 1.3];
const BASE_COMP = ['WDD', 'WDD', 'WCC', 'WCC', 'WBB'];
const MAP_SIZE = DEFAULT_MAP_SIZE; // 12, протокол v2
const PILOT_SEEDS = 5; // протокол: пилот на 5 сидах перед полным прогоном
const FULL_SEEDS = Number(process.env.EXPB_SEEDS || 50); // ×2 зеркало = 100 партий/конфиг (было 20→40 в session 12, поднято по запросу пользователя)
const PILOT_ONLY = process.env.EXPB_PILOT_ONLY === '1';

const BASELINE = Object.fromEntries(CLASSES.map(c => [c, {
  hp: ClassTemplates[c].hp, atk: ClassTemplates[c].atDamage, def: ClassTemplates[c].def,
}]));

function statValue(cls, stat, k) {
  const raw = BASELINE[cls][stat] * k;
  return stat === 'hp' ? Math.round(raw) : Math.round(raw * 10) / 10;
}

const CONFIGS = [];
for (const cls of CLASSES) for (const stat of STATS) for (const k of K_VALUES) {
  CONFIGS.push({ cls, stat, k, value: statValue(cls, stat, k) });
}

async function runPhase(seeds, csv) {
  const t0 = Date.now();
  const totalGames = CONFIGS.length * seeds * 2;
  let gamesDone = 0;
  const byConfig = new Map(); // "cls|stat|k" -> {wins, decisive, unresolved}

  for (let ci = 0; ci < CONFIGS.length; ci++) {
    const { cls, stat, k, value } = CONFIGS[ci];
    const key = `${cls}|${stat}|${k}`;
    const acc = { wins: 0, decisive: 0, unresolved: 0 };

    const statOverridesA = { [cls]: { [stat]: value } };

    // Общие сиды 1..seeds переиспользуются для ВСЕХ конфигураций (common
    // random numbers) — одни и те же карты под разными (class,stat,k),
    // снижает шум при сравнении между собой, не искажает отдельные оценки.
    for (let s = 1; s <= seeds; s++) {
      const [g0, g1] = await mirroredPair({
        seed: s, size: MAP_SIZE, compA: BASE_COMP, compB: BASE_COMP, statOverridesA,
      });
      for (const r of [g0, g1]) {
        csv.writeRow({
          cls, stat, k, value, seed: s, mirror: r.mirror, pos_a: r.posA,
          winner_label: r.winnerLabel ?? 'draw', turns: r.turns, unresolved: r.unresolved,
        });
        if (r.unresolved || !r.winnerLabel) { acc.unresolved++; }
        else { acc.decisive++; if (r.winnerLabel === 'A') acc.wins++; }
        gamesDone++;
      }
    }
    byConfig.set(key, acc);

    if ((ci + 1) % 6 === 0 || ci === CONFIGS.length - 1) {
      const elapsed = (Date.now() - t0) / 1000;
      const rate = gamesDone / elapsed;
      const eta = (totalGames - gamesDone) / rate;
      console.error(`config ${ci + 1}/${CONFIGS.length} [${key}] — ${gamesDone}/${totalGames} games, ${elapsed.toFixed(0)}s elapsed, ETA ${eta.toFixed(0)}s`);
    }
  }

  return byConfig;
}

// ---- Пилот ----
console.error(`=== Пилот: ${CONFIGS.length} конфигураций × ${PILOT_SEEDS} сидов × 2 = ${CONFIGS.length * PILOT_SEEDS * 2} партий ===`);
const pilotCsv = createCsvWriter('scripts/balance/results/_pilot-exp-b.csv',
  ['cls', 'stat', 'k', 'value', 'seed', 'mirror', 'pos_a', 'winner_label', 'turns', 'unresolved']);
const pilotResults = await runPhase(PILOT_SEEDS, pilotCsv);
await pilotCsv.close();

let pilotUnresolvedTotal = 0, pilotGamesTotal = 0;
for (const acc of pilotResults.values()) {
  pilotUnresolvedTotal += acc.unresolved;
  pilotGamesTotal += acc.unresolved + acc.decisive;
}
console.error(`Пилот: нерешённых ${pilotUnresolvedTotal}/${pilotGamesTotal} (${(100 * pilotUnresolvedTotal / pilotGamesTotal).toFixed(1)}%)`);
// Осмысленность: хотя бы какой-то разброс винрейтов между конфигурациями
// (не все ровно 50%/0%/100% — было бы признаком поломки), нет массовых
// нерешённых партий.
const pilotRates = [...pilotResults.values()].map(a => a.decisive ? a.wins / a.decisive : 0.5);
const pilotSpread = Math.max(...pilotRates) - Math.min(...pilotRates);
console.error(`Пилот: разброс винрейтов между конфигурациями ${(100 * pilotSpread).toFixed(1)} п.п. (ожидание: заметно больше нуля)`);
if (pilotUnresolvedTotal / pilotGamesTotal > 0.15) {
  console.error('ПИЛОТ: высокая доля нерешённых партий — остановка, не переходить к полному прогону.');
  process.exit(1);
}
if (pilotSpread < 0.05) {
  console.error('ПИЛОТ: подозрительно малый разброс винрейтов — возможно постановка снова не даёт эффекта, проверить перед полным прогоном.');
}
console.error('Пилот пройден — переходим к полному прогону.\n');

if (PILOT_ONLY) {
  console.error('EXPB_PILOT_ONLY=1 — остановка после пилота.');
  process.exit(0);
}

// ---- Полный прогон ----
const date = new Date().toISOString().slice(0, 10);
console.error(`=== Полный прогон: ${CONFIGS.length} конфигураций × ${FULL_SEEDS} сидов × 2 = ${CONFIGS.length * FULL_SEEDS * 2} партий ===`);
const csv = createCsvWriter(`scripts/balance/results/${date}-exp-b.csv`,
  ['cls', 'stat', 'k', 'value', 'seed', 'mirror', 'pos_a', 'winner_label', 'turns', 'unresolved']);
const fullResults = await runPhase(FULL_SEEDS, csv);
await csv.close();

let unresolvedTotal = 0, gamesTotal = 0;
for (const acc of fullResults.values()) { unresolvedTotal += acc.unresolved; gamesTotal += acc.unresolved + acc.decisive; }

// ---- Наклоны с погрешностью ----
const slopeResults = {}; // cls -> stat -> {slope10, se10, tstat, significant}
for (const cls of CLASSES) {
  slopeResults[cls] = {};
  for (const stat of STATS) {
    const xs = [], ys = [];
    for (const k of K_VALUES) {
      const acc = fullResults.get(`${cls}|${stat}|${k}`);
      const rate = acc.decisive ? 100 * acc.wins / acc.decisive : 50;
      xs.push((k - 1) * 100); // % изменения стата от базы
      ys.push(rate - 50); // отклонение винрейта от теоретических 50%
    }
    const { slope, se, df } = regressionThroughOrigin(xs, ys);
    const slope10 = slope * 10; // Δвинрейт (п.п.) на +10% стата
    const se10 = se * 10;
    const tstat = se10 ? slope10 / se10 : 0;
    // t-критическое для df=3 (всегда 4 точки → df=n-1=3), 95%, двусторонний ≈ 3.182
    const significant = Math.abs(tstat) > 3.182;
    slopeResults[cls][stat] = { slope10, se10, tstat, df, significant };
  }
}

const lines = [];
lines.push('# Эксперимент B (протокол v2) — асимметричная чувствительность статов WDD/WCC/WBB');
lines.push('');
lines.push(`Дата: ${date}. Постановка: базовый флот [WDD×2,WCC×2,WBB×1] на обе стороны, меняется ТОЛЬКО сторона A (один класс, один стат, k∈{0.7,0.85,1.15,1.3}). 36 конфигураций × ${FULL_SEEDS * 2} партий = ${CONFIGS.length * FULL_SEEDS * 2} партий. Лимит ходов: ${TURN_LIMIT}. Карта: размер ${MAP_SIZE}. Нерешённых: ${unresolvedTotal}/${gamesTotal} (${(100 * unresolvedTotal / gamesTotal).toFixed(1)}%).`);
lines.push('');
lines.push('| Класс | Δвинрейт на +10% HP | Δвинрейт на +10% ATK | Δвинрейт на +10% DEF |');
lines.push('|---|---|---|---|');
for (const cls of CLASSES) {
  const fmt = (stat) => {
    const r = slopeResults[cls][stat];
    const mark = r.significant ? '**' : '';
    return `${mark}${r.slope10.toFixed(2)} ± ${r.se10.toFixed(2)} п.п.${mark}`;
  };
  lines.push(`| ${cls} | ${fmt('hp')} | ${fmt('atk')} | ${fmt('def')} |`);
}
lines.push('');
lines.push('Жирным — значимо на 95% (|t|>3.182, df=3). Погрешность — стандартная ошибка наклона регрессии через теоретическую точку (k=1.0→винрейт=50%, не измеряется, см. нулевой контроль) по 4 измеренным точкам.');
lines.push('');
lines.push('## Сырые винрейты по конфигурациям');
lines.push('');
lines.push('| Класс | Стат | k=0.7 | k=0.85 | k=1.15 | k=1.3 |');
lines.push('|---|---|---|---|---|---|');
for (const cls of CLASSES) for (const stat of STATS) {
  const cells = K_VALUES.map(k => {
    const acc = fullResults.get(`${cls}|${stat}|${k}`);
    const rate = acc.decisive ? 100 * acc.wins / acc.decisive : NaN;
    return `${rate.toFixed(1)}% (${acc.decisive}р/${acc.unresolved}н)`;
  });
  lines.push(`| ${cls} | ${stat} | ${cells.join(' | ')} |`);
}

const summaryPath = `scripts/balance/results/${date}-exp-b-summary.md`;
writeFileSync(summaryPath, lines.join('\n') + '\n');
console.error('\n' + lines.join('\n'));
console.error(`\nCSV (полный): scripts/balance/results/${date}-exp-b.csv`);
console.error(`Summary: ${summaryPath}`);
