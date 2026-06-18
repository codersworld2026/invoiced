import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../store/AppContext.jsx';

// Icon set ported 1:1 from the monolith (Lucide-style strokes).
const I = {
  dash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  outstanding: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  profit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
  cashflow: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8"/><line x1="12" y1="6" x2="12" y2="18"/></svg>,
  newdoc: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  clients: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
};

// "New" trigger in the nav pill group. Opens a small menu to pick Quote or
// Invoice. The menu is portaled to <body> and fixed-positioned so the nav bar's
// overflow-x scroll can't clip it, and so it doesn't inherit pill-button styling.
function NewMenu({ newDoc, active }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onMove = () => setOpen(false); // close on scroll/resize (anchor would drift)
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open]);

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const menuW = 180;
      const left = Math.max(8, Math.min(r.left, window.innerWidth - menuW - 8));
      setPos({ top: r.bottom + 6, left });
    }
    setOpen((o) => !o);
  }
  function choose(type) { setOpen(false); newDoc(type); }

  return (
    <>
      <button ref={btnRef} className={active ? 'active' : ''} onClick={toggle} title="New" aria-haspopup="menu" aria-expanded={open}>
        {I.newdoc}<span>New</span>
      </button>
      {open && createPortal(
        <div className="new-menu" role="menu" ref={menuRef} style={{ top: pos.top, left: pos.left }}>
          <button role="menuitem" onClick={() => choose('quote')}>+ New Quote</button>
          <button role="menuitem" onClick={() => choose('invoice')}>+ New Invoice</button>
        </div>,
        document.body,
      )}
    </>
  );
}

export default function Topbar() {
  const { screen, navigate, authStatus, openAuth, signOut, settings, newDoc } = useApp();
  const is = (s) => (screen === s ? ' active' : '');
  const avatar = (settings.business?.[0] || 'Y').toUpperCase();
  const firstName = settings.business?.split(' ')[0] || 'You';

  return (
    <header className="topbar">
      <div className="logo" onClick={() => navigate('landing')}>
        <span className="logo-dot" />invoiced<em>.</em>
      </div>
      <nav className="nav-tabs">
        <button className={`nav-pill-standalone${is('dash')}`} onClick={() => navigate('dash')} title="Dashboard">
          {I.dash}<span>Dashboard</span>
        </button>
        <div className="nav-pill-group">
          <button className={is('landing').trim() ? 'active' : ''} onClick={() => navigate('landing')} title="Home">{I.home}<span>Home</span></button>
          <button className={is('outstanding').trim() ? 'active' : ''} onClick={() => navigate('outstanding')} title="Outstanding">{I.outstanding}<span>Outstanding</span></button>
          <button className={is('profit').trim() ? 'active' : ''} onClick={() => navigate('profit')} title="Profit">{I.profit}<span>Profit</span></button>
          <button className={is('cashflow').trim() ? 'active' : ''} onClick={() => navigate('cashflow')} title="Cash flow">{I.cashflow}<span>Cash flow</span></button>
          <NewMenu newDoc={newDoc} active={!!is('editor').trim()} />
          <button className={is('clients').trim() ? 'active' : ''} onClick={() => navigate('clients')} title="Clients">{I.clients}<span>Clients</span></button>
        </div>
        <button className={`nav-pill-standalone${is('settings')}`} onClick={() => navigate('settings')} title="Settings">
          {I.settings}<span>Settings</span>
        </button>
      </nav>
      <div className="topbar-right">
        {authStatus === 'authed' ? (
          <>
            <div className="user-pill" onClick={() => navigate('settings')}>
              <span className="avatar">{avatar}</span>
              <span>{firstName}</span>
            </div>
            <button className="signout-link" onClick={signOut} title="Sign out">Sign out</button>
          </>
        ) : (
          <>
            <button className="auth-cta" onClick={() => openAuth('signin')}>Log in</button>
            <button className="auth-cta auth-cta-primary" onClick={() => openAuth('signup')}>Sign up</button>
          </>
        )}
      </div>
    </header>
  );
}
