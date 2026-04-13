import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import Index from "@/pages/Index";

vi.mock("@/lib/auth", () => ({
  clearLegacyLinkHistory: vi.fn(),
  getStoredSession: vi.fn(() => ({
    email: "demo@cupertino.com",
    role: "administrador",
    loggedAt: new Date().toISOString(),
  })),
  signOut: vi.fn(async () => ({ ok: true })),
  authApiRequest: vi.fn(async () => ({
    ok: true,
    companies: [
      { id: "584", name: "Cupertino Negocios Inmobiliarios", web: "https://www.cupertino.uy" },
      { id: "303", name: "Acassuso Propiedades", web: "https://www.acassuso.com.uy" },
    ],
  })),
}));

vi.mock("@/lib/supabaseClient", () => ({
  supabase: null,
}));

describe("Index colleague link prefills", () => {
  it("detects agency id and property type from a colega url and reflects them in the UI", async () => {
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>,
    );

    fireEvent.change(
      screen.getByPlaceholderText(/https:\/\/www\.inmobiliaria\.link\/\.\.\. o https:\/\/portal\.com\/propiedad\/123/i),
      {
        target: {
          value: "https://www.inmobiliaria.link/c/inmobiliaria_584/Apartamentos/59516",
        },
      },
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /584/i })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /584.*cupertino negocios inmobiliarios/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/apartamentos/i)).toBeChecked();
    expect(screen.getByText(/inmobiliaria de origen detectada: cupertino negocios inmobiliarios \(id 584\)/i)).toBeInTheDocument();
  });
});
