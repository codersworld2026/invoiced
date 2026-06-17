// Placeholder — the no-login client view (get_shared_doc RPC + accept/decline
// via respond_to_shared_doc) is ported in the phase that builds InvoicePreview.
// The legacy app at /legacy/index.html still serves public links meanwhile.
export default function PublicView({ publicId }) {
  return (
    <div className="public-view">
      <div className="public-wrap">
        <div className="public-banner">
          <div className="logo"><span className="logo-dot" />invoiced<em>.</em></div>
        </div>
        <div style={{ background: 'white', border: '1px solid var(--ink)', padding: '60px 24px', textAlign: 'center' }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, marginBottom: 10 }}>Shared document</h3>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>
            Public quote/invoice rendering (link <code>{publicId}</code>) is being ported in the next phase.
          </p>
        </div>
      </div>
    </div>
  );
}
