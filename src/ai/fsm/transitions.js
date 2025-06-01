export function getTransitions() {
    return [
        // Переход из состояния защиты в атаку
        { from: 'defend', to: 'attack', 
          condition: (gameState) => gameState.units.filter(
              u => u.owner !== gameState.currentPlayer
          ).length < gameState.units.filter(
              u => u.owner === gameState.currentPlayer
          ).length * 0.5 
        },

        // Переход из состояния атаки в расширение
        { from: 'attack', to: 'expand', 
          condition: (gameState) => gameState.units.some(
              u => u.canCapture && u.owner === gameState.currentPlayer
          )
        },

        // Переход в экономическое состояние при отсутствии врагов
        { from: 'attack', to: 'economy', 
          condition: (gameState) => gameState.units.filter(
              u => u.owner !== gameState.currentPlayer
          ).length === 0
        },

        // Переход к обороне при большом количестве вражеских юнитов
        { from: 'expand', to: 'defend', 
          condition: (gameState) => gameState.units.filter(
              u => u.owner !== gameState.currentPlayer
          ).length > gameState.units.filter(
              u => u.owner === gameState.currentPlayer
          ).length * 1.5
        },

        // Переход в атаку из экономического состояния при появлении врагов
        { from: 'economy', to: 'attack', 
          condition: (gameState) => gameState.units.filter(
              u => u.owner !== gameState.currentPlayer
          ).length > 0
        }
    ];
}

export function checkTransition(from, to, gameState) {
    const transitions = getTransitions();
    const transition = transitions.find(
        t => t.from === from && t.to === to
    );

    return transition ? transition.condition(gameState) : false;
}