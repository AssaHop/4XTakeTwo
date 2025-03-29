// 📂 core/combatLogic.js

import { renderUnits } from '../ui/render.js';
import { updateEndTurnButton } from '../ui/uiControls.js';
import { state } from '../core/state.js';
import { evaluatePostAction } from './gameStateMachine.js';
import { hasModule } from '../mechanics/units.js';

function performAttack(attacker, target) {
  if (!attacker?.canAct) {
    console.warn(`[ATTACK BLOCKED] ${attacker?.type} can't act`);
    return;
  }

  target.hp -= attacker.atDamage || 1;
  attacker.canAct = false;

  console.log(`⚔️ ${attacker.type} атакует ${target.type} → ${target.hp}/${target.maxHp}`);

  let killed = false;

  if (target.hp <= 0) {
    const idx = state.units.indexOf(target);
    if (idx >= 0) state.units.splice(idx, 1);
    console.log(`💀 ${target.type} погиб`);
    killed = true;
  }

  // ⚙️ Модули эффектов
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

  // 🔁 Percy: доп. атака только если убил
  if (killed && hasModule(attacker, 'Percy') && !attacker.actBonusUsed) {
    attacker.canAct = true;
    attacker.actBonusUsed = true;
    console.log('🔁 [Percy Triggered] repeat attack granted');
  }

  // 🏃 Flee: можно двигаться только если ИЗНАЧАЛЬНО было canAct=true
  if (!killed && hasModule(attacker, 'Flee') && !attacker.actBonusUsed) {
    attacker.canMove = true;
    attacker.actBonusUsed = true;
    console.log('🏃 [Flee Triggered] move after attack allowed');
  } else {
    attacker.canMove = false; // default case — не должен больше двигаться
  }

  evaluatePostAction(attacker, {
    type: 'attack',
    killed: killed
  });

  state.hasActedThisTurn = true;
  renderUnits(state.scale, state.offset);
  updateEndTurnButton(true);
}

function canAttack(attacker, target) {
  if (!attacker || !target) return false;
  if (!attacker.canAct) return false;
  if (attacker.owner === target.owner) return false;

  const dx = Math.abs(attacker.q - target.q);
  const dy = Math.abs(attacker.r - target.r);
  const dz = Math.abs(attacker.s - target.s);

  return (
    dx <= attacker.atRange &&
    dy <= attacker.atRange &&
    dz <= attacker.atRange
  );
}

export { performAttack, canAttack };
