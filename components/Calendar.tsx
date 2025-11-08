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
  const [preserveDate, setPreserveDate] = useState(false);

  // When switching to day view, default to today unless preserving a date
  useEffect(() => {
    if (view === "day" && !preserveDate) {
      setDate(new Date());
    }
    // Reset preserve flag after switching
    if (preserveDate) {
      setPreserveDate(false);
    }
  }, [view, preserveDate]);

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

  // Custom header component for week/day views
  const CustomDateHeader = ({ date: headerDate, label }: any) => {
    const isToday = format(headerDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    const dayName = format(headerDate, 'EEE').toUpperCase();
    const dayNumber = format(headerDate, 'd');

    const handleClick = () => {
      setPreserveDate(true);
      setDate(headerDate);
      setView('day');
    };

    return (
      <div
        onClick={handleClick}
        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors p-2 rounded"
      >
        <div className="text-center">
          <div className={`text-xs font-semibold tracking-wide mb-1 ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
            {dayName}
          </div>
          <div className={`text-sm font-medium ${isToday ? 'bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center mx-auto' : 'text-gray-900 dark:text-gray-100'}`}>
            {dayNumber}
          </div>
        </div>
      </div>
    );
  };

  // Custom toolbar component
  const CustomToolbar = ({ label, onNavigate, onView: onViewChange }: any) => {
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
        <span className="rbc-toolbar-label">{label}</span>
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
        <style jsx global>{`
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

          @media (min-width: 640px) {
            .rbc-toolbar-label {
              font-size: 20px;
            }
          }
        `}</style>
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

        /* Header Styling - Match month view day labels */
        .rbc-header {
          padding: 16px 4px;
          font-weight: 600;
          color: #6b7280;
          font-size: 11px;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          border-bottom: 1px solid #e5e7eb;
          background: white;
          text-align: center;
        }

        .dark .rbc-header {
          color: #9ca3af;
          border-bottom-color: #374151;
          background: #1f2937;
        }

        /* Month view headers */
        .rbc-month-view .rbc-header {
          padding: 12px 4px;
          font-weight: 600;
          color: #6b7280;
          font-size: 11px;
          letter-spacing: 0.8px;
        }

        /* Time-based view - headers are custom components */
        .rbc-time-view .rbc-header {
          padding: 0;
          border-bottom: none;
          background: transparent;
        }

        /* Remove gap between headers and time content in week/day view */
        .rbc-time-header {
          margin-bottom: 0 !important;
          overflow: visible !important;
          border-bottom: 1px solid #e5e7eb;
        }

        .dark .rbc-time-header {
          border-bottom-color: #374151;
        }

        .rbc-time-header-content {
          border-left: none;
          flex: 1;
        }

        /* Ensure even column distribution */
        .rbc-time-header-content .rbc-row {
          display: flex;
        }

        .rbc-time-header-content .rbc-header {
          flex: 1;
        }

        /* Remove the gutter row that creates the gap */
        .rbc-time-header-gutter {
          display: none !important;
        }

        .rbc-allday-cell {
          display: none !important;
        }

        /* Fix header alignment - remove borders between headers */
        .rbc-header + .rbc-header {
          border-left: none;
        }

        .rbc-time-header-content > .rbc-row {
          border: none;
        }

        /* Today highlighting - Very subtle like Notion */
        .rbc-today {
          background-color: #f8fafc;
        }

        .dark .rbc-today {
          background-color: #1e293b;
        }

        /* Today header highlighting */
        .rbc-time-view .rbc-today {
          background-color: transparent;
        }

        .rbc-time-view .rbc-header.rbc-today {
          color: #3b82f6;
          font-weight: 700;
        }

        .dark .rbc-time-view .rbc-header.rbc-today {
          color: #60a5fa;
        }

        /* Off-range dates - Very subtle */
        .rbc-off-range-bg {
          background-color: #fafbfc;
          opacity: 0.5;
        }

        .dark .rbc-off-range-bg {
          background-color: #111418;
          opacity: 0.5;
        }

        /* Events - Clean Notion-style appearance */
        .rbc-event {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.15s ease;
          box-shadow: none;
          cursor: pointer;
          border: none;
          border-left: 2px solid rgba(255, 255, 255, 0.4);
        }

        .rbc-event:hover {
          opacity: 0.9;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .rbc-event.rbc-selected {
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
        }

        /* Time grid - Extremely minimal like Notion */
        .rbc-day-slot .rbc-time-slot {
          border-top: 1px solid #fafafa;
          min-height: 40px;
        }

        .dark .rbc-day-slot .rbc-time-slot {
          border-top-color: #2a2e33;
        }

        .rbc-time-content {
          border-top: none;
        }

        .rbc-time-header-content {
          border-left: none;
        }

        /* Very subtle dividers between days - barely visible */
        .rbc-time-column {
          border-left: 1px solid #fafafa;
          flex: 1;
          min-width: 0;
        }

        .dark .rbc-time-column {
          border-left-color: #2a2e33;
        }

        .rbc-time-column:first-child {
          border-left: none;
        }

        /* Ensure time columns container uses flexbox */
        .rbc-time-content > .rbc-time-column {
          display: flex;
          flex-direction: column;
        }

        /* Add subtle right border to time gutter */
        .rbc-time-gutter {
          border-right: 1px solid #fafafa !important;
        }

        .dark .rbc-time-gutter {
          border-right-color: #2a2e33 !important;
        }

        /* Time labels - Align with rows and style like day labels */
        .rbc-time-slot {
          color: #6b7280;
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .dark .rbc-time-slot {
          color: #9ca3af;
        }

        /* Time slot in gutter - align to top of slot */
        .rbc-label {
          color: #6b7280;
          font-size: 11px;
          font-weight: 500;
          padding-right: 12px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          position: relative;
          top: -10px;
        }

        .dark .rbc-label {
          color: #9ca3af;
        }

        /* Time gutter styling */
        .rbc-time-gutter {
          width: 70px;
        }

        /* Current time indicator - Clean and simple */
        .rbc-current-time-indicator {
          background-color: #ef4444;
          height: 2px;
        }

        .rbc-current-time-indicator::before {
          content: '';
          position: absolute;
          left: -4px;
          top: -3px;
          width: 8px;
          height: 8px;
          background-color: #ef4444;
          border-radius: 50%;
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

        /* Month view specific - Ultra clean Notion style */
        .rbc-month-view {
          border: none;
          border-radius: 0;
          overflow: visible;
          box-shadow: none;
        }

        .dark .rbc-month-view {
          border: none;
        }

        .rbc-month-row {
          border-top: 1px solid #fafafa;
          min-height: 80px;
        }

        .dark .rbc-month-row {
          border-top-color: #2a2e33;
        }

        .rbc-month-row:first-child {
          border-top: none;
        }

        /* Ultra minimal cell borders in month view */
        .rbc-day-bg + .rbc-day-bg {
          border-left: 1px solid #fafafa;
        }

        .dark .rbc-day-bg + .rbc-day-bg {
          border-left-color: #2a2e33;
        }

        /* Month view header row */
        .rbc-month-view .rbc-header {
          border-bottom: 1px solid #f0f0f0;
          padding: 12px 8px;
        }

        .dark .rbc-month-view .rbc-header {
          border-bottom-color: #2a2e33;
        }

        .rbc-day-bg {
          transition: background-color 0.15s ease;
        }

        .rbc-day-bg:hover {
          background-color: #fafbfc;
        }

        .dark .rbc-day-bg:hover {
          background-color: #1a1d21;
        }

        /* Week/Day view specific - Ultra clean like Notion */
        .rbc-time-view {
          border: none;
          border-radius: 0;
          overflow: visible;
          box-shadow: none;
          background: transparent;
        }

        .dark .rbc-time-view {
          background: transparent;
        }

        /* Add subtle container background */
        .rbc-time-content {
          background: white;
        }

        .dark .rbc-time-content {
          background: #1f2937;
        }

        /* Selection highlight - Simple and clean */
        .rbc-slot-selection {
          background-color: rgba(59, 130, 246, 0.1);
          border: 1px solid #3b82f6;
          border-radius: 4px;
        }

        .dark .rbc-slot-selection {
          background-color: rgba(59, 130, 246, 0.2);
        }

        /* Date cell styling - Ultra minimal */
        .rbc-date-cell {
          padding: 8px;
          text-align: right;
        }

        .rbc-date-cell > a {
          color: #9ca3af;
          font-weight: 500;
          font-size: 12px;
          transition: color 0.15s ease;
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .dark .rbc-date-cell > a {
          color: #6b7280;
        }

        .rbc-date-cell > a:hover {
          background-color: #f8fafc;
          color: #3b82f6;
        }

        .dark .rbc-date-cell > a:hover {
          background-color: #1e293b;
          color: #60a5fa;
        }

        .rbc-now .rbc-date-cell > a {
          color: white;
          background-color: #3b82f6;
          font-weight: 600;
        }

        .dark .rbc-now .rbc-date-cell > a {
          background-color: #2563eb;
        }

        /* Remove all heavy borders for ultra clean look */
        .rbc-day-bg,
        .rbc-month-row {
          border-color: #fafafa !important;
        }

        .dark .rbc-day-bg,
        .dark .rbc-month-row {
          border-color: #2a2e33 !important;
        }

        /* Increase spacing and breathing room */
        .rbc-row {
          min-height: 0;
        }

        .rbc-row-segment {
          padding: 2px 4px;
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
            week: {
              header: CustomDateHeader,
            },
            day: {
              header: CustomDateHeader,
            },
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
