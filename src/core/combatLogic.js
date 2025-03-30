// 📂 core/combatLogic.js

import { renderUnits } from '../ui/render.js';
import { updateEndTurnButton } from '../ui/uiControls.js';
import { state } from '../core/state.js';
import { evaluatePostAction } from './gameStateMachine.js';
import { hasModule } from '../mechanics/units.js';
import { WeaponTypes } from './modules/weaponTypes.js';

function getWeaponRange(unit) {
  const weapons = Array.isArray(unit.weType) ? unit.weType : [unit.weType];
  const ranges = weapons.map(w => WeaponTypes[w]?.range || 0);
  return Math.max(...ranges, unit.atRange || 1);
}

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

  // ⚙️ Эффекты модулей
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

  if (killed && hasModule(attacker, 'Percy') && !attacker.actBonusUsed) {
    attacker.canAct = true;
    attacker.actBonusUsed = true;
    console.log('🔁 [Percy Triggered] repeat attack granted');
  }

  if (!killed && hasModule(attacker, 'Flee') && !attacker.actBonusUsed) {
    attacker.canMove = true;
    attacker.actBonusUsed = true;
    console.log('🏃 [Flee Triggered] move after attack allowed');
  } else {
    attacker.canMove = false;
  }

  evaluatePostAction(attacker, { type: 'attack', killed });
  state.hasActedThisTurn = true;
  renderUnits(state.scale, state.offset);
  updateEndTurnButton(true);
}

function canAttack(attacker, target) {
  if (!attacker || !target || !attacker.canAct || attacker.owner === target.owner) return false;

  const range = getWeaponRange(attacker);

  const dx = Math.abs(attacker.q - target.q);
  const dy = Math.abs(attacker.r - target.r);
  const dz = Math.abs(attacker.s - target.s);

  return dx <= range && dy <= range && dz <= range;
}

export { performAttack, canAttack };
