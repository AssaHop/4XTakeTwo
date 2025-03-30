import { scenarioConfigs } from './scenarioConfigs.js';
import { dominator } from './dominator.js';
import { conqueror } from './conqueror.js';

const scenarioRegistry = {
  dominator,
  conqueror,
};

/**
 * Возвращает сценарий по ID
 */
export function getScenarioById(id = 'dominator') {
  return scenarioRegistry[id] || scenarioRegistry.dominator;
}

/**
 * Генерация карты через сценарий
 */
export function generateScenario(id = 'dominator', options = {}) {
  const scenario = getScenarioById(id);
  if (typeof scenario.generateMap !== 'function') {
    console.warn(`[scenario:${id}] Missing generateMap()`);
    return [];
  }
  return scenario.generateMap(options);
}

/**
 * Генерация стартовых юнитов через сценарий
 */
export function getInitialUnitsForScenario(id = 'dominator', map = [], options = {}) {
  const scenario = getScenarioById(id);
  if (typeof scenario.getInitialUnits !== 'function') {
    console.warn(`[scenario:${id}] Missing getInitialUnits()`);
    return [];
  }
  return scenario.getInitialUnits(map, options);
}

/**
 * Получение UI-конфига (лимиты, название, описание и т.д.)
 */
export function getScenarioConfig(id) {
  return scenarioConfigs[id] || scenarioConfigs.dominator;
}
