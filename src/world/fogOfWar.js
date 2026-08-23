// src/world/fogOfWar.js
//
// Туман войны per-owner. Два независимых слоя, оба ключуются строкой
// "q,r,s" (тот же формат, что state.mapIndex, mechanics/pathfinding.js):
//   explored — гекс когда-либо видел кто-то из юнитов owner'а. Только
//              пополняется, никогда не уменьшается — карта не забывается.
//   visible  — гекс виден ПРЯМО СЕЙЧАС (в радиусе viRange живого юнита
//              owner'а). Полностью пересчитывается на updateVisibility(),
//              не накопительный — уйдёт юнит/умрёт, враг в этом гексе
//              снова скрыт, даже если explored остаётся true навсегда.
//
// Террейн НЕ прячется дважды: карта (mapIndex) генерируется целиком при
// старте партии и pathfinding/AI по ней ходит как по известной — секрет
// только текущее положение вражеских юнитов и то, что ещё не открыто на
// рендере игрока. Осознанное упрощение, см. AGENTS.md §4 (done-критерии).
import { hexDistance } from '../mechanics/hexUtils.js';

// Без бонуса AI буквально не видит противника дальше собственного viRange
// и превращается в дрейфующий флот — не игровой челлендж, а баг восприятия.
// Один тюнинговый флаг, не встроен в бой (влияет только на то, что owner
// вообще рассматривает как цель, не на atRange/урон).
const AI_VISION_BONUS = 2;

// Сколько updateVisibility(owner) переживает призрак последней позиции
// врага (т.е. сколько СВОИХ ходов owner'а он виден) прежде чем исчезнуть.
// =1 — минимум "хотя бы на ход": появился на этом пересчёте, ещё цел на
// следующем, стирается на пересчёте после него.
const GHOST_TTL = 1;

function hexKey(q, r, s) {
  return `${q},${r},${s}`;
}

function effectiveViRange(unit, owner) {
  return unit.viRange + (owner !== 'player1' ? AI_VISION_BONUS : 0);
}

// Пересчитывает туман ОДНОГО owner'а от текущих позиций его живых юнитов.
// Сканирует state.mapIndex (реальный размер карты), а не генерирует диск
// радиусом viRange вокруг юнита — у WBB viRange=100 (умышленный "радар на
// всю карту"), диск такого радиуса дал бы на порядки больше гексов, чем
// вообще есть на карте.
//
// Заодно ведёт "призраков" — последнюю известную позицию вражеского юнита,
// который только что перестал быть виден (ушёл из радиуса — не спутать со
// смертью: погибший юнит призрака не оставляет, owner не мог видеть момент
// гибели вне видимости). Свежее наблюдение стирает устаревшего призрака той
// же клетки. Эта функция вызывается МНОГО раз за один ход owner'а (у
// player1 — на каждый redraw()), поэтому сама она призраков НЕ старит —
// иначе TTL "хотя бы на ход" истаивал бы за пару кликов внутри одного хода.
// Старение — отдельно, в expireGhosts(), которую вызывающий код обязан
// звать ровно раз за начало хода owner'а (см. ui/events.js).
export function updateVisibility(state, owner) {
  if (!state.fog) state.fog = {};
  if (!state.fog[owner]) {
    state.fog[owner] = {
      explored: new Set(),
      visible: new Set(),
      lastKnownUnits: new Map(), // Unit -> {type, owner, q, r, s}, только видимые на предыдущем пересчёте
      ghosts: new Map()          // hexKey -> {type, owner, q, r, s, ttl}
    };
  }

  const fog = state.fog[owner];
  const newVisible = new Set();
  const myUnits = state.units.filter(u => u.owner === owner);
  if (myUnits.length && state.mapIndex) {
    const tiles = Object.values(state.mapIndex);
    for (const unit of myUnits) {
      const range = effectiveViRange(unit, owner);
      for (const tile of tiles) {
        if (hexDistance(unit, tile) <= range) {
          const key = hexKey(tile.q, tile.r, tile.s);
          newVisible.add(key);
          fog.explored.add(key);
        }
      }
    }
  }

  const seenNow = new Map();
  for (const u of state.units) {
    if (u.owner === owner) continue;
    if (!newVisible.has(hexKey(u.q, u.r, u.s))) continue;
    seenNow.set(u, { type: u.type, owner: u.owner, q: u.q, r: u.r, s: u.s });
    fog.ghosts.delete(hexKey(u.q, u.r, u.s)); // реальное наблюдение важнее устаревшего призрака
  }

  for (const [unit, info] of fog.lastKnownUnits) {
    if (seenNow.has(unit)) continue;           // всё ещё виден — не призрак
    if (!state.units.includes(unit)) continue;  // погиб вне видимости — не палим момент смерти
    fog.ghosts.set(hexKey(info.q, info.r, info.s), { ...info, ttl: GHOST_TTL });
  }

  fog.lastKnownUnits = seenNow;
  fog.visible = newVisible;
}

// Старит призраков owner'а на один ход. Вызывать РОВНО ОДИН РАЗ на начало
// хода owner'а (не на каждый redraw) — иначе GHOST_TTL перестаёт значить
// "ходов", а начинает значить "перерисовок".
export function expireGhosts(state, owner) {
  const fog = state.fog?.[owner];
  if (!fog) return;
  for (const [key, ghost] of fog.ghosts) {
    ghost.ttl -= 1;
    if (ghost.ttl <= 0) fog.ghosts.delete(key);
  }
}

export function isExplored(state, owner, q, r, s) {
  return !!state.fog?.[owner]?.explored.has(hexKey(q, r, s));
}

export function isVisible(state, owner, q, r, s) {
  return !!state.fog?.[owner]?.visible.has(hexKey(q, r, s));
}

export function getGhosts(state, owner) {
  return Array.from(state.fog?.[owner]?.ghosts?.values() ?? []);
}
