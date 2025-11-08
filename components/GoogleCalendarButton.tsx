'use client';

import { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface GoogleCalendarButtonProps {
  className?: string;
}

export function GoogleCalendarButton({ className = '' }: GoogleCalendarButtonProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsCheckingStatus(false);
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Check if user has Google Calendar tokens
        setIsConnected(!!data.googleAccessToken);
      }
    } catch (error) {
      console.error('Error checking calendar status:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleConnect = async () => {
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in first');
        setIsLoading(false);
        return;
      }

      // Get OAuth URL from backend
      const response = await fetch('/api/auth/google/connect', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get OAuth URL');
      }

      const data = await response.json();

      // Redirect to Google OAuth
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Error connecting calendar:', error);
      toast.error('Failed to connect Google Calendar');
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Google Calendar? You can reconnect at any time.')) {
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in first');
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/auth/google/disconnect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect calendar');
      }

      // Update local state
      setIsConnected(false);
      toast.success('Google Calendar disconnected successfully');

      // Refresh the page to update user data in localStorage
      window.location.reload();
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      toast.error('Failed to disconnect Google Calendar');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingStatus) {
    return (
      <button
        disabled
        className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed ${className}`}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm font-medium">Checking...</span>
      </button>
    );
  }

  if (isConnected) {
    return (
      <button
        onClick={handleDisconnect}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 transition-colors ${className}`}
      >
        <CheckCircle2 className="h-4 w-4" />
        <span className="text-sm font-medium">Calendar Connected</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isLoading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">Connecting...</span>
        </>
      ) : (
        <>
          <Calendar className="h-4 w-4" />
          <span className="text-sm font-medium">Connect Calendar</span>
        </>
      )}
    </button>
  );
}
