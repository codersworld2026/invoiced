import { useState, useEffect } from 'react';
import { useApp } from '../store/AppContext.jsx';
import { computeTotals } from '../lib/calculations.js';
import { fmt } from '../lib/formatters.js';
import { publicId } from '../lib/ids.js';
import LineItems from '../components/invoice/LineItems.jsx';
import InvoicePreview from '../components/invoice/InvoicePreview.jsx';

const CURRENCY_OPTS = [['GBP', '£ GBP'], ['USD', '$ USD'], ['EUR', '€ EUR'], ['AUD', 'A$ AUD'], ['CAD', 'C$ CAD']];

export default function Editor() {
  const { editorDoc, settings, clients, templates, docs, navigate, saveDoc, openShareModal, openDoc, saveTemplate, removeTemplate, toast } = useApp();
  const [doc, setDoc] = useState(editorDoc);

  // Reset the working copy whenever a new/edited doc is loaded into the editor.
  useEffect(() => { setDoc(editorDoc); }, [editorDoc]);

  if (!doc) {
    return (
      <section className="screen active" id="editor">
        <div className="panel"><div className="empty"><h4>No document open</h4><p>Start a new quote from the dashboard.</p><button className="btn btn-primary btn-sm" onClick={() => navigate('dash')}>Go to dashboard</button></div></div>
      </section>
    );
  }

  const isQuote = doc.type === 'quote';
  const existing = doc.status && doc.status !== 'draft';
  const inStore = docs.some((d) => d.id === doc.id);
  const t = computeTotals(doc);
  const business = { name: settings.business, email: settings.email, logo: settings.logo, payment: settings.payment };

  function setField(key, value) {
    setDoc((prev) => ({ ...prev, [key]: value }));
  }
  function setClientName(value) {
    setDoc((prev) => {
      const next = { ...prev, clientName: value };
      const match = clients.find((c) => c.name.toLowerCase() === value.toLowerCase());
      if (match && !prev.clientEmail) next.clientEmail = match.email || '';
      return next;
    });
  }
  function pickClient(c) {
    setDoc((prev) => ({ ...prev, clientName: c.name, clientEmail: c.email || '' }));
  }
  function updateLine(i, key, value) {
    setDoc((prev) => {
      const lines = prev.lines.map((l, idx) => idx === i ? { ...l, [key]: key === 'desc' ? value : (parseFloat(value) || 0) } : l);
      return { ...prev, lines };
    });
  }
  function addLine() {
    setDoc((prev) => ({ ...prev, lines: [...prev.lines, { desc: '', qty: 1, rate: 0, cost: 0 }] }));
  }
  function removeLine(i) {
    setDoc((prev) => {
      const lines = prev.lines.length === 1 ? [{ desc: '', qty: 1, rate: 0, cost: 0 }] : prev.lines.filter((_, idx) => idx !== i);
      return { ...prev, lines };
    });
  }
  function applyTemplate(tpl) {
    setDoc((prev) => {
      const lines = [...prev.lines];
      const last = lines[lines.length - 1];
      if (last && !last.desc && !last.rate) lines[lines.length - 1] = { desc: tpl.desc, qty: 1, rate: tpl.rate, cost: tpl.cost };
      else lines.push({ desc: tpl.desc, qty: 1, rate: tpl.rate, cost: tpl.cost });
      return { ...prev, lines };
    });
    toast('Line added');
  }

  async function handleSaveDraft() {
    if (!doc.clientName) { toast('Client name required'); return; }
    const d = { ...doc, status: (!doc.status || doc.status === 'draft') ? 'draft' : doc.status };
    try { await saveDoc(d); toast(d.status === 'draft' ? 'Draft saved' : 'Changes saved'); navigate('dash'); }
    catch (err) { toast('Save failed: ' + (err.message || 'error')); }
  }
  async function handleSend() {
    if (!doc.clientName) { toast('Client name required'); return; }
    if (!doc.lines.some((l) => l.desc)) { toast('Add at least one line item'); return; }
    const d = { ...doc, status: 'sent', publicId: doc.publicId || publicId() };
    try {
      await saveDoc(d);
      openDoc(d.id);
      openShareModal(d);
    } catch (err) { toast('Send failed: ' + (err.message || 'error')); }
  }

  return (
    <section className="screen active" id="editor">
      <div className="editor">
        <div className="editor-head">
          <h2>{inStore ? 'Edit' : 'New'} <em>{isQuote ? 'quotation' : 'invoice'}</em></h2>
          <div className="editor-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('dash')}>Cancel</button>
            <button className="btn btn-ghost btn-sm" onClick={handleSaveDraft}>{existing ? 'Save changes' : 'Save draft'}</button>
            <button className="btn btn-primary btn-sm" onClick={handleSend}>{existing ? 'Resend to client →' : 'Send to client →'}</button>
          </div>
        </div>

        <div className="form-card">
          <div className="field-row">
            <div className="field-group">
              <span className="field-label">Client</span>
              {clients.length > 0 && (
                <div className="quick-chips">
                  {clients.slice(0, 12).map((c) => (
                    <button type="button" className="quick-chip" key={c.id} onClick={() => pickClient(c)}>{c.name}</button>
                  ))}
                </div>
              )}
              <input className="field-input" placeholder="Client name" value={doc.clientName} onChange={(e) => setClientName(e.target.value)} list="client-suggestions" />
              <datalist id="client-suggestions">
                {clients.map((c) => <option key={c.id} value={c.name} />)}
              </datalist>
            </div>
            <div className="field-group">
              <span className="field-label">Client email</span>
              <input className="field-input" placeholder="name@company.com" value={doc.clientEmail} onChange={(e) => setField('clientEmail', e.target.value)} />
            </div>
          </div>

          <div className="field-group">
            <span className="field-label">Project / title</span>
            <input className="field-input" placeholder="e.g. Brand & website refresh" value={doc.project} onChange={(e) => setField('project', e.target.value)} />
          </div>

          <div className="field-row-3">
            <div className="field-group">
              <span className="field-label">Issue date</span>
              <input className="field-input" type="date" value={doc.issueDate} onChange={(e) => setField('issueDate', e.target.value)} />
            </div>
            <div className="field-group">
              <span className="field-label">{isQuote ? 'Valid until' : 'Due date'}</span>
              <input className="field-input" type="date" value={doc.dueDate} onChange={(e) => setField('dueDate', e.target.value)} />
            </div>
            <div className="field-group">
              <span className="field-label">Currency</span>
              <select className="field-select" value={doc.currency} onChange={(e) => setField('currency', e.target.value)}>
                {CURRENCY_OPTS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </div>
          </div>

          <div className="field-group">
            <span className="field-label">Line items <span style={{ color: 'var(--muted)', textTransform: 'none', fontWeight: 400 }}>— add material/cost per line to track profit</span></span>
            {templates.length > 0 && (
              <div id="template-chips-row">
                <div className="quick-chips-label" style={{ marginBottom: 6 }}>Saved templates — tap to add</div>
                <div className="quick-chips">
                  {templates.map((tpl) => (
                    <span className="quick-chip" key={tpl.id} onClick={() => applyTemplate(tpl)}>
                      <span>{tpl.desc || '—'}</span>
                      <span className="chip-rate">{fmt(tpl.rate, doc.currency)}</span>
                      <button type="button" className="chip-x" onClick={(e) => { e.stopPropagation(); removeTemplate(tpl.id); }} title="Delete template">×</button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <LineItems lines={doc.lines} currency={doc.currency} onUpdate={updateLine} onRemove={removeLine} onSaveTemplate={(i) => saveTemplate(doc.lines[i])} />
            <button className="add-line" onClick={addLine}>+ Add line item</button>
          </div>

          <div className="field-row">
            <div className="field-group">
              <span className="field-label">Tax rate (%)</span>
              <input className="field-input" type="number" value={doc.tax} min="0" max="100" step="0.5" onChange={(e) => setField('tax', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="field-group">
              <span className="field-label">Tax label</span>
              <input className="field-input" value={doc.taxLabel} onChange={(e) => setField('taxLabel', e.target.value)} />
            </div>
          </div>

          <div className="totals-block">
            <div className="total-row"><span>Subtotal</span><span>{fmt(t.sub, doc.currency)}</span></div>
            <div className="total-row"><span>{doc.taxLabel} ({doc.tax}%)</span><span>{fmt(t.tax, doc.currency)}</span></div>
            <div className="total-row grand"><span>Total</span><span>{fmt(t.grand, doc.currency)}</span></div>
            <div className="total-row cost" style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--rule)' }}><span>Line item costs</span><span>−{fmt(t.lineCosts, doc.currency)}</span></div>
            <div className="total-row profit"><span>Gross profit (est.)</span><span>{fmt(t.profit, doc.currency)}</span></div>
          </div>

          <label className="toggle-field" style={{ marginTop: 24 }}>
            <div className="toggle-text">
              <strong>Hide item pricing on client view</strong>
              <span>Keep your internal cost/profit breakdown, but show the client only descriptions and the final total.</span>
            </div>
            <input type="checkbox" checked={!!doc.hideItemPricing} onChange={(e) => setField('hideItemPricing', e.target.checked)} />
            <div className="toggle-switch" />
          </label>

          <div className="field-group" style={{ marginTop: 24 }}>
            <span className="field-label">Notes for client</span>
            <textarea className="field-textarea" placeholder="Payment terms, thanks, anything else..." value={doc.notes} onChange={(e) => setField('notes', e.target.value)} />
          </div>
        </div>

        <div className="preview-pane">
          <div className="preview-label">Live preview</div>
          <InvoicePreview doc={doc} business={business} totals={t} variant="editor" />
        </div>
      </div>

      <div className="mobile-action-bar">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('dash')}>Cancel</button>
        <button className="btn btn-ghost btn-sm" onClick={handleSaveDraft}>Save</button>
        <button className="btn btn-primary btn-sm" onClick={handleSend}>Send →</button>
      </div>
    </section>
  );
}
