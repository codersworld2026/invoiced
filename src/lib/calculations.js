// Money + aging calculations. Pure functions — no app state.

// Subtotal, tax, grand total, line costs and gross profit for a document.
export function computeTotals(doc) {
  const lines = doc.lines || [];
  const sub = lines.reduce((s, l) => s + (parseFloat(l.qty) || 0) * (parseFloat(l.rate) || 0), 0);
  const tax = sub * (parseFloat(doc.tax) || 0) / 100;
  const lineCosts = lines.reduce((s, l) => s + (parseFloat(l.cost) || 0) * (parseFloat(l.qty) || 0), 0);
  return { sub, tax, grand: sub + tax, lineCosts, profit: sub - lineCosts };
}

export function daysBetween(d1, d2) {
  return Math.floor((new Date(d2) - new Date(d1)) / 86400000);
}

// Days a document is past its due date (negative = not due yet).
export function getAge(doc) {
  return daysBetween(doc.dueDate, new Date().toISOString().slice(0, 10));
}

// Aging bucket used by the Outstanding view.
export function ageBucket(age) {
  if (age < 1) return 'current';
  if (age <= 30) return '30';
  if (age <= 60) return '60';
  return '90';
}
