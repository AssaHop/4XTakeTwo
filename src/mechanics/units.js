class Action {
    constructor(name) {
        this.name = name;
    }

    execute(unit, target) {
        // Метод выполнения действия
    }
}

class AttackAction extends Action {
    constructor() {
        super('attack');
    }

    execute(unit, target) {
        if (target && target.type === 'enemy') {
            target.health -= unit.attackDamage;
            console.log(`${unit.type} атакует ${target.type}, нанося ${unit.attackDamage} урона!`);
        }
    }
}

class CaptureAction extends Action {
    constructor() {
        super('capture');
    }

    execute(unit, target) {
        if (target && target.type === 'object' && target.owner !== unit.owner) {
            target.captureProgress += 1;
            console.log(`${unit.type} начинает захват объекта!`);
        }
    }
}

class HealAction extends Action {
    constructor() {
        super('heal');
    }

    execute(unit) {
        if (unit.health < unit.maxHealth) {
            unit.health = Math.min(unit.maxHealth, unit.health + unit.healAmount);
            console.log(`${unit.type} восстанавливает здоровье на ${unit.healAmount} очков!`);
        }
    }
}

class Unit {
    constructor(row, col, type, owner) {
        this.row = row;
        this.col = col;
        this.type = type;
        this.owner = owner;
        this.health = 100;
        this.maxHealth = 100;
        this.attackDamage = 10;
        this.healAmount = 20;
        this.captureProgress = 0;
        this.actions = 1;
        this.selected = false;
        this.visibilityRange = 3;
        this.moveRange = 2;
        this.actionRange = 1;
        this.level = 1; // Уровень юнита
        this.id = Unit.generateId();
    }

    static generateId() {
        Unit.currentId = (Unit.currentId || 0) + 1;
        return Unit.currentId;
    }

    move(newRow, newCol) {
        this.row = newRow;
        this.col = newCol;
    }

    checkState() {
        if (this.health < this.maxHealth) {
            console.log(`${this.type} имеет неполное здоровье!`);
        }
        // Дополнительные проверки состояния можно добавить здесь
    }

    upgrade() {
        if (this.level < 2) {
            this.level += 1;
            this.maxHealth += 20;
            this.attackDamage += 5;
            console.log(`${this.type} повышает уровень до ${this.level}!`);
        }
    }

    render() {
        const unitElement = document.createElement('div');
        unitElement.classList.add('unit');
        unitElement.textContent = `${this.type} (${this.health}/${this.maxHealth})`;
        unitElement.dataset.id = this.id;
        return unitElement;
    }
}

export { Unit, AttackAction, CaptureAction, HealAction };