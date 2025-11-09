'use client';

import { useState, KeyboardEvent, useRef, useEffect, ChangeEvent } from 'react';
import { Loader2, Send, Upload, X } from 'lucide-react';
import { ChatAttachment } from '@/hooks/useWebSocket';

interface ChatInputProps {
  onSend: (message: string) => void;
  onUploadPdf?: (file: File) => void;
  disabled?: boolean;
  placeholder?: string;
  isUploading?: boolean;
  pendingAttachments?: ChatAttachment[];
  onRemoveAttachment?: (index: number) => void;
}

export function ChatInput({
  onSend,
  onUploadPdf,
  disabled = false,
  placeholder = 'Type a message...',
  isUploading = false,
  pendingAttachments = [],
  onRemoveAttachment,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  const canSendMessage = message.trim().length > 0 || pendingAttachments.length > 0;

  const handleSend = () => {
    if (!disabled && canSendMessage) {
      onSend(message.trim());
      setMessage('');

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter, new line on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadPdf) {
      onUploadPdf(file);
    }
    // Reset input so the same file can be re-uploaded if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const characterCount = message.length;
  const maxChars = 2000;
  const isNearLimit = characterCount > maxChars * 0.8;

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      {pendingAttachments.length > 0 && (
        <div className="mb-3 space-y-2">
          {pendingAttachments.map((attachment, index) => (
            <div
              key={`${attachment.filename}-${index}`}
              className="flex items-center justify-between rounded-md border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/40 px-3 py-2 text-xs text-gray-700 dark:text-gray-300"
            >
              <div className="flex flex-col">
                <span className="font-semibold text-gray-900 dark:text-gray-100">{attachment.filename}</span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  {attachment.pages ? `${attachment.pages} pages` : 'PDF'}
                  {attachment.size_kb ? ` · ${attachment.size_kb} KB` : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRemoveAttachment?.(index)}
                className="ml-3 rounded-full p-1 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                title="Remove attachment"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="flex-shrink-0 px-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            title="Upload assignment PDF"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            data-chat-upload
            onChange={handleFileChange}
          />
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? 'Connecting...' : placeholder}
            disabled={disabled}
            rows={1}
            maxLength={maxChars}
            className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-all text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-white dark:bg-gray-700"
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />

          {/* Character count */}
          {isNearLimit && (
            <span className={`absolute bottom-2 right-3 text-xs ${characterCount >= maxChars ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
              {characterCount}/{maxChars}
            </span>
          )}

        <button
          onClick={handleSend}
          disabled={disabled || !canSendMessage}
          className="flex-shrink-0 self-stretch px-4 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          title="Send message (Enter)"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-900 dark:text-gray-100">Enter</kbd> to send,{' '}
        <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-900 dark:text-gray-100">Shift+Enter</kbd> for new line · Upload PDFs with the arrow icon and send when ready
      </p>
    </div>
  );
}
