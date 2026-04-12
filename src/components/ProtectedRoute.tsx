import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getSession, type AuthSession } from "@/lib/auth";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const location = useLocation();
  const [session, setSession] = useState<AuthSession | null | undefined>(undefined);

  useEffect(() => {
    let active = true;

    const validateSession = async () => {
      const currentSession = await getSession();

      if (active) {
        setSession(currentSession);
      }
    };

    void validateSession();

    return () => {
      active = false;
    };
  }, []);

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-sm text-muted-foreground">
        Validando sesión...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (requireAdmin && session.role !== "administrador") {
    return <Navigate to="/crm" replace />;
  }

  return <>{children}</>;
}
