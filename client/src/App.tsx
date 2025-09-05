import { Switch, Route } from "wouter";
import { Calendar } from "lucide-react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Profile from "@/pages/profile";
import MyEvents from "@/pages/my-events";
import Browse from "@/pages/browse";
import EventContentPage from "@/pages/event-content";
import CustomerService from "@/pages/customer-service";

function Router() {
  const { isAuthenticated, isLoading, user, error, refetch } = useAuth();

  // Debug authentication state in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Router state:', { isAuthenticated, isLoading, user: !!user, error, url: window.location.href });
  }

  // Force authentication check on page load if coming from auth callback
  if (typeof window !== 'undefined' && window.location.search.includes('code=')) {
    setTimeout(() => {
      refetch();
    }, 500);
  }

  // Show loading state while checking authentication or if user state is transitioning
  if (isLoading) {
    return (
      <div className="max-w-sm mx-auto bg-gradient-to-br from-primary to-accent min-h-screen flex items-center justify-center">
        <div className="text-center text-white">
          <div className="mb-8">
            <Calendar className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">EventConnect</h1>
            <p className="text-lg opacity-90">Discover amazing events near you</p>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
        </div>
      </div>
    );
  }

  // Render authenticated routes
  if (isAuthenticated && user) {
    return (
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/profile" component={Profile} />
        <Route path="/my-events" component={MyEvents} />
        <Route path="/browse" component={Browse} />
        <Route path="/event/:eventId" component={EventContentPage} />
        <Route path="/event-content/:eventId" component={EventContentPage} />
        <Route path="/customer-service/:eventId" component={CustomerService} />
        <Route path="*" component={NotFound} />
      </Switch>
    );
  }

  // Render unauthenticated routes
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/profile">
        {() => {
          window.location.href = '/api/login';
          return null;
        }}
      </Route>
      <Route path="/my-events">
        {() => {
          window.location.href = '/api/login';
          return null;
        }}
      </Route>
      <Route path="/browse">
        {() => {
          window.location.href = '/api/login';
          return null;
        }}
      </Route>
      <Route path="*" component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
