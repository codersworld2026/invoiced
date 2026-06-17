import { useState } from 'react';
import { useApp } from '../store/AppContext.jsx';
import { computeTotals, getAge, ageBucket } from '../lib/calculations.js';
import { fmt0, fmtDate } from '../lib/formatters.js';

const AGE_FILTERS = [
  { key: 'all', label: 'All ages' },
  { key: 'current', label: 'Current' },
  { key: '30', label: '31–60' },
  { key: '60', label: '61–90' },
  { key: '90', label: '90+' },
];

export default function Outstanding() {
  const { docs, settings, navigate, openDoc, setDashFilter, toast } = useApp();
  const [ageFilter, setAgeFilter] = useState('all');
  const cur = settings.currency;

  const outstanding = docs.filter((d) => d.type === 'invoice' && d.status !== 'paid');

  // aging buckets
  const buckets = {
    current: { label: 'Not due yet', total: 0, count: 0, cls: 'aging-0' },
    '30': { label: '1–30 days', total: 0, count: 0, cls: 'aging-30' },
    '60': { label: '31–60 days', total: 0, count: 0, cls: 'aging-60' },
    '90': { label: '61–90 days', total: 0, count: 0, cls: 'aging-90' },
    '90plus': { label: '90+ days', total: 0, count: 0, cls: 'aging-90' },
  };
  outstanding.forEach((d) => {
    const age = getAge(d); const total = computeTotals(d).grand;
    if (age < 1) { buckets.current.total += total; buckets.current.count++; }
    else if (age <= 30) { buckets['30'].total += total; buckets['30'].count++; }
    else if (age <= 60) { buckets['60'].total += total; buckets['60'].count++; }
    else if (age <= 90) { buckets['90'].total += total; buckets['90'].count++; }
    else { buckets['90plus'].total += total; buckets['90plus'].count++; }
  });

  const totalOutstanding = outstanding.reduce((s, d) => s + computeTotals(d).grand, 0);
  const overdueTotal = buckets['30'].total + buckets['60'].total + buckets['90'].total + buckets['90plus'].total;
  const overdueCount = buckets['30'].count + buckets['60'].count + buckets['90'].count + buckets['90plus'].count;
  const oldestAge = outstanding.length ? Math.max(0, ...outstanding.map((d) => getAge(d))) : 0;
  const maxBucket = Math.max(1, ...Object.values(buckets).map((b) => b.total));
  const order = ['current', '30', '60', '90', '90plus'];

  // by client
  const byClient = {};
  outstanding.forEach((d) => {
    const key = d.clientName;
    if (!byClient[key]) byClient[key] = { name: key, total: 0, count: 0, oldest: 0 };
    byClient[key].total += computeTotals(d).grand;
    byClient[key].count++;
    byClient[key].oldest = Math.max(byClient[key].oldest, getAge(d));
  });
  const sortedClients = Object.values(byClient).sort((a, b) => b.total - a.total);
  const maxClient = Math.max(1, ...sortedClients.map((c) => c.total));

  // table
  let rows = outstanding.map((d) => ({ ...d, age: getAge(d), total: computeTotals(d).grand })).sort((a, b) => b.age - a.age);
  if (ageFilter === 'current') rows = rows.filter((d) => d.age < 1);
  else if (ageFilter === '30') rows = rows.filter((d) => d.age > 30 && d.age <= 60);
  else if (ageFilter === '60') rows = rows.filter((d) => d.age > 60 && d.age <= 90);
  else if (ageFilter === '90') rows = rows.filter((d) => d.age > 90);

  function filterByClient(name) {
    setDashFilter('invoice');
    navigate('dash');
    toast(`Showing ${name}'s documents`);
  }

  function exportCSV() {
    const csvRows = [['Number', 'Client', 'Project', 'Issued', 'Due', 'Days overdue', 'Amount', 'Status']];
    outstanding.forEach((d) => csvRows.push([d.number, d.clientName, d.project, d.issueDate, d.dueDate, Math.max(0, getAge(d)), computeTotals(d).grand.toFixed(2), d.status]));
    const csv = csvRows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'outstanding_' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click(); URL.revokeObjectURL(url);
    toast('CSV downloaded');
  }

  return (
    <section className="screen active" id="outstanding">
      <div className="panel">
        <div className="panel-head">
          <h2>What you're <em>owed</em></h2>
          <button className="btn btn-ghost btn-sm" onClick={exportCSV}>↓ Export CSV</button>
        </div>

        <div className="stats">
          <div className="stat"><div className="stat-label">Total outstanding</div><div className="stat-value">{fmt0(totalOutstanding, cur)}</div><div className="stat-sub">{outstanding.length} invoice{outstanding.length === 1 ? '' : 's'}</div></div>
          <div className="stat"><div className="stat-label">Overdue</div><div className="stat-value">{fmt0(overdueTotal, cur)}</div><div className="stat-sub">{overdueCount} past due</div></div>
          <div className="stat"><div className="stat-label">Oldest</div><div className="stat-value">{oldestAge}d</div><div className="stat-sub">days overdue</div></div>
          <div className="stat"><div className="stat-label">Avg invoice</div><div className="stat-value">{outstanding.length ? fmt0(totalOutstanding / outstanding.length, cur) : fmt0(0, cur)}</div><div className="stat-sub">per unpaid</div></div>
        </div>

        <div className="outstanding-top">
          <div className="aging-card">
            <h3>Aging</h3>
            <p className="sub">How long money has been sitting unpaid</p>
            <div className="aging-bars">
              {order.map((k) => {
                const b = buckets[k];
                return (
                  <div className="aging-bar" key={k}>
                    <div className="aging-bar-label">{b.label}</div>
                    <div className="aging-bar-track"><div className={`aging-bar-fill ${b.cls}`} style={{ width: `${(b.total / maxBucket) * 100}%` }} /></div>
                    <div className="aging-bar-amt">{fmt0(b.total, cur)}<br /><span style={{ fontWeight: 400, fontSize: 10, color: 'var(--muted)' }}>{b.count} inv</span></div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="chart-card">
            <h3>By client</h3>
            <p className="sub">Who owes you the most — tap to see their invoices</p>
            <div className="bar-chart">
              {sortedClients.length === 0 ? (
                <div className="empty"><p>Nothing outstanding. Nice work.</p></div>
              ) : sortedClients.map((c) => {
                const badge = c.oldest > 30 ? `age-${ageBucket(c.oldest).replace('current', '0')}` : '';
                return (
                  <div className="bar-row" key={c.name} onClick={() => filterByClient(c.name)}>
                    <div>
                      <div className="bar-row-label">{c.name} {badge && <span className={`age-pill ${badge}`}>{c.oldest}d</span>}</div>
                      <div className="bar-visual" style={{ marginTop: 6 }}><div className="bar-visual-fill" style={{ width: `${(c.total / maxClient) * 100}%` }} /></div>
                    </div>
                    <div>
                      <div className="bar-row-amt">{fmt0(c.total, cur)}</div>
                      <div className="bar-row-sub">{c.count} invoice{c.count === 1 ? '' : 's'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="table-wrap outstanding-table">
          <div className="table-head">
            <h3>Every outstanding invoice</h3>
            <div className="filter-row">
              {AGE_FILTERS.map((f) => (
                <button key={f.key} className={`filter-chip${ageFilter === f.key ? ' active' : ''}`} onClick={() => setAgeFilter(f.key)}>{f.label}</button>
              ))}
            </div>
          </div>
          {rows.length === 0 ? (
            <div className="empty"><h4>Nothing in this bucket</h4><p>No invoices match this filter.</p></div>
          ) : rows.map((d) => {
            const ageText = d.age < 1 ? `Due in ${Math.abs(d.age)}d` : `${d.age}d overdue`;
            const ageCls = d.age < 1 ? 'age-0' : d.age <= 30 ? 'age-30' : d.age <= 60 ? 'age-60' : 'age-90';
            return (
              <div className="doc-row" key={d.id} onClick={() => openDoc(d.id)}>
                <div>
                  <div className="client">{d.clientName}</div>
                  <div className="desc">{d.number} · {d.project}</div>
                </div>
                <div><span className={`age-pill ${ageCls}`}>{ageText}</span></div>
                <div className="amt">{fmt0(d.total, d.currency)}</div>
                <div className="row-date">Due {fmtDate(d.dueDate)}</div>
                <div className={`status-pill status-${d.status}`}>{d.status}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
