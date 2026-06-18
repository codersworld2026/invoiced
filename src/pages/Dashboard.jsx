import { useApp } from '../store/AppContext.jsx';
import { computeTotals } from '../lib/calculations.js';
import { fmt0 } from '../lib/formatters.js';

function statusDesc(d) {
  if (d.type === 'quote') {
    if (d.status === 'draft') return 'Not sent yet';
    if (d.status === 'sent') return 'Awaiting response';
    if (d.status === 'accepted') return 'Accepted — ready to invoice';
    if (d.status === 'converted') return 'Converted to invoice';
    if (d.status === 'declined') return 'Declined';
  } else {
    if (d.status === 'draft') return 'Not sent yet';
    if (d.status === 'sent') return 'Awaiting payment';
    if (d.status === 'paid') return 'Paid in full';
    if (d.status === 'overdue') return 'Payment overdue';
  }
  return '';
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'quote', label: 'Quotes' },
  { key: 'invoice', label: 'Invoices' },
  { key: 'paid', label: 'Paid' },
  { key: 'unpaid', label: 'Unpaid / Draft' },
];

export default function Dashboard() {
  const { settings, docs, clients, navigate, newDoc, openDoc, duplicateDoc, removeDoc, dashFilter: filter, setDashFilter: setFilter } = useApp();

  const bizDone = !!(settings.business && settings.business !== 'Your Business');
  const first = bizDone ? settings.business.split(' ')[0] + ',' : '';
  const firstRun = docs.length === 0;
  const steps = [
    { n: 1, done: bizDone, title: 'Set up your business', desc: 'Add your name, logo and payment details so every document looks like you.', cta: 'Open settings', action: () => navigate('settings') },
    { n: 2, done: clients.length > 0, title: 'Add your first client', desc: 'Save a client once, then reuse them on every quote and invoice.', cta: 'Add a client', action: () => navigate('clients') },
    { n: 3, done: false, title: 'Send your first quote', desc: 'Build a quote in under a minute and share a link your client can accept.', cta: '+ New quote', action: () => newDoc('quote') },
  ];

  // ---- stats ----
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const unpaid = docs.filter((d) => d.type === 'invoice' && d.status !== 'paid');
  const outstanding = unpaid.reduce((s, d) => s + computeTotals(d).grand, 0);
  const paidInvoices = docs.filter((d) => d.type === 'invoice' && d.status === 'paid');
  const paidThisMonthList = paidInvoices.filter((d) => d.paidAt >= monthStart.getTime());
  const paidThisMonth = paidThisMonthList.reduce((s, d) => s + computeTotals(d).grand, 0);
  const pendingQuotes = docs.filter((d) => d.type === 'quote' && (d.status === 'sent' || d.status === 'draft'));
  const pendingValue = pendingQuotes.reduce((s, d) => s + computeTotals(d).grand, 0);
  const avgDays = paidInvoices.length
    ? Math.round(paidInvoices.reduce((s, d) => s + ((d.paidAt - d.createdAt) / 86400000), 0) / paidInvoices.length)
    : 0;

  // ---- filtered list ----
  let list = [...docs].sort((a, b) => b.createdAt - a.createdAt);
  if (filter === 'quote') list = list.filter((d) => d.type === 'quote');
  else if (filter === 'invoice') list = list.filter((d) => d.type === 'invoice');
  else if (filter === 'paid') list = list.filter((d) => d.status === 'paid');
  // Unpaid/Draft = anything still needing action: any draft, or an unpaid invoice.
  else if (filter === 'unpaid') list = list.filter((d) => d.status === 'draft' || (d.type === 'invoice' && (d.status === 'sent' || d.status === 'overdue')));

  return (
    <section className="screen active" id="dash">
      <div className="dash">
        <div className="dash-head">
          <h2>Hey {first}<br />here's <em>where you stand.</em></h2>
          <div className="dash-head-actions">
            <button className="btn btn-primary" onClick={() => newDoc('quote')}>+ New Quote</button>
            <button className="btn btn-accent" onClick={() => newDoc('invoice')}>+ New Invoice</button>
          </div>
        </div>

        <div className="stats">
          <div className="stat"><div className="stat-label">Outstanding</div><div className="stat-value">{fmt0(outstanding, settings.currency)}</div><div className="stat-sub">{unpaid.length} unpaid</div></div>
          <div className="stat"><div className="stat-label">Paid this month</div><div className="stat-value">{fmt0(paidThisMonth, settings.currency)}</div><div className="stat-sub">{paidThisMonthList.length} invoices</div></div>
          <div className="stat"><div className="stat-label">Pending quotes</div><div className="stat-value">{pendingQuotes.length}</div><div className="stat-sub">{fmt0(pendingValue, settings.currency)} in pipeline</div></div>
          <div className="stat"><div className="stat-label">Avg pay time</div><div className="stat-value">{avgDays}d</div><div className="stat-sub">{paidInvoices.length} paid invoices</div></div>
        </div>

        {firstRun ? (
          <div className="onboard">
            <div className="onboard-head">
              <h3>Let's get you set up.</h3>
              <p>Three quick steps to your first paid invoice.</p>
            </div>
            {steps.map((s) => (
              <div className={`onboard-step${s.done ? ' done' : ''}`} key={s.n}>
                <div className="onboard-step-num">{s.done ? '✓' : s.n}</div>
                <div className="onboard-step-body">
                  <h4>{s.title}</h4>
                  <p>{s.desc}</p>
                </div>
                <button
                  className={`btn btn-sm ${s.done ? 'btn-ghost' : s.n === 3 ? 'btn-accent' : 'btn-primary'}`}
                  onClick={s.action}
                >
                  {s.done ? 'Edit' : s.cta}
                </button>
              </div>
            ))}
          </div>
        ) : (
        <div className="table-wrap">
          <div className="table-head">
            <h3>All documents</h3>
            <div className="filter-row">
              {FILTERS.map((f) => (
                <button key={f.key} className={`filter-chip${filter === f.key ? ' active' : ''}`} onClick={() => setFilter(f.key)}>{f.label}</button>
              ))}
            </div>
          </div>

          {list.length === 0 ? (
            <div className="empty">
              <h4>Nothing here yet</h4>
              <p>Create your first {filter === 'invoice' ? 'invoice' : filter === 'all' ? 'quote' : filter} to see it listed.</p>
              {filter === 'invoice'
                ? <button className="btn btn-accent btn-sm" onClick={() => newDoc('invoice')}>+ New Invoice</button>
                : <button className="btn btn-primary btn-sm" onClick={() => newDoc('quote')}>+ New Quote</button>}
            </div>
          ) : (
            list.map((d) => {
              const totals = computeTotals(d);
              const daysAgo = Math.floor((Date.now() - d.createdAt) / 86400000);
              const dateLabel = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : daysAgo + 'd ago';
              return (
                <div className="doc-row" key={d.id} onClick={() => openDoc(d.id)}>
                  <div className="num">{d.number}</div>
                  <div>
                    <div className="client">{d.clientName}<span className={`type-tag ${d.type}`}>{d.type}</span></div>
                    <div className="desc">{d.project}</div>
                  </div>
                  <div className="desc">{statusDesc(d)}</div>
                  <div className="amt">{fmt0(totals.grand, d.currency)}</div>
                  <div className={`status-pill status-${d.status}`}>{d.status}</div>
                  <div className="row-date">{dateLabel}</div>
                  <div className="row-actions">
                    <button className="icon-btn" onClick={(e) => { e.stopPropagation(); duplicateDoc(d.id); }} title="Duplicate">⎘</button>
                    <button className="icon-btn icon-btn-danger" onClick={(e) => { e.stopPropagation(); removeDoc(d.id); }} title="Delete">✕</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        )}
      </div>
    </section>
  );
}
