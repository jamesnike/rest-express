import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { OAuthLogin } from './OAuthLogin';
import { apiRequest } from '@/lib/queryClient';

interface HybridLoginFormProps {
  onSuccess: (token: string, user: any) => void;
  onError: (error: string) => void;
}

export function HybridLoginForm({ onSuccess, onError }: HybridLoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      onError('Please enter username and password');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      if (response.token) {
        onSuccess(response.token, response.user);
      } else {
        onError(response.message || 'Login failed');
      }
    } catch (error: any) {
      onError(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const createDemoAccount = async () => {
    setIsLoading(true);
    
    try {
      const username = `demo${Date.now().toString().slice(-6)}`;
      
      const response = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username,
          password: 'demo123',
          firstName: 'Demo',
          lastName: 'User'
        })
      });

      if (response.token) {
        onSuccess(response.token, response.user);
      } else {
        onError(response.message || 'Demo account creation failed');
      }
    } catch (error: any) {
      onError(error.message || 'Demo account creation failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-500 to-purple-600">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">🎯 EventConnect</CardTitle>
          <CardDescription>Mobile Event Discovery</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* OAuth Section */}
          <OAuthLogin onSuccess={onSuccess} onError={onError} />
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                or sign in with username
              </span>
            </div>
          </div>

          {/* Traditional Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Signing In...</span>
                </div>
              ) : (
                '🔑 Sign In'
              )}
            </Button>
          </form>

          <Button 
            type="button" 
            variant="secondary" 
            className="w-full" 
            onClick={createDemoAccount}
            disabled={isLoading}
          >
            ⚡ Create Demo Account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}