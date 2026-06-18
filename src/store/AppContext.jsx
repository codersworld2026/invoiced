import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { sb } from '../lib/supabase.js';
import { authService } from '../services/authService.js';
import { loadProfile, saveCounters, saveSettings as saveSettingsRemote, DEFAULT_SETTINGS, DEFAULT_COUNTERS } from '../services/settingsService.js';
import { listClients, upsertClient, deleteClient as deleteClientRemote } from '../services/clientsService.js';
import { listDocs, listTemplates, upsertDoc, deleteDoc as deleteDocRemote, upsertTemplate, deleteTemplate as deleteTemplateRemote } from '../services/docsService.js';
import { listExpenses, upsertExpense, deleteExpense as deleteExpenseRemote } from '../services/expensesService.js';
import { listCashflow, upsertCashflow, deleteCashflow as deleteCashflowRemote } from '../services/cashflowService.js';
import { uid, publicId } from '../lib/ids.js';

// Shared app state — the React replacement for the monolith's global `state`
// object plus its routing/auth flags. Pages read/update via useApp().
const AppContext = createContext(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within <AppProvider>');
  return ctx;
}

const isPublicViewHash = () => window.location.hash.startsWith('#view/');

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authStatus, setAuthStatus] = useState('loading'); // 'loading' | 'authed' | 'guest'
  const [screen, setScreen] = useState('landing');
  const [currentDocId, setCurrentDocId] = useState(null);
  const [editorDoc, setEditorDoc] = useState(null); // working copy for the editor
  const [shareDocId, setShareDocId] = useState(null); // doc shown in the share modal
  const [dashFilter, setDashFilter] = useState('all'); // dashboard document filter (shared so Outstanding can jump to it)
  const [loadingMsg, setLoadingMsg] = useState('Checking sign-in…');

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [counters, setCounters] = useState(DEFAULT_COUNTERS);
  const [clients, setClients] = useState([]);
  const [docs, setDocs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [cashflow, setCashflow] = useState([]);
  const [templates, setTemplates] = useState([]);

  const [toastMsg, setToastMsg] = useState('');
  const [authGate, setAuthGate] = useState({ open: false, mode: 'signin' });
  const toastTimer = useRef(null);

  // Always-current docs/settings/counters for use inside callbacks (avoids
  // stale closures when actions chain, e.g. send → open share modal).
  const docsRef = useRef(docs);
  useEffect(() => { docsRef.current = docs; }, [docs]);
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  const countersRef = useRef(counters);
  useEffect(() => { countersRef.current = counters; }, [counters]);
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // route hash for public share links (#view/<publicId>)
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 2600);
  }, []);

  const navigate = useCallback((name) => {
    setScreen(name);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openAuth = useCallback((mode = 'signin') => setAuthGate({ open: true, mode }), []);
  const closeAuth = useCallback(() => setAuthGate((g) => ({ ...g, open: false })), []);

  const loadAllData = useCallback(async (currentUser) => {
    const [profile, cl, dc, ex, cf, tpl] = await Promise.all([
      loadProfile(currentUser.id),
      listClients(),
      listDocs(),
      listExpenses(),
      listCashflow(),
      listTemplates(),
    ]);
    // Age sent invoices past their due date to 'overdue', and persist the change
    // (ported from the monolith's checkOverdue, run on load).
    const today = new Date().toISOString().slice(0, 10);
    const toAge = dc.filter((d) => d.type === 'invoice' && d.status === 'sent' && d.dueDate && d.dueDate < today);
    toAge.forEach((d) => { d.status = 'overdue'; });
    if (toAge.length) {
      Promise.all(toAge.map((d) => upsertDoc(d, currentUser.id, profile.settings))).catch((e) => console.error(e));
    }
    setSettings(profile.settings);
    setCounters(profile.counters);
    setClients(cl);
    setDocs(dc);
    setExpenses(ex);
    setCashflow(cf);
    setTemplates(tpl);
  }, []);

  // ---- document actions (shared by Dashboard / Detail / Editor) ----
  const openDoc = useCallback((id) => {
    setCurrentDocId(id);
    setScreen('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const removeDoc = useCallback(async (id) => {
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    setDocs((prev) => prev.filter((d) => d.id !== id));
    setExpenses((prev) => prev.map((e) => (e.docId === id ? { ...e, docId: null } : e)));
    try { await deleteDocRemote(id); toast('Deleted'); }
    catch (err) { toast('Delete failed: ' + (err.message || 'error')); }
  }, [toast]);

  const duplicateDoc = useCallback(async (id) => {
    const src = docs.find((d) => d.id === id);
    if (!src || !user) return;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = uid();
    copy.publicId = null;
    copy.status = 'draft';
    copy.createdAt = Date.now();
    copy.acceptedAt = null; copy.paidAt = null; copy.linkedInvoiceId = null;
    const nextCounters = { ...counters };
    if (copy.type === 'quote') { nextCounters.quote += 1; copy.number = `Q-2026-${String(nextCounters.quote).padStart(4, '0')}`; }
    else { nextCounters.invoice += 1; copy.number = `INV-2026-${String(nextCounters.invoice).padStart(4, '0')}`; }
    setDocs((prev) => [copy, ...prev]);
    setCounters(nextCounters);
    try {
      await upsertDoc(copy, user.id, settings);
      await saveCounters(nextCounters, user.id);
      toast('Duplicated as draft');
    } catch (err) {
      toast('Duplicate failed: ' + (err.message || 'error'));
    }
  }, [docs, user, counters, settings, toast]);

  // ---- editor lifecycle ----
  // Start a new document (increments the in-memory counter, like the monolith;
  // it's persisted on save).
  const newDoc = useCallback((type = 'quote') => {
    const today = new Date().toISOString().slice(0, 10);
    const due = new Date(); due.setDate(due.getDate() + 14);
    const next = { ...countersRef.current };
    let number;
    if (type === 'quote') { next.quote += 1; number = `Q-2026-${String(next.quote).padStart(4, '0')}`; }
    else { next.invoice += 1; number = `INV-2026-${String(next.invoice).padStart(4, '0')}`; }
    setCounters(next);
    const s = settingsRef.current;
    setEditorDoc({
      id: uid(), publicId: null, type, status: 'draft', number,
      clientName: '', clientEmail: '', project: '',
      issueDate: today, dueDate: due.toISOString().slice(0, 10),
      currency: s.currency, tax: s.tax, taxLabel: s.taxLabel,
      lines: [{ desc: '', qty: 1, rate: 0, cost: 0 }],
      notes: s.notes, hideItemPricing: false,
      createdAt: Date.now(), acceptedAt: null, paidAt: null, linkedInvoiceId: null,
    });
    setScreen('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const editDoc = useCallback((id) => {
    const src = docsRef.current.find((d) => d.id === id);
    if (!src) return;
    const copy = JSON.parse(JSON.stringify(src));
    copy.lines = (copy.lines || []).map((l) => ({ ...l, cost: l.cost === undefined ? 0 : l.cost }));
    setEditorDoc(copy);
    setScreen('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Upsert a doc into state + DB, add the client if new, persist counters.
  const saveDoc = useCallback(async (doc) => {
    const u = userRef.current;
    setDocs((prev) => {
      const i = prev.findIndex((d) => d.id === doc.id);
      if (i >= 0) { const copy = [...prev]; copy[i] = doc; return copy; }
      return [doc, ...prev];
    });
    await upsertDoc(doc, u.id, settingsRef.current);
    // add client if it's a new name
    if (doc.clientName) {
      const exists = clients.some((c) => c.name.toLowerCase() === doc.clientName.toLowerCase());
      if (!exists) {
        const client = { id: uid(), name: doc.clientName, email: doc.clientEmail, address: '' };
        setClients((prev) => [...prev, client]);
        try { await upsertClient(client, u.id); } catch (e) { console.error(e); }
      }
    }
    try { await saveCounters(countersRef.current, u.id); } catch (e) { console.error(e); }
  }, [clients]);

  const markPaid = useCallback(async (id) => {
    const doc = docsRef.current.find((x) => x.id === id); if (!doc) return;
    const next = { ...doc, status: 'paid', paidAt: Date.now() };
    setDocs((prev) => prev.map((d) => (d.id === id ? next : d)));
    try { await upsertDoc(next, userRef.current.id, settingsRef.current); toast('Marked as paid — nice one!'); }
    catch (err) { toast('Save failed: ' + (err.message || 'error')); }
  }, [toast]);

  const simulateDecline = useCallback(async (id) => {
    const doc = docsRef.current.find((x) => x.id === id); if (!doc) return;
    const next = { ...doc, status: 'declined' };
    setDocs((prev) => prev.map((d) => (d.id === id ? next : d)));
    try { await upsertDoc(next, userRef.current.id, settingsRef.current); toast('Marked as declined'); }
    catch (err) { toast('Save failed: ' + (err.message || 'error')); }
  }, [toast]);

  // Turn an accepted (or about-to-be-accepted) quote into an invoice. Idempotent.
  // Carries over the Batch-1 fix: works whether the quote was accepted here or
  // remotely by the client via the public link.
  const convertToInvoice = useCallback(async (quoteId) => {
    const quote = docsRef.current.find((d) => d.id === quoteId);
    if (!quote || quote.type !== 'quote') return;
    if (quote.linkedInvoiceId && docsRef.current.find((d) => d.id === quote.linkedInvoiceId)) {
      openDoc(quote.linkedInvoiceId); return;
    }
    const updatedQuote = { ...quote };
    if (updatedQuote.status !== 'accepted') { updatedQuote.status = 'accepted'; updatedQuote.acceptedAt = updatedQuote.acceptedAt || Date.now(); }
    const next = { ...countersRef.current, invoice: countersRef.current.invoice + 1 };
    const due = new Date(); due.setDate(due.getDate() + 14);
    const invoice = {
      ...JSON.parse(JSON.stringify(updatedQuote)),
      id: uid(), publicId: publicId(), type: 'invoice', status: 'sent',
      number: `INV-2026-${String(next.invoice).padStart(4, '0')}`,
      createdAt: Date.now(), acceptedAt: null, paidAt: null, linkedInvoiceId: null,
      issueDate: new Date().toISOString().slice(0, 10), dueDate: due.toISOString().slice(0, 10),
    };
    updatedQuote.linkedInvoiceId = invoice.id;
    setDocs((prev) => [invoice, ...prev.map((d) => (d.id === quoteId ? updatedQuote : d))]);
    setCounters(next);
    try {
      const u = userRef.current, s = settingsRef.current;
      await upsertDoc(invoice, u.id, s);
      await upsertDoc(updatedQuote, u.id, s);
      await saveCounters(next, u.id);
      toast('Invoice ' + invoice.number + ' created');
      openDoc(invoice.id);
    } catch (err) { toast('Convert failed: ' + (err.message || 'error')); }
  }, [openDoc, toast]);

  // ---- sharing ----
  // Promote a draft to 'sent' + ensure a publicId so the share link resolves
  // (Batch-1 fix: get_shared_doc hides drafts). Returns the (possibly updated) doc.
  const ensureShareable = useCallback(async (doc) => {
    let changed = false;
    const next = { ...doc };
    if (next.status === 'draft') { next.status = 'sent'; changed = true; }
    if (!next.publicId) { next.publicId = publicId(); changed = true; }
    if (changed) {
      setDocs((prev) => {
        const i = prev.findIndex((d) => d.id === next.id);
        if (i >= 0) { const copy = [...prev]; copy[i] = next; return copy; }
        return [next, ...prev];
      });
      try { await upsertDoc(next, userRef.current.id, settingsRef.current); }
      catch (err) { toast('Could not create share link'); }
    }
    return next;
  }, [toast]);

  const openShareModal = useCallback(async (arg) => {
    let doc = typeof arg === 'string' ? docsRef.current.find((x) => x.id === arg) : arg;
    if (!doc) return;
    doc = await ensureShareable(doc);
    setShareDocId(doc.id);
  }, [ensureShareable]);
  const closeShareModal = useCallback(() => setShareDocId(null), []);

  // ---- line templates ----
  const saveTemplate = useCallback(async (line) => {
    if (!line.desc) { toast('Add a description first'); return; }
    const rate = parseFloat(line.rate) || 0;
    const exists = templates.find((t) => t.desc.toLowerCase() === line.desc.toLowerCase() && t.rate === rate);
    if (exists) { toast('Already saved as template'); return; }
    const t = { id: uid(), desc: line.desc, rate, cost: parseFloat(line.cost) || 0 };
    setTemplates((prev) => [t, ...prev]);
    try { await upsertTemplate(t, userRef.current.id); toast('Saved to templates'); }
    catch { setTemplates((prev) => prev.filter((x) => x.id !== t.id)); }
  }, [templates, toast]);

  const removeTemplate = useCallback(async (id) => {
    const prev = templates;
    setTemplates((p) => p.filter((t) => t.id !== id));
    try { await deleteTemplateRemote(id); toast('Template removed'); }
    catch { setTemplates(prev); }
  }, [templates, toast]);

  // ---- settings + clients + reset ----
  // Persist a full settings object. Callers handle their own success toast.
  const persistSettings = useCallback(async (newSettings) => {
    setSettings(newSettings);
    await saveSettingsRemote(newSettings, countersRef.current, userRef.current.id);
  }, []);

  const saveClient = useCallback(async (client) => {
    setClients((prev) => {
      const i = prev.findIndex((c) => c.id === client.id);
      if (i >= 0) { const copy = [...prev]; copy[i] = client; return copy; }
      return [...prev, client];
    });
    try { await upsertClient(client, userRef.current.id); toast('Client saved'); }
    catch (err) { toast('Client save failed: ' + (err.message || 'error')); }
  }, [toast]);

  const removeClient = useCallback(async (id) => {
    if (!window.confirm('Remove this client? Their past documents will stay.')) return;
    setClients((prev) => prev.filter((c) => c.id !== id));
    try { await deleteClientRemote(id); toast('Client removed'); }
    catch (err) { toast('Client delete failed: ' + (err.message || 'error')); }
  }, [toast]);

  // ---- expenses ----
  const saveExpense = useCallback(async (exp) => {
    setExpenses((prev) => {
      const i = prev.findIndex((e) => e.id === exp.id);
      if (i >= 0) { const copy = [...prev]; copy[i] = exp; return copy; }
      return [...prev, exp];
    });
    try { await upsertExpense(exp, userRef.current.id); toast('Expense saved'); }
    catch (err) { toast('Expense save failed: ' + (err.message || 'error')); }
  }, [toast]);

  const removeExpense = useCallback(async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    try { await deleteExpenseRemote(id); toast('Expense deleted'); }
    catch (err) { toast('Delete failed: ' + (err.message || 'error')); }
  }, [toast]);

  // ---- cashflow ----
  const saveCashflow = useCallback(async (entry) => {
    setCashflow((prev) => {
      const i = prev.findIndex((c) => c.id === entry.id);
      if (i >= 0) { const copy = [...prev]; copy[i] = entry; return copy; }
      return [...prev, entry];
    });
    try { await upsertCashflow(entry, userRef.current.id); toast('Saved'); }
    catch (err) { toast('Save failed: ' + (err.message || 'error')); }
  }, [toast]);

  const removeCashflow = useCallback(async (id) => {
    if (!window.confirm('Delete this adjustment?')) return;
    setCashflow((prev) => prev.filter((c) => c.id !== id));
    try { await deleteCashflowRemote(id); toast('Deleted'); }
    catch (err) { toast('Delete failed: ' + (err.message || 'error')); }
  }, [toast]);

  const resetAll = useCallback(async () => {
    if (!window.confirm('This wipes ALL your data — clients, docs, expenses. Your account stays active. Sure?')) return;
    const u = userRef.current;
    try {
      const results = await Promise.all([
        sb.from('docs').delete().eq('user_id', u.id),
        sb.from('clients').delete().eq('user_id', u.id),
        sb.from('expenses').delete().eq('user_id', u.id),
        sb.from('cashflow').delete().eq('user_id', u.id),
        sb.from('line_templates').delete().eq('user_id', u.id),
      ]);
      const firstErr = results.find((r) => r.error);
      if (firstErr) throw firstErr.error;
      setClients([]); setDocs([]); setExpenses([]); setCashflow([]); setTemplates([]);
      toast('Reset complete'); navigate('landing');
    } catch (err) {
      toast('Reset failed: ' + (err.message || 'unknown error'));
    }
  }, [toast, navigate]);

  const bootAuthed = useCallback(async (currentUser) => {
    setUser(currentUser);
    setAuthStatus('loading');
    setLoadingMsg('Loading your workspace…');
    try {
      await loadAllData(currentUser);
    } catch (err) {
      console.error(err);
      toast("Couldn't load your data: " + (err.message || 'unknown error'));
    }
    setAuthStatus('authed');
    setAuthGate((g) => ({ ...g, open: false }));
    if (!isPublicViewHash()) setScreen('dash');
  }, [loadAllData, toast]);

  const bootSignedOut = useCallback(() => {
    setUser(null);
    setSettings(DEFAULT_SETTINGS);
    setCounters(DEFAULT_COUNTERS);
    setClients([]); setDocs([]); setExpenses([]); setCashflow([]); setTemplates([]);
    setAuthStatus('guest');
    if (!isPublicViewHash()) setScreen('landing');
  }, []);

  // Boot: restore session, then subscribe to auth changes.
  useEffect(() => {
    let sub;
    (async () => {
      const { data: { session } } = await authService.getSession();
      if (session?.user) await bootAuthed(session.user);
      else bootSignedOut();

      const res = authService.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Boot only when the signed-in user actually changed (ignore token
          // refreshes / duplicate events). Use the ref, NOT a setUser updater —
          // calling bootAuthed inside an updater that returns `prev` left the
          // store's `user` null after interactive sign-in, breaking every write.
          if (!userRef.current || userRef.current.id !== session.user.id) bootAuthed(session.user);
        } else if (event === 'SIGNED_OUT') {
          bootSignedOut();
        }
      });
      sub = res.data?.subscription;
    })();
    return () => sub?.unsubscribe?.();
  }, [bootAuthed, bootSignedOut]);

  // Reflect auth state on <body> so the legacy signed-in/out CSS rules still work.
  useEffect(() => {
    document.body.classList.toggle('signed-in', authStatus === 'authed');
    document.body.classList.toggle('signed-out', authStatus !== 'authed');
  }, [authStatus]);

  const signOut = useCallback(async () => {
    if (!window.confirm('Sign out of invoiced?')) return;
    await authService.signOut();
  }, []);

  const value = {
    // identity + routing
    user, authStatus, screen, navigate, loadingMsg, hash,
    currentDocId, setCurrentDocId, openDoc,
    // data
    settings, setSettings, counters, setCounters,
    clients, setClients, docs, setDocs, expenses, setExpenses,
    cashflow, setCashflow, templates, setTemplates,
    // actions
    toast, toastMsg, authGate, openAuth, closeAuth, signOut,
    loadAllData, removeDoc, duplicateDoc,
    // editor / detail lifecycle
    editorDoc, newDoc, editDoc, saveDoc, markPaid, simulateDecline, convertToInvoice,
    saveTemplate, removeTemplate,
    // sharing
    shareDocId, openShareModal, closeShareModal,
    // settings + clients
    persistSettings, saveClient, removeClient, resetAll,
    // expenses + cashflow + dashboard filter
    saveExpense, removeExpense, saveCashflow, removeCashflow,
    dashFilter, setDashFilter,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
