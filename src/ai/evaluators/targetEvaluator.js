// Target Evaluation Module

class TargetEvaluator {
    constructor() {
        this.goals = [];
        this.metrics = {
            completionRate: 0,
            successfulGoals: 0,
            failedGoals: 0
        };
    }

    // Добавление новой цели
    addGoal(goal) {
        if (!goal.title || !goal.criteria) {
            throw new Error('Goal must have a title and evaluation criteria');
        }
        this.goals.push({
            ...goal,
            status: 'pending',
            createdAt: new Date()
        });
    }

    // Оценка прогресса цели
    evaluateGoalProgress(goalId, progressData) {
        const goalIndex = this.goals.findIndex(g => g.id === goalId);
        if (goalIndex === -1) {
            throw new Error('Goal not found');
        }

        const goal = this.goals[goalIndex];
        
        // Логика оценки прогресса
        const progress = this.calculateProgress(goal, progressData);
        
        goal.currentProgress = progress;
        goal.lastEvaluated = new Date();

        if (progress >= 100) {
            goal.status = 'completed';
            this.metrics.successfulGoals++;
        } else if (progress > 0) {
            goal.status = 'in_progress';
        }

        this.updateOverallMetrics();
        return goal;
    }

    // Калькулятор прогресса
    calculateProgress(goal, progressData) {
        // Базовая реализация - можно кастомизировать
        const criteriaPoints = goal.criteria.map(criterion => {
            const matchingProgress = progressData.find(p => p.criterion === criterion.name);
            return matchingProgress 
                ? (matchingProgress.value / criterion.target) * 100 
                : 0;
        });

        return criteriaPoints.reduce((a, b) => a + b, 0) / criteriaPoints.length;
    }

    // Обновление общих метрик
    updateOverallMetrics() {
        this.metrics.completionRate = 
            this.goals.filter(g => g.status === 'completed').length / this.goals.length * 100;
        
        this.metrics.failedGoals = 
            this.goals.filter(g => g.status === 'failed').length;
    }

    // Получение текущих метрик
    getMetrics() {
        return { ...this.metrics };
    }

    // Список всех целей
    getAllGoals() {
        return [...this.goals];
    }
}

export default TargetEvaluator;