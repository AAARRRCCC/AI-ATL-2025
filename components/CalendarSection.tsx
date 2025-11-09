"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, CalendarEvent } from "./Calendar";
import { EventDetailsModal } from "./EventDetailsModal";
import { AddEventModal } from "./AddEventModal";
import { CalendarDays, RefreshCw, Calendar as CalendarIcon, AlertCircle, CheckCircle, Plus } from "lucide-react";
import { View } from "react-big-calendar";

interface CalendarSectionProps {
  userId: string | null;
  isCalendarConnected: boolean;
  onDataChange?: () => void;
  onRefreshReady?: (refreshFn: () => void) => void;
}

export function CalendarSection({ userId, isCalendarConnected, onDataChange, onRefreshReady }: CalendarSectionProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentView, setCurrentView] = useState<View>("week");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [calendarViewStart, setCalendarViewStart] = useState('08:00');
  const [calendarViewEnd, setCalendarViewEnd] = useState('23:59');

  const fetchEvents = useCallback(async (showRefreshState = false) => {
    if (!userId || !isCalendarConnected) {
      setLoading(false);
      return;
    }

    if (showRefreshState) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      // First, sync assignments with calendar (delete orphaned assignments)
      try {
        console.log("========================================");
        console.log("STARTING CALENDAR SYNC");
        console.log("========================================");
        const syncResponse = await fetch("/api/assignments/sync-with-calendar", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (syncResponse.ok) {
          const syncData = await syncResponse.json();
          console.log("✅ SYNC SUCCESS:", syncData.message);
          console.log("   - Deleted assignments:", syncData.deleted_assignments);
          console.log("   - Deleted subtasks:", syncData.deleted_subtasks);
          console.log("   - Updated assignments:", syncData.updated_assignments);
          console.log("   - Calendar events found:", syncData.calendar_events);

          // Trigger count refresh if anything was deleted or updated
          if (syncData.deleted_assignments > 0 || syncData.deleted_subtasks > 0 || syncData.updated_assignments > 0) {
            console.log("🔄 Triggering widget count refresh");
            onDataChange?.();
          }
        } else {
          const errorText = await syncResponse.text();
          console.error("❌ SYNC FAILED:", syncResponse.status, errorText);
        }
      } catch (syncErr) {
        console.error("❌ SYNC ERROR:", syncErr);
        // Continue with calendar fetch even if sync fails
      }
      console.log("========================================");

      // Fetch events for the next 30 days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // Include past week
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30); // Next 30 days

      const response = await fetch(
        `/api/calendar/events?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch calendar events");
      }

      const data = await response.json();

      if (data.success && data.events) {
        // Transform events to match CalendarEvent interface
        const formattedEvents: CalendarEvent[] = data.events.map((event: any) => ({
          id: event.id,
          title: event.title,
          start: new Date(event.start),
          end: new Date(event.end),
          description: event.description || "",
          // Check if it's a SteadyStudy event
          isStudyAutopilot: event.title?.includes("[SteadyStudy]"),
          googleEventId: event.id,
        }));

        setEvents(formattedEvents);
      } else {
        setEvents([]);
      }
    } catch (err: any) {
      console.error("Error fetching calendar events:", err);
      setError(err.message || "Failed to load calendar events");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, isCalendarConnected]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Fetch preferences for calendar view hours
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await fetch('/api/preferences', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setCalendarViewStart(data.studySettings?.calendarViewStart || '08:00');
          setCalendarViewEnd(data.studySettings?.calendarViewEnd || '23:59');
        }
      } catch (error) {
        console.error('Error fetching preferences:', error);
        // Use defaults if fetch fails
      }
    };

    fetchPreferences();

    // Re-fetch preferences when user returns to the page
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchPreferences();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleRefresh = useCallback(() => {
    fetchEvents(true);
    // Also trigger widget count refresh on manual refresh
    onDataChange?.();
  }, [fetchEvents, onDataChange]);

  // Expose refresh function to parent
  useEffect(() => {
    if (onRefreshReady) {
      onRefreshReady(handleRefresh);
    }
  }, [onRefreshReady, handleRefresh]);

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const handleEventMove = async (eventId: string, start: Date, end: Date) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      // Optimistically update the UI
      setEvents((prevEvents) =>
        prevEvents.map((event) =>
          event.id === eventId
            ? { ...event, start, end }
            : event
        )
      );

      const response = await fetch("/api/calendar/update-event", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update event");
      }

      // Optionally refresh events from server
      // await fetchEvents(false);
    } catch (err: any) {
      console.error("Error moving event:", err);
      // Revert the optimistic update on error
      await fetchEvents(false);
      setError(err.message || "Failed to move event");
    }
  };

  const handleEventResize = async (eventId: string, start: Date, end: Date) => {
    // Same as move, just updating the times
    await handleEventMove(eventId, start, end);
  };

  const handleSelectSlot = (start: Date, end: Date) => {
    setSelectedSlot({ start, end });
    setShowAddEventModal(true);
  };

  const handleAddEvent = async (title: string, description: string, start: Date, end: Date) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      // Create temporary event for optimistic update
      const tempId = `temp-${Date.now()}`;
      const tempEvent: CalendarEvent = {
        id: tempId,
        title,
        description,
        start,
        end,
        isStudyAutopilot: false,
      };

      // Optimistically add to UI
      setEvents((prevEvents) => [...prevEvents, tempEvent]);

      const response = await fetch("/api/calendar/create-event", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          isStudyAutopilot: false,
          checkConflict: false, // Allow overlapping events for manual creation
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create event");
      }

      const result = await response.json();

      // Replace temp event with real event from server
      setEvents((prevEvents) =>
        prevEvents.map((event) =>
          event.id === tempId
            ? {
              id: result.event.id,
              title: result.event.summary || title,
              start,
              end,
              description,
              isStudyAutopilot: false,
            }
            : event
        )
      );
    } catch (err: any) {
      console.error("Error creating event:", err);
      // Remove the temporary event on error
      setEvents((prevEvents) => prevEvents.filter((event) => !event.id.startsWith("temp-")));
      throw err; // Re-throw so modal can show error
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      // Optimistically remove from UI
      setEvents((prevEvents) => prevEvents.filter((event) => event.id !== eventId));

      const response = await fetch(`/api/calendar/delete-event?eventId=${encodeURIComponent(eventId)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete event");
      }

      const result = await response.json();

      // If a task or assignment was deleted from database, update counts
      if (result.deletedTask || result.deletedAssignment) {
        console.log("🔄 Database updated - refreshing widget counts");
        onDataChange?.();
      }
    } catch (err: any) {
      console.error("Error deleting event:", err);
      setError(err.message || "Failed to delete event");
      // Revert optimistic update on error
      await fetchEvents(false);
    }
  };

  if (!isCalendarConnected) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-xl shadow-lg p-8 border-2 border-dashed border-blue-200 dark:border-gray-600">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="p-4 bg-white dark:bg-gray-700 rounded-full shadow-md">
            <CalendarDays className="w-12 h-12 text-blue-500 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Connect Your Calendar
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm max-w-md">
              Connect your Google Calendar to see your scheduled events and study sessions here.
            </p>
          </div>
          <div className="pt-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Click the "Connect Google Calendar" button in the header to get started.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-red-200 dark:border-red-800">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Error Loading Calendar
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative animate-fadeIn">
      {/* Modals */}
      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onDelete={handleDeleteEvent}
        />
      )}
      {showAddEventModal && (
        <AddEventModal
          initialStart={selectedSlot?.start}
          initialEnd={selectedSlot?.end}
          onClose={() => {
            setShowAddEventModal(false);
            setSelectedSlot(null);
          }}
          onAdd={handleAddEvent}
        />
      )}

      {/* Calendar Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-t-xl shadow-lg p-4 md:p-6 ">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg shadow-md">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white">Your Calendar</h2>
              <p className="text-blue-100 text-sm">
                {events.length} {events.length === 1 ? "event" : "events"} scheduled
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddEventModal(true)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 text-white font-medium"
              title="Add new event"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Add Event</span>
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              title="Refresh calendar"
            >
              <RefreshCw className={`w-5 h-5 text-white ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Body */}
      <div className="bg-white dark:bg-gray-800 rounded-b-xl shadow-lg overflow-hidden border-x-2 border-b-2 border-gray-100 dark:border-gray-700">
        {loading ? (
          <div className="p-8">
            <CalendarSkeleton />
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full mb-4 shadow-md">
              <CheckCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              All Clear!
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm max-w-md mx-auto">
              No upcoming events scheduled. Create assignments through chat and I'll automatically schedule them for you.
            </p>
          </div>
        ) : (
          <div className="p-2 md:p-4" style={{ minHeight: "600px" }}>
            <Calendar
              events={events}
              onEventClick={handleEventClick}
              onEventMove={handleEventMove}
              onEventResize={handleEventResize}
              onSelectSlot={handleSelectSlot}
              viewStart={calendarViewStart}
              viewEnd={calendarViewEnd}
            />
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}

// Loading skeleton component
function CalendarSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex gap-4">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="flex-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="space-y-2">
              <div className="h-16 bg-gray-100 dark:bg-gray-700/50 rounded"></div>
              <div className="h-16 bg-gray-100 dark:bg-gray-700/50 rounded"></div>
            </div>
          </div>
        ))}
      </div>
      <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
        Loading your calendar...
      </div>
    </div>
  );
}
