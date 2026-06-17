import { useApp } from '../../store/AppContext.jsx';
import Modal from '../ui/Modal.jsx';
import { fmt, fmtDate } from '../../lib/formatters.js';
import { computeTotals } from '../../lib/calculations.js';

function getShareLink(d) {
  if (!d?.publicId) return '';
  return window.location.origin + window.location.pathname + '#view/' + d.publicId;
}

function buildShareMessage(d, settings) {
  const isQuote = d.type === 'quote';
  const t = computeTotals(d);
  const greeting = d.clientName ? `Hi ${d.clientName.split(' ')[0]},` : 'Hi,';
  const link = getShareLink(d);
  if (isQuote) {
    return `${greeting}\n\nHere's the quote for ${d.project || 'your project'} — ${d.number}.\n\nTotal: ${fmt(t.grand, d.currency)}\nValid until: ${fmtDate(d.dueDate)}\n\nView online: ${link}\n\nLet me know if you have any questions or want to make changes. Once you're happy, just reply to accept and I'll get started.\n\nThanks,\n${settings.business || ''}`;
  }
  return `${greeting}\n\nInvoice ${d.number} for ${d.project || 'our recent work'} is ready.\n\nAmount due: ${fmt(t.grand, d.currency)}\nDue: ${fmtDate(d.dueDate)}\n\nView online: ${link}\n${settings.payment ? '\nPayment details:\n' + settings.payment : ''}\n\nThanks,\n${settings.business || ''}`;
}

function buildShortMessage(d, settings) {
  const isQuote = d.type === 'quote';
  const t = computeTotals(d);
  const link = getShareLink(d);
  const greeting = d.clientName ? `Hi ${d.clientName.split(' ')[0]}, ` : '';
  if (isQuote) return `${greeting}here's the quote for ${d.project || 'your project'} — ${fmt(t.grand, d.currency)}. View: ${link}`;
  return `${greeting}invoice ${d.number} is ready — ${fmt(t.grand, d.currency)} due ${fmtDate(d.dueDate)}. View: ${link}`;
}

async function downloadPDF(d, settings, toast, silent) {
  try {
    const { exportDocPDF } = await import('../../lib/pdf.js');
    exportDocPDF(d, settings);
    if (!silent) toast('PDF downloaded');
  } catch (err) {
    toast('PDF failed: ' + (err.message || 'error'));
  }
}

export default function ShareModal() {
  const { shareDocId, docs, settings, closeShareModal, toast } = useApp();
  const d = docs.find((x) => x.id === shareDocId);
  if (!d) return null;

  const link = getShareLink(d);

  function shareViaEmail() {
    const subject = `${d.type === 'quote' ? 'Quote' : 'Invoice'} ${d.number}${d.project ? ' — ' + d.project : ''}`;
    const body = buildShareMessage(d, settings);
    downloadPDF(d, settings, toast, true);
    setTimeout(() => {
      window.location.href = `mailto:${encodeURIComponent(d.clientEmail || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      toast('PDF downloaded — attach it to the email');
    }, 400);
  }
  function shareViaWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(buildShortMessage(d, settings))}`, '_blank');
    downloadPDF(d, settings, toast, true);
    toast('WhatsApp opened · PDF downloaded');
  }
  function shareViaSMS() {
    window.location.href = `sms:?&body=${encodeURIComponent(buildShortMessage(d, settings))}`;
    toast('Messages opened');
  }
  async function shareViaNative() {
    const msg = buildShortMessage(d, settings);
    if (navigator.share) {
      try {
        await navigator.share({ title: `${d.type === 'quote' ? 'Quote' : 'Invoice'} ${d.number}`, text: msg, url: link });
        toast('Shared');
      } catch (e) { if (e.name !== 'AbortError') toast('Share failed'); }
    } else {
      navigator.clipboard?.writeText(msg);
      toast('Message copied to clipboard');
    }
  }
  function copyShareLink() {
    navigator.clipboard?.writeText(link).then(() => toast('Link copied'));
  }

  return (
    <Modal
      open
      onClose={closeShareModal}
      title="Send to client"
      subtitle={`Sending ${d.type} ${d.number} to ${d.clientName || 'your client'}`}
      actions={(
        <>
          <button className="btn btn-ghost btn-sm" onClick={() => downloadPDF(d, settings, toast)}>↓ Download PDF only</button>
          <button className="btn btn-primary btn-sm" onClick={closeShareModal}>Done</button>
        </>
      )}
    >
      <div className="share-note">
        <strong>📎 Heads up about attachments</strong>
        Browsers can't auto-attach files to email, WhatsApp, or SMS. When you pick an option below, we'll download the PDF for you — just attach it to the message that opens, or share the link instead so your client can view it online.
      </div>

      <div className="field-group">
        <span className="field-label">Message preview</span>
        <div className="share-message">{buildShareMessage(d, settings)}</div>
      </div>

      <div className="field-group">
        <span className="field-label">Shareable link</span>
        <div className="share-link-box">
          <input readOnly value={link} />
          <button className="share-link-copy" onClick={copyShareLink}>Copy</button>
        </div>
      </div>

      <div className="field-label" style={{ marginTop: 18 }}>Send via</div>
      <div className="share-grid">
        <button className="share-btn" onClick={shareViaEmail}>
          <div className="share-btn-icon email"><svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" /></svg></div>
          <div className="share-btn-text"><strong>Email</strong><span>Opens mail app + downloads PDF</span></div>
        </button>
        <button className="share-btn" onClick={shareViaWhatsApp}>
          <div className="share-btn-icon whatsapp"><svg viewBox="0 0 24 24"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.5-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.3 5.2 4.6.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.1-1.3c1.5.8 3.1 1.2 4.9 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2z" /></svg></div>
          <div className="share-btn-text"><strong>WhatsApp</strong><span>Opens WhatsApp with link</span></div>
        </button>
        <button className="share-btn" onClick={shareViaSMS}>
          <div className="share-btn-icon sms"><svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 11H7V9h2v2zm4 0h-2V9h2v2zm4 0h-2V9h2v2z" /></svg></div>
          <div className="share-btn-text"><strong>SMS / Text</strong><span>Opens messages with link</span></div>
        </button>
        <button className="share-btn" onClick={shareViaNative}>
          <div className="share-btn-icon copy"><svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" /></svg></div>
          <div className="share-btn-text"><strong>More / Copy link</strong><span>System share or copy</span></div>
        </button>
      </div>
    </Modal>
  );
}
