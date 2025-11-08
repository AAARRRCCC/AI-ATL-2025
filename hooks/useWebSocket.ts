'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  function_calls?: Array<{
    name: string;
    input: Record<string, any>;
    result: any;
  }>;
}

interface UseWebSocketReturn {
  messages: ChatMessage[];
  sendMessage: (message: string) => void;
  isConnected: boolean;
  isTyping: boolean;
  error: string | null;
}

export function useWebSocket(userId: string | null): UseWebSocketReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second

  const connect = useCallback(() => {
    if (!userId) {
      console.log('Cannot connect: No user ID');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      const wsUrl = `ws://localhost:8000/ws/chat`;
      console.log('Connecting to WebSocket:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;

        // Send authentication
        ws.send(JSON.stringify({ user_id: userId }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received message:', data);

          if (data.type === 'typing') {
            setIsTyping(true);
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

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('Connection error');
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, delay);
        } else {
          setError('Connection lost. Please refresh the page.');
        }
      };
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      setError('Failed to connect');
    }
  }, [userId]);

  const sendMessage = useCallback((message: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
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
  }, [userId, connect]);

  return {
    messages,
    sendMessage,
    isConnected,
    isTyping,
    error,
  };
}
