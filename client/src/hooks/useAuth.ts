import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error, refetch } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: (failureCount, error) => {
      // Only retry on network errors, not on 401s
      return failureCount < 2 && !error.message.includes('401');
    },
    staleTime: 1 * 1000, // 1 second - extremely short for mobile
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Enable refetch on window focus
    refetchOnMount: true, // Enable refetch on mount
    refetchOnReconnect: true, // Enable refetch on reconnect
    refetchInterval: 10 * 1000, // Refetch every 10 seconds to maintain auth state
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
    isLoading,
    isAuthenticated: !!user,
    error,
    refetch,
    logout,
  };
}
