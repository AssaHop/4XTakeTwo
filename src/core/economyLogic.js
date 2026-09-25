// src/core/economyLogic.js
//
// Ресурсная экономика поверх точек захвата (запрошено пользователем
// 2026-09-13, см. docs/sessions/2026-09-13-session11.md): каждая точка,
// принадлежащая owner'у, даёт +1 "токен" в его ОБЩИЙ пул (state.resources
// [owner]) на СВОЙ ход владельца — как звёзды в Polytopia, не отдельный
// счётчик на каждую точку. Токены тратятся на спаун флота у любой своей
// точки захвата (не обязательно у той, что их принесла).
//
// Тайминг: вызывается из того же места, что и aviationLogic.js:
// processAviationTurn(state, owner) — один раз в начале СВОЕГО хода
// owner'а (и для player1 в handleEndTurn, и для каждого AI в
// runAISequence), не при каждом вызове updateCapturePoints (тот дёргается
// на конец хода КАЖДОГО игрока, был бы over-generation).
import { Unit, getOwnerColor } from '../mechanics/units.js';
import { ClassTemplates } from './classTemplates.js';

// Цена ВСЕГДА фиксированная и предсказуемая игроку — пользователь
// (2026-09-13) отверг растущую с числом точек цену как нечестную
// механику ("играю лучше, а меня наказывают"; инфляция выглядит обманом,
// игрок должен точно знать сколько стоит юнит).
//
// БЫЛО WDD:5/WCC:8/WBB:12. Финальная калибровка протоколом B→1→2 (сессия
// 2026-09-25, known-issue #35, см. scripts/balance/) на исправленном
// харнессе (чистый fleet-vs-fleet без точек захвата — см.
// scripts/balance/lib/harness.mjs, лог методологии "шум и зеркалирование"
// в докстринге файла): эксперимент 1 (полная матрица 378 пар, 3780 боёв,
// 14 нерешённых) показал WBB доминирующим даже при равном ЧИСЛЕ юнитов
// (β=+1.335 против WDD=-0.955/WCC=-0.580). Эксперимент 2 (равный бюджет=30
// по СТАРОЙ цене, полная матрица 28 пар, 560 боёв, 7 нерешённых) показал,
// что старая цена НЕ компенсирует это — raw-коэффициент боевой ценности
// WBB=0.356 всё ещё намного выше WDD=0.009/WCC=-0.155 (оба у защитного
// пола регрессии), винрейт между составами на старой цене — 28.3%-77.8%
// (далеко от целевого коридора 45-55%). Цена пересчитана пропорционально
// (см. exp2-composition-equal-budget.mjs): WBB заметно дороже (12→20),
// WDD/WCC заметно дешевле (5→3, 8→3). Резкий скачок — новая цена НЕ
// перепроверена повторным прогоном на коридор 45-55% (следующая итерация
// калибровки, не в объёме этого раунда) — при playtest-е следить особо
// внимательно, прогнать scripts/balance/exp2-composition-equal-budget.mjs
// заново при признаках перекоса.
export const SPAWN_COSTS = { WDD: 3, WCC: 3, WBB: 20 };

// Лимит флота через per-point capacityLevel (запрошено пользователем
// 2026-09-13, второй раунд — заменяет плоский CAPACITY_PER_POINT):
// у каждой точки захвата СВОЙ уровень вместимости (`cp.capacityLevel`,
// целое ≥1), который она вносит в ОБЩИЙ лимит флота владельца (сумма по
// всем своим точкам). Домашняя точка стартует с HOME_BASE_CAPACITY(=3),
// вновь захваченная — с CAPTURED_BASE_CAPACITY(=1). Апгрейд поднимает
// capacityLevel КОНКРЕТНОЙ точки на 1 за прогрессивную цену
// (UPGRADE_COSTS) — это единственное место, где растущая цена ОК
// (пользователь: явное разовое решение игрока про конкретную точку, не
// скрытый налог на каждую покупку юнита). При захвате точки другим
// владельцем её capacityLevel сбрасывается на CAPTURED_BASE_CAPACITY —
// апгрейды предыдущего владельца не наследуются (см. captureLogic.js).
// GLOBAL_FLEET_CAP — редко достижимый потолок безопасности сверху суммы
// уровней (пользователь: "не знаю, 50 кораблей").
export const HOME_BASE_CAPACITY = 3;
export const CAPTURED_BASE_CAPACITY = 1;
export const GLOBAL_FLEET_CAP = 50;

// Цена апгрейда ДО уровня N (от N-1). Числа 2/3/4 — прямо от пользователя
// (5/8/10); дальше экстраполировано (+2 за уровень) — не указано явно,
// пересмотреть по playtest если уровни >4 станут актуальны на практике.
const UPGRADE_COSTS = { 2: 5, 3: 8, 4: 10 };
function upgradeCostForLevel(targetLevel) {
  if (UPGRADE_COSTS[targetLevel] != null) return UPGRADE_COSTS[targetLevel];
  const lastKnown = Math.max(...Object.keys(UPGRADE_COSTS).map(Number));
  return UPGRADE_COSTS[lastKnown] + (targetLevel - lastKnown) * 2;
}

export function getUpgradeCost(cp) {
  return upgradeCostForLevel((cp.capacityLevel || CAPTURED_BASE_CAPACITY) + 1);
}

export function canAffordUpgrade(state, owner, cp) {
  if (!cp || cp.owner !== owner) return false;
  return getResources(state, owner) >= getUpgradeCost(cp);
}

// Возвращает true если апгрейд применён (токены списаны, capacityLevel+1).
export function upgradeCapturePointCapacity(state, owner, cp) {
  if (!canAffordUpgrade(state, owner, cp)) return false;
  const cost = getUpgradeCost(cp);
  state.resources[owner] -= cost;
  cp.capacityLevel = (cp.capacityLevel || CAPTURED_BASE_CAPACITY) + 1;
  console.log(`⬆️ [${owner}] апгрейд точки (${cp.q},${cp.r},${cp.s}) до уровня ${cp.capacityLevel}, остаток токенов: ${state.resources[owner]}`);
  return true;
}

export function getFleetCapacity(state, owner) {
  const sum = (state.capturePoints || [])
    .filter(cp => cp.owner === owner)
    .reduce((total, cp) => total + (cp.capacityLevel || CAPTURED_BASE_CAPACITY), 0);
  return Math.min(sum, GLOBAL_FLEET_CAP);
}

export function getFleetSize(state, owner) {
  return state.units.filter(u => u.owner === owner).length;
}

export function hasFleetRoom(state, owner) {
  return getFleetSize(state, owner) < getFleetCapacity(state, owner);
}

export function tickResourcesForOwner(state, owner) {
  if (!state.resources) state.resources = {};
  const owned = (state.capturePoints || []).filter(cp => cp.owner === owner).length;
  if (!owned) return;
  state.resources[owner] = (state.resources[owner] || 0) + owned;
}

export function getResources(state, owner) {
  return state.resources?.[owner] || 0;
}

export function canAffordSpawn(state, owner, unitType) {
  const cost = SPAWN_COSTS[unitType];
  return !!cost && getResources(state, owner) >= cost && hasFleetRoom(state, owner);
}

// Точки захвата стоят на land (см. dominator.js:getInitialCapturePoints) —
// флот там спаунится не может (spawnTerrain у WDD/WCC/WBB не включает
// land), поэтому ищем свободный ПРИМОРСКИЙ сосед точки, тот же паттерн,
// что aviationLogic.js:findSpawnHex использует для WCA.
function findSpawnHexNearCP(cp, unitType, state) {
  const template = ClassTemplates[unitType];
  const occupied = new Set(state.units.map(u => `${u.q},${u.r},${u.s}`));

  const dirs = [
    { q: 1, r: -1, s: 0 }, { q: 1, r: 0, s: -1 }, { q: 0, r: 1, s: -1 },
    { q: -1, r: 1, s: 0 }, { q: -1, r: 0, s: 1 }, { q: 0, r: -1, s: 1 },
  ];

  for (const d of dirs) {
    const hex = { q: cp.q + d.q, r: cp.r + d.r, s: cp.s + d.s };
    const key = `${hex.q},${hex.r},${hex.s}`;
    if (occupied.has(key)) continue;
    const tile = state.mapIndex?.[key];
    if (!tile) continue;
    if (!template.spawnTerrain?.includes(tile.terrainType)) continue;
    return hex;
  }
  return null;
}

// Возвращает созданный юнит, либо null (не хватает токенов/точка чужая/
// флот на пределе вместимости/нет свободного места рядом — токены в
// этом случае НЕ списываются).
export function spawnUnitAtCapturePoint(state, owner, cp, unitType) {
  if (!cp || cp.owner !== owner) return null;
  if (!canAffordSpawn(state, owner, unitType)) return null;

  const hex = findSpawnHexNearCP(cp, unitType, state);
  if (!hex) return null;

  state.resources[owner] -= SPAWN_COSTS[unitType];

  const template = ClassTemplates[unitType];
  const unit = new Unit(hex.q, hex.r, hex.s, unitType, owner, template);
  unit.color = getOwnerColor(owner);
  state.units.push(unit);
  console.log(`💰 [${owner}] спаунит ${unitType} у точки захвата (${hex.q},${hex.r},${hex.s}), остаток токенов: ${state.resources[owner]}, флот: ${getFleetSize(state, owner)}/${getFleetCapacity(state, owner)}`);
  return unit;
}

// AI-экономика (выбор ЧТО и КОГДА спаунить/апгрейдить) — не отдельная
// фаза хода, а кандидаты в общем пуле AttackState.execute()/
// decideSpawnAction() (ai/fsm/states/attackState.js), по мотивам разбора
// Tribes SimplePortfolio: экономические решения конкурируют по score с
// ATTACK/MOVE/CAPTURE, а не выполняются безусловно каждый ход. Здесь
// остаются только чистые примитивы — decideSpawnAction их использует.
