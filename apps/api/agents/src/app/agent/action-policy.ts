import { ForbiddenException } from "@nestjs/common";
import { z } from "zod";

const optionalString = z.string().optional();
const timeSchema = z.object({ dateTime: z.string().optional(), timeZone: z.string().optional() }).strict();
const emailList = z.union([z.string(), z.array(z.string())]).optional();
const parameterSchemas: Record<string, z.ZodTypeAny> = {
  none: z.object({}).strict(),
  "web.search": z.object({ query: z.string().max(500).optional() }).strict(),
  "gmail.search": z.object({ query: z.string().max(500).optional(), limit: z.number().int().min(1).max(25).optional() }).strict(),
  "gmail.send": z.object({ to: emailList, cc: emailList, bcc: emailList, subject: z.string().max(998).optional(), body: z.string().max(50000).optional() }).strict(),
  "gmail.draft": z.object({ to: emailList, cc: emailList, bcc: emailList, subject: z.string().max(998).optional(), body: z.string().max(50000).optional() }).strict(),
  "gmail.reply": z.object({ threadId: optionalString, subject: optionalString, body: z.string().max(50000).optional() }).strict(),
  "calendar.list": z.object({ calendarId: optionalString, timeMin: optionalString, timeMax: optionalString, query: z.string().max(500).optional(), limit: z.number().int().min(1).max(100).optional() }).strict(),
  "calendar.availability": z.object({ start: optionalString, end: optionalString, timeZone: optionalString, calendarIds: z.array(z.string()).max(20).optional() }).strict(),
  "calendar.create": z.object({ summary: z.string().max(300).optional(), description: z.string().max(8000).optional(), start: timeSchema.optional(), end: timeSchema.optional(), durationMinutes: z.number().positive().max(1440).optional(), attendees: z.array(z.string()).max(50).optional(), location: z.string().max(500).optional(), meet: z.boolean().optional() }).strict(),
  "calendar.update": z.object({ eventId: optionalString, calendarId: optionalString, summary: z.string().max(300).optional(), description: z.string().max(8000).optional(), start: timeSchema.optional(), end: timeSchema.optional(), attendees: z.array(z.string()).max(50).optional(), location: z.string().max(500).optional() }).strict(),
  "calendar.cancel": z.object({ eventId: optionalString, calendarId: optionalString }).strict(),
  "instagram.caption": z.object({ caption: z.string().max(2200).optional(), hashtags: z.array(z.string().max(100)).max(30).optional() }).strict(),
  "instagram.publish": z.object({ assetId: optionalString, caption: z.string().max(2200).optional(), hashtags: z.array(z.string().max(100)).max(30).optional() }).strict(),
};

export const MUTATING_ACTIONS = new Set([
  "gmail.send", "gmail.draft", "gmail.reply", "calendar.create", "calendar.update", "calendar.cancel", "instagram.publish",
]);

export function toolForAction(action: string): string | null {
  if (action === "web.search") return "websearch";
  if (action.startsWith("gmail.")) return "gmail";
  if (action.startsWith("calendar.")) return "googlecalendar";
  if (action.startsWith("instagram.")) return "instagram";
  return null;
}

export function validateAssignedAction(action: string, assignedTools: string[]) {
  const required = toolForAction(action);
  if (required && !assignedTools.includes(required)) throw new ForbiddenException(`This agent is not assigned the ${required} tool`);
}

export function validateExecutionPermission(action: string, assignedTools: string[], approved: boolean) {
  validateAssignedAction(action, assignedTools);
  if (MUTATING_ACTIONS.has(action) && !approved) throw new ForbiddenException("This action requires explicit approval before execution");
}

export interface PlannedAction {
  operation: string;
  parameters: Record<string, unknown>;
  response: string;
}

export function validatePlannedAction(action: PlannedAction, assignedTools: string[], assetIds: string[], userMessage = "", knownEmails: string[] = [], durationWasSpecified = false, userTimeZone = "", knownReferences = ""): PlannedAction {
  const { operation } = action;
  validateAssignedAction(operation, assignedTools);
  const ask = (response: string): PlannedAction => ({ operation: "none", parameters: {}, response });
  const schema = parameterSchemas[operation];
  const parsed = schema?.safeParse(action.parameters);
  if (!parsed?.success) return ask("I couldn't validate all of the action details. Please provide or confirm the missing information.");
  const parameters = { ...parsed.data as Record<string, unknown> };
  const text = (key: string) => typeof parameters[key] === "string" ? String(parameters[key]).trim() : "";

  if (operation === "web.search" && !text("query")) return ask("What would you like me to search for?");
  if (operation === "gmail.search" && !text("query")) return ask("What should I look for in your Gmail?");
  if (operation === "calendar.list" && !text("timeMin")) return ask("What date or date range should I check on your calendar?");
  if (operation === "calendar.availability" && (!text("start") || !text("end") || !text("timeZone"))) return ask("What time range and time zone should I check for availability?");
  if (operation === "instagram.caption" && !text("caption")) return ask("What should the Instagram caption be about?");

  if (["gmail.send", "gmail.draft"].includes(operation)) {
    const recipients = Array.isArray(parameters.to) ? parameters.to : typeof parameters.to === "string" ? [parameters.to] : [];
    if (!recipients.length) return ask("Who should I send this email to? Please share their email address.");
    if (recipients.some((recipient) => typeof recipient !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.trim()))) {
      return ask("Please provide a valid recipient email address before I prepare the email.");
    }
    const verified = new Set(knownEmails.map((email) => email.toLowerCase()));
    if (recipients.some((recipient) => !verified.has(String(recipient).trim().toLowerCase()))) {
      return ask("I found a possible recipient, but I can't verify that address. Please provide the recipient's email address.");
    }
    if (!text("subject")) return ask("What subject would you like for the email?");
    if (!text("body")) return ask("What should the email say?");
  }
  if (operation === "gmail.reply") {
    if (!text("threadId")) return ask("Which email thread should I reply to?");
    if (!knownReferences.includes(text("threadId"))) return ask("Please search for or select the email thread you want me to reply to.");
    if (!text("body")) return ask("What should the reply say?");
  }
  if (operation === "calendar.create") {
    if (!text("summary")) return ask("What should I call this meeting?");
    const titleWasProvided = userMessage.toLowerCase().includes(text("summary").toLowerCase()) || /\b(?:title|call|name)\s+(?:it|the meeting|the event)\b/i.test(userMessage);
    if (!titleWasProvided) return ask("What title should I use for this meeting?");
    const start = parameters.start as Record<string, unknown> | undefined;
    const end = parameters.end as Record<string, unknown> | undefined;
    if (!start?.dateTime || !end?.dateTime) return ask("What date and start time should I use, and how long should the meeting be?");
    if (parameters.durationMinutes === undefined || parameters.durationMinutes === null || !Number.isFinite(Number(parameters.durationMinutes)) || Number(parameters.durationMinutes) <= 0) return ask("How long should the meeting be?");
    if (!start.timeZone || !end.timeZone || start.timeZone !== end.timeZone) return ask("Which time zone should I use for this meeting?");
    if (userTimeZone && start.timeZone !== userTimeZone) return ask(`I have your time zone as ${userTimeZone}. Should I schedule it in that time zone?`);
    if (!durationWasSpecified) return ask("How long should the meeting be?");
    const startMs = Date.parse(String(start.dateTime));
    const endMs = Date.parse(String(end.dateTime));
    const durationMs = Number(parameters.durationMinutes) * 60_000;
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs || Math.abs((endMs - startMs) - durationMs) > 60_000) {
      return ask("I couldn't confirm the meeting time and duration. Please provide the date, start time, and duration.");
    }
    const attendees = Array.isArray(parameters.attendees) ? parameters.attendees : [];
    const mentionedAttendee = /\bwith\s+(?!me\b)([A-Za-z][A-Za-z'-]+)(?!\s*@)/i.test(userMessage);
    if (mentionedAttendee && !attendees.length) return ask("Please share the attendee's email address so I can add them to the meeting.");
    if (attendees.some((attendee) => typeof attendee !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendee.trim()))) {
      return ask("Please share each attendee's email address so I can add them to the meeting.");
    }
    const verified = new Set(knownEmails.map((email) => email.toLowerCase()));
    if (attendees.some((attendee) => !verified.has(String(attendee).trim().toLowerCase()))) return ask("Please provide the attendee email address. I won't guess it.");
  }
  if (operation === "calendar.update" || operation === "calendar.cancel") {
    if (!text("eventId")) return ask("Which calendar event should I change? Please select or share the event details.");
    if (!knownReferences.includes(text("eventId"))) return ask("Please list or select the calendar event you want me to change so I can verify it first.");
    const attendees = Array.isArray(parameters.attendees) ? parameters.attendees : [];
    if (attendees.some((attendee) => typeof attendee !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendee.trim()))) return ask("Please provide valid attendee email addresses for this calendar change.");
    const verified = new Set(knownEmails.map((email) => email.toLowerCase()));
    if (attendees.some((attendee) => !verified.has(String(attendee).trim().toLowerCase()))) return ask("Please provide the attendee email address. I won't guess it.");
    if (operation === "calendar.update" && !Object.keys(parameters).some((key) => !["eventId", "calendarId"].includes(key))) {
      return ask("What would you like to change about that event?");
    }
  }
  if (operation === "instagram.publish") {
    if (assetIds.length !== 1) return ask(assetIds.length ? "Choose exactly one image or video for this Instagram post." : "Upload or select one image or MP4 video before I prepare the post.");
    if (!text("caption")) return ask("What would you like the Instagram caption to say?");
    parameters.assetId = assetIds[0];
    delete parameters.mediaUrl;
    const hashtags = Array.isArray(parameters.hashtags) ? parameters.hashtags.map((tag) => `#${String(tag).replace(/^#+/, "")}`) : [];
    if (hashtags.length) parameters.caption = `${text("caption").trim()}\n\n${hashtags.join(" ")}`;
    if (String(parameters.caption).length > 2200) return ask("The caption and hashtags are longer than Instagram allows. Please shorten them.");
  }
  return { ...action, parameters };
}

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function approvalMatchesCheckpoint(approval: { action: string; input: Record<string, unknown>; id: string }, state: { operation?: string; parameters?: Record<string, unknown>; approvalid?: string }) {
  return approval.action === state.operation && (!state.approvalid || approval.id === state.approvalid) && stableJson(approval.input) === stableJson(state.parameters ?? {});
}

export interface AtomicApprovalModel<T> {
  findOneAndUpdate(filter: Record<string, unknown>, update: Record<string, unknown>, options: { new: boolean }): PromiseLike<T | null>;
}

export async function claimPendingApproval<T>(model: AtomicApprovalModel<T>, userid: string, id: string) {
  return await model.findOneAndUpdate(
    { _id: id, userid, status: "pending" },
    { $set: { status: "executing" } },
    { new: true },
  );
}

export function approvalSummary(action: string, parameters: Record<string, unknown>): string {
  switch (action) {
    case "gmail.send": return `Send email to ${String(parameters.to)} with subject “${String(parameters.subject)}”.`;
    case "gmail.reply": return `Reply to the selected email thread with subject “${String(parameters.subject ?? "Reply") }”.`;
    case "gmail.draft": return `Create a Gmail draft to ${String(parameters.to)} with subject “${String(parameters.subject)}”.`;
    case "calendar.create": return `Create “${String(parameters.summary)}” from ${String((parameters.start as any)?.dateTime)} to ${String((parameters.end as any)?.dateTime)} (${String((parameters.start as any)?.timeZone)}).`;
    case "calendar.update": return `Update calendar event ${String(parameters.eventId)} with the displayed changes.`;
    case "calendar.cancel": return `Cancel calendar event ${String(parameters.eventId)}.`;
    case "instagram.publish": return "Publish the displayed Instagram media and caption.";
    default: return `Approve ${action}.`;
  }
}

export interface BusyEvent { id?: string | null; summary?: string | null; start?: { dateTime?: string | null; date?: string | null } | null; end?: { dateTime?: string | null; date?: string | null } | null }

export function calendarConflicts(startValue: string, endValue: string, events: BusyEvent[]) {
  const start = Date.parse(startValue);
  const end = Date.parse(endValue);
  return events.filter((event) => {
    const eventStart = Date.parse(String(event.start?.dateTime ?? event.start?.date ?? ""));
    const eventEnd = Date.parse(String(event.end?.dateTime ?? event.end?.date ?? ""));
    return Number.isFinite(eventStart) && Number.isFinite(eventEnd) && start < eventEnd && end > eventStart;
  });
}

export function calendarAlternatives(startValue: string, endValue: string, events: BusyEvent[], timeZone: string, limit = 3) {
  const start = Date.parse(startValue);
  const end = Date.parse(endValue);
  const duration = end - start;
  if (!Number.isFinite(start) || !Number.isFinite(end) || duration <= 0) return [];
  const busy = events.map((event) => ({
    start: Date.parse(String(event.start?.dateTime ?? event.start?.date ?? "")),
    end: Date.parse(String(event.end?.dateTime ?? event.end?.date ?? "")),
  })).filter((event) => Number.isFinite(event.start) && Number.isFinite(event.end));
  const options: Array<{ timestamp: number; label: string }> = [];
  for (let timestamp = start - 3 * 3600000; timestamp <= start + 6 * 3600000; timestamp += 30 * 60000) {
    if (timestamp === start || busy.some((event) => timestamp < event.end && timestamp + duration > event.start)) continue;
    const label = new Intl.DateTimeFormat("en", { timeZone, weekday: "short", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(timestamp);
    options.push({ timestamp, label });
  }
  return options.sort((a, b) => Math.abs(a.timestamp - start) - Math.abs(b.timestamp - start)).slice(0, limit).map(({ label }) => label);
}
