// src/ai/fsm/states/attackState.js
import { hexDistance } from '../../../mechanics/hexUtils.js';
import { hasLineOfSight } from '../../../mechanics/lineOfSight.js';
 
export class AttackState {
  constructor(gameState, owner) {
    this.gameState = gameState;
    this.owner     = owner; // 'enemy0', 'enemy1' итд
  }
 
  execute() {
    // Только юниты ЭТОГО AI которые ещё могут действовать
    const allMyUnits = this.gameState.units.filter(u => u.owner === this.owner);
    const myUnits = allMyUnits.filter(u => u.canMove || u.canAct);
    
    if (allMyUnits.length > 0 && myUnits.length === 0) {
      console.warn(`⚠️ [${this.owner}] Все юниты истощены: canMove/canAct = false`);
      allMyUnits.forEach(u => console.warn(`   ${u.type} canMove=${u.canMove} canAct=${u.canAct} pos=(${u.q},${u.r},${u.s})`));
    }
 
    // Цели: только player1 (приоритет) + по желанию другие AI
    // Не атакуем других enemy — они не союзники но и не главный враг
    const targets = this.gameState.units.filter(
      u => u.owner === 'player1'
    );
    // Если игрок мёртв или нет его юнитов — атакуем всех остальных
    const allTargets = targets.length > 0
      ? targets
      : this.gameState.units.filter(u => u.owner !== this.owner);
 
    const actions = [];
 
    for (const unit of myUnits) {
      const action = this.decideAction(unit, allTargets);
      actions.push(action);
    }
 
    return actions;
  }
 
  decideAction(unit, targets) {
    if (!targets.length) return { type: 'idle', unit };
 
    // Выбираем лучшую цель через scoring
    const scored = targets.map(t => ({
      target: t,
      score:  this.scoreTarget(unit, t)
    })).sort((a, b) => b.score - a.score);
 
    const best = scored[0];
    if (!best || best.score < 0) return { type: 'idle', unit };
 
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
 
    // Двигаемся к цели если можем
    if (unit.canMove) {
      const dest = this.bestStepToward(unit, target);
      if (dest) return { type: 'move', unit, destination: dest, target };
    }
 
    return { type: 'idle', unit };
  }
 
  scoreTarget(unit, target) {
    let score = 0;
 
    // Приоритет: атаковать player1 сильнее чем других AI
    if (target.owner === 'player1') score += 50;
 
    // Добить раненого выгодно
    const hpPercent = target.hp / (target.maxHp || target.hp);
    score += (1 - hpPercent) * 30;
 
    // Можем убить этим ударом — очень ценно
    if (target.hp <= (unit.atDamage || 1)) score += 40;
 
    // Штраф за дистанцию
    const dist = hexDistance(unit, target);
    score -= dist * 3;
 
    // Не атаковать если сами почти мертвы
    if (unit.hp <= 1) score -= 30;
 
    return score;
  }
 
  // Возвращает лучший доступный гекс в сторону цели
  bestStepToward(unit, target) {
    const available = unit.getAvailableHexes();
    if (!available.length) return null;
 
    // Сортируем по близости к цели
    available.sort((a, b) => hexDistance(a, target) - hexDistance(b, target));
 
    // Берём ближайший свободный гекс
    const occupied = new Set(
      this.gameState.units.map(u => `${u.q},${u.r},${u.s}`)
    );
 
    for (const hex of available) {
      const key = `${hex.q},${hex.r},${hex.s}`;
      if (!occupied.has(key)) return hex;
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