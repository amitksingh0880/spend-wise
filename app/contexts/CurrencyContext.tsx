import { getCurrency } from '@/app/services/preferencesService';
import { Currency, formatCurrency } from '@/app/utils/currency';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface CurrencyContextType {
  currency: Currency;
  formatAmount: (amount: number) => string;
  refreshCurrency: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

interface CurrencyProviderProps {
  children: React.ReactNode;
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ children }) => {
  const [currency, setCurrency] = useState<Currency>('USD');

  const loadCurrency = async () => {
    try {
      const savedCurrency = await getCurrency();
      setCurrency(savedCurrency);
    } catch (error) {
      console.error('Error loading currency:', error);
    }
  };

  const refreshCurrency = async () => {
    await loadCurrency();
  };

  const formatAmount = (amount: number): string => {
    return formatCurrency(amount, currency);
  };

  useEffect(() => {
    loadCurrency();
  }, []);

  return (
    <CurrencyContext.Provider value={{ currency, formatAmount, refreshCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
};