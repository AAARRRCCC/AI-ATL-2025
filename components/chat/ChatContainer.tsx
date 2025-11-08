'use client';

import { useEffect, useRef } from 'react';
import { AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';

interface ChatContainerProps {
  userId: string | null;
}

export function ChatContainer({ userId }: ChatContainerProps) {
  const { messages, sendMessage, isConnected, isTyping, error } = useWebSocket(userId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Study Assistant</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Chat to create and schedule assignments</p>
        </div>

        {/* Connection Status */}
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
        {messages.length === 0 ? (
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
