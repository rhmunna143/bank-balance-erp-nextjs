export function formatCurrency(amount, symbol = '৳') {
  const num = parseFloat(amount);
  if (isNaN(num)) return `${symbol}0.00`;
  return `${symbol}${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function parseCurrencyInput(value) {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
