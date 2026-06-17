import { sb } from '../lib/supabase.js';

export const DEFAULT_SETTINGS = {
  business: 'Your Business', email: '', phone: '', taxId: '', address: '', logo: '',
  currency: 'GBP', tax: 20, taxLabel: 'VAT',
  notes: 'Payment within 14 days. Thanks for your business.',
  payment: '',
};
export const DEFAULT_COUNTERS = { quote: 481, invoice: 121 };

export function rowToSettings(r) {
  return {
    business: r.business_name || 'Your Business',
    email: r.business_email || '',
    phone: r.business_phone || '',
    taxId: r.tax_id || '',
    address: r.business_address || '',
    logo: r.business_logo || '',
    currency: r.currency || 'GBP',
    tax: parseFloat(r.tax_rate) || 20,
    taxLabel: r.tax_label || 'VAT',
    notes: r.default_notes || 'Payment within 14 days. Thanks for your business.',
    payment: r.bank_details || '',
  };
}

export function settingsToRow(s, counters, userId) {
  return {
    id: userId,
    business_name: s.business || 'Your Business',
    business_email: s.email || null,
    business_phone: s.phone || null,
    business_address: s.address || null,
    tax_id: s.taxId || null,
    business_logo: s.logo || null,
    bank_details: s.payment || null,
    currency: s.currency || 'GBP',
    tax_rate: s.tax || 0,
    tax_label: s.taxLabel || 'VAT',
    default_notes: s.notes || null,
    quote_counter: counters?.quote ?? DEFAULT_COUNTERS.quote,
    invoice_counter: counters?.invoice ?? DEFAULT_COUNTERS.invoice,
  };
}

// Load the profile row, or create one on first login. Returns { settings, counters }.
export async function loadProfile(userId, fallbackSettings = DEFAULT_SETTINGS, fallbackCounters = DEFAULT_COUNTERS) {
  const { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (data) {
    return {
      settings: rowToSettings(data),
      counters: { quote: data.quote_counter ?? DEFAULT_COUNTERS.quote, invoice: data.invoice_counter ?? DEFAULT_COUNTERS.invoice },
    };
  }
  // First login — insert a profile row so counters persist.
  const { data: created, error: insErr } = await sb
    .from('profiles')
    .insert(settingsToRow(fallbackSettings, fallbackCounters, userId))
    .select()
    .single();
  if (insErr) throw insErr;
  return {
    settings: rowToSettings(created),
    counters: { quote: created.quote_counter, invoice: created.invoice_counter },
  };
}

export async function saveSettings(s, counters, userId) {
  const { error } = await sb.from('profiles').upsert(settingsToRow(s, counters, userId));
  if (error) throw error;
}

export async function saveCounters(counters, userId) {
  const { error } = await sb.from('profiles')
    .update({ quote_counter: counters.quote, invoice_counter: counters.invoice })
    .eq('id', userId);
  if (error) throw error;
}
