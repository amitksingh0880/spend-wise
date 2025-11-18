export type Currency = 'USD' | 'INR';

export interface CurrencyConfig {
  code: Currency;
  symbol: string;
  name: string;
}

export const CURRENCIES: Record<Currency, CurrencyConfig> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
  },
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
  },
};

export const formatCurrency = (amount: number, currency: Currency = 'USD'): string => {
  const config = CURRENCIES[currency];
  return `${config.symbol}${amount.toFixed(2)}`;
};

export const getCurrencySymbol = (currency: Currency = 'USD'): string => {
  return CURRENCIES[currency].symbol;
};

export const getCurrencyName = (currency: Currency = 'USD'): string => {
  return CURRENCIES[currency].name;
};