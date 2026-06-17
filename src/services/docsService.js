import { sb } from '../lib/supabase.js';
import { computeTotals } from '../lib/calculations.js';

// ---- mappers: Supabase row <-> app model ----
export function rowToDoc(r) {
  return {
    id: r.id,
    publicId: r.public_id,
    type: r.type,
    status: r.status,
    number: r.number,
    clientName: r.client_name || r.client_snapshot?.name || '',
    clientEmail: r.client_email || r.client_snapshot?.email || '',
    project: r.project || '',
    issueDate: r.issue_date || '',
    dueDate: r.due_date || '',
    currency: r.currency || 'GBP',
    tax: parseFloat(r.tax_rate) || 0,
    taxLabel: r.tax_label || 'VAT',
    lines: Array.isArray(r.lines) ? r.lines : [],
    notes: r.notes || '',
    hideItemPricing: !!r.hide_item_pricing,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    acceptedAt: r.accepted_date ? new Date(r.accepted_date).getTime() : null,
    paidAt: r.paid_date ? new Date(r.paid_date).getTime() : null,
    linkedInvoiceId: r.linked_invoice_id || null,
  };
}

export function docToRow(d, userId, settings) {
  const totals = computeTotals(d);
  return {
    id: d.id,
    user_id: userId,
    public_id: d.publicId || null,
    type: d.type,
    status: d.status,
    number: d.number,
    project: d.project || null,
    client_name: d.clientName || null,
    client_email: d.clientEmail || null,
    issue_date: d.issueDate || null,
    due_date: d.dueDate || null,
    accepted_date: d.acceptedAt ? new Date(d.acceptedAt).toISOString().slice(0, 10) : null,
    paid_date: d.paidAt ? new Date(d.paidAt).toISOString().slice(0, 10) : null,
    lines: d.lines || [],
    notes: d.notes || null,
    hide_item_pricing: !!d.hideItemPricing,
    currency: d.currency || 'GBP',
    tax_rate: d.tax || 0,
    tax_label: d.taxLabel || 'VAT',
    subtotal: totals.sub,
    tax: totals.tax,
    total: totals.grand,
    business_snapshot: {
      name: settings.business,
      email: settings.email,
      phone: settings.phone,
      address: settings.address,
      tax_id: settings.taxId,
      logo: settings.logo,
      payment: settings.payment,
    },
    client_snapshot: { name: d.clientName, email: d.clientEmail },
    linked_invoice_id: d.linkedInvoiceId || null,
  };
}

// ---- CRUD ----
export async function listDocs() {
  const { data, error } = await sb.from('docs').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToDoc);
}

export async function upsertDoc(doc, userId, settings) {
  const { error } = await sb.from('docs').upsert(docToRow(doc, userId, settings));
  if (error) throw error;
}

export async function deleteDoc(id) {
  const { error } = await sb.from('docs').delete().eq('id', id);
  if (error) throw error;
}

// ---- public share RPCs (anon-safe) ----
export async function getSharedDoc(publicId) {
  return sb.rpc('get_shared_doc', { p_public_id: publicId });
}

export async function respondToSharedDoc(publicId, action) {
  return sb.rpc('respond_to_shared_doc', { p_public_id: publicId, p_action: action });
}

// ---- line templates (saved line items used by the editor) ----
export function rowToTemplate(r) {
  return { id: r.id, desc: r.description || '', rate: parseFloat(r.rate) || 0, cost: parseFloat(r.cost) || 0 };
}
export function templateToRow(t, userId) {
  return { id: t.id, user_id: userId, description: t.desc, rate: t.rate || 0, cost: t.cost || 0 };
}
export async function listTemplates() {
  const { data, error } = await sb.from('line_templates').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToTemplate);
}
export async function upsertTemplate(t, userId) {
  const { error } = await sb.from('line_templates').upsert(templateToRow(t, userId));
  if (error) throw error;
}
export async function deleteTemplate(id) {
  const { error } = await sb.from('line_templates').delete().eq('id', id);
  if (error) throw error;
}
