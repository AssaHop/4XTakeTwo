// Economy Evaluation Module

class EconomyEvaluator {
    constructor() {
        this.economicIndicators = {
            totalWealth: 0,
            income: 0,
            expenses: 0,
            profitMargin: 0,
            investmentEfficiency: 0
        };

        this.transactions = [];
        this.investments = [];
    }

    // Регистрация дохода
    registerIncome(source, amount) {
        if (amount <= 0) {
            throw new Error('Income amount must be positive');
        }

        const transaction = {
            type: 'income',
            source: source,
            amount: amount,
            timestamp: new Date()
        };

        this.transactions.push(transaction);
        this.economicIndicators.income += amount;
        this.updateTotalWealth();

        return transaction;
    }

    // Регистрация расходов
    registerExpense(category, amount) {
        if (amount <= 0) {
            throw new Error('Expense amount must be positive');
        }

        const transaction = {
            type: 'expense',
            category: category,
            amount: amount,
            timestamp: new Date()
        };

        this.transactions.push(transaction);
        this.economicIndicators.expenses += amount;
        this.updateTotalWealth();
        this.calculateProfitMargin();

        return transaction;
    }

    // Инвестирование средств
    makeInvestment(type, amount, expectedReturn) {
        if (amount <= 0) {
            throw new Error('Investment amount must be positive');
        }

        const investment = {
            type: type,
            amount: amount,
            expectedReturn: expectedReturn,
            startDate: new Date(),
            status: 'active'
        };

        this.investments.push(investment);
        this.economicIndicators.totalWealth -= amount;

        return investment;
    }

    // Оценка эффективности инвестиций
    evaluateInvestments() {
        const completedInvestments = this.investments.filter(inv => inv.status === 'completed');
        
        if (completedInvestments.length === 0) {
            this.economicIndicators.investmentEfficiency = 0;
            return;
        }

        const totalReturn = completedInvestments.reduce((sum, inv) => 
            sum + (inv.actualReturn || 0), 0);
        
        const totalInvested = completedInvestments.reduce((sum, inv) => 
            sum + inv.amount, 0);

        this.economicIndicators.investmentEfficiency = 
            ((totalReturn - totalInvested) / totalInvested) * 100;
    }

    // Обновление общего богатства
    updateTotalWealth() {
        this.economicIndicators.totalWealth = 
            this.economicIndicators.income - this.economicIndicators.expenses;
    }

    // Расчет маржи прибыли
    calculateProfitMargin() {
        if (this.economicIndicators.income === 0) {
            this.economicIndicators.profitMargin = 0;
            return;
        }

        this.economicIndicators.profitMargin = 
            ((this.economicIndicators.income - this.economicIndicators.expenses) 
            / this.economicIndicators.income) * 100;
    }

    // Получение текущих экономических показателей
    getEconomicIndicators() {
        return { ...this.economicIndicators };
    }

    // История транзакций за период
    getTransactionHistory(startDate, endDate) {
        return this.transactions.filter(transaction => 
            transaction.timestamp >= startDate && 
            transaction.timestamp <= endDate
        );
    }

    // Получение списка инвестиций
    getInvestments() {
        return [...this.investments];
    }

    // Завершение инвестиционного проекта
    finalizeInvestment(investmentId, actualReturn) {
        const investmentIndex = this.investments.findIndex(inv => inv.id === investmentId);
        
        if (investmentIndex === -1) {
            throw new Error('Investment not found');
        }

        const investment = this.investments[investmentIndex];
        investment.status = 'completed';
        investment.actualReturn = actualReturn;
        investment.endDate = new Date();

        this.economicIndicators.totalWealth += actualReturn;
        this.evaluateInvestments();

        return investment;
    }
}

export default EconomyEvaluator;