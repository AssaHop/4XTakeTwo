// src/ui/economyPanel.js
//
// Простая панель траты токенов игроком (запрошено пользователем
// 2026-09-13 — "кнопка", см. docs/sessions/2026-09-13-session11.md).
// 3 кнопки спауна (WDD/WCC/WBB) + кнопка апгрейда вместимости действуют
// на ВЫБРАННУЮ игроком точку захвата (клик по своей точке на карте, см.
// events.js:handleCanvasClick → state.selectedCP). Раньше (2026-09-13)
// всегда бралась ПЕРВАЯ своя точка в state.capturePoints — на практике
// это НАВСЕГДА домашняя (она первая в массиве с начала партии, порядок
// массива не меняется при смене владельца), игрок физически не мог
// тратить токены у другой захваченной точки — баг, найден пользователем
// в реальной игре 2026-09-14.
import { state } from '../core/state.js';
import {
  SPAWN_COSTS, getResources, getFleetSize, getFleetCapacity,
  spawnUnitAtCapturePoint, getUpgradeCost, upgradeCapturePointCapacity,
} from '../core/economyLogic.js';
import { updateEndTurnButton } from './uiControls.js';

const SPAWN_TYPES = ['WDD', 'WCC', 'WBB'];

// Выбранная кликом точка (state.selectedCP), если она всё ещё своя —
// иначе (ничего не выбрано, или выбранную точку отбили) фоллбэк на
// первую свою, чтобы кнопки не были мертворождённо задизейблены весь
// матч, если игрок ни разу не кликнул по точке.
function activeCP() {
  if (state.selectedCP?.owner === 'player1') return state.selectedCP;
  return (state.capturePoints || []).find(c => c.owner === 'player1') || null;
}

// redraw передаётся колбэком (не импортируется напрямую из events.js) —
// events.js уже вызывает updateEconomyPanel() из своего redraw(), взаимный
// static-импорт по кругу тут не нужен (тот же принцип, что executeCallback
// в aiManager.js/dominator.js — колбэк вместо кросс-импорта).
function setupEconomyPanel(redraw) {
  for (const type of SPAWN_TYPES) {
    const btn = document.getElementById(`spawn-${type}-button`);
    if (!btn) continue;
    btn.addEventListener('click', () => {
      const cp = activeCP();
      if (!cp) return;
      const unit = spawnUnitAtCapturePoint(state, 'player1', cp, type);
      if (unit) {
        redraw();
        updateEndTurnButton();
      }
      updateEconomyPanel();
    });
  }

  const upgradeBtn = document.getElementById('upgrade-capacity-button');
  if (upgradeBtn) {
    upgradeBtn.addEventListener('click', () => {
      const cp = activeCP();
      if (!cp) return;
      if (upgradeCapturePointCapacity(state, 'player1', cp)) {
        redraw();
      }
      updateEconomyPanel();
    });
  }

  updateEconomyPanel();
}

function updateEconomyPanel() {
  const tokens = getResources(state, 'player1');
  const fleetSize = getFleetSize(state, 'player1');
  const fleetCap = getFleetCapacity(state, 'player1');
  const cp = activeCP();
  const counter = document.getElementById('resource-counter');
  if (counter) {
    const cpLabel = cp ? `📍(${cp.q},${cp.r},${cp.s})` : '📍—';
    counter.textContent = `💰 ${tokens} · 🚢 ${fleetSize}/${fleetCap} · ${cpLabel}`;
  }
  const atCapacity = fleetSize >= fleetCap;

  for (const type of SPAWN_TYPES) {
    const btn = document.getElementById(`spawn-${type}-button`);
    if (!btn) continue;
    // Цена фиксирована (SPAWN_COSTS) — не растёт с числом точек, игрок
    // всегда точно знает, сколько стоит юнит. Ограничивает флот лимит
    // вместимости (getFleetCapacity), не цена — см. economyLogic.js.
    const cost = SPAWN_COSTS[type];
    btn.textContent = `${type} (${cost})`;
    btn.disabled = !cp || tokens < cost || atCapacity;
  }

  const upgradeBtn = document.getElementById('upgrade-capacity-button');
  if (upgradeBtn) {
    if (cp) {
      const cost = getUpgradeCost(cp);
      upgradeBtn.textContent = `Апгрейд точки (${cost}) → ур.${(cp.capacityLevel || 1) + 1}`;
      upgradeBtn.disabled = tokens < cost;
    } else {
      upgradeBtn.textContent = 'Апгрейд точки';
      upgradeBtn.disabled = true;
    }
  }
}

export { setupEconomyPanel, updateEconomyPanel };
