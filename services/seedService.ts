import { MOCK_TRANSACTIONS, MOCK_BUDGETS } from '@/constants/mockData';
import { readJson, writeJson } from '@/libs/storage';
import { uuidv4 } from '@/utils/uuid';
import { emitter } from '@/libs/emitter';

export const seedMockData = async () => {
    try {
        // Seed Transactions
        const today = new Date();
        const txs = MOCK_TRANSACTIONS.map((tx, index) => {
            const date = new Date(today);
            date.setDate(date.getDate() - (index % 15)); // Spread over last 15 days
            return {
                id: uuidv4(),
                amount: tx.amount,
                type: tx.type as 'income' | 'expense',
                vendor: tx.vendor,
                category: tx.category,
                createdAt: date.toISOString()
            };
        });
        
        const existingTxs: any[] = (await readJson('transactions')) || [];
        await writeJson('transactions', [...txs, ...existingTxs]);
        emitter.emit('transactions:changed');

        // Seed Budgets
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();
        
        const budgets = MOCK_BUDGETS.map(b => ({
            id: uuidv4(),
            name: b.name,
            category: b.name,
            amount: b.total,
            spent: b.spent,
            period: 'monthly',
            startDate: startOfMonth,
            endDate: endOfMonth,
            color: b.color,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }));
        
        const existingB: any[] = (await readJson('budgets')) || [];
        await writeJson('budgets', [...budgets, ...existingB]);
        emitter.emit('budgets:changed');
        return {
            transactionsCount: txs.length,
            budgetsCount: budgets.length
        };
    } catch (error) {
        console.error("Failed to seed mock data:", error);
        throw error;
    }
};
