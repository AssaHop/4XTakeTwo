// scripts/balance/lib/harness.mjs
//
// Общий headless-движок симуляции для калибровки баланса WDD/WCC/WBB
// (known-issue #35, протокол v2 — scripts/balance/protocol-v2.md).
// Прогоняет полноценный AI vs AI бой через РЕАЛЬНЫЙ игровой код
// (state.js/aiManager.js/combatLogic.js) — никакой имитации боевой
// формулы вручную. domStub.mjs нужен только из-за runtime-пути
// Unit.moveTo() → render-цепочка.
//
// Обе стороны боя всегда 'enemy0'(=P1)/'enemy1'(=P2) —
// aiManager.runAIForTurn() жёстко игнорирует owner==='player1'.
//
// === Методология "шум и зеркалирование" ===
//
// Шум = всё, что влияет на исход партии, кроме измеряемого (состав/статы):
// сид карты, стартовые позиции, очерёдность хода, случайность спауна. Шум
// не устраняем — делаем его ОДИНАКОВЫМ для обеих сторон (зеркало) и
// усредняем по многим сидам.
//
// 1. ДЕТЕРМИНИРОВАННОСТЬ ПО СИДУ. Node Math.random() не сидируется, и
//    часть islandBuilder.js зовёт его напрямую в обход своего rng-
//    параметра. Исправлено — withSeededRandom() (seededRandom.mjs)
//    временно подменяет глобальный Math.random на время генерации карты+
//    якорей.
// 2. ЯКОРЯ ОТДЕЛЬНО ОТ СОСТАВА, ПРОТИВОПОЛОЖНЫЕ КРАЯ. pickAnchorsOppositeEdges
//    выбирает случайное направление (непрерывный угол) от центра карты,
//    P1 — "идеальная" точка на ~70-80% радиуса в этом направлении, P2 —
//    точное центрально-симметричное отражение P1 в кубических координатах
//    (q,r,s)→(−q,−r,−s). Карта не симметрична по террейну — если идеальная
//    точка суша, якорь сдвигается на ближайший водный гекс общего для
//    ростера террейна; величина сдвига логируется (shiftP1/shiftP2).
// 3. ЗЕРКАЛЬНАЯ ПАРА = 2 ПАРТИИ НА ОДИН SEED. mirroredPair(): партия 0 —
//    compA на P1 (ходит первым), compB на P2; партия 1 — наоборот. Карта и
//    P1/P2 одинаковы в обеих партиях. Для экспериментов, где нужно
//    развязать позицию и очерёдность хода отдельно (протокол v2, шаг 1,
//    2×2), используйте нижнеуровневый runBattle() с явным firstMover.
// 4. Спаун-плейсмент внутри кучи — отдельный поток PRNG на партию
//    (deriveSpawnSeed(seed, gameIndex)), НЕ зеркалится.
// 5. КУЧА: spawnClusteredFleet (utils/fleetSpawn.js) уже реализует мягкий
//    минимальный интервал 2 гекса между своими юнитами с фоллбэком на
//    плотную расстановку, если места не хватило — здесь только считаем
//    (countSpacingViolations), сколько юнитов оказалось с интервалом 1,
//    для контроля "это исключение, не правило" (протокол v2).
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
import { pixelToCube, HEX_RADIUS } from '../../../src/world/map.js';

const MAP_PROFILE = 'defaultIsland';
export const DEFAULT_MAP_SIZE = 12; // протокол v2 — было 18 в сессии 12, размер 12 даёт быстрее контакт/короче бой
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

function closestOnPool(target, pool) {
  let best = null;
  let bestDist = Infinity;
  for (const cell of pool) {
    const d = hexDistance(cell, target);
    if (d < bestDist) { bestDist = d; best = cell; }
  }
  return best;
}

// Случайная непрерывная точка на ~radiusFraction от центра карты, в
// случайном направлении — через pixelToCube (тот же перевод пиксель↔куб,
// что использует рендер/остальная игра, не своя формула).
function randomEdgePoint(size) {
  const radiusFraction = 0.70 + Math.random() * 0.10; // 70-80%
  const radiusHexes = size * radiusFraction;
  const angle = Math.random() * Math.PI * 2;
  // HEX_RADIUS*sqrt(3) — пиксельный шаг на 1 гекс вдоль чистого q-направления
  // (cubeToPixel(1,0,-1) даёт x=HEX_RADIUS*sqrt(3), y=0) — берём как общий
  // масштаб для x/y, направление даёт угол, а не точная изотропность сетки.
  const scale = HEX_RADIUS * Math.sqrt(3);
  const x = radiusHexes * scale * Math.cos(angle);
  const y = radiusHexes * scale * Math.sin(angle);
  return pixelToCube(x, y);
}

// Детерминированно (под withSeededRandom(seed,...) снаружи) выбирает две
// противоположные (центрально-симметричные) точки P1/P2. Возвращает также
// shiftP1/shiftP2 — на сколько гексов якорь сдвинулся от идеальной точки
// до ближайшего валидного водного гекса (0, если идеальная точка сама
// оказалась валидной).
function pickAnchorsOppositeEdges(map, size) {
  const pool = map.flat().filter(cell => ROSTER_TERRAIN.includes(cell.terrainType));
  if (!pool.length) return { P1: null, P2: null, shiftP1: null, shiftP2: null };

  const idealP1 = randomEdgePoint(size);
  const idealP2 = { q: -idealP1.q, r: -idealP1.r, s: -idealP1.s };

  const P1 = closestOnPool(idealP1, pool);
  const P2 = closestOnPool(idealP2, pool);

  return {
    P1, P2,
    shiftP1: hexDistance(idealP1, P1),
    shiftP2: hexDistance(idealP2, P2),
  };
}

// Считает юнитов owner'а, чей БЛИЖАЙШИЙ сосед среди своих же юнитов стоит
// на расстоянии 1 (вплотную) — протокол v2: мягкий интервал 2 гекса
// желателен, интервал 1 допустим как исключение, доля должна быть невелика.
function countSpacingViolations(units, owner) {
  const own = units.filter(u => u.owner === owner);
  let violations = 0;
  for (const u of own) {
    const nearest = own
      .filter(o => o !== u)
      .reduce((min, o) => Math.min(min, hexDistance(u, o)), Infinity);
    if (nearest === 1) violations++;
  }
  return violations;
}

// statOverrides: null, или { P1: { WDD: {hp,atk,def}, ... }, P2: {...} } —
// точечная перезапись статов ПОСЛЕ спауна (нужно только эксперименту
// чувствительности статов). Безопасно по чтению mechanics/units.js:
// Unit-конструктор кладёт hp/maxHp/atDamage/def напрямую из options при
// создании, ничего другого от них не зависит.
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

function compToFlatArray(comp) {
  const arr = [];
  for (const c of ['WDD', 'WCC', 'WBB']) for (let i = 0; i < (comp[c] || 0); i++) arr.push(c);
  return arr;
}

// Нижнеуровневая точка входа — ОДНА партия с полным контролем: кто на
// какой позиции, кто ходит первым (независимо от позиции). compAtP1/
// compAtP2 — плоские массивы типов ИЛИ объекты состава {WDD,WCC,WBB,cost}.
// firstMover — 'P1' (по умолчанию) | 'P2'.
export async function runBattle({ seed, size = DEFAULT_MAP_SIZE, compAtP1, compAtP2, firstMover = 'P1', gameIndex = 0, statOverrides = null }) {
  resetAIState(); // aiManager.js fsmMap + aviationLogic.js spawnCycle — оба module-level, обязателен сброс между боями

  const map = withSeededRandom(seed, () => generateMapByProfile(MAP_PROFILE, size, seed));
  state.map = map;
  state.mapIndex = initMapIndex(map);
  state.capturePoints.length = 0; // ПУСТО — точки вообще не создаются, decideCaptureAction/decideSpawnAction не генерируют кандидатов (attackState.js:71,278)
  state.turnOrder = firstMover === 'P1' ? ['enemy0', 'enemy1'] : ['enemy1', 'enemy0'];
  state.turnIndex = 0;
  state.resources = {};
  state.gameOver = false;
  state.fog = {};

  const { P1, P2, shiftP1, shiftP2 } = withSeededRandom(seed, () => pickAnchorsOppositeEdges(map, size));

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
  const spacingP1 = countSpacingViolations(state.units, 'enemy0');
  const spacingP2 = countSpacingViolations(state.units, 'enemy1');
  const result = await runBattleLoop();
  const endP1 = countByClass(state.units, 'enemy0');
  const endP2 = countByClass(state.units, 'enemy1');

  return { ...result, startP1, startP2, endP1, endP2, shiftP1, shiftP2, spacingP1, spacingP2, firstMover };
}

// Единственная точка входа для обычных экспериментов (позиция = очерёдность
// хода). compA/compB — плоские массивы типов ИЛИ объекты состава
// {WDD,WCC,WBB,cost?}. statOverridesA/B — {WDD:{hp,atk,def}, ...}.
// Возвращает [game0, game1] — "зеркальная пара = 2 партии на один seed",
// каждая со следующими полями: seed, mirror (0|1), posA ('P1'|'P2' — где
// стоял compA в ЭТОЙ партии), firstMoverLabel ('A'|'B'), winnerLabel
// ('A'|'B'|null), turns, unresolved, startLabelA/B, endLabelA/B,
// spentA/B (если у compA/compB есть .cost), shiftA/B, spacingA/B.
export async function mirroredPair({ seed, size = DEFAULT_MAP_SIZE, compA, compB, statOverridesA = null, statOverridesB = null }) {
  const overridesByPos = (posOfA) => {
    if (!statOverridesA && !statOverridesB) return null;
    return posOfA === 'P1'
      ? { P1: statOverridesA, P2: statOverridesB }
      : { P1: statOverridesB, P2: statOverridesA };
  };

  const game0 = await runBattle({
    seed, size, compAtP1: compA, compAtP2: compB, firstMover: 'P1', gameIndex: 0,
    statOverrides: overridesByPos('P1'),
  });
  const game1 = await runBattle({
    seed, size, compAtP1: compB, compAtP2: compA, firstMover: 'P1', gameIndex: 1,
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
    const shiftLabelA = posOfA === 'P1' ? raw.shiftP1 : raw.shiftP2;
    const shiftLabelB = posOfB === 'P1' ? raw.shiftP1 : raw.shiftP2;
    const spacingLabelA = posOfA === 'P1' ? raw.spacingP1 : raw.spacingP2;
    const spacingLabelB = posOfB === 'P1' ? raw.spacingP1 : raw.spacingP2;
    const winnerLabel = raw.winnerPos == null ? null : (raw.winnerPos === posOfA ? 'A' : 'B');
    const firstMoverLabel = posOfA === 'P1' ? 'A' : 'B'; // P1 всегда ходит первым в mirroredPair
    return {
      seed, mirror, posA: posOfA, firstMoverLabel,
      winnerLabel, turns: raw.turns, unresolved: raw.unresolved,
      startLabelA, startLabelB, endLabelA, endLabelB,
      shiftLabelA, shiftLabelB, spacingLabelA, spacingLabelB,
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
