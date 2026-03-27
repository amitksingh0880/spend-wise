# SpendWise API Documentation

## Overview

SpendWise is a comprehensive personal finance management application with a robust set of APIs for managing transactions, budgets, categories, analytics, and AI-powered insights. This documentation covers all the implemented services and their functionality.

## Architecture

The application follows a modular service-based architecture:

```
app/services/
├── apiService.ts          # Main API hub and unified interface
├── transactionService.ts  # Transaction CRUD and analytics
├── budgetService.ts       # Budget management and tracking
├── categoryService.ts     # Category management and suggestions
├── analyticsService.ts    # Financial analytics and insights
├── exportService.ts       # Data export/import functionality
└── aiService.ts          # AI-powered financial advice
```

## Core Services

### 1. Transaction Service (`transactionService.ts`)

Handles all transaction-related operations with enhanced functionality.

#### Key Features:
- **CRUD Operations**: Create, read, update, delete transactions
- **Advanced Filtering**: Filter by type, category, date range, amount, tags
- **Search Functionality**: Search by vendor, category, description, tags
- **Analytics**: Transaction summaries, trends, top categories
- **Bulk Operations**: Import/export transactions
- **Data Export**: CSV and JSON formats

#### Main Functions:

```typescript
// Basic CRUD
getAllTransactions(): Promise<Transaction[]>
getTransactionById(id: string): Promise<Transaction | null>
saveTransaction(tx: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction>
updateTransaction(id: string, updates: Partial<Transaction>): Promise<void>
deleteTransaction(id: string): Promise<void>

// Advanced Operations
getFilteredTransactions(filters: TransactionFilters): Promise<Transaction[]>
searchTransactions(query: string): Promise<Transaction[]>
getTransactionSummary(dateFrom?: string, dateTo?: string): Promise<TransactionSummary>
getTopCategories(limit: number, type: TransactionType): Promise<CategoryStats[]>
getRecentTransactions(limit: number): Promise<Transaction[]>

// Bulk Operations
importTransactions(transactions: Transaction[]): Promise<void>
exportTransactions(format: 'json' | 'csv'): Promise<string>
```

#### Enhanced Transaction Interface:

```typescript
interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  vendor: string;
  category: string;
  createdAt: string;
  description?: string;
  tags?: string[];
}
```

### 2. Budget Service (`budgetService.ts`)

Comprehensive budget management with alerts and tracking.

#### Key Features:
- **Budget CRUD**: Create, manage, and track budgets
- **Spending Calculation**: Automatic spending updates from transactions
- **Progress Tracking**: Real-time budget progress and projections
- **Alert System**: Configurable budget alerts (80%, 100% thresholds)
- **Templates**: Reusable budget templates
- **Analytics**: Budget trends and performance analysis

#### Main Functions:

```typescript
// Basic Operations
getAllBudgets(): Promise<Budget[]>
createBudget(budgetData: BudgetData): Promise<Budget>
updateBudget(id: string, updates: Partial<Budget>): Promise<void>
deleteBudget(id: string): Promise<void>

// Budget Tracking
getBudgetProgress(budgetId: string): Promise<BudgetProgress>
updateBudgetSpending(): Promise<void>
getActiveBudgets(): Promise<Budget[]>

// Alerts and Analytics
checkBudgetAlerts(): Promise<BudgetAlert[]>
getBudgetSummary(): Promise<BudgetSummary>
getBudgetTrends(months: number): Promise<BudgetTrend[]>

// Templates
createBudgetTemplate(name: string, categories: CategoryAmount[]): Promise<void>
getBudgetTemplates(): Promise<BudgetTemplate[]>
```

### 3. Category Service (`categoryService.ts`)

Smart category management with usage analytics and suggestions.

#### Key Features:
- **Default Categories**: Pre-loaded income and expense categories
- **Custom Categories**: Create custom categories with icons and colors
- **Usage Analytics**: Track category usage patterns and frequency
- **Smart Suggestions**: AI-powered category suggestions for transactions
- **Hierarchical Structure**: Support for parent-child category relationships
- **Import/Export**: Category data portability

#### Main Functions:

```typescript
// Basic Operations
getAllCategories(): Promise<Category[]>
createCategory(categoryData: CategoryData): Promise<Category>
getCategoriesByType(type: 'income' | 'expense'): Promise<Category[]>

// Analytics and Suggestions
getCategoryUsageStats(): Promise<CategoryUsage[]>
getUnusedCategories(): Promise<Category[]>
suggestCategoriesForTransaction(vendor: string, amount: number): Promise<Category[]>

// Utility
initializeDefaultCategories(): Promise<Category[]>
getCategoryColors(): string[]
getCategoryIcons(): string[]
```

### 4. Analytics Service (`analyticsService.ts`)

Comprehensive financial analytics and insights generation.

#### Key Features:
- **Financial Health Score**: Multi-factor health assessment (0-100)
- **Spending Pattern Analysis**: Trend detection and seasonality
- **Cash Flow Analysis**: Income/expense flow with projections
- **Automated Insights**: AI-generated financial insights and recommendations
- **Comprehensive Reports**: Detailed financial reports with visualizations

#### Main Functions:

```typescript
// Core Analytics
generateFinancialInsights(): Promise<FinancialInsight[]>
calculateFinancialHealthScore(): Promise<FinancialHealth>
analyzeCashFlow(): Promise<CashFlowAnalysis>
analyzeSpendingPatternsByCategory(): Promise<SpendingPattern[]>

// Reporting
generateFinancialReport(period: 'monthly' | 'quarterly' | 'yearly'): Promise<FinancialReport>
```

#### Financial Health Factors:

1. **Savings Rate** (Target: 20%)
2. **Budget Adherence** (Target: 90%)
3. **Expense Variability** (Target: <20%)
4. **Category Diversification** (Target: 8+ categories)

### 5. Export Service (`exportService.ts`)

Data portability with multiple export formats and sharing capabilities.

#### Key Features:
- **Multiple Formats**: CSV, JSON, PDF (HTML) export
- **Flexible Options**: Date ranges, selective data inclusion
- **File Sharing**: Native device sharing integration
- **Import Functionality**: CSV import with validation
- **Report Generation**: Formatted financial reports

#### Main Functions:

```typescript
// Export Operations
exportTransactions(options: ExportOptions): Promise<ExportResult>
exportBudgets(format: 'csv' | 'json'): Promise<ExportResult>
generateFinancialReportFile(period: string): Promise<ExportResult>

// Import Operations
importTransactionsFromCSV(csvContent: string): Promise<ImportResult>

// Utilities
getExportFormats(): ExportFormat[]
validateExportOptions(options: ExportOptions): ValidationResult
```

### 6. AI Service (`aiService.ts`)

AI-powered financial insights and conversational assistance.

#### Key Features:
- **Financial Insights**: Automated analysis and recommendations
- **Chat Interface**: Natural language financial Q&A
- **Spending Analysis**: Pattern recognition and advice
- **Budget Optimization**: Smart budget recommendations
- **Saving Opportunities**: Personalized saving suggestions
- **Context-Aware**: Uses actual financial data for personalized advice

#### Main Functions:

```typescript
// AI Insights
getFinancialInsights(context: FinancialContext): Promise<AIInsight[]>
chatWithAI(message: string, context: FinancialContext): Promise<string>

// Analysis Functions
generateSpendingInsights(transactions: Transaction[]): Promise<string[]>
suggestBudgetOptimizations(budgets: Budget[], transactions: Transaction[]): Promise<string[]>
generateSavingRecommendations(context: FinancialContext): Promise<string[]>

// Utilities
prepareFinancialContext(): Promise<FinancialContext>
formatPromptForGemini(message: string, context: FinancialContext): string
```

### 7. Unified API Service (`apiService.ts`)

Central hub providing a unified interface to all services.

#### Key Features:
- **Single Entry Point**: Access all services through one interface
- **Utility Functions**: Common operations and data aggregation
- **Dashboard Data**: Pre-aggregated data for UI components
- **Quick Actions**: Simplified functions for common tasks
- **Data Maintenance**: Automated cleanup and optimization

#### Main Interface:

```typescript
class SpendWiseAPI {
  static transactions = { /* Transaction operations */ }
  static budgets = { /* Budget operations */ }
  static categories = { /* Category operations */ }
  static analytics = { /* Analytics operations */ }
  static export = { /* Export operations */ }
  static ai = { /* AI operations */ }
  static utils = { /* Utility operations */ }
}
```

#### Utility Functions:

```typescript
// App Initialization
initializeApp(): Promise<void>

// Page Data Aggregation
getDashboardData(): Promise<DashboardData>
getTransactionPageData(searchQuery?: string): Promise<TransactionPageData>

### 8. Smart Rules Engine (`rulesEngineService.ts`)

Automated transaction classification with configurable rule conditions, including amount-based mapping.

#### Key Features:
- **Text Rules**: Match vendor/description/sender with `contains`, `equals`, `startsWith`, `endsWith`
- **Amount Rules**: Numeric operators `gt`, `gte`, `lt`, `lte`, `between`
- **Category Mapping**: Auto-assign category and tags on matched transactions
- **Priority Execution**: Higher-priority rules run first
- **Recurrence Conditions**: Match repeating transactions over last N days
- **Built-in Starter Rule**: Daily transport amount mapper (storage-seeded once)

#### Main Functions:

```typescript
getSmartRules(): Promise<SmartRule[]>
createSmartRule(input: Omit<SmartRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<SmartRule>
updateSmartRule(id: string, updates: Partial<Omit<SmartRule, 'id' | 'createdAt'>>): Promise<void>
deleteSmartRule(id: string): Promise<void>
createAmountCategoryRule(input: {
  name: string;
  minAmount: number;
  maxAmount: number;
  category: string;
  type?: 'income' | 'expense' | 'both';
  tags?: string[];
  priority?: number;
  keywordAny?: string[];
  daysOfWeek?: number[];
  occurrence?: RuleOccurrenceCondition;
  isActive?: boolean;
}): Promise<SmartRule>
applySmartRules(transaction: Transaction, existingTransactions?: Transaction[]): Promise<Transaction>
```

#### Example: Daily Transport Rule

```typescript
await createAmountCategoryRule({
  name: 'Daily Transport 20-120',
  minAmount: 20,
  maxAmount: 120,
  category: 'Transportation',
  type: 'expense',
  tags: ['auto-rule', 'daily-transport'],
  occurrence: { count: 3, days: 10, amountTolerance: 5 },
  priority: 90,
});
```

### 9. Modern Intelligence Service (`modernIntelligenceService.ts`)

Offline-first intelligence primitives to accelerate advanced product features without cloud dependency.

#### Key Features:
- **Offline Copilot Intents**: local natural-language intent handling for unusual spends, top categories, budget status
- **What-if Simulator**: scenario parsing like `rent +10%, fuel +15%` with projected impact
- **Calendar/Timeline Dataset**: spend heatmap points and recurring outflow summary
- **Explainable Anomaly Scoring**: score + human-readable reason set per flagged transaction
- **Contextual Nudges**: actionable prompts for overspending and budget risk
- **Capability Matrix**: feature readiness map for roadmap tracking

#### Main Functions:

```typescript
queryOfflineCopilot(question: string, transactions: Transaction[], budgets?: Budget[]): Promise<OfflineCopilotResponse>
simulateWhatIfScenario(scenario: string, transactions: Transaction[]): Promise<WhatIfSimulationResult>
buildCalendarTimelineView(transactions: Transaction[], month?: string): Promise<TimelineViewResult>
scoreExplainableAnomalies(transactions: Transaction[]): Promise<ExplainableAnomaly[]>
generateContextualNudges(transactions: Transaction[], budgets: Budget[]): Promise<ContextualNudge[]>
getModernFeatureCapabilityMatrix(): FeatureCapability[]
```
getBudgetPageData(): Promise<BudgetPageData>

// Maintenance
performDataMaintenance(): Promise<MaintenanceResult>
getAppStatistics(): Promise<AppStatistics>
```

## Data Models

### Core Interfaces

```typescript
interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  vendor: string;
  category: string;
  createdAt: string;
  description?: string;
  tags?: string[];
}

interface Budget {
  id: string;
  name: string;
  category: string;
  amount: number;
  spent: number;
  period: 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'both';
  icon: string;
  color: string;
  isDefault: boolean;
  isActive: boolean;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}
```

## Storage Architecture

### AsyncStorage Keys:
- `transactions` - All transaction data
- `budgets` - Budget configurations and tracking
- `categories` - Category definitions
- `budget_alerts` - Active budget alerts
- `budget_templates` - Reusable budget templates

### Data Persistence:
- **Automatic Backups**: All data automatically persisted to device storage
- **Offline First**: Full functionality without internet connection
- **Data Integrity**: Validation and error handling for all operations
- **Migration Support**: Version-aware data structure updates

## Usage Examples

### Basic Transaction Management

```typescript
import SpendWiseAPI from '@/services/apiService';

// Add a new transaction
const transaction = await SpendWiseAPI.transactions.create({
  vendor: 'Starbucks',
  amount: 5.75,
  category: 'Food & Dining',
  type: 'expense'
});

// Get recent transactions
const recent = await SpendWiseAPI.transactions.getRecent(10);

// Search transactions
const coffeeTransactions = await SpendWiseAPI.transactions.search('coffee');
```

### Budget Management

```typescript
// Create a monthly budget
const budget = await SpendWiseAPI.budgets.create({
  name: 'Groceries Budget',
  category: 'Groceries',
  amount: 500,
  period: 'monthly',
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  color: '#22c55e',
  isActive: true
});

// Check budget progress
const progress = await SpendWiseAPI.budgets.getProgress(budget.id);
console.log(`Budget is ${progress.percentage}% utilized`);
```

### Analytics and Insights

```typescript
// Get financial health score
const healthScore = await SpendWiseAPI.analytics.getHealthScore();
console.log(`Financial Health: ${healthScore.score}/100`);

// Generate insights
const insights = await SpendWiseAPI.analytics.getInsights();
insights.forEach(insight => {
  console.log(`${insight.title}: ${insight.description}`);
});

// Get spending patterns
const patterns = await SpendWiseAPI.analytics.getSpendingPatterns();
```

### AI-Powered Features

```typescript
// Get AI insights
const context = await SpendWiseAPI.ai.prepareContext();
const aiInsights = await SpendWiseAPI.ai.getInsights(context);

// Chat with AI
const response = await SpendWiseAPI.ai.chat(
  "How can I reduce my food expenses?",
  context
);
```

### Data Export

```typescript
// Export all data
const exportResult = await SpendWiseAPI.export.transactions({
  format: 'csv',
  includeTransactions: true,
  includeBudgets: true,
  includeAnalytics: true
});

if (exportResult.success) {
  console.log(`Data exported to: ${exportResult.filePath}`);
}
```

## Error Handling

All services implement comprehensive error handling:

- **Validation**: Input validation with descriptive error messages
- **Graceful Degradation**: Fallback behavior for missing data
- **Logging**: Detailed error logging for debugging
- **User-Friendly Messages**: Clear error messages for UI display

## Performance Considerations

- **Lazy Loading**: Services load data on-demand
- **Caching**: Intelligent caching for frequently accessed data
- **Batch Operations**: Efficient bulk data operations
- **Memory Management**: Optimized for mobile device constraints

## Security Features

- **Local Storage**: All data stored locally on device
- **No External Dependencies**: No third-party data transmission
- **Data Validation**: Input sanitization and validation
- **Privacy First**: No personal data collection or tracking

## Future Enhancements

### Planned Features:
1. **Cloud Sync**: Optional cloud backup and sync
2. **Real Gemini AI**: Integration with Google's Gemini API
3. **Receipt Scanning**: OCR-based receipt processing
4. **Investment Tracking**: Portfolio and investment management
5. **Multi-Currency**: Support for multiple currencies
6. **Collaborative Budgets**: Shared budgets for families/couples
7. **Advanced Analytics**: Machine learning-based predictions
8. **Integration APIs**: Bank account and credit card integrations

## Conclusion

The SpendWise API provides a comprehensive, well-structured foundation for personal finance management. With its modular architecture, extensive feature set, and focus on user privacy and performance, it offers everything needed for a complete financial management application.

The APIs are designed to be:
- **Developer-friendly**: Clear interfaces and comprehensive documentation
- **Extensible**: Easy to add new features and functionality
- **Performant**: Optimized for mobile devices and offline usage
- **Reliable**: Robust error handling and data validation
- **Privacy-focused**: Local-first approach with no external data transmission

For implementation details and specific function signatures, refer to the individual service files in the `app/services/` directory.

