// Currency + date formatting. Pure functions — no app state.

export const CURRENCIES = { GBP: '£', USD: '$', EUR: '€', AUD: 'A$', CAD: 'C$' };

// Currency with 2 decimals, e.g. £1,234.50
export function fmt(n, cur = 'GBP') {
  const sym = CURRENCIES[cur] || '£';
  return sym + (n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Currency rounded to whole units, e.g. £1,235
export function fmt0(n, cur = 'GBP') {
  const sym = CURRENCIES[cur] || '£';
  return sym + Math.round(n || 0).toLocaleString('en-GB');
}

// Friendly date, e.g. 30 Apr 2026
export function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// HTML-escape. JSX escapes automatically, but this is handy for any raw-string
// contexts (e.g. building share messages or PDF-adjacent text).
export function esc(s) {
  return (s || '').toString().replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
}
