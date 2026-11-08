/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import {GatewayExceptionFilter} from "@sutra/filter"
import cookieparser from "cookie-parser"


async function bootstrap() {
  process.title="Gateway"
  const app = await NestFactory.create(AppModule);
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
  await app.listen(port);
  Logger.log(`🚀 Gateway is running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
