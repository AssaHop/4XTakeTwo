// 📂 core/modules/combatModules.js

export const CombatModules = {
  Seize: {
    name: 'Seize',
    tags: ['combat'],
    description: 'Поглощает врага в ресурс города атакующего.',
    effect: (unit) => {
      unit.specialAttack = 'seize';
    }
  },
  Charge: {
    name: 'Charge',
    tags: ['combat'],
    description: 'Атака после движения.',
    effect: (unit) => {
      unit.canCharge = true;
    }
  },
  Flee: {
    name: 'Flee',
    tags: ['combat'],
    description: 'Движение после атаки.',
    effect: (unit) => {
      unit.canFlee = true;
    }
  },
  Blast: {
    name: 'Blast',
    tags: ['combat'],
    description: 'Действие взрыва — урон по соседям и самоуничтожение.',
    effect: (unit) => {
      unit.abilities = unit.abilities || [];
      unit.abilities.push('explode');
    }
  },
  Hard: {
    name: 'Hard',
    tags: ['combat'],
    description: 'Бонус к защите.',
    effect: (unit) => {
      unit.defenseBonus = true;
    }
  },
  Surge: {
    name: 'Surge',
    tags: ['combat'],
    description: 'Заморозка атакованных врагов.',
    effect: (unit) => {
      unit.freezeOnHit = true;
    }
  },
  Restore: {
    name: 'Restore',
    tags: ['combat'],
    description: 'Действие лечения всех союзников вокруг.',
    effect: (unit) => {
      unit.abilities = unit.abilities || [];
      unit.abilities.push('healNearby');
    }
  },
  Percy: {
    name: 'Percy',
    tags: ['combat'],
    description: 'Повторная атака при убийстве.',
    effect: (unit) => {
      unit.attackOnKill = true;
    }
  },
  Corrupt: {
    name: 'Corrupt',
    tags: ['combat'],
    description: 'Накладывает эффект corrode на врага.',
    effect: (unit) => {
      unit.onHitEffects = unit.onHitEffects || [];
      unit.onHitEffects.push('corrode');
    }
  },
  Splash: {
    name: 'Splash',
    tags: ['combat'],
    description: 'Урон по площади.',
    effect: (unit) => {
      unit.splashDamage = true;
    }
  },
  Stealth: {
    name: 'Stealth',
    tags: ['combat'],
    description: 'Невидимость для врагов.',
    effect: (unit) => {
      unit.invisible = true;
    }
  },
  Still: {
    name: 'Still',
    tags: ['combat'],
    description: 'Запрещает врагам ответную атаку.',
    effect: (unit) => {
      unit.disableEnemyRetaliation = true;
    }
  },
  Ambush: {
    name: 'Ambush',
    tags: ['combat'],
    description: 'Предотвращает ответ врага.',
    effect: (unit) => {
      unit.ambushAttack = true;
    }
  },
  Stomp: {
    name: 'Stomp',
    tags: ['combat'],
    description: 'Урон соседним врагам при движении.',
    effect: (unit) => {
      unit.stompOnMove = true;
    }
  },
  Field: {
    name: 'Field',
    tags: ['combat'],
    description: 'Урон при спауне или перемещении рядом с врагом.',
    effect: (unit) => {
      unit.fieldDamageAura = true;
    }
  },
  Invade: {
    name: 'Invade',
    tags: ['combat'],
    description: 'Создаёт дронов при атаке на город.',
    effect: (unit) => {
      unit.invadeCity = true;
    }
  }
};
