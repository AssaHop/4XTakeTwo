// 📂 core/applyModules.js — улучшенная версия

import { ModuleDefinitions } from './modules/allModulesRegistry.js';

export function applyModules(unit) {
  if (!Array.isArray(unit.modules)) return;

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
}
