export interface AuthSession {
  email: string;
  loggedAt: string;
}

const AUTH_SESSION_KEY = "cupertino-auth-session";
const LEGACY_HISTORY_KEY = "cupertino-link-history";
const DEFAULT_LOGIN_EMAIL = "demo@cupertino.com";
const DEFAULT_LOGIN_PASSWORD = "colega123";

export function getAuthConfig() {
  return {
    email: (import.meta.env.VITE_LOGIN_EMAIL || DEFAULT_LOGIN_EMAIL).trim().toLowerCase(),
    password: import.meta.env.VITE_LOGIN_PASSWORD || DEFAULT_LOGIN_PASSWORD,
  };
}

export function clearLegacyLinkHistory() {
  try {
    localStorage.removeItem(LEGACY_HISTORY_KEY);
  } catch {
    // Ignore storage cleanup errors.
  }
}

export function getSession(): AuthSession | null {
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

export function signIn(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const config = getAuthConfig();

  if (normalizedEmail !== config.email || password !== config.password) {
    return {
      ok: false as const,
      message: "Email o contraseña incorrectos",
    };
  }

  const session: AuthSession = {
    email: normalizedEmail,
    loggedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    clearLegacyLinkHistory();

    return {
      ok: true as const,
      session,
    };
  } catch {
    return {
      ok: false as const,
      message: "No se pudo guardar la sesión",
    };
  }
}

export function signOut() {
  try {
    localStorage.removeItem(AUTH_SESSION_KEY);
  } catch {
    // Ignore storage cleanup errors.
  }
}
