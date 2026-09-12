// src/ai/combatSimulator.js
//
// Шаг C (docs/ai-design-notes-tribes.md): вместо хардкод-порогов в
// scoreTarget() — реально просимулировать обмен и оценить результат.
// Чистый модуль, без знания про гексы/карту/state — только числа.

import { getAttackDamage, getCounterDamage } from '../core/combatLogic.js';

// Та же последовательность, что и реальный combatLogic.js:performAttack —
// урон считается первым, контрудар только если цель выжила, из HP ДО
// удара (симметричный обмен, не "цель уже подранена — ответ слабее").
// inCounterRange передаёт вызывающий код (этот модуль ничего не знает про
// гексы) — тот же guard, что уже есть в scoreTarget.
// multiplier — для оценки заряженной атаки (Torp-абилка) ДО того как её
// реально применили: та же логика, что реальный performAttack получает
// через свой options.multiplier, см. combatLogic.js.
export function simulateAttack(unit, target, { inCounterRange = true, multiplier = 1 } = {}) {
  const damage = getAttackDamage(unit, target, multiplier) ?? 0;
  const targetHpAfter = Math.max(0, target.hp - damage);
  const targetKilled = targetHpAfter <= 0;

  let counterDamage = 0;
  let attackerHpAfter = unit.hp;
  let attackerKilled = false;

  if (!targetKilled && inCounterRange) {
    counterDamage = getCounterDamage(unit, target, multiplier) ?? 0;
    attackerHpAfter = Math.max(0, unit.hp - counterDamage);
    attackerKilled = attackerHpAfter <= 0;
  }

  return { damage, targetHpAfter, targetKilled, counterDamage, attackerHpAfter, attackerKilled };
}

// Насколько target угрожает evaluator'у, если ударит первым — реальный
// расчёт по боевой формуле (damageVs/targetClass/def/текущий HP обеих
// сторон, через getAttackDamage(target, evaluator) — target выступает
// "атакующим" в этом расчёте). Не абстрактная константа: 0, если target
// физически не может задеть класс evaluator'а (например ASP.DC не бьёт
// 'surface' — тогда ASP для линкора не "опасен", формула это знает сама).
export function threatTo(evaluator, target) {
  return getAttackDamage(target, evaluator) ?? 0;
}

// Эмерджентная опасность цели ДЛЯ КОНКРЕТНОГО evaluator'а — заменяет
// ручную per-класс константу dangerScore. Соотношение угрозы к текущему
// HP цели: бьёт больно и сам умирает легко = приоритетная цель ("glass
// cannon" — по формулировке пользователя, дамаг/хп). target.hp, не
// maxHp — по мере того как цель ранят, соотношение меняется само, без
// отдельного "бонус за раненого" слагаемого поверх (хотя тот тоже остаётся
// в scoreTarget — он про другое: "добить, раз уже начали", а это — про
// то, кто вообще опасен как цель).
export function dangerRatio(evaluator, target) {
  return threatTo(evaluator, target) / Math.max(1, target.hp);
}

// Базовая боевая ценность юнита = его собственный ATK (сколько урона он
// в принципе способен наносить, пока жив) — раньше это грубо
// аппроксимировала ручная dangerScore-константа. strategicValue — редкое
// явное исключение для юнитов, чья реальная ценность НЕ выводится из
// боевых характеристик (например WCA — слабый сам по себе, но носитель
// авиации; см. classTemplates.js, комментарий на WCA).
export function unitValue(unit, hp = unit.hp) {
  const weight = (unit.atDamage || 0) + (unit.strategicValue || 0);
  const hpFraction = Math.max(0, hp) / (unit.maxHp || unit.hp || 1);
  return weight * hpFraction;
}

// Сколько ценности потерял target минус сколько потерял unit, из
// просимулированного обмена. Положительное = выгодный для нас размен.
// Без масштаба — вызывающий код сам решает, как это взвесить рядом с
// остальными слагаемыми score.
export function tradeValue(unit, target, sim) {
  const targetValueLost = unitValue(target, target.hp) - unitValue(target, sim.targetHpAfter);
  const attackerValueLost = unitValue(unit, unit.hp) - unitValue(unit, sim.attackerHpAfter);
  return targetValueLost - attackerValueLost;
}
