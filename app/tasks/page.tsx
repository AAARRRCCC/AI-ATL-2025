"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TaskList from "@/components/TaskList";
import TaskFilters from "@/components/TaskFilters";
import TaskDetailModal from "@/components/TaskDetailModal";
import { Task } from "@/components/TaskCard";
import { motion } from "framer-motion";
import { GraduationCap, Settings, ListTodo, BookOpen } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { GoogleCalendarButton } from "@/components/GoogleCalendarButton";

export default function TasksPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "all">("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth");
      return;
    }
    setIsAuthenticated(true);
    setLoading(false);
  }, [router]);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleTaskComplete = async (taskId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // Refresh task list
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Failed to complete task:", error);
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Refresh task list
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  const handleClearFilters = () => {
    setStatusFilter("all");
    setDateFilter("all");
  };

  const handleRefreshTasks = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  Study Autopilot
                </span>
              </div>

              {/* Navigation Links */}
              <nav className="hidden md:flex items-center gap-1">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => router.push("/tasks")}
                  className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-all flex items-center gap-2"
                >
                  <ListTodo className="w-4 h-4" />
                  Tasks
                </button>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  Calendar
                </button>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <GoogleCalendarButton />

              <button
                onClick={() => router.push("/preferences")}
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

      {/* Page Title Section */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <ListTodo className="w-8 h-8 text-blue-500" />
            My Tasks
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and focus on your study tasks
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Filters */}
          <TaskFilters
            statusFilter={statusFilter}
            dateFilter={dateFilter}
            onStatusChange={setStatusFilter}
            onDateChange={setDateFilter}
            onClearFilters={handleClearFilters}
          />

          {/* Task List */}
          <TaskList
            statusFilter={statusFilter}
            dateFilter={dateFilter}
            onTaskClick={handleTaskClick}
            onTaskComplete={handleTaskComplete}
            refreshTrigger={refreshTrigger}
          />
        </motion.div>
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTask(null);
        }}
        onComplete={handleTaskComplete}
        onDelete={handleTaskDelete}
        onRefresh={handleRefreshTasks}
      />
    </div>
  );
}
