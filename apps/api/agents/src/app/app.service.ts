import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  OnModuleInit,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Agent, AgentDocument } from "./schema/agents.schema";
import axios from "axios";
import { ICreateAgent, IGetAgents, success } from "@sutra/shared";
import { google } from "googleapis";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { Model } from "mongoose";
import { randomUUID } from "crypto";
import { createOAuthClient, googleScopesFor } from "./config/google.OAuth";
import {
  EStatus,
  Integration,
  IntegrationDocument,
  Providertype,
} from "./schema/integrations.schema";
import { Conversation, ConversationDocument } from "./schema/conversation.schema";
import { Approval, ApprovalDocument, ApprovalStatus } from "./schema/approval.schema";
import { Activity, ActivityDocument } from "./schema/activity.schema";
import { MongoCheckpointSaver } from "./agent/mongo-checkpointer";
import { PlannerService } from "./agent/planner.service";
import { buildAgentGraph, Command } from "./agent/graph";
import type { AgentStateType } from "./agent/state";
import { McpActionExecutor } from "./mcp/mcp-action.executor";
import { Asset, AssetDocument } from "./schema/asset.schema";
import { protectOAuthToken } from "./agent/oauth-token.crypto";
import { approvalMatchesCheckpoint, approvalSummary, calendarAlternatives, calendarConflicts, claimPendingApproval, validateExecutionPermission, type AtomicApprovalModel } from "./agent/action-policy";
import { oauthFailureDetails, type OAuthFailureStage } from "./config/oauth-diagnostics";

export type Servicestype = "gmail" | "googlecalender" | "instagram";
@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);
  private INSTAGRAM_SCOPES = ["instagram_basic", "instagram_content_publish", "pages_show_list", "pages_read_engagement"];
  constructor(
    @InjectModel(Agent.name) private readonly agentmodel: Model<AgentDocument>,
    @InjectModel(Integration.name)
    private readonly integrationmodel: Model<IntegrationDocument>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectModel(Conversation.name) private readonly conversationmodel: Model<ConversationDocument>,
    @InjectModel(Approval.name) private readonly approvalmodel: Model<ApprovalDocument>,
    @InjectModel(Activity.name) private readonly activitymodel: Model<ActivityDocument>,
    @InjectModel(Asset.name) private readonly assetmodel: Model<AssetDocument>,
    private readonly checkpointer: MongoCheckpointSaver,
    private readonly planner: PlannerService,
    private readonly mcp: McpActionExecutor,
  ) {}

  onModuleInit() {
    const key = process.env.OAUTH_TOKEN_ENCRYPTION_KEY;
    if (!key || !/^[0-9a-fA-F]{64}$/.test(key)) {
      throw new Error(
        "OAUTH_TOKEN_ENCRYPTION_KEY is required for OAuth token encryption. Generate with: openssl rand -hex 32",
      );
    }
  }

  private instagramClientSecret() {
    return process.env.INSTAGRAM_CLIENT_SECRET || process.env.INSTAGRAM_APP_SECRET;
  }

  private oauthFailure(provider: "Google" | "Instagram", stage: OAuthFailureStage, error: unknown) {
    const details = oauthFailureDetails(provider, stage, error);
    this.logger.warn(JSON.stringify({ provider: details.provider, stage: details.stage, status: details.status, ...details.diagnostic }));
    const statusCode = error instanceof HttpException
      ? error.getStatus()
      : stage === "persistence" ? 500 : 502;
    return new HttpException({
      success: false,
      message: details.message,
      oauth: { provider: details.provider, stage: details.stage, status: details.status, diagnostic: details.diagnostic.message },
    }, statusCode);
  }

  private async validateAgentTools(userid: string, tools: string[]) {
    const requested = [...new Set(tools ?? [])];
    const invalid = requested.filter((tool) => !["instagram", "gmail", "googlecalendar", "websearch"].includes(tool));
    if (invalid.length) throw new BadRequestException("One or more agent tools are invalid");

    const connected = await this.integrationmodel.find({ userid, status: EStatus.connected }).select("services").lean();
    const available = new Set<string>(["websearch"]);
    for (const integration of connected) {
      if (integration.services?.includes("gmail")) available.add("gmail");
      if (integration.services?.includes("googlecalender")) available.add("googlecalendar");
      if (integration.services?.includes("instagram")) available.add("instagram");
    }
    const unavailable = requested.filter((tool) => !available.has(tool));
    if (unavailable.length) throw new ConflictException(`Connect ${unavailable.join(", ")} before assigning those tools to an agent`);
    return requested;
  }

  async createagent(data: ICreateAgent) {
    const tools = await this.validateAgentTools(data.userid, data.tools ?? []);
    const agent = await this.agentmodel.create({ ...data, tools });
    if (!agent) {
      throw new InternalServerErrorException("Something went wrong with db");
    }
    return success("Agent created successfully.", agent);
  }

  async getagents(data: IGetAgents) {
    const agents = await this.agentmodel.find({ userid: data.userid }).sort({ updatedAt: -1 }).lean();
    return success("Agents found", agents);
  }

  async updateagent(data: ICreateAgent & { id: string }) {
    const { id, ...changes } = data;
    changes.tools = await this.validateAgentTools(data.userid, changes.tools ?? []);
    const agent = await this.agentmodel.findOneAndUpdate(
      { _id: id, userid: data.userid }, changes, { new: true, runValidators: true },
    );
    if (!agent) throw new NotFoundException("Agent not found");
    return success("Agent updated successfully", agent);
  }

  async deleteagent(data: { id: string; userid: string }) {
    const deleted = await this.agentmodel.findOneAndDelete({ _id: data.id, userid: data.userid });
    if (!deleted) throw new NotFoundException("Agent not found");
    return success("Agent deleted successfully", true);
  }

  private agentGraph() {
    return buildAgentGraph({
      supervise: (state) => this.planner.supervise(state),
      specialize: (state) => this.planner.specialize(state),
      prepare: (state) => this.prepareAgentAction(state),
      createApproval: (state) => this.persistApproval(state),
      execute: (state) => this.executeAgentAction(state),
      respond: (state) => this.planner.respond(state),
    }, this.checkpointer);
  }

  private async prepareAgentAction(state: AgentStateType) {
    if (state.operation === "instagram.publish") {
      const assetId = String(state.parameters.assetId ?? "");
      const asset = assetId ? await this.assetmodel.findOne({ userid: state.userid, assetid: assetId }).lean() : null;
      if (!asset) return { operation: "none", parameters: {}, response: "Upload or select one image or MP4 video that you want to publish." };
      if (asset.contenttype === "image/png") return { operation: "none", parameters: {}, response: "This publisher accepts JPEG images or MP4 video. Please select a JPEG or MP4 asset." };
      if (asset.contenttype !== "image/jpeg" && asset.contenttype !== "video/mp4") return { operation: "none", parameters: {}, response: "This publisher accepts JPEG images or MP4 video. Please select supported media." };
      if (asset.size <= 0 || asset.size > 50 * 1024 * 1024 || !asset.publicurl.startsWith("https://")) return { operation: "none", parameters: {}, response: "The selected media is outside the publisher's supported size or URL requirements." };
    }
    if (state.operation !== "calendar.create" && state.operation !== "calendar.update") return {};
    const start = state.parameters.start as Record<string, unknown> | undefined;
    const end = state.parameters.end as Record<string, unknown> | undefined;
    if (!start?.dateTime || !end?.dateTime || !start.timeZone) return {};
    await this.planner.progress(state.streamid, "Checking your calendar for conflicts");
    const startMs = Date.parse(String(start.dateTime));
    const events = await this.mcp.execute(state.userid, "calendar.list", {
      timeMin: new Date(startMs - 3 * 3600000).toISOString(),
      timeMax: new Date(startMs + 6 * 3600000).toISOString(),
      limit: 100,
    }, state.agenttools);
    const items = Array.isArray(events.events) ? events.events as Array<{ id?: string; summary?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string } }> : [];
    const conflicts = calendarConflicts(String(start.dateTime), String(end.dateTime), items)
      .filter((event) => state.operation !== "calendar.update" || String(event.id) !== String(state.parameters.eventId));
    if (!conflicts.length) return {};
    const alternatives = calendarAlternatives(String(start.dateTime), String(end.dateTime), items, String(start.timeZone));
    const conflictNames = conflicts.map((event) => event.summary || "an existing event").join(", ");
    const suffix = alternatives.length ? ` Available nearby times include ${alternatives.join(", ")}. Which time would you prefer?` : " What other time would work for you?";
    return {
      operation: "none",
      parameters: {},
      response: `That time conflicts with ${conflictNames}.${suffix}`,
    };
  }

  private async persistApproval(state: AgentStateType) {
    await this.planner.progress(state.streamid, "Waiting for your approval");
    const idempotencykey = `${state.userid}:${state.conversationid}:${state.turnid}`;
    let preview: Record<string, unknown> | undefined;
    if (state.operation === "instagram.publish" && typeof state.parameters.assetId === "string") {
      const asset = await this.assetmodel.findOne({ userid: state.userid, assetid: state.parameters.assetId }).lean();
      if (!asset) throw new NotFoundException("The Instagram media asset is no longer available");
      preview = { mediaUrl: asset.publicurl, contentType: asset.contenttype, filename: asset.filename };
    }
    let approval = await this.approvalmodel.findOne({ idempotencykey });
    if (!approval) {
      try {
        approval = await this.approvalmodel.create({
          userid: state.userid, conversationid: state.conversationid, checkpointthreadid: state.checkpointthreadid, action: state.operation,
          summary: approvalSummary(state.operation, state.parameters), input: state.parameters, preview, idempotencykey, status: "pending",
        });
        await this.activitymodel.create({ userid: state.userid, conversationid: state.conversationid, type: "approval.pending", status: "pending", summary: state.response, details: { action: state.operation, approvalId: String(approval._id) } });
      } catch (error) {
        if ((error as { code?: number }).code !== 11000) throw error;
        approval = await this.approvalmodel.findOne({ idempotencykey });
        if (!approval) throw error;
      }
    }
    return String(approval._id);
  }

  private async executeAgentAction(state: AgentStateType) {
    await this.planner.progress(state.streamid, `Running ${state.operation}`);
    try {
      validateExecutionPermission(state.operation, state.agenttools, state.approved);
      const result = await this.mcp.execute(state.userid, state.operation, state.parameters, state.agenttools, state.approved);
      await this.planner.progress(state.streamid, "Action completed");
      if (!state.operation.match(/^(gmail\.(send|draft|reply)|calendar\.(create|update|cancel)|instagram\.publish)$/)) {
        await this.activitymodel.create({
          userid: state.userid, conversationid: state.conversationid,
          type: `tool.${state.operation}`, status: "completed", summary: `Completed ${state.operation}`,
          details: { action: state.operation },
        });
      }
      return result;
    } catch (error) {
      await this.planner.progress(state.streamid, "Action failed");
      await this.activitymodel.create({ userid: state.userid, conversationid: state.conversationid, type: `tool.${state.operation}`, status: "failed", summary: `Failed ${state.operation}`, details: { action: state.operation } });
      throw error;
    }
  }

  async registerAsset(data: { userid: string; assetid: string; filename: string; contenttype: string; size: number; publicurl: string }) {
    if (!data.publicurl.toLowerCase().startsWith("https://")) throw new BadRequestException("PUBLIC_BASE_URL must use HTTPS for publishable media");
    const asset = await this.assetmodel.create({ ...data });
    return success("Upload registered", { id: asset.assetid, filename: asset.filename, contentType: asset.contenttype, size: asset.size, url: asset.publicurl });
  }

  async chat(data: { userid: string; text: string; conversationid?: string; agentid?: string | null; assetids?: string[]; streamid?: string; turnid?: string; timezone?: string }) {
    const text = String(data.text ?? "").trim();
    const assetids = [...new Set(data.assetids ?? [])];
    if ((!text && !assetids.length) || text.length > 12000) throw new BadRequestException("Message must contain text or an attachment and be under 12000 characters");
    if (assetids.length > 6) throw new BadRequestException("A message can include up to 6 files");
    const timezone = data.timezone ?? "UTC";
    try { new Intl.DateTimeFormat("en", { timeZone: timezone }); }
    catch { throw new BadRequestException("Time zone must be a valid IANA time zone"); }
    const assets = assetids.length ? await this.assetmodel.find({ userid: data.userid, assetid: { $in: assetids } }).lean() : [];
    if (assets.length !== assetids.length) throw new BadRequestException("An attachment is invalid or belongs to another user");
    let conversation: ConversationDocument | null;
    if (data.conversationid) {
      conversation = await this.conversationmodel.findOne({ _id: data.conversationid, userid: data.userid });
      if (!conversation) throw new NotFoundException("Conversation not found");
    } else {
      conversation = await this.conversationmodel.create({ userid: data.userid, title: text.slice(0, 72), agentid: data.agentid ?? null, messages: [] });
    }
    let agentinstruction = "";
    let agenttools = ["websearch", "gmail", "googlecalendar", "instagram"];
    const agentid = data.agentid ?? conversation.agentid;
    if (agentid) {
      const agent = await this.agentmodel.findOne({ _id: agentid, userid: data.userid });
      if (!agent) throw new NotFoundException("Agent not found");
      agentinstruction = agent.instruction;
      agenttools = agent.tools;
      conversation.agentid = String(agent._id);
    }
    const turnid = data.turnid ?? randomUUID();
    const idempotencykey = `${data.userid}:${conversation._id}:${turnid}`;
    const priorApproval = await this.approvalmodel.findOne({ idempotencykey });
    if (priorApproval) {
      const previous = [...conversation.messages].reverse().find((message: any) => message.metadata?.approvalId === String(priorApproval._id));
      return {
        conversationId: String(conversation._id),
        message: previous?.content ?? priorApproval.summary,
        result: priorApproval.result,
        approval: this.publicApproval(priorApproval),
      };
    }
    const history = conversation.messages.slice(-20).map((message) => ({
      role: message.role, content: message.content,
      ...(message.metadata?.result ? { toolResult: message.metadata.result } : {}),
      ...(message.metadata?.attachments ? { attachments: message.metadata.attachments } : {}),
      ...(message.metadata?.pendingAction ? { pendingAction: message.metadata.pendingAction } : {}),
    }));
    conversation.messages.push({ role: "user", content: text || "Review the attached image.", metadata: assets.length ? { attachments: assets.map((asset) => ({ assetId: asset.assetid, filename: asset.filename, contentType: asset.contenttype, size: asset.size, url: asset.publicurl })) } : undefined } as never);
    await conversation.save();
    await this.approvalmodel.updateMany(
      { userid: data.userid, conversationid: String(conversation._id), status: "pending" },
      { $set: { status: "cancelled", error: "A follow-up message invalidated this action preview" } },
    );
    const graph = this.agentGraph();
    const thread = String(conversation._id);
    const checkpointthreadid = `${thread}:${turnid}`;
    let output: any;
    try {
      output = await graph.invoke({
        userid: data.userid, conversationid: thread, checkpointthreadid, turnid, streamid: data.streamid ?? "", timezone, input: text,
        assetids, agentinstruction, agenttools, history,
        route: "general", operation: "none", parameters: {}, response: "",
        approvalid: "", approved: false, result: {},
      }, { configurable: { thread_id: checkpointthreadid } });
    } catch (error) {
      await this.appendMessage(data.userid, thread, "assistant", "I couldn't complete that request. Check the connection and try again.");
      throw error;
    }
    const interruptInfo = output.__interrupt__?.[0]?.value as Record<string, unknown> | undefined;
    const pendingApproval = interruptInfo?.approvalid
      ? await this.approvalmodel.findOne({ _id: interruptInfo.approvalid, userid: data.userid }).lean()
      : null;
    const content = String(output.response ?? "");
    await this.appendMessage(data.userid, thread, "assistant", content, {
      ...(pendingApproval ? { approvalId: String(pendingApproval._id), approvalStatus: pendingApproval.status } : {}),
      ...(pendingApproval ? { pendingAction: { action: pendingApproval.action, input: pendingApproval.input } } : {}),
      ...(output.result && Object.keys(output.result).length ? { result: output.result } : {}),
    });
    return {
      conversationId: thread,
      message: content,
      result: output.result,
      approval: pendingApproval ? this.publicApproval(pendingApproval) : undefined,
    };
  }

  private async appendMessage(userid: string, conversationid: string, role: string, content: string, metadata?: Record<string, unknown>) {
    await this.conversationmodel.updateOne(
      { _id: conversationid, userid },
      { $push: { messages: { role, content, ...(metadata ? { metadata } : {}) } } },
    );
  }

  private publicApproval(approval: any) {
    return { id: String(approval._id), conversationId: approval.conversationid, action: approval.action, summary: approval.summary, input: approval.input, preview: approval.preview, status: approval.status, createdAt: approval.createdAt };
  }

  async listConversations(userid: string) {
    const conversations = await this.conversationmodel.find({ userid }).sort({ updatedAt: -1 }).select("title agentid messages createdAt updatedAt").lean();
    return success("Conversations found", conversations);
  }

  async getConversation(data: { userid: string; id: string }) {
    const conversation = await this.conversationmodel.findOne({ _id: data.id, userid: data.userid }).lean();
    if (!conversation) throw new NotFoundException("Conversation not found");
    return success("Conversation found", conversation);
  }

  async deleteConversation(data: { userid: string; id: string }) {
    const deleted = await this.conversationmodel.findOneAndDelete({ _id: data.id, userid: data.userid });
    if (!deleted) throw new NotFoundException("Conversation not found");
    await this.checkpointer.deleteThread(data.id);
    await this.approvalmodel.updateMany({ userid: data.userid, conversationid: data.id, status: "pending" }, { $set: { status: "cancelled" } });
    return success("Conversation deleted", true);
  }

  async listApprovals(data: { userid: string; status?: ApprovalStatus }) {
    const query: Record<string, unknown> = { userid: data.userid };
    if (data.status) query.status = data.status;
    const approvals = await this.approvalmodel.find(query).sort({ createdAt: -1 }).limit(100).lean();
    return success("Approvals found", approvals.map((approval) => this.publicApproval(approval)));
  }

  async decideApproval(data: { userid: string; id: string; decision: "approved" | "rejected" | "cancelled"; streamid?: string }) {
    const approval = await claimPendingApproval<ApprovalDocument>(this.approvalmodel as unknown as AtomicApprovalModel<ApprovalDocument>, data.userid, data.id);
    if (!approval) {
      const existing = await this.approvalmodel.findOne({ _id: data.id, userid: data.userid }).select("status").lean();
      if (!existing) throw new NotFoundException("Approval not found");
      throw new ConflictException(`Approval is already ${existing.status}`);
    }
    const graph = this.agentGraph();
    const thread = approval.conversationid;
    const checkpointthreadid = approval.checkpointthreadid ?? thread;
    try {
      const config = { configurable: { thread_id: checkpointthreadid } };
      const checkpoint = await graph.getState(config);
      if (!approvalMatchesCheckpoint(
        { id: String(approval._id), action: approval.action, input: approval.input },
        checkpoint.values as { operation?: string; parameters?: Record<string, unknown>; approvalid?: string },
      )) throw new ConflictException("The pending action no longer matches its saved approval preview");
      const output: any = await graph.invoke(new Command({ resume: { approved: data.decision === "approved" }, ...(data.streamid ? { update: { streamid: data.streamid } } : {}) }), config);
      approval.status = data.decision;
      if (data.decision === "approved") {
        approval.result = output.result ?? {};
        approval.completedat = new Date();
      }
      await approval.save();
      const content = String(output.response ?? "");
      await this.appendMessage(data.userid, thread, "assistant", content, {
        approvalId: data.id,
        approvalStatus: approval.status,
        pendingAction: { action: approval.action, input: approval.input },
        result: output.result,
      });
      await this.activitymodel.create({ userid: data.userid, conversationid: thread, type: `approval.${approval.status}`, status: approval.status, summary: approval.summary, details: { action: approval.action, result: approval.result } });
      return success(`Approval ${approval.status}`, { approval: this.publicApproval(approval), result: approval.result });
    } catch (error) {
      approval.status = "failed";
      approval.error = error instanceof Error ? error.message.slice(0, 500) : "Action failed";
      await approval.save();
      await this.activitymodel.create({ userid: data.userid, conversationid: thread, type: "approval.failed", status: "failed", summary: approval.summary, details: { action: approval.action, error: approval.error } });
      throw error;
    }
  }

  async listActivity(data: { userid: string; conversationid?: string }) {
    const query: Record<string, unknown> = { userid: data.userid };
    if (data.conversationid) query.conversationid = data.conversationid;
    return success("Activity found", await this.activitymodel.find(query).sort({ createdAt: -1 }).limit(100).lean());
  }

  private frontendOrigin(origin?: string) {
    const configured = this.config.getOrThrow<string>("WEB_URL");
    const candidate = origin ? new URL(origin).origin : configured;
    const parsed = new URL(candidate);
    const localHttp = parsed.protocol === "http:" && /^(localhost|.*\.localhost|127\..*|\[::1\])$/.test(parsed.hostname);
    if ((parsed.protocol !== "https:" && !localHttp) || (configured && configured !== parsed.origin)) {
      throw new BadRequestException("OAuth return origin is not allowed");
    }
    return parsed.origin;
  }

  async connectgoogle(data: { _id: string; service?: "gmail" | "calendar"; frontendOrigin?: string }) {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI)
      throw new InternalServerErrorException("Google OAuth is not configured");
    const service = data.service === "calendar" ? "calendar" : "gmail";
    const url = createOAuthClient().generateAuthUrl({
      access_type: "offline",
      scope: googleScopesFor(service),
      include_granted_scopes: true,
      prompt: "consent",
      state: await this.jwt.signAsync({
        sub: data._id,
        purpose: "google-oauth",
        service,
        frontendOrigin: this.frontendOrigin(data.frontendOrigin),
      }, { expiresIn: "10m" }),
    });
    return success("connected", url);
  }

  async connectinstagram(data: { _id: string; frontendOrigin?: string }) {
    if (!process.env.INSTAGRAM_APP_ID || !this.instagramClientSecret() || !process.env.INSTAGRAM_REDIRECT_URI || !process.env.INSTAGRAM_CONFIG_ID)
      throw new InternalServerErrorException("Instagram OAuth is not configured");
    const state = await this.jwt.signAsync({
      sub: data._id,
      purpose: "instagram-oauth",
      service: "instagram",
      frontendOrigin: this.frontendOrigin(data.frontendOrigin),
    }, { expiresIn: "10m" });

    const params = new URLSearchParams({
      config_id: process.env.INSTAGRAM_CONFIG_ID,
      client_id: process.env.INSTAGRAM_APP_ID,
      redirect_uri: process.env.INSTAGRAM_REDIRECT_URI,
      display: "popup",
      override_default_response_type: "true",
      response_type: "code",
      state,
      prompt: "login",
    });
    const url = `https://www.facebook.com/dialog/oauth?${params.toString()}`;

    return success("connected", url);
  }

  async googlecallback(data: { code?: string; state?: string; error?: string }) {
    let stage: OAuthFailureStage = "state_validation";
    try {
      const st = await this.verifyOAuthState(data.state, "google-oauth");
      if (data.error) { stage = "authorization"; throw new BadRequestException("Google authorization was cancelled or denied"); }
      if (!data.code || !data.state) { stage = "callback_validation"; throw new BadRequestException("OAuth callback is missing code or state"); }
      const service = st.service === "calendar" ? "calendar" : "gmail";
      stage = "token_exchange";
      const client = createOAuthClient();
      const { tokens } = await client.getToken(data.code);
      client.setCredentials(tokens);

      stage = "account_lookup";
      const oauth = google.oauth2({ version: "v2", auth: client });
      const { data: profile } = await oauth.userinfo.get();
      if (!profile.id || !profile.email) throw new UnauthorizedException("Google account information is incomplete");

      const filters = { userid: st.sub, provider: Providertype.google, provideraccountid: profile.id };
      let connection = await this.integrationmodel.findOne(filters).select("+tokens.accesstoken +tokens.refreshtoken");
      connection ??= new this.integrationmodel({ ...filters, tokens: {} });
      connection.tokens ??= {} as never;
      const existingServices = connection.services ?? [];
      const serviceName: "gmail" | "googlecalender" = service === "calendar" ? "googlecalender" : "gmail";
      connection.services = [...new Set([...existingServices, serviceName])];
      connection.account = { email: profile.email, displayname: profile.name };
      const receivedScopes = tokens.scope?.split(/\s+/).filter(Boolean) ?? googleScopesFor(service);
      const requiredScopes = googleScopesFor(service).filter((scope) => scope.includes("/auth/gmail.") || scope.includes("/auth/calendar."));
      stage = "permission_validation";
      if (!requiredScopes.every((scope) => receivedScopes.includes(scope))) {
        throw new UnauthorizedException(`Google did not grant all requested ${service} permissions`);
      }
      connection.scopes = [...new Set([...(connection.scopes ?? []), ...receivedScopes])];
      if (tokens.access_token) connection.tokens.accesstoken = protectOAuthToken(tokens.access_token);
      if (tokens.refresh_token) connection.tokens.refreshtoken = protectOAuthToken(tokens.refresh_token);
      if (tokens.expiry_date) connection.tokens.expiresat = new Date(tokens.expiry_date);
      connection.status = EStatus.connected;
      connection.connectedat = new Date();
      stage = "persistence";
      await connection.save();
      return { success: true, frontendOrigin: st.frontendOrigin, service };
    } catch (error) {
      throw this.oauthFailure("Google", stage, error);
    }
  }

  async instagramcallback(data: {
    code?: string;
    state?: string;
    error?: string;
  }) {
    let stage: OAuthFailureStage = "state_validation";
    try {
      const state = await this.verifyOAuthState(data.state, "instagram-oauth");
      if (data.error) { stage = "authorization"; throw new BadRequestException("Instagram authorization was cancelled or denied"); }
      if (!data.code || !data.state) { stage = "callback_validation"; throw new BadRequestException("OAuth callback is missing code or state"); }
      const userid = state.sub;
      const graphversion = process.env.INSTAGRAM_GRAPH_VERSION ?? "v27.0";
      stage = "token_exchange";
      const tokenResponse = await axios.get(`https://graph.facebook.com/${graphversion}/oauth/access_token`, {
        params: {
          client_id: process.env.INSTAGRAM_APP_ID,
          redirect_uri: process.env.INSTAGRAM_REDIRECT_URI,
          client_secret: this.instagramClientSecret(),
          code: data.code,
        },
        timeout: 15000,
      });
      let longLivedToken = tokenResponse.data.access_token;
      let expiresat: Date | undefined = tokenResponse.data.expires_in ? new Date(Date.now() + Number(tokenResponse.data.expires_in) * 1000) : undefined;
      try {
        const exchange = await axios.get(`https://graph.facebook.com/${graphversion}/oauth/access_token`, { params: {
          grant_type: "fb_exchange_token", client_id: process.env.INSTAGRAM_APP_ID,
          client_secret: this.instagramClientSecret(), fb_exchange_token: tokenResponse.data.access_token,
        }, timeout: 15000 });
        if (exchange.data.access_token) longLivedToken = exchange.data.access_token;
        expiresat = exchange.data.expires_in ? new Date(Date.now() + Number(exchange.data.expires_in) * 1000) : expiresat;
      } catch (error) {
        const diagnostic = oauthFailureDetails("Instagram", "token_exchange", error);
        this.logger.warn(JSON.stringify({ provider: diagnostic.provider, stage: "long_lived_token_exchange", status: diagnostic.status, ...diagnostic.diagnostic }));
      }
      if (!longLivedToken) throw new UnauthorizedException("Instagram did not return an access token");

      stage = "account_lookup";
      const pagesResponse = await axios.get(`https://graph.facebook.com/${graphversion}/me/accounts`, {
        params: { fields: "id,name,instagram_business_account{id,username,name}", access_token: longLivedToken },
        timeout: 15000,
      });
      const pages = Array.isArray(pagesResponse.data.data) ? pagesResponse.data.data : [];
      if (pages.length === 0) {
        throw new NotFoundException(
          "No Facebook Pages found for this account. You must administer at least one Facebook Page to connect Instagram.",
        );
      }
      const instagramAccounts = pages
        .map((page: any) => page.instagram_business_account)
        .filter((account: any) => Boolean(account && account.id));
      if (!instagramAccounts?.length) {
        throw new NotFoundException(
          "No Instagram business account was found for the authorized Facebook Pages. Link an Instagram professional account to a Page you administer, then reconnect.",
        );
      }
      const dynamicAccountId = instagramAccounts[0];
      if (!dynamicAccountId?.id) throw new UnauthorizedException("Instagram account information is incomplete");

      const filters = { userid, provider: Providertype.instagram, provideraccountid: dynamicAccountId.id };
      let connection = await this.integrationmodel.findOne(filters).select("+tokens.accesstoken");
      connection ??= new this.integrationmodel({ ...filters, tokens: {} });
      connection.tokens ??= {} as never;
      connection.services = ["instagram"];
      connection.account = { username: dynamicAccountId.username, displayname: dynamicAccountId.name };
      connection.scopes = this.INSTAGRAM_SCOPES;
      if (longLivedToken) connection.tokens.accesstoken = protectOAuthToken(longLivedToken);
      connection.tokens.expiresat = expiresat;
      connection.status = EStatus.connected;
      connection.connectedat = new Date();
      stage = "persistence";
      await connection.save();

      return { success: true, frontendOrigin: state.frontendOrigin };
    } catch (error) {
      throw this.oauthFailure("Instagram", stage, error);
    }
  }
  private async verifyOAuthState(state: string | undefined, purpose: string) {
    try {
      if (!state) throw new Error("missing state");
      const payload = await this.jwt.verifyAsync<{ sub: string; purpose: string; frontendOrigin?: string; service?: "gmail" | "calendar" }>(state);
      if (!payload.sub || payload.purpose !== purpose) throw new Error("invalid state");
      payload.frontendOrigin = this.frontendOrigin(payload.frontendOrigin);
      return payload;
    } catch {
      throw new BadRequestException("OAuth state is invalid or expired");
    }
  }

  async getintegrations(data: { _id: string }) {
    const integrations = await this.integrationmodel.find({ userid: data._id, status: EStatus.connected }).lean();
    const googleAccount = integrations.find((item) => item.provider === Providertype.google);
    const instagramAccount = integrations.find((item) => item.provider === Providertype.instagram);
    return success("integrations found", { integrations: {
      gmail: { connected: Boolean(googleAccount?.services?.includes("gmail")), email: googleAccount?.account?.email ?? null, connectedAt: googleAccount?.connectedat ?? null },
      googlecalender: { connected: Boolean(googleAccount?.services?.includes("googlecalender")), email: googleAccount?.account?.email ?? null, connectedAt: googleAccount?.connectedat ?? null },
      instagram: { connected: Boolean(instagramAccount?.services?.includes("instagram")), username: instagramAccount?.account?.username ?? null, connectedAt: instagramAccount?.connectedat ?? null },
    } });
  }

  async disconnectIntegration(data: { userid: string; provider: Providertype; service?: "gmail" | "googlecalender" | "instagram" }) {
    if (data.provider === Providertype.google && (data.service === "gmail" || data.service === "googlecalender")) {
      const integration = await this.integrationmodel.findOne({ userid: data.userid, provider: data.provider, status: EStatus.connected });
      if (integration) {
        integration.services = (integration.services ?? []).filter((service) => service !== data.service);
        integration.status = integration.services.length ? EStatus.connected : EStatus.revoked;
        await integration.save();
      }
    } else {
      await this.integrationmodel.updateMany({ userid: data.userid, provider: data.provider }, { $set: { status: EStatus.revoked } });
    }
    return success("Integration disconnected", true);
  }
}
