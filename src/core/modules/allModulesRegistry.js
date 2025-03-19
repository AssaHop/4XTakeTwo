// 📂 core/modules/allModulesRegistry.js — объединение всех модулей

import { NavigationModules } from './navigationModules.js';
import { CombatModules } from './combatModules.js';
import { SupportModules } from './supportModules.js';
import { ProgressionModules } from './progressionModules.js';

export const ModuleDefinitions = {
  ...NavigationModules,
  ...CombatModules,
  ...SupportModules,
  ...ProgressionModules
};

export const ModuleGroups = {
  Navigation: Object.keys(NavigationModules),
  Combat: Object.keys(CombatModules),
  Support: Object.keys(SupportModules),
  Progression: Object.keys(ProgressionModules)
};
