const state = {
    map: [],
    units: [],
    selectedUnit: null,
    highlightedHexes: [],
    attackHexes: [],
    hasActedThisTurn: false,
    phaseHistory: [], // 🔄 добавить для DSL переходов
  };

export { state };