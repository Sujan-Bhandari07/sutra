import { Controller, Get, Inject, Query, Req, Res, UseGuards, Post } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import { ConfigService } from "@nestjs/config";
import type { Response } from "express";
import { Authreq, JwtGuard } from "../guard/auth.guard";
import { timeout } from "rxjs";
import { appendOAuthCallbackFailure } from "../oauth-callback-error";

@Controller("integrations")
export class IntegrationController {
  constructor(@Inject("AGENTS_SERVICE") private readonly agents: ClientProxy, private readonly config: ConfigService) {}

  @UseGuards(JwtGuard)
  @Get()
  list(@Req() req: Authreq) {
    return firstValueFrom(this.agents.send("integration.list", { userid: req.user }));
  }

  @UseGuards(JwtGuard)
  @Get("google/connect")
  async connectGoogle(@Req() req: Authreq, @Res({ passthrough: true }) res: Response, @Query("service") service?: string) {
    const integration = service === "calendar" ? "googlecalendar" : "gmail";
    try {
      const result = await firstValueFrom(this.agents.send("integration.google.connect", { userid: req.user, service: service === "calendar" ? "calendar" : "gmail" }));
      res.redirect((result as { payload: string }).payload);
    } catch (error) {
      const target = new URL("/integrations", this.config.getOrThrow<string>("WEB_URL"));
      target.searchParams.set("integration", integration);
      appendOAuthCallbackFailure(target, error, "google");
      return res.redirect(target.toString());
    }
  }

  @UseGuards(JwtGuard)
  @Get("instagram/connect")
  async connectInstagram(@Req() req: Authreq, @Res({ passthrough: true }) res: Response) {
    try {
      const result = await firstValueFrom(this.agents.send("integration.instagram.connect", { userid: req.user }));
      res.redirect((result as { payload: string }).payload);
    } catch (error) {
      const target = new URL("/integrations", this.config.getOrThrow<string>("WEB_URL"));
      target.searchParams.set("integration", "instagram");
      appendOAuthCallbackFailure(target, error, "instagram");
      return res.redirect(target.toString());
    }
  }

  @Get("oauth/google/callback")
  async googleCallback(@Query() query: { code?: string; state?: string; error?: string }, @Res() res: Response) {
    let frontendOrigin = this.config.getOrThrow<string>("WEB_URL");
    try {
      const result = await firstValueFrom(this.agents.send("integration.google.callback", query).pipe(timeout(15000))) as { frontendOrigin?: string; service?: string };
      frontendOrigin = result.frontendOrigin ?? frontendOrigin;
      const integration = result.service === "calendar" ? "googlecalendar" : "gmail";
      return this.redirectToIntegrations(res, frontendOrigin, integration, "success");
    } catch (error) {
      const target = new URL("/integrations", frontendOrigin);
      target.searchParams.set("integration", this.googleIntegrationFromState(query.state));
      appendOAuthCallbackFailure(target, error, "google");
      return res.redirect(target.toString());
    }
  }

  @Get("oauth/instagram/callback")
  async instagramCallback(@Query() query: { code?: string; state?: string; error?: string }, @Res() res: Response) {
    let frontendOrigin = this.config.getOrThrow<string>("WEB_URL");
    try {
      const result = await firstValueFrom(this.agents.send("integration.instagram.callback", query).pipe(timeout(15000))) as { frontendOrigin?: string };
      frontendOrigin = result.frontendOrigin ?? frontendOrigin;
      return this.redirectToIntegrations(res, frontendOrigin, "instagram", "success");
    } catch (error) {
      const target = new URL("/integrations", frontendOrigin);
      target.searchParams.set("integration", "instagram");
      appendOAuthCallbackFailure(target, error, "instagram");
      return res.redirect(target.toString());
    }
  }

  private redirectToIntegrations(res: Response, origin: string | undefined, integration: string, status: "success" | "error") {
    if (!origin) throw new Error("WEB_URL is not configured");
    const target = new URL("/integrations", origin);
    target.searchParams.set("integration", integration);
    target.searchParams.set("status", status);
    return res.redirect(target.toString());
  }

  private googleIntegrationFromState(state?: string) {
    try {
      const payload = JSON.parse(Buffer.from(state?.split(".")[1] ?? "", "base64url").toString("utf8"));
      return payload.service === "calendar" ? "googlecalendar" : "gmail";
    } catch {
      return "gmail";
    }
  }

  @UseGuards(JwtGuard)
  @Post("disconnect/google")
  disconnectGoogle(@Req() req: Authreq, @Query("service") service?: string) {
    return firstValueFrom(this.agents.send("integration.disconnect", { userid: req.user, provider: "google", service: service === "calendar" ? "googlecalender" : "gmail" }));
  }

  @UseGuards(JwtGuard)
  @Post("disconnect/instagram")
  disconnectInstagram(@Req() req: Authreq) {
    return firstValueFrom(this.agents.send("integration.disconnect", { userid: req.user, provider: "instagram" }));
  }
}
