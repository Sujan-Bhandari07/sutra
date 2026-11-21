import { describe, expect, it } from "vitest";
import {
  approvalMatchesCheckpoint,
  calendarAlternatives,
  calendarConflicts,
  claimPendingApproval,
  validatePlannedAction,
  validateExecutionPermission,
} from "../src/app/agent/action-policy";

describe("agent action policy", () => {
  it("asks for a missing email recipient and rejects guessed addresses", () => {
    const missing = validatePlannedAction({ operation: "gmail.send", parameters: { subject: "Class", body: "I cannot attend." }, response: "" }, ["gmail"], []);
    expect(missing.operation).toBe("none");
    expect(missing.response).toContain("Who should I send");

    const guessed = validatePlannedAction({ operation: "gmail.send", parameters: { to: ["instructor@example.com"], subject: "Class", body: "I cannot attend." }, response: "" }, ["gmail"], [], "Send this to my instructor");
    expect(guessed.operation).toBe("none");
    expect(guessed.response).toContain("can't verify");
  });

  it("keeps generated email fields and applies a follow-up edit as a new exact proposal", () => {
    const initial = validatePlannedAction({ operation: "gmail.send", parameters: { to: ["teacher@example.com"], subject: "Tomorrow's class", body: "Dear Professor, I am unable to attend class tomorrow." }, response: "" }, ["gmail"], [], "Please send it to teacher@example.com", ["teacher@example.com"]);
    expect(initial.operation).toBe("gmail.send");
    expect(initial.parameters.body).toContain("unable to attend");

    const edited = validatePlannedAction({ operation: "gmail.send", parameters: { to: ["teacher@example.com"], subject: "Class tomorrow", body: "I cannot attend class tomorrow. Thank you for understanding." }, response: "" }, ["gmail"], [], "Make it shorter; teacher@example.com", ["teacher@example.com"]);
    expect(edited.parameters.subject).toBe("Class tomorrow");
    expect(edited.parameters.body).toContain("Thank you");
    expect(approvalMatchesCheckpoint({ id: "old", action: "gmail.send", input: initial.parameters }, { operation: edited.operation, parameters: edited.parameters })).toBe(false);
  });

  it("requires explicit calendar duration, time zone, and known attendees", () => {
    const plan = { operation: "calendar.create", response: "Preview", parameters: {
      summary: "Project sync", start: { dateTime: "2030-01-07T14:00:00+05:45", timeZone: "Asia/Kathmandu" },
      end: { dateTime: "2030-01-07T14:30:00+05:45", timeZone: "Asia/Kathmandu" }, durationMinutes: 30, attendees: ["john@example.com"],
    } };
    expect(validatePlannedAction(plan, ["googlecalendar"], [], "Schedule a Project sync with John", ["john@example.com"], false, "Asia/Kathmandu").response).toContain("How long");
    expect(validatePlannedAction(plan, ["googlecalendar"], [], "Schedule a Project sync with John for 30 minutes", [], true, "Asia/Kathmandu").response).toContain("attendee email");
    expect(validatePlannedAction(plan, ["googlecalendar"], [], "Schedule a Project sync with John for 30 minutes", ["john@example.com"], true, "Asia/Kathmandu").operation).toBe("calendar.create");
  });

  it("detects calendar conflicts and returns nearby alternatives", () => {
    const start = "2030-01-07T14:00:00+05:45";
    const end = "2030-01-07T15:00:00+05:45";
    const events = [{ summary: "Planning", start: { dateTime: start }, end: { dateTime: end } }];
    expect(calendarConflicts(start, end, events)).toHaveLength(1);
    expect(calendarAlternatives(start, end, events, "Asia/Kathmandu")).toHaveLength(3);
  });

  it("atomically allows only one approval claim", async () => {
    let status = "pending";
    const model = {
      async findOneAndUpdate(filter: Record<string, unknown>) {
        if (status !== filter.status) return null;
        status = "executing";
        return { id: "approval-1" };
      },
    };
    const [first, second] = await Promise.all([
      claimPendingApproval(model, "user-1", "approval-1"),
      claimPendingApproval(model, "user-1", "approval-1"),
    ]);
    expect([first, second].filter(Boolean)).toHaveLength(1);
  });

  it("requires verified message and event references and rejects unexpected action fields", () => {
    const reply = validatePlannedAction({ operation: "gmail.reply", parameters: { threadId: "guessed-thread", body: "Thanks" }, response: "" }, ["gmail"], [], "Reply to the last message");
    expect(reply.operation).toBe("none");
    expect(reply.response).toContain("select the email thread");

    const cancel = validatePlannedAction({ operation: "calendar.cancel", parameters: { eventId: "guessed-event" }, response: "" }, ["googlecalendar"], [], "Cancel that event");
    expect(cancel.operation).toBe("none");

    const malformed = validatePlannedAction({ operation: "gmail.send", parameters: { to: ["a@example.com"], subject: "Hello", body: "Hi", accessToken: "secret" }, response: "" }, ["gmail"], [], "Send to a@example.com", ["a@example.com"]);
    expect(malformed.operation).toBe("none");
  });

  it("requires one supplied Instagram asset and blocks unassigned tools", () => {
    const plan = { operation: "instagram.publish", response: "Preview", parameters: { caption: "Introducing our new product." } };
    expect(validatePlannedAction(plan, ["instagram"], []).response).toContain("Upload or select");
    expect(validatePlannedAction(plan, ["instagram"], ["asset-1"]).parameters.assetId).toBe("asset-1");
    const withTags = validatePlannedAction({ ...plan, parameters: { caption: "A new product is here.", hashtags: ["launch", "sutra"] } }, ["instagram"], ["asset-1"]);
    expect(withTags.parameters.caption).toContain("#launch #sutra");
    expect(() => validatePlannedAction({ ...plan, operation: "instagram.caption" }, ["gmail"], [])).toThrow(/not assigned/);
  });

  it("requires approval at the execution boundary for mutations", () => {
    expect(() => validateExecutionPermission("gmail.send", ["gmail"], false)).toThrow(/requires explicit approval/);
    expect(() => validateExecutionPermission("calendar.list", ["googlecalendar"], false)).not.toThrow();
    expect(() => validateExecutionPermission("gmail.send", ["gmail"], true)).not.toThrow();
  });
});
