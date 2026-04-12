export interface AuthSession {
  id?: number;
  username?: string;
  email: string;
  role?: string;
  loggedAt: string;
}

const AUTH_SESSION_KEY = "cupertino-auth-session";
const LEGACY_HISTORY_KEY = "cupertino-link-history";
const AUTH_SESSION_ID_KEY = "cupertino-auth-session-id";
const AUTH_API_BASE = "https://app.cupertino.uy/api";

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

function isAllowedLocalHost(hostname: string) {
  const host = hostname.trim().toLowerCase();

  if (host === "localhost" || host === "127.0.0.1") {
    return true;
  }

  const match = /^192\.168\.1\.(\d{1,3})$/.exec(host);
  if (!match) {
    return false;
  }

  const lastOctet = Number(match[1]);
  return Number.isInteger(lastOctet) && lastOctet >= 0 && lastOctet <= 255;
}

export function canUseLocalDevCredentials() {
  return false;
}

function getAuthEndpoint(action: "login" | "logout") {
  try {
    const normalizedBase = AUTH_API_BASE.replace(/\/+$/, "") || "https://app.cupertino.uy/api";
    const url = new URL(`${normalizedBase}/${action}`);
    return url.toString();
  } catch {
    return `https://app.cupertino.uy/api/${action}`;
  }
}

function parseErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const message = (payload as { message?: unknown }).message;
  return typeof message === "string" && message.trim() ? message : fallback;
}

export function clearLegacyLinkHistory() {
  try {
    localStorage.removeItem(LEGACY_HISTORY_KEY);
  } catch {
    // Ignore storage cleanup errors.
  }
}

function getStoredSessionId(): string {
  try {
    return (localStorage.getItem(AUTH_SESSION_ID_KEY) || "").trim();
  } catch {
    return "";
  }
}

function setStoredSessionId(sessionId: string) {
  try {
    if (!sessionId.trim()) {
      localStorage.removeItem(AUTH_SESSION_ID_KEY);
      return;
    }

    localStorage.setItem(AUTH_SESSION_ID_KEY, sessionId.trim());
  } catch {
    // Ignore storage errors.
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
      id: parsedSession.id ? Number(parsedSession.id) : undefined,
      username: parsedSession.username ? String(parsedSession.username) : undefined,
      email: String(parsedSession.email),
      role: parsedSession.role ? String(parsedSession.role) : undefined,
      loggedAt: String(parsedSession.loggedAt || ""),
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<AuthSession | null> {
  return getStoredSession();
}

export function subscribeToAuthChanges(onChange: (session: AuthSession | null) => void) {
  return {
    unsubscribe: () => {
      onChange(getStoredSession());
    },
  };
}

export async function signIn(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const response = await fetch(getAuthEndpoint("login"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        email: normalizedEmail,
        password,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          ok?: boolean;
          message?: string;
          session_id?: string;
          user?: { id?: number; username?: string; email?: string; role?: string };
        }
      | null;

    if (!response.ok || !payload?.ok) {
      const fallbackMessage = response.status === 401 ? "Email o contraseña incorrectos" : "No se pudo iniciar sesión";
      return {
        ok: false as const,
        message: parseErrorMessage(payload, fallbackMessage),
      };
    }

    const sessionEmail = (payload.user?.email || normalizedEmail).trim().toLowerCase();
    const session: AuthSession = {
      id: payload.user?.id ? Number(payload.user.id) : undefined,
      username: payload.user?.username ? String(payload.user.username) : undefined,
      email: sessionEmail,
      role: payload.user?.role ? String(payload.user.role) : undefined,
      loggedAt: new Date().toISOString(),
    };

    persistSession(session);
    setStoredSessionId(payload.session_id || "");
    clearLegacyLinkHistory();

    return {
      ok: true as const,
      session,
    };
  } catch {
    return {
      ok: false as const,
      message: "No se pudo conectar con el servidor de autenticación",
    };
  }
}

export async function signOut() {
  try {
    const sessionId = getStoredSessionId();
    const headers: Record<string, string> = {};
    if (sessionId) {
      headers["X-Session-Id"] = sessionId;
    }

    const response = await fetch(getAuthEndpoint("logout"), {
      method: "POST",
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      persistSession(null);
      return {
        ok: false as const,
        message:
          payload?.message && payload.message.trim()
            ? payload.message
            : "No se pudo cerrar la sesión en el servidor",
      };
    }
  } catch {
    persistSession(null);
    return {
      ok: false as const,
      message: "No se pudo conectar con el servidor para cerrar sesión",
    };
  }

  persistSession(null);
  setStoredSessionId("");

  return {
    ok: true as const,
  };
}

export async function authApiRequest<T>(path: string, body: unknown): Promise<T> {
  const normalizedBase = AUTH_API_BASE.replace(/\/+$/, "") || "https://app.cupertino.uy/api";
  const normalizedPath = path.replace(/^\/+/, "");
  const url = `${normalizedBase}/${normalizedPath}`;

  const sessionId = getStoredSessionId();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (sessionId) {
    headers["X-Session-Id"] = sessionId;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as
    | (T & { message?: string })
    | { message?: string }
    | null;

  if (!response.ok || !payload) {
    const message = payload && typeof payload === "object" && "message" in payload ? payload.message : "";
    throw new Error(typeof message === "string" && message.trim() ? message : "No se pudo completar la solicitud");
  }

  return payload as T;
}
