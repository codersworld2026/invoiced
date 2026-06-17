import { useState } from 'react';
import { useApp } from '../store/AppContext.jsx';
import { computeTotals } from '../lib/calculations.js';
import { fmt0 } from '../lib/formatters.js';
import { uid } from '../lib/ids.js';
import Modal from '../components/ui/Modal.jsx';

const EMPTY = { name: '', email: '', address: '' };

export default function Clients() {
  const { clients, docs, settings, saveClient, removeClient } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);

  function openNew() { setEditingId(null); setForm(EMPTY); setModalOpen(true); }
  function openEdit(c) { setEditingId(c.id); setForm({ name: c.name, email: c.email || '', address: c.address || '' }); setModalOpen(true); }

  function save() {
    const name = form.name.trim();
    if (!name) return; // store also guards; keep modal open
    const client = {
      id: editingId || uid(),
      name,
      email: form.email.trim(),
      address: form.address.trim(),
    };
    saveClient(client);
    setModalOpen(false);
  }

  return (
    <section className="screen active" id="clients">
      <div className="panel">
        <div className="panel-head">
          <h2>Your <em>clients</em></h2>
          <button className="btn btn-primary btn-sm" onClick={openNew}>+ Add client</button>
        </div>

        {clients.length === 0 ? (
          <div className="client-grid">
            <div className="empty" style={{ gridColumn: '1/-1' }}>
              <h4>No clients yet</h4>
              <button className="btn btn-primary btn-sm" onClick={openNew}>+ Add client</button>
            </div>
          </div>
        ) : (
          <div className="client-grid">
            {clients.map((c) => {
              const cdocs = docs.filter((d) => d.clientName.toLowerCase() === c.name.toLowerCase());
              const earned = cdocs.filter((d) => d.type === 'invoice' && d.status === 'paid').reduce((s, d) => s + computeTotals(d).grand, 0);
              const owed = cdocs.filter((d) => d.type === 'invoice' && d.status !== 'paid').reduce((s, d) => s + computeTotals(d).grand, 0);
              return (
                <div className="client-card" key={c.id}>
                  <div className="card-actions">
                    <button className="icon-btn" onClick={() => openEdit(c)}>✎</button>
                    <button className="icon-btn" onClick={() => removeClient(c.id)}>✕</button>
                  </div>
                  <h4>{c.name}</h4>
                  <div className="client-email">{c.email || '—'}</div>
                  <div className="client-stats">
                    <span>Docs<strong>{cdocs.length}</strong></span>
                    <span>Earned<strong>{fmt0(earned, settings.currency)}</strong></span>
                    <span style={{ color: owed > 0 ? 'var(--accent)' : 'inherit' }}>Owed<strong>{fmt0(owed, settings.currency)}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit client' : 'New client'}
        subtitle="Save clients to reuse across quotes and invoices."
        actions={(
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={save}>Save client</button>
          </>
        )}
      >
        <div className="field-group"><span className="field-label">Name / company</span><input className="field-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="field-group"><span className="field-label">Email</span><input className="field-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div className="field-group"><span className="field-label">Address (optional)</span><textarea className="field-textarea" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
      </Modal>
    </section>
  );
}
