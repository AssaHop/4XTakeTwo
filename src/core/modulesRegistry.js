// 📂 core/modulesRegistry.js — описание и эффекты поведенческих модулей

export const ModuleDefinitions = {
    boom: {
      name: 'Boom',
      description: 'Разрешает юниту совершить атаку после перемещения',
      effect: (unit) => {
        unit.allowPostMoveAttack = true;
      }
    },
    heal: {
      name: 'Heal',
      description: 'Атака по союзнику лечит его (вместо урона)',
      effect: (unit) => {
        unit.attackMode = 'heal';
      }
    },
    convert: {
      name: 'Convert',
      description: 'Атака по врагу превращает его в союзника при успешном уроне',
      effect: (unit) => {
        unit.attackMode = 'convert';
      }
    },
    chase: {
      name: 'Chase',
      description: 'После убийства врага позволяет выполнить ещё одну атаку, если есть цель рядом',
      effect: (unit) => {
        unit.allowChainedAttack = true;
      }
    }
  };
  