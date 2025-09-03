import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';

interface User {
  id: string;
  username?: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useHybridAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true
  });

  // Check for existing token on mount
  useEffect(() => {
    checkExistingAuth();
  }, []);

  const checkExistingAuth = async () => {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    
    if (!token || !userData) {
      setAuthState({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      // Validate token with server
      const response = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token })
      });

      if (response.ok) {
        const user = JSON.parse(userData);
        setAuthState({ user, isAuthenticated: true, isLoading: false });
      } else {
        // Token expired, clear storage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        setAuthState({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      console.error('Token validation failed:', error);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      setAuthState({ user: null, isAuthenticated: false, isLoading: false });
    }
  };

  const login = (token: string, user: User) => {
    console.log('🔐 useHybridAuth.login called with:', { token: token?.substring(0, 20) + '...', user });
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_data', JSON.stringify(user));
    setAuthState({ user, isAuthenticated: true, isLoading: false });
    console.log('🔐 Auth state updated to authenticated');
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    setAuthState({ user: null, isAuthenticated: false, isLoading: false });
  };

  return {
    ...authState,
    login,
    logout,
    refreshAuth: checkExistingAuth
  };
}