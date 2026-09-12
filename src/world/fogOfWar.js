// src/world/fogOfWar.js
//
// Туман войны per-owner, один слой:
//   explored — гекс когда-либо видел кто-то из юнитов owner'а. Только
//              пополняется, никогда не уменьшается — карта не забывается.
//
// Уточнено пользователем (реальная игра, не вторичный источник): в
// оригинальной Polytopia отдельной "живой" зоны обзора для УЖЕ открытой
// территории нет вообще — если гекс вышел из тумана, всё, что на нём
// стоит, видно всегда, пока сам гекс не забыт (а он не забывается никогда).
// Скрыто только то, что стоит на гексе, который НИКТО из юнитов owner'а
// ещё ни разу не видел. Раньше здесь был второй слой (`visible`,
// пересчитывался от текущего viRange живых юнитов, прятал врагов заново на
// уже открытой территории) — это было наше собственное добавление, не из
// оригинала, убрано по этой же причине. viRange по-прежнему определяет,
// насколько КАЖДЫЙ ход расширяется explored (что становится знакомым
// прямо сейчас), просто больше не гейтит уже знакомое.
//
// Из этого следует: ghosts/lastKnownEnemy (маркеры "был враг, но он ушёл
// с открытой территории") больше не нужны — враг на открытой территории
// виден всегда, а не появляется/пропадает. Убраны вместе со старым слоем.
//
// Террейн НЕ прячется дважды: карта (mapIndex) генерируется целиком при
// старте партии и pathfinding/AI по ней ходит как по известной — секрет
// только текущее положение вражеских юнитов на ещё не открытой территории.
import { hexDistance } from '../mechanics/hexUtils.js';

function hexKey(q, r, s) {
  return `${q},${r},${s}`;
}

// Расширяет explored owner'а от текущих позиций его живых юнитов (радиус
// viRange). Сканирует state.mapIndex (реальный размер карты), а не
// генерирует диск радиусом viRange вокруг юнита.
export function updateVisibility(state, owner) {
  if (!state.fog) state.fog = {};
  if (!state.fog[owner]) {
    state.fog[owner] = { explored: new Set() };
  }

  const fog = state.fog[owner];
  const myUnits = state.units.filter(u => u.owner === owner);
  if (myUnits.length && state.mapIndex) {
    const tiles = Object.values(state.mapIndex);
    for (const unit of myUnits) {
      for (const tile of tiles) {
        if (hexDistance(unit, tile) <= unit.viRange) {
          fog.explored.add(hexKey(tile.q, tile.r, tile.s));
        }
      }
    }
  }
}

export function isExplored(state, owner, q, r, s) {
  return !!state.fog?.[owner]?.explored.has(hexKey(q, r, s));
}

// Видимость юнита = стоит ли он на explored-гексе owner'а. Больше не
// отдельный слой — см. комментарий вверху файла.
export function isVisible(state, owner, q, r, s) {
  return isExplored(state, owner, q, r, s);
}
