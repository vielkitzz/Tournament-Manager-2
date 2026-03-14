import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import StoreInitializer from "@/components/StoreInitializer";
import { Skeleton } from "@/components/ui/skeleton";

// Code splitting – lazy load pages
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const CompetitionsPage = lazy(() => import("@/pages/CompetitionsPage"));
const CreateTournamentPage = lazy(() => import("@/pages/CreateTournamentPage"));
const TeamsPage = lazy(() => import("@/pages/TeamsPage"));
const CreateTeamPage = lazy(() => import("@/pages/CreateTeamPage"));
const TournamentDetailPage = lazy(() => import("@/pages/TournamentDetailPage"));
const TournamentTeamsPage = lazy(() => import("@/pages/TournamentTeamsPage"));
const TournamentSettingsPage = lazy(() => import("@/pages/TournamentSettingsPage"));
const TournamentGalleryPage = lazy(() => import("@/pages/TournamentGalleryPage"));
const PublishPage = lazy(() => import("@/pages/PublishPage"));
const FriendlyMatchPage = lazy(() => import("@/pages/FriendlyMatchPage"));
const AuthPage = lazy(() => import("@/pages/AuthPage"));
const SharedTournamentPage = lazy(() => import("@/pages/SharedTournamentPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function PageFallback() {
  return (
    <div className="p-6 lg:p-8 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-32" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StoreInitializer />
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/competitions" element={<CompetitionsPage />} />
                  <Route path="/tournament/create" element={<CreateTournamentPage />} />
                  <Route path="/tournament/:id/edit" element={<CreateTournamentPage />} />
                  <Route path="/tournament/:id" element={<TournamentDetailPage />} />
                  <Route path="/tournament/:id/teams" element={<TournamentTeamsPage />} />
                  <Route path="/tournament/:id/settings" element={<TournamentSettingsPage />} />
                  <Route path="/tournament/:id/gallery" element={<TournamentGalleryPage />} />
                  <Route path="/teams" element={<TeamsPage />} />
                  <Route path="/teams/create" element={<CreateTeamPage />} />
                  <Route path="/publish" element={<PublishPage />} />
                  <Route path="/friendly" element={<FriendlyMatchPage />} />
                </Route>
                <Route path="/shared/:token" element={<SharedTournamentPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
