"use client";

import { motion } from "framer-motion";
import { Calendar, BookOpen, Clock, TrendingUp, AlertCircle } from "lucide-react";

export interface Assignment {
  id: string;
  title: string;
  description?: string;
  subject: string;
  dueDate: Date;
  difficultyLevel: string;
  status: string;
  progress: number;
  taskCount: number;
  completedTaskCount: number;
  totalEstimatedHours?: number;
}

interface AssignmentCardProps {
  assignment: Assignment;
  onClick?: (assignment: Assignment) => void;
}

export default function AssignmentCard({ assignment, onClick }: AssignmentCardProps) {
  const getDueDateStatus = () => {
    const today = new Date();
    const dueDate = new Date(assignment.dueDate);
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (assignment.status === "completed") {
      return { label: "Completed", color: "text-green-600 dark:text-green-400", urgent: false };
    }

    if (daysUntilDue < 0) {
      return { label: "Overdue", color: "text-red-600 dark:text-red-400", urgent: true };
    }

    if (daysUntilDue === 0) {
      return { label: "Due Today", color: "text-orange-600 dark:text-orange-400", urgent: true };
    }

    if (daysUntilDue === 1) {
      return { label: "Due Tomorrow", color: "text-orange-600 dark:text-orange-400", urgent: true };
    }

    if (daysUntilDue <= 3) {
      return { label: `${daysUntilDue} days left`, color: "text-yellow-600 dark:text-yellow-400", urgent: false };
    }

    return { label: `${daysUntilDue} days left`, color: "text-gray-600 dark:text-gray-400", urgent: false };
  };

  const getProgressColor = () => {
    if (assignment.progress >= 75) return "from-green-500 to-emerald-500";
    if (assignment.progress >= 50) return "from-blue-500 to-cyan-500";
    if (assignment.progress >= 25) return "from-yellow-500 to-orange-500";
    return "from-red-500 to-pink-500";
  };

  const getDifficultyBadge = () => {
    const colors = {
      easy: "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200",
      medium: "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200",
      hard: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200",
    };

    return colors[assignment.difficultyLevel as keyof typeof colors] || colors.medium;
  };

  const dueStatus = getDueDateStatus();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      onClick={() => onClick?.(assignment)}
      className={`
        relative bg-white dark:bg-gray-800 rounded-lg border-2 transition-all cursor-pointer overflow-hidden
        ${dueStatus.urgent
          ? "border-orange-300 dark:border-orange-700 shadow-lg shadow-orange-100 dark:shadow-orange-900/20"
          : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg"
        }
      `}
    >
      {/* Urgent Indicator */}
      {dueStatus.urgent && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-red-500" />
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">
              {assignment.title}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                <BookOpen className="w-3 h-3" />
                {assignment.subject}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded ${getDifficultyBadge()}`}>
                {assignment.difficultyLevel}
              </span>
            </div>
          </div>

          {/* Circular Progress */}
          <div className="relative w-16 h-16">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-gray-200 dark:text-gray-700"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="url(#gradient)"
                strokeWidth="4"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - assignment.progress / 100)}`}
                className="transition-all duration-500"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" className={`${getProgressColor().split(' ')[0].replace('from-', '')}`} />
                  <stop offset="100%" className={`${getProgressColor().split(' ')[1].replace('to-', '')}`} />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {assignment.progress}%
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        {assignment.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
            {assignment.description}
          </p>
        )}

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>{assignment.completedTaskCount} / {assignment.taskCount} tasks</span>
            <span>{assignment.progress}% complete</span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${assignment.progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`h-full bg-gradient-to-r ${getProgressColor()}`}
            />
          </div>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Calendar className={`w-4 h-4 ${dueStatus.color}`} />
              <span className={dueStatus.color}>{dueStatus.label}</span>
            </div>
            {assignment.totalEstimatedHours && (
              <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span>{assignment.totalEstimatedHours}h</span>
              </div>
            )}
          </div>

          {dueStatus.urgent && (
            <AlertCircle className="w-5 h-5 text-orange-500 animate-pulse" />
          )}
        </div>
      </div>
    </motion.div>
  );
}
