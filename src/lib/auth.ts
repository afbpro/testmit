import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

export interface AuthSession {
  email: string;
  loggedAt: string;
}

const AUTH_SESSION_KEY = "cupertino-auth-session";
const LEGACY_HISTORY_KEY = "cupertino-link-history";

function persistSession(session: AuthSession | null) {
  try {
    if (!session) {
      localStorage.removeItem(AUTH_SESSION_KEY);
      return;
    }

    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage errors.
  }
}

function mapSupabaseSession(session: Session | null | undefined): AuthSession | null {
  const email = session?.user?.email?.trim().toLowerCase();

  if (!email) {
    return null;
  }

  return {
    email,
    loggedAt: session?.user?.last_sign_in_at || new Date().toISOString(),
  };
}

export function clearLegacyLinkHistory() {
  try {
    localStorage.removeItem(LEGACY_HISTORY_KEY);
  } catch {
    // Ignore storage cleanup errors.
  }
}

export function getStoredSession(): AuthSession | null {
  try {
    const rawSession = localStorage.getItem(AUTH_SESSION_KEY);

    if (!rawSession) {
      return null;
    }

    const parsedSession = JSON.parse(rawSession) as Partial<AuthSession>;

    if (!parsedSession?.email) {
      return null;
    }

    return {
      email: String(parsedSession.email),
      loggedAt: String(parsedSession.loggedAt || ""),
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<AuthSession | null> {
  if (!supabase || !isSupabaseConfigured) {
    persistSession(null);
    return null;
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    persistSession(null);
    return null;
  }

  const mappedSession = mapSupabaseSession(data.session);
  persistSession(mappedSession);
  return mappedSession;
}

export function subscribeToAuthChanges(onChange: (session: AuthSession | null) => void) {
  if (!supabase || !isSupabaseConfigured) {
    return {
      unsubscribe: () => undefined,
    };
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    const mappedSession = mapSupabaseSession(session);
    persistSession(mappedSession);
    onChange(mappedSession);
  });

  return subscription;
}

export async function signIn(email: string, password: string) {
  if (!supabase || !isSupabaseConfigured) {
    return {
      ok: false as const,
      message: "Configurá VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para iniciar sesión.",
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error || !data.session) {
    return {
      ok: false as const,
      message: error?.message || "Email o contraseña incorrectos",
    };
  }

  const session = mapSupabaseSession(data.session);
  persistSession(session);
  clearLegacyLinkHistory();

  return {
    ok: true as const,
    session,
  };
}

export async function signOut() {
  persistSession(null);

  if (!supabase || !isSupabaseConfigured) {
    return { ok: true as const };
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    return {
      ok: false as const,
      message: error.message,
    };
  }

  return { ok: true as const };
}
