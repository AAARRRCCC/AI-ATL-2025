'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2, Trash2, UploadCloud, Wifi, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { ChatAttachment, useWebSocket } from '@/hooks/useWebSocket';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import catIcon from "./caticon.png";

interface ChatContainerProps {
  userId: string | null;
  onDataChange?: () => void;
  onCalendarRefresh?: () => void;
}

type PendingAttachment = ChatAttachment;

export function ChatContainer({ userId, onDataChange, onCalendarRefresh }: ChatContainerProps) {
  const { messages, sendMessage, isConnected, isTyping, error, isInitializing } = useWebSocket(userId);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedMessageIndexRef = useRef<number>(-1);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);

  // Smoothly keep the latest message in view by animating the chat panel upward
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    }, 50);

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [messages, isTyping]);

  // Trigger data refresh when new messages with function calls are received
  // Only process each message once to prevent duplicate refreshes
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessageIndex = messages.length - 1;

      // Skip if we've already processed this message
      if (lastMessageIndex <= lastProcessedMessageIndexRef.current) {
        return;
      }

      const lastMessage = messages[lastMessageIndex];
      if (lastMessage.role === 'model' && lastMessage.function_calls && lastMessage.function_calls.length > 0) {
        // Check if any function calls were for creating/updating assignments or tasks
        const hasDataChanges = lastMessage.function_calls.some(
          fc => ['create_assignment', 'create_subtasks', 'schedule_tasks', 'update_task_status', 'reschedule_task'].includes(fc.name)
        );
        if (hasDataChanges) {
          console.log('📊 AI made changes - refreshing widgets and calendar');
          // Refresh widget counts
          onDataChange?.();
          // Refresh calendar display
          onCalendarRefresh?.();
          // Mark this message as processed
          lastProcessedMessageIndexRef.current = lastMessageIndex;
        }
      }
    }
  }, [messages, onDataChange, onCalendarRefresh]);

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

      setPendingAttachments([]);

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

  const handleUploadPdf = async (file: File) => {
    if (!userId) {
      toast.error('Please log in first');
      return;
    }

    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are supported');
      return;
    }

    const maxBytes = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxBytes) {
      toast.error('PDF must be 10MB or smaller');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please log in first');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsUploadingPdf(true);
    const toastId = toast.loading('Attaching PDF...');

    try {
      const response = await fetch('/api/chat/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to attach PDF');
      }

      if (!data.attachment) {
        throw new Error('Upload succeeded but no attachment was returned.');
      }

      setPendingAttachments((prev) => [...prev, data.attachment]);

      toast.success('PDF attached. Add a message and hit send when ready!', { id: toastId });
    } catch (err: any) {
      console.error('PDF upload failed:', err);
      toast.error(err.message || 'Failed to attach PDF', { id: toastId });
    } finally {
      setIsUploadingPdf(false);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim() && pendingAttachments.length === 0) {
      return;
    }
    sendMessage(text, { attachments: pendingAttachments });
    setPendingAttachments([]);
  };

  return (
    <div className="flex flex-col h-[600px] lg:h-[720px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Study Assistant</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Chat to create and schedule assignments</p>
        </div>

        {/* Connection Status & Actions */}
        <div className="flex items-center gap-3">
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

          <button
            onClick={handleClearChat}
            disabled={isClearing}
            className="flex items-center gap-2 rounded-md border border-red-200 dark:border-red-800 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
          >
            {isClearing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span>Clear history</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
        </div>
      )}

      {/* Upload Banner */}
      <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
            {isUploadingPdf ? (
              <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-300 animate-spin" />
            ) : (
              <UploadCloud className="h-5 w-5 text-blue-600 dark:text-blue-300" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Upload assignment PDFs</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Attach instructions now, then ask me when you&apos;re ready to analyze them.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={uploadInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              const file = event.target.files?.[0];
              if (file) {
                handleUploadPdf(file);
                event.target.value = '';
              }
            }}
          />
          <button
            onClick={() => uploadInputRef.current?.click()}
            disabled={isUploadingPdf || !isConnected}
            className="px-3 py-1.5 text-sm font-medium rounded-md border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-800/50 disabled:opacity-50"
          >
            {isUploadingPdf ? 'Uploading…' : 'Choose PDF'}
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0"
      >
        {isInitializing ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <img src={catIcon.src} alt="cat" className="w-8 h-8 inline-block" />
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
            {/* <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4"> */}
            <img src={catIcon.src} alt="cat" className="w-20 h-20 inline-block" />
            {/* </div> */}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Start a conversation!
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
              Tell me about your assignments and I'll help you break them down into manageable tasks
              and schedule them on your calendar.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-2 w-full max-w-md">
              <button
                onClick={() => handleSendMessage("I have a research paper due next Friday")}
                className="px-4 py-2 text-sm text-left bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg transition-colors"
              >
                💡 "I have a research paper due next Friday"
              </button>
              <button
                onClick={() => handleSendMessage("Help me schedule time to study for my exam")}
                className="px-4 py-2 text-sm text-left bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg transition-colors"
              >
                📚 "Help me schedule time to study for my exam"
              </button>
              <button
                onClick={() => handleSendMessage("What assignments do I have?")}
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
          </>
        )}
      </div>

      {/* Input Area */}
      <ChatInput
        onSend={handleSendMessage}
        onUploadPdf={handleUploadPdf}
        disabled={!isConnected}
        placeholder={
          isConnected
            ? "Ask me anything about your assignments..."
            : "Connecting to AI..."
        }
        isUploading={isUploadingPdf}
        pendingAttachments={pendingAttachments}
        onRemoveAttachment={handleRemoveAttachment}
      />
    </div>
  );
}
