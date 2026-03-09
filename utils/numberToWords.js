const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertGroup(n) {
  if (n === 0) return '';
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
  return ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertGroup(n % 100) : '');
}

/**
 * Convert a number to English words.
 * Returns empty string for invalid/zero/NaN input.
 * Supports up to 999,999,999,999 (billions).
 * Includes decimal part as "Point XX" or "and XX Paisa".
 */
export function numberToWords(value) {
  if (value === '' || value === null || value === undefined) return '';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || num === 0) return '';

  const absNum = Math.abs(num);
  const intPart = Math.floor(absNum);
  const decPart = Math.round((absNum - intPart) * 100);

  if (intPart === 0 && decPart === 0) return '';

  const groups = [
    { divisor: 1_000_000_000, label: 'Billion' },
    { divisor: 1_000_000, label: 'Million' },
    { divisor: 1_000, label: 'Thousand' },
    { divisor: 1, label: '' },
  ];

  let words = '';
  let remaining = intPart;

  for (const { divisor, label } of groups) {
    const count = Math.floor(remaining / divisor);
    if (count > 0) {
      words += (words ? ' ' : '') + convertGroup(count) + (label ? ' ' + label : '');
      remaining %= divisor;
    }
  }

  if (!words && intPart === 0) {
    words = 'Zero';
  }

  if (decPart > 0) {
    words += ' Point ' + convertGroup(decPart);
  }

  const prefix = num < 0 ? 'Minus ' : '';
  return prefix + words + ' Taka Only';
}
