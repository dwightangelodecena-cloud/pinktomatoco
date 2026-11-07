import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

const AuthContext = createContext({ user: null });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [sessionReady, setSessionReady] = useState(!supabase);
  const [adminCheck, setAdminCheck] = useState({ userId: null, isAdmin: false });

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setSessionReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  // Only decides what to show. The database enforces what an admin can actually do.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    supabase.rpc('is_admin').then(({ data }) => {
      if (alive) setAdminCheck({ userId, isAdmin: data === true });
    });
    return () => {
      alive = false;
    };
  }, [userId]);

  const isAdmin = Boolean(userId) && adminCheck.userId === userId && adminCheck.isAdmin;
  const ready = sessionReady && (!userId || adminCheck.userId === userId);

  const signOut = () => supabase?.auth.signOut();

  return <AuthContext.Provider value={{ user, isAdmin, ready, signOut }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
