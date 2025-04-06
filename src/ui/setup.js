// 📁 src/setup/setup.js

import { scenarioConfigs } from '../scenarios/scenarioConfigs.js';
import { startGame } from '../core/game.js';

export function setupUI() {
  console.log('UI setup initialized');

  const select = document.getElementById('scenario-select');
  const sizeInput = document.getElementById('map-size');
  const enemyInput = document.getElementById('enemy-count');
  const button = document.getElementById('start-button');

  // 🔁 Заполнить список сценариев
  Object.values(scenarioConfigs).forEach(cfg => {
    const option = document.createElement('option');
    option.value = cfg.id;
    option.textContent = `${cfg.name} — ${cfg.description}`;
    select.appendChild(option);
  });

  // ▶️ Запуск игры
  button.addEventListener('click', () => {
    const scenarioId = select.value;
    const mapSize = parseInt(sizeInput.value);
    const enemyCount = parseInt(enemyInput.value);

    startGame(mapSize, scenarioId, enemyCount);
  });
}
