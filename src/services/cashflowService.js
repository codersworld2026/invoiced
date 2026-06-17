import { sb } from '../lib/supabase.js';

export function rowToCashflow(r) {
  return {
    id: r.id,
    date: r.date || new Date().toISOString().slice(0, 10),
    amount: parseFloat(r.amount) || 0,
    desc: r.description || '',
    notes: r.notes || '',
  };
}

export function cashflowToRow(c, userId) {
  return {
    id: c.id,
    user_id: userId,
    date: c.date,
    amount: c.amount,
    description: c.desc,
    notes: c.notes || null,
  };
}

export async function listCashflow() {
  const { data, error } = await sb.from('cashflow').select('*').order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToCashflow);
}

export async function upsertCashflow(c, userId) {
  const { error } = await sb.from('cashflow').upsert(cashflowToRow(c, userId));
  if (error) throw error;
}

export async function deleteCashflow(id) {
  const { error } = await sb.from('cashflow').delete().eq('id', id);
  if (error) throw error;
}
