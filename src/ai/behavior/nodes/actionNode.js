// 📁 behavior/nodes/actionNode.js

export class ActionNode {
  constructor(actionFn) {
    this.actionFn = actionFn;
  }

  async run(unit, gameState) {
    const result = await this.actionFn(unit, gameState);

    return {
      success: result !== false,
      result
    };
  }
}
