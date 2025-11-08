'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Wifi, WifiOff, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWebSocket } from '@/hooks/useWebSocket';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';

interface ChatContainerProps {
  userId: string | null;
  onDataChange?: () => void;
}

export function ChatContainer({ userId, onDataChange }: ChatContainerProps) {
  const { messages, sendMessage, isConnected, isTyping, error, isInitializing } = useWebSocket(userId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isClearing, setIsClearing] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  // Trigger data refresh when new messages with function calls are received
  useEffect(() => {
    if (messages.length > 0 && onDataChange) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'model' && lastMessage.function_calls && lastMessage.function_calls.length > 0) {
        // Check if any function calls were for creating/updating assignments or tasks
        const hasDataChanges = lastMessage.function_calls.some(
          fc => ['create_assignment', 'break_down_assignment', 'schedule_tasks'].includes(fc.name)
        );
        if (hasDataChanges) {
          onDataChange();
        }
      }
    }
  }, [messages, onDataChange]);

  const handleDebugMongoDB = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please log in first');
      return;
    }

    try {
      // Check user database location
      const userResponse = await fetch('/api/debug/find-user', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const userData = await userResponse.json();

      // Check collections data
      const response = await fetch('/api/debug/mongodb', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();

      console.log('='.repeat(80));
      console.log('USER LOCATION:');
      console.log('='.repeat(80));
      console.log(JSON.stringify(userData, null, 2));
      console.log('='.repeat(80));
      console.log('MONGODB DEBUG DATA:');
      console.log('='.repeat(80));
      console.log(JSON.stringify(data, null, 2));
      console.log('='.repeat(80));

      toast.success('MongoDB data dumped to console - check browser dev tools');
    } catch (error) {
      console.error('Error debugging MongoDB:', error);
      toast.error('Failed to debug MongoDB');
    }
  };

  const handleClearChat = async () => {
    if (!confirm('Are you sure you want to clear ALL data (chat, assignments, tasks, and calendar events)? This cannot be undone.')) {
      return;
    }

    setIsClearing(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in first');
        return;
      }

      // Clear MongoDB data (assignments, tasks, messages)
      const dbResponse = await fetch('/api/assignments/clear-all', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!dbResponse.ok) {
        throw new Error('Failed to clear database data');
      }

      const dbData = await dbResponse.json();

      // Clear Google Calendar study events
      const calendarResponse = await fetch('/api/calendar/clear-study-events', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!calendarResponse.ok) {
        throw new Error('Failed to clear calendar events');
      }

      const calendarData = await calendarResponse.json();

      toast.success(
        `Cleared ${dbData.deleted.assignments} assignments, ${dbData.deleted.tasks} tasks, ` +
        `${dbData.deleted.messages} messages, and ${calendarData.deleted_count} calendar events`
      );

      // Trigger data refresh
      if (onDataChange) {
        onDataChange();
      }

      // Reload the page to refresh everything
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Error clearing data:', error);
      toast.error('Failed to clear data');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Study Assistant</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Chat to create and schedule assignments</p>
        </div>

        {/* Connection Status & Actions */}
        <div className="flex items-center gap-3">
          {/* Debug MongoDB Button */}
          <button
            onClick={handleDebugMongoDB}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
            title="Debug MongoDB collections"
          >
            🔍 Debug
          </button>

          {/* Clear Chat Button */}
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              disabled={isClearing}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50"
              title="Clear chat history"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          )}

          {/* Connection Status - Hide during initial setup */}
          {!isInitializing && (
            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <Wifi className="h-4 w-4 text-green-500 dark:text-green-400" />
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">Connecting...</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
        </div>
      )}

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
        style={{ maxHeight: 'calc(100vh - 400px)' }}
      >
        {isInitializing ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <span className="text-3xl">🤖</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Connecting...
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Setting up your AI assistant
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">🤖</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Start a conversation!
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
              Tell me about your assignments and I'll help you break them down into manageable tasks
              and schedule them on your calendar.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-2 w-full max-w-md">
              <button
                onClick={() => sendMessage("I have a research paper due next Friday")}
                className="px-4 py-2 text-sm text-left bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg transition-colors"
              >
                💡 "I have a research paper due next Friday"
              </button>
              <button
                onClick={() => sendMessage("Help me schedule time to study for my exam")}
                className="px-4 py-2 text-sm text-left bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg transition-colors"
              >
                📚 "Help me schedule time to study for my exam"
              </button>
              <button
                onClick={() => sendMessage("What assignments do I have?")}
                className="px-4 py-2 text-sm text-left bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg transition-colors"
              >
                📋 "What assignments do I have?"
              </button>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}

            {isTyping && <TypingIndicator />}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <ChatInput
        onSend={sendMessage}
        disabled={!isConnected}
        placeholder={
          isConnected
            ? "Ask me anything about your assignments..."
            : "Connecting to AI..."
        }
      />
    </div>
  );
}
