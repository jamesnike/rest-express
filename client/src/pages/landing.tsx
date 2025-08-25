import { useState } from "react";
import { Calendar, MapPin, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import LoginForm from "@/components/LoginForm";

export default function Landing() {
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const handleGetStarted = () => {
    setShowLoginForm(true);
    setIsRegisterMode(true); // Start with registration for new users
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
  };

  if (showLoginForm) {
    return (
      <div className="max-w-sm mx-auto bg-gradient-to-br from-primary to-accent min-h-screen">
        <div className="text-white text-center px-6 pt-8 pb-6">
          <Calendar className="w-12 h-12 mx-auto mb-3" />
          <h1 className="text-2xl font-bold">EventConnect</h1>
          <p className="text-sm opacity-90 mt-2">
            {isRegisterMode ? "Create your account to get started" : "Welcome back to EventConnect"}
          </p>
        </div>
        
        <div className="px-6 pb-8">
          <LoginForm 
            onToggleMode={toggleMode}
            isRegisterMode={isRegisterMode}
          />
          
          <div className="mt-6 text-center">
            <Button 
              variant="link"
              onClick={() => setShowLoginForm(false)}
              className="text-white/80 text-sm hover:text-white"
            >
              ← Back to main page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto bg-gradient-to-br from-primary to-accent min-h-screen">
      {/* Hero Section */}
      <div className="text-white text-center px-6 pt-16 pb-8">
        <div className="mb-8">
          <Calendar className="w-20 h-20 mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">EventConnect</h1>
          <p className="text-lg opacity-90 leading-relaxed">
            Discover amazing events and connect with people who share your interests
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="px-6 py-8 space-y-6">
        <div className="flex items-start space-x-4 text-white">
          <MapPin className="w-6 h-6 mt-1 flex-shrink-0" />
          <div>
            <h3 className="font-semibold mb-1">Local Events</h3>
            <p className="text-sm opacity-90">Find exciting events happening right in your neighborhood</p>
          </div>
        </div>

        <div className="flex items-start space-x-4 text-white">
          <Users className="w-6 h-6 mt-1 flex-shrink-0" />
          <div>
            <h3 className="font-semibold mb-1">Meet People</h3>
            <p className="text-sm opacity-90">Connect with like-minded individuals and make new friends</p>
          </div>
        </div>

        <div className="flex items-start space-x-4 text-white">
          <Sparkles className="w-6 h-6 mt-1 flex-shrink-0" />
          <div>
            <h3 className="font-semibold mb-1">Tailored for You</h3>
            <p className="text-sm opacity-90">Discover events that match your interests and schedule</p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="px-6 pb-8 space-y-3">
        <Button 
          onClick={handleGetStarted}
          size="lg" 
          className="w-full bg-white text-primary hover:bg-gray-100 font-semibold py-4 text-lg"
        >
          Create Account
        </Button>
        
        <Button 
          onClick={() => {
            setShowLoginForm(true);
            setIsRegisterMode(false);
          }}
          variant="outline"
          size="lg" 
          className="w-full border-white text-white hover:bg-white hover:text-primary font-semibold py-4 text-lg"
        >
          Sign In
        </Button>
        
        <p className="text-center text-white/80 text-sm mt-4">
          Join thousands of people discovering amazing events
        </p>
      </div>
    </div>
  );
}