// 📂 mechanics/progressionSystem.js — подключение системы технологий и модульных апгрейдов юнитов

import { techTree } from '../core/techTree.js';

export function initProgressionSystem(state) {
  techTree.onUnlock((techName) => {
    state.units.forEach(unit => {
      // Пример логики активации модулей через технологии
      if (techName === 'Propaganda' && !unit.modules.includes('Seize')) {
        unit.upgradeWithModule('Seize');
      }

      if (techName === 'Navigation') {
        // Например, только морские классы получают Navy
        if (unit.classId?.startsWith('W') && !unit.modules.includes('Navy')) {
          unit.upgradeWithModule('Navy');
        }
      }

      // Добавлять сюда другие условия при необходимости
    });
  });

  console.log('🔧 Progression system initialized (tech → unit upgrades linked)');
}
