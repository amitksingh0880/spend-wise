import { saveTransaction } from '../services/transactionService';

await saveTransaction({
  amount: 200,
  type: 'expense',
  vendor: 'Amazon',
  category: 'Shopping',
});

// const transactions = await getAllTransactions();
// console.log(transactions);
