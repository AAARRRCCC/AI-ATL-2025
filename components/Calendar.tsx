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
      if (onEventMove) {
        onEventMove(event.id, start, end);
      }
    },
    [onEventMove]
  );

  const handleEventResize = useCallback(
    ({ event, start, end }: any) => {
      if (onEventResize) {
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
    <div className="h-full w-full bg-white dark:bg-gray-900 rounded-xl p-4">
      <style jsx global>{`
        /* Modern Calendar Styles */
        .rbc-calendar {
          font-family: inherit;
          background: transparent;
        }

        /* Header Styling - More modern, sleek headers */
        .rbc-header {
          padding: 16px 8px;
          font-weight: 700;
          color: #1f2937;
          font-size: 13px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          border-bottom: 3px solid #e5e7eb;
          background: linear-gradient(to bottom, #fafafa, #f9fafb);
        }

        .dark .rbc-header {
          color: #e5e7eb;
          border-bottom-color: #374151;
          background: linear-gradient(to bottom, #1f2937, #111827);
        }

        /* Today highlighting - More prominent */
        .rbc-today {
          background-color: #dbeafe;
        }

        .dark .rbc-today {
          background-color: #1e3a8a;
        }

        /* Off-range dates - Subtle */
        .rbc-off-range-bg {
          background-color: #fafafa;
        }

        .dark .rbc-off-range-bg {
          background-color: #0f172a;
        }

        /* Events - Modern card-like appearance */
        .rbc-event {
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
          cursor: pointer;
          border-left: 3px solid rgba(255, 255, 255, 0.3);
        }

        .rbc-event:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1);
          z-index: 10;
        }

        .rbc-event.rbc-selected {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.6), 0 8px 16px rgba(0, 0, 0, 0.2);
          transform: scale(1.03);
        }

        /* Time grid - Cleaner appearance */
        .rbc-day-slot .rbc-time-slot {
          border-top: 1px solid #f3f4f6;
        }

        .dark .rbc-day-slot .rbc-time-slot {
          border-top-color: #1f2937;
        }

        .rbc-time-content {
          border-top: 2px solid #e5e7eb;
        }

        .dark .rbc-time-content {
          border-top-color: #374151;
        }

        .rbc-time-header-content {
          border-left: 1px solid #f3f4f6;
        }

        .dark .rbc-time-header-content {
          border-left-color: #374151;
        }

        /* Time labels - More subtle */
        .rbc-time-slot {
          color: #9ca3af;
          font-size: 12px;
          font-weight: 500;
        }

        .dark .rbc-time-slot {
          color: #6b7280;
        }

        /* Current time indicator - More prominent */
        .rbc-current-time-indicator {
          background-color: #ef4444;
          height: 3px;
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
        }

        .rbc-current-time-indicator::before {
          content: '';
          position: absolute;
          left: -6px;
          top: -5px;
          width: 12px;
          height: 12px;
          background-color: #ef4444;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
        }

        /* Toolbar - Modern button styling */
        .rbc-toolbar {
          padding: 20px 0;
          margin-bottom: 20px;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
        }

        .rbc-toolbar button {
          padding: 10px 18px;
          border: 2px solid #e5e7eb;
          background-color: white;
          color: #374151;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .dark .rbc-toolbar button {
          border-color: #374151;
          background-color: #1f2937;
          color: #d1d5db;
        }

        .rbc-toolbar button:hover {
          background-color: #f9fafb;
          border-color: #d1d5db;
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .dark .rbc-toolbar button:hover {
          background-color: #374151;
          border-color: #4b5563;
        }

        .rbc-toolbar button.rbc-active {
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          color: white;
          border-color: transparent;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }

        .dark .rbc-toolbar button.rbc-active {
          background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
        }

        .rbc-toolbar-label {
          font-weight: 700;
          font-size: 20px;
          color: #111827;
          flex-grow: 1;
          text-align: center;
          letter-spacing: -0.5px;
        }

        .dark .rbc-toolbar-label {
          color: #f9fafb;
        }

        /* Month view specific */
        .rbc-month-view {
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .dark .rbc-month-view {
          border-color: #374151;
        }

        .rbc-month-row {
          border-top: 1px solid #f3f4f6;
        }

        .dark .rbc-month-row {
          border-top-color: #1f2937;
        }

        .rbc-day-bg {
          transition: background-color 0.2s ease;
        }

        .rbc-day-bg:hover {
          background-color: #f9fafb;
        }

        .dark .rbc-day-bg:hover {
          background-color: #1f2937;
        }

        /* Week/Day view specific */
        .rbc-time-view {
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .dark .rbc-time-view {
          border-color: #374151;
        }

        /* Smooth animations */
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .rbc-event {
          animation: fadeIn 0.3s ease-out;
        }

        .rbc-day-bg {
          animation: slideIn 0.2s ease-out;
        }

        /* Selection highlight */
        .rbc-slot-selection {
          background-color: rgba(59, 130, 246, 0.2);
          border: 2px solid #3b82f6;
          border-radius: 6px;
        }

        .dark .rbc-slot-selection {
          background-color: rgba(59, 130, 246, 0.3);
        }

        /* Date cell styling */
        .rbc-date-cell {
          padding: 8px;
          text-align: right;
        }

        .rbc-date-cell > a {
          color: #374151;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .dark .rbc-date-cell > a {
          color: #d1d5db;
        }

        .rbc-now .rbc-date-cell > a {
          color: #3b82f6;
          font-weight: 700;
        }

        .dark .rbc-now .rbc-date-cell > a {
          color: #60a5fa;
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
          draggableAccessor={() => true}
          resizableAccessor={() => true}
        />
      </DndProvider>
    </div>
  );
}
