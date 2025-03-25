// 📂 core/combatLogic.js

import { renderUnits } from '../ui/render.js';
import { updateEndTurnButton } from '../ui/uiControls.js';
import { state } from '../core/state.js';
import { handlePostAttackPhase } from './gameStateMachine.js';
import { hasModule } from '../mechanics/units.js';

function performAttack(attacker, target) {
  if (attacker.actions <= 0) return;

  target.hp -= 1;
  attacker.actions -= 1;

  console.log(`⚔️ ${attacker.type} атакует ${target.type} → ${target.hp}/${target.maxHp}`);

  let lastAttackKilled = false;

  if (target.hp <= 0) {
    const idx = state.units.indexOf(target);
    if (idx >= 0) state.units.splice(idx, 1);
    console.log(`💀 ${target.type} погиб`);
    lastAttackKilled = true;
  }

  if (hasModule(attacker, 'Corrupt')) {
    console.log('☣️ Corrupt: цель получает эффект разложения');
    target.status = target.status || [];
    target.status.push('corroded');
  }

  if (hasModule(attacker, 'Surge')) {
    console.log('❄️ Surge: цель заморожена');
    target.status = target.status || [];
    target.status.push('frozen');
  }

  // 🧠 FSM должен идти до очистки selectedUnit!
  handlePostAttackPhase(attacker, lastAttackKilled);
  console.log("🔥 FSM complete:", attacker.actions);

  // ⛔ очищаем только если действий больше нет (и не были восстановлены FSM)
  if (attacker.actions <= 0) {
    attacker.deselect?.();
    state.selectedUnit = null;
    state.highlightedHexes = [];
  }

  state.hasActedThisTurn = true;
  renderUnits(state.scale, state.offset);
  updateEndTurnButton(true);
}

function canAttack(attacker, target) {
  if (!attacker || !target) return false;
  if (attacker.actions <= 0) return false;
  if (attacker.owner === target.owner) return false;

  const dx = Math.abs(attacker.q - target.q);
  const dy = Math.abs(attacker.r - target.r);
  const dz = Math.abs(attacker.s - target.s);
  return dx <= attacker.attackRange && dy <= attacker.attackRange && dz <= attacker.attackRange;
}

export { performAttack, canAttack };
