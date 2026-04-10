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

  it("blocks invalid credentials and then shows WhatsApp and save-to-client actions after generating a colega link", async () => {
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
    expect(screen.queryByText(/presupuesto \(usd\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^período$/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("combobox", { name: /tipo de operación/i }));
    fireEvent.click(await screen.findByRole("option", { name: "Compra" }));

    expect(await screen.findByText(/presupuesto \(usd\)/i)).toBeInTheDocument();
    expect(screen.getByText(/observaciones de presupuesto/i)).toBeInTheDocument();
    expect(screen.getByText(/seleccioná o escribí un monto/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("combobox", { name: /tipo de operación/i }));
    fireEvent.click(await screen.findByRole("option", { name: "Venta" }));

    expect(await screen.findByText(/precio de venta \(usd\)/i)).toBeInTheDocument();
    expect(screen.getByText(/seleccioná o escribí el precio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/departamento/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/zona específica/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("combobox", { name: /departamento/i }));
    fireEvent.click(await screen.findByRole("option", { name: "Maldonado" }));
    fireEvent.click(screen.getByRole("combobox", { name: /zona \/ ciudad/i }));
    fireEvent.click(await screen.findByRole("option", { name: "Punta del Este" }));

    fireEvent.click(screen.getByRole("combobox", { name: /tipo de operación/i }));
    fireEvent.click(await screen.findByRole("option", { name: "Alquiler temporal" }));

    expect(await screen.findByText(/^período$/i)).toBeInTheDocument();
    expect(screen.queryByText(/presupuesto \(usd\)/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /ir a jira/i })).not.toBeInTheDocument();

    window.history.pushState({}, "", "/jira");
    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(await screen.findByText(/panel jira y link de colega/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /seleccionar inmobiliaria/i }));
    fireEvent.click(await screen.findByText(/acassuso propiedades/i));
    fireEvent.change(screen.getByPlaceholderText(/ej: 25656/i), {
      target: { value: "1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: /generar link/i }));

    expect(await screen.findByRole("button", { name: /compartir por whatsapp/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /buscar cliente existente/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /nuevo cliente/i })).toBeInTheDocument();
  });
});
