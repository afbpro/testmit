import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import CRM from "./pages/CRM.tsx";
import ClientDetail from "./pages/ClientDetail.tsx";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import NewProperty from "./pages/NewProperty.tsx";
import NotFound from "./pages/NotFound.tsx";
import Properties from "./pages/Properties.tsx";

const queryClient = new QueryClient();

const protectedDashboard = (
  <ProtectedRoute>
    <Index />
  </ProtectedRoute>
);

const protectedCRM = (
  <ProtectedRoute>
    <CRM />
  </ProtectedRoute>
);

const protectedProperties = (
  <ProtectedRoute>
    <Properties />
  </ProtectedRoute>
);

const protectedNewProperty = (
  <ProtectedRoute>
    <NewProperty />
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={protectedDashboard} />
          <Route path="/jira" element={protectedDashboard} />
          <Route path="/propiedades" element={protectedProperties} />
          <Route path="/propiedades/nueva" element={protectedNewProperty} />
          <Route path="/propiedades/nueva/detalles" element={protectedNewProperty} />
          <Route path="/propiedades/nueva/precios" element={protectedNewProperty} />
          <Route path="/propiedades/nueva/extras" element={protectedNewProperty} />
          <Route path="/crm" element={protectedCRM} />
          <Route
            path="/crm/client/:id"
            element={(
              <ProtectedRoute>
                <ClientDetail />
              </ProtectedRoute>
            )}
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
