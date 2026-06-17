import { useApp } from '../store/AppContext.jsx';

// Placeholder — full settings forms (details, logo upload, defaults, payment)
// port next phase. Shows the loaded business name to verify the profile load.
export default function Settings() {
  const { settings } = useApp();
  return (
    <section className="screen active" id="settings">
      <div className="panel">
        <div className="panel-head"><h2>Your <em>business</em></h2></div>
        <div className="settings-card">
          <h3>{settings.business}</h3>
          <p className="sub">{settings.email || 'No email set'} · {settings.currency} · {settings.taxLabel} {settings.tax}%</p>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            Editable settings forms (logo upload, defaults, payment details) are ported in the next phase.
          </p>
        </div>
      </div>
    </section>
  );
}
