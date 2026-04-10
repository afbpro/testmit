import { Home, Link2, LogOut, Users, type LucideIcon } from "lucide-react";

import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

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
  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium text-zinc-400 transition-colors hover:text-white";
const mobileActiveClass = "bg-white/10 text-white";

export default function AppNavigation({ email, onLogout }: AppNavigationProps) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="Cupertino Negocios Inmobiliarios"
              className="h-9 w-auto rounded-xl border border-white/10 bg-white/5 p-1.5 shadow-sm"
            />

            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-white">Cupertino</p>
              <p className="text-[11px] text-zinc-400">Tools & CRM</p>
            </div>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
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

          <div className="flex items-center gap-2">
            <p className="hidden text-sm text-zinc-300 lg:block">{email ?? "usuario"}</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void onLogout()}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Cerrar sesión</span>
            </Button>
          </div>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/85 px-2 py-2 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2 pb-[calc(env(safe-area-inset-bottom)+0.15rem)]">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={mobileLinkClass}
              activeClassName={mobileActiveClass}
            >
              <Icon className="h-6 w-6" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
