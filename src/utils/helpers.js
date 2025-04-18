// 📁 src/utils/helpers.js 
function initMapIndex(mapArray) {
    const mapIndex = {};
    mapArray.flat().forEach(tile => {
      const key = `${tile.q},${tile.r},${tile.s}`;
      mapIndex[key] = tile;
    });
    return mapIndex;
  }
  
  export { initMapIndex };
  