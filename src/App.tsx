import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import HomePage from "@/pages/HomePage";
import CreateTournamentPage from "@/pages/CreateTournamentPage";
import TeamsPage from "@/pages/TeamsPage";
import CreateTeamPage from "@/pages/CreateTeamPage";
import TournamentDetailPage from "@/pages/TournamentDetailPage";
import TournamentTeamsPage from "@/pages/TournamentTeamsPage";
import TournamentSettingsPage from "@/pages/TournamentSettingsPage";
import TournamentGalleryPage from "@/pages/TournamentGalleryPage";
import PublishPage from "@/pages/PublishPage";
import AuthPage from "@/pages/AuthPage";
import SharedTournamentPage from "@/pages/SharedTournamentPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // <-- A MÁGICA ACONTECE AQUI
      retry: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<HomePage />} />
              <Route path="/tournament/create" element={<CreateTournamentPage />} />
              <Route path="/tournament/:id/edit" element={<CreateTournamentPage />} />
              <Route path="/tournament/:id" element={<TournamentDetailPage />} />
              <Route path="/tournament/:id/teams" element={<TournamentTeamsPage />} />
              <Route path="/tournament/:id/settings" element={<TournamentSettingsPage />} />
              <Route path="/tournament/:id/gallery" element={<TournamentGalleryPage />} />
              <Route path="/teams" element={<TeamsPage />} />
              <Route path="/teams/create" element={<CreateTeamPage />} />
              <Route path="/publish" element={<PublishPage />} />
            </Route>
            <Route path="/shared/:token" element={<SharedTournamentPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
