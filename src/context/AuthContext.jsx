import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { customerRequest } from '../lib/api.js';
import { supabase } from '../lib/supabase.js';

const AuthContext = createContext({ user: null });

const INVALID_LOGIN = "That email and password don't match. Try again or reset your password.";

// Shoppers sign in with BigCommerce. The store admin signs in with Supabase through the same form.
const asUser = (c) => ({
  id: `customer-${c.id}`,
  email: c.email,
  isCustomer: true,
  user_metadata: { full_name: [c.firstName, c.lastName].filter(Boolean).join(' ') },
});

export function AuthProvider({ children }) {
  const [adminUser, setAdminUser] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [sessionReady, setSessionReady] = useState(!supabase);
  const [customerReady, setCustomerReady] = useState(false);
  const [adminCheck, setAdminCheck] = useState({ userId: null, isAdmin: false });

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setAdminUser(data.session?.user ?? null);
      setSessionReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setAdminUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    customerRequest()
      .then((r) => setCustomer(r.customer))
      .catch(() => {})
      .finally(() => setCustomerReady(true));
  }, []);

  // Only decides what to show. The database and server functions enforce what an admin can do.
  const adminId = adminUser?.id;
  useEffect(() => {
    if (!adminId) return;
    let alive = true;
    supabase.rpc('is_admin').then(({ data }) => {
      if (alive) setAdminCheck({ userId: adminId, isAdmin: data === true });
    });
    return () => {
      alive = false;
    };
  }, [adminId]);

  const signIn = useCallback(async (email, password) => {
    try {
      const { customer: signedIn } = await customerRequest({ action: 'login', email, password });
      setCustomer(signedIn);
    } catch (err) {
      if (err.status !== 401) throw err;
      const result = await supabase?.auth.signInWithPassword({ email, password });
      if (!result || result.error) throw new Error(INVALID_LOGIN);
    }
  }, []);

  const signUp = useCallback(async ({ firstName, lastName, email, password }) => {
    const { customer: created } = await customerRequest({ action: 'register', firstName, lastName, email, password });
    setCustomer(created);
  }, []);

  const signOut = useCallback(async () => {
    setCustomer(null);
    await Promise.allSettled([customerRequest({ action: 'logout' }), supabase?.auth.signOut()]);
  }, []);

  const value = useMemo(() => {
    const isAdmin = Boolean(adminId) && adminCheck.userId === adminId && adminCheck.isAdmin;
    return {
      user: adminUser ?? (customer ? asUser(customer) : null),
      isAdmin,
      ready: sessionReady && customerReady && (!adminId || adminCheck.userId === adminId),
      signIn,
      signUp,
      signOut,
    };
  }, [adminUser, customer, adminId, adminCheck, sessionReady, customerReady, signIn, signUp, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
