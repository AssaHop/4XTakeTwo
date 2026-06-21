// src/core/aviationLogic.js
// Расходная авиация: счётчик ходов жизни + спаун от WCA.
//
// Вызывается в начале каждого хода владельца (до runAIForTurn / до хода игрока):
//   1. Уменьшаем lifeTurns у всех авиаюнитов владельца; удаляем выработавших ресурс.
//   2. Если жив WCA — спауним один авиаюнит рядом (цикл ATB→ADB→AAF→…),
//      не больше MAX_AVIATION в воздухе одновременно.
//
// noCounter: true на AAF/ADB/ATB зарезервирован для будущего counter-attack.
// Сейчас combat в combatLogic.js однонаправленный, флаг не читается.

import { Unit, getOwnerColor } from '../mechanics/units.js';
import { ClassTemplates } from './classTemplates.js';

const AVIATION_TYPES = ['ATB', 'ADB', 'AAF'];
const MAX_AVIATION   = 4;

// owner → индекс следующего типа в AVIATION_TYPES
const spawnCycle = new Map();

export function processAviationTurn(state, owner) {
  tickAviationLifetime(state, owner);
  spawnFromWCA(state, owner);
}

export function resetAviationState() {
  spawnCycle.clear();
}

function tickAviationLifetime(state, owner) {
  for (let i = state.units.length - 1; i >= 0; i--) {
    const unit = state.units[i];
    if (unit.owner !== owner || unit.lifeTurns == null) continue;
    unit.lifeTurns--;
    if (unit.lifeTurns <= 0) {
      state.units.splice(i, 1);
      console.log(`💨 [${owner}] ${unit.type} выработал ресурс, выведен`);
    }
  }
}

function spawnFromWCA(state, owner) {
  const wca = state.units.find(u => u.owner === owner && u.type === 'WCA');
  if (!wca) return;

  const aviationCount = state.units.filter(
    u => u.owner === owner && AVIATION_TYPES.includes(u.type)
  ).length;
  if (aviationCount >= MAX_AVIATION) return;

  const idx  = spawnCycle.get(owner) ?? 0;
  const type = AVIATION_TYPES[idx % AVIATION_TYPES.length];
  spawnCycle.set(owner, idx + 1);

  const hex = findSpawnHex(wca, type, state);
  if (!hex) {
    console.log(`✈️ [${owner}] WCA: нет места для спауна ${type}`);
    return;
  }

  const template = ClassTemplates[type];
  const unit = new Unit(hex.q, hex.r, hex.s, type, owner, template);
  unit.color = getOwnerColor(owner);
  state.units.push(unit);
  console.log(`✈️ [${owner}] WCA спаунит ${type} на (${hex.q},${hex.r},${hex.s}), lifeTurns=${unit.lifeTurns}`);
}

function findSpawnHex(wca, type, state) {
  const template = ClassTemplates[type];
  const occupied = new Set(state.units.map(u => `${u.q},${u.r},${u.s}`));

  const dirs = [
    { q: 1, r: -1, s: 0 }, { q: 1, r: 0, s: -1 }, { q: 0, r: 1, s: -1 },
    { q: -1, r: 1, s: 0 }, { q: -1, r: 0, s: 1 }, { q: 0, r: -1, s: 1 }
  ];

  for (const d of dirs) {
    const hex = { q: wca.q + d.q, r: wca.r + d.r, s: wca.s + d.s };
    const key = `${hex.q},${hex.r},${hex.s}`;
    if (occupied.has(key)) continue;
    const tile = state.mapIndex?.[key];
    if (!tile) continue;
    if (!template.spawnTerrain?.includes(tile.terrainType)) continue;
    return hex;
  }
  return null;
}
