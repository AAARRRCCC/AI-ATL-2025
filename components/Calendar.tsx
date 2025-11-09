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
// import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

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
  viewStart?: string;
  viewEnd?: string;
}

export function Calendar({
  events = [],
  onEventMove,
  onEventResize,
  onEventClick,
  onSelectSlot,
  viewStart = '08:00',
  viewEnd = '23:59',
}: CalendarProps) {
  const [view, setView] = useState<View | "agenda">("week");
  const [date, setDate] = useState(new Date());
  const [shouldDefaultToToday, setShouldDefaultToToday] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // When switching to day view via toolbar button, default to today
  useEffect(() => {
    if (view === "day" && shouldDefaultToToday) {
      setDate(new Date());
      setShouldDefaultToToday(false);
    }
  }, [view, shouldDefaultToToday]);

  // Handle view change from toolbar with fade transition
  const handleViewChange = (newView: View | "agenda") => {
    if (newView === view) return; // Don't transition if same view

    setIsTransitioning(true);

    // Fade out, then change view, then fade in
    setTimeout(() => {
      if (newView === "day") {
        setShouldDefaultToToday(true);
      }
      setView(newView);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 100); // Half of the total transition time
    }, 100);
  };

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

  // Handle drilling down (clicking a date to go to day view) with fade effect
  const handleDrillDown = useCallback((newDate: Date, newView: View) => {
    setIsTransitioning(true);

    setTimeout(() => {
      setDate(newDate);
      setView(newView);

      // Reset transition state after animation completes
      setTimeout(() => {
        setIsTransitioning(false);
      }, 100);
    }, 100);
  }, []);

  // Color palette for assignments - modern, user-friendly colors
  const colorPalette = [
    { bg: "rgba(99, 102, 241, 0.75)", border: "#6366f1", text: "#312e81" },      // Indigo
    { bg: "rgba(168, 85, 247, 0.75)", border: "#a855f7", text: "#581c87" },      // Purple
    { bg: "rgba(236, 72, 153, 0.75)", border: "#ec4899", text: "#831843" },      // Pink
    { bg: "rgba(59, 130, 246, 0.75)", border: "#3b82f6", text: "#1e3a8a" },      // Blue
    { bg: "rgba(14, 165, 233, 0.75)", border: "#0ea5e9", text: "#0c4a6e" },      // Sky
    { bg: "rgba(34, 197, 94, 0.75)", border: "#22c55e", text: "#14532d" },       // Green
    { bg: "rgba(234, 179, 8, 0.75)", border: "#eab308", text: "#713f12" },       // Yellow
    { bg: "rgba(249, 115, 22, 0.75)", border: "#f97316", text: "#7c2d12" },      // Orange
    { bg: "rgba(239, 68, 68, 0.75)", border: "#ef4444", text: "#7f1d1d" },       // Red
    { bg: "rgba(20, 184, 166, 0.75)", border: "#14b8a6", text: "#134e4a" },      // Teal
    { bg: "rgba(139, 92, 246, 0.75)", border: "#8b5cf6", text: "#4c1d95" },      // Violet
    { bg: "rgba(251, 146, 60, 0.75)", border: "#fb923c", text: "#7c2d12" },      // Amber
  ];

  // Generate consistent color for an assignment based on event title
  const getAssignmentColor = (eventTitle: string) => {
    // Extract assignment title by removing [SteadyStudy] prefix
    const cleanTitle = eventTitle.replace("[SteadyStudy]", "").trim();
    // Use first part before " - " if it exists (removes subtask name)
    const assignmentTitle = cleanTitle.split(" - ")[0];

    // Simple hash function to get consistent index
    let hash = 0;
    for (let i = 0; i < assignmentTitle.length; i++) {
      hash = assignmentTitle.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colorPalette.length;
    return colorPalette[index];
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor: string;
    let borderColor: string;
    let textColor: string;

    if (event.isStudyAutopilot) {
      // Assign color based on assignment title for consistency
      const color = getAssignmentColor(event.title);
      backgroundColor = color.bg;
      borderColor = color.border;
      textColor = color.text;

      // Reduce opacity if completed
      if (event.status === "completed") {
        return {
          style: {
            background: `linear-gradient(135deg, ${backgroundColor.replace('0.75', '0.5')}, ${backgroundColor.replace('0.75', '0.35')})`,
            borderLeft: `3px solid ${borderColor}`,
            borderRadius: "10px",
            color: textColor,
            fontWeight: 500,
            opacity: 0.65,
            backdropFilter: "blur(12px)",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08), inset 0 1px 2px rgba(255, 255, 255, 0.2)",
            padding: "4px 8px",
          },
        };
      }
    } else {
      // Google Calendar events (not SteadyStudy) - subtle grey
      backgroundColor = "rgba(148, 163, 184, 0.65)";
      borderColor = "#64748b";
      textColor = "#1e293b";
    }

    // Modern, translucent card styling
    return {
      style: {
        background: `linear-gradient(135deg, ${backgroundColor}, ${backgroundColor.replace('0.75', '0.6').replace('0.65', '0.5')})`,
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: "10px",
        color: textColor,
        fontWeight: 500,
        backdropFilter: "blur(12px)",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08), inset 0 1px 2px rgba(255, 255, 255, 0.2)",
        padding: "4px 8px",
        transition: "all 0.2s ease",
      },
    };
  };

  // Custom header component for week/day views
  const CustomDateHeader = ({ date: headerDate, label }: any) => {
    const isToday = format(headerDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    const dayName = format(headerDate, 'EEE').toUpperCase();
    const dayNumber = format(headerDate, 'd');

    // Only highlight today in week view, not in day view
    const shouldHighlight = isToday && view !== 'day';

    const handleClick = () => {
      // When clicking a date header, navigate to that specific date in day view
      // Don't use handleViewChange because we want to preserve the clicked date
      setDate(headerDate);
      setView('day');
    };

    return (
      <div
        onClick={handleClick}
        className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors py-2 px-3 h-full flex items-center justify-center"
      >
        <div className="text-center">
          <div className={`text-xs font-semibold tracking-wide mb-0.5 ${shouldHighlight ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
            {dayName}
          </div>
          <div className={`text-sm font-medium ${shouldHighlight ? 'bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center mx-auto' : 'text-gray-700 dark:text-gray-300'}`}>
            {dayNumber}
          </div>
        </div>
      </div>
    );
  };

  // Custom toolbar component
  const CustomToolbar = ({ label, onNavigate, onView: onViewChange }: any) => {
    const handleNavigation = (action: "TODAY" | "PREV" | "NEXT") => {
      setIsTransitioning(true);
      setTimeout(() => {
        onNavigate(action);
        setTimeout(() => {
          setIsTransitioning(false);
        }, 100);
      }, 100);
    };

    return (
      <div className="rbc-toolbar">
        <span className="rbc-btn-group">
          <button type="button" onClick={() => handleNavigation("TODAY")}>
            Today
          </button>
          <button type="button" onClick={() => handleNavigation("PREV")}>
            Back
          </button>
          <button type="button" onClick={() => handleNavigation("NEXT")}>
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
              onClick={() => handleViewChange(v as View | "agenda")}
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
      <div
        className={`h-full w-full bg-white dark:bg-gray-900 rounded-xl p-4 transition-opacity duration-200 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
      >
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
        <CustomToolbar label={format(date, "MMMM yyyy")} onNavigate={() => { }} onView={() => { }} />
        <AgendaView events={events} onEventClick={onEventClick} />
      </div>
    );
  }

  return (
    <div
      className={`h-full w-full bg-white dark:bg-gray-900 rounded-xl p-4 transition-opacity duration-200 ${
        isTransitioning ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <style jsx global>{`
        /* Modern Calendar Styles */
        .rbc-calendar {
          font-family: inherit;
        }

        /* Header Styling - Match month view with grey background */
        .rbc-header {
          padding: 12px 8px;
          font-weight: 600;
          color: #6b7280;
          font-size: 11px;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
          text-align: center;
        }

        .dark .rbc-header {
          color: #9ca3af;
          border-bottom-color: #4b5563;
          background: #1f2937;
        }

        /* Month view headers - larger to prevent text cutoff */
        .rbc-month-view .rbc-header {
          padding: 18px 8px;
          font-size: 12px;
        }

        /* Time-based view headers - smaller padding */
        .rbc-time-view .rbc-header {
          padding: 0;
          background: #f9fafb;
          overflow: hidden;
        }

        .dark .rbc-time-view .rbc-header {
          background: #1f2937;
        }

        /* Override for custom header components */
        .rbc-time-view .rbc-header > div {
          background: inherit;
        }

        /* Remove gap between headers and time content in week/day view */
        .rbc-time-header {
          margin-bottom: 0 !important;
          overflow: visible !important;
          border-bottom: 1px solid #e5e7eb;
        }

        .dark .rbc-time-header {
          border-bottom-color: #374151;
          background: #1f2937;
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

        /* Time header gutter - empty space above time labels - match time gutter grey */
        .rbc-time-header-gutter {
          background: #f9fafb !important;
          border-bottom: 1px solid #e5e7eb !important;
          border-right: 1px solid #e5e7eb !important;
          transform: translateY(64px);
        }

        .dark .rbc-time-header-gutter {
          background: #1f2937 !important;
          border-bottom-color: #4b5563 !important;
          border-right-color: #4b5563 !important;
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

        /* Events - Modern translucent appearance */
        .rbc-event {
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s ease;
          cursor: pointer;
          border: none !important;
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
        }

        .rbc-event:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
        }

        .rbc-event.rbc-selected {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.4), 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          transform: scale(1.02);
        }

        /* Time grid - darker background to match month view tone */
        .rbc-day-slot .rbc-time-slot {
          border-top: 1px solid #e5e7eb;
          min-height: 48px;
          background: white;
        }

        .dark .rbc-day-slot .rbc-time-slot {
          border-top-color: #374151;
          background: #111827;
        }

        .rbc-time-content {
          border-top: none;
        }

        .rbc-time-header-content {
          border-left: none;
        }

        /* Very subtle dividers between days */
        .rbc-time-column {
          border-left: 1px solid #e5e7eb;
          flex: 1;
          min-width: 0;
        }

        .dark .rbc-time-column {
          border-left-color: #374151;
        }

        .rbc-time-column:first-child {
          border-left: none;
        }

        /* Ensure time columns container uses flexbox */
        .rbc-time-content > .rbc-time-column {
          display: flex;
          flex-direction: column;
        }

        /* Time gutter styling - grey background like headers */
        .rbc-time-gutter {
          border-right: 1px solid #e5e7eb !important;
          background: #f9fafb;
          width: 80px;
        }

        .dark .rbc-time-gutter {
          border-right-color: #4b5563 !important;
          background: #1f2937;
        }

        /* Time labels - Style like headers with grey background */
        .rbc-time-slot {
          color: #6b7280;
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .dark .rbc-time-slot {
          color: #9ca3af;
        }

        /* Time slot in gutter - center in box and align borders */
        .rbc-label {
          color: #6b7280;
          font-size: 11px;
          font-weight: 500;
          padding-right: 12px;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
        }

        .dark .rbc-label {
          color: #9ca3af;
        }

        /* Ensure time slot containers are properly sized - double height for one hour */
        .rbc-timeslot-group {
          min-height: 96px;
          border-bottom: 1px solid #e5e7eb;
        }

        .dark .rbc-timeslot-group {
          border-bottom-color: #374151;
        }

        .rbc-timeslot-group:last-child {
          border-bottom: none;
        }

        /* Time gutter width */
        .rbc-time-gutter {
          width: 80px;
        }

        /* Individual time slots within group */
        .rbc-time-slot {
          min-height: 48px;
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

        /* Month view specific - rounded corners */
        .rbc-month-view {
          border: none;
          border-radius: 12px;
          box-shadow: none;
          overflow: visible;
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

        /* Week/Day view specific - rounded corners */
        .rbc-time-view {
          border: none;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: none;
          background: #f9fafb;
        }

        .dark .rbc-time-view {
          background: #1f2937;
        }

        /* Add subtle container background with rounded corners */
        .rbc-time-content {
          background: white;
          border-radius: 0 0 12px 12px;
        }

        .dark .rbc-time-content {
          background: #111827;
        }

        /* Time header with rounded top corners */
        .rbc-time-header {
          border-radius: 12px 12px 0 0;
          overflow: hidden;
        }

        /* Time content scrollable area */
        .rbc-time-content > * + * > * {
          border-left: 1px solid #e5e7eb;
        }

        .dark .rbc-time-content > * + * > * {
          border-left-color: #374151;
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

        /* Event label during creation - make times readable in light mode */
        .rbc-event-label,
        .rbc-addons-dnd .rbc-addons-dnd-drag-preview .rbc-event-label,
        .rbc-slot-selecting .rbc-event-label {
          color: #1f2937;
          font-weight: 600;
        }

        .dark .rbc-event-label,
        .dark .rbc-addons-dnd .rbc-addons-dnd-drag-preview .rbc-event-label,
        .dark .rbc-slot-selecting .rbc-event-label {
          color: #f9fafb;
        }

        /* Date cell styling - Ultra minimal */
        .rbc-date-cell {
          padding: 8px;
          text-align: right;
        }

        .rbc-date-cell > a {
          color: #374151;
          font-weight: 500;
          font-size: 12px;
          transition: color 0.15s ease;
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .dark .rbc-date-cell > a {
          color: #9ca3af;
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

        .rbc-time-gutter .rbc-label {
          margin-top: -10px; /* same idea, just shifts position */
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
          onDrillDown={handleDrillDown}
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
          min={new Date(1970, 0, 1, parseInt(viewStart.split(':')[0]), parseInt(viewStart.split(':')[1]))}
          max={new Date(1970, 0, 1, parseInt(viewEnd.split(':')[0]), parseInt(viewEnd.split(':')[1]))}
        />
      </DndProvider>
    </div>
  );
}
