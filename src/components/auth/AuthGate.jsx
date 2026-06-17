import { useState, useEffect } from 'react';
import { useApp } from '../../store/AppContext.jsx';
import { authService } from '../../services/authService.js';

export default function AuthGate() {
  const { authGate, closeAuth } = useApp();
  const [mode, setMode] = useState(authGate.mode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null); // { msg, success }
  const [busy, setBusy] = useState(false);

  // Sync local mode whenever the gate is (re)opened.
  useEffect(() => { if (authGate.open) { setMode(authGate.mode); setError(null); } }, [authGate.open, authGate.mode]);

  if (!authGate.open) return null;

  const isUp = mode === 'signup';

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (isUp) {
        const { error } = await authService.signUp(email.trim(), password);
        if (error) throw error;
        setMode('signin');
        setError({ success: true, msg: `Account created! Please check your email (${email}) and click the verification link, then sign in here.` });
      } else {
        const { error } = await authService.signIn(email.trim(), password);
        if (error) throw error;
        // onAuthStateChange in the store will boot the session + close the gate.
      }
    } catch (err) {
      setError({ success: false, msg: err.message || 'Something went wrong.' });
    } finally {
      setBusy(false);
    }
  }

  async function handleForgot() {
    if (!email.trim()) { setError({ success: false, msg: 'Enter your email above first, then tap "Forgot password".' }); return; }
    const { error } = await authService.resetPassword(email.trim(), window.location.origin + window.location.pathname);
    setError(error ? { success: false, msg: error.message } : { success: true, msg: 'Password reset link sent — check your email.' });
  }

  return (
    <div className="auth-gate active">
      <div className="auth-card">
        <button type="button" className="auth-close" onClick={closeAuth} aria-label="Close" title="Back to home">×</button>
        <div className="logo"><span className="logo-dot" />invoiced<em>.</em></div>
        <h2>{isUp ? <>Create your <em>account.</em></> : <>Welcome <em>back.</em></>}</h2>
        <p className="sub">
          {isUp
            ? 'One account for all your clients, quotes, and invoices — across every device.'
            : 'Sign in to get back to your quotes and invoices.'}
        </p>

        <div className="auth-toggle">
          <button type="button" className={!isUp ? 'active' : ''} onClick={() => { setMode('signin'); setError(null); }}>Sign in</button>
          <button type="button" className={isUp ? 'active' : ''} onClick={() => { setMode('signup'); setError(null); }}>Sign up</button>
        </div>

        {error && <div className={`auth-error show${error.success ? ' success' : ''}`}>{error.msg}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field-group">
            <span className="field-label">Email</span>
            <input className="field-input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field-group">
            <span className="field-label">Password</span>
            <input className="field-input" type="password" autoComplete={isUp ? 'new-password' : 'current-password'} minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? (isUp ? 'Creating…' : 'Signing in…') : isUp ? 'Create account →' : 'Sign in →'}
          </button>
        </form>
        {!isUp && <button type="button" className="auth-link" onClick={handleForgot}>Forgot password?</button>}
      </div>
    </div>
  );
}
