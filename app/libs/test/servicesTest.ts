// // Simple test to verify services are working
// import { chatWithAI, prepareFinancialContext } from '@/app/services/aiService';
// import { generateFinancialInsights } from '@/app/services/analyticsService';
// import { getAllBudgets } from '@/app/services/budgetService';
// import { getAllCategories } from '@/app/services/categoryService';
// import { getAllTransactions, getTransactionSummary, saveTransaction } from '@/app/services/transactionService';

// export const testServices = async () => {
//   console.log('🧪 Testing SpendWise Services...');
  
//   try {
//     // Test Categories Service  
//     console.log('📂 Testing Categories Service...');
//     const categories = await getAllCategories();
//     console.log(`✅ Categories loaded: ${categories.length} categories`);
    
//     // Test Transaction Service
//     console.log('💰 Testing Transaction Service...');
//     await saveTransaction({
//       vendor: 'Test Store',
//       amount: 25.99,
//       type: 'expense',
//       category: 'Shopping',
//     });
    
//     const transactions = await getAllTransactions();
//     console.log(`✅ Transactions: ${transactions.length} transactions`);
    
//     const summary = await getTransactionSummary();
//     console.log(`✅ Summary: Income: $${summary.totalIncome}, Expenses: $${summary.totalExpenses}`);
    
//     // Test Budget Service
//     console.log('🎯 Testing Budget Service...');
//     const budgets = await getAllBudgets();
//     console.log(`✅ Budgets: ${budgets.length} budgets`);
    
//     // Test Analytics Service
//     console.log('📊 Testing Analytics Service...');
//     const insights = await generateFinancialInsights();
//     console.log(`✅ Insights: ${insights.length} insights generated`);
    
//     // Test AI Service
//     console.log('🤖 Testing AI Service...');
//     const context = await prepareFinancialContext();
//     console.log(`✅ Financial context prepared`);
    
//     const aiResponse = await chatWithAI('How much did I spend this month?', context);
//     console.log(`✅ AI Response: ${aiResponse.substring(0, 50)}...`);
    
//     console.log('🎉 All services tested successfully!');
//     return true;
    
//   } catch (error) {
//     console.error('❌ Service test failed:', error);
//     return false;
//   }
// };

// // Export for use in components
// export default testServices;
