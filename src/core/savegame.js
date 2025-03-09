import { state } from './state.js';

/**
 * 💾 Сохраняем текущее состояние игры в localStorage
 */
function saveGameState() {
    try {
        const saveData = JSON.stringify(state);
        localStorage.setItem('hexGameSave', saveData);
        console.log('💾 Game state saved successfully');
    } catch (error) {
        console.error('❌ Failed to save game state:', error);
    }
}

/**
 * 📂 Загружаем сохранённое состояние из localStorage
 * @returns {Object|null} загруженное состояние или null
 */
function loadGameState() {
    try {
        const savedData = localStorage.getItem('hexGameSave');
        if (!savedData) {
            console.warn('📭 No saved game data found in localStorage');
            return null;
        }
        const loadedState = JSON.parse(savedData);
        console.log('📂 Game state loaded:', loadedState);
        return loadedState;
    } catch (error) {
        console.error('❌ Failed to load game state:', error);
        return null;
    }
}

export { saveGameState, loadGameState };