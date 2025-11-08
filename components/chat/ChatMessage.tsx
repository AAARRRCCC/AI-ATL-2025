'use client';

import { Bot, User } from 'lucide-react';
import { ChatMessage as ChatMessageType } from '@/hooks/useWebSocket';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const timestamp = new Date(message.timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'
        }`}
      >
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Bot className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[70%]`}>
        <div
          className={`px-4 py-2 rounded-lg ${
            isUser
              ? 'bg-blue-600 dark:bg-blue-500 text-white rounded-tr-none'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-tl-none'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>

        {/* Function Calls Indicator */}
        {message.function_calls && message.function_calls.length > 0 && (
          <div className="mt-1 px-2 py-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded text-xs text-green-700 dark:text-green-400">
            ✓ Executed {message.function_calls.length} action{message.function_calls.length > 1 ? 's' : ''}:
            {message.function_calls.map((call, idx) => (
              <span key={idx} className="ml-1 font-medium">
                {call.name.replace(/_/g, ' ')}
                {idx < message.function_calls!.length - 1 ? ',' : ''}
              </span>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{timestamp}</span>
      </div>
    </div>
  );
}
