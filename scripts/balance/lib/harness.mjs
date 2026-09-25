// scripts/balance/lib/harness.mjs
//
// Общий headless-движок симуляции для протокола калибровки баланса
// WDD/WCC/WBB (B → 1 → 2, docs/known-issues.md #35). Прогоняет полноценный
// AI vs AI бой через РЕАЛЬНЫЙ игровой код (state.js/aiManager.js/
// combatLogic.js) — никакой имитации боевой формулы вручную. БЕЗ
// DOM-стаба... кроме domStub.mjs, который нужен только из-за runtime-пути
// Unit.moveTo() → render-цепочка (см. domStub.mjs).
//
// Обе стороны боя всегда 'enemy0'/'enemy1' — aiManager.runAIForTurn()
// жёстко игнорирует owner==='player1' (aiManager.js:13).
//
// === Методология "шум и зеркалирование" (по требованию пользователя) ===
//
// Шум = всё, что влияет на исход партии, кроме измеряемого (состав/статы):
// сид карты, стартовые позиции, очерёдность хода, случайность спауна.
// Шум не устраняем — делаем его ОДИНАКОВЫМ для обеих сторон (зеркало) и
// усредняем по многим сидам.
//
// 1. ДЕТЕРМИНИРОВАННОСТЬ ПО СИДУ. Node Math.random() не сидируется, и
//    часть пайплайна генерации карты (islandBuilder.js: applyVerticalIslandGrowth/
//    applyLandToHillFilter/applySurfRim/applyWaterToDeepFilter) зовёт ГОЛЫЙ
//    Math.random() в обход своего же rng-параметра — то есть один и тот же
//    seed раньше НЕ гарантировал одну и ту же карту. Исправлено —
//    withSeededRandom() (lib/seededRandom.mjs) временно подменяет глобальный
//    Math.random на mulberry32(seed) на время генерации карты+якорей,
//    восстанавливает оригинал сразу после.
// 2. ЯКОРЯ ОТДЕЛЬНО ОТ СОСТАВА. pickAnchors(seed,size) выбирает ДВЕ точки
//    P1/P2 из общего для ВСЕГО ростера террейна (WDD∩WCC∩WBB spawnTerrain
//    = 'water') — состав, который встанет на P1/P2, сюда не входит вообще.
//    Разные составы можно ставить на одни и те же P1/P2.
// 3. ЗЕРКАЛЬНАЯ ПАРА = 2 ПАРТИИ НА ОДИН SEED. Партия 0: compA на P1 (ходит
//    первым), compB на P2. Партия 1: compB на P1 (ходит первым), compA на
//    P2. Карта и P1/P2 ОДИНАКОВЫ в обеих партиях (тот же map-seed).
//    Очерёдность хода жёстко привязана к ПОЗИЦИИ (P1 всегда первый) — тот
//    самый перекос первого хода (known-issues #29) гасится тем, что за пару
//    партий каждый состав по разу и первым, и вторым.
// 4. Спаун-плейсмент (getRandomFreeHex — какой именно гекс в пределах
//    радиуса кучи достанется юниту) — ОТДЕЛЬНЫЙ поток PRNG на партию
//    (deriveSpawnSeed(seed, gameIndex)), НЕ зеркалится (разный для партии 0
//    и 1 одной пары) — усредняется по сидам, а не по зеркалу.
export const TURN_LIMIT = 100;

import { installDomStub } from './domStub.mjs';
installDomStub();

import { withSeededRandom, deriveSpawnSeed } from './seededRandom.mjs';
import { state } from '../../../src/core/state.js';
import { generateMapByProfile } from '../../../src/utils/generateMapByProfile.js';
import { initMapIndex } from '../../../src/utils/initMapIndex.js';
import { spawnClusteredFleet, intersectSpawnTerrain } from '../../../src/utils/fleetSpawn.js';
import { generateUnits } from '../../../src/mechanics/units.js';
import { updateVisibility } from '../../../src/world/fogOfWar.js';
import { processAviationTurn } from '../../../src/core/aviationLogic.js';
import { runAIForTurn, resetAIState } from '../../../src/ai/aiManager.js';
import { hexDistance } from '../../../src/mechanics/hexUtils.js';

const MAP_PROFILE = 'defaultIsland';
// Общий для ВСЕГО ростера террейн (не зависит от конкретного состава партии)
// — WDD ['surf','water'] ∩ WCC ['surf','water','deep'] ∩ WBB ['water','deep'] = ['water'].
const ROSTER_TERRAIN = intersectSpawnTerrain(['WDD', 'WCC', 'WBB']);

function countByClass(units, owner) {
  const counts = {};
  for (const u of units) {
    if (u.owner !== owner) continue;
    counts[u.type] = (counts[u.type] || 0) + 1;
  }
  return counts;
}

// Детерминированно (под withSeededRandom(seed,...) снаружи) выбирает две
// точки P1/P2 на общем террейне ростера — P2 ищется как можно дальше от P1
// (не ближе радиуса карты), с фоллбэком на "самая далёкая из доступных",
// если такой на карте не нашлось.
function pickAnchors(map, size) {
  const mapRadius = (map.length - 1) / 2;
  const pool = map.flat().filter(cell => ROSTER_TERRAIN.includes(cell.terrainType));
  if (!pool.length) return [null, null];

  const P1 = pool[Math.floor(Math.random() * pool.length)];
  const farEnough = pool.filter(cell => hexDistance(cell, P1) >= mapRadius);
  const P2 = farEnough.length
    ? farEnough[Math.floor(Math.random() * farEnough.length)]
    : pool.reduce((best, cell) => (!best || hexDistance(cell, P1) > hexDistance(best, P1) ? cell : best), null);

  return [P1, P2];
}

// statOverrides: null, или { P1: { WDD: {hp,atk,def}, ... }, P2: {...} } —
// точечная перезапись статов ПОСЛЕ спауна (нужно только эксперименту B).
// Безопасно по чтению mechanics/units.js: Unit-конструктор кладёт hp/maxHp/
// atDamage/def напрямую из options при создании, ничего другого от них не
// зависит (applyModules/recalculateMobility трогают только moRange/флаги).
function applyStatOverrides(statOverrides) {
  if (!statOverrides) return;
  for (const u of state.units) {
    const posOverrides = u.owner === 'enemy0' ? statOverrides.P1 : statOverrides.P2;
    const ov = posOverrides?.[u.type];
    if (!ov) continue;
    if (ov.hp != null) { u.hp = ov.hp; u.maxHp = ov.hp; }
    if (ov.atk != null) u.atDamage = ov.atk;
    if (ov.def != null) u.def = ov.def;
  }
}

function isSideAlive(owner) {
  return state.units.some(u => u.owner === owner);
}

async function runBattleLoop() {
  let turn = 0;
  while (turn < TURN_LIMIT) {
    const aliveP1 = isSideAlive('enemy0');
    const aliveP2 = isSideAlive('enemy1');
    if (!aliveP1 || !aliveP2) {
      return {
        winnerPos: aliveP1 === aliveP2 ? null : (aliveP1 ? 'P1' : 'P2'),
        turns: turn,
        unresolved: false,
      };
    }
    const owner = state.currentPlayer;
    state.resetUnitsForPlayer(owner);
    updateVisibility(state, owner);
    processAviationTurn(state, owner); // no-op без авиации в составе, оставлено для верности реальной последовательности хода
    await runAIForTurn(state, owner);
    state.nextTurn();
    turn++;
  }
  return { winnerPos: null, turns: turn, unresolved: true };
}

// compAtP1/compAtP2 — плоские массивы типов ['WDD','WDD','WCC',...], либо
// объекты состава ({WDD,WCC,WBB,cost}) — cost (если есть) пробрасывается в
// результат как spentP1/spentP2 (нужно эксперименту 2).
async function runOneBattle({ seed, size, compAtP1, compAtP2, gameIndex, statOverrides }) {
  resetAIState(); // aiManager.js fsmMap + aviationLogic.js spawnCycle — оба module-level, обязателен сброс между боями

  const map = withSeededRandom(seed, () => generateMapByProfile(MAP_PROFILE, size, seed));
  state.map = map;
  state.mapIndex = initMapIndex(map);
  state.capturePoints.length = 0; // ПУСТО — точки вообще не создаются, decideCaptureAction/decideSpawnAction не генерируют кандидатов (attackState.js:71,278)
  state.turnOrder = ['enemy0', 'enemy1']; // enemy0=P1 (ходит первым), enemy1=P2
  state.turnIndex = 0;
  state.resources = {};
  state.gameOver = false;
  state.fog = {};

  const [P1, P2] = withSeededRandom(seed, () => pickAnchors(map, size));

  const arrP1 = Array.isArray(compAtP1) ? compAtP1 : compToFlatArray(compAtP1);
  const arrP2 = Array.isArray(compAtP2) ? compAtP2 : compToFlatArray(compAtP2);

  const unitsList = [];
  withSeededRandom(deriveSpawnSeed(seed, gameIndex), () => {
    spawnClusteredFleet(arrP1, map, unitsList, 'enemy0', P1);
    spawnClusteredFleet(arrP2, map, unitsList, 'enemy1', P2);
  });
  generateUnits(unitsList); // мутирует state.units in place (const units = state.units alias в mechanics/units.js)

  applyStatOverrides(statOverrides);

  const startP1 = countByClass(state.units, 'enemy0');
  const startP2 = countByClass(state.units, 'enemy1');
  const result = await runBattleLoop();
  const endP1 = countByClass(state.units, 'enemy0');
  const endP2 = countByClass(state.units, 'enemy1');

  return { ...result, startP1, startP2, endP1, endP2 };
}

function compToFlatArray(comp) {
  const arr = [];
  for (const c of ['WDD', 'WCC', 'WBB']) for (let i = 0; i < (comp[c] || 0); i++) arr.push(c);
  return arr;
}

// Единственная точка входа для экспериментов. compA/compB — плоские массивы
// типов ИЛИ объекты состава {WDD,WCC,WBB,cost?}. statOverridesA/B (только
// эксп. B) — {WDD:{hp,atk,def}, ...}.
// Возвращает [game0, game1] — по протоколу "зеркальная пара = 2 партии на
// один seed", каждая со следующими полями:
//   seed, mirror (0|1), posA ('P1'|'P2' — где стоял compA в ЭТОЙ партии),
//   firstMoverLabel ('A'|'B'), winnerLabel ('A'|'B'|null), turns, unresolved,
//   startLabelA/startLabelB/endLabelA/endLabelB (счётчики по классам),
//   spentA/spentB (если у compA/compB есть .cost, иначе undefined).
export async function mirroredPair({ seed, size = 18, compA, compB, statOverridesA = null, statOverridesB = null }) {
  const overridesByPos = (posOfA) => {
    if (!statOverridesA && !statOverridesB) return null;
    return posOfA === 'P1'
      ? { P1: statOverridesA, P2: statOverridesB }
      : { P1: statOverridesB, P2: statOverridesA };
  };

  const game0 = await runOneBattle({
    seed, size, compAtP1: compA, compAtP2: compB, gameIndex: 0,
    statOverrides: overridesByPos('P1'),
  });
  const game1 = await runOneBattle({
    seed, size, compAtP1: compB, compAtP2: compA, gameIndex: 1,
    statOverrides: overridesByPos('P2'),
  });

  const spentA = compA?.cost;
  const spentB = compB?.cost;

  function toLabeled(raw, posOfA, mirror) {
    const posOfB = posOfA === 'P1' ? 'P2' : 'P1';
    const startLabelA = posOfA === 'P1' ? raw.startP1 : raw.startP2;
    const startLabelB = posOfB === 'P1' ? raw.startP1 : raw.startP2;
    const endLabelA = posOfA === 'P1' ? raw.endP1 : raw.endP2;
    const endLabelB = posOfB === 'P1' ? raw.endP1 : raw.endP2;
    const winnerLabel = raw.winnerPos == null ? null : (raw.winnerPos === posOfA ? 'A' : 'B');
    const firstMoverLabel = posOfA === 'P1' ? 'A' : 'B'; // P1 всегда ходит первым (turnOrder=['enemy0','enemy1'])
    return {
      seed, mirror, posA: posOfA, firstMoverLabel,
      winnerLabel, turns: raw.turns, unresolved: raw.unresolved,
      startLabelA, startLabelB, endLabelA, endLabelB,
      spentA, spentB,
    };
  }

  return [toLabeled(game0, 'P1', 0), toLabeled(game1, 'P2', 1)];
}

// Глушит console.log/console.warn на время боёв (combatLogic/aiManager
// логируют КАЖДОЕ действие — при тысячах партий это неюзабельный объём
// вывода). console.error оставлен — реальные ошибки должны быть видны.
export function silenceGameLogs() {
  console.log = () => {};
  console.warn = () => {};
}
