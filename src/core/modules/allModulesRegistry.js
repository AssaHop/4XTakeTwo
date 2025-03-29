// 📂 core/modules/allModulesRegistry.js — полный реестр + защита от дубликатов

import { NavigationModules } from './navigationModules.js';
import { CombatModules } from './combatModules.js';
import { SupportModules } from './supportModules.js';
import { ProgressionModules } from './progressionModules.js';

// 🔗 Объединённый реестр модулей
export const ModuleDefinitions = {
  ...NavigationModules,
  ...CombatModules,
  ...SupportModules,
  ...ProgressionModules
};

// 🔍 Группы для удобной фильтрации или UI
export const ModuleGroups = {
  Navigation: Object.keys(NavigationModules),
  Combat: Object.keys(CombatModules),
  Support: Object.keys(SupportModules),
  Progression: Object.keys(ProgressionModules)
};

// ⚠️ Проверка на дублирующиеся имена модулей
const allKeys = Object.keys(ModuleDefinitions);
const duplicates = allKeys.filter((item, index) => allKeys.indexOf(item) !== index);

if (duplicates.length > 0) {
  console.warn('⚠️ [DUPLICATE MODULES FOUND]', duplicates);
}
