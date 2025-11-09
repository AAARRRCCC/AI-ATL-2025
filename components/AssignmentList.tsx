"use client";

import { useState, useEffect } from "react";
import AssignmentCard, { Assignment } from "./AssignmentCard";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, AlertCircle, BookOpen } from "lucide-react";

interface AssignmentListProps {
  statusFilter?: string;
  subjectFilter?: string;
  onAssignmentClick?: (assignment: Assignment) => void;
  refreshTrigger?: number;
  limit?: number; // For dashboard - show only top N
}

export default function AssignmentList({
  statusFilter = "all",
  subjectFilter = "all",
  onAssignmentClick,
  refreshTrigger = 0,
  limit,
}: AssignmentListProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAssignments();
  }, [statusFilter, subjectFilter, refreshTrigger]);

  const fetchAssignments = async () => {
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
      if (subjectFilter && subjectFilter !== "all") {
        params.append("subject", subjectFilter);
      }
      params.append("sortBy", "due_date"); // Sort by due date

      const response = await fetch(`/api/assignments?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch assignments");
      }

      const data = await response.json();
      let fetchedAssignments: Assignment[] = data.assignments.map((a: any) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        subject: a.subject,
        dueDate: new Date(a.dueDate),
        difficultyLevel: a.difficultyLevel,
        status: a.status,
        progress: a.progress,
        taskCount: a.taskCount,
        completedTaskCount: a.completedTaskCount,
        totalEstimatedHours: a.totalEstimatedHours,
      }));

      // Apply limit if specified (for dashboard)
      if (limit && limit > 0) {
        fetchedAssignments = fetchedAssignments.slice(0, limit);
      }

      setAssignments(fetchedAssignments);
    } catch (err: any) {
      console.error("Error fetching assignments:", err);
      setError(err.message || "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading assignments...</span>
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
  if (assignments.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mb-4">
          <BookOpen className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
          No assignments found
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Chat with AI to create your first assignment!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <AnimatePresence>
        {assignments.map((assignment) => (
          <AssignmentCard
            key={assignment.id}
            assignment={assignment}
            onClick={onAssignmentClick}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
