// 📁 behavior/nodes/conditionNode.js

export class ConditionNode {
  constructor(conditionFn) {
    this.conditionFn = conditionFn;
  }

  async run(unit, gameState) {
    const passed = await this.conditionFn(unit, gameState);
    return { success: !!passed };
  }
}
