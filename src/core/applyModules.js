// 📂 core/applyModules.js — применение модулей к юниту

import { ModuleDefinitions } from './modulesRegistry.js';

export function applyModules(unit) {
  if (!unit.modules || unit.modules.length === 0) return;

  unit.modules.forEach(mod => {
    const definition = ModuleDefinitions[mod];
    if (definition && typeof definition.effect === 'function') {
      definition.effect(unit);
    } else {
      console.warn(`⚠️ Модуль '${mod}' не найден в реестре.`);
    }
  });
}
