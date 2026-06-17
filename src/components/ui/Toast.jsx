import { useApp } from '../../store/AppContext.jsx';

// Bottom-center toast, driven by store.toastMsg.
export default function Toast() {
  const { toastMsg } = useApp();
  return <div className={`toast${toastMsg ? ' show' : ''}`}>{toastMsg}</div>;
}
