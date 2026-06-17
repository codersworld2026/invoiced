import { sb } from '../lib/supabase.js';

export function rowToExpense(r) {
  return {
    id: r.id,
    date: r.date || new Date().toISOString().slice(0, 10),
    amount: parseFloat(r.amount) || 0,
    desc: r.description || '',
    category: r.category || 'other',
    docId: r.doc_id || null,
    notes: r.notes || '',
  };
}

export function expenseToRow(e, userId) {
  return {
    id: e.id,
    user_id: userId,
    doc_id: e.docId || null,
    description: e.desc,
    amount: e.amount,
    date: e.date,
    category: e.category,
    notes: e.notes || null,
  };
}

export async function listExpenses() {
  const { data, error } = await sb.from('expenses').select('*').order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToExpense);
}

export async function upsertExpense(e, userId) {
  const { error } = await sb.from('expenses').upsert(expenseToRow(e, userId));
  if (error) throw error;
}

export async function deleteExpense(id) {
  const { error } = await sb.from('expenses').delete().eq('id', id);
  if (error) throw error;
}
