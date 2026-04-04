// AI Service for SpendWise - Groq AI Integration
// This service provides AI-powered financial insights and assistance using Groq

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const GROQ_API_URL = process.env.EXPO_PUBLIC_GROQ_API_URL || "https://api.groq.com/openai/v1/chat/completions";
const MODEL_NAME = process.env.EXPO_PUBLIC_GROQ_MODEL_NAME || "llama-3-8b-8192";

export interface AIInsight {
  id: string;
  type: 'spending_advice' | 'budget_suggestion' | 'saving_tip' | 'trend_analysis' | 'goal_recommendation';
  title: string;
  content: string;
  confidence: number;
  actionable: boolean;
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  context?: any;
}

export interface FinancialContext {
  totalIncome: number;
  totalExpenses: number;
  topCategories: { category: string; amount: number }[];
  budgetStatus: { category: string; spent: number; budget: number }[];
  recentTransactions: any[];
  savingsRate: number;
  monthlyTrend: 'increasing' | 'decreasing' | 'stable';
}

/**
 * Interface with Groq API
 */
const callGroqAPI = async (messages: { role: string; content: string }[]): Promise<string> => {
  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Groq API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Groq API Call Failed:", error);
    throw error;
  }
};

export interface AINotificationContent {
  title: string;
  body: string;
}

/**
 * Generate a humorous, interactive notification about a financial event using Groq AI.
 * The prompt is strictly limited to financial topics — the AI is instructed to refuse
 * any non-financial content. Returns a funny, engaging title + body for a mobile push notification.
 *
 * @param event A short description of the financial event (e.g., "spent 500 on Swiggy")
 * @param context Optional user financial summary to make the message more personal
 */
export const generateHumorousNotification = async (
  event: string,
  context?: Partial<FinancialContext>
): Promise<AINotificationContent> => {
  const FALLBACKS: AINotificationContent[] = [
    { title: "💸 Money Alert!", body: "Your wallet just had a heart attack. Tap to check the damage." },
    { title: "🤑 Transaction Detected", body: "Your bank account is judging you. We're just the messenger." },
    { title: "📊 SpendWise Update", body: "Your money left faster than Monday motivation. Check your expenses!" },
  ];

  try {
    const contextStr = context
      ? `User's financial snapshot: monthly income ₹${context.totalIncome ?? '?'}, expenses ₹${context.totalExpenses ?? '?'}, savings rate ${((context.savingsRate ?? 0) * 100).toFixed(0)}%.`
      : '';

    const prompt = `
You are the witty, slightly sarcastic AI brain of a personal finance app called SpendWise.
Your ONLY job is to write hilarious, short mobile push notifications about financial events.

IMPORTANT RULES:
- ONLY respond to financial topics (spending, saving, budgets, transactions, income, debt, EMIs).
- If the event is not financial, respond with: {"title":"💰 Stay On Budget!","body":"SpendWise keeps it strictly financial 😄"}
- Keep the title under 8 words and body under 20 words.
- Be funny, engaging, and slightly dramatic — like a financial sitcom.
- Return ONLY valid JSON: {"title":"...","body":"..."}

${contextStr}
Event: "${event}"
    `.trim();

    const raw = await callGroqAPI([
      { role: "system", content: "You are a witty financial notification writer. Always return JSON only." },
      { role: "user", content: prompt }
    ]);

    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*"title"[\s\S]*"body"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.title && parsed.body) return parsed as AINotificationContent;
    }

    throw new Error("Could not parse notification JSON from AI response.");
  } catch (err) {
    console.warn("[AI Notification] Falling back to static message.", err);
    return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
  }
};

// AI Service Functions
export const getFinancialInsights = async (context: FinancialContext): Promise<AIInsight[]> => {
  try {
    const prompt = `
      As a financial advisor for "SpendWise", analyze this data and provide 3-4 distinct actionable insights.
      Context:
      - Income: ${context.totalIncome}
      - Expenses: ${context.totalExpenses}
      - Top Categories: ${context.topCategories.map(c => `${c.category}: ${c.amount}`).join(", ")}
      - Budget Status: ${context.budgetStatus.map(b => `${b.category}: ${b.spent}/${b.budget}`).join(", ")}
      - Savings Rate: ${(context.savingsRate * 100).toFixed(1)}%

      Return a JSON array of insights with fields: type (one of the enum values), title, content, confidence (0-1), priority (high/medium/low).
      Enum types: 'spending_advice', 'budget_suggestion', 'saving_tip', 'trend_analysis', 'goal_recommendation'.
    `;

    const response = await callGroqAPI([
      { role: "system", content: "You are a concise financial analyst. Return only JSON." },
      { role: "user", content: prompt }
    ]);

    // Simple JSON extraction in case AI adds markdown
    const jsonStr = response.includes("[") ? response.substring(response.indexOf("["), response.lastIndexOf("]") + 1) : response;
    const parsedInsights = JSON.parse(jsonStr);

    return parsedInsights.map((insight: any, index: number) => ({
      ...insight,
      id: `insight-${Date.now()}-${index}`,
      actionable: true,
      createdAt: new Date().toISOString()
    }));
  } catch (error) {
    console.error("Failed to get insights from Groq, falling back to rule-based:", error);
    return getRuleBasedInsights(context);
  }
};

const getRuleBasedInsights = (context: FinancialContext): AIInsight[] => {
  const insights: AIInsight[] = [];
  if (context.totalExpenses > context.totalIncome * 0.8) {
    insights.push({
      id: `insight-${Date.now()}-1`,
      type: 'spending_advice',
      title: 'High Spending Alert',
      content: `You're spending ${((context.totalExpenses / context.totalIncome) * 100).toFixed(1)}% of your income. Consider reducing expenses.`,
      confidence: 0.9,
      actionable: true,
      priority: 'high',
      createdAt: new Date().toISOString()
    });
  }
  return insights;
};

export const chatWithAI = async (message: string, context: FinancialContext): Promise<string> => {
  try {
    const systemPrompt = `
      You are the SpendWise AI assistant. You help users manage money.
      User Data:
      - Income: ${context.totalIncome}
      - Expenses: ${context.totalExpenses}
      - Monthly Savings Rate: ${(context.savingsRate * 100).toFixed(1)}%
      - Top spending: ${context.topCategories.slice(0, 3).map(c => c.category).join(", ")}
      Be concise, helpful, and encouraging.
    `;

    return await callGroqAPI([
      { role: "system", content: systemPrompt },
      { role: "user", content: message }
    ]);
  } catch (error) {
    return "I'm having trouble connecting to my brain right now. Please try again later!";
  }
};

export const prepareFinancialContext = async (): Promise<FinancialContext> => {
  const { getAllTransactions, getTransactionSummary, getTopCategories } = await import('./transactionService');
  const { getAllBudgets } = await import('./budgetService');
  
  const [transactions, summary, topCategories, budgets] = await Promise.all([
    getAllTransactions(),
    getTransactionSummary(),
    getTopCategories(5),
    getAllBudgets()
  ]);
  
  const budgetStatus = budgets.map(budget => ({
    category: budget.category,
    spent: budget.spent,
    budget: budget.amount
  }));
  
  return {
    totalIncome: summary.totalIncome,
    totalExpenses: summary.totalExpenses,
    topCategories: topCategories.map(cat => ({ category: cat.category, amount: cat.amount })),
    budgetStatus,
    recentTransactions: transactions.slice(0, 10),
    savingsRate: summary.totalIncome > 0 ? (summary.totalIncome - summary.totalExpenses) / summary.totalIncome : 0,
    monthlyTrend: 'stable'
  };
};

export const generateSpendingInsights = async (context: FinancialContext): Promise<string[]> => {
  const insights = await getFinancialInsights(context);
  return insights.map(i => i.content);
};

export const suggestBudgetOptimizations = async (context: FinancialContext): Promise<string[]> => {
  const res = await chatWithAI("Give me 3 specific budget optimization tips based on my data.", context);
  return res.split("\n").filter(line => line.trim().length > 0);
};

export const generateSavingRecommendations = async (context: FinancialContext): Promise<string[]> => {
  const res = await chatWithAI("Give me 3 recommendations to save more money this month.", context);
  return res.split("\n").filter(line => line.trim().length > 0);
};

export const callGeminiAPI = callGroqAPI; // Aliased for compatibility
