import { z } from "zod";
import { google } from "googleapis";
import { getGoogleOAuthClient } from "../googleoauth-client";

// Zod Schemas
export const ListCalendarsSchema = z.object({
  userGoogleEmail: z.string().email().describe("The user's Google email address.")
});

export const GetEventsSchema = z.object({
  userGoogleEmail: z.string().email().describe("The user's Google email address."),
  calendarId: z.string().default('primary').describe("Calendar ID (default: 'primary')."),
  timeMin: z.string().optional().describe("RFC3339 start time (inclusive)."),
  timeMax: z.string().optional().describe("RFC3339 end time (exclusive)."),
  maxResults: z.number().optional().default(25).describe("Maximum number of events to return."),
  query: z.string().optional().describe("Free text search query.")
});

export const CreateEventSchema = z.object({
  userGoogleEmail: z.string().email().describe("The user's Google email address."),
  summary: z.string().describe("Event title."),
  startTime: z.string().describe("Start time (RFC3339 or YYYY-MM-DD for all-day)."),
  endTime: z.string().describe("End time (RFC3339 or YYYY-MM-DD for all-day)."),
  calendarId: z.string().default('primary').describe("Calendar ID (default: 'primary')."),
  description: z.string().optional().describe("Event description."),
  location: z.string().optional().describe("Event location."),
  attendees: z.array(z.string().email()).optional().describe("Attendee email addresses."),
  timezone: z.string().optional().describe("Timezone (IANA name)."),
  attachments: z.array(z.string()).optional().describe("List of Google Drive file URLs or IDs to attach."),
  addGoogleMeet: z.boolean().optional().default(false).describe("Whether to add a Google Meet link."),
  reminders: z.union([
    z.string(),
    z.array(z.object({ method: z.enum(["popup", "email"]), minutes: z.number().int().min(0).max(40320) }))
  ]).optional().describe("Reminders as JSON string or array."),
  useDefaultReminders: z.boolean().optional().default(true).describe("Use calendar's default reminders.")
});

export const ModifyEventSchema = z.object({
  userGoogleEmail: z.string().email().describe("The user's Google email address."),
  eventId: z.string().describe("ID of the event to modify."),
  calendarId: z.string().default('primary').describe("Calendar ID (default: 'primary')."),
  summary: z.string().optional().describe("New event title."),
  startTime: z.string().optional().describe("New start time (RFC3339 or YYYY-MM-DD for all-day)."),
  endTime: z.string().optional().describe("New end time (RFC3339 or YYYY-MM-DD for all-day)."),
  description: z.string().optional().describe("New event description."),
  location: z.string().optional().describe("New event location."),
  attendees: z.array(z.string().email()).optional().describe("New attendee email addresses."),
  timezone: z.string().optional().describe("New timezone (IANA name)."),
  addGoogleMeet: z.boolean().optional().describe("Add/remove Google Meet link."),
  reminders: z.union([
    z.string(),
    z.array(z.object({ method: z.enum(["popup", "email"]), minutes: z.number().int().min(0).max(40320) }))
  ]).optional().describe("Reminders as JSON string or array."),
  useDefaultReminders: z.boolean().optional().describe("Override default reminders.")
});

export const DeleteEventSchema = z.object({
  userGoogleEmail: z.string().email().describe("The user's Google email address."),
  eventId: z.string().describe("ID of the event to delete."),
  calendarId: z.string().default('primary').describe("Calendar ID (default: 'primary').")
});

export const GetEventSchema = z.object({
  userGoogleEmail: z.string().email().describe("The user's Google email address."),
  eventId: z.string().describe("ID of the event to retrieve."),
  calendarId: z.string().default('primary').describe("Calendar ID (default: 'primary').")
});

// Core logic for each tool
export async function listCalendars(userId: string, userGoogleEmail: string) {
  const oauth2Client = await getGoogleOAuthClient(userId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const res = await calendar.calendarList.list();
  const items = res.data.items || [];
  if (!items.length) return `No calendars found for ${userGoogleEmail}.`;
  const lines = items.map(cal => `- "${cal.summary}"${cal.primary ? ' (Primary)' : ''} (ID: ${cal.id})`);
  return `Successfully listed ${items.length} calendars for ${userGoogleEmail}:
` + lines.join('\n');
}

export async function getEvents(userId: string, params: z.infer<typeof GetEventsSchema>) {
  const oauth2Client = await getGoogleOAuthClient(userId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const {
    calendarId = 'primary', timeMin, timeMax, maxResults = 25, query, userGoogleEmail
  } = params;
  const now = new Date().toISOString();
  const res = await calendar.events.list({
    calendarId,
    timeMin: timeMin || now,
    timeMax: timeMax,
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
    q: query,
  });
  const items = res.data.items || [];
  if (!items.length) return `No events found in calendar '${calendarId}' for ${userGoogleEmail} for the specified time range.`;
  const lines = items.map(ev => {
    const summary = ev.summary || 'No Title';
    const start = ev.start?.dateTime || ev.start?.date;
    const end = ev.end?.dateTime || ev.end?.date;
    const link = ev.htmlLink || 'No Link';
    const eventId = ev.id || 'No ID';
    return `- "${summary}" (Starts: ${start}, Ends: ${end}) ID: ${eventId} | Link: ${link}`;
  });
  return `Successfully retrieved ${items.length} events from calendar '${calendarId}' for ${userGoogleEmail}:
` + lines.join('\n');
}

export async function createEvent(userId: string, params: z.infer<typeof CreateEventSchema>) {
  const oauth2Client = await getGoogleOAuthClient(userId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const {
    userGoogleEmail, summary, startTime, endTime, calendarId = 'primary', description, location, attendees, timezone, attachments, addGoogleMeet = false, reminders, useDefaultReminders = true
  } = params;
  const eventBody: any = {
    summary,
    start: (startTime.includes('T') ? { dateTime: startTime } : { date: startTime }),
    end: (endTime.includes('T') ? { dateTime: endTime } : { date: endTime }),
  };
  if (location) eventBody.location = location;
  if (description) eventBody.description = description;
  if (timezone) {
    if (eventBody.start.dateTime) eventBody.start.timeZone = timezone;
    if (eventBody.end.dateTime) eventBody.end.timeZone = timezone;
  }
  if (attendees) eventBody.attendees = attendees.map(email => ({ email }));
  // Reminders
  if (reminders !== undefined || !useDefaultReminders) {
    const reminderData: any = { useDefault: useDefaultReminders && reminders === undefined };
    if (reminders !== undefined) {
      let overrides: any[] = [];
      if (typeof reminders === 'string') {
        try { overrides = JSON.parse(reminders); } catch { overrides = []; }
      } else if (Array.isArray(reminders)) {
        overrides = reminders;
      }
      if (Array.isArray(overrides) && overrides.length) reminderData.overrides = overrides;
    }
    eventBody.reminders = reminderData;
  }
  // Google Meet
  if (addGoogleMeet) {
    eventBody.conferenceData = {
      createRequest: {
        requestId: Math.random().toString(36).slice(2),
        conferenceSolutionKey: { type: 'hangoutsMeet' }
      }
    };
  }
  // Attachments (Drive files)
  if (attachments && attachments.length) {
    eventBody.attachments = attachments.map(att => {
      let fileId = att;
      if (att.startsWith('https://')) {
        const match = att.match(/(?:\/d\/|\/file\/d\/|id=)([\w-]+)/);
        if (match) fileId = match[1];
      }
      return {
        fileUrl: `https://drive.google.com/open?id=${fileId}`,
        title: 'Drive Attachment',
        mimeType: 'application/vnd.google-apps.drive-sdk',
      };
    });
  }
  const res = await calendar.events.insert({
    calendarId,
    requestBody: eventBody,
    supportsAttachments: !!(attachments && attachments.length),
    conferenceDataVersion: addGoogleMeet ? 1 : 0,
  });
  const created = res.data;
  let confirmation = `Successfully created event '${created.summary || summary}' for ${userGoogleEmail}. Link: ${created.htmlLink || 'No link available'}`;
  if (addGoogleMeet && created.conferenceData?.entryPoints) {
    const meet = created.conferenceData.entryPoints.find((e: any) => e.entryPointType === 'video');
    if (meet?.uri) confirmation += ` Google Meet: ${meet.uri}`;
  }
  return confirmation;
}

export async function modifyEvent(userId: string, params: z.infer<typeof ModifyEventSchema>) {
  const oauth2Client = await getGoogleOAuthClient(userId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const {
    userGoogleEmail, eventId, calendarId = 'primary', summary, startTime, endTime, description, location, attendees, timezone, addGoogleMeet, reminders, useDefaultReminders
  } = params;
  // Get existing event
  const existing = await calendar.events.get({ calendarId, eventId });
  const eventBody: any = {};
  if (summary !== undefined) eventBody.summary = summary;
  if (startTime !== undefined) eventBody.start = (startTime.includes('T') ? { dateTime: startTime } : { date: startTime });
  if (endTime !== undefined) eventBody.end = (endTime.includes('T') ? { dateTime: endTime } : { date: endTime });
  if (description !== undefined) eventBody.description = description;
  if (location !== undefined) eventBody.location = location;
  if (attendees !== undefined) eventBody.attendees = attendees.map(email => ({ email }));
  if (timezone !== undefined) {
    if (eventBody.start?.dateTime) eventBody.start.timeZone = timezone;
    if (eventBody.end?.dateTime) eventBody.end.timeZone = timezone;
  }
  // Reminders
  if (reminders !== undefined || useDefaultReminders !== undefined) {
    const reminderData: any = {};
    if (useDefaultReminders !== undefined) reminderData.useDefault = useDefaultReminders;
    else reminderData.useDefault = existing.data.reminders?.useDefault ?? true;
    if (reminders !== undefined) {
      let overrides: any[] = [];
      if (typeof reminders === 'string') {
        try { overrides = JSON.parse(reminders); } catch { overrides = []; }
      } else if (Array.isArray(reminders)) {
        overrides = reminders;
      }
      if (Array.isArray(overrides) && overrides.length) reminderData.overrides = overrides;
    }
    eventBody.reminders = reminderData;
  }
  // Google Meet
  if (addGoogleMeet !== undefined) {
    if (addGoogleMeet) {
      eventBody.conferenceData = {
        createRequest: {
          requestId: Math.random().toString(36).slice(2),
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      };
    } else {
      eventBody.conferenceData = {};
    }
  } else if (existing.data.conferenceData) {
    eventBody.conferenceData = existing.data.conferenceData;
  }
  // Patch event
  const res = await calendar.events.update({
    calendarId,
    eventId,
    requestBody: { ...existing.data, ...eventBody },
    conferenceDataVersion: addGoogleMeet !== undefined ? 1 : 0,
  });
  const updated = res.data;
  let confirmation = `Successfully modified event '${updated.summary || summary}' (ID: ${eventId}) for ${userGoogleEmail}. Link: ${updated.htmlLink || 'No link available'}`;
  if (addGoogleMeet === true && updated.conferenceData?.entryPoints) {
    const meet = updated.conferenceData.entryPoints.find((e: any) => e.entryPointType === 'video');
    if (meet?.uri) confirmation += ` Google Meet: ${meet.uri}`;
  } else if (addGoogleMeet === false) {
    confirmation += ' (Google Meet removed)';
  }
  return confirmation;
}

export async function deleteEvent(userId: string, params: z.infer<typeof DeleteEventSchema>) {
  const oauth2Client = await getGoogleOAuthClient(userId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const { userGoogleEmail, eventId, calendarId = 'primary' } = params;
  // Verify event exists
  await calendar.events.get({ calendarId, eventId });
  await calendar.events.delete({ calendarId, eventId });
  return `Successfully deleted event (ID: ${eventId}) from calendar '${calendarId}' for ${userGoogleEmail}.`;
}

export async function getEvent(userId: string, params: z.infer<typeof GetEventSchema>) {
  const oauth2Client = await getGoogleOAuthClient(userId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const { userGoogleEmail, eventId, calendarId = 'primary' } = params;
  const event = await calendar.events.get({ calendarId, eventId });
  const data = event.data;
  const summary = data.summary || 'No Title';
  const start = data.start?.dateTime || data.start?.date;
  const end = data.end?.dateTime || data.end?.date;
  const link = data.htmlLink || 'No Link';
  const description = data.description || 'No Description';
  const location = data.location || 'No Location';
  const attendees = data.attendees || [];
  const attendeeEmails = attendees.length ? attendees.map((a: any) => a.email).join(', ') : 'None';
  return `Event Details:\n- Title: ${summary}\n- Starts: ${start}\n- Ends: ${end}\n- Description: ${description}\n- Location: ${location}\n- Attendees: ${attendeeEmails}\n- Event ID: ${eventId}\n- Link: ${link}`;
}
