import { useApp } from './store/AppContext.jsx';
import Topbar from './components/layout/Topbar.jsx';
import Toast from './components/ui/Toast.jsx';
import AuthGate from './components/auth/AuthGate.jsx';
import ShareModal from './components/invoice/ShareModal.jsx';
import Landing from './pages/Landing.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Detail from './pages/Detail.jsx';
import Editor from './pages/Editor.jsx';
import Clients from './pages/Clients.jsx';
import Settings from './pages/Settings.jsx';
import Outstanding from './pages/Outstanding.jsx';
import Profit from './pages/Profit.jsx';
import Cashflow from './pages/Cashflow.jsx';
import PublicView from './pages/PublicView.jsx';

const SCREENS = {
  landing: Landing,
  dash: Dashboard,
  detail: Detail,
  editor: Editor,
  clients: Clients,
  settings: Settings,
  outstanding: Outstanding,
  profit: Profit,
  cashflow: Cashflow,
};

export default function App() {
  const { authStatus, screen, hash, loadingMsg } = useApp();

  // Public share links render standalone, no topbar, no auth required.
  if (hash.startsWith('#view/')) {
    return <PublicView publicId={hash.slice(6)} />;
  }

  if (authStatus === 'loading') {
    return (
      <div className="loading-gate active">
        <div className="spinner" />
        <p>{loadingMsg}</p>
      </div>
    );
  }

  // Guests only ever see the landing page (nav is hidden when signed out).
  const Screen = authStatus === 'authed' ? (SCREENS[screen] || Dashboard) : Landing;

  return (
    <>
      <Topbar />
      <Screen />
      <AuthGate />
      <ShareModal />
      <Toast />
    </>
  );
}
