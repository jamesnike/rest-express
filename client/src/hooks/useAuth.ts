import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  // Check if we have a token first
  const hasToken = typeof window !== 'undefined' ? !!localStorage.getItem('auth_token') : false;
  
  const { data: user, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: hasToken, // Only run query if we have a token
    retry: (failureCount, error) => {
      // Only retry on network errors, not on 401s
      return failureCount < 2 && !error.message.includes('401');
    },
    staleTime: 1 * 1000, // 1 second - extremely short for mobile
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Enable refetch on window focus
    refetchOnMount: true, // Enable refetch on mount
    refetchOnReconnect: true, // Enable refetch on reconnect
    refetchInterval: false, // Disable auto refetch for now
  });

  // Debug auth state in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Auth Hook Debug:', { user: !!user, isLoading, error: error?.message });
  }

  // Force refetch when coming back from auth callback
  if (typeof window !== 'undefined' && window.location.search.includes('code=')) {
    setTimeout(() => {
      refetch();
    }, 1000);
  }

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      window.location.href = '/';
    }
  };

  return {
    user,
    isLoading: hasToken ? isLoading : false, // If no token, don't show loading
    isAuthenticated: !!user,
    error,
    refetch,
    logout,
  };
}
