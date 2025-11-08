"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, Settings } from "lucide-react";
import toast, { Toaster } from 'react-hot-toast';
import { GoogleCalendarButton } from "@/components/GoogleCalendarButton";
import { ChatContainer } from "@/components/chat/ChatContainer";
import ThemeToggle from "@/components/ThemeToggle";
import { CalendarSection } from "@/components/CalendarSection";
import { motion } from "framer-motion";

interface User {
  _id: string;
  email: string;
  name: string;
  createdAt: string;
  googleAccessToken?: string;
}

function DashboardContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignmentsCount, setAssignmentsCount] = useState<number | null>(null);
  const [sessionsCount, setSessionsCount] = useState<number | null>(null);
  const [countersLoading, setCountersLoading] = useState(true);
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

  const fetchCounts = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setCountersLoading(true);
    try {
      const [assignmentsRes, sessionsRes] = await Promise.all([
        fetch('/api/assignments/count', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/tasks/count', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (assignmentsRes.ok) {
        const assignments = await assignmentsRes.json();
        setAssignmentsCount(assignments.count);
      } else {
        console.error('Failed to fetch assignments count:', assignmentsRes.status);
        setAssignmentsCount(0);
      }

      if (sessionsRes.ok) {
        const sessions = await sessionsRes.json();
        setSessionsCount(sessions.count);
      } else {
        console.error('Failed to fetch sessions count:', sessionsRes.status);
        setSessionsCount(0);
      }
    } catch (error) {
      console.error('Failed to fetch counts:', error);
      setAssignmentsCount(0);
      setSessionsCount(0);
    } finally {
      setCountersLoading(false);
    }
  }, []);

  // Fetch counters when component mounts and user is authenticated
  useEffect(() => {
    if (user) {
      fetchCounts();
    }
  }, [user, fetchCounts]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header Skeleton */}
        <header className="bg-white dark:bg-gray-800 shadow sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 skeleton"></div>
                <div className="w-40 h-6 skeleton"></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-32 h-10 skeleton"></div>
                <div className="w-40 h-10 skeleton"></div>
                <div className="w-10 h-10 skeleton"></div>
                <div className="w-20 h-10 skeleton"></div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Skeleton */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8 space-y-3">
            <div className="w-64 h-8 skeleton"></div>
            <div className="w-96 h-5 skeleton"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chat Skeleton */}
            <div className="lg:col-span-2">
              <div className="h-[600px] rounded-lg skeleton"></div>
            </div>

            {/* Sidebar Skeleton */}
            <div className="space-y-6">
              <div className="h-48 rounded-lg skeleton"></div>
              <div className="h-32 rounded-lg skeleton"></div>
              <div className="h-32 rounded-lg skeleton"></div>
              <div className="h-40 rounded-lg skeleton"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Toast Notifications */}
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700">
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
                className="p-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all hover:scale-110 active:scale-95"
                title="Preferences"
              >
                <Settings className="w-5 h-5" />
              </button>

              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all hover-scale active-scale"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Chat with AI to create assignments and schedule your study sessions.
          </p>
        </motion.div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Container - Takes 2 columns */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="lg:col-span-2"
          >
            <ChatContainer userId={user?._id || null} onDataChange={fetchCounts} />
          </motion.div>

          {/* Sidebar - Takes 1 column */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="space-y-6"
          >
            {/* Account Info Card */}
            <motion.div
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 transition-all hover:shadow-xl"
            >
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

            {/* Quick Stats */}
            <div className="grid grid-cols-1 gap-4">
              {/* Assignments Card */}
              <motion.div
                whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
                className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-5 text-white border border-blue-400 dark:border-blue-700 transition-all hover:shadow-xl cursor-pointer"
              >
                <h2 className="text-base font-semibold mb-1">Assignments</h2>
                <p className="text-blue-100 text-xs mb-3">
                  Create assignments by chatting with AI
                </p>
                {countersLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-8 bg-blue-400/30 rounded animate-pulse"></div>
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-bold">{assignmentsCount ?? 0}</p>
                    <p className="text-xs text-blue-100">Active assignments</p>
                  </>
                )}
              </motion.div>

              {/* Study Sessions Card */}
              <motion.div
                whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
                className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-5 text-white border border-purple-400 dark:border-purple-700 transition-all hover:shadow-xl cursor-pointer"
              >
                <h2 className="text-base font-semibold mb-1">Study Sessions</h2>
                <p className="text-purple-100 text-xs mb-3">
                  Automatically scheduled to your calendar
                </p>
                {countersLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-8 bg-purple-400/30 rounded animate-pulse"></div>
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-bold">{sessionsCount ?? 0}</p>
                    <p className="text-xs text-purple-100">Upcoming sessions</p>
                  </>
                )}
              </motion.div>
            </div>

            {/* Quick Tips */}
            <motion.div
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
              className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 transition-all hover:shadow-md"
            >
              <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                Quick Tips
              </h3>
              <ul className="text-xs text-yellow-800 dark:text-yellow-300 space-y-1">
                <li>• Connect your Google Calendar to schedule tasks</li>
                <li>• Tell me about your assignments to get started</li>
                <li>• I'll break them into manageable tasks</li>
                <li>• Tasks will be automatically scheduled</li>
              </ul>
            </motion.div>
          </div>
        </div>

        {/* Calendar Section - Full Width Below */}
        <div className="mt-8">
          <CalendarSection
            userId={user?._id || null}
            isCalendarConnected={!!user?.googleAccessToken}
          />
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-900 dark:text-gray-400">Loading...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
