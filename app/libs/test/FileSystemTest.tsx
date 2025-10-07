import React, { useEffect } from "react";
import { getAllTransactions, saveTransaction } from "../../services/transactionService";

export default function FileSystemTest() {
  useEffect(() => {
    const runTransactions = async () => {
      await saveTransaction({
        amount: 200,
        type: "expense",
        vendor: "Amazon",
        category: "Shopping",
      });

      const transactions = await getAllTransactions();
      console.log("Transactions:", transactions);
    };

    runTransactions();
  }, []);

  return (
    <div>
      <h1>Check console for transactions</h1>
    </div>
  );
}
