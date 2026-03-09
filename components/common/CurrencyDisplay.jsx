"use client";

import { useBank } from '@/hooks/useBank';
import { formatCurrency } from '@/utils/currency';

export function CurrencyDisplay({ amount, className = '' }) {
  const { currencySymbol } = useBank();
  return <span className={className}>{formatCurrency(amount, currencySymbol)}</span>;
}
