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
    <div className="h-full w-full bg-white rounded-lg shadow-lg p-4">
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
