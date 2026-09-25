// scripts/balance/exp-breakeven.mjs
//
// Протокол v2 (scripts/balance/protocol-v2.md), шаг 4 — точка
// безубыточности: сколько юнитов дешёвого класса равны по силе одному
// юниту дорогого. Даёт соотношение цен НАПРЯМУЮ, без регрессии на
// коллинеарных переменных (баг протокола v1).
//
// Пары (дешёвый:дорогой): WDD:WBB, WCC:WBB, WDD:WCC (порядок по текущей
// цене SPAWN_COSTS: WDD=5 < WCC=8 < WBB=12). M дорогих юнитов фиксировано
// (1,2,3), N дешёвых перебирается с 1, пока винрейт N-стороны не превысит
// 80% на двух N подряд (устойчивое доминирование) или N не дойдёт до
// потолка 10 (юнитов на сторону для карты 12).
//
// Партий на точку — 100 (50 сидов × 2 зеркала, по правке пользователя,
// было 40 в тексте протокола). Точки рядом с пересечением 50% —
// дополнительно уточняются до ~200 партий (добавочные сиды).
import { mirroredPair, silenceGameLogs, DEFAULT_MAP_SIZE } from './lib/harness.mjs';
import { createCsvWriter } from './lib/csv.mjs';
import { writeFileSync } from 'node:fs';

silenceGameLogs();

const MAP_SIZE = DEFAULT_MAP_SIZE;
const N_CAP = 10;
const PILOT_SEEDS = Number(process.env.BREAKEVEN_PILOT_SEEDS || 10); // ×2 = 20 партий/точку в пилоте
const FULL_SEEDS = Number(process.env.BREAKEVEN_SEEDS || 50); // ×2 = 100 партий/точку
const EXTRA_SEEDS = Number(process.env.BREAKEVEN_EXTRA_SEEDS || 50); // добавка к точкам у пересечения → до ~200
const PILOT_ONLY = process.env.BREAKEVEN_PILOT_ONLY === '1';

// Текущая цена (economyLogic.js, откачена на 5/8/12) задаёт порядок
// дёшево→дорого: WDD < WCC < WBB.
const PAIRS = [
  { name: 'WDD:WBB', cheap: 'WDD', expensive: 'WBB' },
  { name: 'WCC:WBB', cheap: 'WCC', expensive: 'WBB' },
  { name: 'WDD:WCC', cheap: 'WDD', expensive: 'WCC' },
];
const M_VALUES = [1, 2, 3];

async function measurePoint(cheap, N, expensive, M, seedStart, seeds, csv, pairName) {
  const compN = Array(N).fill(cheap);
  const compM = Array(M).fill(expensive);
  let nWins = 0, decisive = 0, unresolved = 0;
  for (let i = 0; i < seeds; i++) {
    const seed = seedStart + i;
    const [g0, g1] = await mirroredPair({ seed, size: MAP_SIZE, compA: compN, compB: compM });
    for (const r of [g0, g1]) {
      if (csv) csv.writeRow({ pair: pairName, M, N, seed, mirror: r.mirror, winner_label: r.winnerLabel ?? 'draw', turns: r.turns, unresolved: r.unresolved });
      if (r.unresolved || !r.winnerLabel) { unresolved++; continue; }
      decisive++;
      if (r.winnerLabel === 'A') nWins++;
    }
  }
  return { wins: nWins, decisive, unresolved };
}

// Находит N методом адаптивного поиска (1..N_CAP), пока винрейт N-стороны
// не превысит 80% на двух N подряд. Возвращает точки {N, wins, decisive, unresolved}.
async function findBreakevenRange(pairName, cheap, expensive, M, seeds, csv) {
  const points = [];
  let aboveCount = 0;
  for (let N = 1; N <= N_CAP; N++) {
    const res = await measurePoint(cheap, N, expensive, M, N * 10000 + M * 100, seeds, csv, pairName);
    const rate = res.decisive ? 100 * res.wins / res.decisive : NaN;
    points.push({ N, ...res, rate });
    console.error(`  ${pairName} M=${M} N=${N}: ${rate.toFixed(1)}% (${res.decisive}р/${res.unresolved}н)`);
    if (rate > 80) aboveCount++; else aboveCount = 0;
    if (aboveCount >= 2) break;
  }
  return points;
}

// Линейная интерполяция N* (точка пересечения 50%) между соседними
// измеренными N. Если 50% не пересечено до потолка — возвращает null.
function interpolateBreakeven(points) {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    if (a.rate <= 50 && b.rate >= 50) {
      if (b.rate === a.rate) return a.N;
      const frac = (50 - a.rate) / (b.rate - a.rate);
      return a.N + frac * (b.N - a.N);
    }
  }
  return null; // не пересечено в измеренном диапазоне
}

async function runPhase(seeds, extraSeeds, label) {
  const csv = createCsvWriter(`scripts/balance/results/${label}-breakeven.csv`,
    ['pair', 'M', 'N', 'seed', 'mirror', 'winner_label', 'turns', 'unresolved']);

  const allPoints = {}; // "pair|M" -> points[]
  for (const pair of PAIRS) {
    for (const M of M_VALUES) {
      console.error(`=== ${pair.name} (дёшево=${pair.cheap}) vs M=${M}×${pair.expensive} ===`);
      const points = await findBreakevenRange(pair.name, pair.cheap, pair.expensive, M, seeds, csv);
      allPoints[`${pair.name}|${M}`] = points;
    }
  }

  // Уточнение точек рядом с пересечением 50% — добавляем ещё extraSeeds
  // сидов к двум N, которые ближе всего окружают 50% (если пересечение
  // вообще найдено в измеренном диапазоне).
  if (extraSeeds > 0) {
    console.error('\n=== Уточнение точек у пересечения 50% (+' + extraSeeds * 2 + ' партий на точку) ===');
    for (const key of Object.keys(allPoints)) {
      const points = allPoints[key];
      const [pairName, mStr] = key.split('|');
      const M = Number(mStr);
      const pair = PAIRS.find(p => p.name === pairName);
      let braceIdx = -1;
      for (let i = 0; i < points.length - 1; i++) {
        if (points[i].rate <= 50 && points[i + 1].rate >= 50) { braceIdx = i; break; }
      }
      if (braceIdx === -1) continue; // не пересечено — нечего уточнять
      for (const p of [points[braceIdx], points[braceIdx + 1]]) {
        const extra = await measurePoint(pair.cheap, p.N, pair.expensive, M, 900000 + p.N * 1000 + M, extraSeeds, csv, pairName);
        p.wins += extra.wins; p.decisive += extra.decisive; p.unresolved += extra.unresolved;
        p.rate = p.decisive ? 100 * p.wins / p.decisive : NaN;
        console.error(`  уточнено ${pairName} M=${M} N=${p.N}: ${p.rate.toFixed(1)}% (${p.decisive}р всего)`);
      }
    }
  }

  await csv.close();
  return allPoints;
}

// ---- Пилот ----
console.error(`=== Пилот: ${PAIRS.length} пар × ${M_VALUES.length} M, ${PILOT_SEEDS} сидов/точку ===`);
const pilotPoints = await runPhase(PILOT_SEEDS, 0, '_pilot');
let pilotUnresolvedTotal = 0, pilotGamesTotal = 0, pilotMonotonicOk = true;
for (const points of Object.values(pilotPoints)) {
  for (const p of points) { pilotUnresolvedTotal += p.unresolved; pilotGamesTotal += p.unresolved + p.decisive; }
  for (let i = 1; i < points.length; i++) if (points[i].rate < points[i - 1].rate - 15) pilotMonotonicOk = false; // допуск на шум пилота
}
console.error(`\nПилот: нерешённых ${pilotUnresolvedTotal}/${pilotGamesTotal} (${(100 * pilotUnresolvedTotal / pilotGamesTotal).toFixed(1)}%)`);
console.error(`Пилот: грубая монотонность ${pilotMonotonicOk ? 'OK' : 'НАРУШЕНА (заметный провал в середине)'}`);
if (pilotUnresolvedTotal / pilotGamesTotal > 0.15) {
  console.error('ПИЛОТ: высокая доля нерешённых — остановка.');
  process.exit(1);
}
console.error('Пилот пройден — переходим к полному прогону.\n');

if (PILOT_ONLY) { console.error('BREAKEVEN_PILOT_ONLY=1 — остановка после пилота.'); process.exit(0); }

// ---- Полный прогон ----
const date = new Date().toISOString().slice(0, 10);
console.error(`=== Полный прогон: ${FULL_SEEDS * 2} партий/точку, +${EXTRA_SEEDS * 2} у пересечения ===`);
const fullPoints = await runPhase(FULL_SEEDS, EXTRA_SEEDS, date);

// ---- Расчёт r и таблиц ----
const rTable = {}; // pair -> M -> r
const monotonicityIssues = [];
for (const pair of PAIRS) {
  rTable[pair.name] = {};
  for (const M of M_VALUES) {
    const points = fullPoints[`${pair.name}|${M}`];
    for (let i = 1; i < points.length; i++) {
      if (points[i].rate < points[i - 1].rate) monotonicityIssues.push(`${pair.name} M=${M}: N=${points[i - 1].N}(${points[i - 1].rate.toFixed(1)}%) → N=${points[i].N}(${points[i].rate.toFixed(1)}%) — немонотонно`);
    }
    const nStar = interpolateBreakeven(points);
    rTable[pair.name][M] = nStar == null ? null : nStar / M;
  }
}

// Проверка масштаба (r меняется с M?)
const scaleNotes = [];
for (const pair of PAIRS) {
  const rs = M_VALUES.map(M => rTable[pair.name][M]).filter(r => r != null);
  if (rs.length >= 2) {
    const spread = (Math.max(...rs) - Math.min(...rs)) / Math.min(...rs);
    if (spread > 0.25) scaleNotes.push(`${pair.name}: r меняется с M больше чем на 25% (${rs.map(r => r.toFixed(2)).join(', ')}) — возможен эффект численности (законы Ланчестера), не усреднять молча.`);
  }
}

// Проверка транзитивности: r(WDD:WBB) ≈ r(WDD:WCC) × r(WCC:WBB), берём M=2 как средний
const M_FOR_TRANSITIVITY = 2;
const rWddWbb = rTable['WDD:WBB']?.[M_FOR_TRANSITIVITY];
const rWccWbb = rTable['WCC:WBB']?.[M_FOR_TRANSITIVITY];
const rWddWcc = rTable['WDD:WCC']?.[M_FOR_TRANSITIVITY];
let transitivityNote = 'Недостаточно данных для проверки транзитивности (M=2).';
if (rWddWbb != null && rWccWbb != null && rWddWcc != null) {
  const predicted = rWddWcc * rWccWbb;
  const diff = Math.abs(predicted - rWddWbb) / rWddWbb;
  transitivityNote = `r(WDD:WBB)=${rWddWbb.toFixed(2)} против предсказанного r(WDD:WCC)×r(WCC:WBB)=${rWddWcc.toFixed(2)}×${rWccWbb.toFixed(2)}=${predicted.toFixed(2)} — расхождение ${(100 * diff).toFixed(1)}%${diff > 0.25 ? ' (>25%, классы взаимодействуют нелинейно — контры, одна цена не описывает всё)' : ' (≤25%, транзитивность в пределах допуска)'}.`;
}

// Предложение цены (якорь WDD=5, текущая цена)
const rWddWccAvg = M_VALUES.map(M => rTable['WDD:WCC']?.[M]).filter(r => r != null);
const rWddWbbAvg = M_VALUES.map(M => rTable['WDD:WBB']?.[M]).filter(r => r != null);
const avgR = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
const rWccAnchor = avgR(rWddWccAvg);
const rWbbAnchor = avgR(rWddWbbAvg);
const proposedWcc = rWccAnchor != null ? Math.round(5 * rWccAnchor) : null;
const proposedWbb = rWbbAnchor != null ? Math.round(5 * rWbbAnchor) : null;

// ---- Отчёт ----
const lines = [];
lines.push('# Эксперимент "точка безубыточности" (протокол v2, шаг 4)');
lines.push('');
lines.push(`Дата: ${date}. Карта: размер ${MAP_SIZE}. ${FULL_SEEDS * 2} партий/точку (+${EXTRA_SEEDS * 2} у пересечения 50%).`);
lines.push('');
lines.push('| Пара | M=1: r | M=2: r | M=3: r |');
lines.push('|---|---|---|---|');
for (const pair of PAIRS) {
  const cells = M_VALUES.map(M => rTable[pair.name][M] == null ? '>потолка' : rTable[pair.name][M].toFixed(2));
  lines.push(`| ${pair.name} | ${cells.join(' | ')} |`);
}
lines.push('');
lines.push('## Проверки');
lines.push('');
lines.push(`**Монотонность:** ${monotonicityIssues.length === 0 ? 'OK — винрейт N-стороны растёт с N во всех точках.' : 'Нарушения:\n' + monotonicityIssues.map(m => `- ${m}`).join('\n')}`);
lines.push('');
lines.push(`**Масштаб (зависимость r от M):** ${scaleNotes.length === 0 ? 'OK — r не меняется существенно с M.' : scaleNotes.map(s => `- ${s}`).join('\n')}`);
lines.push('');
lines.push(`**Транзитивность:** ${transitivityNote}`);
lines.push('');
lines.push('## Предложение цены (якорь WDD=5, текущая цена)');
lines.push('');
lines.push(`WDD: 5 (якорь, не меняется)`);
lines.push(`WCC: ${proposedWcc ?? 'н/д'} (5 × r(WDD:WCC)=${rWccAnchor?.toFixed(2) ?? 'н/д'}, среднее по M)`);
lines.push(`WBB: ${proposedWbb ?? 'н/д'} (5 × r(WDD:WBB)=${rWbbAnchor?.toFixed(2) ?? 'н/д'}, среднее по M)`);
lines.push('');
lines.push('Масштаб (якорь именно 5, а не другое число) — решение человека; здесь взят текущий WDD=5 как отправная точка, чтобы предложение было сравнимо со старой ценой.');
lines.push('');
lines.push('## Сырые точки');
lines.push('');
lines.push('| Пара | M | N | Винрейт N | Партий |');
lines.push('|---|---|---|---|---|');
for (const pair of PAIRS) for (const M of M_VALUES) {
  for (const p of fullPoints[`${pair.name}|${M}`]) {
    lines.push(`| ${pair.name} | ${M} | ${p.N} | ${p.rate.toFixed(1)}% | ${p.decisive} |`);
  }
}

const summaryPath = `scripts/balance/results/${date}-exp-breakeven-summary.md`;
writeFileSync(summaryPath, lines.join('\n') + '\n');
console.error('\n' + lines.join('\n'));
console.error(`\nSummary: ${summaryPath}`);
