// 🔁 Генерация mapIndex по карте
export function initMapIndex(map) {
  const index = {};
  map.flat().forEach(tile => {
    index[`${tile.q},${tile.r},${tile.s}`] = tile;
  });
  return index;
}
