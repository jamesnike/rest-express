import { useState, useEffect, useRef } from 'react';
import { useLocation, useParams } from 'wouter';
import { ArrowLeft, Send, Bot, User, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

export default function CustomerService() {
  const { eventId } = useParams<{ eventId: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Fetch event details
  const { data: event } = useQuery({
    queryKey: ['/api/events', eventId],
    queryFn: async () => {
      const response = await apiRequest(`/api/events/${eventId}`);
      return response.json();
    },
    enabled: !!eventId,
  });

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Initial bot greeting
  useEffect(() => {
    if (event) {
      const greeting: Message = {
        id: 'greeting',
        text: `Hello! I'm your AI assistant for "${event.title}". I can answer any questions you have about this event - details, location, pricing, organizer info, and more. You can type your questions or use voice by clicking the microphone. How can I help you today?`,
        isBot: true,
        timestamp: new Date(),
      };
      setMessages([greeting]);
    }
  }, [event]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Send message to AI
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest('/api/ai/customer-service', {
        method: 'POST',
        body: JSON.stringify({
          message,
          eventId,
          eventData: event,
          includeVoice: voiceEnabled,
        }),
      });
      return response.json();
    },
    onSuccess: async (response) => {
      const botMessage: Message = {
        id: Date.now().toString(),
        text: response.response,
        isBot: true,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);

      // Play TTS audio if voice is enabled and audio is available
      if (voiceEnabled && response.audioContent) {
        try {
          setIsSpeaking(true);
          const audioData = `data:audio/mp3;base64,${response.audioContent}`;
          if (audioRef.current) {
            audioRef.current.src = audioData;
            await audioRef.current.play();
          }
        } catch (error) {
          console.error('Error playing TTS audio:', error);
        }
      }
    },
    onError: () => {
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: "I'm sorry, I'm having trouble responding right now. Please try again in a moment.",
        isBot: true,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsTyping(false);
    },
  });

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      isBot: false,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    sendMessageMutation.mutate(inputValue);
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const toggleVoice = () => {
    setVoiceEnabled(!voiceEnabled);
    if (isSpeaking && audioRef.current) {
      audioRef.current.pause();
      setIsSpeaking(false);
    }
  };

  // Handle audio playback events
  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      
      const handleAudioEnd = () => {
        setIsSpeaking(false);
      };
      
      const handleAudioError = () => {
        setIsSpeaking(false);
        console.error('Error playing TTS audio');
      };

      audio.addEventListener('ended', handleAudioEnd);
      audio.addEventListener('error', handleAudioError);

      return () => {
        audio.removeEventListener('ended', handleAudioEnd);
        audio.removeEventListener('error', handleAudioError);
      };
    }
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (!event) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto bg-white min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 flex items-center space-x-3 shadow-lg">
        <button 
          onClick={() => setLocation(`/event/${eventId}`)}
          className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center space-x-3 flex-1">
          <div className="relative">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
          <div className="flex-1">
            <h1 className="font-semibold text-lg">Event Assistant</h1>
            <p className="text-sm opacity-90">AI-powered support for {event.title}</p>
          </div>
          <button
            onClick={toggleVoice}
            className={`p-2 rounded-full transition-colors ${
              voiceEnabled ? 'bg-white/20 hover:bg-white/30' : 'bg-red-500/50 hover:bg-red-500/70'
            }`}
            title={voiceEnabled ? 'Voice enabled' : 'Voice disabled'}
          >
            {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Hidden audio element for TTS playback */}
      <audio ref={audioRef} style={{ display: 'none' }} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
          >
            <div className={`flex items-start space-x-2 max-w-[80%] ${message.isBot ? '' : 'flex-row-reverse space-x-reverse'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.isBot ? 'bg-blue-100' : 'bg-purple-100'
              }`}>
                {message.isBot ? (
                  <Bot className="w-4 h-4 text-blue-600" />
                ) : (
                  <User className="w-4 h-4 text-purple-600" />
                )}
              </div>
              <div className={`rounded-2xl px-4 py-2 ${
                message.isBot 
                  ? 'bg-gray-100 text-gray-800' 
                  : 'bg-purple-600 text-white'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                <p className={`text-xs mt-1 ${
                  message.isBot ? 'text-gray-500' : 'text-purple-200'
                }`}>
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2 max-w-[80%]">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Bot className="w-4 h-4 text-blue-600" />
              </div>
              <div className="bg-gray-100 rounded-2xl px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isListening ? "Listening..." : "Ask me anything about this event..."}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={sendMessageMutation.isPending || isListening}
          />
          {recognitionRef.current && (
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={sendMessageMutation.isPending}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isListening 
                  ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse' 
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
              title={isListening ? 'Stop listening' : 'Start voice input'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || sendMessageMutation.isPending}
            className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        {isSpeaking && (
          <div className="mt-2 text-center text-sm text-gray-600 flex items-center justify-center space-x-2">
            <Volume2 className="w-4 h-4" />
            <span>Playing response...</span>
          </div>
        )}
      </div>
    </div>
  );
}