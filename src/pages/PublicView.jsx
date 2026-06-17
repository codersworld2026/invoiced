import { useState, useEffect, useCallback } from 'react';
import { getSharedDoc, respondToSharedDoc } from '../services/docsService.js';
import { computeTotals } from '../lib/calculations.js';
import { fmt, fmtDate } from '../lib/formatters.js';
import InvoicePreview from '../components/invoice/InvoicePreview.jsx';

function mapPublicDoc(r) {
  return {
    id: r.id, publicId: r.public_id, type: r.type, status: r.status,
    number: r.number || '', project: r.project || '',
    clientName: r.client_name || '', clientEmail: r.client_email || '',
    issueDate: r.issue_date || '', dueDate: r.due_date || '',
    acceptedAt: r.accepted_date ? new Date(r.accepted_date).getTime() : null,
    paidAt: r.paid_date ? new Date(r.paid_date).getTime() : null,
    lines: Array.isArray(r.lines) ? r.lines : [],
    notes: r.notes || '', currency: r.currency || 'GBP',
    tax: parseFloat(r.tax_rate) || 0, taxLabel: r.tax_label || 'VAT',
    hideItemPricing: !!r.hide_item_pricing,
    storedSub: r.subtotal != null ? parseFloat(r.subtotal) : null,
    storedTax: r.tax != null ? parseFloat(r.tax) : null,
    storedTotal: r.total != null ? parseFloat(r.total) : null,
    business: r.business_snapshot || {},
  };
}

const Banner = ({ number }) => (
  <div className="public-banner">
    <div className="logo"><span className="logo-dot" />invoiced<em>.</em></div>
    {number && <div className="public-banner-right"><span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, opacity: 0.7 }}>{number}</span></div>}
  </div>
);

export default function PublicView({ publicId }) {
  const [state, setState] = useState('loading'); // loading | ready | notfound
  const [doc, setDoc] = useState(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setState('loading');
    const { data, error } = await getSharedDoc(publicId);
    if (error || !data || !data.length) { setState('notfound'); return; }
    setDoc(mapPublicDoc(data[0]));
    setState('ready');
  }, [publicId]);

  useEffect(() => { load(); }, [load]);

  async function respond(action) {
    setNotice('');
    const { data, error } = await respondToSharedDoc(publicId, action);
    if (error || data !== 'ok') { setNotice(`Could not ${action} — please try again.`); return; }
    load();
  }

  if (state === 'loading') {
    return (
      <div className="public-view"><div className="public-wrap">
        <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>Loading…</div>
      </div></div>
    );
  }

  if (state === 'notfound') {
    return (
      <div className="public-view"><div className="public-wrap">
        <Banner />
        <div style={{ background: 'white', border: '1px solid var(--ink)', padding: '60px 24px', textAlign: 'center' }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, marginBottom: 10 }}>Document not found</h3>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>This link may have expired or the document was deleted.</p>
        </div>
      </div></div>
    );
  }

  const d = doc;
  const isQuote = d.type === 'quote';
  const paid = d.status === 'paid';
  const computed = computeTotals(d);
  const totals = {
    sub: d.storedSub != null ? d.storedSub : computed.sub,
    tax: d.storedTax != null ? d.storedTax : computed.tax,
    grand: d.storedTotal != null ? d.storedTotal : computed.grand,
  };
  const business = { name: d.business.name || '', email: d.business.email || '', logo: d.business.logo || '', payment: d.business.payment || '' };

  let actionBar = null;
  if (isQuote && (d.status === 'sent' || d.status === 'draft')) {
    actionBar = (
      <div className="public-action-bar">
        <p>Review the quote below — accept to proceed.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => respond('decline')}>Decline</button>
          <button className="btn btn-accent btn-sm" onClick={() => respond('accept')}>Accept quote →</button>
        </div>
      </div>
    );
  } else if (isQuote && d.status === 'accepted') {
    actionBar = <div className="public-action-bar success"><p>✓ You accepted this quote on {fmtDate(d.acceptedAt)}. Invoice to follow.</p></div>;
  } else if (isQuote && d.status === 'declined') {
    actionBar = <div className="public-action-bar" style={{ background: '#FEE2E2' }}><p>✕ This quote was declined.</p></div>;
  } else if (!isQuote && d.status !== 'paid') {
    actionBar = <div className="public-action-bar"><p>Invoice due {fmtDate(d.dueDate)} · {fmt(totals.grand, d.currency)}</p></div>;
  } else if (paid) {
    actionBar = <div className="public-action-bar success"><p>✓ Paid in full on {fmtDate(d.paidAt)}</p></div>;
  }

  return (
    <div className="public-view"><div className="public-wrap">
      <Banner number={d.number} />
      {actionBar}
      {notice && <div className="public-action-bar" style={{ background: '#FEE2E2' }}><p>{notice}</p></div>}
      <InvoicePreview doc={d} business={business} totals={totals} />
      <div style={{ textAlign: 'center', padding: 24, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase' }}>
        Powered by invoiced.
      </div>
    </div></div>
  );
}
