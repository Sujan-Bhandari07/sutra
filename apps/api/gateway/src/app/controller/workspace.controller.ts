import { Body, Controller, Delete, Get, Inject, Param, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import type { Response } from "express";
import { firstValueFrom } from "rxjs";
import { randomUUID } from "crypto";
import Redis from "ioredis";
import { REDIS_CLIENT } from "@sutra/redis";
import { Authreq, JwtGuard } from "../guard/auth.guard";
import { ChatDto } from "../dto/chat.dto";
import { ApprovalDecisionDto } from "../dto/approval.dto";
import { RateLimitGuard } from "../guard/rate-limit.guard";

@Controller()
@UseGuards(JwtGuard)
export class WorkspaceController {
  constructor(@Inject("AGENTS_SERVICE") private readonly agents: ClientProxy, @Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  @Post("chat")
  @UseGuards(JwtGuard, RateLimitGuard)
  chat(@Body() dto: ChatDto, @Req() req: Authreq) {
    return firstValueFrom(this.agents.send("chat.send", { userid: req.user, text: dto.text ?? "", conversationid: dto.conversationId, agentid: dto.agentId, assetids: dto.assetIds, turnid: dto.turnId, timezone: dto.timeZone }));
  }

  @Post("chat/stream")
  @UseGuards(JwtGuard, RateLimitGuard)
  async streamChat(@Body() dto: ChatDto, @Req() req: Authreq, @Res() res: Response) {
    res.status(200).set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
    res.flushHeaders();
    const emit = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    emit("status", { status: "running" });
    const streamid = randomUUID();
    const channel = `sutra:stream:${streamid}`;
    const subscriber = this.redis.duplicate();
    try {
      await subscriber.subscribe(channel);
      subscriber.on("message", (_topic, raw) => {
        if (res.writableEnded) return;
        try {
          const event = JSON.parse(raw);
          if (event.type === "token") emit("token", { text: event.text });
          if (event.type === "status") emit("status", { status: event.status });
          if (event.type === "reset") emit("reset", {});
        } catch { /* Ignore malformed progress events; the request result remains authoritative. */ }
      });
      const result = await firstValueFrom(this.agents.send("chat.send", { userid: req.user, text: dto.text ?? "", conversationid: dto.conversationId, agentid: dto.agentId, assetids: dto.assetIds, turnid: dto.turnId, timezone: dto.timeZone, streamid }));
      emit("result", result);
    } catch (error) {
      emit("error", { message: error instanceof Error ? error.message : "Chat request failed" });
    } finally {
      emit("status", { status: "complete" });
      res.end();
      await subscriber.unsubscribe(channel).catch(() => undefined);
      await subscriber.quit().catch(() => undefined);
    }
  }

  @Get("conversations")
  conversations(@Req() req: Authreq) { return firstValueFrom(this.agents.send("conversation.list", { userid: req.user })); }

  @Get("conversations/:id")
  conversation(@Param("id") id: string, @Req() req: Authreq) { return firstValueFrom(this.agents.send("conversation.get", { userid: req.user, id })); }

  @Delete("conversations/:id")
  deleteConversation(@Param("id") id: string, @Req() req: Authreq) { return firstValueFrom(this.agents.send("conversation.delete", { userid: req.user, id })); }

  @Get("approvals")
  approvals(@Req() req: Authreq, @Query("status") status?: string) { return firstValueFrom(this.agents.send("approval.list", { userid: req.user, status })); }

  @Post("approvals/:id")
  decideApproval(@Param("id") id: string, @Body() dto: ApprovalDecisionDto, @Req() req: Authreq) {
    return firstValueFrom(this.agents.send("approval.decide", { userid: req.user, id, decision: dto.decision }));
  }

  @Post("approvals/:id/stream")
  @UseGuards(JwtGuard, RateLimitGuard)
  async streamApproval(@Param("id") id: string, @Body() dto: ApprovalDecisionDto, @Req() req: Authreq, @Res() res: Response) {
    res.status(200).set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
    res.flushHeaders();
    const emit = (event: string, data: unknown) => { if (!res.destroyed && !res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); };
    emit("status", { status: "Applying your decision" });
    const streamid = randomUUID();
    const channel = `sutra:stream:${streamid}`;
    const subscriber = this.redis.duplicate();
    try {
      await subscriber.subscribe(channel);
      subscriber.on("message", (_topic, raw) => {
        if (res.destroyed || res.writableEnded) return;
        try {
          const event = JSON.parse(raw);
          if (event.type === "status") emit("status", { status: event.status });
          if (event.type === "token") emit("token", { text: event.text });
          if (event.type === "reset") emit("reset", {});
        } catch { /* Ignore malformed progress events; the decision result remains authoritative. */ }
      });
      const result = await firstValueFrom(this.agents.send("approval.decide", { userid: req.user, id, decision: dto.decision, streamid }));
      emit("result", result);
    } catch (error) {
      emit("error", { message: error instanceof Error ? error.message : "Approval update failed" });
    } finally {
      emit("status", { status: "complete" });
      if (!res.destroyed && !res.writableEnded) res.end();
      await subscriber.unsubscribe(channel).catch(() => undefined);
      await subscriber.quit().catch(() => undefined);
    }
  }

  @Get("activity")
  activity(@Req() req: Authreq, @Query("conversationId") conversationid?: string) { return firstValueFrom(this.agents.send("activity.list", { userid: req.user, conversationid })); }
}
