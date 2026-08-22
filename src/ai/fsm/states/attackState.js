// src/ai/fsm/states/attackState.js
import { hexDistance } from '../../../mechanics/hexUtils.js';
import { hasLineOfSight } from '../../../mechanics/lineOfSight.js';
import { findPath } from '../../../mechanics/pathfinding.js';
import { getAttackDamage } from '../../../core/combatLogic.js';
import { getAllegiance } from '../../../core/diplomacy.js';
 
export class AttackState {
  constructor(gameState, owner) {
    this.gameState = gameState;
    this.owner     = owner; // 'enemy0', 'enemy1' итд
  }
 
  // executeCallback: async (action) => void — вызывается сразу после решения,
  // ДО следующего юнита. Так каждый юнит видит актуальные HP целей
  // (убитые первым юнитом исчезают из gameState.units, подбитые — видны
  // с пониженным HP и дают бонус "можно добить").
  async execute(executeCallback) {
    const allMyUnits = this.gameState.units.filter(u => u.owner === this.owner);
    const myUnits = allMyUnits.filter(u => u.canMove || u.canAct);

    if (allMyUnits.length > 0 && myUnits.length === 0) {
      console.warn(`⚠️ [${this.owner}] Все юниты истощены: canMove/canAct = false`);
      allMyUnits.forEach(u => console.warn(`   ${u.type} canMove=${u.canMove} canAct=${u.canAct} pos=(${u.q},${u.r},${u.s})`));
    }

    const actions = [];

    for (const unit of myUnits) {
      // Юнит мог быть убит counter-attack'ом в предыдущей итерации
      if (!this.gameState.units.includes(unit)) continue;

      // Пересчитываем цели ПЕРЕД каждым юнитом — видим актуальный HP и состав.
      // Кандидаты — все чужие юниты (не только player1); кого из них реально
      // атаковать решает allegiance-вес в scoreTarget().
      const allTargets = this.gameState.units.filter(u => u.owner !== this.owner);
      // Оставляем только цели, которые этот юнит вообще может поразить (damageVs)
      const liveTargets = allTargets.filter(t => getAttackDamage(unit, t) !== null);

      const action = this.decideAction(unit, liveTargets);
      actions.push(action);

      // Применяем сразу — следующий юнит видит изменения в gameState
      if (executeCallback) await executeCallback(action);
    }

    return actions;
  }
 
  decideAction(unit, targets) {
    if (!targets.length) {
      return this.decideCaptureAction(unit) || { type: 'idle', unit };
    }

    // Выбираем лучшую цель через scoring
    const scored = targets.map(t => ({
      target: t,
      score:  this.scoreTarget(unit, t)
    })).sort((a, b) => b.score - a.score);

    const best = scored[0];
    // Отрицательный score — цель далеко или мы слабы, но всё равно двигаемся
    // (score влияет на выбор КОГО атаковать, не на то атаковать ли вообще)
    if (!best) return { type: 'idle', unit };

    const target = best.target;
    const dist   = hexDistance(unit, target);

    // Можем атаковать прямо сейчас — проверяем дистанцию И линию огня
    if (unit.canAct && dist <= unit.atRange) {
      const los = hasLineOfSight(unit, target, this.gameState.mapIndex, unit.weType);
      if (los) return { type: 'attack', unit, target };
      // LoS заблокирован — ищем позицию с LoS
      if (unit.canMove) {
        const dest = this.bestStepWithLoS(unit, target);
        if (dest) return { type: 'move', unit, destination: dest, target };
      }
    }

    // Нет атаки — сравниваем: идти к врагу или к точке захвата
    const cpAction = this.decideCaptureAction(unit);
    if (cpAction && cpAction.cpScore > best.score) return cpAction;

    // Двигаемся к цели, останавливаясь у края дальности (не вплотную)
    if (unit.canMove) {
      const optimalRange = Math.max(0, unit.atRange - 1);
      const dest = this.bestStepToward(unit, target, optimalRange);
      if (dest) return { type: 'move', unit, destination: dest, target };
    }

    return cpAction || { type: 'idle', unit };
  }

  // Move toward an unclaimed or enemy-owned capture point.
  // Returns action with cpScore so decideAction can compare vs enemy chase.
  decideCaptureAction(unit) {
    if (!unit.canMove) return null;
    const cps = (this.gameState.capturePoints || [])
      .filter(cp => cp.owner !== this.owner);
    if (!cps.length) return null;

    const scored = cps.map(cp => {
      let score = cp.owner ? 40 : 60;
      if (cp.claimant === this.owner) score += 20;
      score -= hexDistance(unit, cp) * 1.0;
      return { cp, score };
    }).sort((a, b) => b.score - a.score);

    const best = scored[0];
    if (!best) return null;

    // Already in contest range — stay put, capture logic handles the rest
    if (hexDistance(unit, best.cp) <= 3) return null;

    const dest = this.bestStepToward(unit, best.cp);
    if (!dest) return null;

    return { type: 'move', unit, destination: dest, cpScore: best.score };
  }

  scoreTarget(unit, target) {
    let score = 0;

    // Дипломатический вес (allegiance-матрица, core/diplomacy.js): чем хуже
    // отношения unit.owner↔target.owner, тем выше приоритет цели. Игрок
    // стартует с перекосом (см. initAllegiance), поэтому остаётся
    // приоритетной целью для всех enemy-фракций без отдельного if'а —
    // но реальный конфликт между двумя AI тоже сработает, если их
    // отношения испортятся сильнее, чем с игроком.
    score += -getAllegiance(this.gameState, unit.owner, target.owner);

    // Опасность юнита по роли (из classTemplates.dangerScore)
    // WCA > WSB/WSS/авиация > WCC/WDD > WBB/WLC
    score += target.dangerScore || 0;

    // Добить раненого выгодно
    const hpPercent = target.hp / (target.maxHp || target.hp);
    score += (1 - hpPercent) * 30;

    // Можем убить этим ударом — очень ценно (с учётом реального урона по классу цели)
    const actualDmg = getAttackDamage(unit, target) ?? 0;
    if (target.hp <= actualDmg) score += 40;

    // Штраф за дистанцию — уменьшен с 3 до 1 чтобы дальние юниты не idle
    const dist = hexDistance(unit, target);
    score -= dist * 1;

    // Не атаковать если сами почти мертвы
    if (unit.hp <= 1) score -= 30;

    // Шаг B: штраф за опасный размен (SimpleAgent.evalAttack)
    // Если мы в зоне атаки цели И цель убьёт нас ответным ударом — избегать
    const counterDmg = getAttackDamage(target, unit) ?? 0;
    if (dist <= (target.atRange || 1) && counterDmg >= unit.hp) {
      score -= 60;
    }

    return score;
  }

  // Возвращает лучший доступный гекс в сторону цели.
  // Использует findPath (A*) для построения полного маршрута через карту —
  // это позволяет обойти препятствия (острова), которые чисто жадный шаг
  // по прямой дистанции не может обойти (см. known-issues #2/#22).
  // За этот ход всё равно делается только один шаг, ограниченный moRange.
  // optimalRange: не заходить ближе этой дистанции к цели (range-aware stop).
  bestStepToward(unit, target, optimalRange = 0) {
    const available = unit.getAvailableHexes();
    if (!available.length) return null;

    const occupied = new Set(
      this.gameState.units.map(u => `${u.q},${u.r},${u.s}`)
    );
    const availableKeys = new Set(
      available
        .filter(hex => !occupied.has(`${hex.q},${hex.r},${hex.s}`))
        .map(hex => `${hex.q},${hex.r},${hex.s}`)
    );

    const path = findPath(unit, target, this.gameState.mapIndex, unit);

    if (path.length > 0) {
      // Два прохода: сначала ищем шаг с соблюдением optimalRange,
      // при неудаче — любой допустимый шаг по пути.
      for (let pass = 0; pass < 2; pass++) {
        for (let i = path.length - 1; i >= 0; i--) {
          const key = `${path[i].q},${path[i].r},${path[i].s}`;
          if (!availableKeys.has(key)) continue;
          if (pass === 0 && optimalRange > 0 && hexDistance(path[i], target) < optimalRange) continue;
          return path[i];
        }
      }
    }

    // findPath не нашёл маршрут (например, цель полностью отрезана) —
    // fallback на старое поведение: ближайший по прямой свободный гекс.
    const sorted = [...available].sort(
      (a, b) => hexDistance(a, target) - hexDistance(b, target)
    );
    for (const hex of sorted) {
      const key = `${hex.q},${hex.r},${hex.s}`;
      if (availableKeys.has(key)) return hex;
    }

    return null;
  }
 
  // Ищет гекс из доступных с которого есть LoS на цель и в зоне атаки
  bestStepWithLoS(unit, target) {
    const available = unit.getAvailableHexes();
    if (!available.length) return null;
 
    const occupied = new Set(
      this.gameState.units.map(u => `${u.q},${u.r},${u.s}`)
    );
 
    // Ищем гекс в зоне атаки с LoS
    const candidates = available.filter(hex => {
      if (occupied.has(`${hex.q},${hex.r},${hex.s}`)) return false;
      const dist = hexDistance(hex, target);
      if (dist > unit.atRange) return false;
      return hasLineOfSight(hex, target, this.gameState.mapIndex, unit.weType);
    });
 
    if (candidates.length) {
      // Из кандидатов берём тот что ближе к цели
      candidates.sort((a, b) => hexDistance(a, target) - hexDistance(b, target));
      return candidates[0];
    }
 
    // Нет позиции с LoS в зоне атаки — просто идём ближе
    return null;
  }
}