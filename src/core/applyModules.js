// 📂 core/applyModules.js — улучшенная версия

import { ModuleDefinitions } from './modules/allModulesRegistry.js';
import { setupActionFlags } from './unitFlags.js';

export function applyModules(unit) {
  if (!Array.isArray(unit.modules)) return;

  // 📦 Инициализация на случай если поля ещё не заданы
  unit.moveTerrain = unit.moveTerrain || [];
  unit.weType = unit.weType || [];

  for (const modName of unit.modules) {
    const mod = ModuleDefinitions[modName];

    if (!mod) {
      console.warn(`⚠️ [applyModules] Module '${modName}' not found in registry.`);
      continue;
    }

    if (typeof mod.effect === 'function') {
      mod.effect(unit);
    } else {
      console.warn(`⚠️ [applyModules] Module '${modName}' has no effect function.`);
    }
  }

  // 🧠 Повторно пересчитываем доступные террейны, если нужно
  if (typeof unit.recalculateMobility === 'function') {
    unit.recalculateMobility();
  }

  // 🎯 Повторно применим флаги
  setupActionFlags(unit);
}
