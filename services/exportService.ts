import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { generateFinancialReport } from './analyticsService';
import { getAllBudgets } from './budgetService';
import { getCurrency } from './preferencesService';
import { getAllTransactions } from './transactionService';
import { maskTransactionForExport, shouldMaskExports } from './privacyService';
import { formatCurrency } from '../utils/currency';

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
  const maskingEnabled = await shouldMaskExports();
  
  let filteredTransactions = transactions;
  if (dateRange) {
    filteredTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.createdAt);
      return txDate >= new Date(dateRange.from) && txDate <= new Date(dateRange.to);
    });
  }

  if (maskingEnabled) {
    filteredTransactions = filteredTransactions.map(maskTransactionForExport);
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
    const maskingEnabled = await shouldMaskExports();
    
    if (options.dateRange) {
      transactions = transactions.filter(tx => {
        const txDate = new Date(tx.createdAt);
        return txDate >= new Date(options.dateRange!.from) && txDate <= new Date(options.dateRange!.to);
      });
    }

    if (maskingEnabled) {
      transactions = transactions.map(maskTransactionForExport);
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
  const currency = await getCurrency();
  const formatAmount = (value: number) => formatCurrency(value, currency);
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>SpendWise Financial Report</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          padding: 40px 20px;
          color: #1f2937;
          line-height: 1.6;
        }
        .container { 
          max-width: 960px; 
          margin: 0 auto;
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
          overflow: hidden;
        }
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 50px 40px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .header::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 500px;
          height: 500px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
        }
        .header h1 { 
          font-size: 42px; 
          font-weight: 700;
          margin-bottom: 10px;
          position: relative;
          z-index: 1;
          letter-spacing: -0.5px;
        }
        .header p { 
          font-size: 14px; 
          opacity: 0.95;
          position: relative;
          z-index: 1;
        }
        .content { padding: 40px; }
        .section { 
          margin-bottom: 40px;
          page-break-inside: avoid;
        }
        .section h2 { 
          color: #667eea;
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 3px solid #f0f4ff;
          position: relative;
        }
        .section h2::before {
          content: '';
          position: absolute;
          bottom: -3px;
          left: 0;
          height: 3px;
          width: 50px;
          background: linear-gradient(90deg, #667eea, #764ba2);
          border-radius: 2px;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }
        .metric-card { 
          padding: 24px;
          background: linear-gradient(135deg, #f5f7fa 0%, #f0f4ff 100%);
          border-radius: 12px;
          border: 1px solid #e0e7ff;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.08);
          transition: transform 0.2s;
        }
        .metric-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.12);
        }
        .metric-label { 
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        .metric-value { 
          font-size: 28px;
          font-weight: 700;
          color: #1f2937;
          word-break: break-word;
        }
        .score-display {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 24px;
          background: linear-gradient(135deg, #f5f7fa 0%, #f0f4ff 100%);
          border-radius: 12px;
          border: 1px solid #e0e7ff;
        }
        .score-circle {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .score-circle.excellent { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
        .score-circle.good { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
        .score-circle.fair { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
        .score-circle.poor { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
        .score-circle-value {
          font-size: 32px;
          font-weight: 700;
          color: white;
        }
        .score-info h3 {
          font-size: 18px;
          color: #1f2937;
          margin-bottom: 4px;
        }
        .score-info p {
          font-size: 14px;
          color: #6b7280;
        }
        .positive { color: #10b981; font-weight: 600; }
        .negative { color: #ef4444; font-weight: 600; }
        .warning { color: #f59e0b; font-weight: 600; }
        .neutral { color: #6b7280; font-weight: 600; }
        table { 
          width: 100%; 
          border-collapse: collapse;
          margin-top: 16px;
        }
        th { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 14px;
          text-align: left;
          font-weight: 600;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        td { 
          padding: 12px 14px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 13px;
        }
        tbody tr:hover {
          background-color: #f9fafb;
        }
        tbody tr:last-child td {
          border-bottom: none;
        }
        .insight-item {
          padding: 16px;
          background: linear-gradient(135deg, #f0f4ff 0%, #f5f7fa 100%);
          border-left: 4px solid #667eea;
          border-radius: 8px;
          margin-bottom: 12px;
        }
        .insight-item strong {
          color: #667eea;
          display: block;
          margin-bottom: 4px;
        }
        .insight-item p {
          color: #4b5563;
          font-size: 13px;
        }
        .footer {
          background: #f9fafb;
          padding: 20px 40px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          font-size: 12px;
          color: #9ca3af;
        }
        .period-badge {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          margin-top: 8px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💼 SpendWise Financial Report</h1>
          <p>Your Financial Health Summary</p>
          ${options.dateRange ? `<div class="period-badge">📅 ${new Date(options.dateRange.from).toLocaleDateString()} - ${new Date(options.dateRange.to).toLocaleDateString()}</div>` : ''}
          <p style="margin-top: 12px; font-size: 12px;">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>
        <div class="content">
  `;
  
  // Summary Section
  html += `
    <div class="section">
      <h2>📊 Financial Overview</h2>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Total Income</div>
          <div class="metric-value positive">${formatAmount(report.summary.totalIncome)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Total Expenses</div>
          <div class="metric-value negative">${formatAmount(report.summary.totalExpenses)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Net Balance</div>
          <div class="metric-value ${report.summary.netAmount >= 0 ? 'positive' : 'negative'}">${formatAmount(report.summary.netAmount)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Transactions</div>
          <div class="metric-value neutral">${report.summary.transactionCount}</div>
        </div>
      </div>
    </div>
  `;
  
  // Health Score Section
  const scoreClass = report.healthScore.score >= 80 ? 'excellent' : report.healthScore.score >= 60 ? 'good' : report.healthScore.score >= 40 ? 'fair' : 'poor';
  const riskColor = report.healthScore.riskLevel === 'low' ? 'positive' : report.healthScore.riskLevel === 'medium' ? 'warning' : 'negative';
  
  html += `
    <div class="section">
      <h2>💪 Financial Health</h2>
      <div class="score-display">
        <div class="score-circle ${scoreClass}">
          <div class="score-circle-value">${report.healthScore.score}</div>
        </div>
        <div class="score-info">
          <h3>Overall Health Score</h3>
          <p>Risk Level: <span class="${riskColor}">${report.healthScore.riskLevel.toUpperCase()}</span></p>
          <p style="margin-top: 8px; font-size: 12px; color: #9ca3af;">Based on your spending patterns, income stability, and financial goals.</p>
        </div>
      </div>
    </div>
  `;
  
  // Top Insights
  if (report.insights.length > 0) {
    html += `
      <div class="section">
        <h2>✨ Key Insights</h2>
    `;
    
    report.insights.slice(0, 5).forEach(insight => {
      html += `
        <div class="insight-item">
          <strong>${insight.title}</strong>
          <p>${insight.description}</p>
        </div>
      `;
    });
    
    html += `
      </div>
    `;
  }
  
  // Spending Patterns
  if (report.spendingPatterns.length > 0) {
    html += `
      <div class="section">
        <h2>🎯 Top Spending Categories</h2>
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
      const trendIcon = pattern.trend === 'increasing' ? '📈' : pattern.trend === 'decreasing' ? '📉' : '➡️';
      const trendClass = pattern.trend === 'increasing' ? 'negative' : pattern.trend === 'decreasing' ? 'positive' : 'neutral';
      html += `
        <tr>
          <td>${pattern.category}</td>
          <td>${formatAmount(pattern.averageMonthly)}</td>
          <td><span class="${trendClass}">${trendIcon} ${pattern.trend}</span></td>
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
    const maskingEnabled = await shouldMaskExports();
    let filteredTransactions = transactions;
    
    if (options.dateRange) {
      filteredTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.createdAt);
        return txDate >= new Date(options.dateRange!.from) && txDate <= new Date(options.dateRange!.to);
      });
    }

    if (maskingEnabled) {
      filteredTransactions = filteredTransactions.map(maskTransactionForExport);
    }
    
    html += `
      <div class="section">
        <h2>📝 Recent Transactions</h2>
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
          <td>${tx.type === 'income' ? '💰 Income' : '💳 Expense'}</td>
          <td class="${tx.type === 'income' ? 'positive' : 'negative'}">${formatAmount(tx.amount)}</td>
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
        </div>
        <div class="footer">
          <p>© 2024 SpendWise - Your Personal Finance Manager</p>
          <p>This report contains your confidential financial information. Keep it secure.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return html;
};

const exportPDFOnWeb = async (options: ExportOptions, fileName: string): Promise<ExportResult> => {
  const { jsPDF } = await import('jspdf');
  const report = await generateFinancialReport();
  const currency = await getCurrency();
  const formatAmount = (value: number) => formatCurrency(value, currency);

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  const lineHeight = 16;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  let y = 48;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 40) {
      doc.addPage();
      y = 40;
    }
  };

  const writeLine = (text: string, options?: { bold?: boolean; size?: number }) => {
    const size = options?.size ?? 11;
    doc.setFont('helvetica', options?.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, maxWidth);
    ensureSpace(lines.length * lineHeight + 4);
    doc.text(lines, margin, y);
    y += lines.length * lineHeight + 4;
  };

  writeLine('SpendWise Financial Report', { bold: true, size: 20 });
  writeLine(`Generated: ${new Date().toLocaleString()}`, { size: 10 });
  if (options.dateRange) {
    writeLine(
      `Period: ${new Date(options.dateRange.from).toLocaleDateString()} - ${new Date(options.dateRange.to).toLocaleDateString()}`,
      { size: 10 }
    );
  }

  y += 6;
  writeLine('Financial Overview', { bold: true, size: 14 });
  writeLine(`Total Income: ${formatAmount(report.summary.totalIncome)}`);
  writeLine(`Total Expenses: ${formatAmount(report.summary.totalExpenses)}`);
  writeLine(`Net Balance: ${formatAmount(report.summary.netAmount)}`);
  writeLine(`Transactions: ${report.summary.transactionCount}`);

  y += 6;
  writeLine('Financial Health', { bold: true, size: 14 });
  writeLine(`Score: ${report.healthScore.score}`);
  writeLine(`Risk Level: ${report.healthScore.riskLevel.toUpperCase()}`);

  if (report.insights.length > 0) {
    y += 6;
    writeLine('Top Insights', { bold: true, size: 14 });
    report.insights.slice(0, 5).forEach((insight, index) => {
      writeLine(`${index + 1}. ${insight.title}`, { bold: true });
      writeLine(insight.description);
    });
  }

  if (report.spendingPatterns.length > 0) {
    y += 6;
    writeLine('Top Spending Categories', { bold: true, size: 14 });
    report.spendingPatterns.slice(0, 10).forEach((pattern, index) => {
      writeLine(
        `${index + 1}. ${pattern.category} | ${formatAmount(pattern.averageMonthly)} | ${pattern.trend}`
      );
    });
  }

  if (options.includeTransactions) {
    const maskingEnabled = await shouldMaskExports();
    let transactions = await getAllTransactions();

    if (options.dateRange) {
      transactions = transactions.filter(tx => {
        const txDate = new Date(tx.createdAt);
        return txDate >= new Date(options.dateRange!.from) && txDate <= new Date(options.dateRange!.to);
      });
    }

    if (maskingEnabled) {
      transactions = transactions.map(maskTransactionForExport);
    }

    y += 6;
    writeLine('Recent Transactions', { bold: true, size: 14 });
    transactions.slice(0, 30).forEach(tx => {
      writeLine(
        `${new Date(tx.createdAt).toLocaleDateString()} | ${tx.vendor} | ${tx.category} | ${tx.type} | ${formatAmount(tx.amount)}`,
        { size: 10 }
      );
    });
  }

  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  return { success: true, filePath: `Downloads/${fileName}` };
};

const exportPDFOnNative = async (options: ExportOptions, fileName: string): Promise<ExportResult> => {
  const html = await generatePDFContent(options);
  const generated = await Print.printToFileAsync({ html, base64: false });
  const filePath = `${FileSystem.documentDirectory}${fileName}`;

  try {
    await FileSystem.deleteAsync(filePath, { idempotent: true });
  } catch {
    // no-op
  }

  await FileSystem.copyAsync({
    from: generated.uri,
    to: filePath,
  });

  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/pdf',
        dialogTitle: 'Export SpendWise PDF Report',
      });
    }
  } catch (shareErr) {
    console.error('Error sharing PDF export:', shareErr);
  }

  return { success: true, filePath };
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
        fileName = `spendwise-report-${dateStr}.pdf`;
        if (Platform.OS === 'web') {
          return await exportPDFOnWeb(options, fileName);
        }
        return await exportPDFOnNative(options, fileName);
        
      default:
        throw new Error('Unsupported export format');
    }
    
    // Save and share (with web fallback)
    const saveAndShare = async (fileName: string, content: string, mimeType: string): Promise<ExportResult> => {
      try {
        if (Platform.OS === 'web') {
          // Create a blob and trigger download
          const blob = new Blob([content], { type: mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          return { success: true, filePath: `Downloads/${fileName}` };
        }

        const filePath = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(filePath, content, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        // Verify file exists after write
        try {
          const info = await FileSystem.getInfoAsync(filePath);
          if (!info.exists) {
            console.error('Export error: file does not exist after write', filePath, info);
            return { success: false, error: 'Failed to write export file' };
          }
        } catch (infoErr) {
          console.error('Export error checking file info:', infoErr);
        }

        // Try to share; if sharing not available, still return file path so user can access it.
        try {
          const sharingAvailable = await Sharing.isAvailableAsync();
          if (sharingAvailable) {
            await Sharing.shareAsync(filePath, {
              mimeType,
              dialogTitle: 'Export SpendWise Data',
            });
          } else {
            console.warn('Sharing not available on this device/context; file saved to', filePath);
          }
        } catch (shareErr) {
          console.error('Error while sharing exported file:', shareErr);
          // still return success if file exists
        }

        return { success: true, filePath };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : String(e) };
      }
    };

    const saved = await saveAndShare(fileName, content, mimeType);
    return saved;
    
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
    
    // Web fallback and native write/share
    if (Platform.OS === 'web') {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return { success: true, filePath: `Downloads/${fileName}` };
    }
    const filePath = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(filePath, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    try {
      const info = await FileSystem.getInfoAsync(filePath);
      if (!info.exists) {
        console.error('Budget export error: file not found after write', filePath, info);
        return { success: false, error: 'Failed to write budget export file' };
      }
    } catch (infoErr) {
      console.error('Budget export error checking file info:', infoErr);
    }

    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType,
          dialogTitle: 'Export SpendWise Budgets',
        });
      } else {
        console.warn('Sharing not available; budgets exported to', filePath);
      }
    } catch (shareErr) {
      console.error('Error sharing budgets export:', shareErr);
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
    
    if (Platform.OS === 'web') {
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return { success: true, filePath: `Downloads/${fileName}` };
    }
    const filePath = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(filePath, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    try {
      const info = await FileSystem.getInfoAsync(filePath);
      if (!info.exists) {
        console.error('Report export error: file not found after write', filePath, info);
        return { success: false, error: 'Failed to write report file' };
      }
    } catch (infoErr) {
      console.error('Report export error checking file info:', infoErr);
    }

    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: 'Export Financial Report',
        });
      } else {
        console.warn('Sharing not available; report exported to', filePath);
      }
    } catch (shareErr) {
      console.error('Error sharing report export:', shareErr);
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
    // const headers = lines[0].split(','); // Unused
    
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

