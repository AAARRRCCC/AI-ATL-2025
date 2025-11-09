'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface ChatAttachment {
  type: 'pdf';
  filename: string;
  pages?: number;
  size_kb?: number;
  preview?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  function_calls?: Array<{
    name: string;
    input: Record<string, any>;
    result: any;
  }>;
  attachments?: ChatAttachment[];
}

interface UseWebSocketReturn {
  messages: ChatMessage[];
  sendMessage: (message: string) => void;
  isConnected: boolean;
  isTyping: boolean;
  error: string | null;
  isInitializing: boolean;
  appendMessages: (newMessages: ChatMessage[]) => void;
}

export function useWebSocket(userId: string | null): UseWebSocketReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second

  const connect = useCallback(() => {
    if (!userId) {
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const wsUrl = `ws://localhost:8000/ws/chat`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        setIsInitializing(false);
        reconnectAttemptsRef.current = 0;

        // Send authentication with JWT token
        const token = localStorage.getItem('token');
        ws.send(JSON.stringify({
          user_id: userId,
          token: token
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'typing') {
            setIsTyping(true);
          } else if (data.type === 'connected') {
            // Backend connection confirmation - ignore, we handle this in onopen
            // This prevents duplicate "Connected" messages in chat
            return;
          } else if (data.type === 'message' || data.message) {
            setIsTyping(false);

            const newMessage: ChatMessage = {
              role: 'model',
              content: data.message || data.content,
              timestamp: data.timestamp || new Date().toISOString(),
              function_calls: data.function_calls,
            };

            setMessages((prev) => [...prev, newMessage]);
          } else if (data.type === 'error' || data.error) {
            setIsTyping(false);
            setError(data.error || 'An error occurred');
            console.error('WebSocket error:', data.error);
          }
        } catch (err) {
          console.error('Error parsing message:', err);
        }
      };

      ws.onerror = () => {
        // Don't show errors during initial connection - wait for onclose to handle it
        // This prevents the error flash when the page first loads
        if (!isInitializing) {
          setError('Cannot connect to AI backend. Make sure the backend server is running on port 8000.');
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        setIsInitializing(false);
        wsRef.current = null;

        // Only log unexpected closures (not normal closures or going away)
        if (event.code !== 1000 && event.code !== 1001) {
          console.log('WebSocket closed unexpectedly:', event.code);
        }

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, delay);
        } else {
          // Give up reconnecting
          setError('Connection lost. Please refresh the page.');
        }
      };
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      setError('Failed to connect');
      setIsInitializing(false);
    }
  }, [userId]);

  const sendMessage = useCallback((message: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('Not connected. Please wait...');
      return;
    }

    if (!message.trim()) {
      return;
    }

    try {
      // Add user message to chat immediately
      const userMessage: ChatMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Send to server
      wsRef.current.send(JSON.stringify({
        user_id: userId,
        message: message,
      }));

      setIsTyping(true);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
      setIsTyping(false);
    }
  }, [userId]);

  // Connect on mount and when userId changes
  useEffect(() => {
    if (userId) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]); // Only reconnect when userId changes, not when connect function changes

  const appendMessages = useCallback((newMessages: ChatMessage[]) => {
    if (!newMessages || newMessages.length === 0) return;
    setMessages((prev) => [...prev, ...newMessages]);
  }, []);

  return {
    messages,
    sendMessage,
    isConnected,
    isTyping,
    error,
    isInitializing,
    appendMessages,
  };
}
