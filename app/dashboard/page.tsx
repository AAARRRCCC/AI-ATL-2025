"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, Settings } from "lucide-react";
import toast, { Toaster } from 'react-hot-toast';
import { GoogleCalendarButton } from "@/components/GoogleCalendarButton";
import { ChatContainer } from "@/components/chat/ChatContainer";
import ThemeToggle from "@/components/ThemeToggle";

interface User {
  _id: string;
  email: string;
  name: string;
  createdAt: string;
  googleAccessToken?: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!token || !storedUser) {
      router.push("/auth");
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    setLoading(false);

    // Handle OAuth redirect params
    const calendarConnected = searchParams.get('calendar_connected');
    const error = searchParams.get('error');

    if (calendarConnected === 'true') {
      toast.success('Google Calendar connected successfully! 🎉');
      // Update user data to reflect calendar connection
      fetchUserData(token);
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard');
    } else if (error === 'oauth_denied') {
      toast.error('Calendar connection was cancelled');
      window.history.replaceState({}, '', '/dashboard');
    } else if (error === 'oauth_failed') {
      toast.error('Failed to connect Google Calendar. Please try again.');
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [router, searchParams]);

  const fetchUserData = async (token: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data);
        localStorage.setItem('user', JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Toast Notifications */}
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                Study Autopilot
              </span>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <GoogleCalendarButton />

              <button
                onClick={() => router.push('/preferences')}
                className="p-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                title="Preferences"
              >
                <Settings className="w-5 h-5" />
              </button>

              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Chat with AI to create assignments and schedule your study sessions.
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Container - Takes 2 columns */}
          <div className="lg:col-span-2">
            <ChatContainer userId={user?._id || null} />
          </div>

          {/* Sidebar - Takes 1 column */}
          <div className="space-y-6">
            {/* Account Info Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Account Info
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                  <p className="text-gray-900 dark:text-gray-100 text-sm">{user?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
                  <p className="text-gray-900 dark:text-gray-100 text-sm">{user?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Member Since</p>
                  <p className="text-gray-900 dark:text-gray-100 text-sm">
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Calendar Status</p>
                  <p className={`text-sm font-medium ${user?.googleAccessToken ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    {user?.googleAccessToken ? '✓ Connected' : 'Not connected'}
                  </p>
                </div>
              </div>
            </div>

            {/* Assignments Card */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
              <h2 className="text-lg font-semibold mb-2">Assignments</h2>
              <p className="text-blue-100 text-sm mb-4">
                Create assignments by chatting with AI
              </p>
              <p className="text-3xl font-bold">0</p>
              <p className="text-sm text-blue-100">Active assignments</p>
            </div>

            {/* Study Sessions Card */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
              <h2 className="text-lg font-semibold mb-2">Study Sessions</h2>
              <p className="text-purple-100 text-sm mb-4">
                Automatically scheduled to your calendar
              </p>
              <p className="text-3xl font-bold">0</p>
              <p className="text-sm text-purple-100">Upcoming sessions</p>
            </div>

            {/* Quick Tips */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                💡 Quick Tips
              </h3>
              <ul className="text-xs text-yellow-800 dark:text-yellow-300 space-y-1">
                <li>• Connect your Google Calendar to schedule tasks</li>
                <li>• Tell me about your assignments to get started</li>
                <li>• I'll break them into manageable tasks</li>
                <li>• Tasks will be automatically scheduled</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
