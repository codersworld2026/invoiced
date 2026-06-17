import { useState } from 'react';
import { useApp } from '../store/AppContext.jsx';
import { computeTotals } from '../lib/calculations.js';
import { fmt0, fmtDate } from '../lib/formatters.js';
import { uid } from '../lib/ids.js';
import Modal from '../components/ui/Modal.jsx';

const CATEGORIES = ['materials', 'subcontractor', 'software', 'travel', 'equipment', 'other'];
const PERIODS = [['all', 'All time'], ['year', 'This year'], ['month', 'This month'], ['quarter', 'This quarter']];
const today = () => new Date().toISOString().slice(0, 10);
const EMPTY = () => ({ date: today(), amount: '', desc: '', category: 'materials', docId: '', notes: '' });

export default function Profit() {
  const { docs, expenses, settings, openDoc, saveExpense, removeExpense } = useApp();
  const cur = settings.currency;
  const [period, setPeriod] = useState('month');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY());

  // period start
  const now = new Date();
  let start = 0;
  if (period === 'month') { const d = new Date(now); d.setDate(1); d.setHours(0, 0, 0, 0); start = d.getTime(); }
  else if (period === 'quarter') { const d = new Date(now); d.setMonth(Math.floor(d.getMonth() / 3) * 3, 1); d.setHours(0, 0, 0, 0); start = d.getTime(); }
  else if (period === 'year') { start = new Date(now.getFullYear(), 0, 1).getTime(); }

  const paid = docs.filter((d) => d.type === 'invoice' && d.status === 'paid' && d.paidAt >= start);
  const periodExpenses = expenses.filter((e) => new Date(e.date).getTime() >= start);
  const revenue = paid.reduce((s, d) => s + computeTotals(d).grand, 0);
  const lineCosts = paid.reduce((s, d) => s + computeTotals(d).lineCosts, 0);
  const expenseTotal = periodExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const totalCosts = lineCosts + expenseTotal;
  const profit = revenue - totalCosts;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  const projects = paid.map((d) => {
    const totals = computeTotals(d);
    const linkedExp = expenses.filter((e) => e.docId === d.id).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const jobCosts = totals.lineCosts + linkedExp;
    const jobProfit = totals.sub - jobCosts;
    const jobMargin = totals.sub > 0 ? (jobProfit / totals.sub) * 100 : 0;
    return { ...d, revenue: totals.sub, costs: jobCosts, profit: jobProfit, margin: jobMargin };
  }).sort((a, b) => b.profit - a.profit);

  const sortedExp = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));

  function openNew() { setEditingId(null); setForm(EMPTY()); setModalOpen(true); }
  function openEdit(e) { setEditingId(e.id); setForm({ date: e.date, amount: e.amount, desc: e.desc, category: e.category, docId: e.docId || '', notes: e.notes || '' }); setModalOpen(true); }
  function save() {
    const amount = parseFloat(form.amount);
    const desc = form.desc.trim();
    if (!amount || !desc) return;
    const exp = { id: editingId || uid(), date: form.date || today(), amount, desc, category: form.category, docId: form.docId || null, notes: form.notes };
    saveExpense(exp);
    setModalOpen(false);
  }

  return (
    <section className="screen active" id="profit">
      <div className="panel">
        <div className="panel-head">
          <h2>Your <em>profit</em></h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="field-select btn-sm" value={period} onChange={(e) => setPeriod(e.target.value)} style={{ padding: '8px 28px 8px 14px', fontSize: 12 }}>
              {PERIODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <button className="btn btn-primary btn-sm" onClick={openNew}>+ Add expense</button>
          </div>
        </div>

        <div className="profit-top">
          <div className="profit-stat revenue"><div className="stat-label">Revenue</div><div className="stat-value">{fmt0(revenue, cur)}</div><div className="stat-sub">{paid.length} paid invoice{paid.length === 1 ? '' : 's'}</div></div>
          <div className="profit-stat costs"><div className="stat-label">Total costs</div><div className="stat-value">{fmt0(totalCosts, cur)}</div><div className="stat-sub">{fmt0(lineCosts, cur)} line · {fmt0(expenseTotal, cur)} exp</div></div>
          <div className="profit-stat profit"><div className="stat-label">Gross profit</div><div className="stat-value">{fmt0(profit, cur)}</div><div className="stat-sub">Revenue − costs</div></div>
          <div className="profit-stat margin"><div className="stat-label">Margin</div><div className="stat-value">{margin.toFixed(0)}%</div><div className="stat-sub">Profit / revenue</div></div>
        </div>

        <div className="table-wrap">
          <div className="table-head"><h3>By project</h3></div>
          <div className="project-list">
            {projects.length === 0 ? (
              <div className="empty"><h4>No paid projects yet in this period</h4><p>Mark invoices as paid to see profit breakdown.</p></div>
            ) : projects.map((p) => {
              const mCls = p.margin >= 50 ? 'pos' : p.margin < 20 ? 'neg' : '';
              const barColor = p.margin >= 50 ? 'var(--green)' : p.margin < 20 ? 'var(--accent)' : 'var(--accent-2)';
              const barPct = Math.max(0, Math.min(100, p.margin));
              return (
                <div className="project-row" key={p.id} onClick={() => openDoc(p.id)}>
                  <div>
                    <div className="proj-name">{p.project}</div>
                    <div className="proj-client">{p.clientName} · {p.number}</div>
                  </div>
                  <div className="proj-amt">{fmt0(p.revenue, p.currency)}</div>
                  <div className="proj-amt neg">−{fmt0(p.costs, p.currency)}</div>
                  <div className={`proj-amt ${mCls}`}>{p.profit >= 0 ? '' : '−'}{fmt0(Math.abs(p.profit), p.currency)}</div>
                  <div>
                    <div className="margin-bar"><div className="margin-bar-fill" style={{ width: `${barPct}%`, background: barColor }} /></div>
                    <div className={`margin-pct ${mCls}`}>{p.margin.toFixed(0)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="table-wrap expenses-wrap">
          <div className="table-head">
            <h3>Expenses log</h3>
            <button className="btn btn-ghost btn-sm" onClick={openNew}>+ Add expense</button>
          </div>
          {sortedExp.length === 0 ? (
            <div className="empty"><h4>No expenses logged</h4><p>Track materials, subcontractors, and other costs to see true profit.</p><button className="btn btn-primary btn-sm" onClick={openNew}>+ Add expense</button></div>
          ) : sortedExp.map((e) => {
            const linkedDoc = e.docId ? docs.find((d) => d.id === e.docId) : null;
            return (
              <div className="expense-row" key={e.id} onClick={() => openEdit(e)} style={{ cursor: 'pointer' }}>
                <div className="exp-date">{fmtDate(e.date)}</div>
                <div><div className="exp-desc">{e.desc}</div><div className="exp-cat">{e.category}</div></div>
                <div className="exp-linked">{linkedDoc ? '→ ' + linkedDoc.project : '— unlinked —'}</div>
                <div className="exp-cat" style={{ textTransform: 'capitalize' }}>{e.category}</div>
                <div className="exp-amt">−{fmt0(e.amount, cur)}</div>
                <div><button className="icon-btn" onClick={(ev) => { ev.stopPropagation(); removeExpense(e.id); }}>✕</button></div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit expense' : 'Log expense'}
        subtitle="Materials, subcontractors, software — anything that cut into your profit."
        actions={(
          <>
            {editingId && <button className="btn btn-danger btn-sm" style={{ marginRight: 'auto' }} onClick={() => { removeExpense(editingId); setModalOpen(false); }}>Delete</button>}
            <button className="btn btn-ghost btn-sm" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={save}>Save expense</button>
          </>
        )}
      >
        <div className="field-row">
          <div className="field-group"><span className="field-label">Date</span><input className="field-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div className="field-group"><span className="field-label">Amount</span><input className="field-input" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
        </div>
        <div className="field-group"><span className="field-label">Description</span><input className="field-input" placeholder="e.g. Materials from Builders Merchants" value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} /></div>
        <div className="field-row">
          <div className="field-group">
            <span className="field-label">Category</span>
            <select className="field-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c[0].toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div className="field-group">
            <span className="field-label">Link to project (optional)</span>
            <select className="field-select" value={form.docId} onChange={(e) => setForm({ ...form, docId: e.target.value })}>
              <option value="">— Unlinked —</option>
              {docs.map((d) => <option key={d.id} value={d.id}>{d.number} · {d.clientName} — {d.project}</option>)}
            </select>
          </div>
        </div>
        <div className="field-group"><span className="field-label">Notes (optional)</span><textarea className="field-textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      </Modal>
    </section>
  );
}
