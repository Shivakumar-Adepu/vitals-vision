import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/use-auth";
import Index from "./pages/Index";
import CameraPage from "./pages/Camera";
import AlertLogPage from "./pages/AlertLog";
import Analytics from "./pages/Analytics";
import Landing from "./pages/Landing";
import WearablesPage from "./pages/Wearables";
import PatientsPage from "./pages/Patients";
import StaffPage from "./pages/Staff";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading Vitals-Vision AI...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={
              <AuthGate>
                <Index />
              </AuthGate>
            } />
            <Route path="/camera" element={<CameraPage />} />
            <Route path="/alerts" element={
              <AuthGate>
                <AlertLogPage />
              </AuthGate>
            } />
            <Route path="/analytics" element={
              <AuthGate>
                <Analytics />
              </AuthGate>
            } />
            <Route path="/wearables" element={
              <AuthGate>
                <WearablesPage />
              </AuthGate>
            } />
            <Route path="/patients" element={
              <AuthGate>
                <PatientsPage />
              </AuthGate>
            } />
            <Route path="/staff" element={
              <AuthGate>
                <StaffPage />
              </AuthGate>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
