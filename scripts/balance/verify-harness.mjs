// scripts/balance/verify-harness.mjs
//
// Протокол v2 (scripts/balance/protocol-v2.md), шаг 1 — позитивные
// контроли ДО измерения. Запускать первым, при провале любого пункта —
// чинить харнесс, не переходить к шагу 2.
//
// 1. Детерминированность по сиду.
// 2. Нулевой контроль (расширенная выборка) — 500 сидов = 1000 партий,
//    критерий 47-53%.
// 3. Разделение позиции и первого хода (2×2 → 2 варианта для симметричного
//    состава, см. комментарий у секции 3).
// 4. K1 — контроль "чувствительность видна" (известный грубый эффект,
//    2×HP должен давать winrate ≥80%).
// 5. K2 — контроль "точка безубыточности работает" (M=2×WDD против
//    N×WDD, N=1..4, винрейт N должен расти монотонно и пересекать 50%
//    около N=2).
// 6. Стабильность — на двух парах (одна близкая к 50%, одна из session 12
//    для сравнения), два независимых набора сидов.
import { installDomStub } from './lib/domStub.mjs';
installDomStub();
import { withSeededRandom } from './lib/seededRandom.mjs';
import { generateMapByProfile } from '../../src/utils/generateMapByProfile.js';
import { runBattle, mirroredPair, silenceGameLogs, DEFAULT_MAP_SIZE } from './lib/harness.mjs';

silenceGameLogs();

const MAP_PROFILE = 'defaultIsland';
const MAP_SIZE = DEFAULT_MAP_SIZE; // 12, протокол v2

const results = {};

// ---- 1. Детерминированность ----
console.error('=== 1. Детерминированность по сиду ===');
let determinismOk = true;
for (const seed of [1, 42, 12345]) {
  const mapA = withSeededRandom(seed, () => generateMapByProfile(MAP_PROFILE, MAP_SIZE, seed));
  const mapB = withSeededRandom(seed, () => generateMapByProfile(MAP_PROFILE, MAP_SIZE, seed));
  const flatA = mapA.flat().map(c => c.terrainType).join(',');
  const flatB = mapB.flat().map(c => c.terrainType).join(',');
  const same = flatA === flatB;
  if (!same) determinismOk = false;
  console.error(`seed=${seed}: ${same ? 'OK — карты идентичны' : 'FAIL — карты РАЗНЫЕ при одном seed'}`);
}
console.error(determinismOk ? 'Детерминированность: OK\n' : 'Детерминированность: ПРОВАЛЕНА — чинить до шага 2\n');
results.determinism = determinismOk;

// ---- 2. Нулевой контроль (расширенный, 500 сидов) ----
console.error('=== 2. Нулевой контроль: A vs A, 500 сидов = 1000 партий (ожидание 47-53%) ===');
const SYMMETRIC_COMP = ['WDD', 'WDD', 'WCC', 'WCC', 'WBB'];
{
  let p1Wins = 0, p2Wins = 0, unresolved = 0, total = 0;
  for (let seed = 1; seed <= 500; seed++) {
    const [g0, g1] = await mirroredPair({ seed, size: MAP_SIZE, compA: SYMMETRIC_COMP, compB: SYMMETRIC_COMP });
    for (const r of [g0, g1]) {
      total++;
      if (r.unresolved || !r.winnerLabel) { unresolved++; continue; }
      const winnerPos = r.winnerLabel === 'A' ? r.posA : (r.posA === 'P1' ? 'P2' : 'P1');
      if (winnerPos === 'P1') p1Wins++; else p2Wins++;
    }
  }
  const decisive = p1Wins + p2Wins;
  const p1Rate = decisive ? (100 * p1Wins / decisive) : NaN;
  console.error(`P1 побед: ${p1Wins}/${decisive} (${p1Rate.toFixed(1)}%), нерешённых: ${unresolved}/${total}`);
  const ok = p1Rate >= 47 && p1Rate <= 53;
  console.error(ok ? 'Нулевой контроль: OK (в пределах 47-53%)\n' : `Нулевой контроль: ПОДОЗРИТЕЛЬНО — ${p1Rate.toFixed(1)}% вне 47-53%\n`);
  results.nullControl = ok;
  results.nullControlRate = p1Rate;
}

// ---- 3. Разделение позиции и первого хода ----
// Состав симметричен (A=B, как в нулевом контроле) — значит "сторона на
// P1 vs на P2" физически неотличимо от простой перестановки, у 4
// теоретических вариантов протокола остаётся ровно 2 статистически
// различных: firstMover='P1' и firstMover='P2' (кто ходит первым). Из них
// напрямую считаются оба нужных числа: преимущество позиции (P(P1
// выигрывает), усреднённое по обоим firstMover) и преимущество первого
// хода (P(ходящий первым выигрывает), усреднённое по обеим позициям).
console.error('=== 3. Позиция vs первый ход: 250 сидов на вариант firstMover ===');
{
  async function p1WinrateFor(firstMover, seedStart, n) {
    let p1Wins = 0, decisive = 0;
    for (let i = 0; i < n; i++) {
      const seed = seedStart + i;
      const r = await runBattle({ seed, size: MAP_SIZE, compAtP1: SYMMETRIC_COMP, compAtP2: SYMMETRIC_COMP, firstMover, gameIndex: i });
      if (r.unresolved || r.winnerPos == null) continue;
      decisive++;
      if (r.winnerPos === 'P1') p1Wins++;
    }
    return { rate: decisive ? (100 * p1Wins / decisive) : NaN, decisive };
  }

  const whenP1First = await p1WinrateFor('P1', 1, 250);
  const whenP2First = await p1WinrateFor('P2', 1001, 250);
  console.error(`P1 выигрывает | P1 ходит первым: ${whenP1First.rate.toFixed(1)}% (${whenP1First.decisive} решённых)`);
  console.error(`P1 выигрывает | P2 ходит первым: ${whenP2First.rate.toFixed(1)}% (${whenP2First.decisive} решённых)`);

  const positionAdvantage = (whenP1First.rate + whenP2First.rate) / 2 - 50; // >0 = P1 сама по себе сильнее
  const firstMoverAdvantage = (whenP1First.rate + (100 - whenP2First.rate)) / 2 - 50; // >0 = ходящий первым сильнее
  console.error(`Преимущество позиции P1 (независимо от очерёдности хода): ${positionAdvantage.toFixed(1)} п.п.`);
  console.error(`Преимущество первого хода (независимо от позиции): ${firstMoverAdvantage.toFixed(1)} п.п.`);
  const flagged = Math.abs(firstMoverAdvantage) > 5;
  console.error(flagged
    ? 'ВНИМАНИЕ: преимущество первого хода > 5 п.п. — записать в known-issues как дизайн-находку игры (не баг харнесса).\n'
    : 'Преимущество первого хода в пределах 5 п.п. — не требует отдельной записи в known-issues.\n');
  results.positionAdvantage = positionAdvantage;
  results.firstMoverAdvantage = firstMoverAdvantage;
}

// ---- 4. K1 — чувствительность видна ----
console.error('=== 4. K1: A=[WDD×4] с HP×2 vs B=[WDD×4] база, 20 сидов (ожидание A ≥80%) ===');
{
  const compK1 = ['WDD', 'WDD', 'WDD', 'WDD'];
  let aWins = 0, decisive = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const [g0, g1] = await mirroredPair({
      seed, size: MAP_SIZE, compA: compK1, compB: compK1,
      statOverridesA: { WDD: { hp: 30 } }, // база hp=15, ×2
    });
    for (const r of [g0, g1]) {
      if (r.unresolved || !r.winnerLabel) continue;
      decisive++;
      if (r.winnerLabel === 'A') aWins++;
    }
  }
  const rate = decisive ? (100 * aWins / decisive) : NaN;
  console.error(`A(HP×2) винрейт: ${rate.toFixed(1)}% (${decisive} решённых)`);
  const ok = rate >= 80;
  console.error(ok ? 'K1: OK (≥80%)\n' : 'K1: ПРОВАЛЕН — метод чувствительности (шаг 2) не увидит даже грубый эффект, стоп\n');
  results.k1 = ok;
  results.k1Rate = rate;
}

// ---- 5. K2 — точка безубыточности работает ----
console.error('=== 5. K2: N×WDD vs M=2×WDD, N=1..4, 20 сидов на точку ===');
{
  const rates = {};
  for (const n of [1, 2, 3, 4]) {
    const compN = Array(n).fill('WDD');
    const compM = ['WDD', 'WDD'];
    let nWins = 0, decisive = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const [g0, g1] = await mirroredPair({ seed, size: MAP_SIZE, compA: compN, compB: compM });
      for (const r of [g0, g1]) {
        if (r.unresolved || !r.winnerLabel) continue;
        decisive++;
        if (r.winnerLabel === 'A') nWins++;
      }
    }
    rates[n] = decisive ? (100 * nWins / decisive) : NaN;
    console.error(`N=${n}: винрейт ${rates[n].toFixed(1)}% (${decisive} решённых)`);
  }
  const monotonic = rates[1] <= rates[2] && rates[2] <= rates[3] && rates[3] <= rates[4];
  const crossingNearTwo = rates[2] >= 35 && rates[2] <= 65; // N=2 vs M=2 — тот же состав, ожидание ~50%
  console.error(monotonic ? 'Монотонность: OK\n' : 'Монотонность: НАРУШЕНА — метод шага 4 ненадёжен, стоп\n');
  console.error(crossingNearTwo ? 'Пересечение ~50% около N=2: OK\n' : 'Пересечение ~50% около N=2: ДАЛЕКО от ожидания\n');
  results.k2Monotonic = monotonic;
  results.k2CrossingNearTwo = crossingNearTwo;
  results.k2Rates = rates;
}

// ---- 6. Стабильность (две пары, два набора сидов) ----
async function winrateFor(compA, compB, seedStart) {
  let aWins = 0, decisive = 0;
  for (let i = 0; i < 20; i++) {
    const seed = seedStart + i;
    const [g0, g1] = await mirroredPair({ seed, size: MAP_SIZE, compA, compB });
    for (const r of [g0, g1]) {
      if (r.unresolved || !r.winnerLabel) continue;
      decisive++;
      if (r.winnerLabel === 'A') aWins++;
    }
  }
  return { rate: decisive ? (100 * aWins / decisive) : NaN, decisive };
}

async function stabilityCheck(label, compA, compB) {
  console.error(`=== 6. Стабильность: ${label}, seeds 1-20 против seeds 101-120 ===`);
  const setA = await winrateFor(compA, compB, 1);
  const setB = await winrateFor(compA, compB, 101);
  console.error(`Seeds 1-20: A-винрейт ${setA.rate.toFixed(1)}% (${setA.decisive} решённых)`);
  console.error(`Seeds 101-120: A-винрейт ${setB.rate.toFixed(1)}% (${setB.decisive} решённых)`);
  const diff = Math.abs(setA.rate - setB.rate);
  const ok = diff <= 10;
  console.error(ok
    ? `Стабильность: OK (разница ${diff.toFixed(1)} п.п. ≤ 10)\n`
    : `Стабильность: разница ${diff.toFixed(1)} п.п. > 10 — в реальных экспериментах увеличить число сидов на пару\n`);
  return ok;
}

// Заменяет пару 6×WDD vs 3×WBB сессии 12 (0%/0% — неинформативна, исход
// предрешён) на пару ближе к середине, как предложено протоколом v2.
const stableWddVsWcc = await stabilityCheck(
  '4×WDD (A) vs 2×WCC (B)',
  ['WDD', 'WDD', 'WDD', 'WDD'],
  ['WCC', 'WCC'],
);
const stableWccVsWdd = await stabilityCheck(
  '6×WCC (A) vs 6×WDD (B)',
  ['WCC', 'WCC', 'WCC', 'WCC', 'WCC', 'WCC'],
  ['WDD', 'WDD', 'WDD', 'WDD', 'WDD', 'WDD'],
);
results.stability = stableWddVsWcc && stableWccVsWdd;

console.error('=== Итог (протокол v2, шаг 1) ===');
console.error(`Детерминированность: ${results.determinism ? 'OK' : 'FAIL'}`);
console.error(`Нулевой контроль (${results.nullControlRate.toFixed(1)}%): ${results.nullControl ? 'OK' : 'ПОДОЗРИТЕЛЬНО'}`);
console.error(`Преимущество позиции: ${results.positionAdvantage.toFixed(1)} п.п., преимущество первого хода: ${results.firstMoverAdvantage.toFixed(1)} п.п.`);
console.error(`K1 (${results.k1Rate.toFixed(1)}%): ${results.k1 ? 'OK' : 'ПРОВАЛЕН'}`);
console.error(`K2 монотонность: ${results.k2Monotonic ? 'OK' : 'НАРУШЕНА'}, пересечение ~50% у N=2: ${results.k2CrossingNearTwo ? 'OK' : 'далеко'}`);
console.error(`Стабильность: ${results.stability ? 'OK' : 'нужно больше сидов'}`);

const allOk = results.determinism && results.nullControl && results.k1 && results.k2Monotonic && results.k2CrossingNearTwo && results.stability;
console.error(`\n${allOk ? 'ВСЕ КОНТРОЛИ ПРОЙДЕНЫ — можно переходить к шагу 2 (после подтверждения пользователя).' : 'ЕСТЬ ПРОВАЛЕННЫЕ КОНТРОЛИ — не переходить к шагу 2, разбираться.'}`);
