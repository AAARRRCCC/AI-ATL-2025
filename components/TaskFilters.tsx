"use client";

import { motion } from "framer-motion";
import { Calendar, CheckCircle, Clock, List, X } from "lucide-react";

interface TaskFiltersProps {
  statusFilter: string;
  dateFilter: "today" | "week" | "all";
  onStatusChange: (status: string) => void;
  onDateChange: (date: "today" | "week" | "all") => void;
  onClearFilters: () => void;
}

export default function TaskFilters({
  statusFilter,
  dateFilter,
  onStatusChange,
  onDateChange,
  onClearFilters,
}: TaskFiltersProps) {
  const statusOptions = [
    { value: "all", label: "All", icon: List, color: "gray" },
    { value: "pending", label: "Pending", icon: Clock, color: "yellow" },
    { value: "scheduled", label: "Scheduled", icon: Calendar, color: "purple" },
    { value: "in_progress", label: "In Progress", icon: Clock, color: "blue" },
    { value: "completed", label: "Completed", icon: CheckCircle, color: "green" },
  ];

  const dateOptions = [
    { value: "today" as const, label: "Today" },
    { value: "week" as const, label: "This Week" },
    { value: "all" as const, label: "All Time" },
  ];

  const hasActiveFilters = statusFilter !== "all" || dateFilter !== "all";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Status Filter */}
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
          Status
        </label>
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((option) => {
            const Icon = option.icon;
            const isActive = statusFilter === option.value;

            return (
              <motion.button
                key={option.value}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onStatusChange(option.value)}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                  ${
                    isActive
                      ? option.color === "gray"
                        ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
                        : option.color === "yellow"
                        ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-2 border-yellow-300 dark:border-yellow-700"
                        : option.color === "purple"
                        ? "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border-2 border-purple-300 dark:border-purple-700"
                        : option.color === "blue"
                        ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-2 border-blue-300 dark:border-blue-700"
                        : "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-2 border-green-300 dark:border-green-700"
                      : "bg-gray-100 dark:bg-gray-750 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {option.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Date Filter */}
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
          Time Period
        </label>
        <div className="flex gap-2">
          {dateOptions.map((option) => {
            const isActive = dateFilter === option.value;

            return (
              <motion.button
                key={option.value}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onDateChange(option.value)}
                className={`
                  flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${
                    isActive
                      ? "bg-blue-500 text-white shadow-md"
                      : "bg-gray-100 dark:bg-gray-750 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }
                `}
              >
                {option.label}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
