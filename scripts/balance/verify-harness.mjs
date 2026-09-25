// scripts/balance/verify-harness.mjs
//
// Проверка харнеса ДО прогона основных экспериментов B/1/2 (требование
// пользователя, протокол "шум и зеркалирование", п.5):
//
// 1. Детерминированность по сиду — карта, сгенерированная дважды с одним
//    seed, должна побитово совпадать (terrainType каждой клетки).
// 2. Гашение шума — зеркальный бой ОДИНАКОВЫХ составов (A vs A) на 20
//    сидах: винрейт позиции P1 должен быть около 50%. Заметное отклонение
//    = остался неучтённый перекос позиции/первого хода.
// 3. Стабильность — один и тот же (асимметричный) состав-пара на двух
//    разных наборах сидов: винрейт не должен отличаться больше чем на
//    10 п.п. Если отличается — увеличить число сидов в реальных
//    экспериментах, не менять протокол.
import { installDomStub } from './lib/domStub.mjs';
installDomStub();
import { withSeededRandom } from './lib/seededRandom.mjs';
import { generateMapByProfile } from '../../src/utils/generateMapByProfile.js';
import { mirroredPair, silenceGameLogs } from './lib/harness.mjs';

silenceGameLogs();

const MAP_PROFILE = 'defaultIsland';
const MAP_SIZE = 18;

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
console.error(determinismOk ? 'Детерминированность: OK\n' : 'Детерминированность: ПРОВАЛЕНА — чинить до основных экспериментов\n');

// ---- 2. Гашение шума (A vs A, 20 сидов) ----
console.error('=== 2. Гашение шума: A vs A, 20 сидов (ожидание ~50% побед P1) ===');
const SYMMETRIC_COMP = ['WDD', 'WDD', 'WCC', 'WCC', 'WBB'];
let p1Wins = 0, p2Wins = 0, unresolved = 0, total = 0;
for (let seed = 1; seed <= 20; seed++) {
  const [g0, g1] = await mirroredPair({ seed, size: MAP_SIZE, compA: SYMMETRIC_COMP, compB: SYMMETRIC_COMP });
  for (const r of [g0, g1]) {
    total++;
    if (r.unresolved || !r.winnerLabel) { unresolved++; continue; }
    // r.posA всегда 'P1' в игре 0 нашей симметричной пары и 'P2' в игре 1 (comp одинаковый,
    // так что "кто выиграл" эквивалентно "кто на P1 выиграл" через r.winnerLabel+r.posA).
    const winnerPos = r.winnerLabel === 'A' ? r.posA : (r.posA === 'P1' ? 'P2' : 'P1');
    if (winnerPos === 'P1') p1Wins++; else p2Wins++;
  }
}
const decisive = p1Wins + p2Wins;
const p1Rate = decisive ? (100 * p1Wins / decisive) : NaN;
console.error(`P1 побед: ${p1Wins}/${decisive} (${p1Rate.toFixed(1)}%), P2: ${p2Wins}/${decisive}, нерешённых: ${unresolved}/${total}`);
const noiseOk = Math.abs(p1Rate - 50) <= 20; // широкий допуск на n=20 (биномиальный шум)
console.error(noiseOk
  ? 'Гашение шума: OK (в разумных пределах 50%±20 п.п. на выборке 20 сидов)\n'
  : 'Гашение шума: ПОДОЗРИТЕЛЬНО — заметный перекос позиции/первого хода, разобраться до основных экспериментов\n');

// ---- 3. Стабильность (асимметричные пары, два набора сидов каждая) ----
async function winrateFor(compA, compB, seedStart) {
  let aWins = 0, decisive2 = 0;
  for (let i = 0; i < 20; i++) {
    const seed = seedStart + i;
    const [g0, g1] = await mirroredPair({ seed, size: MAP_SIZE, compA, compB });
    for (const r of [g0, g1]) {
      if (r.unresolved || !r.winnerLabel) continue;
      decisive2++;
      if (r.winnerLabel === 'A') aWins++;
    }
  }
  return { rate: decisive2 ? (100 * aWins / decisive2) : NaN, decisive: decisive2 };
}

async function stabilityCheck(label, compA, compB) {
  console.error(`=== 3. Стабильность: ${label}, seeds 1-20 против seeds 101-120 ===`);
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

const stableWddVsWbb = await stabilityCheck(
  '6×WDD (A) vs 3×WBB (B)',
  ['WDD', 'WDD', 'WDD', 'WDD', 'WDD', 'WDD'],
  ['WBB', 'WBB', 'WBB'],
);

const stableWccVsWdd = await stabilityCheck(
  '6×WCC (A) vs 6×WDD (B)',
  ['WCC', 'WCC', 'WCC', 'WCC', 'WCC', 'WCC'],
  ['WDD', 'WDD', 'WDD', 'WDD', 'WDD', 'WDD'],
);

const stableOk = stableWddVsWbb && stableWccVsWdd;

console.error('=== Итог ===');
console.error(`Детерминированность: ${determinismOk ? 'OK' : 'FAIL'}`);
console.error(`Гашение шума: ${noiseOk ? 'OK' : 'ПОДОЗРИТЕЛЬНО'}`);
console.error(`Стабильность: ${stableOk ? 'OK' : 'нужно больше сидов'}`);
