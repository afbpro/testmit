import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Index from "@/pages/Index";

describe("Index login flow", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("requires email/password login before showing the link generator", () => {
    render(<Index />);

    expect(screen.getByRole("heading", { name: /iniciar sesión/i })).toBeInTheDocument();
    expect(screen.queryByText(/generador de link colega/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "demo@cupertino.com" },
    });
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: /ingresar/i }));

    expect(screen.getByText(/generador de link colega/i)).toBeInTheDocument();
    expect(screen.queryByText(/historial/i)).not.toBeInTheDocument();
  });
});
