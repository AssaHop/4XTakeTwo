const state = {
  map: [],
  units: [],
  selectedUnit: null,
  highlightedHexes: [],
  attackHexes: [],
  hasActedThisTurn: false,
  phaseHistory: [], // 🔄 добавить для DSL переходов

  // 🧠 AI-specific state
  enemyQueue: [],
  enemyQueueIndex: 0,
};

export { state };
