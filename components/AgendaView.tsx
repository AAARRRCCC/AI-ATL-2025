"use client";

import { useState, useMemo } from "react";
import { CalendarEvent } from "./Calendar";
import { format, addDays, startOfDay, endOfDay, isWithinInterval, isSameDay } from "date-fns";
import { Calendar, Clock, FileText, ChevronRight, Sparkles } from "lucide-react";

interface AgendaViewProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}

const TIME_RANGES = [
  { label: "Next 3 Days", days: 3 },
  { label: "Next Week", days: 7 },
  { label: "Next 2 Weeks", days: 14 },
  { label: "Next Month", days: 30 },
];

export function AgendaView({ events, onEventClick }: AgendaViewProps) {
  const [selectedRange, setSelectedRange] = useState(TIME_RANGES[0]);

  const filteredEvents = useMemo(() => {
    const now = new Date();
    const endDate = addDays(now, selectedRange.days);

    return events
      .filter((event) =>
        isWithinInterval(event.start, { start: now, end: endDate })
      )
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [events, selectedRange]);

  // Group events by day
  const eventsByDay = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>();

    filteredEvents.forEach((event) => {
      const dateKey = format(event.start, "yyyy-MM-dd");
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(event);
    });

    return grouped;
  }, [filteredEvents]);

  const getPhaseColor = (event: CalendarEvent) => {
    if (!event.isStudyAutopilot) return "bg-gray-500";

    switch (event.phase) {
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
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex flex-wrap gap-2">
        {TIME_RANGES.map((range) => (
          <button
            key={range.label}
            onClick={() => setSelectedRange(range)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              selectedRange.label === range.label
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>

      {/* Events List */}
      {eventsByDay.size === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full mb-4">
            <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Upcoming Events
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            You have no events scheduled for the selected time range.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(eventsByDay.entries()).map(([dateKey, dayEvents]) => {
            const date = new Date(dateKey);
            const isToday = isSameDay(date, new Date());

            return (
              <div key={dateKey} className="space-y-3">
                {/* Day Header */}
                <div className="flex items-center gap-3">
                  <div
                    className={`flex-shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center ${
                      isToday
                        ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <span className="text-xs font-medium uppercase">
                      {format(date, "EEE")}
                    </span>
                    <span className="text-2xl font-bold">
                      {format(date, "d")}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {format(date, "EEEE, MMMM d")}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {dayEvents.length} {dayEvents.length === 1 ? "event" : "events"}
                    </p>
                  </div>
                </div>

                {/* Events for this day */}
                <div className="space-y-2 ml-2 pl-6 border-l-2 border-gray-200 dark:border-gray-700">
                  {dayEvents.map((event) => (
                    <div
                      key={event.id}
                      onClick={() => onEventClick?.(event)}
                      className="group relative bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg transition-all cursor-pointer"
                    >
                      {/* Event indicator dot */}
                      <div
                        className={`absolute -left-[33px] top-6 w-4 h-4 rounded-full ${getPhaseColor(
                          event
                        )} ring-4 ring-white dark:ring-gray-900`}
                      ></div>

                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                              {event.title}
                            </h4>
                            {event.isStudyAutopilot && (
                              <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                                <Sparkles className="w-3 h-3" />
                                Study
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>
                                {format(event.start, "h:mm a")} - {format(event.end, "h:mm a")}
                              </span>
                            </div>
                            <div className="text-gray-400 dark:text-gray-600">
                              {Math.round((event.end.getTime() - event.start.getTime()) / (1000 * 60))} min
                            </div>
                          </div>

                          {event.description && (
                            <div className="mt-2 flex items-start gap-1 text-sm text-gray-600 dark:text-gray-400">
                              <FileText className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <p className="line-clamp-2">{event.description}</p>
                            </div>
                          )}

                          {event.phase && (
                            <div className="mt-2">
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                Phase: {event.phase}
                              </span>
                            </div>
                          )}
                        </div>

                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
