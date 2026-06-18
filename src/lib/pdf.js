import { jsPDF } from 'jspdf';
import { fmt, fmtDate } from './formatters.js';
import { computeTotals } from './calculations.js';

// Generates and downloads an A4 PDF for a quote/invoice.
// Faithful port of the original exportPDF(); takes the document and the
// business settings explicitly instead of reading global state.
// Returns true on success. The caller is responsible for any toast/UI.
export function exportDocPDF(doc, settings) {
  if (!doc) return false;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const t = computeTotals(doc);
  const isQuote = doc.type === 'quote';
  const pageW = 210, margin = 18;
  const contentW = pageW - margin * 2;
  let y = margin;

  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(28); pdf.setTextColor(10);
  pdf.text(isQuote ? 'Quotation' : 'Invoice', margin, y + 8);
  // brand accent rule under the title
  pdf.setDrawColor(255, 77, 28); pdf.setLineWidth(1.4);
  pdf.line(margin, y + 11.5, margin + 26, y + 11.5);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(120);
  pdf.text('#' + doc.number, margin, y + 17);

  const logo = settings.logo;
  let brandBottom = y + 15;
  if (logo) {
    try {
      const props = pdf.getImageProperties(logo);
      const maxW = 40, maxH = 18;
      const ratio = props.width / props.height;
      let w = maxW, h = maxW / ratio;
      if (h > maxH) { h = maxH; w = maxH * ratio; }
      pdf.addImage(logo, 'PNG', pageW - margin - w, y, w, h);
      let textY = y + h + 4;
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.setTextColor(10);
      pdf.text(settings.business, pageW - margin, textY, { align: 'right' });
      if (settings.email) {
        textY += 4;
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(120);
        pdf.text(settings.email, pageW - margin, textY, { align: 'right' });
      }
      brandBottom = textY;
    } catch (err) {
      console.error('logo failed, falling back to text', err);
      pdf.setTextColor(10); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13);
      pdf.text(settings.business, pageW - margin, y + 6, { align: 'right' });
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(120);
      if (settings.email) pdf.text(settings.email, pageW - margin, y + 11, { align: 'right' });
    }
  } else {
    pdf.setTextColor(10); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13);
    pdf.text('invoiced.', pageW - margin, y + 6, { align: 'right' });
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(120);
    pdf.text(settings.business, pageW - margin, y + 11, { align: 'right' });
    if (settings.email) pdf.text(settings.email, pageW - margin, y + 15, { align: 'right' });
  }

  y = Math.max(y + 22, brandBottom + 4);
  pdf.setDrawColor(10); pdf.setLineWidth(0.5);
  pdf.line(margin, y, pageW - margin, y);
  y += 8;

  pdf.setTextColor(120); pdf.setFontSize(8);
  pdf.text('BILLED TO', margin, y);
  pdf.text((isQuote ? 'VALID UNTIL' : 'DUE'), pageW - margin, y, { align: 'right' });
  y += 5;
  pdf.setTextColor(10); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11);
  pdf.text(doc.clientName || '—', margin, y);
  pdf.setFont('helvetica', 'normal');
  pdf.text(fmtDate(doc.dueDate), pageW - margin, y, { align: 'right' });
  y += 5;
  pdf.setFontSize(9); pdf.setTextColor(120);
  if (doc.clientEmail) { pdf.text(doc.clientEmail, margin, y); y += 4; }
  pdf.text('Issued ' + fmtDate(doc.issueDate), pageW - margin, y, { align: 'right' });
  y += 4;
  if (doc.project) {
    pdf.setTextColor(10); pdf.setFont('helvetica', 'italic');
    pdf.text('Project: ' + doc.project, margin, y);
    pdf.setFont('helvetica', 'normal');
    y += 4;
  }
  y += 6;

  pdf.setDrawColor(10); pdf.setLineWidth(0.3);
  pdf.line(margin, y, pageW - margin, y);
  y += 5;
  pdf.setTextColor(120); pdf.setFontSize(8);
  pdf.text('DESCRIPTION', margin, y);
  if (!doc.hideItemPricing) {
    pdf.text('QTY', margin + contentW * 0.55, y, { align: 'center' });
    pdf.text('RATE', margin + contentW * 0.75, y, { align: 'right' });
    pdf.text('AMOUNT', pageW - margin, y, { align: 'right' });
  }
  y += 3;
  pdf.line(margin, y, pageW - margin, y);
  y += 6;

  pdf.setFontSize(10); pdf.setTextColor(10);
  (doc.lines || []).forEach((l) => {
    if (y > 240) { pdf.addPage(); y = margin; }
    const descWidth = doc.hideItemPricing ? contentW : contentW * 0.5;
    const descLines = pdf.splitTextToSize(l.desc || '—', descWidth);
    pdf.setFont('helvetica', 'bold');
    pdf.text(descLines, margin, y);
    if (!doc.hideItemPricing) {
      const lineAmt = (parseFloat(l.qty) || 0) * (parseFloat(l.rate) || 0);
      pdf.setFont('helvetica', 'normal');
      pdf.text(String(l.qty), margin + contentW * 0.55, y, { align: 'center' });
      pdf.text(fmt(l.rate, doc.currency), margin + contentW * 0.75, y, { align: 'right' });
      pdf.text(fmt(lineAmt, doc.currency), pageW - margin, y, { align: 'right' });
    }
    y += 5 * descLines.length + 2;
    pdf.setDrawColor(220);
    pdf.line(margin, y, pageW - margin, y);
    y += 4;
  });

  y += 4;
  const totalsX = pageW - margin - 70;
  pdf.setFontSize(10);
  if (!doc.hideItemPricing) {
    pdf.text('Subtotal', totalsX, y);
    pdf.text(fmt(t.sub, doc.currency), pageW - margin, y, { align: 'right' });
    y += 6;
    pdf.text(`${doc.taxLabel} (${doc.tax}%)`, totalsX, y);
    pdf.text(fmt(t.tax, doc.currency), pageW - margin, y, { align: 'right' });
    y += 4;
  }
  pdf.setDrawColor(10); pdf.setLineWidth(0.5);
  pdf.line(totalsX, y, pageW - margin, y);
  y += 7;
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14);
  pdf.text('Total', totalsX, y);
  pdf.text(fmt(t.grand, doc.currency), pageW - margin, y, { align: 'right' });

  y += 16;
  if (doc.notes) {
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(100);
    const notes = pdf.splitTextToSize(doc.notes, contentW);
    pdf.text(notes, margin, y);
    y += notes.length * 4 + 4;
  }
  if (!isQuote && settings.payment) {
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(10);
    pdf.text('Payment details', margin, y);
    y += 4;
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(100);
    const pay = pdf.splitTextToSize(settings.payment, contentW);
    pdf.text(pay, margin, y);
  }

  if (doc.status === 'paid') {
    pdf.setTextColor(0, 184, 104); pdf.setFont('helvetica', 'bolditalic'); pdf.setFontSize(48);
    pdf.text('PAID', pageW - 60, 80, { angle: -12 });
  }

  pdf.save(`${doc.number}-${(doc.clientName || 'client').replace(/[^a-z0-9]/gi, '_')}.pdf`);
  return true;
}
