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
export function simulateAttack(unit, target, { inCounterRange = true } = {}) {
  const damage = getAttackDamage(unit, target) ?? 0;
  const targetHpAfter = Math.max(0, target.hp - damage);
  const targetKilled = targetHpAfter <= 0;

  let counterDamage = 0;
  let attackerHpAfter = unit.hp;
  let attackerKilled = false;

  if (!targetKilled && inCounterRange) {
    counterDamage = getCounterDamage(unit, target) ?? 0;
    attackerHpAfter = Math.max(0, unit.hp - counterDamage);
    attackerKilled = attackerHpAfter <= 0;
  }

  return { damage, targetHpAfter, targetKilled, counterDamage, attackerHpAfter, attackerKilled };
}

// HP-доля × dangerScore — переиспользуем уже существующий сигнал "насколько
// ценен юнит" (classTemplates.js, диапазон 10-45), не изобретаем вторую
// шкалу ценности. Фоллбэк 10 = текущий минимум (WBB/WLC), на случай если
// у юнита dangerScore не задан.
export function unitValue(unit, hp = unit.hp) {
  const weight = unit.dangerScore || 10;
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
