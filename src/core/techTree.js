// 📂 core/techTree.js — логика технологий и onUnlock обработчиков

export const techTree = {
    unlocked: new Set(),
    onUnlockCallbacks: [],
  
    isUnlocked(techName) {
      return this.unlocked.has(techName);
    },
  
    unlock(techName) {
      if (this.unlocked.has(techName)) return;
      this.unlocked.add(techName);
      console.log(`📚 Технология изучена: ${techName}`);
  
      this.onUnlockCallbacks.forEach(callback => callback(techName));
    },
  
    onUnlock(callbackFn) {
      if (typeof callbackFn === 'function') {
        this.onUnlockCallbacks.push(callbackFn);
      }
    }
  };
  
  // Пример использования:
  // techTree.onUnlock((techName) => {
  //   allUnits.forEach(unit => {
  //     if (techName === 'Propaganda') {
  //       unit.upgradeWithModule('Seize');
  //     }
  //   });
  // });
  