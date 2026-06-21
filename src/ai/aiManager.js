// src/ai/aiManager.js
import { StrategyFSM } from './fsm/strategyFSM.js';
import { performAttack } from '../core/combatLogic.js';
import { hexDistance } from '../mechanics/hexUtils.js';
import { hasLineOfSight } from '../mechanics/lineOfSight.js';

const fsmMap = new Map();

export async function runAIForTurn(gameState, owner) {
  if (!owner || owner === 'player1') return;

  if (!fsmMap.has(owner)) {
    fsmMap.set(owner, new StrategyFSM(gameState, owner));
    console.log(`🧠 FSM создан для ${owner}`);
  }

  const fsm = fsmMap.get(owner);
  const actions = fsm.update();
  console.log(`🧠 [${owner}] actions:`, actions.map(a => `${a.type}:${a.unit?.type}`));

  for (const action of actions) {
    if (!action.unit) continue;
    await executeAction(action, gameState, owner);
  }
}

async function executeAction(action, gameState, owner) {
  const { unit, target, destination } = action;

  switch (action.type) {

    case 'move': {
      if (!unit.canMove || !destination) break;
      console.log(`🚢 [${owner}] ${unit.type} идёт к (${destination.q},${destination.r},${destination.s})`);
      unit.moveTo(destination.q, destination.r, destination.s);

      // Charge: атакуем после движения если цель в зоне и есть LoS
      if (unit.canAct && unit.hasModule?.('Charge') && target) {
        const dist = hexDistance(unit, target);
        const los = dist <= unit.atRange && hasLineOfSight(unit, target, gameState.mapIndex, unit.weType);
        if (los) {
          console.log(`⚡ [${owner}] ${unit.type} Charge → атакует ${target.type}`);
          const killed = executeAttack(unit, target, gameState, owner);

          // Flee: отходим после атаки
          if (unit.canMove && unit.hasModule?.('Flee')) {
            const safeHex = findSafeHex(unit, gameState);
            if (safeHex) {
              console.log(`🏃 [${owner}] ${unit.type} Flee → отходит`);
              unit.moveTo(safeHex.q, safeHex.r, safeHex.s);
            }
          }

          // Percy: повторная атака если убили
          if (killed && unit.canAct && unit.hasModule?.('Percy')) {
            const nextTarget = findBestTarget(unit, gameState);
            if (nextTarget) {
              console.log(`🔁 [${owner}] ${unit.type} Percy → атакует ${nextTarget.type}`);
              executeAttack(unit, nextTarget, gameState, owner);
            }
          }
        }
      }
      break;
    }

    case 'attack': {
      if (!unit.canAct || !target) break;
      console.log(`⚔️ [${owner}] ${unit.type} атакует ${target.type}`);
      const killed = executeAttack(unit, target, gameState, owner);

      // Percy: повторная атака если убили
      if (killed && unit.canAct && unit.hasModule?.('Percy')) {
        const nextTarget = findBestTarget(unit, gameState);
        if (nextTarget) {
          console.log(`🔁 [${owner}] ${unit.type} Percy → атакует ${nextTarget.type}`);
          executeAttack(unit, nextTarget, gameState, owner);
        }
      }

      // Flee: отходим после атаки
      if (unit.canMove && unit.hasModule?.('Flee')) {
        const safeHex = findSafeHex(unit, gameState);
        if (safeHex) {
          console.log(`🏃 [${owner}] ${unit.type} Flee → отходит`);
          unit.moveTo(safeHex.q, safeHex.r, safeHex.s);
        }
      }
      break;
    }

    case 'idle':
      console.log(`🛑 [${owner}] ${unit.type} idle`);
      break;
  }
}

// Возвращает true если цель убита
function executeAttack(unit, target, gameState, owner) {
  if (!unit.canAct || !target) return false;
  const hpBefore = target.hp;
  performAttack(unit, target);
  return target.hp <= 0 || !gameState.units.includes(target);
}

// Лучшая цель для Percy (из оставшихся живых врагов в зоне атаки)
function findBestTarget(unit, gameState) {
  const targets = gameState.units.filter(u =>
    u.owner === 'player1' &&
    hexDistance(unit, u) <= unit.atRange
  );
  if (!targets.length) return null;
  return targets.sort((a, b) => a.hp - b.hp)[0]; // добиваем слабейшего
}

// Безопасный гекс для отхода.
// Приоритет 1: если суммарный входящий урон >= hp → уходить от врагов.
// Приоритет 2: иначе — двигаться к ближайшей незахваченной точке захвата.
// Приоритет 3: fallback — максимально дальше от врагов.
function findSafeHex(unit, gameState) {
  const available = unit.getAvailableHexes();
  if (!available.length) return null;

  const enemies = gameState.units.filter(u => u.owner !== unit.owner);
  const occupied = new Set(gameState.units.map(u => `${u.q},${u.r},${u.s}`));
  const free = available.filter(h => !occupied.has(`${h.q},${h.r},${h.s}`));

  const incomingThreat = enemies
    .filter(e => hexDistance(e, unit) <= (e.atRange || 1))
    .reduce((sum, e) => sum + (e.atDamage || 1), 0);

  const willDie = incomingThreat >= unit.hp;

  if (!willDie && free.length) {
    // Safe enough — move toward nearest unowned/enemy CP
    const contestable = (gameState.capturePoints || [])
      .filter(cp => cp.owner !== unit.owner)
      .sort((a, b) => hexDistance(a, unit) - hexDistance(b, unit));

    if (contestable.length) {
      const target = contestable[0];
      const toward = free.slice().sort(
        (a, b) => hexDistance(a, target) - hexDistance(b, target)
      )[0];
      if (toward) return toward;
    }
  }

  if (!enemies.length) return free[0] || null;

  // Safety mode: move as far as possible from all enemies
  return free.sort((a, b) => {
    const distA = Math.min(...enemies.map(e => hexDistance(a, e)));
    const distB = Math.min(...enemies.map(e => hexDistance(b, e)));
    return distB - distA;
  })[0] || null;
}

export function resetAIState() {
  fsmMap.clear();
}
