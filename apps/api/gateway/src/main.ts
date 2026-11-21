/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {GatewayExceptionFilter} from "@sutra/filter"
import cookieparser from "cookie-parser"
import express from "express";
import path from "path";
import { ClientProxy } from "@nestjs/microservices";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { loadApiEnvironment } from "../../config/environment";
import { getOAuthCallbackPaths } from "./app/oauth-callback-paths";
import { appendOAuthCallbackFailure } from "./app/oauth-callback-error";
import { timeout } from "rxjs";

loadApiEnvironment("gateway");


async function bootstrap() {
  process.title="Gateway"
  const { AppModule } = await import('./app/app.module');
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const webUrl = config.getOrThrow<string>("WEB_URL");
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.GATEWAY_PORT;
  app.useGlobalFilters(new GatewayExceptionFilter())
  app.useGlobalPipes(new ValidationPipe({
    forbidNonWhitelisted:true,
    transform:true,
    whitelist:true
  }))
  app.use(cookieparser())
  app.use("/uploads", express.static(path.resolve(process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads")), { immutable: true, maxAge: "1d", fallthrough: false }));
  app.enableCors({
    origin: webUrl,
    credentials: true,
  })
  const expressApp = app.getHttpAdapter().getInstance() as express.Express;
  const callbackRoutes = [
    { provider: "google", pattern: "integration.google.callback" },
    { provider: "instagram", pattern: "integration.instagram.callback" },
  ] as const;
  for (const callback of callbackRoutes) {
    const configuredUri = process.env[callback.provider === "google" ? "GOOGLE_REDIRECT_URI" : "INSTAGRAM_REDIRECT_URI"];
    const callbackPaths = getOAuthCallbackPaths(callback.provider, configuredUri);
    for (const callbackPath of callbackPaths) expressApp.get(callbackPath, async (request, response) => {
      try {
        const agents = app.get<ClientProxy>("AGENTS_SERVICE");
        const result = await firstValueFrom(agents.send(callback.pattern, request.query).pipe(timeout(15000))) as { frontendOrigin?: string; service?: string };
        const origin = result.frontendOrigin ?? webUrl;
        const integration = callback.provider === "google" ? (result.service === "calendar" ? "googlecalendar" : "gmail") : "instagram";
        const target = new URL("/integrations", origin);
        target.searchParams.set("integration", integration);
        target.searchParams.set("status", "success");
        return response.redirect(target.toString());
      } catch (error) {
        const target = new URL("/integrations", webUrl);
        let googleService = "gmail";
        if (callback.provider === "google") {
          try {
            const statePayload = JSON.parse(Buffer.from(String(request.query.state ?? "").split(".")[1] ?? "", "base64url").toString("utf8"));
            googleService = statePayload.service === "calendar" ? "googlecalendar" : "gmail";
          } catch { /* An invalid state falls back to the primary Google integration. */ }
        }
        target.searchParams.set("integration", callback.provider === "google" ? googleService : "instagram");
        appendOAuthCallbackFailure(target, error, callback.provider);
        return response.redirect(target.toString());
      }
    });
  }
  await app.init();
  await app.listen(port);
  Logger.log(`🚀 Gateway is running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
