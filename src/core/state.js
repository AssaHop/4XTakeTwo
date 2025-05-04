// ✅ src/core/state.js
const state = {
  map: [],
  units: [],
  cities: [], // ✅ список всех городов на карте
  selectedUnit: null,
  highlightedHexes: [],
  attackHexes: [],
  hasActedThisTurn: false,
  phaseHistory: [],

  enemyQueue: [],
  enemyQueueIndex: 0,

  // 🧠 AI-specific
  getAIUnits() {
    return this.units.filter(u => u.owner?.startsWith('enemy'));
  },

  getVisibleEnemies(unit) {
    return this.units.filter(u => u.owner !== unit.owner);
  },

  getEnemyCities(unit = null) {
    return this.cities?.filter(c => c.owner && c.owner !== 'player1') || [];
  },

  resetAIUnits() {
    this.getAIUnits().forEach(u => u.resetActions());
  }
};

export { state };
