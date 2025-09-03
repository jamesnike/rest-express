import { useState } from 'react';
import { useHybridAuth } from '@/hooks/useHybridAuth';
import { HybridLoginForm } from '@/components/auth/HybridLoginForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

function Dashboard({ user, onLogout }: { user: any, onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      <div className="max-w-md mx-auto pt-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">🎉 Welcome!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <div className="text-lg font-semibold">
                {user.firstName} {user.lastName}
              </div>
              {user.username && (
                <div className="text-sm text-gray-600">@{user.username}</div>
              )}
              <div className="text-sm text-gray-500">{user.email}</div>
              <div className="text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full inline-block">
                ✅ JWT Authentication Active
              </div>
            </div>
            
            <Button 
              onClick={onLogout}
              variant="outline" 
              className="w-full"
            >
              🚪 Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function App() {
  const { user, isAuthenticated, isLoading, login, logout } = useHybridAuth();
  const { toast } = useToast();

  const handleAuthSuccess = (token: string, user: any) => {
    console.log('🎯 OAuth Success - About to login:', { token: token?.substring(0, 20) + '...', user });
    login(token, user);
    console.log('🎯 Login called, isAuthenticated should be:', isAuthenticated);
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
        <Dashboard user={user} onLogout={logout} />
      ) : (
        <HybridLoginForm onSuccess={handleAuthSuccess} onError={handleAuthError} />
      )}
      <Toaster />
    </>
  );
}