import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import App from "@/App";

let currentSession: { user: { email: string; last_sign_in_at: string } } | null = null;

vi.mock("@/lib/supabaseClient", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: currentSession },
        error: null,
      })),
      signInWithPassword: vi.fn(async ({ email, password }: { email: string; password: string }) => {
        if (email === "demo@cupertino.com" && password === "colega123") {
          currentSession = {
            user: {
              email,
              last_sign_in_at: new Date().toISOString(),
            },
          };

          return {
            data: { session: currentSession },
            error: null,
          };
        }

        return {
          data: { session: null },
          error: { message: "Email o contraseña incorrectos" },
        };
      }),
      signOut: vi.fn(async () => {
        currentSession = null;
        return { error: null };
      }),
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(async () => ({ data: [], error: null })),
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: null, error: null })),
          order: vi.fn(async () => ({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(async () => ({
            data: { id: "mock-client-id" },
            error: null,
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(async () => ({ error: null })),
      })),
    })),
  },
}));

describe("Index login flow", () => {
  beforeEach(() => {
    currentSession = null;
    window.localStorage.clear();
    window.history.pushState({}, "", "/");
  });

  it("blocks invalid credentials and only enables the generator with the configured login", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: /iniciar sesión/i })).toBeInTheDocument();
    expect(screen.queryByText(/sesión activa:/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "otro@cupertino.com" },
    });
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: "incorrecta" },
    });
    fireEvent.click(screen.getByRole("button", { name: /ingresar/i }));

    expect(await screen.findByRole("heading", { name: /iniciar sesión/i })).toBeInTheDocument();
    expect(screen.queryByText(/sesión activa:/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "demo@cupertino.com" },
    });
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: "colega123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /ingresar/i }));

    expect(await screen.findByText(/crm de clientes/i)).toBeInTheDocument();
    expect(screen.getByText(/sesión activa: demo@cupertino.com/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /guardar cliente/i })).toBeInTheDocument();
    expect(screen.getAllByText(/interesado/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/historial/i)).not.toBeInTheDocument();
  });
});
