"use client";

import { Calendar as BigCalendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { useState, useCallback, useEffect } from "react";
import { AgendaView } from "./AgendaView";
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
  const [view, setView] = useState<View | "agenda">("week");
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

  // Custom toolbar component
  const CustomToolbar = ({ label, onNavigate, onView: onViewChange }: any) => {
    // Format label based on current view - show full date for day view
    const formatLabel = () => {
      if (view === "day") {
        return format(date, "EEEE, MMMM d, yyyy");
      }
      return label;
    };

    return (
      <div className="rbc-toolbar">
        <span className="rbc-btn-group">
          <button type="button" onClick={() => onNavigate("TODAY")}>
            Today
          </button>
          <button type="button" onClick={() => onNavigate("PREV")}>
            Back
          </button>
          <button type="button" onClick={() => onNavigate("NEXT")}>
            Next
          </button>
        </span>
        <span className="rbc-toolbar-label">{formatLabel()}</span>
        <span className="rbc-btn-group">
          {["month", "week", "day", "agenda"].map((v) => (
            <button
              key={v}
              type="button"
              className={view === v ? "rbc-active" : ""}
              onClick={() => setView(v as View | "agenda")}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </span>
      </div>
    );
  };

  // If agenda view is selected, render custom agenda with integrated toolbar
  if (view === "agenda") {
    return (
      <div className="h-full w-full bg-white dark:bg-gray-900 rounded-xl p-4">
        <CustomToolbar label={format(date, "MMMM yyyy")} onNavigate={() => {}} onView={() => {}} />
        <AgendaView events={events} onEventClick={onEventClick} />
      </div>
    );
  }

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
          padding: 12px 8px;
          font-weight: 700;
          color: #1f2937;
          font-size: 13px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          border-bottom: 2px solid #e5e7eb;
          background: linear-gradient(to bottom, #fafafa, #f9fafb);
        }

        .dark .rbc-header {
          color: #e5e7eb;
          border-bottom-color: #374151;
          background: linear-gradient(to bottom, #1f2937, #111827);
        }

        /* Remove gap between headers and time content in week/day view */
        .rbc-time-header {
          margin-bottom: 0 !important;
        }

        .rbc-time-header-content {
          border-left: none;
        }

        /* Day view specific - minimize the day header since we show date in toolbar */
        .rbc-time-view.rbc-day-view .rbc-header {
          padding: 6px 8px;
          font-size: 11px;
          font-weight: 500;
          background: transparent;
          border-bottom: 1px solid #e5e7eb;
          color: #9ca3af;
        }

        .dark .rbc-time-view.rbc-day-view .rbc-header {
          border-bottom-color: #374151;
          color: #6b7280;
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

        /* Time grid - Minimal clean appearance */
        .rbc-day-slot .rbc-time-slot {
          border-top: none;
        }

        /* Show only hour markers, not every 30-minute slot */
        .rbc-day-slot .rbc-time-slot:nth-child(2n) {
          border-top: 1px solid #f9fafb;
        }

        .dark .rbc-day-slot .rbc-time-slot:nth-child(2n) {
          border-top-color: #1f2937;
        }

        .rbc-time-content {
          border-top: none;
        }

        .dark .rbc-time-content {
          border-top-color: #374151;
        }

        .rbc-time-header-content {
          border-left: none;
        }

        /* Subtle dividers between days */
        .rbc-time-column {
          border-left: 1px solid #f3f4f6;
        }

        .dark .rbc-time-column {
          border-left-color: #1f2937;
        }

        .rbc-time-column:first-child {
          border-left: none;
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
          border: 1px solid #e5e7eb;
          background-color: white;
          color: #374151;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .dark .rbc-toolbar button {
          border-color: #374151;
          background-color: #1f2937;
          color: #d1d5db;
        }

        .rbc-toolbar button:hover {
          background-color: #f9fafb;
          border-color: #d1d5db;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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
          font-size: 18px;
          color: #111827;
          flex-grow: 1;
          text-align: center;
          letter-spacing: -0.5px;
          min-width: 200px;
        }

        .dark .rbc-toolbar-label {
          color: #f9fafb;
        }

        /* Make label larger for day view when showing full date */
        @media (min-width: 640px) {
          .rbc-toolbar-label {
            font-size: 20px;
          }
        }

        /* Month view specific */
        .rbc-month-view {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .dark .rbc-month-view {
          border-color: #374151;
        }

        .rbc-month-row {
          border-top: 1px solid #f9fafb;
        }

        .dark .rbc-month-row {
          border-top-color: #1f2937;
        }

        /* Reduce cell borders in month view */
        .rbc-day-bg + .rbc-day-bg {
          border-left: 1px solid #f9fafb;
        }

        .dark .rbc-day-bg + .rbc-day-bg {
          border-left-color: #1f2937;
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
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          background: white;
        }

        .dark .rbc-time-view {
          border-color: #374151;
          background: #1f2937;
        }

        /* Remove inner borders from time gutter */
        .rbc-time-slot.rbc-time-gutter {
          border-right: 1px solid #f3f4f6;
        }

        .dark .rbc-time-slot.rbc-time-gutter {
          border-right-color: #1f2937;
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
          view={view as View}
          onView={(v) => setView(v as View | "agenda")}
          views={["month", "week", "day"]}
          date={date}
          components={{
            toolbar: CustomToolbar,
          }}
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
