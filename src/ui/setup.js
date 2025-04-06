// 📋 src/setup/setup.js

import { scenarioConfigs } from '../scenarios/scenarioConfigs.js';
import { startGame } from '../core/game.js';
import { mapProfiles } from '../utils/generateMapByProfile.js'; // ⬆️ Подключаем доступные карты

export function setupUI() {
  console.log('UI setup initialized');

  const select = document.getElementById('scenario-select');
  const sizeInput = document.getElementById('map-size');
  const enemyInput = document.getElementById('enemy-count');
  const mapTypeSelect = document.getElementById('map-type'); // ✔️ селектор типа карты
  const button = document.getElementById('start-button');

  // 🔁 Заполнить список сценариев
  Object.values(scenarioConfigs).forEach(cfg => {
    const option = document.createElement('option');
    option.value = cfg.id;
    option.textContent = `${cfg.name} — ${cfg.description}`;
    select.appendChild(option);
  });

  // 🗑 Заполнить список типов карт
  Object.entries(mapProfiles).forEach(([key, profile]) => {
    if (key === 'default') return; // Пропустить alias
    const option = document.createElement('option');
    option.value = key;
    option.textContent = profile.name || key;
    mapTypeSelect.appendChild(option);
  });

  // ▶️ Запуск игры
  button.addEventListener('click', () => {
    const scenarioId = select.value;
    const mapSize = parseInt(sizeInput.value);
    const enemyCount = parseInt(enemyInput.value);
    const mapType = mapTypeSelect.value; // ✔️ тип карты из селектора

    startGame(mapSize, scenarioId, enemyCount, mapType);
  });
}
