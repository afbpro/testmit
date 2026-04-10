import { Home, Link2, LogOut, Users, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";

type AppNavigationProps = {
  email?: string | null;
  onLogout: () => void | Promise<void>;
};

const navItems: Array<{ to: string; label: string; icon: LucideIcon; end?: boolean }> = [
  { to: "/", label: "Links", icon: Link2, end: true },
  { to: "/propiedades", label: "Propiedades", icon: Home },
  { to: "/crm", label: "CRM", icon: Users },
];

const desktopLinkClass =
  "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-white";
const desktopActiveClass = "bg-white/10 text-white";
const mobileLinkClass =
  "flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium text-zinc-400 transition-all hover:bg-white/[0.03] hover:text-white";
const mobileActiveClass = "bg-white/[0.06] text-white";

export default function AppNavigation({ email, onLogout }: AppNavigationProps) {
  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-black/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-4">
          <Link to="/" aria-label="Ir al inicio" className="flex shrink-0 items-center">
            <img
              src="/isotipocup.png"
              alt="Cupertino"
              className="h-[44px] w-auto object-contain md:h-[52px]"
            />
          </Link>

          <nav className="hidden items-center gap-1 md:flex md:flex-wrap">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={desktopLinkClass}
                activeClassName={desktopActiveClass}
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex shrink-0 items-center justify-end gap-2">
            <p className="hidden text-sm text-zinc-300 lg:block">{email ?? "usuario"}</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void onLogout()}
              className="h-9 gap-2 px-2.5 md:px-3"
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only md:not-sr-only md:inline">Cerrar sesión</span>
            </Button>
          </div>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#09090b]/95 pb-[max(env(safe-area-inset-bottom),0.35rem)] pt-1.5 shadow-[0_-10px_30px_rgba(0,0,0,0.28)] backdrop-blur-xl md:hidden">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-3 gap-1 px-2">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={mobileLinkClass}
              activeClassName={mobileActiveClass}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
