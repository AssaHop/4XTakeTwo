// src/core/state.js
const state = {
  map: [],
  mapIndex: {},
  units: [],
  cities: [],
  selectedUnit: null,
  highlightedHexes: [],
  attackHexes: [],
  hasActedThisTurn: false,
  phaseHistory: [],

  // 🔄 Очередь ходов: ['player1', 'enemy0', 'enemy1', ...]
  turnOrder: ['player1'],
  turnIndex: 0,

  get currentPlayer() {
    return this.turnOrder[this.turnIndex];
  },

  // Вызывается при старте игры
  initTurnOrder(enemyCount = 0) {
    this.turnOrder = ['player1'];
    for (let i = 0; i < enemyCount; i++) {
      this.turnOrder.push(`enemy${i}`);
    }
    this.turnIndex = 0;
    console.log('🔄 Turn order:', this.turnOrder);
  },

  // Переход к следующему игроку
  nextTurn() {
    this.turnIndex = (this.turnIndex + 1) % this.turnOrder.length;
    this.hasActedThisTurn = false;
    return this.currentPlayer;
  },

  isPlayerTurn() {
    return this.currentPlayer === 'player1';
  },

  isAITurn() {
    return this.currentPlayer !== 'player1';
  },

  // 🧠 AI helpers
  getAIUnits(owner = null) {
    if (owner) return this.units.filter(u => u.owner === owner);
    return this.units.filter(u => u.owner?.startsWith('enemy'));
  },

  getVisibleEnemies(unit) {
    return this.units.filter(u => u.owner !== unit.owner);
  },

  getEnemyCities() {
    return this.cities?.filter(c => c.owner && c.owner !== 'player1') || [];
  },

  resetUnitsForPlayer(owner) {
    this.units.filter(u => u.owner === owner).forEach(u => u.resetActions?.());
  }
};

export { state };
