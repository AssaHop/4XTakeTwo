const state = {
    map: [],
    units: [],
    selectedUnit: null, // Текущий выбранный юнит
    highlightedHexes: [], // Подсвеченные гексы для доступного перемещения
    hasActedThisTurn: false,
};

export { state };