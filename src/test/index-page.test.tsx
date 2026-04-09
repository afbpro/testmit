import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import App from "@/App";

describe("Index login flow", () => {
  beforeEach(() => {
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
    expect(screen.getByText(/no hay clientes cargados todavía/i)).toBeInTheDocument();
    expect(screen.getAllByText(/interesado/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/historial/i)).not.toBeInTheDocument();
  });
});
