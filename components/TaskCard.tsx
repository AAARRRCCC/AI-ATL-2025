"use client";

import { motion } from "framer-motion";
import { Calendar, Clock, CheckCircle2, Circle } from "lucide-react";

export interface Task {
  id: string;
  title: string;
  description?: string;
  phase?: string;
  estimatedDuration: number; // minutes
  scheduledStart?: Date;
  scheduledEnd?: Date;
  status: "pending" | "scheduled" | "in_progress" | "completed";
  assignmentTitle?: string;
}

interface TaskCardProps {
  task: Task;
  onComplete?: (taskId: string) => void;
  onClick?: (task: Task) => void;
}

export function TaskCard({ task, onComplete, onClick }: TaskCardProps) {
  const getStatusColor = () => {
    switch (task.status) {
      case "completed":
        return "bg-green-100 border-green-300 text-green-800";
      case "in_progress":
        return "bg-blue-100 border-blue-300 text-blue-800";
      case "scheduled":
        return "bg-purple-100 border-purple-300 text-purple-800";
      default:
        return "bg-gray-100 border-gray-300 text-gray-800";
    }
  };

  const getPhaseColor = () => {
    switch (task.phase) {
      case "Research":
        return "bg-blue-500";
      case "Drafting":
        return "bg-purple-500";
      case "Revision":
        return "bg-green-500";
      default:
        return "bg-indigo-500";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${getStatusColor()}`}
      onClick={() => onClick?.(task)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          {task.phase && (
            <span className={`inline-block px-2 py-1 text-xs font-semibold text-white rounded ${getPhaseColor()} mb-2`}>
              {task.phase}
            </span>
          )}
          <h3 className="font-semibold text-sm">{task.title}</h3>
          {task.assignmentTitle && (
            <p className="text-xs opacity-70 mt-1">{task.assignmentTitle}</p>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (task.status !== "completed" && onComplete) {
              onComplete(task.id);
            }
          }}
          className="ml-2"
        >
          {task.status === "completed" ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <Circle className="w-5 h-5 opacity-50 hover:opacity-100" />
          )}
        </button>
      </div>

      {task.description && (
        <p className="text-xs opacity-80 mb-2 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center gap-3 text-xs mt-2">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{task.estimatedDuration} min</span>
        </div>
        {task.scheduledStart && (
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>
              {new Date(task.scheduledStart).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}{" "}
              {new Date(task.scheduledStart).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
