/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {MicroserviceOptions,Transport} from "@nestjs/microservices"
import {ServiceExceptionFilter} from "@sutra/filter"
import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";

loadDotenv({ path: [resolve(process.cwd(), "apps/api/users/.env"), resolve(process.cwd(), ".env")] });

async function bootstrap() {
  process.title="User service"
  const { AppModule } = await import('./app/app.module');
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URL],
        queue: process.env.USERS_QUEUE ,
        queueOptions: {
          durable: true,
        },
      },
    },
  );

  app.useGlobalFilters(new ServiceExceptionFilter())

  await app.listen();
  Logger.log("user service started");
}


bootstrap();
