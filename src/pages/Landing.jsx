import { useApp } from '../store/AppContext.jsx';

export default function Landing() {
  const { authStatus, navigate, openAuth, newDoc } = useApp();
  const signedIn = authStatus === 'authed';

  const primaryCTA = () => (signedIn ? newDoc('quote') : openAuth('signup'));
  const secondaryCTA = () => (signedIn ? navigate('dash') : openAuth('signin'));

  return (
    <section className="screen active" id="landing">
      <div className="hero">
        <div>
          <div className="eyebrow">For freelancers &amp; sole traders</div>
          <h1 className="display">Quote.<br />Invoice.<br /><em>Get paid.</em></h1>
          <p className="lede">The simplest way to send a professional quote, turn it into an invoice the moment it's accepted, track what you're owed, and actually see your profit.</p>
          <div className="cta-row">
            <button className="btn btn-primary" onClick={primaryCTA}>Create your first quote →</button>
            <button className="btn btn-ghost" onClick={secondaryCTA}>See dashboard</button>
          </div>
        </div>
        <div className="hero-card">
          <div className="hero-card-inner">
            <div className="hc-head">
              <div><h3>Quotation</h3><div className="num">#Q-2026-0481</div></div>
              <span className="hc-status">Accepted</span>
            </div>
            <div className="hc-meta">
              <div><div className="hc-meta-label">For</div><div>Marlow &amp; Sons Ltd.</div></div>
              <div><div className="hc-meta-label">Due</div><div>30 Apr 2026</div></div>
            </div>
            <div className="hc-line"><span>Brand identity system</span><span>£2,400</span></div>
            <div className="hc-line"><span>Web design (5 pages)</span><span>£1,800</span></div>
            <div className="hc-line"><span>Photography direction</span><span>£600</span></div>
            <div className="hc-total"><span>Total</span><span>£4,800</span></div>
          </div>
        </div>
      </div>

      <div className="marquee"><div className="marquee-track">
        <span>One click to convert</span><span>Track outstanding</span><span>See real profit</span><span>Multi-currency</span><span>Zero faff</span>
        <span>One click to convert</span><span>Track outstanding</span><span>See real profit</span><span>Multi-currency</span><span>Zero faff</span>
      </div></div>

      <section className="features">
        <div className="features-head">
          <h2>Built for the way you actually work.</h2>
          <p>No bloat. No accountant-speak. Quote, invoice, chase what you're owed, and know exactly what each job really earned you.</p>
        </div>
        <div className="feature-grid">
          <div className="feat"><div className="feat-num">01 / Quote</div><div><h3>Quote in 60 seconds.</h3><p>Saved clients, line-item templates, your logo and colours pre-loaded.</p></div></div>
          <div className="feat"><div className="feat-num">02 / Invoice</div><div><h3>One-tap conversion.</h3><p>Quote accepted becomes a live invoice — instantly. Chase without cringing.</p></div></div>
          <div className="feat"><div className="feat-num">03 / Profit</div><div><h3>Know your real numbers.</h3><p>Track material costs per line, log expenses, see what each job actually earned.</p></div></div>
        </div>
      </section>

      <section className="pricing" id="pricing">
        <div className="pricing-head">
          <h2>Simple <em>pricing.</em></h2>
          <p>Start free. Upgrade when you're ready. No per-client fees, no per-invoice fees, no surprises. Cancel anytime.</p>
        </div>
        <div className="pricing-grid">
          <div className="plan">
            <div className="plan-head"><span className="plan-name">Starter</span></div>
            <div className="plan-price"><span className="amount">£0</span><span className="period">forever</span></div>
            <p className="plan-sub">Everything you need to send your first professional quote and get paid.</p>
            <ul className="plan-features">
              <li>Up to 3 active clients</li>
              <li>Unlimited quotes &amp; invoices</li>
              <li>PDF export with your branding</li>
              <li>Shareable client view links</li>
              <li>Basic expense tracking</li>
            </ul>
            {signedIn
              ? <button className="btn btn-ghost" onClick={() => navigate('dash')}>Open dashboard →</button>
              : <button className="btn btn-ghost" onClick={() => openAuth('signup')}>Start free →</button>}
          </div>
          <div className="plan featured">
            <div className="plan-head"><span className="plan-name">Pro</span><span className="plan-badge">Most popular</span></div>
            <div className="plan-price"><span className="amount">£9</span><span className="period">/ month</span></div>
            <p className="plan-sub">For freelancers and sole traders who want the full picture — clients, cash flow, and profit.</p>
            <ul className="plan-features">
              <li>Unlimited clients</li>
              <li>Unlimited quotes &amp; invoices</li>
              <li>Custom logo, colours &amp; branding</li>
              <li>Profit tracking per job</li>
              <li>Aging reports &amp; CSV export</li>
              <li>Priority email support</li>
            </ul>
            {signedIn
              ? <button className="btn btn-accent" onClick={() => navigate('settings')}>Manage plan →</button>
              : <button className="btn btn-accent" onClick={() => openAuth('signup')}>Start 14-day trial →</button>}
          </div>
        </div>
      </section>

      <footer><span>© 2026 invoiced.</span><span>Made for makers, builders, doers.</span></footer>
    </section>
  );
}
