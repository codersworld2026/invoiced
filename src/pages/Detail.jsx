import { useApp } from '../store/AppContext.jsx';
import { computeTotals, getAge } from '../lib/calculations.js';
import { fmt0, fmtDate } from '../lib/formatters.js';
import InvoicePreview from '../components/invoice/InvoicePreview.jsx';

export default function Detail() {
  const {
    docs, currentDocId, settings, expenses, navigate,
    openDoc, editDoc, openShareModal, markPaid, simulateDecline, convertToInvoice, duplicateDoc, toast,
  } = useApp();
  const d = docs.find((x) => x.id === currentDocId);

  if (!d) {
    return (
      <section className="screen active" id="detail">
        <div className="doc-detail">
          <button className="detail-back" onClick={() => navigate('dash')}>← Back to dashboard</button>
          <div className="empty"><h4>Document not found</h4><p>It may have been deleted.</p></div>
        </div>
      </section>
    );
  }

  const t = computeTotals(d);
  const isQuote = d.type === 'quote';
  const editable = !['accepted', 'converted', 'paid'].includes(d.status);
  const business = { name: settings.business, email: settings.email, logo: settings.logo, payment: settings.payment };
  const linkedExp = expenses.filter((e) => e.docId === d.id);
  const linkedExpTotal = linkedExp.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const linkedInvoice = docs.find((x) => x.id === d.linkedInvoiceId);

  async function downloadPDF() {
    try { const { exportDocPDF } = await import('../lib/pdf.js'); exportDocPDF(d, settings); toast('PDF downloaded'); }
    catch (err) { toast('PDF failed: ' + (err.message || 'error')); }
  }

  function ActionBar() {
    if (isQuote && d.status === 'sent') {
      return (
        <div className="action-bar info">
          <p>⏱ Quote sent to <strong>{d.clientName}</strong> — awaiting response</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => editDoc(d.id)}>Edit quote</button>
            <button className="btn btn-ghost btn-sm" onClick={() => simulateDecline(d.id)}>Simulate decline</button>
            <button className="btn btn-accent btn-sm" onClick={() => convertToInvoice(d.id)}>Simulate accept →</button>
          </div>
        </div>
      );
    }
    if (isQuote && (d.status === 'accepted' || d.status === 'converted')) {
      return linkedInvoice ? (
        <div className="action-bar success">
          <p>✓ {d.status === 'converted' ? 'Converted' : 'Accepted'} {fmtDate(d.acceptedAt)} — invoice <strong>{linkedInvoice.number}</strong> issued</p>
          <button className="btn btn-primary btn-sm" onClick={() => openDoc(linkedInvoice.id)}>View invoice →</button>
        </div>
      ) : (
        <div className="action-bar success">
          <p>✓ Accepted {fmtDate(d.acceptedAt)} by your client — ready to invoice</p>
          <button className="btn btn-accent btn-sm" onClick={() => convertToInvoice(d.id)}>Convert to invoice →</button>
        </div>
      );
    }
    if (isQuote && d.status === 'declined') {
      return (
        <div className="action-bar" style={{ background: '#FEE2E2' }}>
          <p>✕ Declined by client</p>
          <button className="btn btn-ghost btn-sm" onClick={() => duplicateDoc(d.id)}>Duplicate &amp; revise</button>
        </div>
      );
    }
    if (!isQuote && d.status === 'sent') {
      return (
        <div className="action-bar">
          <p>⏱ Invoice sent — awaiting payment</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => editDoc(d.id)}>Edit invoice</button>
            <button className="btn btn-ghost btn-sm" onClick={() => openShareModal(d.id)}>Send reminder</button>
            <button className="btn btn-accent btn-sm" onClick={() => markPaid(d.id)}>Mark paid →</button>
          </div>
        </div>
      );
    }
    if (!isQuote && d.status === 'overdue') {
      return (
        <div className="action-bar" style={{ background: '#FEE2E2' }}>
          <p>⚠ Overdue — {getAge(d)} days past due</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => editDoc(d.id)}>Edit invoice</button>
            <button className="btn btn-ghost btn-sm" onClick={() => openShareModal(d.id)}>Send reminder</button>
            <button className="btn btn-accent btn-sm" onClick={() => markPaid(d.id)}>Mark paid →</button>
          </div>
        </div>
      );
    }
    if (!isQuote && d.status === 'paid') {
      return <div className="action-bar success"><p>✓ Paid in full on {fmtDate(d.paidAt)}</p></div>;
    }
    if (d.status === 'draft') {
      return (
        <div className="action-bar">
          <p>✎ Draft — not yet sent</p>
          <button className="btn btn-accent btn-sm" onClick={() => editDoc(d.id)}>Edit &amp; send</button>
        </div>
      );
    }
    return null;
  }

  const profit = t.sub - t.lineCosts - linkedExpTotal;

  return (
    <section className="screen active" id="detail">
      <div className="doc-detail">
        <div className="detail-head">
          <button className="detail-back" onClick={() => navigate('dash')}>← Back to dashboard</button>
          <div className="detail-actions">
            <button className="btn btn-accent btn-sm" onClick={() => openShareModal(d.id)}>✉ Send / Share</button>
            <button className="btn btn-ghost btn-sm" onClick={downloadPDF}>↓ PDF</button>
            {editable && <button className="btn btn-primary btn-sm" onClick={() => editDoc(d.id)}>Edit</button>}
          </div>
        </div>

        <ActionBar />

        <InvoicePreview doc={d} business={business} totals={t} />

        {!isQuote && (
          <div className="settings-card" style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: 20 }}>Profit on this job</h3>
            <p className="sub">Your private view — not shown on the invoice.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginTop: 12 }}>
              <div style={{ padding: 14, background: 'var(--paper)', border: '1px solid var(--rule)' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>Revenue</div>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 800 }}>{fmt0(t.sub, d.currency)}</div>
              </div>
              <div style={{ padding: 14, background: 'var(--paper)', border: '1px solid var(--rule)' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>Line costs</div>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>−{fmt0(t.lineCosts, d.currency)}</div>
              </div>
              <div style={{ padding: 14, background: 'var(--paper)', border: '1px solid var(--rule)' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>Expenses</div>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>−{fmt0(linkedExpTotal, d.currency)}</div>
              </div>
              <div style={{ padding: 14, background: profit >= 0 ? 'var(--green)' : 'var(--accent)', color: 'white' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, textTransform: 'uppercase', opacity: 0.7, fontWeight: 700 }}>Profit</div>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 800 }}>{fmt0(profit, d.currency)}</div>
              </div>
            </div>
            {linkedExp.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--rule)' }}>
                <div className="field-label" style={{ marginBottom: 10 }}>Linked expenses ({linkedExp.length})</div>
                {linkedExp.map((e) => (
                  <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                    <span>{e.desc} <span style={{ color: 'var(--muted)', fontSize: 11 }}>· {fmtDate(e.date)}</span></span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>−{fmt0(e.amount, d.currency)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
