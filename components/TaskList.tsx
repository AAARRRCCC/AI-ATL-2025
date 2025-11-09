"use client";

import { useState, useEffect } from "react";
import { TaskCard, Task } from "./TaskCard";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface TaskListProps {
  statusFilter?: string;
  assignmentFilter?: string;
  dateFilter?: "today" | "week" | "all";
  onTaskClick?: (task: Task) => void;
  onTaskComplete?: (taskId: string) => void;
  refreshTrigger?: number;
}

interface AssignmentGroup {
  assignmentId: string;
  assignmentTitle: string;
  assignmentSubject?: string;
  assignmentDueDate?: Date;
  tasks: Task[];
  completedCount: number;
  progress: number;
}

export default function TaskList({
  statusFilter = "all",
  assignmentFilter = "all",
  dateFilter = "all",
  onTaskClick,
  onTaskComplete,
  refreshTrigger = 0
}: TaskListProps) {
  const [taskGroups, setTaskGroups] = useState<AssignmentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, assignmentFilter, dateFilter, refreshTrigger]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      // Build query parameters
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (assignmentFilter && assignmentFilter !== "all") {
        params.append("assignment_id", assignmentFilter);
      }

      // Add date filtering
      if (dateFilter === "today") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        params.append("start_date", today.toISOString());
        params.append("end_date", tomorrow.toISOString());
      } else if (dateFilter === "week") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        params.append("start_date", today.toISOString());
        params.append("end_date", weekFromNow.toISOString());
      }

      const response = await fetch(`/api/tasks?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }

      const data = await response.json();
      const tasks: Task[] = data.tasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        phase: t.phase,
        estimatedDuration: t.estimatedDuration,
        scheduledStart: t.scheduledStart ? new Date(t.scheduledStart) : undefined,
        scheduledEnd: t.scheduledEnd ? new Date(t.scheduledEnd) : undefined,
        status: t.status,
        assignmentTitle: t.assignmentTitle,
      }));

      // Group tasks by assignment
      const groups: { [key: string]: AssignmentGroup } = {};

      tasks.forEach((task: any) => {
        const assignmentId = task.assignmentId || "unassigned";
        const assignmentTitle = task.assignmentTitle || "Unassigned Tasks";

        if (!groups[assignmentId]) {
          groups[assignmentId] = {
            assignmentId,
            assignmentTitle,
            assignmentSubject: task.assignmentSubject,
            assignmentDueDate: task.assignmentDueDate ? new Date(task.assignmentDueDate) : undefined,
            tasks: [],
            completedCount: 0,
            progress: 0,
          };
        }

        groups[assignmentId].tasks.push(task);
        if (task.status === "completed") {
          groups[assignmentId].completedCount++;
        }
      });

      // Calculate progress for each group
      Object.values(groups).forEach((group) => {
        group.progress = group.tasks.length > 0
          ? Math.round((group.completedCount / group.tasks.length) * 100)
          : 0;
      });

      setTaskGroups(Object.values(groups));
    } catch (err: any) {
      console.error("Error fetching tasks:", err);
      setError(err.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleTaskComplete = async (taskId: string) => {
    if (onTaskComplete) {
      onTaskComplete(taskId);
    }
    // Refresh tasks after completion
    fetchTasks();
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading tasks...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <AlertCircle className="w-8 h-8 text-red-500" />
        <span className="ml-3 text-red-600 dark:text-red-400">{error}</span>
      </div>
    );
  }

  // Empty state
  if (taskGroups.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mb-4">
          <CheckCircle className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
          No tasks found
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          {statusFilter === "completed"
            ? "You haven't completed any tasks yet"
            : "Chat with AI to create your first assignment!"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {taskGroups.map((group) => (
          <motion.div
            key={group.assignmentId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Assignment Header */}
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {group.assignmentTitle}
                  </h3>
                  {group.assignmentSubject && (
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {group.assignmentSubject}
                    </span>
                  )}
                  {group.assignmentDueDate && (
                    <span className="text-xs text-gray-600 dark:text-gray-400 ml-2">
                      • Due {new Date(group.assignmentDueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {group.completedCount} / {group.tasks.length} Complete
                  </div>
                  <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                      style={{ width: `${group.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tasks List */}
            <div className="p-4 space-y-3">
              {group.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={handleTaskComplete}
                  onClick={onTaskClick}
                />
              ))}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
