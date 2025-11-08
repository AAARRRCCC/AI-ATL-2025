"use client";

import { Calendar as BigCalendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { useState, useCallback, useEffect } from "react";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  isStudyAutopilot?: boolean;
  phase?: string;
  status?: "pending" | "in_progress" | "completed";
  googleEventId?: string;
}

const DragAndDropCalendar = withDragAndDrop<CalendarEvent>(BigCalendar);

interface CalendarProps {
  events?: CalendarEvent[];
  onEventMove?: (eventId: string, start: Date, end: Date) => void;
  onEventResize?: (eventId: string, start: Date, end: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onSelectSlot?: (start: Date, end: Date) => void;
}

export function Calendar({
  events = [],
  onEventMove,
  onEventResize,
  onEventClick,
  onSelectSlot,
}: CalendarProps) {
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState(new Date());

  const handleEventDrop = useCallback(
    ({ event, start, end }: any) => {
      if (onEventMove && event.isStudyAutopilot) {
        onEventMove(event.id, start, end);
      }
    },
    [onEventMove]
  );

  const handleEventResize = useCallback(
    ({ event, start, end }: any) => {
      if (onEventResize && event.isStudyAutopilot) {
        onEventResize(event.id, start, end);
      }
    },
    [onEventResize]
  );

  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      if (onEventClick) {
        onEventClick(event);
      }
    },
    [onEventClick]
  );

  const handleSelectSlot = useCallback(
    ({ start, end }: { start: Date; end: Date }) => {
      if (onSelectSlot) {
        onSelectSlot(start, end);
      }
    },
    [onSelectSlot]
  );

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = "#3b82f6"; // Default blue

    if (event.isStudyAutopilot) {
      // Color code by phase
      switch (event.phase) {
        case "Research":
          backgroundColor = "#3b82f6"; // Blue
          break;
        case "Drafting":
          backgroundColor = "#8b5cf6"; // Purple
          break;
        case "Revision":
          backgroundColor = "#22c55e"; // Green
          break;
        default:
          backgroundColor = "#6366f1"; // Indigo
      }

      // Reduce opacity if completed
      if (event.status === "completed") {
        return {
          style: {
            backgroundColor,
            opacity: 0.6,
            borderRadius: "8px",
            border: "none",
            color: "white",
            fontWeight: 500,
          },
        };
      }
    } else {
      // Google Calendar events (not Study Autopilot)
      backgroundColor = "#9ca3af"; // Gray
    }

    return {
      style: {
        backgroundColor,
        borderRadius: "8px",
        border: "none",
        color: "white",
        fontWeight: 500,
      },
    };
  };

  return (
    <div className="h-full w-full bg-white dark:bg-gray-800 rounded-lg p-4">
      <style jsx global>{`
        /* Custom calendar styles */
        .rbc-calendar {
          font-family: inherit;
        }

        .rbc-header {
          padding: 12px 6px;
          font-weight: 600;
          color: #374151;
          font-size: 14px;
          border-bottom: 2px solid #e5e7eb;
        }

        .dark .rbc-header {
          color: #d1d5db;
          border-bottom-color: #374151;
        }

        .rbc-today {
          background-color: #eff6ff;
        }

        .dark .rbc-today {
          background-color: #1e3a8a;
        }

        .rbc-off-range-bg {
          background-color: #f9fafb;
        }

        .dark .rbc-off-range-bg {
          background-color: #111827;
        }

        .rbc-event {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 13px;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .rbc-event:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
        }

        .rbc-event.rbc-selected {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
        }

        .rbc-day-slot .rbc-time-slot {
          border-top: 1px solid #f3f4f6;
        }

        .dark .rbc-day-slot .rbc-time-slot {
          border-top-color: #374151;
        }

        .rbc-time-content {
          border-top: 2px solid #e5e7eb;
        }

        .dark .rbc-time-content {
          border-top-color: #374151;
        }

        .rbc-time-header-content {
          border-left: 1px solid #e5e7eb;
        }

        .dark .rbc-time-header-content {
          border-left-color: #374151;
        }

        .rbc-time-slot {
          color: #6b7280;
        }

        .dark .rbc-time-slot {
          color: #9ca3af;
        }

        .rbc-current-time-indicator {
          background-color: #ef4444;
          height: 2px;
        }

        .rbc-toolbar {
          padding: 16px 0;
          margin-bottom: 16px;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
        }

        .rbc-toolbar button {
          padding: 8px 16px;
          border: 1px solid #e5e7eb;
          background-color: white;
          color: #374151;
          border-radius: 8px;
          font-weight: 500;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .dark .rbc-toolbar button {
          border-color: #374151;
          background-color: #1f2937;
          color: #d1d5db;
        }

        .rbc-toolbar button:hover {
          background-color: #f3f4f6;
          border-color: #d1d5db;
        }

        .dark .rbc-toolbar button:hover {
          background-color: #374151;
          border-color: #4b5563;
        }

        .rbc-toolbar button.rbc-active {
          background-color: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .dark .rbc-toolbar button.rbc-active {
          background-color: #2563eb;
          border-color: #2563eb;
        }

        .rbc-toolbar-label {
          font-weight: 600;
          font-size: 18px;
          color: #111827;
          flex-grow: 1;
          text-align: center;
        }

        .dark .rbc-toolbar-label {
          color: #f9fafb;
        }

        /* Smooth animations */
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .rbc-event {
          animation: fadeIn 0.3s ease;
        }
      `}</style>
      <DndProvider backend={HTML5Backend}>
        <DragAndDropCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          titleAccessor="title"
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable
          resizable
          style={{ height: "100%", minHeight: 600 }}
          eventPropGetter={eventStyleGetter}
          popup
          showMultiDayTimes
          step={30}
          timeslots={2}
          draggableAccessor={(event: CalendarEvent) => event.isStudyAutopilot || false}
          resizableAccessor={(event: CalendarEvent) => event.isStudyAutopilot || false}
        />
      </DndProvider>
    </div>
  );
}
