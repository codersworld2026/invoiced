import { useState } from 'react';
import { useApp } from '../store/AppContext.jsx';
import { computeTotals } from '../lib/calculations.js';
import { fmt0, fmtDate } from '../lib/formatters.js';
import { uid } from '../lib/ids.js';
import Modal from '../components/ui/Modal.jsx';

const today = () => new Date().toISOString().slice(0, 10);

export default function Cashflow() {
  const { docs, expenses, cashflow, settings, saveCashflow, removeCashflow } = useApp();
  const cur = settings.currency;
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [dir, setDir] = useState(1); // 1 = deposit, -1 = withdrawal
  const [form, setForm] = useState({ date: today(), amount: '', desc: '', notes: '' });

  // earned profit from paid invoices minus all costs
  const paid = docs.filter((d) => d.type === 'invoice' && d.status === 'paid');
  const earned = paid.reduce((s, d) => s + computeTotals(d).grand, 0)
    - paid.reduce((s, d) => s + computeTotals(d).lineCosts, 0)
    - expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const deposits = cashflow.filter((c) => c.amount > 0).reduce((s, c) => s + c.amount, 0);
  const withdrawals = cashflow.filter((c) => c.amount < 0).reduce((s, c) => s + Math.abs(c.amount), 0);
  const balance = earned + deposits - withdrawals;

  const sorted = [...cashflow].sort((a, b) => new Date(b.date) - new Date(a.date));

  function openNew(direction) { setEditingId(null); setDir(direction); setForm({ date: today(), amount: '', desc: '', notes: '' }); setModalOpen(true); }
  function openEdit(c) { setEditingId(c.id); setDir(c.amount >= 0 ? 1 : -1); setForm({ date: c.date, amount: Math.abs(c.amount), desc: c.desc || '', notes: c.notes || '' }); setModalOpen(true); }
  function save() {
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) return;
    const entry = { id: editingId || uid(), date: form.date || today(), amount: dir * amt, desc: form.desc.trim(), notes: form.notes.trim() };
    saveCashflow(entry);
    setModalOpen(false);
  }

  return (
    <section className="screen active" id="cashflow">
      <div className="panel">
        <div className="panel-head">
          <h2>Your <em>cash flow</em></h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => openNew(-1)}>− Withdrawal</button>
            <button className="btn btn-primary btn-sm" onClick={() => openNew(1)}>+ Deposit</button>
          </div>
        </div>

        <div className="cashflow-top">
          <div className="profit-stat revenue"><div className="stat-label">Earned profit</div><div className="stat-value">{fmt0(earned, cur)}</div><div className="stat-sub">From paid invoices</div></div>
          <div className="profit-stat margin"><div className="stat-label">Deposits</div><div className="stat-value">+{fmt0(deposits, cur)}</div><div className="stat-sub">Manual additions</div></div>
          <div className="profit-stat costs"><div className="stat-label">Withdrawals</div><div className="stat-value">−{fmt0(withdrawals, cur)}</div><div className="stat-sub">Manual deductions</div></div>
          <div className={`profit-stat profit ${balance >= 0 ? 'pos' : 'neg'}`}><div className="stat-label">Cash balance</div><div className="stat-value">{balance < 0 ? '−' : ''}{fmt0(Math.abs(balance), cur)}</div><div className="stat-sub">Earned + adjustments</div></div>
        </div>

        <div className="table-wrap">
          <div className="table-head">
            <h3>Adjustments</h3>
            <span className="sub" style={{ margin: 0 }}>Deposits and withdrawals you've recorded manually.</span>
          </div>
          {sorted.length === 0 ? (
            <div className="empty">
              <h4>No adjustments yet</h4>
              <p>Your cash balance is your earned profit. Record a deposit or withdrawal to adjust it.</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => openNew(-1)}>− Withdrawal</button>
                <button className="btn btn-primary btn-sm" onClick={() => openNew(1)}>+ Deposit</button>
              </div>
            </div>
          ) : sorted.map((c) => {
            const isIn = c.amount >= 0;
            return (
              <div className="expense-row" key={c.id} onClick={() => openEdit(c)} style={{ cursor: 'pointer' }}>
                <div className="exp-date">{fmtDate(c.date)}</div>
                <div><div className="exp-desc">{c.desc || (isIn ? 'Deposit' : 'Withdrawal')}</div><div className="exp-cat">{isIn ? 'Deposit' : 'Withdrawal'}</div></div>
                <div className="exp-linked">{c.notes || ''}</div>
                <div />
                <div className={`exp-amt ${isIn ? 'pos' : ''}`}>{(isIn ? '+' : '−') + fmt0(Math.abs(c.amount), cur)}</div>
                <div><button className="icon-btn" onClick={(ev) => { ev.stopPropagation(); removeCashflow(c.id); }}>✕</button></div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={(editingId ? 'Edit ' : 'Record ') + (dir === 1 ? 'deposit' : 'withdrawal')}
        subtitle="Log a deposit or withdrawal that changes your cash balance."
        actions={(
          <>
            {editingId && <button className="btn btn-danger btn-sm" style={{ marginRight: 'auto' }} onClick={() => { removeCashflow(editingId); setModalOpen(false); }}>Delete</button>}
            <button className="btn btn-ghost btn-sm" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={save}>Save</button>
          </>
        )}
      >
        <div className="cf-toggle">
          <button type="button" className={dir === 1 ? 'active' : ''} onClick={() => setDir(1)}>+ Deposit</button>
          <button type="button" className={dir === -1 ? 'active' : ''} onClick={() => setDir(-1)}>− Withdrawal</button>
        </div>
        <div className="field-row">
          <div className="field-group"><span className="field-label">Date</span><input className="field-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div className="field-group"><span className="field-label">Amount</span><input className="field-input" type="number" step="0.01" min="0" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
        </div>
        <div className="field-group"><span className="field-label">Description</span><input className="field-input" placeholder="e.g. Owner draw, bank transfer, savings" value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} /></div>
        <div className="field-group"><span className="field-label">Notes (optional)</span><textarea className="field-textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      </Modal>
    </section>
  );
}
