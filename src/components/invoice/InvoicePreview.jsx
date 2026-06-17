import { computeTotals } from '../../lib/calculations.js';
import { fmt, fmtDate } from '../../lib/formatters.js';

// The bold editorial quote/invoice card. Shared by the editor live preview,
// the document detail view, and the public client view.
// props:
//   doc      — { type, number, clientName, clientEmail, project, issueDate,
//                dueDate, currency, tax, taxLabel, lines, notes, hideItemPricing, status }
//   business — { name, email, logo, payment }
//   totals   — optional precomputed { sub, tax, grand }; computed if omitted
//   variant  — 'editor' shows the live-preview meta header; default = full doc
export default function InvoicePreview({ doc, business = {}, totals, variant }) {
  const t = totals || computeTotals(doc);
  const isQuote = doc.type === 'quote';
  const paid = doc.status === 'paid';
  const taxLabel = `${doc.taxLabel} (${doc.tax}%)`;
  const hide = !!doc.hideItemPricing;

  return (
    <div className="doc-preview">
      {paid && <div className="paid-stamp">PAID</div>}
      <div className="doc-head">
        <div>
          <div className="doc-type">{isQuote ? 'Quotation' : 'Invoice'}<em>.</em></div>
          <div className="doc-num">#{doc.number}</div>
        </div>
        <div className="doc-brand">
          {business.logo
            ? <img className="doc-brand-logo" src={business.logo} alt="Logo" />
            : <div className="logo-mini"><span className="doc-brand-dot" />invoiced<em>.</em></div>}
          <div className="doc-brand-name">{business.name}</div>
          {business.email && <div className="doc-brand-name">{business.email}</div>}
        </div>
      </div>

      <div className="doc-meta">
        <div>
          <h4>Billed to</h4>
          <p>{doc.clientName || '—'}</p>
          <p style={{ color: 'var(--muted)' }}>{doc.clientEmail}</p>
        </div>
        {variant === 'editor' ? (
          <div>
            <h4>{isQuote ? 'Project · Issued · Valid until' : 'Project · Issued · Due'}</h4>
            <p>{doc.project || '—'}</p>
            <p style={{ color: 'var(--muted)' }}>{fmtDate(doc.issueDate)} → {fmtDate(doc.dueDate)}</p>
          </div>
        ) : (
          <div>
            <h4>{doc.project}</h4>
            <p style={{ color: 'var(--muted)' }}>Issued {fmtDate(doc.issueDate)}</p>
            <p style={{ color: 'var(--muted)' }}>{isQuote ? 'Valid until' : 'Due'} {fmtDate(doc.dueDate)}</p>
          </div>
        )}
      </div>

      <table className="doc-table">
        <thead>
          {hide
            ? <tr><th>Description</th></tr>
            : <tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>}
        </thead>
        <tbody>
          {(doc.lines || []).map((l, i) => hide ? (
            <tr key={i}><td className="desc-cell"><strong>{l.desc || '—'}</strong></td></tr>
          ) : (
            <tr key={i}>
              <td className="desc-cell"><strong>{l.desc || '—'}</strong></td>
              <td>{l.qty}</td>
              <td className="price-cell">{fmt(l.rate, doc.currency)}</td>
              <td className="price-cell">{fmt((parseFloat(l.qty) || 0) * (parseFloat(l.rate) || 0), doc.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="doc-totals">
        {!hide && (
          <>
            <div className="doc-totals-row"><span>Subtotal</span><span>{fmt(t.sub, doc.currency)}</span></div>
            <div className="doc-totals-row"><span>{taxLabel}</span><span>{fmt(t.tax, doc.currency)}</span></div>
          </>
        )}
        <div className="doc-totals-row grand"><span>Total</span><span>{fmt(t.grand, doc.currency)}</span></div>
      </div>

      {doc.notes && <div className="doc-footer">{doc.notes}</div>}
      {variant !== 'editor' && !isQuote && business.payment && (
        <div className="doc-footer"><strong>Payment details</strong><br />{business.payment}</div>
      )}
    </div>
  );
}
