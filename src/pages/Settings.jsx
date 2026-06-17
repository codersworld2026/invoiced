import { useState } from 'react';
import { useApp } from '../store/AppContext.jsx';
import { resizeImageToDataUrl } from '../lib/image.js';

const CURRENCY_OPTS = [['GBP', '£ GBP'], ['USD', '$ USD'], ['EUR', '€ EUR'], ['AUD', 'A$ AUD'], ['CAD', 'C$ CAD']];

export default function Settings() {
  const { settings, persistSettings, resetAll, toast } = useApp();
  // Local form, seeded from the persisted settings (component remounts on nav).
  const [form, setForm] = useState(() => ({ ...settings }));

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  async function handleSave() {
    const next = { ...form, business: form.business || 'Your Business', taxLabel: form.taxLabel || 'VAT', tax: parseFloat(form.tax) || 0 };
    try { await persistSettings(next); setForm(next); toast('Settings saved'); }
    catch (err) { toast('Settings save failed: ' + (err.message || 'error')); }
  }

  async function handleLogoUpload(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('Logo too big — max 5MB'); return; }
    let dataUrl;
    try { dataUrl = await resizeImageToDataUrl(file, 400); }
    catch { toast('Could not read image — try a PNG or JPG'); return; }
    const prev = form.logo;
    const next = { ...form, logo: dataUrl };
    setForm(next);
    try { await persistSettings(next); toast('Logo saved'); }
    catch { setForm((f) => ({ ...f, logo: prev })); toast('Logo save failed'); }
  }

  async function handleRemoveLogo() {
    const prev = form.logo;
    const next = { ...form, logo: '' };
    setForm(next);
    try { await persistSettings(next); toast('Logo removed'); }
    catch { setForm((f) => ({ ...f, logo: prev })); }
  }

  return (
    <section className="screen active" id="settings">
      <div className="panel">
        <div className="panel-head"><h2>Your <em>business</em></h2></div>

        <div className="settings-card">
          <h3>Your details</h3>
          <p className="sub">Appears on every quote and invoice you send.</p>
          <div className="field-row">
            <div className="field-group"><span className="field-label">Your name / business</span><input className="field-input" value={form.business} onChange={(e) => set('business', e.target.value)} /></div>
            <div className="field-group"><span className="field-label">Email</span><input className="field-input" value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
          </div>
          <div className="field-row">
            <div className="field-group"><span className="field-label">Phone (optional)</span><input className="field-input" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
            <div className="field-group"><span className="field-label">Tax / VAT number (optional)</span><input className="field-input" value={form.taxId} onChange={(e) => set('taxId', e.target.value)} /></div>
          </div>
          <div className="field-group"><span className="field-label">Address</span><textarea className="field-textarea" value={form.address} onChange={(e) => set('address', e.target.value)} /></div>
        </div>

        <div className="settings-card">
          <h3>Logo</h3>
          <p className="sub">Shown on every quote and invoice — preview below. PNG or JPG, auto-resized to fit.</p>
          <div className="logo-upload">
            <div className="logo-preview">
              {form.logo ? <img src={form.logo} alt="Logo" /> : <span className="logo-preview-placeholder">No logo yet</span>}
            </div>
            <div className="logo-upload-actions">
              <label className="btn btn-primary btn-sm logo-upload-label">
                Upload logo
                <input type="file" accept="image/png,image/jpeg,image/svg+xml" style={{ display: 'none' }} onChange={handleLogoUpload} />
              </label>
              {form.logo && <button type="button" className="btn btn-ghost btn-sm" onClick={handleRemoveLogo}>Remove</button>}
            </div>
          </div>
        </div>

        <div className="settings-card">
          <h3>Defaults</h3>
          <p className="sub">Pre-filled on every new document.</p>
          <div className="field-row-3">
            <div className="field-group"><span className="field-label">Currency</span>
              <select className="field-select" value={form.currency} onChange={(e) => set('currency', e.target.value)}>
                {CURRENCY_OPTS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </div>
            <div className="field-group"><span className="field-label">Tax rate (%)</span><input className="field-input" type="number" value={form.tax} onChange={(e) => set('tax', e.target.value)} /></div>
            <div className="field-group"><span className="field-label">Tax label</span><input className="field-input" value={form.taxLabel} onChange={(e) => set('taxLabel', e.target.value)} /></div>
          </div>
          <div className="field-group"><span className="field-label">Default notes</span><textarea className="field-textarea" value={form.notes} onChange={(e) => set('notes', e.target.value)} /></div>
        </div>

        <div className="settings-card">
          <h3>Payment details</h3>
          <p className="sub">Shown on invoices so clients know how to pay you.</p>
          <div className="field-group"><span className="field-label">Bank / payment info</span><textarea className="field-textarea" placeholder="e.g. Sort 12-34-56, Acct 12345678" value={form.payment} onChange={(e) => set('payment', e.target.value)} /></div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button className="btn btn-primary" onClick={handleSave}>Save changes</button>
          <button className="btn btn-danger btn-sm" onClick={resetAll}>Reset all data</button>
        </div>
      </div>
    </section>
  );
}
