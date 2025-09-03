import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { signInWithGoogle, signInWithFacebook } from '@/lib/firebase';
import { apiRequest } from '@/lib/queryClient';

interface OAuthLoginProps {
  onSuccess: (token: string, user: any) => void;
  onError: (error: string) => void;
}

export function OAuthLogin({ onSuccess, onError }: OAuthLoginProps) {
  const [isLoading, setIsLoading] = useState<'google' | 'facebook' | null>(null);

  const handleOAuthLogin = async (provider: 'google' | 'facebook') => {
    setIsLoading(provider);
    
    try {
      const firebaseUser = provider === 'google' 
        ? await signInWithGoogle() 
        : await signInWithFacebook();
      
      // Send OAuth data to backend for JWT token
      const response = await apiRequest('/api/auth/oauth', {
        method: 'POST',
        body: JSON.stringify({
          oauthProvider: provider,
          oauthId: firebaseUser.uid,
          email: firebaseUser.email,
          firstName: firebaseUser.displayName?.split(' ')[0] || 'User',
          lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || provider.charAt(0).toUpperCase() + provider.slice(1),
          profileImageUrl: firebaseUser.photoURL
        })
      });

      if (response.token) {
        onSuccess(response.token, response.user);
      } else {
        onError(response.message || `${provider} login failed`);
      }
    } catch (error: any) {
      console.error(`${provider} login error:`, error);
      console.error('Current domain:', window.location.hostname);
      console.error('Full URL:', window.location.href);
      onError(error.message || `${provider} login failed`);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-center text-sm font-semibold text-gray-600 mb-4">
        Quick Sign In
      </div>
      
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={() => handleOAuthLogin('google')}
        disabled={isLoading !== null}
        className="w-full h-12 text-blue-600 border-blue-600 hover:bg-blue-50"
      >
        {isLoading === 'google' ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span>Connecting...</span>
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <svg width="20" height="20" viewBox="0 0 24 24" className="text-blue-600">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
          </div>
        )}
      </Button>

      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={() => handleOAuthLogin('facebook')}
        disabled={isLoading !== null}
        className="w-full h-12 text-blue-700 border-blue-700 hover:bg-blue-50"
      >
        {isLoading === 'facebook' ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-700 border-t-transparent rounded-full"></div>
            <span>Connecting...</span>
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <svg width="20" height="20" viewBox="0 0 24 24" className="text-blue-700">
              <path fill="currentColor" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span>Continue with Facebook</span>
          </div>
        )}
      </Button>
    </div>
  );
}