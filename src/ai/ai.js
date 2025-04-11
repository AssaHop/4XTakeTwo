import { Unit } from '../mechanics/units.js';
import { state } from '../core/state.js';
import { findPath } from '../mechanics/pathfinding.js';
import { evaluatePostAction, transitionTo, GameState } from '../core/gameStateMachine.js';
import { performAttack } from '../core/combatLogic.js';
import { updateEndTurnButton } from '../ui/uiControls.js';

/** 🔁 Главная точка запуска AI для всех вражеских юнитов */
function runAIForAllUnits() {
  const aiUnits = state.units.filter(u => u.owner?.startsWith('enemy') && (u.canAct || u.canMove));
  let index = 0;

  function step() {
    if (index >= aiUnits.length) {
      transitionTo(GameState.IDLE);
      updateEndTurnButton();
      return;
    }

    const unit = aiUnits[index];
    console.log(`🤖 [AI Step] ${index + 1}/${aiUnits.length}`);
    runAIForUnit(unit);
    index++;

    setTimeout(step, 250); // ⏳ Задержка между юнитами
  }

  transitionTo(GameState.ENEMY_TURN);
  step();
}

/** 🧠 AI-действия для одного вражеского юнита */
function runAIForUnit(unit) {
  if (!unit || (!unit.canAct && !unit.canMove)) return;

  const allEnemies = state.units.filter(u => u.owner !== unit.owner);
  const visibleEnemies = allEnemies.filter(enemy => hexDistance(unit, enemy) <= unit.viRange);

  let target = visibleEnemies.length > 0
    ? findClosestEnemy(unit, visibleEnemies)
    : getScoutTarget(unit);

  if (!target) return;

  const canAttackNow = Unit.getAttackableHexes(unit).some(
    h => h.q === target.q && h.r === target.r && h.s === target.s
  );

  if (canAttackNow && unit.canAct) {
    const killed = performAttack(unit, target);
    evaluatePostAction(unit, { type: 'attack', killed });
    return;
  }

  if (unit.canMove) {
    const path = findPath(unit, target, state.map, unit);
    if (path.length === 0) {
      console.log(`🚫 No path for ${unit.type} to (${target.q},${target.r},${target.s})`);
      return;
    }

    const step = path[0];
    const moved = unit.moveTo(step.q, step.r, step.s);
    if (moved) {
      evaluatePostAction(unit, { type: 'move' });
    }
  }
}

/** 🔍 Поиск ближайшего врага */
function findClosestEnemy(unit, enemies) {
  let closest = null;
  let minDist = Infinity;
  for (const enemy of enemies) {
    const d = hexDistance(unit, enemy);
    if (d < minDist) {
      minDist = d;
      closest = enemy;
    }
  }
  return closest;
}

/** 📐 Гекс-расстояние */
function hexDistance(a, b) {
  return Math.max(
    Math.abs(a.q - b.q),
    Math.abs(a.r - b.r),
    Math.abs(a.s - b.s)
  );
}

/** 🕵️ Поиск ближайшей клетки в тумане */
function getScoutTarget(unit) {
  const visited = new Set();
  const queue = [{ q: unit.q, r: unit.r, s: unit.s }];

  while (queue.length > 0) {
    const { q, r, s } = queue.shift();
    const key = `${q},${r},${s}`;
    if (visited.has(key)) continue;
    visited.add(key);

    const tile = state.map[key];
    if (!tile || tile.fogged === true) {
      return { q, r, s }; // Цель — клетка вне видимости
    }

    const neighbors = getHexNeighbors({ q, r, s });
    for (const n of neighbors) {
      queue.push(n);
    }
  }

  return null;
}

/** ➕ Соседние клетки */
function getHexNeighbors(hex) {
  const directions = [
    { q: +1, r: -1, s: 0 }, { q: +1, r: 0, s: -1 }, { q: 0, r: +1, s: -1 },
    { q: -1, r: +1, s: 0 }, { q: -1, r: 0, s: +1 }, { q: 0, r: -1, s: +1 }
  ];
  return directions.map(d => ({
    q: hex.q + d.q,
    r: hex.r + d.r,
    s: hex.s + d.s
  }));
}

export { runAIForAllUnits, runAIForUnit };
