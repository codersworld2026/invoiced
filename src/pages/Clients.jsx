import { useApp } from '../store/AppContext.jsx';

// Placeholder — full client cards + add/edit modal port next phase.
// Lists loaded client names so the data path is verifiable now.
export default function Clients() {
  const { clients } = useApp();
  return (
    <section className="screen active" id="clients">
      <div className="panel">
        <div className="panel-head"><h2>Your <em>clients</em></h2></div>
        <div className="table-wrap">
          <div className="empty">
            <h4>{clients.length} client(s) loaded</h4>
            <p>{clients.map((c) => c.name).join(', ') || 'No clients yet.'} — full client management UI arrives next phase.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
