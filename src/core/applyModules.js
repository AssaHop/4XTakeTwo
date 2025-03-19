// 📂 core/applyModules.js — обновлённая версия с новым реестром

import { ModuleDefinitions } from './modules/allModulesRegistry.js';

export function applyModules(unit) {
  if (!unit.modules || !Array.isArray(unit.modules)) return;

  unit.modules.forEach((mod) => {
    const definition = ModuleDefinitions[mod];
    if (definition && typeof definition.effect === 'function') {
      definition.effect(unit);
    } else {
      console.warn(`⚠️ Модуль '${mod}' не найден в реестре.`);
    }
  });
}
