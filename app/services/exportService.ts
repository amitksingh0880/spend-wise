import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { generateFinancialReport } from './analyticsService';
import { getAllBudgets } from './budgetService';
import { getAllTransactions } from './transactionService';

export interface ExportOptions {
  format: 'csv' | 'json' | 'pdf';
  dateRange?: {
    from: string;
    to: string;
  };
  includeTransactions?: boolean;
  includeBudgets?: boolean;
  includeAnalytics?: boolean;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

// CSV Export Functions
const generateTransactionsCSV = async (dateRange?: { from: string; to: string }): Promise<string> => {
  const transactions = await getAllTransactions();
  
  let filteredTransactions = transactions;
  if (dateRange) {
    filteredTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.createdAt);
      return txDate >= new Date(dateRange.from) && txDate <= new Date(dateRange.to);
    });
  }
  
  const headers = [
    'Date',
    'Vendor',
    'Category', 
    'Type',
    'Amount',
    'Description',
    'Tags'
  ];
  
  const csvRows = [
    headers.join(','),
    ...filteredTransactions.map(tx => [
      new Date(tx.createdAt).toLocaleDateString(),
      `"${tx.vendor}"`,
      `"${tx.category}"`,
      tx.type,
      tx.amount.toFixed(2),
      `"${tx.description || ''}"`,
      `"${(tx.tags || []).join(';')}"`
    ].join(','))
  ];
  
  return csvRows.join('\n');
};

const generateBudgetsCSV = async (): Promise<string> => {
  const budgets = await getAllBudgets();
  
  const headers = [
    'Name',
    'Category',
    'Budgeted Amount',
    'Spent Amount',
    'Remaining',
    'Period',
    'Start Date',
    'End Date',
    'Status'
  ];
  
  const csvRows = [
    headers.join(','),
    ...budgets.map(budget => {
      const remaining = budget.amount - budget.spent;
      const percentage = (budget.spent / budget.amount) * 100;
      const status = percentage >= 100 ? 'Exceeded' : percentage >= 80 ? 'Warning' : 'On Track';
      
      return [
        `"${budget.name}"`,
        `"${budget.category}"`,
        budget.amount.toFixed(2),
        budget.spent.toFixed(2),
        remaining.toFixed(2),
        budget.period,
        new Date(budget.startDate).toLocaleDateString(),
        new Date(budget.endDate).toLocaleDateString(),
        status
      ].join(',');
    })
  ];
  
  return csvRows.join('\n');
};

// JSON Export Functions
const generateFullDataJSON = async (options: ExportOptions): Promise<string> => {
  const data: any = {
    exportDate: new Date().toISOString(),
    dateRange: options.dateRange,
  };
  
  if (options.includeTransactions) {
    let transactions = await getAllTransactions();
    
    if (options.dateRange) {
      transactions = transactions.filter(tx => {
        const txDate = new Date(tx.createdAt);
        return txDate >= new Date(options.dateRange!.from) && txDate <= new Date(options.dateRange!.to);
      });
    }
    
    data.transactions = transactions;
  }
  
  if (options.includeBudgets) {
    data.budgets = await getAllBudgets();
  }
  
  if (options.includeAnalytics) {
    data.analytics = await generateFinancialReport();
  }
  
  return JSON.stringify(data, null, 2);
};

// PDF Export Functions (Basic HTML to PDF simulation)
const generatePDFContent = async (options: ExportOptions): Promise<string> => {
  const report = await generateFinancialReport();
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>SpendWise Financial Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin-bottom: 25px; }
        .section h2 { color: #4f46e5; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
        th { background-color: #f3f4f6; }
        .metric { display: inline-block; margin: 10px; padding: 15px; background: #f9fafb; border-radius: 8px; }
        .positive { color: #22c55e; }
        .negative { color: #ef4444; }
        .warning { color: #f59e0b; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>SpendWise Financial Report</h1>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
        ${options.dateRange ? `<p>Period: ${new Date(options.dateRange.from).toLocaleDateString()} - ${new Date(options.dateRange.to).toLocaleDateString()}</p>` : ''}
      </div>
  `;
  
  // Summary Section
  html += `
    <div class="section">
      <h2>Financial Summary</h2>
      <div class="metric">
        <strong>Total Income:</strong> <span class="positive">$${report.summary.totalIncome.toFixed(2)}</span>
      </div>
      <div class="metric">
        <strong>Total Expenses:</strong> <span class="negative">$${report.summary.totalExpenses.toFixed(2)}</span>
      </div>
      <div class="metric">
        <strong>Net Amount:</strong> <span class="${report.summary.netAmount >= 0 ? 'positive' : 'negative'}">$${report.summary.netAmount.toFixed(2)}</span>
      </div>
      <div class="metric">
        <strong>Transactions:</strong> ${report.summary.transactionCount}
      </div>
    </div>
  `;
  
  // Health Score Section
  html += `
    <div class="section">
      <h2>Financial Health Score</h2>
      <div class="metric">
        <strong>Overall Score:</strong> ${report.healthScore.score}/100
      </div>
      <div class="metric">
        <strong>Risk Level:</strong> <span class="${report.healthScore.riskLevel === 'low' ? 'positive' : report.healthScore.riskLevel === 'medium' ? 'warning' : 'negative'}">${report.healthScore.riskLevel.toUpperCase()}</span>
      </div>
    </div>
  `;
  
  // Top Insights
  if (report.insights.length > 0) {
    html += `
      <div class="section">
        <h2>Key Insights</h2>
        <ul>
    `;
    
    report.insights.slice(0, 5).forEach(insight => {
      html += `<li><strong>${insight.title}:</strong> ${insight.description}</li>`;
    });
    
    html += `
        </ul>
      </div>
    `;
  }
  
  // Spending Patterns
  if (report.spendingPatterns.length > 0) {
    html += `
      <div class="section">
        <h2>Top Spending Categories</h2>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Monthly Average</th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    report.spendingPatterns.slice(0, 10).forEach(pattern => {
      html += `
        <tr>
          <td>${pattern.category}</td>
          <td>$${pattern.averageMonthly.toFixed(2)}</td>
          <td class="${pattern.trend === 'increasing' ? 'negative' : pattern.trend === 'decreasing' ? 'positive' : ''}">${pattern.trend}</td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
      </div>
    `;
  }
  
  // Include transactions if requested
  if (options.includeTransactions) {
    const transactions = await getAllTransactions();
    let filteredTransactions = transactions;
    
    if (options.dateRange) {
      filteredTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.createdAt);
        return txDate >= new Date(options.dateRange!.from) && txDate <= new Date(options.dateRange!.to);
      });
    }
    
    html += `
      <div class="section">
        <h2>Recent Transactions</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Vendor</th>
              <th>Category</th>
              <th>Type</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    filteredTransactions.slice(0, 50).forEach(tx => {
      html += `
        <tr>
          <td>${new Date(tx.createdAt).toLocaleDateString()}</td>
          <td>${tx.vendor}</td>
          <td>${tx.category}</td>
          <td>${tx.type}</td>
          <td class="${tx.type === 'income' ? 'positive' : 'negative'}">$${tx.amount.toFixed(2)}</td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
      </div>
    `;
  }
  
  html += `
    </body>
    </html>
  `;
  
  return html;
};

// Main Export Functions
export const exportTransactions = async (options: ExportOptions): Promise<ExportResult> => {
  try {
    let content: string;
    let fileName: string;
    let mimeType: string;
    
    const dateStr = new Date().toISOString().split('T')[0];
    
    switch (options.format) {
      case 'csv':
        content = await generateTransactionsCSV(options.dateRange);
        fileName = `spendwise-transactions-${dateStr}.csv`;
        mimeType = 'text/csv';
        break;
        
      case 'json':
        content = await generateFullDataJSON(options);
        fileName = `spendwise-data-${dateStr}.json`;
        mimeType = 'application/json';
        break;
        
      case 'pdf':
        content = await generatePDFContent(options);
        fileName = `spendwise-report-${dateStr}.html`; // HTML for now, can be converted to PDF
        mimeType = 'text/html';
        break;
        
      default:
        throw new Error('Unsupported export format');
    }
    
    // Write file to device
    const filePath = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(filePath, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    
    // Share the file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType,
        dialogTitle: 'Export SpendWise Data',
      });
    }
    
    return {
      success: true,
      filePath,
    };
    
  } catch (error) {
    console.error('Export error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown export error',
    };
  }
};

export const exportBudgets = async (format: 'csv' | 'json' = 'csv'): Promise<ExportResult> => {
  try {
    let content: string;
    let fileName: string;
    let mimeType: string;
    
    const dateStr = new Date().toISOString().split('T')[0];
    
    if (format === 'csv') {
      content = await generateBudgetsCSV();
      fileName = `spendwise-budgets-${dateStr}.csv`;
      mimeType = 'text/csv';
    } else {
      const budgets = await getAllBudgets();
      content = JSON.stringify(budgets, null, 2);
      fileName = `spendwise-budgets-${dateStr}.json`;
      mimeType = 'application/json';
    }
    
    const filePath = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(filePath, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType,
        dialogTitle: 'Export SpendWise Budgets',
      });
    }
    
    return {
      success: true,
      filePath,
    };
    
  } catch (error) {
    console.error('Budget export error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown export error',
    };
  }
};

export const generateFinancialReportFile = async (period: 'monthly' | 'quarterly' | 'yearly' = 'monthly'): Promise<ExportResult> => {
  try {
    const report = await generateFinancialReport(period);
    const dateStr = new Date().toISOString().split('T')[0];
    
    const content = JSON.stringify(report, null, 2);
    const fileName = `spendwise-report-${period}-${dateStr}.json`;
    
    const filePath = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(filePath, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: 'Export Financial Report',
      });
    }
    
    return {
      success: true,
      filePath,
    };
    
  } catch (error) {
    console.error('Report export error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown export error',
    };
  }
};

// Import Functions
export const importTransactionsFromCSV = async (csvContent: string): Promise<{ success: boolean; imported: number; errors: string[] }> => {
  try {
    const { importTransactions } = await import('./transactionService');
    
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    
    const transactions = [];
    const errors: string[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      try {
        const values = line.split(',');
        
        // Parse CSV row (adjust indices based on your CSV format)
        const transaction = {
          vendor: values[1]?.replace(/"/g, '') || 'Unknown',
          category: values[2]?.replace(/"/g, '') || 'Other',
          type: (values[3] as 'income' | 'expense') || 'expense',
          amount: parseFloat(values[4]) || 0,
          description: values[5]?.replace(/"/g, '') || '',
          tags: values[6] ? values[6].replace(/"/g, '').split(';').filter(Boolean) : [],
        };
        
        if (transaction.amount > 0) {
          transactions.push(transaction);
        } else {
          errors.push(`Line ${i + 1}: Invalid amount`);
        }
      } catch (error) {
        errors.push(`Line ${i + 1}: ${error instanceof Error ? error.message : 'Parse error'}`);
      }
    }
    
    if (transactions.length > 0) {
      await importTransactions(transactions);
    }
    
    return {
      success: true,
      imported: transactions.length,
      errors,
    };
    
  } catch (error) {
    return {
      success: false,
      imported: 0,
      errors: [error instanceof Error ? error.message : 'Unknown import error'],
    };
  }
};

// Utility Functions
export const getExportFormats = (): { value: string; label: string; description: string }[] => [
  {
    value: 'csv',
    label: 'CSV',
    description: 'Comma-separated values, compatible with Excel and Google Sheets',
  },
  {
    value: 'json',
    label: 'JSON',
    description: 'Complete data export including analytics and metadata',
  },
  {
    value: 'pdf',
    label: 'PDF Report',
    description: 'Formatted financial report with charts and insights',
  },
];

export const validateExportOptions = (options: ExportOptions): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!['csv', 'json', 'pdf'].includes(options.format)) {
    errors.push('Invalid export format');
  }
  
  if (options.dateRange) {
    const fromDate = new Date(options.dateRange.from);
    const toDate = new Date(options.dateRange.to);
    
    if (isNaN(fromDate.getTime())) {
      errors.push('Invalid from date');
    }
    
    if (isNaN(toDate.getTime())) {
      errors.push('Invalid to date');
    }
    
    if (fromDate > toDate) {
      errors.push('From date must be before to date');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

