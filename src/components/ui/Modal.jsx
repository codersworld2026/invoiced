// Reusable modal matching the legacy .modal-overlay / .modal markup.
// Renders nothing when closed. `title`/`subtitle` are optional; `children`
// is the body and `actions` the footer button row.
export default function Modal({ open, onClose, title, subtitle, children, actions }) {
  if (!open) return null;
  return (
    <div
      className="modal-overlay active"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true">
        {title && <h3>{title}</h3>}
        {subtitle && <p className="sub">{subtitle}</p>}
        {children}
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}
