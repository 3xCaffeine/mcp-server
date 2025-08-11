
import { z } from "zod";
import {
  ListCalendarsSchema,
  GetEventsSchema,
  CreateEventSchema,
  ModifyEventSchema,
  DeleteEventSchema,
  GetEventSchema,
  listCalendars,
  getEvents,
  createEvent,
  modifyEvent,
  deleteEvent,
  getEvent,
} from "@/lib/toolset/google/calendar";

// ToolServer interface and type aliases
type ToolHandler<Input> = (input: Input) => Promise<{ content: Array<{ type: string; text: string }> }>;
interface ToolServer {
  tool<Input>(
    name: string,
    description: string,
    schema: object,
    handler: ToolHandler<Input>
  ): void;
}
type ListCalendarsInput = z.infer<typeof ListCalendarsSchema>;
type GetEventsInput = z.infer<typeof GetEventsSchema>;
type CreateEventInput = z.infer<typeof CreateEventSchema>;
type ModifyEventInput = z.infer<typeof ModifyEventSchema>;
type DeleteEventInput = z.infer<typeof DeleteEventSchema>;
type GetEventInput = z.infer<typeof GetEventSchema>;


export const calendarToolsCapabilities = {
  list_calendars: {
    description: "List all calendars accessible to the authenticated user",
  },
  get_events: {
    description: "List events from a specified Google Calendar within a time range",
  },
  create_event: {
    description: "Create a new event in a Google Calendar",
  },
  modify_event: {
    description: "Modify an existing event in a Google Calendar",
  },
  delete_event: {
    description: "Delete an event from a Google Calendar",
  },
  get_event: {
    description: "Get details of a single event by its ID from a Google Calendar",
  },
};


interface ToolServer {
  tool(
    name: string,
    description: string,
    schema: object,
    handler: (...args: any[]) => Promise<any>
  ): void;
}

export function registerCalendarTools(server: ToolServer, session: { userId: string; scopes?: string }) {
  server.tool(
    "list_calendars",
    "List all calendars accessible to the authenticated user",
    ListCalendarsSchema.shape,
    async ({ userGoogleEmail }: ListCalendarsInput) => {
      return {
        content: [{ type: "text", text: await listCalendars(session.userId, userGoogleEmail) }],
      };
    },
  );

  server.tool(
    "get_events",
    "List events from a specified Google Calendar within a time range",
    GetEventsSchema.shape,
    async (input: GetEventsInput) => {
      return {
        content: [{ type: "text", text: await getEvents(session.userId, input) }],
      };
    },
  );

  server.tool(
    "create_event",
    "Create a new event in a Google Calendar",
    CreateEventSchema.shape,
    async (input: CreateEventInput) => {
      return {
        content: [{ type: "text", text: await createEvent(session.userId, input) }],
      };
    },
  );

  server.tool(
    "modify_event",
    "Modify an existing event in a Google Calendar",
    ModifyEventSchema.shape,
    async (input: ModifyEventInput) => {
      return {
        content: [{ type: "text", text: await modifyEvent(session.userId, input) }],
      };
    },
  );

  server.tool(
    "delete_event",
    "Delete an event from a Google Calendar",
    DeleteEventSchema.shape,
    async (input: DeleteEventInput) => {
      return {
        content: [{ type: "text", text: await deleteEvent(session.userId, input) }],
      };
    },
  );

  server.tool(
    "get_event",
    "Get details of a single event by its ID from a Google Calendar",
    GetEventSchema.shape,
    async (input: GetEventInput) => {
      return {
        content: [{ type: "text", text: await getEvent(session.userId, input) }],
      };
    },
  );
}
