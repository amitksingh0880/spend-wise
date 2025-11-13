// import { createBudget, generateBudgetPeriod } from '@/app/services/budgetService';
// import { initializeDefaultCategories } from '@/app/services/categoryService';
// import { saveTransaction } from '@/app/services/transactionService';

// export const initializeSampleData = async () => {
//   try {
//     // Initialize categories first
//     await initializeDefaultCategories();

//     // Sample transactions
//     const sampleTransactions = [
//       // Income
//       { vendor: 'Salary Deposit', amount: 3500, type: 'income' as const, category: 'Salary' },
//       { vendor: 'Freelance Project', amount: 800, type: 'income' as const, category: 'Freelance' },
      
//       // Expenses
//       { vendor: 'Whole Foods', amount: 125.50, type: 'expense' as const, category: 'Groceries' },
//       { vendor: 'Starbucks', amount: 5.75, type: 'expense' as const, category: 'Food & Dining' },
//       { vendor: 'Shell Gas Station', amount: 45.30, type: 'expense' as const, category: 'Transportation' },
//       { vendor: 'Netflix', amount: 15.99, type: 'expense' as const, category: 'Entertainment' },
//       { vendor: 'Amazon', amount: 89.99, type: 'expense' as const, category: 'Shopping' },
//       { vendor: 'Electric Company', amount: 85.00, type: 'expense' as const, category: 'Bills & Utilities' },
//       { vendor: 'Target', amount: 67.43, type: 'expense' as const, category: 'Shopping' },
//       { vendor: 'Chipotle', amount: 12.50, type: 'expense' as const, category: 'Food & Dining' },
//       { vendor: 'Uber', amount: 18.75, type: 'expense' as const, category: 'Transportation' },
//       { vendor: 'Spotify', amount: 9.99, type: 'expense' as const, category: 'Entertainment' },
//       { vendor: 'CVS Pharmacy', amount: 24.99, type: 'expense' as const, category: 'Healthcare' },
//       { vendor: 'Trader Joes', amount: 78.32, type: 'expense' as const, category: 'Groceries' },
//       { vendor: 'Movie Theater', amount: 32.00, type: 'expense' as const, category: 'Entertainment' },
//     ];

//     // Add transactions with some delay to create realistic timestamps
//     for (let i = 0; i < sampleTransactions.length; i++) {
//       await saveTransaction(sampleTransactions[i]);
//       // Add small delay to create different timestamps
//       await new Promise(resolve => setTimeout(resolve, 100));
//     }

//     // Sample budgets
//     const sampleBudgets = [
//       { name: 'Monthly Groceries', category: 'Groceries', amount: 400, color: '#22c55e' },
//       { name: 'Dining Out', category: 'Food & Dining', amount: 200, color: '#f59e0b' },
//       { name: 'Transportation', category: 'Transportation', amount: 300, color: '#3b82f6' },
//       { name: 'Entertainment', category: 'Entertainment', amount: 150, color: '#8b5cf6' },
//       { name: 'Shopping', category: 'Shopping', amount: 250, color: '#ec4899' },
//       { name: 'Utilities', category: 'Bills & Utilities', amount: 200, color: '#06b6d4' },
//     ];

//     for (const budgetData of sampleBudgets) {
//       const period = generateBudgetPeriod('monthly');
//       await createBudget({
//         ...budgetData,
//         period: 'monthly',
//         isActive: true,
//         ...period,
//       });
//     }

//     console.log('Sample data initialized successfully');
//   } catch (error) {
//     console.error('Error initializing sample data:', error);
//   }
// };

// export const clearAllData = async () => {
//   try {
//     const { clearAllTransactions } = await import('@/app/services/transactionService');
//     const { writeJson } = await import('@/app/libs/storage');
    
//     await clearAllTransactions();
//     await writeJson('budgets', []);
//     await writeJson('budget_alerts', []);
//     await writeJson('categories', []);
    
//     console.log('All data cleared successfully');
//   } catch (error) {
//     console.error('Error clearing data:', error);
//   }
// };

