
// 📂 core/combatLogic.js

import { state } from '../core/state.js';
import { evaluatePostAction } from './gameStateMachine.js';
import { hasModule } from '../mechanics/units.js';
import { WeaponTypes } from './modules/weaponTypes.js';
import { adjustAllegiance, ATTACK_REPERCUSSION } from './diplomacy.js';

function getWeaponRange(unit) {
  const weapons = Array.isArray(unit.weType) ? unit.weType : [unit.weType];
  const ranges = weapons.map(w => WeaponTypes[w]?.range || 0);
  return Math.max(...ranges, unit.atRange || 1);
}

// Возвращает реальный урон attacker по target с учётом damageVs/targetClass,
// либо null если ни одно оружие не может поразить класс цели.
export function getAttackDamage(attacker, target) {
  const allWeapons = Array.isArray(attacker.weType)
    ? attacker.weType
    : (attacker.weType ? [attacker.weType] : []);
  const weapons = Object.keys(attacker.weaponUnlocks || {}).length > 0
    ? allWeapons.filter(w => (attacker.weaponUnlocks[w] ?? 0) <= (attacker.veteranLevel ?? 0))
    : allWeapons;
  const tClass = target.targetClass || 'surface';

  let best = null;
  for (const w of weapons) {
    const profile = WeaponTypes[w];
    if (!profile?.damageVs) continue;
    if (!(tClass in profile.damageVs)) continue;
    const dmg = Math.round(attacker.atDamage * profile.damageVs[tClass]);
    if (best === null || dmg > best) best = dmg;
  }
  return best;
}

function performAttack(attacker, target) {
  if (!attacker?.canAct) {
    console.warn(`[ATTACK BLOCKED] ${attacker?.type} can't act`);
    return;
  }

  const damage = getAttackDamage(attacker, target);
  if (damage === null) {
    console.warn(`[ATTACK BLOCKED] ${attacker.type} нет оружия против ${target.targetClass} (${target.type})`);
    attacker.canAct = false;
    return;
  }

  target.hp = Math.max(0, target.hp - damage);
  attacker.canAct = false;
  adjustAllegiance(state, attacker.owner, target.owner, ATTACK_REPERCUSSION);

  console.log(`⚔️ ${attacker.type} → ${target.type}[${target.targetClass}] ${damage}dmg → ${target.hp}/${target.maxHp}`);

  let killed = false;

  if (target.hp <= 0) {
    const idx = state.units.indexOf(target);
    if (idx >= 0) state.units.splice(idx, 1);
    console.log(`💀 ${target.type} погиб`);
    killed = true;
    attacker.kills = (attacker.kills || 0) + 1;
    const newLevel = attacker.kills >= 6 ? 3 : attacker.kills >= 3 ? 2 : 1;
    if (newLevel > (attacker.veteranLevel || 0)) {
      attacker.veteranLevel = newLevel;
      console.log(`⭐ [VET] ${attacker.type} достиг ветеранского уровня ${newLevel} (${attacker.kills} килов)`);
    }
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
}

function canAttack(attacker, target) {
  if (!attacker || !target || !attacker.canAct || attacker.owner === target.owner) return false;

  const range = getWeaponRange(attacker);

  const dx = Math.abs(attacker.q - target.q);
  const dy = Math.abs(attacker.r - target.r);
  const dz = Math.abs(attacker.s - target.s);

  return dx <= range && dy <= range && dz <= range;
  console.log(`💀 [KILL] ${unit.type} (${unit.q},${unit.r},${unit.s}) removed`);
}

export { performAttack, canAttack };