import { HttpException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { google } from "googleapis";
import axios from "axios";
import { Model } from "mongoose";
import { Integration, IntegrationDocument, Providertype, EStatus } from "../schema/integrations.schema";
import { Asset, AssetDocument } from "../schema/asset.schema";
import { protectOAuthToken, revealOAuthToken } from "./oauth-token.crypto";

type ActionInput = Record<string, any>;

@Injectable()
export class IntegrationsService {
  constructor(
    @InjectModel(Integration.name) private readonly integrations: Model<IntegrationDocument>,
    @InjectModel(Asset.name) private readonly assets: Model<AssetDocument>,
  ) {}

  private async googleClient(userid: string, service: "gmail" | "googlecalender") {
    const integration = await this.integrations.findOne({ userid, provider: Providertype.google, status: EStatus.connected })
      .select("+tokens.accesstoken +tokens.refreshtoken");
    if (!integration?.services?.includes(service)) throw new NotFoundException(`Connect ${service === "gmail" ? "Gmail" : "Google Calendar"} first`);
    if (!integration?.tokens?.accesstoken && !integration?.tokens?.refreshtoken) throw new NotFoundException("Connect Google first");
    let migrated = false;
    if (integration.tokens.accesstoken && !integration.tokens.accesstoken.startsWith("v1.")) { integration.tokens.accesstoken = protectOAuthToken(integration.tokens.accesstoken); migrated = true; }
    if (integration.tokens.refreshtoken && !integration.tokens.refreshtoken.startsWith("v1.")) { integration.tokens.refreshtoken = protectOAuthToken(integration.tokens.refreshtoken); migrated = true; }
    if (migrated) await integration.save();
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
    auth.setCredentials({
      access_token: integration.tokens.accesstoken ? revealOAuthToken(integration.tokens.accesstoken) : undefined,
      refresh_token: integration.tokens.refreshtoken ? revealOAuthToken(integration.tokens.refreshtoken) : undefined,
      expiry_date: integration.tokens.expiresat?.getTime(),
    });
    auth.on("tokens", (tokens) => {
      void this.integrations.updateOne({ _id: integration._id }, { $set: {
        ...(tokens.access_token ? { "tokens.accesstoken": protectOAuthToken(tokens.access_token) } : {}),
        ...(tokens.refresh_token ? { "tokens.refreshtoken": protectOAuthToken(tokens.refresh_token) } : {}),
        ...(tokens.expiry_date ? { "tokens.expiresat": new Date(tokens.expiry_date) } : {}),
        lastusedat: new Date(),
      } });
    });
    return auth;
  }

  async execute(userid: string, action: string, input: ActionInput): Promise<Record<string, unknown>> {
    try {
      switch (action) {
        case "web.search": throw new ServiceUnavailableException("Web search must run through the MCP search tool");
        case "gmail.search": return await this.searchEmail(userid, input);
        case "gmail.send": return await this.sendEmail(userid, input);
        case "gmail.draft": return await this.draftEmail(userid, input);
        case "gmail.reply": return await this.replyEmail(userid, input);
        case "calendar.list": return await this.listEvents(userid, input);
        case "calendar.availability": return await this.checkAvailability(userid, input);
        case "calendar.create": return await this.createEvent(userid, input);
        case "calendar.update": return await this.updateEvent(userid, input);
        case "calendar.cancel": return await this.cancelEvent(userid, input);
        case "instagram.publish": return await this.publishInstagram(userid, input);
        case "instagram.caption": return { caption: String(input.caption ?? ""), hashtags: Array.isArray(input.hashtags) ? input.hashtags : [] };
        default: throw new ServiceUnavailableException(`Unsupported external action: ${action}`);
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 401 || status === 403) throw new ServiceUnavailableException("This integration needs attention. Reconnect it or review its granted permissions.");
        throw new ServiceUnavailableException("The external service could not complete this action. Check the integration and try again.");
      }
      const providerError = error as { code?: string | number; status?: number; response?: { status?: number } };
      const providerStatus = providerError.status ?? providerError.response?.status;
      if (providerError.code === "invalid_grant" || providerStatus === 401) throw new ServiceUnavailableException("Integration authorization expired. Reconnect the account to continue.");
      if (providerStatus === 403) throw new ServiceUnavailableException("The integration lacks permission for this action. Review its granted permissions and reconnect if needed.");
      throw new ServiceUnavailableException("The external service could not complete this action. Check the integration and try again.");
    }
  }

  private async searchEmail(userid: string, input: ActionInput) {
    const gmail = google.gmail({ version: "v1", auth: await this.googleClient(userid, "gmail") });
    const query = String(input.query ?? "").trim();
    if (!query || query.length > 500) throw new ServiceUnavailableException("Email search needs a query of 1 to 500 characters");
    const found = await gmail.users.messages.list({ userId: "me", q: query, maxResults: Math.min(Number(input.limit ?? 10), 10) });
    const messages = await Promise.all((found.data.messages ?? []).slice(0, 10).map(async ({ id }) => {
      if (!id) return null;
      const message = await gmail.users.messages.get({ userId: "me", id, format: "full" });
      const body = this.plainText(message.data.payload).slice(0, 6000);
      return { id, threadId: message.data.threadId, snippet: message.data.snippet, headers: message.data.payload?.headers ?? [], body };
    }));
    return { messages: messages.filter(Boolean) };
  }

  private plainText(part?: { mimeType?: string | null; body?: { data?: string | null } | null; parts?: any[] | null }): string {
    if (!part) return "";
    if (part.mimeType === "text/plain" && part.body?.data) return Buffer.from(part.body.data, "base64url").toString("utf8");
    for (const child of part.parts ?? []) {
      const result = this.plainText(child);
      if (result) return result;
    }
    return "";
  }

  private mime(input: ActionInput, requireRecipients = true) {
    const to = this.addresses(input.to);
    if (requireRecipients && !to.length) throw new ServiceUnavailableException("At least one recipient is required");
    const headers = [
      `To: ${to.join(", ")}`,
      ...(this.addresses(input.cc).length ? [`Cc: ${this.addresses(input.cc).join(", ")}`] : []),
      ...(this.addresses(input.bcc).length ? [`Bcc: ${this.addresses(input.bcc).join(", ")}`] : []),
      `Subject: ${String(input.subject ?? "").replace(/[\r\n]/g, " ")}`,
      ...(input.inReplyTo ? [`In-Reply-To: ${String(input.inReplyTo).replace(/[\r\n]/g, "")}`] : []),
      ...(input.references ? [`References: ${String(input.references).replace(/[\r\n]/g, "")}`] : []),
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "",
      String(input.body ?? ""),
    ];
    return Buffer.from(headers.join("\r\n")).toString("base64url");
  }

  private addresses(value: unknown): string[] {
    const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
    const result = values.map((item) => String(item).trim()).filter(Boolean);
    if (result.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new ServiceUnavailableException("A recipient email address is invalid");
    return result;
  }

  private async sendEmail(userid: string, input: ActionInput) {
    if (!String(input.subject ?? "").trim()) throw new ServiceUnavailableException("Email subject is required");
    if (!String(input.body ?? "").trim()) throw new ServiceUnavailableException("Email body is required");
    if (String(input.subject).length > 998 || String(input.body).length > 50000) throw new ServiceUnavailableException("Email subject or body is too long");
    const gmail = google.gmail({ version: "v1", auth: await this.googleClient(userid, "gmail") });
    const response = await gmail.users.messages.send({ userId: "me", requestBody: { raw: this.mime(input), ...(input.threadId ? { threadId: String(input.threadId) } : {}) } });
    return { messageId: response.data.id, threadId: response.data.threadId, status: "sent" };
  }

  private async draftEmail(userid: string, input: ActionInput) {
    if (!String(input.subject ?? "").trim() || !String(input.body ?? "").trim()) throw new ServiceUnavailableException("Draft needs a subject and body");
    const gmail = google.gmail({ version: "v1", auth: await this.googleClient(userid, "gmail") });
    const response = await gmail.users.drafts.create({ userId: "me", requestBody: { message: { raw: this.mime(input, false) } } });
    return { draftId: response.data.id, messageId: response.data.message?.id, status: "drafted" };
  }

  private async replyEmail(userid: string, input: ActionInput) {
    if (!input.threadId) throw new ServiceUnavailableException("Reply needs an email thread ID");
    const gmail = google.gmail({ version: "v1", auth: await this.googleClient(userid, "gmail") });
    const thread = await gmail.users.threads.get({ userId: "me", id: String(input.threadId), format: "metadata", metadataHeaders: ["From", "Reply-To", "Subject", "Message-ID", "References"] });
    const headers = new Map((thread.data.messages?.at(-1)?.payload?.headers ?? []).map((header) => [String(header.name ?? "").toLowerCase(), String(header.value ?? "")]));
    input.to ??= headers.get("reply-to") ?? headers.get("from");
    if (!input.to) throw new ServiceUnavailableException("The source email has no reply address");
    const subject = String(input.subject ?? headers.get("subject") ?? "");
    input.subject = /^re:/i.test(subject) ? subject : `Re: ${subject}`;
    input.inReplyTo = headers.get("message-id");
    input.references = [headers.get("references"), input.inReplyTo].filter(Boolean).join(" ");
    return this.sendEmail(userid, input);
  }

  private async listEvents(userid: string, input: ActionInput) {
    const calendar = google.calendar({ version: "v3", auth: await this.googleClient(userid, "googlecalender") });
    const response = await calendar.events.list({ calendarId: String(input.calendarId ?? "primary"), timeMin: input.timeMin, timeMax: input.timeMax, q: input.query, maxResults: Math.min(Number(input.limit ?? 25), 100), singleEvents: true, orderBy: "startTime" });
    return { events: (response.data.items ?? []).map((event) => ({ id: event.id, summary: event.summary, description: event.description, start: event.start, end: event.end, attendees: event.attendees, htmlLink: event.htmlLink, meetLink: event.hangoutLink })) };
  }

  private async checkAvailability(userid: string, input: ActionInput) {
    const start = new Date(String(input.start ?? ""));
    const end = new Date(String(input.end ?? ""));
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) throw new ServiceUnavailableException("Availability search needs a valid time range");
    const calendar = google.calendar({ version: "v3", auth: await this.googleClient(userid, "googlecalender") });
    const response = await calendar.freebusy.query({ requestBody: {
      timeMin: start.toISOString(), timeMax: end.toISOString(), timeZone: String(input.timeZone ?? "UTC"),
      items: (Array.isArray(input.calendarIds) && input.calendarIds.length ? input.calendarIds : ["primary"]).map((id) => ({ id: String(id) })),
    } });
    return { calendars: response.data.calendars ?? {}, timeMin: response.data.timeMin, timeMax: response.data.timeMax };
  }

  private validateEventTimes(input: ActionInput) {
    const start = input.start as Record<string, unknown>;
    const end = input.end as Record<string, unknown>;
    const startMs = Date.parse(String(start?.dateTime ?? ""));
    const endMs = Date.parse(String(end?.dateTime ?? ""));
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) throw new ServiceUnavailableException("Calendar event start and end times are invalid");
    for (const timezone of [start?.timeZone, end?.timeZone]) {
      try { new Intl.DateTimeFormat("en", { timeZone: String(timezone) }); }
      catch { throw new ServiceUnavailableException("Calendar event timezone must be a valid IANA timezone"); }
    }
  }

  private calendarEvent(input: ActionInput) {
    const start = input.start as Record<string, unknown> | undefined;
    const end = input.end as Record<string, unknown> | undefined;
    if (!start || !end) throw new ServiceUnavailableException("Calendar event requires start and end times");
    this.validateEventTimes(input);
    return {
      summary: String(input.summary ?? "Meeting"), description: String(input.description ?? ""),
      start: { dateTime: String(start.dateTime ?? ""), timeZone: String(start.timeZone ?? "UTC") },
      end: { dateTime: String(end.dateTime ?? ""), timeZone: String(end.timeZone ?? "UTC") },
      attendees: this.addresses(input.attendees).map((email) => ({ email })),
      ...(input.location ? { location: String(input.location) } : {}),
      ...(input.meet ? { conferenceData: { createRequest: { requestId: crypto.randomUUID() } } } : {}),
    };
  }

  private async createEvent(userid: string, input: ActionInput) {
    const calendar = google.calendar({ version: "v3", auth: await this.googleClient(userid, "googlecalender") });
    const response = await calendar.events.insert({ calendarId: String(input.calendarId ?? "primary"), requestBody: this.calendarEvent(input), conferenceDataVersion: 1, sendUpdates: "all" });
    return { id: response.data.id, status: "created", htmlLink: response.data.htmlLink, meetLink: response.data.hangoutLink ?? response.data.conferenceData?.entryPoints?.[0]?.uri };
  }

  private async updateEvent(userid: string, input: ActionInput) {
    if (!input.eventId) throw new ServiceUnavailableException("Calendar update requires an event ID");
    const calendar = google.calendar({ version: "v3", auth: await this.googleClient(userid, "googlecalender") });
    const calendarId = String(input.calendarId ?? "primary");
    const existing = await calendar.events.get({ calendarId, eventId: String(input.eventId) });
    const start = input.start ?? existing.data.start;
    const end = input.end ?? existing.data.end;
    if (!start || !end) throw new ServiceUnavailableException("Calendar event is missing start or end details");
    const merged = {
      ...input,
      summary: input.summary ?? existing.data.summary,
      description: input.description ?? existing.data.description,
      start: { ...existing.data.start, ...input.start },
      end: { ...existing.data.end, ...input.end },
      attendees: input.attendees ?? existing.data.attendees?.map((attendee) => attendee.email).filter(Boolean) ?? [],
      location: input.location ?? existing.data.location,
    };
    this.validateEventTimes(merged);
    const patch: Record<string, unknown> = {
      summary: merged.summary,
      description: merged.description,
      start: merged.start,
      end: merged.end,
      attendees: this.addresses(merged.attendees).map((email) => ({ email })),
      location: merged.location,
    };
    const response = await calendar.events.patch({ calendarId, eventId: String(input.eventId), requestBody: patch, conferenceDataVersion: 1, sendUpdates: "all" });
    return { id: response.data.id, status: "updated", htmlLink: response.data.htmlLink, meetLink: response.data.hangoutLink };
  }

  private async cancelEvent(userid: string, input: ActionInput) {
    if (!input.eventId) throw new ServiceUnavailableException("Calendar cancellation requires an event ID");
    const calendar = google.calendar({ version: "v3", auth: await this.googleClient(userid, "googlecalender") });
    await calendar.events.delete({ calendarId: String(input.calendarId ?? "primary"), eventId: String(input.eventId), sendUpdates: "all" });
    return { id: input.eventId, status: "cancelled" };
  }

  private async publishInstagram(userid: string, input: ActionInput) {
    const asset = input.assetId ? await this.assets.findOne({ assetid: String(input.assetId), userid }).lean() : null;
    const mediaUrl = asset?.publicurl;
    if (!asset) throw new ServiceUnavailableException("Instagram publishing requires an uploaded media asset owned by this user");
    if (!["image/jpeg", "image/png", "video/mp4"].includes(asset.contenttype) || asset.size <= 0 || asset.size > 50 * 1024 * 1024) throw new ServiceUnavailableException("The selected Instagram media type or size is not supported");
    if (asset.contenttype === "image/png") throw new ServiceUnavailableException("Instagram publishing requires a JPEG image or MP4 video. PNG images are currently uploadable but unsupported by this publisher.");
    if (String(input.caption ?? "").length > 2200) throw new ServiceUnavailableException("Instagram captions must be 2,200 characters or fewer");
    if (!mediaUrl || !/^https:\/\//i.test(String(mediaUrl))) throw new ServiceUnavailableException("Instagram publishing requires an HTTPS media URL accessible to Meta");
    const integration = await this.integrations.findOne({ userid, provider: Providertype.instagram, status: EStatus.connected }).select("+tokens.accesstoken");
    if (!integration?.tokens?.accesstoken) throw new NotFoundException("Connect Instagram first");
    if (!integration.tokens.accesstoken.startsWith("v1.")) {
      integration.tokens.accesstoken = protectOAuthToken(integration.tokens.accesstoken);
      await integration.save();
    }
    if (integration.tokens.expiresat && integration.tokens.expiresat.getTime() < Date.now() + 7 * 86400000) {
      try {
        const refreshed = await axios.get(`https://graph.facebook.com/${process.env.INSTAGRAM_GRAPH_VERSION ?? "v27.0"}/oauth/access_token`, { params: {
          grant_type: "fb_exchange_token", client_id: process.env.INSTAGRAM_APP_ID,
          client_secret: process.env.INSTAGRAM_CLIENT_SECRET || process.env.INSTAGRAM_APP_SECRET,
          fb_exchange_token: revealOAuthToken(integration.tokens.accesstoken),
        }, timeout: 15000 });
        integration.tokens.accesstoken = protectOAuthToken(refreshed.data.access_token);
        integration.tokens.expiresat = refreshed.data.expires_in ? new Date(Date.now() + Number(refreshed.data.expires_in) * 1000) : integration.tokens.expiresat;
        await integration.save();
      } catch { throw new ServiceUnavailableException("Instagram access expired. Reconnect the account to continue."); }
    }
    const version = process.env.INSTAGRAM_GRAPH_VERSION ?? "v27.0";
    const base = `https://graph.facebook.com/${version}/${integration.provideraccountid}`;
    const video = asset?.contenttype === "video/mp4";
    const created = await axios.post(`${base}/media`, null, { params: {
      ...(video ? { video_url: mediaUrl, media_type: "VIDEO" } : { image_url: mediaUrl }),
      caption: String(input.caption ?? ""), access_token: revealOAuthToken(integration.tokens.accesstoken),
    }, timeout: 30000 });
    if (video) {
      let ready = false;
      for (let attempt = 0; attempt < 30; attempt++) {
        const status = await axios.get(`https://graph.facebook.com/${version}/${created.data.id}`, { params: { fields: "status_code,status", access_token: revealOAuthToken(integration.tokens.accesstoken) }, timeout: 10000 });
        if (status.data.status_code === "FINISHED") { ready = true; break; }
        if (["ERROR", "EXPIRED"].includes(status.data.status_code)) throw new ServiceUnavailableException(`Instagram video processing failed: ${status.data.status ?? status.data.status_code}`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      if (!ready) throw new ServiceUnavailableException("Instagram video processing timed out; the post was not published");
    }
    const published = await axios.post(`${base}/media_publish`, null, { params: { creation_id: created.data.id, access_token: revealOAuthToken(integration.tokens.accesstoken) }, timeout: 30000 });
    const details = await axios.get(`https://graph.facebook.com/${version}/${published.data.id}`, { params: { fields: "id,permalink,timestamp", access_token: revealOAuthToken(integration.tokens.accesstoken) }, timeout: 10000 });
    return { id: details.data.id, creationId: created.data.id, status: "published", permalink: details.data.permalink, timestamp: details.data.timestamp };
  }
}
