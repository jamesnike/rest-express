import { useState } from 'react';
import { Switch, Route } from 'wouter';
import { useHybridAuth } from '@/hooks/useHybridAuth';
import { HybridLoginForm } from '@/components/auth/HybridLoginForm';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import Home from '@/pages/home';
import Browse from '@/pages/browse';
import Profile from '@/pages/profile';
import MyEvents from '@/pages/my-events';
import EventContentPage from '@/pages/event-content';

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/browse" component={Browse} />
      <Route path="/my-events" component={MyEvents} />
      <Route path="/profile" component={Profile} />
      <Route path="/event-content/:eventId" component={EventContentPage} />
      <Route>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Page Not Found</h1>
            <p className="text-gray-600">The page you're looking for doesn't exist.</p>
          </div>
        </div>
      </Route>
    </Switch>
  );
}

export default function App() {
  const { user, isAuthenticated, isLoading, login, logout } = useHybridAuth();
  const { toast } = useToast();

  const handleAuthSuccess = (token: string, user: any) => {
    login(token, user);
    toast({
      title: "Welcome!",
      description: `Successfully signed in as ${user.firstName}`,
    });
  };

  const handleAuthError = (error: string) => {
    toast({
      title: "Authentication Error",
      description: error,
      variant: "destructive",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="text-white text-center">
          <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {isAuthenticated ? (
        <AppRouter />
      ) : (
        <HybridLoginForm onSuccess={handleAuthSuccess} onError={handleAuthError} />
      )}
      <Toaster />
    </>
  );
}