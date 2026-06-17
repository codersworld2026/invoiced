import { fmt } from '../../lib/formatters.js';

// Editable line-item rows for the editor. Faithful to the monolith's renderLines.
// props: lines, currency, onUpdate(i, key, value), onRemove(i), onSaveTemplate(i)
export default function LineItems({ lines, currency, onUpdate, onRemove, onSaveTemplate }) {
  return (
    <div className="line-items" id="lines">
      <div className="line-item-head">
        <span>Description</span>
        <span style={{ textAlign: 'center' }}>Qty</span>
        <span style={{ textAlign: 'right' }}>Rate</span>
        <span style={{ textAlign: 'right', color: 'var(--accent)' }}>Cost</span>
        <span style={{ textAlign: 'right' }}>Amount</span>
        <span />
        <span />
      </div>
      {lines.map((l, i) => (
        <div className="line-item" key={i}>
          <input value={l.desc} placeholder="Description" onChange={(e) => onUpdate(i, 'desc', e.target.value)} />
          <input style={{ textAlign: 'center' }} type="number" value={l.qty} min="0" step="0.5" onChange={(e) => onUpdate(i, 'qty', e.target.value)} />
          <input style={{ textAlign: 'right' }} type="number" value={l.rate} min="0" step="0.01" onChange={(e) => onUpdate(i, 'rate', e.target.value)} />
          <input style={{ textAlign: 'right', color: 'var(--accent)' }} type="number" value={l.cost || 0} min="0" step="0.01" placeholder="0" onChange={(e) => onUpdate(i, 'cost', e.target.value)} />
          <span className="amt">{fmt((parseFloat(l.qty) || 0) * (parseFloat(l.rate) || 0), currency)}</span>
          <button className="del" onClick={() => onSaveTemplate(i)} title="Save as template" style={{ color: 'var(--muted)', fontSize: 14 }}>☆</button>
          <button className="del" onClick={() => onRemove(i)} title="Remove line">×</button>
        </div>
      ))}
    </div>
  );
}
