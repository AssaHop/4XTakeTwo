// 📁 behavior/nodes/sequenceNode.js

export class SequenceNode {
  constructor(children) {
    this.children = children || [];
  }

  async run(unit, gameState) {
    for (const child of this.children) {
      const result = await child.run(unit, gameState);
      if (!result.success) {
        return { success: false };
      }
    }
    return { success: true };
  }
}
