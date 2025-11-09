"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  Clock,
  Calendar,
  BookOpen,
  Trash2,
  Timer,
} from "lucide-react";
import { Task } from "./TaskCard";

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onRefresh?: () => void;
}

export default function TaskDetailModal({
  task,
  isOpen,
  onClose,
  onComplete,
  onDelete,
  onRefresh,
}: TaskDetailModalProps) {
  const [timerMinutes, setTimerMinutes] = useState(25); // Default Pomodoro
  const [timeRemaining, setTimeRemaining] = useState(timerMinutes * 60); // in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [actualDuration, setActualDuration] = useState(0); // Track actual time spent
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Timer presets
  const timerPresets = [
    { label: "25 min", value: 25 },
    { label: "50 min", value: 50 },
    { label: "90 min", value: 90 },
  ];

  // Reset timer when task changes
  useEffect(() => {
    if (task) {
      // Set default to estimated duration or 25 minutes
      const defaultMinutes = task.estimatedDuration
        ? Math.min(task.estimatedDuration, 90)
        : 25;
      setTimerMinutes(defaultMinutes);
      setTimeRemaining(defaultMinutes * 60);
      setIsRunning(false);
      setActualDuration(0);
    }
  }, [task?.id]);

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            playCompletionSound();
            return 0;
          }
          return prev - 1;
        });
        setActualDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const playCompletionSound = () => {
    // Simple audio notification (browser's default beep)
    const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUKzn77JpGgU7k9jwz3ktBSh+zPLaizsIHGrA8OyhUQwRUrTp77VmHAU+lt7zyn0tBSqBz/Lai0AIIGN/wPDmnlAMEVKx6e+1ZhwFPpje88p9LgUqgdDy2Ys8ByNoe/Dnn1AMEVKy6e+zaBsFOpPX8M95LwUnjc/z3Ik8ByJpe/DooFMMD1Cy6vCxahsFO5TX8M55MAUnjM/z3Ik9ByNpe/DmoE8MDlCy6vCxaxkFO5TX8M56MAUmjM/z3Ik9ByNoe/DmoFAMDlKy6vCxaxkFO5TX8M55MAUnjM/z3Ik9ByRpe/DloFEMDlGy6vCzaBkFOpHY8M96MQUljM/z3Yk9ByRpe/DkoFEMDlGy6vCzaBkFOpHY8M96MQUljM/z3Yk9ByRpe/DkoFEMDlGy6vCzaBkFOpHY8M96MQUljM/z3Yk9ByRpe/DkoFEMDlGy6vCzaBkFOpHY8M96MQUljM/z3Yk9ByRpe/DkoFEMDlGy6vCzaBkFOpHY8M96MQUljM/z3Yk9ByRpe/DkoFEMDlGy6vCzaBkFOpHY8M96MQUljM/z3Yk9ByRpe/DkoFEMDlGy6vCzaBkFOpHY8M96MQUljM/z3Yk9ByRpe/DkoFEMDlGy6vCzaBkFOpHY8M96MQUljM/z3Yk9ByRpe/DkoFEMDlGy6vCzaBkFOpHY8M96MQUljM/z3Yk9ByRpe/DkoFEMDlGy6vCzaBkFOpHY8M96MQUljM/z3Yk9ByRpe/DkoFEMDlGy6vCzaBkFOpHY8M96MQUljM/z3Yk9ByRpe/DkoFEMDlGy6vCzaBkFOpHY8M96MQUljM/z3Yk9ByRpe/DkoFEMDlGy6vCzaBkFOpHY8M96MQUljM/z3Yk9ByRpe/DkoFEMDlGy6vCzaBkFOpHY8M96MQUljM/z3Yk9ByRpe/DkoFEMDlGy6vCzaBkFOpHY8M96MQUljM/z3Yk9ByRpe/DkoFEMDlGy6vCzaBkFOpHY8M96MQUljM/z3Yk9ByRpe/DkoFEMDlGy6vCzaBkFOpHY8M96MQUljM/z3Yk9ByRpe/DkoFEMDlGy6vCzaBkFOpHY8M96MQUljM/z3Yk9ByRpe/DkoFEMDlGy6vCzaBkFOpHY8M96MQUljM/z3Yk9ByRpe/DkoFEMDlGy6vCzaBkFOpHY8M96MQUljM/z3Yk9ByRpe/DkoFEMDlGy6vCzaBkFOpHY8M96MQUljM/z3Yk9ByRpe/DkoFEMDlGy6vCzaBkFOpHY8M96MQUljM/z3Yk9ByRpe/DkoFEMDlGy6vCzaBkFOpHY8M96MQUljM/z3Yk9ByRpe/DkoFEMDlGy6vCzaBkFOpHY8M96MQUljM/z3Yk9ByRpe/DkoFEMDlGy6vCzaBkFOpHY8M96MQUljM/z3Yk9ByRpe/DkoFEMDlGy6vCzaBkFOpHY8M96MQUljM/z3Yk9ByRpe/DkoFEMDlGy6vCzaBkFOpHY8M96MQUljM/z3Yk9ByRpe/DkoFEMDlGy6vCzaBkFOpHY8M96MQUljM/z3Yk9ByRpe/DkoFEMDlGy6vCzaBkFOpHY8M96MQUljM/z3Yk9ByRpe/DkoFEMDlGy6vCzaBkF");
  };

  const handleStart = async () => {
    if (!task) return;

    // Start the task if it's pending
    if (task.status === "pending" || task.status === "scheduled") {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`/api/tasks/${task.id}/start`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          onRefresh?.();
        }
      } catch (error) {
        console.error("Failed to start task:", error);
      }
    }

    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeRemaining(timerMinutes * 60);
  };

  const handleComplete = async () => {
    if (!task) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tasks/${task.id}/complete`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          actualDuration: Math.round(actualDuration / 60), // Convert seconds to minutes
        }),
      });

      if (response.ok) {
        onComplete(task.id);
        onClose();
      }
    } catch (error) {
      console.error("Failed to complete task:", error);
    }
  };

  const handleDelete = async () => {
    if (!task || !onDelete) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        onDelete(task.id);
        onClose();
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!task) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-20 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-2xl z-50 max-h-[80vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-start justify-between z-10">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  {task.title}
                </h2>
                {task.assignmentTitle && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {task.assignmentTitle}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Phase Badge */}
              {task.phase && (
                <div>
                  <span className="inline-block px-3 py-1 text-sm font-semibold text-white rounded-full bg-gradient-to-r from-blue-500 to-purple-500">
                    {task.phase}
                  </span>
                </div>
              )}

              {/* Description */}
              {task.description && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Description
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">{task.description}</p>
                </div>
              )}

              {/* Task Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Estimated Time
                  </h3>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {task.estimatedDuration} minutes
                  </p>
                </div>
                {task.scheduledStart && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Scheduled
                    </h3>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {new Date(task.scheduledStart).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Timer Section */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-750 dark:to-gray-700 rounded-lg p-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <Timer className="w-4 h-4" />
                  Focus Timer
                </h3>

                {/* Timer Presets */}
                <div className="flex gap-2 mb-4">
                  {timerPresets.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => {
                        setTimerMinutes(preset.value);
                        setTimeRemaining(preset.value * 60);
                        setIsRunning(false);
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        timerMinutes === preset.value
                          ? "bg-blue-500 text-white"
                          : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Timer Display */}
                <div className="text-center mb-4">
                  <div className="text-6xl font-bold text-gray-900 dark:text-white mb-2">
                    {formatTime(timeRemaining)}
                  </div>
                  {actualDuration > 0 && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Total time: {formatTime(actualDuration)}
                    </div>
                  )}
                </div>

                {/* Timer Controls */}
                <div className="flex gap-2">
                  {!isRunning ? (
                    <button
                      onClick={handleStart}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition-colors"
                    >
                      <Play className="w-5 h-5" />
                      Start
                    </button>
                  ) : (
                    <button
                      onClick={handlePause}
                      className="flex-1 flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 rounded-lg transition-colors"
                    >
                      <Pause className="w-5 h-5" />
                      Pause
                    </button>
                  )}
                  <button
                    onClick={handleReset}
                    className="px-4 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-white font-semibold py-3 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                {task.status !== "completed" && (
                  <button
                    onClick={handleComplete}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Mark Complete
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-70 z-60 flex items-center justify-center p-4"
            >
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  Delete Task?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Are you sure you want to delete this task? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
