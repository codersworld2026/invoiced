import { sb } from '../lib/supabase.js';

export function rowToClient(r) {
  return { id: r.id, name: r.name || '', email: r.email || '', address: r.address || '' };
}

export function clientToRow(c, userId) {
  return { id: c.id, user_id: userId, name: c.name, email: c.email || null, address: c.address || null };
}

export async function listClients() {
  const { data, error } = await sb.from('clients').select('*').order('name');
  if (error) throw error;
  return (data || []).map(rowToClient);
}

export async function upsertClient(c, userId) {
  const { error } = await sb.from('clients').upsert(clientToRow(c, userId));
  if (error) throw error;
}

export async function deleteClient(id) {
  const { error } = await sb.from('clients').delete().eq('id', id);
  if (error) throw error;
}
