'use client';

import { useState } from 'react';
import { Bot, FileText, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { ChatMessage as ChatMessageType } from '@/hooks/useWebSocket';
import 'katex/dist/katex.min.css';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const timestamp = new Date(message.timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  const [showFullText, setShowFullText] = useState(false);
  const hasAttachments = (message.attachments?.length || 0) > 0;
  const shouldTruncate = hasAttachments && message.content.length > 800 && isUser;
  const displayedContent = shouldTruncate && !showFullText
    ? `${message.content.slice(0, 800)}…`
    : message.content;

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-chat-slide`}>
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
              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-tl-none border border-gray-200 dark:border-gray-600'
          }`}
        >
          {isUser ? (
            // User messages: plain text
            <>
              <p className="text-sm whitespace-pre-wrap break-words">{displayedContent}</p>
              {shouldTruncate && (
                <button
                  onClick={() => setShowFullText((prev) => !prev)}
                  className="mt-2 text-xs font-medium underline text-white/90"
                >
                  {showFullText ? 'Hide extracted text' : 'Show full extracted text'}
                </button>
              )}
            </>
          ) : (
            // AI messages: render as markdown
            <div className="markdown-content text-sm">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex, rehypeHighlight]}
                components={{
                  // Headings
                  h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-bold mt-3 mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-bold mt-2 mb-1">{children}</h3>,

                  // Paragraphs
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,

                  // Lists
                  ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                  li: ({ children }) => <li className="ml-2">{children}</li>,

                  // Code blocks
                  code: ({ className, children, ...props }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-600 text-red-600 dark:text-red-400 font-mono text-xs" {...props}>
                        {children}
                      </code>
                    ) : (
                      <code className={`${className} block`} {...props}>
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children }) => (
                    <pre className="bg-gray-800 dark:bg-gray-900 text-gray-100 rounded-md p-3 mb-2 overflow-x-auto text-xs">
                      {children}
                    </pre>
                  ),

                  // Links
                  a: ({ children, href }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline">
                      {children}
                    </a>
                  ),

                  // Tables
                  table: ({ children }) => (
                    <div className="overflow-x-auto mb-2">
                      <table className="min-w-full border border-gray-300 dark:border-gray-600">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => <thead className="bg-gray-200 dark:bg-gray-600">{children}</thead>,
                  th: ({ children }) => <th className="border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-left font-semibold">{children}</th>,
                  td: ({ children }) => <td className="border border-gray-300 dark:border-gray-600 px-3 py-1.5">{children}</td>,

                  // Blockquotes
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-gray-400 dark:border-gray-500 pl-3 italic my-2 text-gray-700 dark:text-gray-300">
                      {children}
                    </blockquote>
                  ),

                  // Horizontal rules
                  hr: () => <hr className="my-3 border-gray-300 dark:border-gray-600" />,

                  // Strong/bold
                  strong: ({ children }) => <strong className="font-bold">{children}</strong>,

                  // Emphasis/italic
                  em: ({ children }) => <em className="italic">{children}</em>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Attachment Previews */}
        {hasAttachments && (
          <div className="mt-3 w-full space-y-2">
            {message.attachments!.map((attachment, idx) => (
              <div
                key={`${attachment.filename}-${idx}`}
                className="w-full rounded-md border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/70 dark:bg-gray-900/40 px-3 py-2 text-xs text-gray-700 dark:text-gray-300"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-500 dark:text-blue-300" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {attachment.filename || 'Assignment.pdf'}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {attachment.pages ? `${attachment.pages} pages` : 'PDF'}
                        {attachment.size_kb ? ` · ${attachment.size_kb} KB` : ''}
                      </p>
                    </div>
                  </div>
                </div>
                {attachment.preview && (
                  <p className="mt-2 whitespace-pre-wrap text-[11px] text-gray-600 dark:text-gray-300">
                    {attachment.preview}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

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
