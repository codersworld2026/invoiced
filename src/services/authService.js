import { sb } from '../lib/supabase.js';

// Thin wrapper around Supabase auth. UI/state lives in the store + AuthGate.
export const authService = {
  signUp(email, password) {
    return sb.auth.signUp({ email, password });
  },
  signIn(email, password) {
    return sb.auth.signInWithPassword({ email, password });
  },
  signOut() {
    return sb.auth.signOut();
  },
  resetPassword(email, redirectTo) {
    return sb.auth.resetPasswordForEmail(email, { redirectTo });
  },
  getSession() {
    return sb.auth.getSession();
  },
  onAuthStateChange(cb) {
    return sb.auth.onAuthStateChange(cb);
  },
};
