// core/captureLogic.js
import { hexDistance } from '../mechanics/hexUtils.js';
import { CAPTURED_BASE_CAPACITY } from './economyLogic.js';

// Скорость захвата НЕ зависит от числа кораблей (убрано 2026-09-13 —
// см. docs/sessions/2026-09-13-session11.md). Раньше была формула
// T(k)=n×(4−k)/3 (больше кораблей — быстрее захват, до ×3 на 3+), но
// battle-sim показал: это и есть главный ускоритель снежного кома —
// лидер с уже большим флотом захватывал оставшиеся нейтральные точки
// втрое быстрее одиночного корабля, что усиливало и без того
// самоподдерживающуюся петлю "больше точек → больше кораблей → быстрее
// новые точки". Пользователь: "ускорение можно убрать или сильно
// замедлить, пока можно просто убрать". Любое число кораблей ≥1 захватывает
// точку за одно и то же BASE_CAPTURE_TURNS ходов.
export const BASE_CAPTURE_TURNS = 3;

// Прогресс за один ход (доля от 0 до 1) — константа, число кораблей не
// влияет (см. комментарий выше). Оставлена как функция (не голая
// константа) на случай, если понадобится вернуть зависимость от unitCount.
function captureProgressPerTurn(_unitCount) {
  return 1 / BASE_CAPTURE_TURNS;
}

// Called at the end of each player's individual turn (before nextTurn()).
// captureProgress копится от 0 до 1 (не целочисленный claimTurns) — см.
// captureProgressPerTurn выше.
//
// БАГ (найден пользователем 2026-09-14 в реальной игре): раньше ЛЮБОЕ
// присутствие второго владельца (`owners.length >= 2`) сбрасывало
// прогресс в 0 — включая единственный юнит, только что заспауненный
// защищающимся владельцем ПРЯМО у своей же точки (economyLogic.js:
// findSpawnHexNearCP спаунит рядом с точкой, это внутри радиуса контеста
// =3). Если у защитника хватает токенов/вместимости спаунить хотя бы
// одного нового юнита каждый ход — прогресс атакующего обнулялся КАЖДЫЙ
// ход, точку было физически невозможно захватить, пока не иссякнет
// экономика защитника. Заменено на большинство: прогресс идёт в пользу
// стороны, у которой СТРОГОЕ большинство юнитов в радиусе (больше, чем
// у всех остальных сторон вместе, включая текущего владельца) — реальный
// перевес войск у точки решает исход спора, не сам факт чьего-то
// присутствия.
export function updateCapturePoints(state) {
  for (const cp of state.capturePoints) {
    const nearby = state.units.filter(u => hexDistance(u, cp) <= 3);
    const owners = [...new Set(nearby.map(u => u.owner))];

    if (owners.length === 0) {
      cp.claimant = null;
      cp.captureProgress = 0;
      continue;
    }

    const counts = {};
    for (const u of nearby) counts[u.owner] = (counts[u.owner] || 0) + 1;
    const [dominant, dominantCount] = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])[0];
    const hasMajority = dominantCount * 2 > nearby.length;

    if (!hasMajority || dominant === cp.owner) {
      // Ничья по числу присутствующих сторон, либо владелец сам
      // доминирует у своей точки — прогресс не растёт.
      cp.claimant = null;
      cp.captureProgress = 0;
      continue;
    }

    const contestant = dominant;

    if (cp.claimant !== contestant) {
      cp.claimant = contestant;
      cp.captureProgress = 0;
    }

    cp.captureProgress += captureProgressPerTurn(dominantCount);

    if (cp.captureProgress >= 1) {
      console.log(`🚩 ${contestant} captured point (${cp.q},${cp.r},${cp.s})`);
      cp.owner = contestant;
      cp.claimant = null;
      cp.captureProgress = 0;
      // Апгрейды предыдущего владельца (economyLogic.js:capacityLevel)
      // не наследуются новым — захват сбрасывает точку на базовую
      // вместимость, даже если это была чья-то прокачанная домашняя
      // точка (запрошено пользователем 2026-09-13).
      cp.capacityLevel = CAPTURED_BASE_CAPACITY;
    }
  }
}
