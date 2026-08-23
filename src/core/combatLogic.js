
// 📂 core/combatLogic.js

import { state } from '../core/state.js';
import { evaluatePostAction } from './gameStateMachine.js';
import { hasModule } from '../mechanics/units.js';
import { WeaponTypes } from './modules/weaponTypes.js';
import { adjustAllegiance, ATTACK_REPERCUSSION } from './diplomacy.js';
import { getNeighbors } from '../world/map.js';

function getWeaponRange(unit) {
  const weapons = Array.isArray(unit.weType) ? unit.weType : [unit.weType];
  const ranges = weapons.map(w => WeaponTypes[w]?.range || 0);
  return Math.max(...ranges, unit.atRange || 1);
}

// Множитель из формулы боя настоящей Polytopia (polytopia.fandom.com/wiki/Combat,
// раздел Damage Formula) — attackResult/defenceResult считаются через него.
const ATTACK_ACCELERATOR = 4.5;

// Лучший доступный "сырой" ATK attacker против targetClass цели, с учётом
// damageVs (какое оружие вообще может поразить этот класс и с каким
// множителем) и weaponUnlocks/veteranLevel. Без округления — округляем
// один раз, в самом конце, на attackResult/defenceResult.
// null = ни одно оружие не может поразить этот класс цели вообще.
function getEffectiveAttack(attacker, target) {
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
    const eff = attacker.atDamage * profile.damageVs[tClass];
    if (best === null || eff > best) best = eff;
  }
  return best;
}

// attackForce/defenseForce/totalForce — общая часть формулы, одна на пару
// attacker→target, использует и getAttackDamage, и getCounterDamage (чтобы
// оба считались из одного и того же обмена, как в оригинале, а не как два
// independent "что если").
function computeForces(attacker, target) {
  const effectiveAttack = getEffectiveAttack(attacker, target);
  if (effectiveAttack === null) return null;

  const attackForce = effectiveAttack * (attacker.hp / attacker.maxHp);
  // defenseBonus — множитель от террейна/укреплений, у нас пока не
  // реализован (см. project-memory "Terrain modifiers"), дефолт 1.
  const defenseForce = target.def * (target.hp / target.maxHp) * (target.defenseBonus ?? 1);

  return { effectiveAttack, attackForce, defenseForce, totalForce: attackForce + defenseForce };
}

// Урон attacker → target (attackResult). null = attacker физически не может
// поразить класс цели (ни одно оружие не подходит).
export function getAttackDamage(attacker, target) {
  const f = computeForces(attacker, target);
  if (!f) return null;
  return Math.round((f.attackForce / f.totalForce) * f.effectiveAttack * ATTACK_ACCELERATOR);
}

// Ответный урон target → attacker, ЕСЛИ attacker атакует target
// (defenceResult, из ТОГО ЖЕ обмена что и getAttackDamage, не независимый
// пересчёт). null если: attacker.noCounter (Surprise-эквивалент — авиация
// бьёт безответно), либо у target физически нет оружия против класса
// attacker (наш дополнительный гейт поверх оригинальной формулы — у
// настоящей Polytopia нет air/sub/surface, а у нас подлодка/авиация
// по дизайну бьют не всех, см. ai-design-notes-tribes.md).
export function getCounterDamage(attacker, target) {
  if (attacker.noCounter) return null;
  const f = computeForces(attacker, target);
  if (!f) return null;
  if (getEffectiveAttack(target, attacker) === null) return null;
  return Math.round((f.defenseForce / f.totalForce) * target.def * ATTACK_ACCELERATOR);
}

function registerKill(killer) {
  killer.kills = (killer.kills || 0) + 1;
  const newLevel = killer.kills >= 6 ? 3 : killer.kills >= 3 ? 2 : 1;
  if (newLevel > (killer.veteranLevel || 0)) {
    killer.veteranLevel = newLevel;
    console.log(`⭐ [VET] ${killer.type} достиг ветеранского уровня ${newLevel} (${killer.kills} килов)`);
  }
}

function removeUnit(unit) {
  const idx = state.units.indexOf(unit);
  if (idx >= 0) state.units.splice(idx, 1);
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

  // 🛡️ Контратака (defenceResult формулы Polytopia — см. getCounterDamage)
  // считается ДО применения основного урона — attackForce/defenseForce
  // берутся из HP обеих сторон на момент начала обмена, а не "цель уже
  // подранена, поэтому её ответ слабее" (это одновременный обмен, не
  // потом-контратака). Нужна дистанция в пределах ЕЁ собственной дальности
  // ("cannot reach... the attacker" в оригинале) — getCounterDamage её не
  // проверяет сама. Авиация (noCounter=true) бьёт безответно.
  const counterRange = getWeaponRange(target);
  const dx = Math.abs(target.q - attacker.q);
  const dy = Math.abs(target.r - attacker.r);
  const dz = Math.abs(target.s - attacker.s);
  const inCounterRange = dx <= counterRange && dy <= counterRange && dz <= counterRange;
  const counterDamage = inCounterRange ? getCounterDamage(attacker, target) : null;

  target.hp = Math.max(0, target.hp - damage);
  attacker.canAct = false;
  adjustAllegiance(state, attacker.owner, target.owner, ATTACK_REPERCUSSION);

  console.log(`⚔️ ${attacker.type} → ${target.type}[${target.targetClass}] ${damage}dmg → ${target.hp}/${target.maxHp}`);

  // 💥 Splash — урон по соседям цели, половина от того, что нанёс бы этот же
  // удар как основной (та же формула, затем round(×0.5), округление один
  // раз после деления, не второй множитель поверх формулы боя). Без
  // контратаки от них и без влияния на Percy-цепочку основной цели.
  if (hasModule(attacker, 'Splash')) {
    for (const hex of getNeighbors(target.q, target.r, target.s)) {
      const splashTarget = state.units.find(u =>
        u.q === hex.q && u.r === hex.r && u.s === hex.s && u.owner !== attacker.owner
      );
      if (!splashTarget) continue;

      const fullDamage = getAttackDamage(attacker, splashTarget);
      if (fullDamage === null) continue;
      const splashDamage = Math.round(fullDamage * 0.5);

      splashTarget.hp = Math.max(0, splashTarget.hp - splashDamage);
      adjustAllegiance(state, attacker.owner, splashTarget.owner, ATTACK_REPERCUSSION);
      console.log(`💥 Splash ${attacker.type} → ${splashTarget.type} ${splashDamage}dmg → ${splashTarget.hp}/${splashTarget.maxHp}`);

      if (splashTarget.hp <= 0) {
        removeUnit(splashTarget);
        registerKill(attacker);
        console.log(`💀 ${splashTarget.type} погиб от Splash`);
      }
    }
  }

  let killed = false;

  if (target.hp <= 0) {
    removeUnit(target);
    console.log(`💀 ${target.type} погиб`);
    killed = true;
    registerKill(attacker);
  } else {
    if (counterDamage !== null) {
      attacker.hp = Math.max(0, attacker.hp - counterDamage);
      console.log(`🛡️ ${target.type} контратакует → ${attacker.type} ${counterDamage}dmg → ${attacker.hp}/${attacker.maxHp}`);

      if (attacker.hp <= 0) {
        removeUnit(attacker);
        console.log(`💀 ${attacker.type} погиб от контратаки`);
        registerKill(target);

        // Атакующий погиб — снимаем выделение/подсветку с него (не с
        // защитника: тот не совершал полноценного хода, Percy-цепочку
        // ему запускать не нужно).
        attacker.canMove = false;
        evaluatePostAction(attacker, { type: 'attack', killed: false });
        state.hasActedThisTurn = true;
        return;
      }
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
}

export { performAttack, canAttack };